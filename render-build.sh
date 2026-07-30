#!/usr/bin/env bash
# Removido o -e para conseguir tratar falha de build (ex.: OOM no free tier)
# e cair no web/out commitado como fallback.
set -uo pipefail

echo "==> Render build: API"
npm install

echo "==> Render build: frontend Next.js"
export STATIC_EXPORT=1
export NPM_CONFIG_PRODUCTION=false
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=512}"

if node scripts/build-frontend.js; then
  echo "==> Build do frontend OK (gerado agora)"
else
  echo "⚠️  Build do frontend falhou — usando o web/out commitado (fallback)."
fi

# Se nem o build nem o fallback existirem, aí sim é erro fatal.
if [ ! -f web/out/index.html ]; then
  echo "ERRO: web/out/index.html não existe (build falhou e não há fallback commitado)."
  exit 1
fi

echo "==> Build OK ($(du -sh web/out | cut -f1))"
