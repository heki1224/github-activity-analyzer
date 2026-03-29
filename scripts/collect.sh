#!/usr/bin/env bash
set -euo pipefail

# Explicit PATH for cron environment (Docker Desktop lives in /usr/local/bin)
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_ROOT/logs/collect.log"
LOG_MAX_BYTES=1048576  # 1MB

mkdir -p "$PROJECT_ROOT/logs"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Log rotation: truncate if over 1MB
if [ -f "$LOG_FILE" ] && [ "$(wc -c < "$LOG_FILE")" -gt "$LOG_MAX_BYTES" ]; then
  tail -n 500 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
  log "Log rotated (exceeded 1MB)"
fi

# Check Docker is running
if ! docker info > /dev/null 2>&1; then
  log "ERROR: Docker is not running. Skipping collection."
  exit 0
fi

# Require ORG and REPO as arguments or environment variables
ORG="${COLLECT_ORG:-${1:-}}"
REPO="${COLLECT_REPO:-${2:-}}"
DAYS="${COLLECT_DAYS:-30}"

if [ -z "$ORG" ] || [ -z "$REPO" ]; then
  log "ERROR: ORG and REPO are required. Set COLLECT_ORG / COLLECT_REPO env vars or pass as arguments."
  exit 1
fi

log "Starting collection: $ORG/$REPO (last $DAYS days)"

cd "$PROJECT_ROOT"

docker compose --profile tools run --rm \
  --env-file .env \
  collector \
  --org "$ORG" \
  --repo "$REPO" \
  --days "$DAYS" >> "$LOG_FILE" 2>&1

log "Collection finished: $ORG/$REPO"
