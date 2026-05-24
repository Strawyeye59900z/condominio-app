# Changelog

Todas as mudanças notáveis deste projeto serão documentadas aqui.

Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Versionamento: [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Adicionado — Fase 1 (skeleton + infra)
- Monorepo com npm workspaces (apps/api, apps/web, packages/shared).
- Schema Prisma completo (7 modelos: Admin, Funcionario, Apartamento, Morador, Encomenda, Reserva, AuditLog) + enums + índices.
- docker-compose.yml com 4 serviços (postgres, evolution, api, web) e healthchecks.
- API NestJS com endpoint `/api/v1/health` (verifica DB).
- Web Next.js (App Router) com Tailwind, página inicial mínima e proxy `/api/v1/*` → container `api`.
- Pacote `@condominio/shared` com tipos espelhados dos enums Prisma e constantes de regras de negócio (REGRAS).
- `scripts/install.sh`: instala Docker + cloudflared, clona repo, gera `.env` com secrets aleatórios, sobe a stack, configura cron de backup, imprime credenciais.
- `scripts/update.sh`: salvaguardas (git limpo, disco), backup automático pré-update, checkout da última tag estável, rebuild, migrate deploy, rollback documentado.
- `scripts/backup.sh` + `upload-drive.js` + `cleanup-drive.js`: pg_dump diário → Google Drive (cria pastas, sobrescreve mesmo nome) com retenção dos últimos 7.
- Dockerfiles multi-stage para API e Web; ambos suportam build sem `package-lock.json` (primeira instalação) e com (builds reproduzíveis).
