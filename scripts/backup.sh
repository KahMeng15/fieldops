#!/bin/bash
set -e

BACKUP_DIR="/mnt/backups/deployment-tracker"
RETENTION_DAYS=30
LOG_FILE="/var/log/deployment-tracker-backup.log"

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/db-$TIMESTAMP.sql.zst"

echo "[$(date)] Starting backup..." >> "$LOG_FILE"

# Dump database and compress
if docker-compose -f /opt/deployment-tracker/docker-compose.yml exec -T postgres \
    pg_dump -U postgres appdb 2>/dev/null | \
    zstd -19 -o "$BACKUP_FILE" 2>/dev/null; then
    
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "[$(date)] ✓ Backup successful: $BACKUP_FILE ($FILE_SIZE)" >> "$LOG_FILE"
    
    # Prune old backups
    find "$BACKUP_DIR" -name "db-*.sql.zst" -mtime +$RETENTION_DAYS -delete
    echo "[$(date)] ✓ Pruned backups older than $RETENTION_DAYS days" >> "$LOG_FILE"
else
    echo "[$(date)] ✗ Backup FAILED" >> "$LOG_FILE"
    exit 1
fi
