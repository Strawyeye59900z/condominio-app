#!/usr/bin/env bash
# ============================================================
# Condomínio App — Backup do PostgreSQL para Google Drive
# Uso: bash scripts/backup.sh [--tag NOME]
# ============================================================
set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/opt/condominio}"
cd "$INSTALL_DIR"
set -a; . ./.env; set +a

TAG=""
if [ "${1:-}" = "--tag" ] && [ -n "${2:-}" ]; then
  TAG="$2"
fi

TS=$(date +%Y%m%d-%H%M%S)
NAME="${TAG:-daily}-${TS}.dump.gz"
TMP_HOST="/tmp/condominio-${NAME}"
TMP_CONT="/tmp/${NAME}"

echo "[backup] dump $POSTGRES_DB → $TMP_HOST"
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB" | gzip > "$TMP_HOST"

# Copia para o container api (que tem googleapis + script upload)
docker compose cp "$TMP_HOST" api:"$TMP_CONT"
echo "[backup] upload Drive (Backups/$NAME)..."
docker compose exec -T \
  -e GDRIVE_SA_FILE \
  -e GDRIVE_ROOT_FOLDER_ID \
  api node /app/scripts/upload-drive.js "$TMP_CONT" "Backups/$NAME"

docker compose exec -T api rm -f "$TMP_CONT"
rm -f "$TMP_HOST"

echo "[backup] cleanup (mantendo últimos 7)..."
docker compose exec -T \
  -e GDRIVE_SA_FILE \
  -e GDRIVE_ROOT_FOLDER_ID \
  api node /app/scripts/cleanup-drive.js "Backups/" --keep-last 7 || true

echo "[backup] concluído em $(date '+%Y-%m-%d %H:%M:%S')"
