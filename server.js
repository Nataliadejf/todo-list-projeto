const express = require('express');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const store = require('./repository');
const auth = require('./auth');

const app = express();
const PORT = process.env.PORT || 3001;
const seedPath = path.join(__dirname, 'seed-data.json');
const webOut = path.join(__dirname, 'web', 'out');
const hasNextBuild = fs.existsSync(path.join(webOut, 'index.html'));

// Exige login nas rotas de dados quando REQUIRE_AUTH=1 (padrão: aberto).
const requireData = process.env.REQUIRE_AUTH === '1'
    ? auth.requireAuth
    : (req, res, next) => next();

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(auth.middleware);
auth.mountRoutes(app);
app.use('/api/todos', requireData);
app.use('/api/tasks', requireData);

const baseFields = [
    'id', 'area', 'front', 'initiative', 'owner', 'backup', 'efficacyIndicator', 'description', 'deliveries', 'gainCategory', 'gainDescription', 'size',
    'weight', 'status', 'startDate', 'plannedEndDate', 'realEndDate', 'deadlineDays', 'deadlinePercent', 'progressPercent',
    'severity', 'urgency', 'strategy', 'priority', 'impediment', 'notes', 'weightedDelivery',
];

function normalizePayload(payload) {
    const useBool = store.wantsBooleans();
    const bool = (value) => (useBool ? Boolean(value) : (value ? 1 : 0));
    const item = {};
    baseFields.forEach((field) => {
        item[field] = payload[field] ?? '';
    });
    store.monthKeys.forEach((month) => {
        item[month] = bool(payload[month]);
    });
    item.completed = bool(payload.completed);
    item.approved = bool(payload.approved);
    item.deprioritized = bool(payload.deprioritized);
    // Status "Concluído" implica 100% de conclusão automaticamente.
    if (String(item.status || '').trim() === 'Concluído') {
        item.progressPercent = '100';
        item.completed = bool(true);
    }
    return item;
}

// Gera o próximo id numérico quando o usuário não informa um.
async function ensureId(item) {
    if (item.id && String(item.id).trim()) return;
    try {
        const all = await store.listTodos();
        const maxId = all.reduce((m, t) => {
            const n = Number.parseInt(t.id, 10);
            return Number.isFinite(n) && n > m ? n : m;
        }, 0);
        item.id = String(maxId + 1);
    } catch {
        item.id = String(Date.now());
    }
}

async function seedIfEmpty() {
    const meta = await store.getMeta();
    if (meta.total > 0) return;
    if (!fs.existsSync(seedPath)) return;

    const seedItems = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    if (!Array.isArray(seedItems) || seedItems.length === 0) return;

    const useBool = store.wantsBooleans();
    const items = seedItems.map((rawItem) => {
        const todo = normalizePayload(rawItem);
        todo.approved = useBool ? true : 1;
        todo.deprioritized = useBool ? false : 0;
        return todo;
    });
    await store.insertTodosBulk(items);
    console.log(`Carga inicial aplicada: ${items.length} iniciativas.`);
}

