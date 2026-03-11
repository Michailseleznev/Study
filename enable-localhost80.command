#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
SCRIPT="$ROOT_DIR/scripts/install_port80_redirect_root.sh"

osascript <<OSA
do shell script "/bin/zsh '$SCRIPT'" with administrator privileges
OSA

echo "ok"
open "http://localhost/"
