#!/usr/bin/env bash
set -euo pipefail

echo "==> Render build: API"
npm install

echo "==> Render build: frontend Next.js"
export STATIC_EXPORT=1
export NPM_CONFIG_PRODUCTION=false
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=512}"
node scripts/build-frontend.js

if [ ! -f web/out/index.html ]; then
  echo "ERRO: web/out/index.html não foi gerado."
  exit 1
fi

echo "==> Build OK ($(du -sh web/out | cut -f1))"
