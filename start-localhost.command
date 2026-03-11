#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
URL="http://localhost:4173/"
"$ROOT_DIR/scripts/install_localhost_launch_agent.sh"

service_state="not_running"
for _ in {1..15}; do
  service_state="$("$ROOT_DIR/scripts/localhost_status.sh")"
  if [[ "$service_state" == "ok" || "$service_state" == "port_busy" ]]; then
    break
  fi
  sleep 1
done

echo "$service_state"
if [[ "$service_state" == "ok" ]]; then
  open "$URL"
  exit 0
fi

if [[ "$service_state" == "port_busy" ]]; then
  lsof -nP -iTCP:4173 -sTCP:LISTEN || true
fi
exit 1
