#!/bin/zsh
set -euo pipefail

URL="http://localhost/"
headers="$(curl -sI --max-time 3 "$URL" 2>/dev/null || true)"
if [[ -n "$headers" ]] && printf '%s\n' "$headers" | grep -qi '^Server: MellowServer/'; then
  echo "ok"
  exit 0
fi

if lsof -nP -iTCP:80 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "port80_busy"
  exit 0
fi

echo "not_enabled"
