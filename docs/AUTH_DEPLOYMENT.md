# Autenticación y despliegue — DEV / Docker / PROD

Guía alineada con la arquitectura real del proyecto: **Angular + Nginx en Docker**, API interna en la red Docker, sin Nginx en el servidor host.

---

## Principio

Angular **siempre** consume rutas relativas:

```
/api/auth/login
/api/credentials
```

| Ambiente | Quién resuelve `/api` |
|----------|------------------------|
| **DEV** (`ng serve`) | `proxy.conf.json` → `localhost:3000` |
| **Docker / PROD** | Nginx del contenedor `frontend-credentials` → `api:3000` |

---

## Arquitectura Docker (local y servidor)

```
                    ┌─────────────────────────────────────┐
  Usuario :80       │  contenedor frontend-credentials    │
  ───────────────►  │  Nginx                              │
                    │    /        → Angular (SPA)         │
                    │    /api/*   → proxy → api:3000      │
                    └─────────────────────────────────────┘
                                        │
                    ┌───────────────────▼───────────────────┐
                    │  contenedor api-credentials           │
                    │  NestJS :3000 (solo red interna)      │
                    └─────────────────────────────────────┘
```

- El puerto **3000 no se publica** al exterior (solo `expose` en Docker).
- El único punto de entrada público es el puerto **80** del contenedor frontend.
- Configuración Nginx: `frontend_credentials_21/nginx/nginx.conf`

Cuando llegue HTTPS, ver [SSL_CERTIFICATE.md](./SSL_CERTIFICATE.md).

---

## DEV (localhost con `ng serve`)

### Frontend (`frontend_credentials_21`)

```typescript
// environment.development.ts
{ enap_api: '/api', publicAppUrl: '' }
```

`publicAppUrl` vacío usa `window.location.origin` (útil para QR en local).

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

### Backend (`.env` local)

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

### Por qué no hay fricción CORS en DEV

El navegador ve `http://localhost:4200/api/...` (mismo origen). El proxy de Angular reenvía a `:3000` en el servidor.

---

## Docker (local o servidor sin SSL)

### Despliegue

```bash
cd back
cp .env.example .env   # primera vez; ajustar secretos
npm run docker:deploy  # o: ./scripts/docker-fresh-deploy.sh
```

### Frontend (build producción)

- `environment.ts`: `enap_api: '/api'`
- `publicAppUrl: 'https://credenciales.enap.edu.co'` (QR del PDF)

El Dockerfile del frontend copia `nginx/nginx.conf` y el build de Angular.

### Backend (`.env` en Docker)

```env
NODE_ENV=production
DATABASE_URL=postgresql://...@postgres_server:5432/credencial_db
AUTH_COOKIE_SAMESITE=lax
AUTH_COOKIE_SECURE=false
PUBLIC_APP_URL=https://credenciales.enap.edu.co
CORS_ORIGINS=http://credenciales.enap.edu.co,http://credenciales.enap
CSRF_ENABLED=true
```

`AUTH_COOKIE_SECURE=false` es correcto **mientras** el usuario acceda por HTTP (`:80`).

### Verificación

```bash
curl -I http://localhost/
curl -I http://localhost/api/docs
curl -s http://localhost/api/auth/csrf
```

---

## PROD con HTTPS

No cambiar código entre ambientes. Solo variables e infraestructura.

```env
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_SAMESITE=lax
PUBLIC_APP_URL=https://credenciales.enap.edu.co
CORS_ORIGINS=https://credenciales.enap.edu.co,https://credenciales.enap
```

Pasos detallados (proxy ENAP vs SSL en Docker): **[SSL_CERTIFICATE.md](./SSL_CERTIFICATE.md)**.

---

## Cookies

| Cookie | HttpOnly | Path | TTL | Rol |
|--------|----------|------|-----|-----|
| `access_token` | sí | `/` | 15 min | JWT access |
| `refresh_token` | sí | `/auth/refresh` | 7–30 días | Refresh opaco (hash en BD) |
| `csrf_token` | **no** | `/` | 24 h | Double-submit CSRF |

### Atributos

- **HttpOnly** (auth): JS no puede leer → mitiga XSS.
- **Secure**: obligatorio cuando el usuario accede por HTTPS (`AUTH_COOKIE_SECURE=true`).
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

### CSRF (mutaciones)

```
GET /api/auth/csrf → { csrfToken } + cookie csrf_token
POST /api/credentials → header X-CSRF-Token === cookie
```

Angular usa `withCredentials: true` en todas las peticiones (`EnapApi`).

---

## Headers de proxy (Nginx Docker)

El Nginx del contenedor frontend reenvía al API:

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $forwarded_proto;
proxy_set_header X-Forwarded-Host $host;
```

NestJS tiene `trust proxy: 1` en `main.ts`.

Si un proxy externo (ENAP) termina SSL, debe enviar `X-Forwarded-Proto: https` hacia el puerto 80 del contenedor.

---

## Checklist despliegue

1. Red Docker `db_credencial_back-network` activa (PostgreSQL levantado)
2. `npx prisma migrate deploy` (automático al iniciar contenedor `api`)
3. `JWT_SECRET` ≥ 32 caracteres aleatorios
4. `AUTH_COOKIE_SECURE` acorde al protocolo (false sin HTTPS, true con HTTPS)
5. `PUBLIC_APP_URL` = URL pública del front (QR en PDF)
6. Angular: `enap_api: '/api'` en todos los environments
7. `CSRF_ENABLED=true`
8. Configurar `ADMIN_USER_IDS` si se usa panel admin de sesiones

---

## Dominio credenciales.enap.edu.co

### Correcto

```
https://credenciales.enap.edu.co/           → Angular
https://credenciales.enap.edu.co/api/*    → NestJS (proxy interno Docker)
```

### Incorrecto

```
https://credenciales.enap.edu.co:3000/      ← API no debe ser público
Proxy ENAP → :3000 solo para /api           ← rompe la arquitectura
```

### Si el front carga pero `/api` falla

1. Confirmar que **todo** el tráfico llega al puerto **80** del contenedor `frontend-credentials`.
2. Reconstruir frontend si cambió `nginx/nginx.conf`:
   ```bash
   cd back && docker compose build frontend && docker compose up -d frontend
   ```
3. Revisar variables en `.env` (ver sección PROD con HTTPS).

---

## Migración desde JWT en localStorage

Este proyecto **no** almacena tokens en el cliente:

- Sin `localStorage` / `sessionStorage` para tokens
- `withCredentials: true` en `EnapApi`
- Sin header `Authorization: Bearer` desde Angular
