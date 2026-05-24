# Condomínio App

Sistema self-hosted para gestão de um condomínio residencial. Cobre: pipeline de fotos faciais para cadastro manual na leitora física, painel "Tinder" do síndico, encomendas com notificação via WhatsApp, e reservas de espaços comuns com relatório PDF.

## Stack

- **Frontend:** Next.js 14 (App Router) + Tailwind CSS — desktop-first p/ porteiros e síndico, mobile-friendly p/ moradores.
- **Backend:** NestJS 10 + Prisma 5.
- **DB:** PostgreSQL 16.
- **WhatsApp:** Evolution API (Docker).
- **Armazenamento de fotos e backups:** Google Drive (Service Account, 15 GB grátis).
- **Exposição pública:** Cloudflare Tunnel.

## Instalação (LXC Ubuntu/Debian)

Pré-requisitos no host do LXC:
- LXC com `nesting=1, keyctl=1` (necessário p/ Docker).
- Ubuntu 22.04+ ou Debian 12+.
- Acesso root.
- Conta Cloudflare com domínio + Tunnel criado (token em mãos).
- Service Account Google com Drive API habilitada e pasta-raiz compartilhada com ela.

Rode como root no LXC:

```bash
curl -fsSL https://raw.githubusercontent.com/<usuario>/condominio-app/main/scripts/install.sh | bash
# ou:
git clone https://github.com/<usuario>/condominio-app.git /opt/condominio
cd /opt/condominio && bash scripts/install.sh
```

O script é interativo. Ele instala Docker, cloudflared, sobe os 4 containers, roda migrations, cria o usuário admin (síndico), configura o cron de backup e imprime as credenciais no final.

## Atualização

```bash
cd /opt/condominio
bash scripts/update.sh
```

Faz backup automático, baixa a tag mais recente, aplica migrations e sobe a stack nova.

## Estrutura

```
apps/api      NestJS (REST API)
apps/web      Next.js
packages/shared  tipos compartilhados
prisma        schema.prisma + migrations
scripts       install.sh, update.sh, backup.sh, upload-drive.js, cleanup-drive.js
docker-compose.yml
```

## Documentação de design

Ver `docs/design.md` (espelha o plano aprovado).
