const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const dbPath = path.join(__dirname, 'data.sqlite');
const db = new sqlite3.Database(dbPath);

app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

const monthKeys = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const baseFields = [
    'id', 'area', 'front', 'initiative', 'owner', 'description', 'deliveries', 'gainCategory', 'gainDescription', 'size',
    'weight', 'status', 'startDate', 'plannedEndDate', 'realEndDate', 'deadlineDays', 'deadlinePercent', 'progressPercent',
    'severity', 'urgency', 'strategy', 'priority', 'impediment', 'notes', 'weightedDelivery'
];

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function onRun(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function normalizePayload(payload) {
    const item = {};
    baseFields.forEach((field) => {
        item[field] = payload[field] ?? '';
    });
    monthKeys.forEach((month) => {
        item[month] = payload[month] ? 1 : 0;
    });
    item.completed = payload.completed ? 1 : 0;
    return item;
}

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS todos (
            dbId INTEGER PRIMARY KEY AUTOINCREMENT,
            id TEXT,
            area TEXT,
            front TEXT,
            initiative TEXT,
            owner TEXT,
            description TEXT,
            deliveries TEXT,
            gainCategory TEXT,
            gainDescription TEXT,
            size TEXT,
            weight TEXT,
            status TEXT,
            startDate TEXT,
            plannedEndDate TEXT,
            realEndDate TEXT,
            deadlineDays TEXT,
            deadlinePercent TEXT,
            progressPercent TEXT,
            severity TEXT,
            urgency TEXT,
            strategy TEXT,
            priority TEXT,
            impediment TEXT,
            notes TEXT,
            weightedDelivery TEXT,
            jan INTEGER DEFAULT 0,
            fev INTEGER DEFAULT 0,
            mar INTEGER DEFAULT 0,
            abr INTEGER DEFAULT 0,
            mai INTEGER DEFAULT 0,
            jun INTEGER DEFAULT 0,
            jul INTEGER DEFAULT 0,
            ago INTEGER DEFAULT 0,
            set INTEGER DEFAULT 0,
            out INTEGER DEFAULT 0,
            nov INTEGER DEFAULT 0,
            dez INTEGER DEFAULT 0,
            completed INTEGER DEFAULT 0
        )
    `);
});

app.get('/api/todos', async (req, res) => {
    try {
        const rows = await all('SELECT * FROM todos ORDER BY dbId DESC');
        const formatted = rows.map((row) => {
            const output = { ...row, completed: Boolean(row.completed) };
            monthKeys.forEach((month) => {
                output[month] = Boolean(row[month]);
            });
            return output;
        });
        res.json(formatted);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/todos', async (req, res) => {
    try {
        const todo = normalizePayload(req.body || {});
        const sql = `
            INSERT INTO todos (
                id, area, front, initiative, owner, description, deliveries, gainCategory, gainDescription, size,
                weight, status, startDate, plannedEndDate, realEndDate, deadlineDays, deadlinePercent, progressPercent,
                severity, urgency, strategy, priority, impediment, notes, weightedDelivery,
                jan, fev, mar, abr, mai, jun, jul, ago, set, out, nov, dez, completed
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [
            todo.id, todo.area, todo.front, todo.initiative, todo.owner, todo.description, todo.deliveries, todo.gainCategory, todo.gainDescription, todo.size,
            todo.weight, todo.status, todo.startDate, todo.plannedEndDate, todo.realEndDate, todo.deadlineDays, todo.deadlinePercent, todo.progressPercent,
            todo.severity, todo.urgency, todo.strategy, todo.priority, todo.impediment, todo.notes, todo.weightedDelivery,
            todo.jan, todo.fev, todo.mar, todo.abr, todo.mai, todo.jun, todo.jul, todo.ago, todo.set, todo.out, todo.nov, todo.dez, todo.completed
        ];
        const result = await run(sql, values);
        const rows = await all('SELECT * FROM todos WHERE dbId = ?', [result.lastID]);
        const created = rows[0];
        created.completed = Boolean(created.completed);
        monthKeys.forEach((month) => {
            created[month] = Boolean(created[month]);
        });
        res.status(201).json(created);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/todos/:id', async (req, res) => {
    try {
        const dbId = Number(req.params.id);
        const todo = normalizePayload(req.body || {});
        const sql = `
            UPDATE todos SET
                id = ?, area = ?, front = ?, initiative = ?, owner = ?, description = ?, deliveries = ?, gainCategory = ?, gainDescription = ?, size = ?,
                weight = ?, status = ?, startDate = ?, plannedEndDate = ?, realEndDate = ?, deadlineDays = ?, deadlinePercent = ?, progressPercent = ?,
                severity = ?, urgency = ?, strategy = ?, priority = ?, impediment = ?, notes = ?, weightedDelivery = ?,
                jan = ?, fev = ?, mar = ?, abr = ?, mai = ?, jun = ?, jul = ?, ago = ?, set = ?, out = ?, nov = ?, dez = ?, completed = ?
            WHERE dbId = ?
        `;
        const values = [
            todo.id, todo.area, todo.front, todo.initiative, todo.owner, todo.description, todo.deliveries, todo.gainCategory, todo.gainDescription, todo.size,
            todo.weight, todo.status, todo.startDate, todo.plannedEndDate, todo.realEndDate, todo.deadlineDays, todo.deadlinePercent, todo.progressPercent,
            todo.severity, todo.urgency, todo.strategy, todo.priority, todo.impediment, todo.notes, todo.weightedDelivery,
            todo.jan, todo.fev, todo.mar, todo.abr, todo.mai, todo.jun, todo.jul, todo.ago, todo.set, todo.out, todo.nov, todo.dez, todo.completed,
            dbId
        ];
        await run(sql, values);
        const rows = await all('SELECT * FROM todos WHERE dbId = ?', [dbId]);
        if (!rows.length) return res.status(404).json({ error: 'Iniciativa não encontrada' });
        const updated = rows[0];
        updated.completed = Boolean(updated.completed);
        monthKeys.forEach((month) => {
            updated[month] = Boolean(updated[month]);
        });
        return res.json(updated);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

app.delete('/api/todos/:id', async (req, res) => {
    try {
        const dbId = Number(req.params.id);
        await run('DELETE FROM todos WHERE dbId = ?', [dbId]);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
