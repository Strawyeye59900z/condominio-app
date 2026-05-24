#!/bin/bash

# ===== Backup Automático do PostgreSQL =====
# Executa pg_dump, comprime, e faz upload para Google Drive
# Chamado diariamente via cron em /etc/cron.d/condominio-backup

set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/opt/condominio}"
BACKUP_DIR="/tmp/condominio-backups"
LOG_FILE="/var/log/condominio-backup.log"
TS=$(date +"%Y%m%d-%H%M%S")
DB_DUMP="/tmp/db-${TS}.dump"
DB_DUMP_GZ="${DB_DUMP}.gz"

# Carrega .env
if [ -f "$INSTALL_DIR/.env" ]; then
  export $(cat "$INSTALL_DIR/.env" | grep -v '^#' | xargs)
fi

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

cleanup() {
  rm -f "$DB_DUMP" "$DB_DUMP_GZ" 2>/dev/null || true
}

trap cleanup EXIT

log "=== Iniciando backup ==="

# Cria diretório temporário
mkdir -p "$BACKUP_DIR"

# Executa pg_dump do container
log "Executando pg_dump..."
cd "$INSTALL_DIR"
docker compose exec -T postgres pg_dump \
  -U condominio \
  -Fc \
  condominio > "$DB_DUMP" \
  || { log "ERRO: pg_dump falhou"; exit 1; }

# Comprime
log "Comprimindo backup..."
gzip -f "$DB_DUMP"
log "Tamanho: $(du -h "$DB_DUMP_GZ" | cut -f1)"

# Copia arquivo para container e faz upload
log "Fazendo upload para Google Drive..."
cd "$INSTALL_DIR"
TMP_CONT="/tmp/backup-${TS}.dump.gz"
docker compose cp "$DB_DUMP_GZ" condominio-api:"$TMP_CONT"
docker compose exec -T api node scripts/upload-drive.js "$TMP_CONT" "Backups/${TS}.dump.gz" \
  || { log "ERRO: upload para Drive falhou"; exit 1; }
docker compose exec -T api rm -f "$TMP_CONT"

log "Backup criado e enviado: ${TS}.dump.gz"

# Limpa backups antigos (mantém últimos 7 dias)
log "Limpando backups antigos (>7 dias)..."
docker compose exec -T api node scripts/cleanup-drive.js "Backups/" --keep-days 7 \
  || log "AVISO: cleanup retornou erro (não crítico)"

log "=== Backup concluído com sucesso ==="
