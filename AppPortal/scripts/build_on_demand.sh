#!/usr/bin/env sh
set -e

APP_ROOT="/app"
HASH_FILE="$APP_ROOT/.next/.build_hash"

compute_hash() {
  find "$APP_ROOT/src" "$APP_ROOT/public" \
    "$APP_ROOT/package.json" "$APP_ROOT/package-lock.json" "$APP_ROOT/next.config.js" \
    -type f -print0 2>/dev/null \
    | sort -z \
    | xargs -0 sha256sum \
    | sha256sum \
    | awk '{print $1}'
}

if [ ! -d "$APP_ROOT/.next" ]; then
  mkdir -p "$APP_ROOT/.next"
fi

CURRENT_HASH="$(compute_hash)"
LAST_HASH=""

if [ -f "$HASH_FILE" ]; then
  LAST_HASH="$(cat "$HASH_FILE")"
fi

if [ "$CURRENT_HASH" != "$LAST_HASH" ]; then
  echo "🔁 Alterações detectadas. Executando build..."
  cd "$APP_ROOT"
  npm run build
  echo "$CURRENT_HASH" > "$HASH_FILE"
else
  echo "✅ Sem mudanças relevantes. Pulando build."
fi
