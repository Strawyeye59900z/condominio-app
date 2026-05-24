# ===== Stage 1: deps =====
FROM node:20-alpine AS deps
WORKDIR /repo

# Copia manifestos do workspace
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY prisma ./prisma

# Instala deps de todos os workspaces. Usa npm ci se houver lockfile
# (reprodutível) ou npm install no primeiro build.
RUN --mount=type=cache,target=/root/.npm \
    if [ -f package-lock.json ]; then \
      npm ci --workspaces --include-workspace-root; \
    else \
      npm install --workspaces --include-workspace-root --no-audit --no-fund; \
    fi

# ===== Stage 2: build =====
FROM node:20-alpine AS build
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /repo/packages/shared/node_modules ./packages/shared/node_modules
COPY . .

# Gera Prisma Client (precisa do schema)
RUN npx prisma generate --schema=prisma/schema.prisma

# Build do TypeScript do api
RUN npm --workspace apps/api run build

# ===== Stage 3: runtime =====
FROM node:20-alpine AS runtime
WORKDIR /app

# Apenas o necessário para rodar
RUN apk add --no-cache wget

COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/package.json ./package.json
COPY --from=build /repo/prisma ./prisma
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/api/node_modules ./apps/api/node_modules
# Scripts JS (upload/cleanup Drive) usados pelo backup.sh via `docker compose exec`
COPY --from=build /repo/scripts ./scripts

# Symlink p/ que o Prisma Client achado em /app/node_modules funcione
ENV NODE_PATH=/app/node_modules

ENV NODE_ENV=production
EXPOSE 3001

# Entrypoint: aplica migrations e sobe a API
CMD sh -c "npx prisma migrate deploy --schema=./prisma/schema.prisma && node dist/main.js"
