# Configuração manual no Render (obrigatório)

O serviço **não usa automaticamente** o `render.yaml` se foi criado antes do Blueprint.
Abra **Dashboard → todolist-projeto-2 → Settings → Build & Deploy** e configure:

| Campo | Valor exato |
|--------|-------------|
| **Branch** | `main` |
| **Build Command** | `bash render-build.sh` |
| **Start Command** | `node server.js` |

**Environment** (Environment Variables):

| Key | Value |
|-----|--------|
| `STATIC_EXPORT` | `1` |
| `NPM_CONFIG_PRODUCTION` | `false` |
| `NODE_OPTIONS` | `--max-old-space-size=512` |

Depois: **Manual Deploy → Clear build cache & deploy**.

## Conferir deploy

Nos logs de **Start** deve aparecer em segundos:

```
Servidor rodando na porta 10000
UI: layout GHT (sidebar escura, 3 páginas)
```

**Não** deve aparecer:

- `prestart` / `ensure-frontend-build`
- `Gerando export estático do Next.js` no passo **Start** (só no **Build**)
- `Port scan timeout`

Teste: `https://todo-list-projeto2.onrender.com/api/health` → `{"ok":true,"frontend":true}`
