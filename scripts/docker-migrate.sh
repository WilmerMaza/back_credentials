#!/usr/bin/env bash
# Aplica migraciones pendientes sin reconstruir imágenes (útil en servidor).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

if ! docker compose ps --status running api 2>/dev/null | grep -q api-credentials; then
  echo "==> API no está corriendo; ejecutando migraciones en contenedor temporal..."
  docker compose run --rm --no-deps api npx prisma migrate deploy
else
  echo "==> Recreando API para ejecutar entrypoint (migrate deploy)..."
  docker compose up -d --force-recreate --no-deps api
fi

echo ""
docker compose exec api npx prisma migrate status
