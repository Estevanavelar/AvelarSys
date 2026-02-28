#!/usr/bin/env sh
set -e

APP_ROOT="/app"
CRON_SCHEDULE="${APP_PORTAL_PREBUILD_CRON:-0 5,17 * * *}"

CRON_FILE="/etc/crontabs/root"

echo "🗓️ Configurando pre-build automático: ${CRON_SCHEDULE}"
echo "${CRON_SCHEDULE} cd ${APP_ROOT} && /bin/sh ${APP_ROOT}/scripts/prebuild.sh >> /proc/1/fd/1 2>&1" > "$CRON_FILE"

crond -l 8 -L /dev/stdout

cd "$APP_ROOT"
exec npm start
