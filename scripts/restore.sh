#!/bin/bash
# restore.sh - Restore database from backup

BACKUP_FILE="${1:?Usage: ./restore.sh <backup-file.sql.zst>}"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: $BACKUP_FILE not found"
    exit 1
fi

echo "⚠️  WARNING: This will overwrite the current database!"
echo "Backup file: $BACKUP_FILE"
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

echo "Stopping application..."
docker-compose down

echo "Restoring database..."
cd /opt/deployment-tracker
zstd -d "$BACKUP_FILE" --stdout | \
    docker-compose exec -T postgres psql -U postgres -d appdb

echo "Restarting application..."
docker-compose up -d

echo "✓ Restore complete. Verify data:"
docker-compose exec postgres psql -U postgres -d appdb -c "SELECT COUNT(*) FROM deployments;"
