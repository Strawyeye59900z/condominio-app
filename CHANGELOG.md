# Changelog

Todas as mudanças notáveis deste projeto serão documentadas aqui.

Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Versionamento: [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Adicionado — Fase 3 (apartamentos & moradores)
- `POST /admin/funcionarios` cria porteiro com `mustChangePassword=true` (senha provisória gerada ou informada, retornada uma única vez).
- `GET/PATCH /admin/funcionarios` listar, desativar, resetar senha.
- `POST /admin/apartamentos` cria 1 AP; `POST /admin/apartamentos/bulk { csv }` aceita CSV `numero,senha` em lote (header opcional, idempotente, ignora duplicados existentes, valida formato).
- `GET/PATCH /admin/apartamentos` lista (com contador de moradores) e reseta senha.
- `GET/PATCH /admin/moradores` visão global do síndico (com filtros) e ações (desativar, `resetFoto: true` que destrava nova foto e volta `statusFacial` para PENDENTE).
- `GET/POST/PATCH/DELETE /me/moradores` autoatendimento do AP: o primeiro morador cadastrado vira `isAdminAp` automaticamente; ao desativar o admin do AP, o próximo morador ativo (mais antigo) assume.
- Util `randomPassword` (alfabeto sem caracteres confusos) usado em todos os pontos de geração de senha provisória.

### Adicionado — Fase 4 (pipeline de foto facial + Drive + painel Tinder)
- `DriveService` (Google Drive via Service Account): `uploadOrUpdate` (cria/atualiza arquivo no caminho `Fotos/{numeroAp}/`, com cache de pastas), `download` e `trash`. Pega `GDRIVE_SA_FILE` + `GDRIVE_ROOT_FOLDER_ID` do `.env`.
- `POST /me/consent-lgpd { moradorId, aceito: true }` — registra `consentLgpdAt` + IP.
- `POST /me/foto/:moradorId` (multipart, campo `foto`): valida MIME (jpeg/png/webp), limite 1 MB (HTTP 413), exige consent prévio, recusa se `statusFacial=REGISTRADO` (foto já travada — só síndico libera via `resetFoto`). Filename `AP{numero}_{NomeNormalizado}.{ext}`.
- `POST /porteiro/me/foto` (funcionário): mesma validação + upload em `Fotos/_funcionarios/`. Aceito com `mustChangePassword` ativo (parte obrigatória do 1º login).
- `GET /admin/facial-queue/next`: morador mais antigo com `statusFacial=PENDENTE` + tem foto. Retorna metadata + URLs de proxy/download. 204 quando fila vazia.
- `GET /admin/facial-queue/:id/foto`: streama bytes da imagem (proxy — não vaza URL Drive) com `Cache-Control: no-store`.
- `GET /admin/facial-queue/:id/foto-download`: força download com `Content-Disposition` + filename padronizado `AP{numero}_{Nome}.{ext}`.
- `POST /admin/facial-queue/:id/registrado`: marca `statusFacial=REGISTRADO` (síndico já cadastrou na leitora física do prédio).

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
