# Deploy automático

## GitHub Actions

A cada **push** ou **pull request** na branch `main`, o workflow `.github/workflows/deploy.yml` valida o build do frontend.

## Render (produção)

1. Acesse [render.com](https://render.com) e conecte o repositório `todo-list-projeto`.
2. No painel do serviço, confira:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Variáveis:** `STATIC_EXPORT=1` e `NPM_CONFIG_PRODUCTION=false`
3. O arquivo `render.yaml` define o mesmo para Blueprint/sync.
4. Se o build falhar no plano gratuito (memória), o `npm start` tenta compilar o frontend na subida como fallback.

### Banco de dados em produção

O SQLite (`data.sqlite`) é criado no servidor. No plano gratuito do Render o disco pode ser **efêmero** (dados podem sumir após redeploy). Para produção estável, considere PostgreSQL/Supabase no futuro.

## Comandos locais

```bash
npm install
npm run build    # gera web/out para produção
npm start        # API + frontend estático
```
