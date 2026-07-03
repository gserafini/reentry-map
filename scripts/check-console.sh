#!/usr/bin/env bash

# Script to run browser console checks against a dedicated test dev server.
# Uses port 3004 so it never depends on or interferes with a user's manual
# dev server on port 3003.

set -euo pipefail

echo "🔍 Running browser console checks..."

CONSOLE_CHECK_PORT=3004
CONSOLE_CHECK_BASE_URL="http://localhost:${CONSOLE_CHECK_PORT}"
CONSOLE_CHECK_LOG=/tmp/console-check-dev.log

for _ in $(seq 1 10); do
  PIDS=$(lsof -ti:$CONSOLE_CHECK_PORT 2>/dev/null || true)
  if [ -z "$PIDS" ]; then
    break
  fi

  echo "$PIDS" | xargs kill -9 2>/dev/null || true
  sleep 1
done

if lsof -ti:$CONSOLE_CHECK_PORT >/dev/null 2>&1; then
  echo "❌ Port $CONSOLE_CHECK_PORT is still in use before console checks"
  lsof -i :$CONSOLE_CHECK_PORT || true
  exit 1
fi

(lsof -ti:$CONSOLE_CHECK_PORT | xargs kill -9 2>/dev/null || true) && concurrently "npm:tailwind:watch" "node node_modules/next/dist/bin/next dev --turbopack --port $CONSOLE_CHECK_PORT" > "$CONSOLE_CHECK_LOG" 2>&1 &
DEV_PID=$!

trap "kill $DEV_PID 2>/dev/null || true; lsof -ti:$CONSOLE_CHECK_PORT | xargs kill -9 2>/dev/null || true; rm -f \"$CONSOLE_CHECK_LOG\"" EXIT

MAX_WAIT=25
ELAPSED=0

while [ $ELAPSED -lt $MAX_WAIT ]; do
  if grep -q "✓ Ready" "$CONSOLE_CHECK_LOG" 2>/dev/null; then
    break
  fi

  if grep -q "Error:" "$CONSOLE_CHECK_LOG" 2>/dev/null || grep -q "⨯" "$CONSOLE_CHECK_LOG" 2>/dev/null; then
    echo "❌ Console-check dev server failed to compile:"
    cat "$CONSOLE_CHECK_LOG"
    exit 1
  fi

  sleep 1
  ELAPSED=$((ELAPSED + 1))
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
  echo "⏱️ Timeout waiting for console-check dev server"
  cat "$CONSOLE_CHECK_LOG"
  exit 1
fi

PLAYWRIGHT_TEST_BASE_URL="$CONSOLE_CHECK_BASE_URL" node scripts/check-console.mjs /
PLAYWRIGHT_TEST_BASE_URL="$CONSOLE_CHECK_BASE_URL" node scripts/check-console.mjs /resources
PLAYWRIGHT_TEST_BASE_URL="$CONSOLE_CHECK_BASE_URL" node scripts/check-console.mjs /admin
