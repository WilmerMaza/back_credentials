# Autenticación — Despliegue DEV / QA / PROD

Guía de configuración para la arquitectura **HttpOnly cookies + sesiones + refresh rotativo**.

---

## Principio

Angular **siempre** consume rutas relativas:

```
/api/auth/login
/api/credentials
```

El destino real lo resuelve:

| Ambiente | Mecanismo |
|----------|-----------|
| **DEV** | `proxy.conf.json` de Angular (`ng serve`) |
| **QA / PROD** | Reverse proxy (Nginx) en el mismo host del frontend |

---

## DEV (localhost)

### Frontend (`frontend_credentials_21`)

```json
// environment.development.ts
{ "enap_api": "/api" }
```

```json
// proxy.conf.json
{
  "/api": {
    "target": "http://localhost:3000",
    "secure": false,
    "changeOrigin": true,
    "pathRewrite": { "^/api": "" }
  }
}
```

```bash
npm start   # ng serve --port 4200 --proxy-config proxy.conf.json
```

### Backend (`.env`)

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=<secreto-32-chars>
JWT_ACCESS_TTL=15m
REFRESH_TOKEN_TTL_DAYS=7
AUTH_COOKIE_SAMESITE=lax
AUTH_COOKIE_SECURE=false
CORS_ORIGINS=http://localhost:4200
CSRF_ENABLED=true
```

### Por qué no hay CORS en DEV

El navegador ve `http://localhost:4200/api/...` (mismo origen). El proxy de Angular reenvía a `:3000` en servidor. Las cookies `HttpOnly` se emiten para `localhost` sin fricción cross-origin.

---

## QA

### Frontend

- URL pública: `https://qa.midominio.com`
- Build: `ng build --configuration qa`
- `environment.qa.ts`: `enap_api: '/api'`

### Nginx (ejemplo)

```nginx
server {
    listen 443 ssl http2;
    server_name qa.midominio.com;

    root /usr/share/nginx/html;

    location ^~ /api/ {
        proxy_pass http://api:3000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Backend (`.env`)

```env
NODE_ENV=production
AUTH_COOKIE_SAMESITE=lax
AUTH_COOKIE_SECURE=true
CORS_ORIGINS=https://qa.midominio.com
CSRF_ENABLED=true
```

---

## PROD

Igual que QA, cambiando dominios:

```env
CORS_ORIGINS=https://app.midominio.com
```

**No cambiar código** entre QA y PROD; solo variables e infraestructura.

---

## Cookies

| Cookie | HttpOnly | Path | TTL | Rol |
|--------|----------|------|-----|-----|
| `access_token` | sí | `/` | 15 min | JWT access |
| `refresh_token` | sí | `/auth/refresh` | 7–30 días | Refresh opaco (hash en BD) |
| `csrf_token` | **no** | `/` | 24 h | Double-submit CSRF |

### Atributos

- **HttpOnly** (auth): JS no puede leer → mitiga XSS.
- **Secure**: obligatorio en QA/PROD (HTTPS).
- **SameSite=lax**: suficiente con same-origin `/api`.
- **Path** en refresh: limita envío del refresh solo al endpoint de renovación.

---

## Endpoints de auth

| Método | Ruta | CSRF | Descripción |
|--------|------|------|-------------|
| GET | `/auth/csrf` | no | Emite token CSRF |
| POST | `/auth/login` | no | Login + sesión + cookies |
| POST | `/auth/refresh` | no | Rota refresh (cookie) |
| POST | `/auth/logout` | **sí** | Revoca sesión |
| GET | `/auth/me` | no | Perfil usuario |
| GET | `/auth/session` | no | Sesión activa (refresh) |
| POST | `/auth/change-password` | **sí** | Cambio + revoca todas las sesiones |
| GET | `/auth/sessions` | no | Sesiones activas del usuario |
| DELETE | `/auth/sessions/:id` | **sí** | Revocar sesión (propia o admin) |
| GET | `/auth/admin/sessions/:userId` | no | Admin: listar sesiones de otro usuario |

### Admin

```env
ADMIN_USER_IDS=cuid-usuario-1,cuid-usuario-2
```

---

## Flujos

### Login

```
POST /api/auth/login → cookies access + refresh + csrf
GET  /api/auth/me    → AuthState
```

### Refresh automático (Angular)

```
401 en petición → POST /api/auth/refresh → reintento
Fallo → logout → /login
```

### Cambio de contraseña

```
POST /api/auth/change-password
→ bcrypt nuevo hash
→ revokeAllSessions
→ clear cookies
→ redirect login
```

### CSRF (mutaciones)

```
GET /api/auth/csrf → { csrfToken } + cookie csrf_token
POST /api/credentials → header X-CSRF-Token === cookie
```

---

## Checklist despliegue

1. `npx prisma migrate deploy`
2. `JWT_SECRET` ≥ 32 caracteres aleatorios
3. `AUTH_COOKIE_SECURE=true` + HTTPS
4. `CORS_ORIGINS` con dominio exacto del frontend
5. `CSRF_ENABLED=true`
6. Nginx: `proxy_set_header X-Forwarded-Proto $scheme`
7. Angular: `enap_api: '/api'` en todos los environments
8. Configurar `ADMIN_USER_IDS` si se usa panel admin de sesiones

---

## Dominio credenciales.enap.edu.co

### Arquitectura correcta

```
Usuario → https://credenciales.enap.edu.co
              │
              ├─ /           → Angular (nginx frontend Docker)
              └─ /api/*      → proxy interno → api:3000 (NestJS)
```

**No exponer** `https://credenciales.enap.edu.co:3000` al público. El backend solo se consume vía `/api`.

### Verificación rápida

```bash
curl -I https://credenciales.enap.edu.co/
curl -I https://credenciales.enap.edu.co/api/docs
curl https://credenciales.enap.edu.co/api/auth/csrf
```

Los tres deben responder (200 o 301 en `/`).

### Si el front carga pero /api falla

1. **Proxy institucional** envía solo `/` al Docker y no `/api` → reenviar **todo** el tráfico al puerto 80 del contenedor `frontend-credentials` (ver `nginx/credenciales.enap.edu.co.conf`).
2. Reconstruir front tras cambiar nginx:
   ```bash
   cd back && docker compose build frontend && docker compose up -d
   ```
3. Variables en `.env`:
   ```env
   PUBLIC_APP_URL=https://credenciales.enap.edu.co
   CORS_ORIGINS=https://credenciales.enap.edu.co
   AUTH_COOKIE_SAMESITE=lax
   AUTH_COOKIE_SECURE=true
   ```

---

## Migración desde JWT en localStorage

Este proyecto **ya no** almacena tokens en el cliente. Si existía código legado:

- Eliminar `localStorage` / `sessionStorage` para tokens
- Usar `withCredentials: true` (centralizado en `EnapApi`)
- No enviar `Authorization: Bearer` desde Angular
