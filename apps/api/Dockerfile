# ===== Stage 1: deps =====
FROM node:20-alpine AS deps
WORKDIR /repo

COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY prisma ./prisma

RUN --mount=type=cache,target=/root/.npm \
    if [ -f package-lock.json ]; then \
      npm ci --workspaces --include-workspace-root; \
    else \
      npm install --workspaces --include-workspace-root --no-audit --no-fund; \
    fi

# ===== Stage 2: build =====
FROM node:20-alpine AS build
WORKDIR /repo

# Copia toda a árvore com node_modules (qualquer layout do hoisting)
COPY --from=deps /repo /repo

# Sobrepõe com o source code (sem node_modules — .dockerignore garante)
COPY . .

# Gera Prisma Client
RUN npx prisma generate --schema=prisma/schema.prisma

# Build do TypeScript
RUN npm --workspace apps/api run build

# ===== Stage 3: runtime =====
FROM node:20-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache wget

# Copia toda a build (inclui node_modules na raiz e/ou nos workspaces)
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/package.json ./package.json
COPY --from=build /repo/prisma ./prisma
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/scripts ./scripts

ENV NODE_PATH=/app/node_modules
ENV NODE_ENV=production
EXPOSE 3001

CMD sh -c "npx prisma migrate deploy --schema=./prisma/schema.prisma && node dist/main.js"
