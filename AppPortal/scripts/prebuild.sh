#!/usr/bin/env sh
set -e

APP_ROOT="/app"

echo "🕒 Pre-build agendado iniciado..."
cd "$APP_ROOT"
./scripts/build_on_demand.sh
echo "✅ Pre-build agendado finalizado."
