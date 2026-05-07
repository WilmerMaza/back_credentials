# Stage base con Node
FROM node:20-alpine AS base
WORKDIR /app

# Dependencias para construir (incluye dev deps para compilar)
FROM base AS deps
RUN apk add --no-cache libc6-compat
COPY package*.json ./
ENV NODE_ENV=development
RUN npm ci

# Build de la aplicación
FROM deps AS builder
COPY . .
RUN npx prisma generate
# Asegura permisos de ejecución del binario de Nest dentro de node_modules
RUN chmod +x node_modules/.bin/nest
RUN npm run build
# Reducir a dependencias de runtime
ENV NODE_ENV=production
RUN npm prune --production

# Imagen final de runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Usuario no-root
RUN addgroup -S nodejs && adduser -S nest -G nodejs
# Utilidades mínimas para healthcheck/init
RUN apk add --no-cache dumb-init curl openssl
COPY --from=builder --chown=nest:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nest:nodejs /app/dist ./dist
COPY --from=builder --chown=nest:nodejs /app/package*.json ./
COPY --from=builder --chown=nest:nodejs /app/prisma ./prisma

USER nest
EXPOSE 3000

# Healthcheck: acepta cualquier código <500 (útil si hay 401/404 por guards)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD sh -c 'PORT=${PORT:-3000}; code=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:${PORT}/docs || exit 1); [ "$code" -lt 500 ]'

CMD ["dumb-init", "node", "dist/main.js"]