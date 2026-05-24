#!/usr/bin/env bash
# ============================================================
# Condomínio App — Reset do Cloudflare Tunnel
# Uso: sudo bash scripts/reset-cloudflared.sh
# Útil quando o tunnel foi apagado/recriado no dashboard
# Cloudflare e o serviço local precisa ser re-registrado.
# ============================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${BLUE}[reset-cf]${NC} $*"; }
ok()   { echo -e "${GREEN}[ ok ]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
err()  { echo -e "${RED}[ERR ]${NC} $*" >&2; }
fail() { err "$1"; exit 1; }

[ "$(id -u)" -eq 0 ] || fail "Rode como root: sudo bash $0"
command -v cloudflared >/dev/null 2>&1 || fail "cloudflared não está instalado. Rode install.sh primeiro."

log "Coletando novo token..."
echo "  Crie/abra o tunnel em: https://one.dash.cloudflare.com"
echo "  Networks → Tunnels → seu-tunnel → Connectors → Install connector"
echo "  Copie o valor longo após 'service install' (começa com 'eyJ...')."
echo ""
read -r -s -p "Cole o novo CF_TUNNEL_TOKEN: " CF_TUNNEL_TOKEN
echo ""
[ -z "$CF_TUNNEL_TOKEN" ] && fail "Token vazio. Abortado."

log "Parando serviço cloudflared atual..."
systemctl stop cloudflared 2>/dev/null || true

log "Desinstalando serviço cloudflared..."
cloudflared service uninstall 2>/dev/null || warn "Nada para desinstalar (continuando)."

log "Instalando serviço com novo token..."
cloudflared service install "$CF_TUNNEL_TOKEN"

log "Habilitando e iniciando serviço..."
systemctl enable --now cloudflared

sleep 3
if systemctl is-active cloudflared >/dev/null 2>&1; then
  ok "Cloudflare Tunnel ativo com novo token."
  systemctl status cloudflared --no-pager | head -8
  echo ""
  echo -e "${YELLOW}Lembre de reconfigurar a rota pública no painel:${NC}"
  echo "  Networks → Tunnels → seu-tunnel → Public Hostnames → Add"
  echo "  hostname: portaria.seu-dominio.com"
  echo "  service:  HTTP → localhost:3000"
else
  fail "cloudflared não subiu. Veja: journalctl -u cloudflared -n 50"
fi
