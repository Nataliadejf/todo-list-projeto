const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;
const seedPath = path.join(__dirname, 'seed-data.json');
const webOut = path.join(__dirname, 'web', 'out');
const hasNextBuild = fs.existsSync(path.join(webOut, 'index.html'));

app.use(express.json({ limit: '1mb' }));

const baseFields = [
    'id', 'area', 'front', 'initiative', 'owner', 'description', 'deliveries', 'gainCategory', 'gainDescription', 'size',
    'weight', 'status', 'startDate', 'plannedEndDate', 'realEndDate', 'deadlineDays', 'deadlinePercent', 'progressPercent',
    'severity', 'urgency', 'strategy', 'priority', 'impediment', 'notes', 'weightedDelivery',
];

function normalizePayload(payload) {
    const isPg = db.getAdapter()?.type === 'postgres';
    const item = {};
    baseFields.forEach((field) => {
        item[field] = payload[field] ?? '';
    });
    db.monthKeys.forEach((month) => {
        item[month] = isPg ? Boolean(payload[month]) : (payload[month] ? 1 : 0);
    });
    item.completed = isPg ? Boolean(payload.completed) : (payload.completed ? 1 : 0);
    return item;
}

async function seedIfEmpty() {
    const meta = await db.getMeta();
    if (meta.total > 0) return;
    if (!fs.existsSync(seedPath)) return;

    const seedItems = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    if (!Array.isArray(seedItems) || seedItems.length === 0) return;

    for (const rawItem of seedItems) {
        const todo = normalizePayload(rawItem);
        await db.run(
            `
            INSERT INTO todos (
                id, area, front, initiative, owner, description, deliveries, gainCategory, gainDescription, size,
                weight, status, startDate, plannedEndDate, realEndDate, deadlineDays, deadlinePercent, progressPercent,
                severity, urgency, strategy, priority, impediment, notes, weightedDelivery,
                jan, fev, mar, abr, mai, jun, jul, ago, "set", "out", nov, dez, completed
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                todo.id, todo.area, todo.front, todo.initiative, todo.owner, todo.description, todo.deliveries, todo.gainCategory, todo.gainDescription, todo.size,
                todo.weight, todo.status, todo.startDate, todo.plannedEndDate, todo.realEndDate, todo.deadlineDays, todo.deadlinePercent, todo.progressPercent,
                todo.severity, todo.urgency, todo.strategy, todo.priority, todo.impediment, todo.notes, todo.weightedDelivery,
                todo.jan, todo.fev, todo.mar, todo.abr, todo.mai, todo.jun, todo.jul, todo.ago, todo.set, todo.out, todo.nov, todo.dez, todo.completed,
            ],
        );
    }
    console.log(`Carga inicial aplicada: ${seedItems.length} iniciativas.`);
}

app.get('/api/health', async (req, res) => {
    try {
        const meta = await db.getMeta();
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
        const rows = await db.all('SELECT * FROM todos ORDER BY dbId DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/todos', async (req, res) => {
    try {
        const todo = normalizePayload(req.body || {});
        const result = await db.run(
            `
            INSERT INTO todos (
                id, area, front, initiative, owner, description, deliveries, gainCategory, gainDescription, size,
                weight, status, startDate, plannedEndDate, realEndDate, deadlineDays, deadlinePercent, progressPercent,
                severity, urgency, strategy, priority, impediment, notes, weightedDelivery,
                jan, fev, mar, abr, mai, jun, jul, ago, "set", "out", nov, dez, completed
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                todo.id, todo.area, todo.front, todo.initiative, todo.owner, todo.description, todo.deliveries, todo.gainCategory, todo.gainDescription, todo.size,
                todo.weight, todo.status, todo.startDate, todo.plannedEndDate, todo.realEndDate, todo.deadlineDays, todo.deadlinePercent, todo.progressPercent,
                todo.severity, todo.urgency, todo.strategy, todo.priority, todo.impediment, todo.notes, todo.weightedDelivery,
                todo.jan, todo.fev, todo.mar, todo.abr, todo.mai, todo.jun, todo.jul, todo.ago, todo.set, todo.out, todo.nov, todo.dez, todo.completed,
            ],
        );

        let created = result.row;
        if (!created) {
            const rows = await db.all('SELECT * FROM todos WHERE dbId = ?', [result.lastID]);
            created = rows[0];
        }
        if (!created) {
            return res.status(500).json({ error: 'Não foi possível recuperar a iniciativa criada.' });
        }
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
        await db.run(
            `
            UPDATE todos SET
                id = ?, area = ?, front = ?, initiative = ?, owner = ?, description = ?, deliveries = ?, gainCategory = ?, gainDescription = ?, size = ?,
                weight = ?, status = ?, startDate = ?, plannedEndDate = ?, realEndDate = ?, deadlineDays = ?, deadlinePercent = ?, progressPercent = ?,
                severity = ?, urgency = ?, strategy = ?, priority = ?, impediment = ?, notes = ?, weightedDelivery = ?,
                jan = ?, fev = ?, mar = ?, abr = ?, mai = ?, jun = ?, jul = ?, ago = ?, "set" = ?, "out" = ?, nov = ?, dez = ?, completed = ?
            WHERE dbId = ?
            `,
            [
                todo.id, todo.area, todo.front, todo.initiative, todo.owner, todo.description, todo.deliveries, todo.gainCategory, todo.gainDescription, todo.size,
                todo.weight, todo.status, todo.startDate, todo.plannedEndDate, todo.realEndDate, todo.deadlineDays, todo.deadlinePercent, todo.progressPercent,
                todo.severity, todo.urgency, todo.strategy, todo.priority, todo.impediment, todo.notes, todo.weightedDelivery,
                todo.jan, todo.fev, todo.mar, todo.abr, todo.mai, todo.jun, todo.jul, todo.ago, todo.set, todo.out, todo.nov, todo.dez, todo.completed,
                dbId,
            ],
        );
        const rows = await db.all('SELECT * FROM todos WHERE dbId = ?', [dbId]);
        if (!rows.length) return res.status(404).json({ error: 'Iniciativa não encontrada' });
        return res.json(rows[0]);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

app.delete('/api/todos/:id', async (req, res) => {
    try {
        const dbId = Number(req.params.id);
        await db.run('DELETE FROM todos WHERE dbId = ?', [dbId]);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
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

    ['/portfolio', '/projetos', '/iniciativas'].forEach((routePath) => {
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
    await db.initDatabase();
    mountNextFrontend();

    app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
        console.log(hasNextBuild ? 'UI: layout GHT (sidebar escura, 3 páginas)' : 'UI: web/out ausente');
    });

    seedIfEmpty().catch((err) => {
        console.error('Falha na carga inicial do banco:', err.message);
    });
}

start().catch((err) => {
    console.error('Falha ao iniciar aplicação:', err);
    process.exit(1);
});