app.get('/api/health', async (req, res) => {
    try {
        const meta = await store.getMeta();
        res.json({
            ok: true,
            frontend: hasNextBuild,
            port: PORT,
            database: meta.type,
            persistent: meta.persistent,
            total: meta.total,
        });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

app.get('/api/todos', async (req, res) => {
    try {
        const rows = await store.listTodos();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/todos', async (req, res) => {
    try {
        const todo = normalizePayload(req.body || {});
        const useBool = store.wantsBooleans();
        if (req.body?.approved === undefined) {
            todo.approved = useBool ? false : 0;
        }
        if (req.body?.deprioritized === undefined) {
            todo.deprioritized = useBool ? false : 0;
        }
        await ensureId(todo);
        const created = await store.insertTodo(todo);
        return res.status(201).json(created);
    } catch (err) {
        console.error('POST /api/todos:', err);
        return res.status(500).json({ error: err.message || 'Erro ao salvar iniciativa' });
    }
});

app.put('/api/todos/:id', async (req, res) => {
    try {
        const dbId = Number(req.params.id);
        const todo = normalizePayload(req.body || {});
        // Data Previsão de Fim já preenchida só pode ser alterada pelo administrador.
        if (!(await auth.isAdminReq(req))) {
            const existing = await store.getTodo(dbId);
            if (existing && String(existing.plannedEndDate || '').trim()) {
                todo.plannedEndDate = existing.plannedEndDate;
            }
        }
        const updated = await store.updateTodo(dbId, todo);
        if (!updated) return res.status(404).json({ error: 'Iniciativa não encontrada' });
        return res.json(updated);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

app.delete('/api/todos/:id', async (req, res) => {
    try {
        const dbId = Number(req.params.id);
        await store.deleteTodo(dbId);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ---------------------------------------------------------------------------
// Tarefas (vinculadas a iniciativas)
// ---------------------------------------------------------------------------

function normalizeTaskPayload(payload) {
    const useBool = store.wantsBooleans();
    return {
        initiativeDbId: payload.initiativeDbId != null && payload.initiativeDbId !== ''
            ? Number(payload.initiativeDbId)
            : null,
        title: payload.title ?? '',
        description: payload.description ?? '',
        owner: payload.owner ?? '',
        status: payload.status ?? 'A fazer',
        priority: payload.priority ?? '',
        dueDate: payload.dueDate ?? '',
        startDate: payload.startDate ?? '',
        endDate: payload.endDate ?? '',
        done: useBool ? Boolean(payload.done) : (payload.done ? 1 : 0),
    };
}

app.get('/api/tasks', async (req, res) => {
    try {
        const rows = await store.listTasks(req.query.initiativeDbId);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/tasks', async (req, res) => {
    try {
        const task = normalizeTaskPayload(req.body || {});
        if (!task.title.trim()) {
            return res.status(400).json({ error: 'O título da tarefa é obrigatório.' });
        }
        const created = await store.insertTask(task);
        return res.status(201).json(created);
    } catch (err) {
        console.error('POST /api/tasks:', err);
        return res.status(500).json({ error: err.message || 'Erro ao salvar tarefa' });
    }
});

app.put('/api/tasks/:id', async (req, res) => {
    try {
        const task = normalizeTaskPayload(req.body || {});
        const updated = await store.updateTask(req.params.id, task);
        if (!updated) return res.status(404).json({ error: 'Tarefa não encontrada' });
        return res.json(updated);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

app.delete('/api/tasks/:id', async (req, res) => {
    try {
        await store.deleteTask(req.params.id);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ---------------------------------------------------------------------------
// Responsáveis (lista gerenciável — ativo/inativo)
// ---------------------------------------------------------------------------

const RESPONSAVEIS_SEED = [
    'Beatriz Cavalcante', 'Bruno Fernandes', 'Georgia Leite', 'Larissa Lande', 'Marcelo Araújo',
    'Thainá Morais', 'Thais Paixão', 'Vitor Moraes', 'Vitoria Ferreira', 'Carlos Merigo',
    'André Pascoal', 'Natalia de Jesus Franca', 'Gabriel Gopfert', 'Aline Saito', 'Carlos Freires',
    'Backlog', 'Não alocado',
];

app.get('/api/responsaveis', async (req, res) => {
    try {
        // devolve todos com o flag active (o front usa ativos p/ seleção e inativos p/ ocultar)
        res.json((await store.listResponsaveis(false)).map((r) => ({ name: r.name, active: Boolean(r.active) })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/responsaveis', auth.requireAdmin, async (req, res) => {
    try {
        res.json(await store.listResponsaveis(false));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/usage', auth.requireAdmin, async (req, res) => {
    try {
        res.json({ byMonth: await store.getUsageByMonth(12) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/responsaveis', auth.requireAdmin, async (req, res) => {
    try {
        const name = String(req.body?.name || '').trim();
        if (!name) return res.status(400).json({ error: 'Informe o nome do responsável.' });
        const existing = await store.listResponsaveis(false);
        if (existing.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
            return res.status(409).json({ error: 'Esse responsável já existe.' });
        }
        return res.status(201).json(await store.addResponsavel(name));
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/responsaveis/:id/toggle', auth.requireAdmin, async (req, res) => {
    try {
        const r = (await store.listResponsaveis(false)).find((x) => x.id === req.params.id);
        if (!r) return res.status(404).json({ error: 'Responsável não encontrado.' });
        await store.setResponsavelActive(r.id, !r.active);
        return res.json({ ...r, active: !r.active });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

function sendExportedPage(routePath, res) {
    const normalized = routePath.endsWith('/') ? routePath.slice(0, -1) : routePath;
    const candidates = normalized === '' || normalized === '/'
        ? [path.join(webOut, 'index.html')]
        : [
            path.join(webOut, normalized.replace(/^\//, ''), 'index.html'),
            path.join(webOut, `${normalized.replace(/^\//, '')}.html`),
        ];

    for (const filePath of candidates) {
        if (fs.existsSync(filePath)) return res.sendFile(filePath);
    }
    return res.status(404).send('Página não encontrada');
}

function mountNextFrontend() {
    if (!hasNextBuild) {
        console.warn('Build do Next.js ausente (web/out). Execute: npm run build');
        app.get('/', (req, res) => {
            res.status(503).type('html').send(`
                <h1>Frontend não compilado</h1>
                <p>Execute <code>npm run build</code> e reinicie o servidor.</p>
            `);
        });
        return;
    }

    app.use(express.static(webOut, { index: false }));
    app.get('/', (req, res) => res.redirect(302, '/portfolio'));

    ['/portfolio', '/projetos', '/iniciativas', '/tarefas', '/admin'].forEach((routePath) => {
        app.get(routePath, (req, res) => sendExportedPage(routePath, res));
        app.get(`${routePath}/`, (req, res) => sendExportedPage(routePath, res));
    });

    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        if (req.path.includes('.')) return next();
        return sendExportedPage(req.path, res);
    });

    console.log('Frontend GHT (Next.js) ativo em web/out');
}

async function start() {
    await store.initStore();
    await auth.seedAdmin();
    await store.seedResponsaveisIfEmpty(RESPONSAVEIS_SEED);
    await seedIfEmpty();
    mountNextFrontend();

    app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
        console.log(hasNextBuild ? 'UI: layout GHT (sidebar escura, 3 páginas)' : 'UI: web/out ausente');
    });
}

start().catch((err) => {
    console.error('Falha ao iniciar aplicação:', err);
    process.exit(1);
});
