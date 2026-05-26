# Mapa de Diretórios e Arquivos

## Estrutura Raiz

```
condominio-app/
├── apps/
│   ├── api/          NestJS backend
│   └── web/          Next.js 14 frontend
├── packages/
│   └── shared/       Tipos e enums compartilhados
├── prisma/
│   ├── schema.prisma Definição do banco de dados
│   └── migrations/   Histórico de migrations
├── scripts/          Scripts utilitários (update.sh, etc.)
├── secrets/          Segredos (git-ignored)
├── context/          ← Este diretório de contexto
├── docker-compose.yml
├── .env.example
└── package.json      Monorepo root (npm workspaces)
```

---

## Backend — apps/api/src/

### auth/
Autenticação e autorização completa.

| Arquivo | O que faz |
|---------|-----------|
| `auth.controller.ts` | Endpoints de login (admin/funcionário/morador), refresh, logout, change-password, CRUD de admins |
| `auth.service.ts` | Hash/compare bcrypt, geração de JWT, 3 fluxos de login, refresh token |
| `guards/jwt-auth.guard.ts` | Guard global JWT (decodifica e valida token) |
| `guards/roles.guard.ts` | RBAC — enforça decorator `@Roles()` |
| `guards/jwt-refresh.guard.ts` | Valida refresh token vindo do cookie |
| `strategies/jwt.strategy.ts` | Passport JWT strategy (extrai usuário do token) |
| `strategies/jwt-refresh.strategy.ts` | Passport JWT refresh strategy |
| `decorators/current-user.decorator.ts` | Extrai usuário do request context |
| `decorators/public.decorator.ts` | Marca endpoint como público (bypass JWT) |
| `decorators/roles.decorator.ts` | Define roles requeridas no controller |
| `types/auth.types.ts` | Tipos: JwtPayload, UserRole, RequestUser |
| `dto/login.dto.ts` | DTOs de request/response de login |

### apartamentos/
CRUD de unidades do condomínio.

| Arquivo | O que faz |
|---------|-----------|
| `apartamentos.controller.ts` | Admin: criar, bulk upload (CSV), listar, atualizar, resetar senha |
| `apartamentos.service.ts` | Lógica de negócio — cria AP com senha provisional |
| `dto/apartamentos.dto.ts` | DTOs de criação e atualização |

### moradores/
Gestão de moradores por apartamento.

| Arquivo | O que faz |
|---------|-----------|
| `moradores.admin.controller.ts` | Admin: listar todos (filtro AP/statusFacial), atualizar, resetar senha AP |
| `moradores.me.controller.ts` | Morador: CRUD de moradores do próprio AP |
| `moradores.service.ts` | CRUD, verificação de admin do AP, statusFacial |
| `dto/moradores.dto.ts` | DTOs |

### encomendas/
Ciclo de vida de encomendas/entregas.

| Arquivo | O que faz |
|---------|-----------|
| `encomendas.controller.ts` | 3 controllers (Porteiro/Admin/Me): registrar, editar, listar, baixa, reenviar WhatsApp |
| `encomendas.service.ts` | create() → salva + dispara WhatsApp; baixa(); update() com janela de 10min |
| `dto/encomendas.dto.ts` | DTOs |

### reservas/
Reservas de espaços comuns.

| Arquivo | O que faz |
|---------|-----------|
| `reservas.controller.ts` | Morador: criar, cancelar, disponibilidade; Admin: calendário, PDF, cancelar |
| `reservas.service.ts` | Lógica de slots (QUADRA horário), dia inteiro (CHURRASQUEIRA/SALÃO), quota 4h/AP |
| `pdf.service.ts` | Gera relatório PDF das reservas com PDFKit |
| `dto/reservas.dto.ts` | DTOs |

### funcionarios/
CRUD de porteiros e funcionários.

| Arquivo | O que faz |
|---------|-----------|
| `funcionarios.controller.ts` | Admin: criar, listar, atualizar (nome/ativo/resetarSenha) |
| `funcionarios.service.ts` | CRUD de funcionários |
| `dto/funcionarios.dto.ts` | DTOs |

### fotos/
Upload e servir fotos de moradores e porteiros.

| Arquivo | O que faz |
|---------|-----------|
| `fotos.controller.ts` | Foto pública do porteiro (login), upload morador, consentimento LGPD |
| `fotos.service.ts` | Processa e comprime fotos antes de salvar |

### drive/
Abstração de armazenamento de arquivos local.

| Arquivo | O que faz |
|---------|-----------|
| `drive.service.ts` | saveFile(), readFile(), deleteFile(), ping() — base: `/app/uploads` |

### whatsapp/
Integração WhatsApp via Baileys.

| Arquivo | O que faz |
|---------|-----------|
| `whatsapp.controller.ts` | Admin: status, QR code, disconnect, CRUD template, test message |
| `whatsapp.service.ts` | Socket Baileys, QR, sendAsync() com retry (5s/30s/120s), reconexão automática |
| `whatsapp.constants.ts` | Template padrão de mensagem |

### facial/
Fila de cadastro facial (reconhecimento).

| Arquivo | O que faz |
|---------|-----------|
| `facial.controller.ts` | Admin: próximo morador pendente, download foto, marcar como registrado |

