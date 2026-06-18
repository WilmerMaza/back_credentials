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

Cada `CredentialType` guarda en `schema` un objeto JSON con esta forma:

```json
{
  "fields": [
    {
      "name": "force",
      "label": "Fuerza",
      "type": "select",
      "required": true,
      "options": ["armada", "ejercito", "fuerza_aerea"],
      "optionLabels": {
        "armada": "Armada",
        "ejercito": "Ejército",
        "fuerza_aerea": "Fuerza Aérea"
      }
    }
  ]
}
```

- **`fields`**: array ordenado. El orden importa: un campo con `dependsOn` debe ir **después** de su padre.
- **`name`**: clave que se persiste en `metadata` al crear/editar la credencial.
- **`label`**: texto del formulario (solo presentación).
- **`type`**: control a renderizar y reglas de validación a aplicar.

Fuente de verdad en código:

| Archivo | Rol |
|---------|-----|
| `src/credentials/domain/credential-type-schema.ts` | Contrato TypeScript + comentarios por propiedad |
| `src/credentials/domain/credential-type-schemas.ts` | Catálogos por tipo (`militar`, `cadetes`) |
| `prisma/seed-credential-types.ts` | Inyecta schemas en BD (`npm run seed:credential-types`) |

### Tipos soportados

`text`, `textarea`, `number`, `date`, `email`, `select`, `radio`, `checkbox`, `boolean`

### Propiedades de cada campo

#### Básicas (todos los tipos)

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `name` | string | Clave en `metadata` |
| `label` | string | Etiqueta del formulario |
| `type` | string | Tipo de control |
| `required` | boolean? | Obligatorio en POST/PATCH |
| `minLength` / `maxLength` | number? | Texto |
| `min` / `max` | number? | Número |
| `pattern` | string? | Regex para texto |
| `options` | string[]? | Lista fija (select/radio/checkbox sin cascada) |

#### Cascada (opcional)

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `dependsOn` | string? | `name` del campo padre |
| `optionsByParent` | object? | `{ "valorPadre": ["opcion1", "opcion2"] }` |
| `optionGroupsByParent` | object? | `{ "valorPadre": [{ "name": "Grupo", "options": [{ "value", "label" }] }] }` |
| `optionLabels` | object? | `{ "codigo": "Etiqueta visible" }` |
| `hiddenWhen` | object? | `{ "field": "category", "values": ["IMP"] }` |
| `autoValueWhen` | object? | Valor obligatorio al guardar si el padre coincide |
| `defaultValueWhen` | object? | Valor a **preseleccionar** en el formulario si el padre coincide |

### Validaciones backend

- `required`
- `minLength` / `maxLength`
- `min` / `max`
- `pattern`
- `options` para `select`, `radio`, `checkbox`
- Cascada: `dependsOn`, `optionsByParent`, `optionGroupsByParent`, `optionLabels`
- Reglas condicionales: `hiddenWhen`, `autoValueWhen`, `defaultValueWhen`

Implementación: `MetadataSchemaValidator` en `src/credentials/application/services/metadata-schema.validator.ts`

## Cómo funciona el JSON (flujo completo)

```
GET /credential-types/militar
        │
        ▼
  schema.fields (JSON)
        │
        ├─► Frontend: renderiza formulario, filtra opciones según dependsOn
        │
        └─► POST/PATCH metadata ──► MetadataSchemaValidator ──► Credential.metadata
```

### Resolución de opciones (frontend y backend)

Para un campo con `dependsOn`:

1. Leer el valor actual del campo padre en el formulario / metadata.
2. Si el padre está vacío → el hijo no muestra opciones (backend rechaza si es required).
3. Buscar opciones en este orden:
   - `optionGroupsByParent[valorPadre]` → extraer cada `option.value`
   - si no existe → `optionsByParent[valorPadre]`
   - si no existe → `options` (lista fija)
4. Validar que el valor enviado pertenezca a esa lista.

### Reglas hiddenWhen / autoValueWhen / defaultValueWhen

- **`defaultValueWhen`**: el frontend debe **preseleccionar** el valor al cambiar el campo padre (sugerencia en el formulario).
- **`autoValueWhen`**: el backend **exige** ese valor al guardar; si el campo viene vacío, lo completa.
- **`hiddenWhen`**: oculta el campo en el formulario (ej. militar IMP).

Si el cliente envía un valor distinto al de `autoValueWhen` → `400 Bad Request`.

### Qué se persiste en metadata

Solo las claves `name` de cada campo, con el **value** seleccionado (no el label):

```json
{
  "force": "armada",
  "category": "OfficerNavy",
  "grades": "Teniente de Corbeta",
  "unit": "Fragata ARC Caldas"
}
```

Los códigos internos (`OfficerNavy`, `ArmyOfficer`) van en `category`; los rangos van como texto completo en `grades`.

## Cascada por formulario

