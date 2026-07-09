# HTTPS — Qué hacer cuando llegue el certificado

Guía para activar SSL en **credenciales.enap.edu.co** con la arquitectura actual: **Nginx dentro de Docker** (sin Nginx instalado en el servidor host).

---

## Arquitectura actual

```
Usuario
   │
   ▼
Servidor :80  ──►  contenedor frontend-credentials (Nginx + Angular)
                         │
                         ├─ /        → SPA Angular
                         └─ /api/*   → proxy interno → api-credentials:3000
```

El backend **no** se expone en el puerto 3000 al público. Todo pasa por el contenedor `frontend-credentials`.

---

## Antes de empezar: confirmar con ENAP

Pregunte a infraestructura **quién termina el SSL**:

| Escenario | Quién hace HTTPS | Qué hace usted |
|-----------|------------------|----------------|
| **A — Proxy institucional ENAP** (recomendado preguntar primero) | Balanceador / proxy de ENAP | Ajustar `.env` y validar headers |
| **B — SSL en Docker** | Su stack Docker (`frontend-credentials`) | Montar certificados y exponer `:443` |

En ambos casos el código Angular **no cambia** (`enap_api: '/api'`).

---

## Escenario A — ENAP pone el proxy con SSL (más habitual)

```
Usuario ──HTTPS──► [Proxy ENAP] ──HTTP──► servidor:80 ──► Docker frontend-credentials
                         │
              X-Forwarded-Proto: https
```

### Qué pedir a infraestructura ENAP

1. DNS de `credenciales.enap.edu.co` apuntando al servidor.
2. Certificado SSL gestionado en el **proxy institucional** (no en el servidor de aplicación).
3. Reenvío de **todo** el tráfico al puerto **80** del servidor:
   - `/` (Angular)
   - `/api/*` (API vía proxy interno de Docker)
4. Headers obligatorios hacia el servidor:
   - `Host: credenciales.enap.edu.co`
   - `X-Forwarded-Proto: https`
   - `X-Forwarded-For: <ip-cliente>`

> **Importante:** no configurar `/api` hacia el puerto 3000. El API solo es accesible dentro de Docker. Si el proxy envía `/api` a otro destino, la aplicación fallará.

### Cambios en el servidor (`.env`)

Editar `back/.env`:

```env
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_SAMESITE=lax
PUBLIC_APP_URL=https://credenciales.enap.edu.co
CORS_ORIGINS=https://credenciales.enap.edu.co,https://credenciales.enap
```

Recrear el contenedor del API:

```bash
cd back
docker compose up -d --force-recreate api
```

No hace falta reconstruir el frontend si solo cambian variables del backend.

### Verificación

```bash
curl -I https://credenciales.enap.edu.co/
curl -I https://credenciales.enap.edu.co/api/docs
curl -s https://credenciales.enap.edu.co/api/auth/csrf
```

En el navegador:

1. Abrir `https://credenciales.enap.edu.co`
2. Iniciar sesión
3. En DevTools → Application → Cookies: deben aparecer `access_token`, `csrf_token` con flag **Secure**

### Si el login falla tras activar HTTPS

| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| Cookies no se guardan | `AUTH_COOKIE_SECURE=false` con HTTPS | Poner `AUTH_COOKIE_SECURE=true` y recrear `api` |
| Front carga, `/api` da 404 | Proxy ENAP no reenvía `/api` | Pedir reenvío completo a `:80` del contenedor frontend |
| Error CORS en consola | Origen distinto al configurado | Normalmente no aplica (mismo origen `/api`). Revisar si hay llamadas cross-origin |

---

## Escenario B — SSL directamente en el contenedor Docker

Use este escenario solo si **ENAP no provee proxy** y usted debe terminar HTTPS en el servidor.

### 1. Copiar certificados al servidor

Ejemplo de rutas en el host:

```
/etc/ssl/credentials/fullchain.pem
/etc/ssl/credentials/privkey.pem
```

Permisos recomendados: lectura solo para root / grupo docker.

### 2. Actualizar `frontend_credentials_21/nginx/nginx.conf`

Añadir un bloque `server` para `:443` (el bloque `:80` puede redirigir a HTTPS):

```nginx
server {
    listen 80 default_server;
    server_name credenciales.enap.edu.co credenciales.enap localhost _;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name credenciales.enap.edu.co credenciales.enap;

    ssl_certificate     /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    server_tokens off;
    client_max_body_size 25m;

    root /usr/share/nginx/html;
    index index.html;

    location ^~ /api/ {
        proxy_pass http://api:3000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header Cookie $http_cookie;
        proxy_connect_timeout 60s;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* ^(?!/api/).*\.(js|css|png|jpg|jpeg|gif|ico|svg|webp)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### 3. Montar certificados en `docker-compose.yml`

En el servicio `frontend`:

```yaml
frontend:
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - /etc/ssl/credentials:/etc/nginx/ssl:ro
```

### 4. Reconstruir y desplegar

```bash
cd back
docker compose build frontend
docker compose up -d --force-recreate frontend api
```

### 5. Variables `.env` (igual que escenario A)

```env
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_SAMESITE=lax
PUBLIC_APP_URL=https://credenciales.enap.edu.co
CORS_ORIGINS=https://credenciales.enap.edu.co,https://credenciales.enap
```

### 6. Firewall

Abrir puerto **443** en el servidor (además del 80 si se mantiene redirect).

---

## Checklist rápido (cualquier escenario)

- [ ] DNS `credenciales.enap.edu.co` resuelve al servidor o al proxy ENAP
- [ ] HTTPS responde en `/` y en `/api/docs`
- [ ] `AUTH_COOKIE_SECURE=true` en `.env`
- [ ] `PUBLIC_APP_URL=https://credenciales.enap.edu.co`
- [ ] Login funciona y cookies tienen flag Secure
- [ ] QR del PDF apunta a `https://credenciales.enap.edu.co/verify/...`

---

## Mientras no hay certificado (estado actual)

```env
AUTH_COOKIE_SECURE=false
PUBLIC_APP_URL=https://credenciales.enap.edu.co
```

- La app se sirve en **HTTP** (`:80`).
- `PUBLIC_APP_URL` puede estar en `https://` de antemano (los QR del PDF ya apuntan al dominio final).
- **No** activar `AUTH_COOKIE_SECURE=true` hasta que el usuario acceda por HTTPS.

---

## Documentación relacionada

- [AUTH_DEPLOYMENT.md](./AUTH_DEPLOYMENT.md) — cookies, CSRF, proxy `/api`, ambientes DEV/PROD
- Nginx activo: `frontend_credentials_21/nginx/nginx.conf`
