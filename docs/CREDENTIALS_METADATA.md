# Arquitectura de credenciales con metadata y JSON Schema

## Resumen

Las credenciales usan columnas fijas para datos comunes y un campo `metadata` (JSONB) para campos variables según el tipo. Cada `CredentialType` define su formulario y validaciones mediante `schema` (JSONB).

## Modelo de datos

### Credential (columnas fijas)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | string | Identificador |
| personId | string | Persona asociada |
| credentialTypeId | string | Tipo de credencial |
| status | enum | ACTIVE, PENDING, EXPIRED, REVOKED, SUSPENDED |
| imagePath | string? | Ruta de la foto |
| issueDate | datetime? | Fecha de emisión |
| expirationDate | datetime? | Fecha de vencimiento |
| details | string? | Notas libres / JSON legacy |
| metadata | JSONB | Campos dinámicos del tipo |
| createdAt / updatedAt | datetime | Auditoría |

### CredentialType

| Campo | Tipo | Descripción |
|-------|------|-------------|
| code | string | Código único (`militar`, `civil`, etc.) |
| name | string | Nombre visible |
| schema | JSONB | Definición de campos dinámicos |

## Formato del schema

```json
{
  "fields": [
    {
      "name": "force",
      "label": "Fuerza",
      "type": "select",
      "required": true,
      "options": ["armada", "ejercito", "fuerza_aerea"]
    }
  ]
}
```

### Tipos soportados

`text`, `textarea`, `number`, `date`, `email`, `select`, `radio`, `checkbox`, `boolean`

### Validaciones backend

- `required`
- `minLength` / `maxLength`
- `min` / `max`
- `pattern`
- `options` para `select`, `radio`, `checkbox`

Implementación: `MetadataSchemaValidator` en `src/credentials/application/services/metadata-schema.validator.ts`

## API

### Tipos de credencial

- `GET /credential-types` — lista tipos con schema
- `GET /credential-types/:code` — detalle de un tipo

### Crear credencial

`POST /credentials` (multipart/form-data)

Campos comunes:

- fullName, identityNumber, typeIdentity, birthDate, institutionalEmail
- credentialTypeCode, image, expirationDate (opcional)

Campos dinámicos:

- `metadata` — JSON string con los valores del formulario dinámico

Ejemplo:

```json
{
  "credentialTypeCode": "militar",
  "metadata": {
    "force": "ejercito",
    "grades": "Teniente",
    "unit": "Batallón 12"
  }
}
```

### Listar credenciales

`GET /credentials` devuelve `metadata` en cada ítem y `summary` con conteos por estado.

## Flujo frontend

1. `GET /credential-types` al cargar registro
2. El componente `DynamicCredentialForm` construye el formulario desde `schema.fields`
3. Al enviar, `registration.service` serializa `details` en `metadata`
4. Vista de credencial y PDF leen `metadata` vía `detallesRegistro`

## Seed de tipos

```bash
npm run seed:credential-types
```

Crea/actualiza: `militar`, `civil`, `inter-escuelas` con sus schemas.

## Agregar un nuevo tipo

1. Insertar registro en `CredentialType` con `code`, `name` y `schema`
2. No se requieren migraciones ni cambios de código
3. El frontend renderiza el formulario automáticamente

## Migración desde columnas legacy

La migración `20260605120000_credential_metadata_schema` mueve `rank`, `unit`, `force`, `sport`, `course` y `grades` a `metadata` y elimina esas columnas.
