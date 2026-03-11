#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST_INDEX="$ROOT_DIR/dist/index.html"
has_dist=0
[[ -f "$DIST_INDEX" ]] && has_dist=1

needs_build=0
if [[ ! -f "$DIST_INDEX" ]]; then
  needs_build=1
elif find \
  "$ROOT_DIR/src" \
  "$ROOT_DIR/assets" \
  "$ROOT_DIR/unsplash-local" \
  -type f \
  -newer "$DIST_INDEX" \
  -print -quit 2>/dev/null | grep -q .; then
  needs_build=1
elif find \
  "$ROOT_DIR" \
  -maxdepth 1 \
  -type f \
  \( -name 'index.html' -o -name 'package.json' -o -name 'package-lock.json' -o -name 'vite.config.js' \) \
  -newer "$DIST_INDEX" \
  -print -quit 2>/dev/null | grep -q .; then
  needs_build=1
fi

if (( needs_build )); then
  build_ok=0
  if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
    export NVM_DIR="$HOME/.nvm"
    . "$NVM_DIR/nvm.sh"
  fi

  if command -v npm >/dev/null 2>&1; then
    cd "$ROOT_DIR"
    if npm run build; then
      build_ok=1
    else
      echo "build_failed" >&2
    fi
  else
    echo "npm_not_found_for_build" >&2
  fi

  if (( !build_ok )); then
    if (( has_dist )); then
      echo "using_existing_dist" >&2
    else
      echo "dist_missing_and_build_failed" >&2
      exit 1
    fi
  fi
fi

cd "$ROOT_DIR"
exec python3 server.py --host 127.0.0.1 --port 4173 --site-root dist
