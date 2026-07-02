# Migraciones históricas (archivadas)

Estas migraciones incrementales fueron reemplazadas por una **baseline única**:

`prisma/migrations/20260702210000_baseline_full_schema/`

Se conservan aquí solo como referencia del historial de cambios.

**Fecha de consolidación:** 2026-07-02

## ¿Por qué?

La base de datos en producción/desarrollo ya tenía todo el esquema aplicado. La baseline:

- Refleja el estado real actual de la BD (introspección con `prisma migrate diff --from-empty --to-url`)
- Simplifica despliegues nuevos: un solo `prisma migrate deploy`
- Evita depender de 12 migraciones encadenadas

## Base de datos existente

Si ya tenías datos, la baseline se marcó como aplicada sin re-ejecutar el SQL:

```bash
npx prisma migrate resolve --applied 20260702210000_baseline_full_schema
```

## Base de datos nueva (vacía)

```bash
npx prisma migrate deploy
```

Crea todas las tablas, enums, índices **y los 3 tipos de credencial iniciales**:

| code | name |
|------|------|
| `militar` | Militar |
| `civil` | Personal Civil |
| `alumnos_baena` | Alumnos BAENA |

Los INSERT usan `ON CONFLICT (code) DO UPDATE` para ser idempotentes.

## Actualizar solo tipos en BD existente

```bash
npm run seed:credential-types
```
