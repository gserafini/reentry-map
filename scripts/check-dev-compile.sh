#!/usr/bin/env bash

# Script to verify dev server compiles without errors
# This catches client/server boundary issues and other dev-time compilation problems
# that the production build might miss

set -e

echo "🔍 Checking dev server compilation..."

# Use port 3004 to avoid interfering with user's dev server on 3003
DEV_CHECK_PORT=3004

# Kill any existing servers on port 3004
lsof -ti:$DEV_CHECK_PORT | xargs kill -9 2>/dev/null || true

# Start dev server in background and capture output
(lsof -ti:$DEV_CHECK_PORT | xargs kill -9 2>/dev/null || true) && concurrently "npm:tailwind:watch" "node node_modules/next/dist/bin/next dev --turbopack --port $DEV_CHECK_PORT" > /tmp/dev-check.log 2>&1 &
DEV_PID=$!

# Set up trap to kill dev server on script exit
trap "kill $DEV_PID 2>/dev/null || true; lsof -ti:$DEV_CHECK_PORT | xargs kill -9 2>/dev/null || true; rm -f /tmp/dev-check.log" EXIT

# Wait for server to start and compile (look for "Ready" or compilation errors)
MAX_WAIT=25
ELAPSED=0

while [ $ELAPSED -lt $MAX_WAIT ]; do
  if grep -q "✓ Ready" /tmp/dev-check.log 2>/dev/null; then
    echo "✅ Dev server compiled successfully"
    exit 0
  fi

  if grep -q "Error:" /tmp/dev-check.log 2>/dev/null || grep -q "⨯" /tmp/dev-check.log 2>/dev/null; then
    echo "❌ Dev server compilation failed:"
    cat /tmp/dev-check.log
    exit 1
  fi

  sleep 1
  ELAPSED=$((ELAPSED + 1))
done

echo "⏱️ Timeout waiting for dev server to compile"
cat /tmp/dev-check.log
exit 1
