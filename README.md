# API de Credenciales — ENAP

API REST para el registro, consulta y gestión de credenciales digitales (personal militar, civil e inter-escuelas). Incluye autenticación JWT, formularios dinámicos por tipo de credencial, envío de correo vía Azure/Exchange y almacenamiento de imágenes.

---

## Tabla de contenidos

- [Descripción general](#descripción-general)
- [Stack tecnológico](#stack-tecnológico)
- [Arquitectura](#arquitectura)
- [Requisitos](#requisitos)
- [Configuración](#configuración)
- [Instalación y ejecución](#instalación-y-ejecución)
- [Docker](#docker)
- [Base de datos](#base-de-datos)
- [Documentación API (Swagger)](#documentación-api-swagger)
- [Endpoints](#endpoints)
- [Autenticación](#autenticación)
- [Modelo de credenciales (metadata)](#modelo-de-credenciales-metadata)
- [Normalización de datos](#normalización-de-datos)
- [Correo electrónico](#correo-electrónico)
- [Seguridad](#seguridad)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Scripts disponibles](#scripts-disponibles)
- [Documentación adicional](#documentación-adicional)

---

## Descripción general

Este backend forma parte del sistema de **Credenciales Digitales** de la ENAP. Permite:

- Registrar personas y emitir credenciales con foto.
- Definir **tipos de credencial** con formularios dinámicos (JSON Schema).
- Consultar credenciales paginadas con resumen por estado (activas, inactivas, pendientes).
- Validar duplicados de correo institucional y cédula antes del registro.
- Autenticar operadores del sistema con JWT en cookie httpOnly.
- Enviar credenciales en PDF por correo (SMTP OAuth2 con Azure AD).

El frontend Angular vive en el repositorio hermano `frontend_credentials_21` y se despliega junto a esta API mediante Docker Compose.

---

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Runtime | Node.js 20 |
| Framework | NestJS 10 |
| ORM | Prisma 5 + PostgreSQL |
| Patrón | Arquitectura hexagonal + CQRS |
| Auth | JWT (Passport) + bcrypt |
| Validación | class-validator |
| Documentación | Swagger / OpenAPI |
| Correo | nodemailer + `@azure/identity` (SMTP Office 365) |
| Contenedores | Docker + Docker Compose |

---

## Arquitectura

```
src/
├── auth/           # Login, registro, JWT
├── credentials/    # Dominio principal (CQRS)
│   ├── application/   # Commands, Queries, DTOs, servicios
│   ├── domain/        # Entidades y contratos de repositorio
│   └── infrastructure/ # Controllers, Prisma, mappers
├── mail/           # Envío de correo con PDF adjunto
├── prisma/         # Módulo global de Prisma
└── common/         # Guards, utilidades compartidas
```

**Flujo CQRS (credenciales):**

```
HTTP Controller → CommandBus / QueryBus → Handler → Repository → Prisma → PostgreSQL
```

---

## Requisitos

- Node.js >= 20
- PostgreSQL >= 14
- npm
- Docker y Docker Compose (opcional, para despliegue)

---

## Configuración

Copia el archivo de ejemplo y ajusta las variables:

```bash
cp .env.example .env
```

### Variables de entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | Conexión PostgreSQL | `postgresql://user:pass@host:5432/credencial_db` |
| `PORT` | Puerto del API | `3000` |
| `JWT_SECRET` | Secreto para firmar tokens JWT | cadena larga y aleatoria |
| `API_KEY` | Clave opcional global (`x-api-key`). Vacío = desactivado | `""` |
| `UPLOADS_DIR` | Directorio de imágenes | `uploads/credentials` |
| `NODE_ENV` | Entorno | `development` / `production` |
| `AUTH_COOKIE_SAMESITE` | Cookie de sesión: `none` (dev cross-origin) o `lax` (prod) | `none` |
| `AZURE_TENANT_ID` | Tenant Azure AD para correo | UUID |
| `AZURE_CLIENT_ID` | App registrada en Azure | UUID |
| `AZURE_CLIENT_SECRET` | Secreto de la app | string |
| `AZURE_SENDER_EMAIL` | Buzón emisor Exchange | `credenciales@enap.edu.co` |
| `MAIL_FROM_NAME` | Nombre visible del remitente | `Credencial Digital` |
| `MAX_PDF_SIZE_MB` | Límite de cuerpo/archivos PDF | `25` |

---

## Instalación y ejecución

### Desarrollo local

```bash
# 1. Dependencias
npm install

# 2. Cliente Prisma
npm run prisma:generate

# 3. Migraciones
npm run prisma:migrate

# 4. Tipos de credencial (militar, civil, inter-escuelas)
npm run seed:credential-types

# 5. Servidor en modo watch
npm run start:dev
```

El API queda disponible en `http://localhost:3000`.

### Producción

```bash
npm run build
npm run start:prod
```

---

## Docker

El `docker-compose.yml` levanta **API + frontend**:

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| `api` | `3000` | Backend NestJS |
| `frontend` | `80` | Angular + Nginx (proxy `/api` → API) |

```bash
docker compose up -d --build
```

Al iniciar, el contenedor `api` ejecuta automáticamente `prisma migrate deploy`.

---

## Base de datos

### Modelos principales

```
Person          → Datos personales (nombre, apellido, CC, correo)
User            → Cuentas de acceso al sistema
CredentialType  → Tipos con schema JSON dinámico
Credential      → Credencial emitida (metadata, foto, estado)
```

### Estados de credencial

| Estado | Descripción |
|--------|-------------|
| `ACTIVE` | Activa |
| `PENDING` | Pendiente |
| `EXPIRED` | Vencida |
| `REVOKED` | Revocada |
| `SUSPENDED` | Suspendida |

### Person — nombre separado

| Campo | Origen |
|-------|--------|
| `firstName` | Enviado por el frontend |
| `lastName` | Enviado por el frontend |
| `fullName` | Calculado en backend (`firstName + lastName` normalizado) |

---

## Documentación API (Swagger)

Con el servidor en ejecución:

**http://localhost:3000/docs**

Incluye todos los endpoints, DTOs y la opción de probar requests (con API Key si está configurada).

---

## Endpoints

### Autenticación — `/auth`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/auth/login` | No | Inicia sesión (cookie `access_token`) |
| `POST` | `/auth/register` | No | Registra usuario del sistema |
| `GET` | `/auth/me` | JWT | Perfil del usuario autenticado |
| `POST` | `/auth/refresh` | JWT | Renueva la cookie de sesión |
| `POST` | `/auth/logout` | No | Cierra sesión |

### Credenciales — `/credentials`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/credentials` | JWT | Crear credencial (multipart) |
| `PATCH` | `/credentials/:id` | JWT | Actualizar credencial (multipart) |
| `GET` | `/credentials` | JWT | Listar paginado + `summary` |
| `GET` | `/credentials/:id` | JWT | Detalle de una credencial |

**Query params de listado:** `page`, `limit`

**Respuesta de listado:**

```json
{
  "data": [ ... ],
  "total": 150,
  "page": 1,
  "limit": 10,
  "totalPages": 15,
  "summary": {
    "activas": 120,
    "inactivas": 25,
    "pendientes": 5
  }
}
```

### Tipos de credencial — `/credential-types`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/credential-types` | JWT | Lista tipos con `schema` |
| `GET` | `/credential-types/:code` | JWT | Detalle de un tipo |

### Validaciones — `/validations`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/validations/email?email=` | JWT | ¿Existe el correo institucional? |
| `GET` | `/validations/identity?identityNumber=` | JWT | ¿Existe la cédula/CC? |

Respuesta: `{ "exists": true | false }`

### Correo — `/mail`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/mail/send-email` | API Key / JWT | Envía PDF por correo (multipart) |

### Archivos — `/uploads/credentials`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/uploads/credentials/:filename` | No | Sirve imagen de credencial |

---

## Autenticación

- **JWT** almacenado en cookie httpOnly `access_token` (duración: 1 hora).
- También se acepta `Authorization: Bearer <token>`.
- CORS habilitado con `credentials: true` para peticiones desde el frontend.

### Desarrollo local (front y API en puertos distintos)

Configura en `.env`:

```env
AUTH_COOKIE_SAMESITE=none
```

En producción con Nginx (mismo dominio), usa `lax`.

### API Key global (opcional)

Si `API_KEY` tiene valor, todas las rutas exigen el header:

```
x-api-key: <tu-api-key>
```

Si está vacío, el guard no bloquea solicitudes.

---

## Modelo de credenciales (metadata)

Los campos específicos de cada tipo (rango, fuerza, deporte, etc.) se almacenan en **`metadata` (JSONB)**, no en columnas fijas.

Cada `CredentialType` define su formulario en **`schema` (JSONB)**.

### Crear credencial — `POST /credentials`

`Content-Type: multipart/form-data`

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `firstName` | string | Sí | Nombre |
| `lastName` | string | Sí | Apellido |
| `identityNumber` | string | Sí | Número de identificación |
| `typeIdentity` | string | Sí | Tipo doc. (`CC`, `TI`, etc.) |
| `birthDate` | ISO date | Sí | Fecha de nacimiento |
| `institutionalEmail` | email | Sí | Correo institucional |
| `credentialTypeCode` | string | Sí | Código del tipo (`militar`, etc.) |
| `metadata` | JSON string | No | Campos dinámicos del tipo |
| `image` | file | Sí | Foto (JPEG/PNG) |
| `expirationDate` | ISO date | No | Fecha de vencimiento |
| `details` | string | No | Notas adicionales |

**Ejemplo de `metadata` (tipo militar):**

```json
{
  "force": "ejercito",
  "grades": "Teniente",
  "unit": "Batallon 12"
}
```

> Documentación técnica completa: [docs/CREDENTIALS_METADATA.md](./docs/CREDENTIALS_METADATA.md)

---

## Normalización de datos

Antes de persistir, el backend normaliza los datos personales en `src/common/utils/person-data.normalizer.ts`:

| Campo | Regla |
|-------|-------|
| `firstName`, `lastName` | Trim, espacios múltiples → uno, Title Case |
| `fullName` | Concatenación normalizada (solo BD) |
| `institutionalEmail` | Minúsculas + trim |
| `identityNumber` | Trim, sin espacios internos |
| `typeIdentity` | Mayúsculas (`cc` → `CC`) |
| `credentialTypeCode` | Minúsculas + trim |

Los campos dinámicos en `metadata` se validan contra el `schema` del tipo mediante `MetadataSchemaValidator`.

---

## Correo electrónico

El envío usa **SMTP OAuth2** de Office 365 con `@azure/identity`:

1. Obtiene token con `ClientSecretCredential`.
2. Envía vía `smtp.office365.com:587` con nodemailer.

**Requisitos en Azure Portal:**

- Permiso de aplicación `SMTP.Send` (o configuración SMTP habilitada para la app).
- Buzón emisor con licencia Exchange Online.

**Script de prueba local:**

```bash
node pruebacorreo.js
```

---

## Seguridad

Documentación detallada: [docs/SECURITY.md](./docs/SECURITY.md)

### Resumen de capas

```
Cliente → [Nginx: body 25MB] → [Rate limit] → [API Key] → [JWT] → [ValidationPipe] → Handler
```

### Rate limiting (throttling)

Implementado con `@nestjs/throttler` como **guard global** en `app.module.ts`:

```typescript
ThrottlerModule.forRoot([{
  ttl: 60000,   // ventana de 60 segundos
  limit: 10,    // máximo 10 peticiones por IP en esa ventana
}])
```

| Parámetro | Valor | Efecto |
|-----------|-------|--------|
| `ttl` | `60000` ms (1 min) | Ventana de tiempo |
| `limit` | `10` | Peticiones permitidas por IP por ventana |
| Guard | `ThrottlerGuard` | Aplica a **todas** las rutas |

**Respuesta al exceder el límite:** `429 Too Many Requests`

> El frontend maneja el 429 en login con el mensaje *"Demasiados intentos. Intenta de nuevo más tarde."*

**Ajustar el límite:** editar `ttl` y `limit` en `src/app.module.ts`. Para límites distintos por ruta (ej. login más estricto), se puede usar el decorador `@Throttle()` o `@SkipThrottle()` de `@nestjs/throttler`.

---

### API Key global

Guard: `ApiKeyGuard` (`src/common/guards/api-key.guard.ts`)

| `API_KEY` en `.env` | Comportamiento |
|---------------------|----------------|
| Vacío (`""`) | Guard desactivado, todas las rutas pasan |
| Con valor | Todas las rutas exigen header `x-api-key: <valor>` |

Útil para proteger el API en entornos sin JWT o como capa adicional (ej. envío de correo desde el front).

---

### Autenticación JWT

| Aspecto | Detalle |
|---------|---------|
| Estrategia | Passport JWT (`JwtStrategy`) |
| Almacenamiento | Cookie httpOnly `access_token` |
| Duración | 1 hora (`maxAge: 3600000`) |
| Alternativa | Header `Authorization: Bearer <token>` |
| Rutas protegidas | `/credentials/*`, `/credential-types/*`, `/validations/*`, `/auth/me`, `/auth/refresh`, `/uploads/credentials/*` |

Rutas **sin** JWT: `/auth/login`, `/auth/register`, `/auth/logout`, `/mail/send-email` (si no hay API Key), `/docs`.

**Cookies en desarrollo cross-origin** (`localhost:4002` → `:3000`):

```env
AUTH_COOKIE_SAMESITE=none
```

En producción con Nginx (mismo dominio): `AUTH_COOKIE_SAMESITE=lax`.

---

### Contraseñas y login

| Medida | Implementación |
|--------|----------------|
| Hash | **bcrypt**, factor de costo `10` |
| Timing attacks | Si el usuario no existe, se compara contra un hash bcrypt dummy (mismo tiempo de respuesta) |
| Registro duplicado | `409 Conflict` si el email ya está registrado |

---

### Validación de entrada

`ValidationPipe` global en `main.ts`:

| Opción | Efecto |
|--------|--------|
| `whitelist: true` | Elimina propiedades no declaradas en el DTO |
| `forbidNonWhitelisted: true` | Rechaza el body si trae campos extra (`400`) |
| `transform: true` | Convierte tipos automáticamente (query strings → number, etc.) |

DTOs con `class-validator`: `@IsEmail()`, `@IsNotEmpty()`, `@IsDateString()`, etc.

**Metadata dinámica:** validada en backend con `MetadataSchemaValidator` según el `schema` del `CredentialType` (no confiar solo en el front).

---

### Límites de tamaño (uploads y body)

| Capa | Límite | Configuración |
|------|--------|---------------|
| JSON / urlencoded | `MAX_PDF_SIZE_MB` (default 25 MB) | `main.ts` → `bodyLimit` |
| Imagen credencial | **5 MB** | `multer-options.ts` → `fileSize` |
| PDF correo | `MAX_PDF_SIZE_MB` (default 25 MB) | `pdf-multer-options.ts` |
| Nginx (proxy) | **25 MB** | `nginx/default.conf` → `client_max_body_size` |

### Validación de archivos (Multer)

| Endpoint | Tipo permitido | Validación |
|----------|----------------|------------|
| `POST /credentials` | Solo imágenes | `mimetype.startsWith('image/')` |
| `POST /mail/send-email` | Solo PDF | `mimetype === 'application/pdf'` |

Nombres de archivo generados con UUID para evitar colisiones y path traversal.

---

### CORS

```typescript
app.enableCors({
  origin: true,        // refleja el Origin del cliente
  credentials: true,   // permite cookies (JWT)
});
```

En producción se recomienda restringir `origin` a dominios conocidos en lugar de `true`.

---

### Base de datos

- Restricciones **UNIQUE** en `Person.identityNumber` y `Person.institutionalEmail`.
- Índices en `Credential.personId` y `Credential.credentialTypeId`.
- Eliminación en cascada: borrar `Person` elimina sus `Credential`.

---

### Docker / runtime

| Medida | Detalle |
|--------|---------|
| Usuario no-root | Contenedor corre como usuario `nest` |
| Recursos | Límite `512M` RAM, `0.75` CPU (`docker-compose.yml`) |
| Healthcheck | Verifica `/docs` cada 30 s |
| Secretos | Variables sensibles solo en `.env` (no commitear) |

---

### Checklist de producción

- [ ] `JWT_SECRET` largo y aleatorio
- [ ] `API_KEY` definida si el API es público
- [ ] `AUTH_COOKIE_SAMESITE=lax` y `secure: true` en cookies (HTTPS)
- [ ] `NODE_ENV=production`
- [ ] CORS con orígenes explícitos (no `origin: true`)
- [ ] Revisar `limit` del throttler según carga esperada
- [ ] Rotar `AZURE_CLIENT_SECRET` periódicamente

---

## Estructura del proyecto

```
back/
├── prisma/
│   ├── schema.prisma          # Modelo de datos
│   ├── migrations/            # Migraciones SQL
│   ├── seed-credential-types.ts
│   └── seed-credentials.ts
├── src/
│   ├── auth/
│   ├── credentials/
│   ├── mail/
│   ├── prisma/
│   ├── common/
│   ├── app.module.ts
│   └── main.ts
├── docs/
│   └── CREDENTIALS_METADATA.md
├── uploads/credentials/       # Imágenes subidas (gitignored)
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── README.md
```

---

## Scripts disponibles

| Script | Descripción |
|--------|-------------|
| `npm run start:dev` | Servidor con hot-reload |
| `npm run build` | Compila TypeScript |
| `npm run start:prod` | Ejecuta build de producción |
| `npm run prisma:generate` | Genera cliente Prisma |
| `npm run prisma:migrate` | Migraciones en desarrollo |
| `npm run seed:credential-types` | Seed tipos militar/civil/inter-escuelas |
| `npm run seed:credentials` | Seed credenciales de prueba (`npm run seed:credentials -- 50`) |

---

## Documentación adicional

| Documento | Contenido |
|-----------|-----------|
| [docs/CREDENTIALS_METADATA.md](./docs/CREDENTIALS_METADATA.md) | Arquitectura metadata + JSON Schema |
| [docs/SECURITY.md](./docs/SECURITY.md) | Rate limiting, guards, JWT, uploads |
| [Swagger](http://localhost:3000/docs) | Referencia interactiva de la API |

---

## Licencia

Proyecto privado — ENAP / uso institucional.
