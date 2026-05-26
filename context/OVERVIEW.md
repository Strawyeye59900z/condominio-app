# Condomínio App — Visão Geral

## Descrição

Sistema de gestão condominial com módulos de encomendas, reservas de espaços,
reconhecimento facial e notificações WhatsApp. Três perfis de usuário: síndico
(admin), porteiro (funcionário) e morador.

## Stack

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Backend | NestJS + TypeScript | 10.4.7 |
| Frontend | Next.js 14 (App Router) | 14.2.18 |
| Banco de dados | PostgreSQL via Prisma ORM | 5.22.0 |
| WhatsApp | Baileys (reverse-engineered) | 7.0.0-rc13 |
| Autenticação | JWT (Access 15m + Refresh 30d cookie) | — |
| Estilo | Tailwind CSS + Lucide Icons | 3.4.14 |
| Animações | Framer Motion | 12.x |
| PDF | PDFKit | 0.15.2 |
| Logs | Pino (nestjs-pino) | — |
| Segurança | Helmet, bcrypt (10 rounds), CORS restrito | — |

## Domínio & Deploy

- **Domínio público**: `mhvl.com.br` (via Cloudflare Tunnel)
- **Repositório**: `github.com/Strawyeye59900z/condominio-app`
- **Branch principal**: `main`
- **Deploy**: LXC container no servidor próprio (host: Apps)
- **Diretório deploy**: `/opt/condominio`
- **Comando deploy**: `git pull && docker compose build && docker compose up -d`

## Monorepo (npm workspaces)

```
apps/api      → NestJS backend (porta 3001 interna)
apps/web      → Next.js frontend (porta 3000)
packages/     → Shared types e constantes
prisma/       → Schema e migrations PostgreSQL
```

## Perfis de Usuário

| Perfil | Login | Acesso |
|--------|-------|--------|
| **Admin (Síndico)** | email + senha | `/admin/**` |
| **Funcionário (Porteiro)** | loginId + senha | `/porteiro/**` |
| **Morador** | nº apartamento + senha | `/me/**` |

## Variáveis Críticas

- `DATABASE_URL` — connection string PostgreSQL
- `JWT_SECRET` / `JWT_REFRESH_SECRET` — segredos dos tokens
- `APP_URL` — URL pública (CORS + redirect)
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — credenciais do seed inicial

## API Base URL

- **Externo**: `https://mhvl.com.br/api/v1`
- **Interno (SSR)**: `http://api:3001/api/v1` (via `API_INTERNAL_URL`)
- **Prefixo global**: `/api/v1`
- **Rate limit global**: 60 req/min; rotas auth: 10 req/min
