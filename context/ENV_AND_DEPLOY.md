# Variáveis de Ambiente e Deploy

## Variáveis de Ambiente

Arquivo de referência: `.env.example`
Arquivo real: `.env` (git-ignored)

| Variável | Obrigatória | Exemplo | Descrição |
|----------|------------|---------|-----------|
| `APP_URL` | Sim | `https://mhvl.com.br` | URL pública (CORS + redirect) |
| `TZ` | Sim | `America/Sao_Paulo` | Timezone do servidor |
| `NODE_ENV` | Sim | `production` | Nível de log (production=info, outros=debug) |
| `POSTGRES_USER` | Sim | `condominio` | Usuário PostgreSQL |
| `POSTGRES_PASSWORD` | Sim | *(random)* | Senha PostgreSQL |
| `POSTGRES_DB` | Sim | `condominio` | Nome do banco |
| `DATABASE_URL` | Sim | `postgresql://user:pass@db:5432/condominio` | Connection string completa |
| `JWT_SECRET` | Sim | *(64 chars random)* | Segredo access token |
| `JWT_REFRESH_SECRET` | Sim | *(64 chars random)* | Segredo refresh token |
| `JWT_ACCESS_TTL` | Sim | `15m` | Vida útil access token |
| `JWT_REFRESH_TTL` | Sim | `30d` | Vida útil refresh token (cookie httpOnly) |
| `ADMIN_EMAIL` | Sim | `sindico@condominio.com` | Email do admin criado no seed |
| `ADMIN_PASSWORD` | Sim | *(random)* | Senha do admin criado no seed |
| `API_PORT` | Não | `3001` | Porta do servidor NestJS |
| `WEB_PORT` | Não | `3000` | Porta do Next.js |
| `API_INTERNAL_URL` | Não | `http://api:3001` | URL interna da API (SSR Next.js) |
| `UPLOADS_DIR` | Não | `/app/uploads` | Diretório de armazenamento de arquivos |
| `EVOLUTION_API_URL` | Legado | `http://evolution:8080` | ⚠️ Não usado — migrado para Baileys |
| `EVOLUTION_API_KEY` | Legado | *(random)* | ⚠️ Não usado — pode ser removido |
| `EVOLUTION_INSTANCE` | Legado | `condominio` | ⚠️ Não usado — pode ser removido |
| `GDRIVE_SA_FILE` | Planejado | `/secrets/gdrive.json` | Google Drive service account (futuro) |
| `GDRIVE_ROOT_FOLDER_ID` | Planejado | *(folder ID)* | ID da pasta raiz no Drive (futuro) |

### Onde cada variável é usada no código

| Variável | Arquivo |
|----------|---------|
| `NODE_ENV` | `apps/api/src/main.ts` |
| `API_PORT` | `apps/api/src/main.ts` |
| `APP_URL` | `apps/api/src/main.ts` (CORS) |
| `DATABASE_URL` | `prisma/schema.prisma` |
| `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL` | `apps/api/src/auth/auth.module.ts` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | `apps/api/src/seed/seed.service.ts` |
| `UPLOADS_DIR` | `apps/api/src/drive/drive.service.ts` |
| `API_INTERNAL_URL` | `apps/web/src/lib/api.ts` (SSR) |

---

## Docker Compose

Arquivo: `docker-compose.yml`

### Serviços

| Serviço | Container | Porta | Descrição |
|---------|-----------|-------|-----------|
| `db` | `condominio-db` | 5432 (interno) | PostgreSQL |
| `api` | `condominio-api` | 3001 (interno) | NestJS backend |
| `web` | `condominio-web` | 3000 (interno) | Next.js frontend |

### Volumes importantes

| Volume | Mount | Descrição |
|--------|-------|-----------|
| `pg_data` | `/var/lib/postgresql/data` | Dados PostgreSQL (persistente) |
| `uploads` | `/app/uploads` | Fotos e arquivos enviados |
| `wa_auth` | `/app/auth_info_condominio` | Credenciais Baileys WhatsApp (persistente) |

> **Importante**: O volume `wa_auth` garante que a sessão do WhatsApp sobrevive a restarts do container. Sem ele, o QR code precisaria ser re-escaneado após cada restart.

---

## Deploy no LXC

### Setup inicial

```bash
cd /opt/condominio
git clone https://github.com/Strawyeye59900z/condominio-app .
cp .env.example .env
# Editar .env com credenciais reais
docker compose up -d --build
```

### Atualizar em produção

```bash
cd /opt/condominio
git pull
docker compose build
docker compose up -d
```

### Comandos úteis

```bash
# Ver logs em tempo real
docker compose logs -f api
docker compose logs -f web

# Reiniciar serviço específico
docker compose restart api

# Acessar container da API
docker compose exec api sh

# Rodar migrations em produção
docker compose exec api npx prisma migrate deploy --schema=./prisma/schema.prisma

# Seed do banco (primeira vez)
docker compose exec api node dist/seed.js

# Ver status dos containers
docker compose ps
```

---

## Cloudflare Tunnel

O app é exposto via Cloudflare Tunnel (não há porta aberta diretamente na internet).
O tunnel roteia `mhvl.com.br` para o container web/api internamente.
