#!/usr/bin/env bash
# Despliegue limpio: sin caché de build, imágenes nuevas y contenedores recreados.
# No borra volúmenes de datos (uploads, postgres).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_DIR="$(cd "${ROOT_DIR}/../db_credencial" && pwd)"

export COMPOSE_DOCKER_CLI_BUILD=1
export DOCKER_BUILDKIT=1
export BUILD_REV="${BUILD_REV:-$(git -C "${ROOT_DIR}" rev-parse --short HEAD 2>/dev/null || date +%s)}"

cd "${ROOT_DIR}"

echo "==> BUILD_REV=${BUILD_REV}"

if ! docker network inspect db_credencial_back-network >/dev/null 2>&1; then
  echo "==> Red db_credencial_back-network no existe; levantando PostgreSQL..."
  if [[ -d "${DB_DIR}" ]]; then
    (cd "${DB_DIR}" && docker compose up -d)
  else
    echo "ERROR: falta ${DB_DIR}. Levante la BD antes de continuar." >&2
    exit 1
  fi
fi

echo "==> Deteniendo contenedores credentials..."
docker compose down --remove-orphans

echo "==> Eliminando imágenes locales del proyecto..."
docker rmi -f back-credentials:latest front-credentials:latest 2>/dev/null || true

echo "==> Limpiando caché de build (etiqueta project=credentials)..."
docker builder prune -f --filter "label=project=credentials" 2>/dev/null || docker builder prune -f

echo "==> Construyendo imágenes sin caché (--no-cache --pull)..."
docker compose build --no-cache --pull

echo "==> Levantando contenedores (--force-recreate)..."
docker compose up -d --force-recreate --build

echo ""
echo "==> Despliegue limpio completado."
docker compose ps
