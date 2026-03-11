#!/bin/zsh
set -euo pipefail

ANCHOR_NAME="com.misha.localhost4173"
ANCHOR_FILE="/etc/pf.anchors/${ANCHOR_NAME}"
PF_CONF="/etc/pf.conf"
TMP_CONF="$(mktemp /tmp/pf.conf.XXXXXX)"
trap 'rm -f "$TMP_CONF"' EXIT

cp "$PF_CONF" "$TMP_CONF"
awk -v anchor="$ANCHOR_NAME" '
  $0 == "rdr-anchor \"" anchor "\"" { next }
  $0 == "anchor \"" anchor "\"" { next }
  { print }
' "$TMP_CONF" > "${TMP_CONF}.next"
mv "${TMP_CONF}.next" "$TMP_CONF"
cp "$TMP_CONF" "$PF_CONF"

rm -f "$ANCHOR_FILE"
pfctl -f "$PF_CONF"

echo "ok"
