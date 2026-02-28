#!/usr/bin/env sh
set -e

# Garantir permissões do volume de tokens
if [ -d "/app/tokens" ]; then
  chown -R 1001:1001 /app/tokens || true
fi

# Limpar locks do Chromium antes de iniciar
pkill -f chromium || true
pkill -f chrome || true
rm -f /app/tokens/avelar-session/DevToolsActivePort
rm -f /app/tokens/avelar-session/SingletonLock
rm -f /app/tokens/avelar-session/SingletonSocket
rm -f /app/tokens/avelar-session/SingletonCookie

exec node /app/server.js
