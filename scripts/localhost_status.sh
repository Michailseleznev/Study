#!/bin/zsh
set -euo pipefail

PORT=4173
URL="http://localhost:${PORT}/"

http_code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "$URL" 2>/dev/null || true)"
if [[ "$http_code" == "200" ]]; then
  echo "ok"
  exit 0
fi

if lsof -nP -iTCP:${PORT} -sTCP:LISTEN >/dev/null 2>&1; then
  echo "port_busy"
  exit 0
fi

echo "not_running"