Cada `CredentialType` puede declarar campos dependientes en su `schema`. El frontend filtra opciones según el formulario seleccionado; el backend valida coherencia al persistir.

### Ejemplo JSON militar (fragmento)

```json
{
  "fields": [
    {
      "name": "force",
      "type": "select",
      "options": ["armada", "ejercito", "fuerza_aerea"]
    },
    {
      "name": "category",
      "type": "select",
      "dependsOn": "force",
      "optionsByParent": {
        "ejercito": ["ArmyOfficer", "ArmySubofficer", "IMP"]
      },
      "optionGroupsByParent": {
        "armada": [
          {
            "name": "Oficiales",
            "options": [
              { "value": "OfficerNavy", "label": "Oficial Naval" }
            ]
          }
        ]
      }
    },
    {
      "name": "grades",
      "type": "select",
      "dependsOn": "category",
      "optionsByParent": {
        "OfficerNavy": ["Teniente de Corbeta", "Teniente de Fragata"]
      },
      "hiddenWhen": { "field": "category", "values": ["IMP"] },
      "autoValueWhen": {
        "field": "category",
        "values": { "IMP": "Infante de marina profesional" }
      }
    }
  ]
}
```

### Ejemplo JSON cadetes (regla Aspirante)

```json
{
  "fields": [
    {
      "name": "grado",
      "type": "select",
      "options": ["aspirante", "cadete", "guardiamarina", "alferez"]
    },
    {
      "name": "compania",
      "type": "select",
      "options": ["binney", "tono", "brion", "padilla"],
      "autoValueWhen": { "field": "grado", "values": { "aspirante": "binney" } },
      "defaultValueWhen": { "field": "grado", "values": { "aspirante": "binney" } }
    },
    {
      "name": "curso",
      "type": "select",
      "options": ["1.1", "1.2", "2.1", "2.2", "3.1", "3.2", "4.1", "4.2"],
      "autoValueWhen": { "field": "grado", "values": { "aspirante": "1.1" } },
      "defaultValueWhen": { "field": "grado", "values": { "aspirante": "1.1" } }
    }
  ]
}
```

Si `grado = aspirante`, el API devuelve `defaultValueWhen` para preseleccionar **Binney** y **1.1**; `autoValueWhen` garantiza esos valores al guardar.

### Migración inter-escuelas → cadetes

El seed renombra el tipo `inter-escuelas` a `cadetes` conservando el mismo `id` y las credenciales vinculadas. La metadata histórica (`force`, `sport`, `course`) no se transforma; solo aplica el nuevo schema en registros nuevos o al editar.

### Compatibilidad legacy

| Legacy | Tratamiento |
|--------|-------------|
| `metadata.categorie` | Aceptado en escritura; normalizado a `category` |
| `metadata.rank` | Aceptado en escritura; normalizado a `grades` |

Las respuestas de lectura exponen claves canónicas (`category`, `grades`).

## API

### Tipos de credencial

- `GET /credential-types` — lista tipos con schema
- `GET /credential-types/:code` — detalle de un tipo

### Crear credencial

`POST /credentials` (multipart/form-data)

Campos comunes:

- firstName, lastName, identityNumber, typeIdentity, birthDate, institutionalEmail
- credentialTypeCode, image, expirationDate (opcional)
- `fullName` se calcula en backend y se persiste en BD (no se envía desde el front)

Campos dinámicos:

- `metadata` — JSON string con los valores del formulario dinámico

Ejemplo:

```json
{
  "credentialTypeCode": "militar",
  "metadata": {
    "force": "armada",
    "category": "OfficerNavy",
    "grades": "Teniente de Corbeta",
    "unit": "Fragata ARC Caldas"
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

Crea/actualiza: `militar`, `civil`, `cadetes` con sus schemas. Migra `inter-escuelas` → `cadetes` si existe en BD.

## Agregar un nuevo tipo

1. Definir el schema en `src/credentials/domain/credential-type-schemas.ts` (o inline en `prisma/seed-credential-types.ts`).
2. Añadir el tipo al array de `prisma/seed-credential-types.ts`.
3. Ejecutar `npm run seed:credential-types`.
4. No se requieren migraciones ni cambios de código si solo usas propiedades ya soportadas.
5. El frontend renderiza el formulario desde `schema.fields` automáticamente.

### Checklist para campos en cascada

- [ ] El campo padre aparece **antes** que el hijo en `fields`.
- [ ] `dependsOn` usa el `name` exacto del padre.
- [ ] Las claves de `optionsByParent` / `optionGroupsByParent` coinciden con los **values** del padre.
- [ ] Si usas `hiddenWhen`, define `autoValueWhen` para el valor a persistir.
- [ ] Ejecutar seed y probar GET `/credential-types/:code` + POST con metadata válida/inválida.

## Migración desde columnas legacy

La migración `20260605120000_credential_metadata_schema` mueve `rank`, `unit`, `force`, `sport`, `course` y `grades` a `metadata` y elimina esas columnas.
