#!/bin/sh
set -e

log() {
  echo "[entrypoint] $*"
}

wait_for_postgres() {
  host="${POSTGRES_HOST:-postgres_server}"
  port="${POSTGRES_PORT:-5432}"
  user="${POSTGRES_USER:-admin}"
  attempts="${MIGRATE_DB_WAIT_ATTEMPTS:-60}"

  log "Esperando PostgreSQL en ${host}:${port}..."
  i=0
  while [ "$i" -lt "$attempts" ]; do
    if pg_isready -h "$host" -p "$port" -U "$user" -q 2>/dev/null; then
      log "PostgreSQL disponible."
      return 0
    fi
    i=$((i + 1))
    sleep 2
  done

  log "ERROR: PostgreSQL no respondió después de $((attempts * 2))s."
  return 1
}

run_migrations() {
  log "Ejecutando prisma migrate deploy..."
  if ! npx prisma migrate deploy; then
    log "ERROR: prisma migrate deploy falló. El API no se iniciará."
    exit 1
  fi
  log "Migraciones sincronizadas correctamente."
}

wait_for_postgres
run_migrations
exec "$@"
