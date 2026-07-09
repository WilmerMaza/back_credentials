#!/usr/bin/env bash
# Ejecuta el seed desde el host contra PostgreSQL expuesto en localhost:5432.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

if [[ -z "${DATABASE_URL:-}" ]]; then
  export DATABASE_URL="postgresql://admin:R0b0t1c%40%2A%2A@127.0.0.1:5432/credencial_db"
  echo "==> DATABASE_URL por defecto (localhost:5432)"
fi

npm run seed:credentials -- "$@"
