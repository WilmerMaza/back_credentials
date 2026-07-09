# Despliegue con Docker

Guía operativa para levantar **PostgreSQL**, **API (NestJS)** y **frontend (Angular + Nginx)** sin problemas de caché, red externa ni migraciones pendientes.

## Arquitectura

```
                    ┌─────────────────────────────────────┐
  Navegador :80     │  frontend-credentials (nginx)       │
  ───────────────►  │  /        → Angular                 │
                    │  /api/*   → proxy → api:3000        │
                    └──────────────┬──────────────────────┘
                                   │ credentials_internal
                    ┌──────────────▼──────────────────────┐
                    │  api-credentials (NestJS)           │
                    │  entrypoint: migrate deploy → API   │
                    └──────────────┬──────────────────────┘
                                   │ db_credencial_back-network
                    ┌──────────────▼──────────────────────┐
                    │  postgres_server (db_credencial)    │
                    └─────────────────────────────────────┘
```

| Proyecto | Ruta | Qué levanta |
|----------|------|-------------|
| Base de datos | `../db_credencial` | PostgreSQL, pgAdmin, proxy nginx |
| Aplicación | `back` | API + frontend |

---

## Orden de despliegue (obligatorio)

La API usa la red externa `db_credencial_back-network`. **PostgreSQL debe estar arriba primero.**

```bash
# 1. Base de datos
cd ../db_credencial
docker compose up -d

# 2. API + frontend
cd ../back
npm run docker:clean    # recomendado tras cambios de código o migraciones
```

Si solo levantas `back` sin la BD, verás:

```text
network db_credencial_back-network declared as external, but could not be found
```

---

## Scripts disponibles

Desde la carpeta `back`:

| Comando | Cuándo usarlo |
|---------|----------------|
| `npm run docker:clean` | **Build 100% limpio**: sin caché, imágenes nuevas, contenedores recreados. Usar tras cambios en código, frontend o migraciones. |
| `npm run docker:deploy` | Despliegue rápido con caché (día a día). |
| `npm run docker:migrate` | Solo aplicar migraciones pendientes (recrea el API o usa contenedor temporal). |

Equivalentes directos:

```bash
./scripts/docker-clean-deploy.sh
./scripts/docker-fresh-deploy.sh
./scripts/docker-migrate.sh
```

`docker:clean` **no borra** volúmenes de datos (`uploads`, `postgres_data`).

---

## Migraciones de base de datos

### Flujo en desarrollo

```bash
cd back

# 1. Cambiar prisma/schema.prisma
# 2. Crear migración
npx prisma migrate dev --name descripcion_del_cambio

# 3. Commitear migración + schema
git add prisma/migrations prisma/schema.prisma
git commit -m "feat(db): descripcion del cambio"
git push
```

### Flujo en servidor

```bash
cd back
git pull
npm run docker:clean
```

Las migraciones **deben existir en `prisma/migrations/` dentro de la imagen**. Si creaste la migración solo en local y no hiciste `git push`, el servidor no la tendrá.

### Cómo funciona en Docker

Al arrancar, el contenedor `api` ejecuta `scripts/docker-entrypoint.sh`:

1. Espera a PostgreSQL (`pg_isready` → `postgres_server:5432`).
2. Ejecuta `npx prisma migrate deploy`.
3. Si falla, **el API no inicia**.
4. Si todo OK, arranca `node dist/main.js`.

### Verificar migraciones

```bash
# Logs del arranque
docker logs api-credentials 2>&1 | head -20

# Estado en la BD
docker compose exec api npx prisma migrate status
```

Salida esperada en logs:

```text
[entrypoint] Esperando PostgreSQL en postgres_server:5432...
[entrypoint] PostgreSQL disponible.
[entrypoint] Ejecutando prisma migrate deploy...
[entrypoint] Migraciones sincronizadas correctamente.
```

### Solo migrar (sin rebuild completo)

```bash
npm run docker:migrate
```

Útil cuando ya desplegaste la imagen nueva pero el contenedor no se recreó.

---

## Build limpio vs cambios viejos

Docker y el navegador pueden mostrar versiones anteriores por distintas razones.

### Imagen Docker con código viejo

