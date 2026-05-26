# Dependências do Projeto

## Root (monorepo) — package.json

```json
{
  "workspaces": ["apps/*", "packages/*"],
  "engines": { "node": ">=20.0.0" },
  "devDependencies": {
    "prisma": "^5.22.0",
    "typescript": "^5.6.3"
  }
}
```

---

## Backend — apps/api/package.json

### Production Dependencies

| Pacote | Versão | Finalidade |
|--------|--------|-----------|
| `@nestjs/common` | ^10.4.7 | Core do NestJS (decorators, pipes, guards) |
| `@nestjs/core` | ^10.4.7 | Kernel do NestJS |
| `@nestjs/config` | ^3.3.0 | Gerenciamento de variáveis de ambiente |
| `@nestjs/jwt` | ^10.2.0 | Integração JWT |
| `@nestjs/passport` | ^10.0.3 | Integração Passport.js |
| `@nestjs/platform-express` | ^10.4.7 | HTTP adapter (Express) |
| `@nestjs/throttler` | ^6.5.0 | Rate limiting |
| `@prisma/client` | ^5.22.0 | Cliente ORM gerado |
| `@whiskeysockets/baileys` | ^7.0.0-rc13 | Cliente WhatsApp (Baileys) |
| `@hapi/boom` | ^10.0.1 | Erros HTTP estruturados (dep. do Baileys) |
| `axios` | ^1.7.7 | HTTP client |
| `bcryptjs` | ^2.4.3 | Hash de senhas (10 rounds) |
| `class-transformer` | ^0.5.1 | Transformação de DTOs |
| `class-validator` | ^0.14.1 | Validação de DTOs |
| `cookie-parser` | ^1.4.7 | Parse de cookies (refresh token) |
| `handlebars` | ^4.7.9 | Template engine (mensagens WhatsApp) |
| `helmet` | ^8.2.0 | Headers de segurança HTTP |
| `mime-types` | ^2.1.35 | Tipos MIME para arquivos |
| `nestjs-pino` | ^4.6.1 | Logger estruturado JSON |
| `passport` | ^0.7.0 | Middleware de autenticação |
| `passport-jwt` | ^4.0.1 | Estratégia JWT para Passport |
| `pdfkit` | ^0.15.2 | Geração de PDF (relatórios de reservas) |
| `pino-http` | ^10.5.0 | Middleware HTTP logging |
| `pino-pretty` | ^11.3.0 | Formatação legível dos logs (dev) |
| `qrcode` | ^1.5.4 | Geração de QR code (WhatsApp pairing) |
| `reflect-metadata` | ^0.2.2 | Suporte a decorators TypeScript |
| `rxjs` | ^7.8.1 | Reactive extensions (NestJS interno) |

### Dev Dependencies (API)

| Pacote | Finalidade |
|--------|-----------|
| `@nestjs/cli` | CLI do NestJS |
| `@nestjs/schematics` | Geradores de código |
| `vitest` | Framework de testes |
| `ts-node` | Execução TypeScript direto |
| `typescript` | Compilador TS |
| Tipos `@types/*` | Type declarations |

---

## Frontend — apps/web/package.json

### Production Dependencies

| Pacote | Versão | Finalidade |
|--------|--------|-----------|
| `next` | 14.2.18 | Framework React (App Router, SSR) |
| `react` | 18.3.1 | UI library |
| `react-dom` | 18.3.1 | DOM renderer |
| `framer-motion` | ^12.40.0 | Animações (tela de login, transições) |
| `lucide-react` | ^0.460.0 | Biblioteca de ícones SVG |
| `tailwindcss` | ^3.4.14 | CSS utilitário |
| `clsx` | ^2.1.1 | Conditional classnames |
| `tailwind-merge` | ^3.6.0 | Merge de classes Tailwind sem conflito |
| `browser-image-compression` | ^2.0.2 | Compressão de imagens no browser (fotos) |

### Dev Dependencies (Web)

| Pacote | Finalidade |
|--------|-----------|
| `@types/node` | Types Node.js |
| `@types/react` | Types React |
| `autoprefixer` | PostCSS: prefixos CSS |
| `postcss` | Processador CSS |
| `typescript` | Compilador TS |

---

## Scripts úteis

```bash
# Instalar todas as dependências
npm install

# Backend em desenvolvimento
npm run dev -w apps/api
# ou: cd apps/api && npm run start:dev

# Frontend em desenvolvimento
npm run dev -w apps/web

# Build de produção
npm run build -w apps/api
npm run build -w apps/web

# Rodar testes (API)
npm run test -w apps/api

# Seed do banco
npm run seed -w apps/api

# Migrations
npx prisma migrate dev      # desenvolvimento
npx prisma migrate deploy   # produção
```
