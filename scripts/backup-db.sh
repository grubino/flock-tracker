#!/bin/bash
# Backup PostgreSQL database using DATABASE_URL, keep last 14 backups

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"
BACKUP_DIR="$SCRIPT_DIR/../backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/flock_tracker_$TIMESTAMP.dump"

# Load DATABASE_URL from .env if not already set
if [[ -z "${DATABASE_URL:-}" && -f "$ENV_FILE" ]]; then
    export $(grep -E '^DATABASE_URL=' "$ENV_FILE" | xargs)
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "ERROR: DATABASE_URL is not set" >&2
    exit 1
fi

mkdir -p "$BACKUP_DIR"

pg_dump --format=custom --no-password "$DATABASE_URL" > "$BACKUP_FILE"

echo "Backup saved: $BACKUP_FILE"

# Keep only the 14 most recent backups
ls -t "$BACKUP_DIR"/flock_tracker_*.dump 2>/dev/null | tail -n +15 | xargs -r rm --
