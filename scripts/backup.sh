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
NAME="condominio-${TS}.dump.gz"

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

# Salva backup em diretório local
log "Salvando backup local..."
BACKUP_FINAL="$BACKUP_DIR/$NAME"
cp "$DB_DUMP_GZ" "$BACKUP_FINAL"
log "Backup salvo em: $BACKUP_FINAL"

# Limpa backups antigos locais (mantém últimos 7 dias)
log "Limpando backups antigos (>7 dias)..."
find "$BACKUP_DIR" -name "*.dump.gz" -mtime +7 -delete \
  && log "Backups antigos removidos" \
  || log "AVISO: limpeza retornou erro (não crítico)"

# TODO: implementar upload para Google Drive quando OAuth2 estiver estável
# Por enquanto, recomenda-se:
# 1. Fazer snapshot do LXC via Proxmox
# 2. Ou configurar rsync/sftp para um NAS
# 3. Ou usar Google Drive manualmente

log "=== Backup concluído com sucesso ==="
log "Arquivo: $BACKUP_FINAL"
log "Próximo backup: $(date -d 'tomorrow 03:00' '+%Y-%m-%d %H:%M')"
