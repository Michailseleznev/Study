#!/bin/zsh
set -euo pipefail

ANCHOR_NAME="com.misha.localhost4173"
ANCHOR_FILE="/etc/pf.anchors/${ANCHOR_NAME}"
PF_CONF="/etc/pf.conf"
TMP_CONF="$(mktemp /tmp/pf.conf.XXXXXX)"
trap 'rm -f "$TMP_CONF"' EXIT

cat > "$ANCHOR_FILE" <<'RULES'
rdr pass on lo0 inet proto tcp from any to 127.0.0.1 port 80 -> 127.0.0.1 port 4173
RULES

cp "$PF_CONF" "$TMP_CONF"

if ! grep -Fq "rdr-anchor \"${ANCHOR_NAME}\"" "$TMP_CONF"; then
  printf '\nrdr-anchor "%s"\n' "$ANCHOR_NAME" >> "$TMP_CONF"
fi
if ! grep -Fq "anchor \"${ANCHOR_NAME}\"" "$TMP_CONF"; then
  printf 'anchor "%s"\n' "$ANCHOR_NAME" >> "$TMP_CONF"
fi

cp "$TMP_CONF" "$PF_CONF"
pfctl -f "$PF_CONF"
pfctl -a "$ANCHOR_NAME" -f "$ANCHOR_FILE"
pfctl -e >/dev/null 2>&1 || true

echo "ok"
