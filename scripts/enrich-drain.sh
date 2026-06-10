#!/bin/bash
#
# enrich-drain.sh — drain the AI-enrichment backlog by running batch-enrich in
# fixed-size chunks, back-to-back, until fewer than THRESHOLD resources remain
# never-enriched. Runs ONE blocking chunk at a time and waits out any other
# in-flight enrichment run (e.g. the */30 cron), so there is never a double-run
# contending for the local Ollama model.
#
# Usage: nohup bash scripts/enrich-drain.sh >> /tmp/reentry-enrich-loop.log 2>&1 &
#
set -u
cd /home/reentrymap/reentry-map-prod || exit 1
LOG=/tmp/reentry-enrich-loop.log
THRESHOLD=50
CHUNK=500

backlog() {
  psql -U reentrymap reentry_map -t -A -c \
    "SELECT count(*) FROM resources WHERE status='active' AND provenance->'enrichment' IS NULL" \
    | tr -d '[:space:]'
}

log() { echo "$(date '+%F %T') drain: $*" >>"$LOG"; }

log "starting (threshold=$THRESHOLD chunk=$CHUNK)"
while true; do
  # Defer to any other enrichment run already in progress (cron or manual).
  while pgrep -f "node scripts/batch-enrich.mjs" >/dev/null; do sleep 30; done
  N=$(backlog)
  if [ "${N:-0}" -lt "$THRESHOLD" ]; then
    log "complete — $N never-enriched remain"
    break
  fi
  log "backlog=$N — running ${CHUNK}-record chunk"
  node scripts/batch-enrich.mjs --limit "$CHUNK" >>"$LOG" 2>&1
  sleep 15
done
log "exiting"
