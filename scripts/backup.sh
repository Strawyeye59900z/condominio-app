#!/bin/bash

# ===== Backup Automático — PostgreSQL + Fotos =====
# Executa pg_dump e backup das fotos, mantém 7 dias localmente.
# Chamado diariamente via cron em /etc/cron.d/condominio-backup

set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/opt/condominio}"
BACKUP_DIR="/var/backups/condominio"
LOG_FILE="/var/log/condominio-backup.log"
TS=$(date +"%Y%m%d-%H%M%S")
DB_DUMP="/tmp/db-${TS}.dump"
DB_DUMP_GZ="${DB_DUMP}.gz"
DB_NAME="condominio-db-${TS}.dump.gz"
FOTOS_NAME="condominio-fotos-${TS}.tar.gz"

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

cleanup() {
  rm -f "$DB_DUMP" "$DB_DUMP_GZ" 2>/dev/null || true
}

trap cleanup EXIT

log "=== Iniciando backup ==="
mkdir -p "$BACKUP_DIR"

# ── Banco de dados ────────────────────────────────────────────
log "Executando pg_dump..."
cd "$INSTALL_DIR"
docker compose exec -T postgres pg_dump \
  -U condominio \
  -Fc \
  condominio > "$DB_DUMP" \
  || { log "ERRO: pg_dump falhou"; exit 1; }

gzip -f "$DB_DUMP"
log "Banco comprimido: $(du -h "$DB_DUMP_GZ" | cut -f1)"

cp "$DB_DUMP_GZ" "$BACKUP_DIR/$DB_NAME"
log "Banco salvo: $BACKUP_DIR/$DB_NAME"

# ── Fotos ──────────────────────────────────────────────────────
FOTOS_DIR="$INSTALL_DIR/uploads"
if [ -d "$FOTOS_DIR" ] && [ "$(ls -A "$FOTOS_DIR" 2>/dev/null)" ]; then
  log "Comprimindo fotos..."
  tar -czf "$BACKUP_DIR/$FOTOS_NAME" -C "$INSTALL_DIR" uploads/ \
    && log "Fotos salvas: $BACKUP_DIR/$FOTOS_NAME ($(du -h "$BACKUP_DIR/$FOTOS_NAME" | cut -f1))" \
    || log "AVISO: backup de fotos falhou (não crítico)"
else
  log "Pasta uploads/ vazia ou inexistente, ignorando backup de fotos"
fi

# ── Retenção: 7 dias ──────────────────────────────────────────
log "Limpando backups com mais de 7 dias..."
find "$BACKUP_DIR" -name "condominio-db-*.dump.gz" -mtime +7 -delete
find "$BACKUP_DIR" -name "condominio-fotos-*.tar.gz" -mtime +7 -delete
log "Limpeza concluída"

log "=== Backup concluído com sucesso ==="
log "DB:    $BACKUP_DIR/$DB_NAME"
log "Espaço usado: $(du -sh "$BACKUP_DIR" | cut -f1)"
