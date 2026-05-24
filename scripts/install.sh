#!/usr/bin/env bash
# ============================================================
# Condomínio App — Instalador para LXC (Ubuntu 22.04+ / Debian 12+)
# Roda como root. Instala Docker, cloudflared, sobe a stack,
# aplica migrations, cria o admin, configura cron de backup.
# ============================================================
set -euo pipefail

# ----- helpers -----
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${BLUE}[install]${NC} $*"; }
ok()   { echo -e "${GREEN}[ ok ]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
err()  { echo -e "${RED}[ERR ]${NC} $*" >&2; }
fail() { err "$1"; exit 1; }

ask() {  # ask "label" "default" -> echoes value
  local label="$1"; local def="${2:-}"; local val
  if [ -n "$def" ]; then
    read -r -p "$label [$def]: " val
    echo "${val:-$def}"
  else
    read -r -p "$label: " val
    echo "$val"
  fi
}

ask_secret() {  # ask_secret "label" -> echoes input (no echo)
  local label="$1"; local val
  read -r -s -p "$label: " val; echo "" >&2
  echo "$val"
}

gen_secret() { openssl rand -base64 48 | tr -d '/+=\n' | head -c 64; }

require_cmd() { command -v "$1" >/dev/null 2>&1 || fail "Comando ausente: $1"; }

# ----- preflight -----
[ "$(id -u)" -eq 0 ] || fail "Rode como root: sudo bash $0"

. /etc/os-release 2>/dev/null || fail "OS não detectado"
case "$ID" in
  ubuntu|debian) ok "OS suportado: $PRETTY_NAME" ;;
  *) fail "OS não suportado: $ID (suporta ubuntu/debian)" ;;
esac

log "Verificando conectividade..."
curl -fsS --max-time 5 https://hub.docker.com > /dev/null || fail "Sem internet (hub.docker.com)"
ok "Conectividade OK"

# ----- coleta interativa -----
log "Coletando variáveis de configuração..."
INSTALL_DIR=$(ask "Diretório de instalação" "/opt/condominio")
DOMINIO=$(ask "Domínio público (Cloudflare Tunnel)" "portaria.seu-dominio.com")
TIMEZONE=$(ask "Timezone" "America/Sao_Paulo")
ADMIN_EMAIL=$(ask "Email do síndico (admin)" "")
[ -z "$ADMIN_EMAIL" ] && fail "ADMIN_EMAIL obrigatório"

CF_TUNNEL_TOKEN=$(ask_secret "Token do Cloudflare Tunnel (Zero Trust → Tunnels → Install)")
[ -z "$CF_TUNNEL_TOKEN" ] && fail "CF_TUNNEL_TOKEN obrigatório"

GDRIVE_SA_JSON=$(ask "Caminho local do JSON da Service Account do Google Drive" "/root/gdrive.json")
[ -f "$GDRIVE_SA_JSON" ] || fail "Arquivo não encontrado: $GDRIVE_SA_JSON"

GDRIVE_ROOT_FOLDER_ID=$(ask "ID da pasta raiz no Google Drive (compartilhada com a SA)" "")
[ -z "$GDRIVE_ROOT_FOLDER_ID" ] && fail "GDRIVE_ROOT_FOLDER_ID obrigatório"

REPO_URL=$(ask "URL do repositório git" "https://github.com/seu-usuario/condominio-app.git")
GIT_REF=$(ask "Branch/tag para checkout" "main")

# Gera segredos
ADMIN_PASSWORD=$(gen_secret | head -c 20)
POSTGRES_PASSWORD=$(gen_secret | head -c 32)
JWT_SECRET=$(gen_secret)
JWT_REFRESH_SECRET=$(gen_secret)
EVOLUTION_API_KEY=$(gen_secret | head -c 40)

# ----- 1. Dependências do host -----
log "Atualizando apt e instalando dependências base..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg git cron openssl wget jq

# ----- 2. Docker -----
if ! command -v docker >/dev/null 2>&1; then
  log "Instalando Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
  ok "Docker instalado"
else
  ok "Docker já presente"
fi
require_cmd docker
docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 ausente"

# ----- 3. cloudflared -----
if ! command -v cloudflared >/dev/null 2>&1; then
  log "Instalando cloudflared (repo oficial Cloudflare)..."
  mkdir -p --mode=0755 /usr/share/keyrings
  curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
  echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $VERSION_CODENAME main" \
    | tee /etc/apt/sources.list.d/cloudflared.list >/dev/null
  apt-get update -qq
  apt-get install -y -qq cloudflared
  ok "cloudflared instalado"
else
  ok "cloudflared já presente"
fi

