# Seguridad — API de Credenciales

Este documento describe las medidas de seguridad implementadas en el backend.

---

## 1. Rate limiting (Throttler)

**Paquete:** `@nestjs/throttler`  
**Config:** `src/common/config/throttle.config.ts`  
**Registro:** `src/app.module.ts`

### Estrategia (por ruta, no solo global)

El límite global anterior (**10 req/min en todo**) bloqueaba la SPA en lecturas y validaciones. Ahora:

| Tipo de ruta | Decorador | Límite default |
|--------------|-----------|----------------|
| Lecturas (GET listados, validaciones, tipos, imágenes) | `@SkipThrottle()` | Sin límite |
| Auth sensible (login, register) | `@Throttle(THROTTLE_AUTH)` | 10 / min |
| Escritura (POST/PATCH credenciales) | `@Throttle(THROTTLE_WRITE)` | 30 / min |
| Correo | `@Throttle(THROTTLE_MAIL)` | 10 / min |
| Resto | Default global | 120 / min |
| `/docs` | `skipIf` en config | Sin límite |

### Variables de entorno

```env
THROTTLE_TTL=60000          # ventana en ms
THROTTLE_LIMIT=120          # default global
THROTTLE_AUTH_LIMIT=10      # login / register
THROTTLE_WRITE_LIMIT=30     # crear / editar credencial
THROTTLE_MAIL_LIMIT=10      # envío de correo
```

### Personalizar una ruta

```typescript
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { THROTTLE_AUTH } from '../common/config/throttle.config';

@SkipThrottle()
@Get()
list() { ... }

@Throttle(THROTTLE_AUTH)
@Post('login')
login() { ... }
```

### Frontend

El componente de login detecta `status === 429` y muestra:
*"Demasiados intentos. Intenta de nuevo más tarde."*

---

## 2. API Key

**Archivo:** `src/common/guards/api-key.guard.ts`

| Variable | Comportamiento |
|----------|----------------|
| `API_KEY=""` | Guard inactivo |
| `API_KEY="secreto"` | Header obligatorio: `x-api-key: secreto` |

Se registra como `APP_GUARD` global, por lo que se evalúa **antes** de llegar al controller (junto con ThrottlerGuard).

**Respuesta inválida:** `401 Unauthorized` — `"Invalid API key"`

---

## 3. Autenticación HttpOnly + sesiones

**Documentación completa:** [AUTH_DEPLOYMENT.md](./AUTH_DEPLOYMENT.md)

### Cookies

| Cookie | HttpOnly | Path | TTL |
|--------|----------|------|-----|
| `access_token` | sí | `/` | 15 min (`JWT_ACCESS_TTL`) |
| `refresh_token` | sí | `/auth/refresh` | 7–30 días |
| `csrf_token` | no | `/` | 24 h |

### Sesiones (PostgreSQL)

Cada login crea un registro en `Session` con refresh opaco (hash SHA-256), `familyId` para detectar reutilización, y revocación en logout / cambio de contraseña.

### CSRF

Double-submit: cookie `csrf_token` + header `X-CSRF-Token` en mutaciones (POST/PATCH/DELETE). Excluido en login, register y refresh.

### Extracción del access token

1. Cookie `access_token`
2. Header `Authorization: Bearer` (opcional, herramientas)

### Variables

```env
JWT_ACCESS_TTL=15m
REFRESH_TOKEN_TTL_DAYS=7
AUTH_COOKIE_SAMESITE=lax
AUTH_COOKIE_SECURE=false
CORS_ORIGINS=http://localhost:4200
CSRF_ENABLED=true
ADMIN_USER_IDS=
```

---

## 4. Contraseñas

**Archivo:** `src/auth/application/auth.service.ts`

- Almacenamiento: **bcrypt** con `salt rounds = 10`.
- Login: comparación constante en tiempo mediante hash dummy si el usuario no existe (mitiga enumeración por timing).

```typescript
const hashToCompare = user
  ? user.passwordHash
  : "$2b$10$r9VlO7pTf.S19v.S19v.S19v.S19v.S19v.S19v.S19v.S19v.S";
await bcrypt.compare(pass, hashToCompare);
```

---

## 5. Validación de entrada

**Archivo:** `src/main.ts`

```typescript
new ValidationPipe({
  whitelist: true,           // strip campos no definidos en DTO
  transform: true,           // cast automático de tipos
  forbidNonWhitelisted: true // 400 si el body trae campos extra
})
```

### Metadata dinámica

`MetadataSchemaValidator` valida en servidor los campos de `metadata` según el JSON Schema del tipo de credencial (`required`, `minLength`, `pattern`, `options`, etc.).

### Normalización de Person

`person-data.normalizer.ts` normaliza antes de persistir (Title Case nombres, email lowercase, CC sin espacios).

---

## 6. Límites de archivos y body

| Recurso | Límite | Archivo |
|---------|--------|---------|
| Body JSON/form | 25 MB (env `MAX_PDF_SIZE_MB`) | `main.ts` |
| Imagen credencial | 5 MB, solo `image/*` | `multer-options.ts` |
| PDF correo | 25 MB, solo `application/pdf` | `pdf-multer-options.ts` |
| Nginx proxy | 25 MB | `nginx/default.conf` |

Nombres de archivo: `timestamp-uuid.ext` (evita sobrescritura y nombres predecibles).

---

## 7. CORS y Helmet

```typescript
// main.ts
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.enableCors({
  origin: parseCorsOrigins(process.env.CORS_ORIGINS),
  credentials: true,
});
```

- `credentials: true` permite cookies HttpOnly desde el frontend.
- **Producción:** `CORS_ORIGINS` con lista explícita (ej. `https://app.midominio.com`).

---

## 8. Base de datos

- `Person.identityNumber` — UNIQUE
- `Person.institutionalEmail` — UNIQUE
- `User.email` — UNIQUE
- `CredentialType.code` — UNIQUE
- `onDelete: Cascade` en Credential → Person

Endpoints de validación previa:
- `GET /validations/email?email=`
- `GET /validations/identity?identityNumber=`

---

## 9. Docker

- Imagen Alpine, usuario **no-root** (`nest`).
- Límites de recursos: 512 MB RAM, 0.75 CPU.
- Healthcheck HTTP en `/docs`.
- Secretos vía `env_file: .env` (no incluir `.env` en git).

---

## 10. Variables sensibles

| Variable | Uso |
|----------|-----|
| `JWT_SECRET` | Firma de tokens |
| `API_KEY` | Guard global opcional |
| `DATABASE_URL` | Credenciales PostgreSQL |
| `AZURE_CLIENT_SECRET` | OAuth2 correo |

Nunca commitear `.env`. Usar `.env.example` como plantilla sin secretos reales.

---

## 11. Checklist despliegue producción

1. `JWT_SECRET` — mínimo 32 caracteres aleatorios.
2. `API_KEY` — activar si el API es accesible desde internet.
3. Cookies: `secure: true` + HTTPS + `sameSite: lax` o `strict`.
4. CORS: orígenes explícitos.
5. Throttler: ajustar `limit` según tráfico (login puede necesitar `@Throttle` más estricto).
6. Rotar secretos Azure periódicamente.
7. Backups de PostgreSQL y volumen `uploads-data`.
