# Configuração no Render

## 1. Banco PostgreSQL (obrigatório para dados entre computadores)

No painel Render:

1. **Create → PostgreSQL** (plano Free)
2. Nome: `todolist-db`
3. No serviço web **todolist-projeto-2** → **Environment**:
   - Adicione `DATABASE_URL` = **Internal Database URL** do Postgres
4. **Save** e **Manual Deploy**

Confirme em: `https://todo-list-projeto2.onrender.com/api/health`

```json
{
  "ok": true,
  "database": "postgres",
  "persistent": true
}
```

Sem `DATABASE_URL`, o SQLite fica no disco **efêmero** do Render — os dados somem ao reiniciar e não são compartilhados de forma confiável.

## 2. Build & Deploy

| Campo | Valor |
|--------|--------|
| **Build Command** | `bash render-build.sh` |
| **Start Command** | `node server.js` |

Variáveis: `STATIC_EXPORT=1`, `NPM_CONFIG_PRODUCTION=false`

## 3. Teste entre computadores

1. Cadastre a iniciativa `234` em **Iniciativas**
2. No outro PC, abra o mesmo link e clique **Atualizar** nos filtros
3. Deve aparecer na lista e em `/api/todos`
