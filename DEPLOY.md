# Deploy automático

## GitHub Actions

A cada **push** ou **pull request** na branch `main`, o workflow `.github/workflows/deploy.yml` valida o build do frontend.

## Render (produção)

1. Acesse [render.com](https://render.com) e conecte o repositório `todo-list-projeto`.
2. O arquivo `render.yaml` já define:
   - **autoDeploy: true** — novo deploy a cada push em `main`
   - **buildCommand** — instala dependências e gera `web/out`
   - **startCommand** — `npm start` (API + frontend na mesma URL)
3. Após o deploy, a aplicação fica em uma URL `*.onrender.com`.

### Banco de dados em produção

O SQLite (`data.sqlite`) é criado no servidor. No plano gratuito do Render o disco pode ser **efêmero** (dados podem sumir após redeploy). Para produção estável, considere PostgreSQL/Supabase no futuro.

## Comandos locais

```bash
npm install
npm run build    # gera web/out para produção
npm start        # API + frontend estático
```