### me/
Perfil do usuário logado.

| Arquivo | O que faz |
|---------|-----------|
| `me.controller.ts` | GET /me — retorna perfil conforme role (admin/funcionário/morador) |

### health/
| Arquivo | O que faz |
|---------|-----------|
| `health.controller.ts` | GET público: status do DB, storage e WhatsApp |

### prisma/
| Arquivo | O que faz |
|---------|-----------|
| `prisma.service.ts` | Wrapper PrismaClient — connect em onModuleInit, disconnect em onModuleDestroy |

### seed/
| Arquivo | O que faz |
|---------|-----------|
| `seed.service.ts` | Cria admin padrão (ADMIN_EMAIL + ADMIN_PASSWORD) se não existir |

### common/
| Arquivo | O que faz |
|---------|-----------|
| `regras.ts` | Constantes de regras de negócio (REGRAS object) |
| `interceptors/audit.interceptor.ts` | Interceptor global de audit log |
| `random-password.ts` | Gerador de senha aleatória |

### Raiz
| Arquivo | O que faz |
|---------|-----------|
| `app.module.ts` | Importa todos os módulos, registra guards globais (JWT, Roles, Throttle) |
| `main.ts` | Bootstrap: prefixo `/api/v1`, CORS, ValidationPipe, helmet, cookie-parser |

---

## Frontend — apps/web/src/

### app/ (Next.js App Router)

| Rota | Arquivo | Perfil | O que faz |
|------|---------|--------|-----------|
| `/` | `page.tsx` | Público | Tela de login (chama LoginScreen) |
| `/auth/change-password` | `auth/change-password/page.tsx` | Autenticado | Troca de senha obrigatória |
| `/admin` | `admin/page.tsx` | Admin | Dashboard (stats, encomendas e reservas recentes) |
| `/admin/moradores` | `admin/moradores/page.tsx` | Admin | Listagem e gestão de moradores |
| `/admin/encomendas` | `admin/encomendas/page.tsx` | Admin | Tabela de encomendas (edição sem restrição de tempo) |
| `/admin/reservas` | `admin/reservas/page.tsx` | Admin | Calendário de reservas + relatório PDF |
| `/admin/funcionarios` | `admin/funcionarios/page.tsx` | Admin | Gestão de funcionários/porteiros |
| `/admin/porteiros` | `admin/porteiros/page.tsx` | Admin | Lista de porteiros |
| `/admin/admins` | `admin/admins/page.tsx` | Admin | CRUD de admins (síndicos) |
| `/admin/whatsapp` | `admin/whatsapp/page.tsx` | Admin | Configuração WhatsApp: QR, template, teste |
| `/admin/facial` | `admin/facial/page.tsx` | Admin | Fila de cadastro facial |
| `/admin/relatorios` | `admin/relatorios/page.tsx` | Admin | Relatórios gerenciais |
| `/admin/perfil` | `admin/perfil/page.tsx` | Admin | Perfil do síndico |
| `/porteiro` | `porteiro/page.tsx` | Porteiro | Dashboard: registrar encomenda, pendentes, histórico, apartamentos |
| `/porteiro/foto` | `porteiro/foto/page.tsx` | Porteiro | Upload de foto (obrigatório no 1º login) |
| `/me` | `me/page.tsx` | Morador | Dashboard do morador |
| `/me/encomendas` | `me/encomendas/page.tsx` | Morador | Encomendas pendentes e histórico |
| `/me/reservas` | `me/reservas/page.tsx` | Morador | Minhas reservas + nova reserva |
| `/me/perfil` | `me/perfil/page.tsx` | Morador | Perfil e foto do morador |

### components/

| Componente | O que faz |
|-----------|-----------|
| `login/LoginScreen.tsx` | Tela de login completa com 3 abas (admin/porteiro/morador) |
| `login/LoginForm.tsx` | Formulário de login com tratamento de erro |
| `shell/AppShell.tsx` | Layout principal: sidebar, top nav, proteção de rota |
| `AuthImage.tsx` | Imagem de fundo da tela de login |
| `Typewriter.tsx` | Animação de digitação |
| `TypewriterSequence.tsx` | Sequência de animações de digitação |

### lib/

| Arquivo | O que faz |
|---------|-----------|
| `api.ts` | Cliente API centralizado: namespaces authApi, adminApi, porteiroApi, moradorApi |
| `auth.ts` | Sessão: save(), getToken(), getUser(), clear(), getHomePath() — sessionStorage |
| `useAuth.ts` | Hook React: login, logout, refresh |
| `cn.ts` | Utilitário classname (clsx + tailwind-merge) |

---

## packages/shared/src/index.ts

Espelha enums e constantes do backend para uso no frontend:

```typescript
export enum StatusFacial { PENDENTE, REGISTRADO }
export enum TipoEncomenda { CAIXA, ENVELOPE, SACOLA }
export enum StatusEncomenda { PENDENTE, RETIRADA, CANCELADA }
export enum Espaco { QUADRA, CHURRASQUEIRA, SALAO_FESTAS }
export const REGRAS = { ... }  // mesmas constantes que apps/api/src/common/regras.ts
```
