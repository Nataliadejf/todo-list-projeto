#!/usr/bin/env bash
# O frontend é buildado LOCALMENTE e commitado em web/out. No Render (free tier),
# reconstruir o Next.js estoura memória (OOM) e o build falha, deixando o site
# preso num deploy antigo. Por isso servimos o web/out commitado e só tentamos
# reconstruir se ele não existir.
set -uo pipefail

echo "==> Render: instalando dependências da API"
npm install

if [ -f web/out/index.html ]; then
  echo "==> Usando web/out commitado (build local). Sem rebuild no Render."
else
  echo "==> web/out ausente — tentando build no Render (pode falhar por OOM)..."
  export STATIC_EXPORT=1
  export NPM_CONFIG_PRODUCTION=false
  export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=512}"
  node scripts/build-frontend.js || echo "⚠️  Build no Render falhou e não há web/out commitado."
fi

if [ ! -f web/out/index.html ]; then
  echo "ERRO: web/out/index.html não existe (sem build e sem fallback commitado)."
  exit 1
fi

echo "==> Frontend pronto ($(du -sh web/out | cut -f1))."
