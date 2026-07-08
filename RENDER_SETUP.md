# Configuração no Render (persistência no BigQuery)

A aplicação agora persiste **iniciativas** e **tarefas** no **Google BigQuery**.
O PostgreSQL do Render não é mais usado. Em desenvolvimento local, sem credenciais,
o app cai automaticamente no SQLite (`data.sqlite`).

## 1. Pré-requisitos no Google Cloud

1. Projeto GCP com **BigQuery API** habilitada.
2. Um **service account** com papel `BigQuery Data Editor` + `BigQuery Job User`.
3. Baixe a chave JSON do service account.

O dataset (`todolist`) e as tabelas (`todos`, `tasks`) são criados automaticamente
na primeira subida (`ensureSchema`).

## 2. Variáveis de ambiente no Render

No serviço web **todolist-projeto-2** → **Environment**:

| Variável | Valor |
|----------|-------|
| `USE_BIGQUERY` | `1` |
| `BQ_DATASET` | `todolist` (ou o nome desejado) |
| `BQ_LOCATION` | `US` (mesma região do dataset) |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | conteúdo do JSON do service account (JSON puro **ou** base64) |
| `STATIC_EXPORT` | `1` |
| `NPM_CONFIG_PRODUCTION` | `false` |

`GOOGLE_APPLICATION_CREDENTIALS_JSON` está marcada como `sync: false` no `render.yaml`
(é segredo). Cole o valor manualmente no painel.

Confirme em `https://<seu-app>.onrender.com/api/health`:

```json
{ "ok": true, "database": "bigquery", "persistent": true }
```

## 3. Build & Deploy

| Campo | Valor |
|-------|-------|
| **Build Command** | `bash render-build.sh` |
| **Start Command** | `node server.js` |

## 4. Migrar os dados existentes (uma vez)

Copia as iniciativas que hoje estão no PostgreSQL do Render (ou no SQLite local)
para o BigQuery:

```bash
# a partir do PostgreSQL do Render:
DATABASE_URL="postgres://..." \
GOOGLE_APPLICATION_CREDENTIALS_JSON="$(cat service-account.json)" \
BQ_DATASET=todolist \
node scripts/migrate-to-bigquery.js --reset

# ou a partir do arquivo de carga inicial:
GOOGLE_APPLICATION_CREDENTIALS_JSON="$(cat service-account.json)" \
node scripts/migrate-to-bigquery.js --from-seed
```

`--reset` trunca a tabela `todos` no BigQuery antes de inserir.
