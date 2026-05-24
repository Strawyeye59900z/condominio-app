# ===== Stage 1: deps =====
FROM node:20-bookworm-slim AS deps
WORKDIR /repo

COPY package.json package-lock.json* ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

RUN --mount=type=cache,target=/root/.npm \
    if [ -f package-lock.json ]; then \
      npm ci --workspaces --include-workspace-root; \
    else \
      npm install --workspaces --include-workspace-root --no-audit --no-fund; \
    fi

# ===== Stage 2: build =====
FROM node:20-bookworm-slim AS build
WORKDIR /repo

COPY --from=deps /repo /repo
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm --workspace apps/web run build

# ===== Stage 3: runtime =====
FROM node:20-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends wget ca-certificates && \
    rm -rf /var/lib/apt/lists/*

COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public

EXPOSE 3000
WORKDIR /app/apps/web
CMD ["node", "server.js"]