**Síntoma:** cambios en backend/frontend no se reflejan tras `docker compose up -d`.

**Causa:** caché de build o contenedor no recreado.

**Solución:**

```bash
npm run docker:clean
```

El build usa `BUILD_REV` (commit git o timestamp) para invalidar capas de código.

### Frontend en el navegador

**Síntoma:** JS antiguo (URLs viejas, `enap_api` con IP, etc.).

**Causa:** nginx sirve `.js` con `Cache-Control: immutable` (30 días).

**Solución:** hard refresh (`Ctrl+Shift+R`) o ventana privada tras cada deploy del frontend.

### Migraciones que “no corren”

**Síntoma:** schema en código ≠ schema en BD.

| Causa | Solución |
|-------|----------|
| Contenedor no recreado | `npm run docker:clean` o `npm run docker:migrate` |
| Migración no commiteada / no en servidor | `git push` + `git pull` + rebuild |
| Imagen vieja sin `prisma/migrations` nuevas | `npm run docker:clean` |
| PostgreSQL no disponible al arrancar | Verificar `db_credencial` y logs del entrypoint |

---

## Variables de entorno relevantes

Archivo `back/.env` (usado por `api`):

| Variable | Uso |
|----------|-----|
| `DATABASE_URL` | Conexión Prisma. En Docker debe usar host `postgres_server`, no `127.0.0.1`. |
| `PUBLIC_APP_URL` | URL del QR en PDF del backend (`https://credenciales.enap.edu.co`). |
| `AUTH_COOKIE_SECURE` | `false` sin HTTPS; `true` cuando haya certificado ([SSL_CERTIFICATE.md](./SSL_CERTIFICATE.md)). |
| `CORS_ORIGINS` | Orígenes permitidos del front. |
| `JWT_SECRET` | En `.env` con `$` usar `$$` para Docker Compose. |

Ejemplo `DATABASE_URL` en Docker:

```env
DATABASE_URL="postgresql://admin:PASSWORD@postgres_server:5432/credencial_db"
```

---

## Comandos de diagnóstico

```bash
# Contenedores activos
docker compose ps

# Red de PostgreSQL existe
docker network inspect db_credencial_back-network

# Migraciones dentro de la imagen
docker exec api-credentials ls prisma/migrations/

# Health del API
docker inspect api-credentials --format '{{.State.Health.Status}}'

# Probar API vía nginx del front
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/api/docs
```

---

## Checklist de despliegue en servidor

- [ ] `git pull` en `back` y `frontend_credentials_21` (si aplica)
- [ ] `docker compose up -d` en `db_credencial`
- [ ] `.env` con `DATABASE_URL` apuntando a `postgres_server`
- [ ] `npm run docker:clean` en `back`
- [ ] Revisar logs: `docker logs api-credentials | head -20`
- [ ] `docker compose exec api npx prisma migrate status`
- [ ] Probar login en el front con hard refresh
- [ ] Verificar que las peticiones van a `/api/...`, no a `:3000`

---

## Datos de prueba (seed)

```bash
# 1. Tipos de credencial (militar, civil, alumnos_baena)
npm run seed:credential-types

# 2. Credenciales de prueba (desde el host, Postgres en :5432)
npm run seed:credentials:local        # 10 registros por defecto
npm run seed:credentials:local -- 25  # cantidad personalizada

# Limpiar registros de prueba (@seed.enap.test) y volver a generar
npm run seed:credentials:local -- --clear 20
```

Los registros de prueba se crean **sin foto** (`imagePath: null`) para validar la imagen por defecto en el frontend (`/images/default-credential.svg`).

---

- [AUTH_DEPLOYMENT.md](./AUTH_DEPLOYMENT.md) — cookies, CSRF, proxy `/api`, ambientes DEV y Docker.
- [SSL_CERTIFICATE.md](./SSL_CERTIFICATE.md) — qué hacer cuando llegue el certificado HTTPS.
- [ARQUITECTURA_Y_EVALUACION.md](./ARQUITECTURA_Y_EVALUACION.md) — evaluación de arquitectura y proxy institucional ENAP.
- [README.md](../README.md) — documentación general del API.
