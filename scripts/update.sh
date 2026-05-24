#!/usr/bin/env bash
# ============================================================
# Condomínio App — Atualização
# Roda como root, no diretório de instalação.
# ============================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${BLUE}[update]${NC} $*"; }
ok()   { echo -e "${GREEN}[ ok ]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
err()  { echo -e "${RED}[ERR ]${NC} $*" >&2; }
fail() { err "$1"; exit 1; }

[ "$(id -u)" -eq 0 ] || fail "Rode como root: sudo bash $0"

INSTALL_DIR="${INSTALL_DIR:-/opt/condominio}"
cd "$INSTALL_DIR" || fail "Diretório não encontrado: $INSTALL_DIR"
[ -d .git ] || fail "$INSTALL_DIR não é um repo git"
[ -f .env ] || fail ".env ausente — rode install.sh primeiro"

# --- salvaguardas ---
if ! git diff --quiet || ! git diff --cached --quiet; then
  fail "Há mudanças locais não-commitadas em $INSTALL_DIR. Resolva antes de atualizar."
fi

FREE_KB=$(df -kP "$INSTALL_DIR" | awk 'NR==2 {print $4}')
[ "$FREE_KB" -gt 2000000 ] || fail "Espaço em disco < 2GB. Libere espaço antes de atualizar."

# --- 1. Backup pré-update ---
log "Backup pré-update..."
TAG="pre-update-$(date +%Y%m%d-%H%M%S)"
PREVIOUS_REF=$(git rev-parse --abbrev-ref HEAD)
[ "$PREVIOUS_REF" = "HEAD" ] && PREVIOUS_REF=$(git rev-parse HEAD)

if ! bash scripts/backup.sh --tag "$TAG"; then
  fail "Backup falhou. Atualização abortada."
fi
ok "Backup criado: $TAG"

# --- 2. git fetch + checkout ---
log "Buscando atualizações do remoto..."
git fetch --tags --prune

TARGET_REF="${1:-}"
if [ -z "$TARGET_REF" ]; then
  # Padrão: última tag estável (vX.Y.Z)
  TARGET_REF=$(git tag -l 'v*' --sort=-v:refname | head -n1 || true)
  if [ -z "$TARGET_REF" ]; then
    warn "Nenhuma tag v* encontrada — usando origin/main"
    TARGET_REF="origin/main"
  fi
fi
log "Atualizando para: $TARGET_REF (de $PREVIOUS_REF)"
git checkout "$TARGET_REF" || fail "git checkout falhou"

# --- 3. docker compose pull + up ---
log "Pull de imagens base..."
docker compose pull --quiet || true

log "Re-buildando imagens locais..."
docker compose build

log "Subindo containers (recreate quando necessário)..."
docker compose up -d --remove-orphans

log "Aguardando API saudável (até 90s)..."
for i in $(seq 1 45); do
  if docker compose exec -T api wget -qO- "http://localhost:3001/api/v1/health" >/dev/null 2>&1; then
    ok "API saudável"
    break
  fi
  sleep 2
  if [ "$i" -eq 45 ]; then
    err "API não ficou saudável. Rollback manual:"
    echo "  cd $INSTALL_DIR && git checkout $PREVIOUS_REF && docker compose up -d --build"
    echo "  Backup do banco: $TAG (use scripts/restore.sh quando disponível)"
    exit 1
  fi
done

# --- 4. Migrations (já são executadas no entrypoint do container, mas re-rodamos para garantir) ---
log "Aplicando migrations Prisma..."
docker compose exec -T api npx prisma migrate deploy --schema=./prisma/schema.prisma

# --- 5. Smoke ---
HEALTH=$(docker compose exec -T api wget -qO- "http://localhost:3001/api/v1/health" 2>/dev/null || echo "fail")
echo "$HEALTH" | grep -q '"status":"ok"' || warn "Health não retornou status ok: $HEALTH"

NEW_REF=$(git describe --tags --always)
echo ""
echo "============================================================"
echo -e "${GREEN}  Atualizado para: $NEW_REF${NC} (anterior: $PREVIOUS_REF)"
echo "============================================================"
echo "  Logs: docker compose -f $INSTALL_DIR/docker-compose.yml logs -f"
echo "  Backup pré-update: $TAG (Google Drive, pasta Backups/)"
echo ""
