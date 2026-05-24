# ===== Stage 1: deps =====
FROM node:20-bookworm-slim AS deps
WORKDIR /repo

RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

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
FROM node:20-bookworm-slim AS build
WORKDIR /repo

RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

COPY --from=deps /repo /repo
COPY . .

RUN npx prisma generate --schema=prisma/schema.prisma
RUN npm --workspace apps/api run build

# ===== Stage 3: runtime =====
FROM node:20-bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends openssl ca-certificates wget && \
    rm -rf /var/lib/apt/lists/*

COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/package.json ./package.json
COPY --from=build /repo/prisma ./prisma
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/scripts ./scripts

ENV NODE_PATH=/app/node_modules
ENV NODE_ENV=production
EXPOSE 3001

CMD sh -c "npx prisma migrate deploy --schema=./prisma/schema.prisma && node dist/main.js"
