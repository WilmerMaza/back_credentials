#!/usr/bin/env bash
# Despliegue rápido con caché (uso diario). Para build 100% limpio use docker-clean-deploy.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

export COMPOSE_DOCKER_CLI_BUILD=1
export DOCKER_BUILDKIT=1
export BUILD_REV="${BUILD_REV:-$(git -C "${ROOT_DIR}" rev-parse --short HEAD 2>/dev/null || date +%s)}"

docker compose up -d --build --force-recreate
