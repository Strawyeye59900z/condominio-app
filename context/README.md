# Context — Condomínio App

Pasta de contexto para continuidade de desenvolvimento.
Criada para uso no Antigravity e outras ferramentas de AI.

## Arquivos

| Arquivo | Conteúdo |
|---------|----------|
| [OVERVIEW.md](OVERVIEW.md) | Visão geral: stack, domínio, deploy, perfis de usuário |
| [DIRECTORIES.md](DIRECTORIES.md) | Mapa de todos os diretórios e arquivos com descrição |
| [API_ENDPOINTS.md](API_ENDPOINTS.md) | Todos os endpoints REST organizados por módulo |
| [DATABASE.md](DATABASE.md) | Schema Prisma: modelos, relacionamentos, enums, comandos |
| [DEPENDENCIES.md](DEPENDENCIES.md) | Dependências de produção e dev (API + Web) com propósito |
| [ENV_AND_DEPLOY.md](ENV_AND_DEPLOY.md) | Variáveis de ambiente, Docker Compose, comandos de deploy |
| [BUSINESS_RULES.md](BUSINESS_RULES.md) | Regras de negócio: encomendas, reservas, auth, LGPD, WhatsApp |
| [KEY_FUNCTIONS.md](KEY_FUNCTIONS.md) | Funções/métodos principais de cada serviço (backend + frontend) |

## Resumo rápido do projeto

**Sistema de gestão condominial** com:
- **Encomendas**: porteiro registra → WhatsApp notifica morador → morador confirma retirada
- **Reservas**: QUADRA (por hora), CHURRASQUEIRA e SALÃO (dia inteiro)
- **Facial**: fila de cadastro de reconhecimento facial
- **WhatsApp**: integração Baileys com template customizável e retry automático
- **3 perfis**: Admin (síndico), Funcionário (porteiro), Morador

**Stack**: NestJS + Next.js 14 + PostgreSQL (Prisma) + Baileys + Docker

**Repo**: `github.com/Strawyeye59900z/condominio-app`
**Branch**: `main`
**Deploy**: LXC `/opt/condominio` → `git pull && docker compose build && docker compose up -d`