log "Registrando serviço cloudflared..."
if systemctl is-active cloudflared >/dev/null 2>&1; then
  warn "cloudflared já em execução — pulando service install"
else
  cloudflared service install "$CF_TUNNEL_TOKEN"
  systemctl enable --now cloudflared
fi
systemctl is-active cloudflared >/dev/null 2>&1 || fail "cloudflared não subiu"
ok "Cloudflare Tunnel ativo"

# ----- 4. Clone do repo -----
if [ -d "$INSTALL_DIR/.git" ]; then
  log "Repo já existe em $INSTALL_DIR — atualizando..."
  git -C "$INSTALL_DIR" fetch --all --tags
  git -C "$INSTALL_DIR" checkout "$GIT_REF"
else
  log "Clonando repo em $INSTALL_DIR..."
  git clone "$REPO_URL" "$INSTALL_DIR"
  git -C "$INSTALL_DIR" checkout "$GIT_REF"
fi
cd "$INSTALL_DIR"

# ----- 5. .env e secrets -----
log "Escrevendo .env..."
ADMIN_PWD_ESC=$(printf '%s' "$ADMIN_PASSWORD" | sed -e 's/[\/&|]/\\&/g')
POSTGRES_PWD_ESC=$(printf '%s' "$POSTGRES_PASSWORD" | sed -e 's/[\/&|]/\\&/g')

cat > "$INSTALL_DIR/.env" <<EOF
APP_URL=https://$DOMINIO
TZ=$TIMEZONE

POSTGRES_USER=condominio
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_DB=condominio
DATABASE_URL=postgresql://condominio:$POSTGRES_PWD_ESC@postgres:5432/condominio?schema=public

JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d

ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASSWORD

EVOLUTION_API_URL=http://evolution:8080
EVOLUTION_API_KEY=$EVOLUTION_API_KEY
EVOLUTION_INSTANCE=condominio

GDRIVE_SA_FILE=/secrets/gdrive.json
GDRIVE_ROOT_FOLDER_ID=$GDRIVE_ROOT_FOLDER_ID

API_PORT=3001
WEB_PORT=3000
EOF
chmod 600 "$INSTALL_DIR/.env"

mkdir -p "$INSTALL_DIR/secrets"
cp "$GDRIVE_SA_JSON" "$INSTALL_DIR/secrets/gdrive.json"
chmod 600 "$INSTALL_DIR/secrets/gdrive.json"
ok ".env e secrets gravados (chmod 600)"

# ----- 6. docker compose up -----
log "Buildando imagens (pode demorar alguns minutos na primeira vez)..."
docker compose build

log "Subindo containers..."
docker compose up -d

log "Aguardando API ficar saudável..."
for i in $(seq 1 60); do
  if docker compose exec -T api wget -qO- "http://localhost:3001/api/v1/health" >/dev/null 2>&1; then
    ok "API saudável"
    break
  fi
  sleep 2
  if [ "$i" -eq 60 ]; then
    err "API não ficou saudável em 120s. Veja: docker compose logs api"
    exit 1
  fi
done

# ----- 7. Cria instância Evolution (idempotente) -----
log "Criando instância WhatsApp na Evolution..."
EVO_CREATE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "http://localhost:3001/api/v1/internal/evolution/ensure-instance" \
  -H "Content-Type: application/json" \
  -H "X-Internal-Secret: $JWT_SECRET" || true)
# Se endpoint ainda não existir (fase 1), a criação acontecerá na Fase 6 via UI admin.
ok "Evolution disponível (QR será lido em https://$DOMINIO/admin/whatsapp na Fase 6+)"

# ----- 8. Cron de backup -----
log "Instalando cron diário de backup (03:00)..."
cat > /etc/cron.d/condominio-backup <<EOF
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
0 3 * * * root cd $INSTALL_DIR && bash scripts/backup.sh >> /var/log/condominio-backup.log 2>&1
EOF
chmod 644 /etc/cron.d/condominio-backup
systemctl reload cron 2>/dev/null || systemctl restart cron
ok "Cron instalado"

# ----- 9. Saída final -----
echo ""
echo "============================================================"
echo -e "${GREEN}  Instalação concluída.${NC}"
echo "============================================================"
echo "  URL pública     : https://$DOMINIO"
echo "  Síndico (admin) : $ADMIN_EMAIL"
echo "  Senha provis.   : $ADMIN_PASSWORD"
echo ""
echo "  Logs            : docker compose -f $INSTALL_DIR/docker-compose.yml logs -f"
echo "  Backup log      : /var/log/condominio-backup.log"
echo "  Atualizar       : cd $INSTALL_DIR && bash scripts/update.sh"
echo "============================================================"
echo -e "${YELLOW}  Guarde a senha do síndico — ela só é exibida agora.${NC}"
echo ""
