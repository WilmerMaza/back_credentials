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

## 3. JWT y sesión

**Archivos:** `src/auth/`, `src/auth/infrastructure/strategies/jwt.strategy.ts`

### Emisión del token

- `POST /auth/login` y `POST /auth/refresh` setean cookie:
  - Nombre: `access_token`
  - `httpOnly: true` (no accesible desde `document.cookie` en JS)
  - `maxAge: 3600000` (1 hora)
  - `sameSite`: configurable vía `AUTH_COOKIE_SAMESITE`

### Extracción del token (orden)

1. Cookie `access_token`
2. Header `Authorization: Bearer <token>`
3. Query `?token=<token>` (legacy)

### Rutas con `@UseGuards(JwtAuthGuard)`

- `GET/POST/PATCH /credentials*`
- `GET /credential-types*`
- `GET /validations/*`
- `GET /uploads/credentials/:filename`
- `GET /auth/me`, `POST /auth/refresh`

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

## 7. CORS

```typescript
app.enableCors({ origin: true, credentials: true });
```

- `credentials: true` permite envío de cookies JWT desde el frontend.
- **Recomendación producción:** reemplazar `origin: true` por lista explícita de dominios.

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
