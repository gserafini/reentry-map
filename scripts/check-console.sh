#!/usr/bin/env bash
# Own a dedicated console-check server on 3004; never terminate a port's occupants.
set -euo pipefail
set +m

CONSOLE_CHECK_PORT=3004
CONSOLE_CHECK_BASE_URL="http://localhost:${CONSOLE_CHECK_PORT}"
CONSOLE_CHECK_LOG=$(mktemp "${TMPDIR:-/tmp}/reentry-console-check.XXXXXX.log")
CONSOLE_CHECK_PID=""

cleanup() {
  local status=$?
  trap - EXIT INT TERM
  if [ -n "$CONSOLE_CHECK_PID" ]; then
    # setsid makes this PID the leader of our private process group. Stop the
    # complete Next process tree, including reparented children.
    kill -TERM -- "-$CONSOLE_CHECK_PID" 2>/dev/null || true
    kill -TERM -- "$CONSOLE_CHECK_PID" 2>/dev/null || true
    for _ in $(seq 1 30); do
      if ! kill -0 -- "-$CONSOLE_CHECK_PID" 2>/dev/null; then break; fi
      sleep 0.1
    done
    kill -KILL -- "-$CONSOLE_CHECK_PID" 2>/dev/null || true
    wait "$CONSOLE_CHECK_PID" 2>/dev/null || true
  fi
  if [ "$status" -ne 0 ] && [ -s "$CONSOLE_CHECK_LOG" ]; then
    echo "Console-check server output:"
    tail -n 60 "$CONSOLE_CHECK_LOG"
  fi
  rm -f "$CONSOLE_CHECK_LOG"
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# Test the deployable artifact instead of recompiling routes in development mode.
if [ ! -r .next/BUILD_ID ] || [ ! -s .next/BUILD_ID ]; then
  echo "No production build found at .next/BUILD_ID. Run npm run build, then rerun npm run console:check."
  exit 1
fi

# lsof can miss listeners in this environment. Ask the kernel to bind the
# same dual-stack port Next uses; release it before starting our server.
if ! node -e '
  const server = require("node:net").createServer()
  server.once("error", (error) => {
    console.error("Port 3004 is unavailable (" + error.code + "). No service was stopped. Identify the existing listener and stop it only if you own it, then rerun npm run console:check.")
    process.exitCode = 1
  })
  server.listen({ port: 3004, host: "::", exclusive: true }, () => server.close())
'; then
  exit 1
fi

echo "Starting the production build for browser console checks..."
NODE_ENV=production setsid node node_modules/next/dist/bin/next start --port "$CONSOLE_CHECK_PORT" > "$CONSOLE_CHECK_LOG" 2>&1 &
CONSOLE_CHECK_PID=$!

READY=0
for _ in $(seq 1 45); do
  if grep -q "✓ Ready" "$CONSOLE_CHECK_LOG"; then
    READY=1
    break
  fi
  if ! kill -0 "$CONSOLE_CHECK_PID" 2>/dev/null || grep -Eq "Error:|⨯" "$CONSOLE_CHECK_LOG"; then
    echo "Console-check server failed to start. Fix the reported startup error, then rerun npm run console:check."
    exit 1
  fi
  sleep 1
done
if [ "$READY" -ne 1 ]; then
  echo "Console-check server did not become ready within 45 seconds."
  exit 1
fi

PLAYWRIGHT_TEST_BASE_URL="$CONSOLE_CHECK_BASE_URL" node scripts/check-console.mjs /
PLAYWRIGHT_TEST_BASE_URL="$CONSOLE_CHECK_BASE_URL" node scripts/check-console.mjs /resources
PLAYWRIGHT_TEST_BASE_URL="$CONSOLE_CHECK_BASE_URL" node scripts/check-console.mjs /admin
