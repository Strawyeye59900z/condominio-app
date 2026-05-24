# Changelog

Todas as mudanças notáveis deste projeto serão documentadas aqui.

Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Versionamento: [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Adicionado — Fase 2 (autenticação)
- 3 endpoints de login: `/auth/admin/login` (email+senha), `/auth/funcionario/login` (loginId+senha), `/auth/morador/login` (numeroAp+senha).
- JWT access (15 min) no header `Authorization: Bearer` + refresh token (30 dias) em cookie httpOnly `cf_rt` no path `/api/v1/auth`.
- `/auth/refresh` (cookie) e `/auth/logout` (limpa cookie).
- `/auth/change-password`: para admin atualiza só a senha; para funcionário também limpa `mustChangePassword`; para morador atualiza senha do AP e limpa `isProvisional`.
- Guards globais `JwtAuthGuard` (com `@Public()` para liberar) e `RolesGuard` (com `@Roles('admin'|'funcionario'|'morador')`).
- Decorator `@AllowMustChangePassword()` para rotas que devem rodar mesmo enquanto o usuário ainda tem senha provisória (login → change-password → /me).
- `@CurrentUser()` injeta o usuário autenticado no handler.
- Seed automático do Admin no boot (a partir de `ADMIN_EMAIL` + `ADMIN_PASSWORD` do `.env`), idempotente.
- `/me` retorna perfil + dados específicos do role (incluindo lista de moradores para o AP).
- Validação de payload em todos os DTOs via `class-validator`.

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
