# GHT — Portfólio Estratégico (Frontend)

Aplicação Next.js inspirada em [projetos-ght.tess.page](https://projetos-ght.tess.page/), com três páginas:

| Rota | Conteúdo |
|------|----------|
| `/portfolio` | Filtros, métricas, gráfico e tabela geral |
| `/projetos` | Kanban + lista de atividades |
| `/iniciativas` | Cadastro completo (todos os campos originais) + exportação CSV |

## Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS v4
- shadcn/ui (padrões de componentes)
- lucide-react
- Framer Motion
- Recharts

## Como rodar

### 1. API (raiz do repositório)

```bash
cd ..
npm install
npm run api
```

A API Express + SQLite sobe em `http://localhost:3001`.

### 2. Frontend

```bash
cd web
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

### Atalho (raiz)

```bash
npm install
npm run dev
```

Isso inicia API e Next.js juntos (requer `concurrently` instalado na raiz).

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `API_URL` | URL da API Express (padrão: `http://localhost:3001`) |
| `PORT` | Porta da API na raiz (padrão: `3001`) |

## Deploy (Vercel)

1. Faça deploy do frontend (`web/`) na Vercel.
2. Hospede a API Express separadamente (Render, Railway, etc.).
3. Configure `API_URL` na Vercel apontando para a API publicada.

## Estrutura

```
src/
  app/                 # Rotas (portfolio, projetos, iniciativas)
  components/
    layout/            # Sidebar, shell, header
    sections/          # Filtros, métricas, gráfico, kanban, formulário
    ui/                # Botões, cards, inputs (estilo shadcn)
    providers/         # Contexto de iniciativas
  lib/                 # API, tipos, filtros, CSV
```

## Aproximações em relação à referência

- **Supabase** foi substituído pela API SQLite existente no projeto.
- Página **Aprovações** da referência não foi replicada; o fluxo foi distribuído em 3 rotas acordadas.
- Gráfico e kanban usam regras de agrupamento locais (peso/status) quando o dado não segue exatamente o modelo da referência.
- Animações e ícones seguem o mesmo espírito visual, com implementação própria em Framer Motion / lucide-react.
