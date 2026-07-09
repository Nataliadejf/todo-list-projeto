const fs = require('fs');
const path = require('path');

const monthKeys = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const createTableSql = `
    CREATE TABLE IF NOT EXISTS todos (
        "dbId" SERIAL PRIMARY KEY,
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
        jan BOOLEAN DEFAULT false,
        fev BOOLEAN DEFAULT false,
        mar BOOLEAN DEFAULT false,
        abr BOOLEAN DEFAULT false,
        mai BOOLEAN DEFAULT false,
        jun BOOLEAN DEFAULT false,
        jul BOOLEAN DEFAULT false,
        ago BOOLEAN DEFAULT false,
        "set" BOOLEAN DEFAULT false,
        "out" BOOLEAN DEFAULT false,
        nov BOOLEAN DEFAULT false,
        dez BOOLEAN DEFAULT false,
        completed BOOLEAN DEFAULT false,
        approved BOOLEAN DEFAULT true,
        deprioritized BOOLEAN DEFAULT false
    )
`;

const createTableSqlite = createTableSql
    .replace('"dbId" SERIAL PRIMARY KEY', '"dbId" INTEGER PRIMARY KEY AUTOINCREMENT')
    .replace(/BOOLEAN DEFAULT false/g, 'INTEGER DEFAULT 0');

const createTasksSql = `
    CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        initiativeDbId BIGINT,
        title TEXT,
        description TEXT,
        owner TEXT,
        status TEXT,
        priority TEXT,
        dueDate TEXT,
        startDate TEXT,
        endDate TEXT,
        done BOOLEAN DEFAULT false,
        createdAt TEXT,
        updatedAt TEXT
    )
`;

const createTasksSqlite = createTasksSql
    .replace('BIGINT', 'INTEGER')
    .replace('BOOLEAN DEFAULT false', 'INTEGER DEFAULT 0');

let adapter = null;

function toPgParams(sql) {
    let index = 0;
    return sql.replace(/\?/g, () => {
        index += 1;
        return `$${index}`;
    });
}

function normalizeSql(sql) {
    if (!adapter || adapter.type !== 'postgres') return sql;
    return sql.replace(/\bdbId\b/g, '"dbId"');
}

function formatRow(row) {
    if (!row) return row;
    const output = { ...row };
    output.dbId = Number(output.dbId ?? output.dbid);
    output.completed = Boolean(output.completed);
    output.approved = Boolean(output.approved);
    output.deprioritized = Boolean(output.deprioritized);
    monthKeys.forEach((month) => {
        output[month] = Boolean(output[month]);
    });
    return output;
}

async function ensureApprovalColumns() {
    const isPg = adapter.type === 'postgres';
    let columnNames = [];

    if (isPg) {
        const result = await adapter.pool.query(
            `SELECT column_name FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'todos'`,
        );
        columnNames = result.rows.map((row) => row.column_name);
    } else {
        const rows = await new Promise((resolve, reject) => {
            adapter.db.all('PRAGMA table_info(todos)', (err, data) => (err ? reject(err) : resolve(data || [])));
        });
        columnNames = rows.map((row) => row.name);
    }

    if (columnNames.includes('approved')) return;

    if (isPg) {
        await adapter.pool.query('ALTER TABLE todos ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT true');
        await adapter.pool.query('ALTER TABLE todos ADD COLUMN IF NOT EXISTS deprioritized BOOLEAN DEFAULT false');
        await adapter.pool.query('UPDATE todos SET approved = true WHERE approved IS NULL');
        await adapter.pool.query('UPDATE todos SET deprioritized = false WHERE deprioritized IS NULL');
    } else {
        await run('ALTER TABLE todos ADD COLUMN approved INTEGER DEFAULT 1');
        await run('ALTER TABLE todos ADD COLUMN deprioritized INTEGER DEFAULT 0');
    }
    console.log('Colunas approved/deprioritized adicionadas ao banco.');
}

async function ensureTaskColumns() {
    const isPg = adapter.type === 'postgres';
    let columnNames = [];

    if (isPg) {
        const result = await adapter.pool.query(
            `SELECT column_name FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'tasks'`,
        );
        columnNames = result.rows.map((row) => row.column_name);
    } else {
        const rows = await new Promise((resolve, reject) => {
            adapter.db.all('PRAGMA table_info(tasks)', (err, data) => (err ? reject(err) : resolve(data || [])));
        });
        columnNames = rows.map((row) => row.name);
    }

    const lower = columnNames.map((name) => name.toLowerCase());
    const toAdd = [];
    if (!lower.includes('startdate')) toAdd.push('startDate');
    if (!lower.includes('enddate')) toAdd.push('endDate');
    if (toAdd.length === 0) return;

    for (const column of toAdd) {
        if (isPg) {
            await adapter.pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ${column} TEXT`);
        } else {
            await run(`ALTER TABLE tasks ADD COLUMN ${column} TEXT`);
        }
    }
    console.log(`Colunas de tarefa adicionadas: ${toAdd.join(', ')}.`);
}

function resolveDataDir() {
    if (process.env.DATA_DIR) return process.env.DATA_DIR;
    if (process.env.NODE_ENV === 'production' && fs.existsSync('/var/data')) return '/var/data';
    return __dirname;
}

async function ensureSqliteSchema(db) {
    const columns = await new Promise((resolve, reject) => {
        db.all('PRAGMA table_info(todos)', (err, rows) => (err ? reject(err) : resolve(rows || [])));
    });
    const dbIdCol = columns.find((col) => col.name === 'dbId');
    const type = String(dbIdCol?.type || '').toUpperCase();
    if (dbIdCol && type.includes('INT')) return;

    const countRow = await new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) AS total FROM todos', (err, row) => (err ? reject(err) : resolve(row)));
    });
    const total = Number(countRow?.total || 0);

    if (total === 0) {
        await new Promise((resolve, reject) => {
            db.run('DROP TABLE IF EXISTS todos', (err) => (err ? reject(err) : resolve()));
        });
        await new Promise((resolve, reject) => {
            db.run(createTableSqlite, (err) => (err ? reject(err) : resolve()));
        });
        console.log('Schema SQLite recriado (dbId INTEGER AUTOINCREMENT).');
        return;
    }

    console.warn('Schema SQLite antigo detectado; migrando registros...');
    await new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run('ALTER TABLE todos RENAME TO todos_legacy', (err) => {
                if (err) return reject(err);
                db.run(createTableSqlite, (err2) => {
                    if (err2) return reject(err2);
                    db.run(
                        `INSERT INTO todos (
                            id, area, front, initiative, owner, description, deliveries, gainCategory, gainDescription, size,
                            weight, status, startDate, plannedEndDate, realEndDate, deadlineDays, deadlinePercent, progressPercent,
                            severity, urgency, strategy, priority, impediment, notes, weightedDelivery,
                            jan, fev, mar, abr, mai, jun, jul, ago, "set", "out", nov, dez, completed
                        )
                        SELECT
                            id, area, front, initiative, owner, description, deliveries, gainCategory, gainDescription, size,
                            weight, status, startDate, plannedEndDate, realEndDate, deadlineDays, deadlinePercent, progressPercent,
                            severity, urgency, strategy, priority, impediment, notes, weightedDelivery,
                            jan, fev, mar, abr, mai, jun, jul, ago, "set", "out", nov, dez, completed
                        FROM todos_legacy ORDER BY rowid`,
                        (err3) => {
                            if (err3) return reject(err3);
                            db.run('DROP TABLE todos_legacy', (err4) => (err4 ? reject(err4) : resolve()));
                        },
                    );
                });
            });
        });
    });
    console.log('Migração SQLite concluída.');
}

async function initDatabase() {
    if (process.env.DATABASE_URL) {
        const { Pool } = require('pg');
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.PG_SSL === 'false' ? false : { rejectUnauthorized: false },
        });
        await pool.query(createTableSql);
        await pool.query(createTasksSql);
        adapter = { type: 'postgres', pool, persistent: true };
        await ensureApprovalColumns();
        await ensureTaskColumns();
        console.log('Banco PostgreSQL conectado (persistente).');
        return adapter;
    }

    const sqlite3 = require('sqlite3').verbose();
    const dataDir = resolveDataDir();
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const dbPath = path.join(dataDir, 'data.sqlite');
    const persistent = Boolean(process.env.DATA_DIR) || dataDir === '/var/data';

    const db = new sqlite3.Database(dbPath);
    await new Promise((resolve, reject) => {
        db.run(createTableSqlite, (err) => (err ? reject(err) : resolve()));
    });
    await new Promise((resolve, reject) => {
        db.run(createTasksSqlite, (err) => (err ? reject(err) : resolve()));
    });
    await ensureSqliteSchema(db);

    adapter = { type: 'sqlite', db, dbPath, persistent };
    await ensureApprovalColumns();
    await ensureTaskColumns();
    console.log(`Banco SQLite em ${dbPath}${persistent ? ' (disco persistente)' : ''}.`);
    if (!persistent && process.env.NODE_ENV === 'production') {
        console.warn('AVISO: SQLite sem DATA_DIR/DATABASE_URL — dados podem sumir ao reiniciar no Render.');
    }
    return adapter;
}

function run(sql, params = []) {
    if (adapter.type === 'postgres') {
        let pgSql = toPgParams(normalizeSql(sql));
        const isInsert = /^\s*INSERT/i.test(pgSql.trim());
        if (isInsert && !/RETURNING/i.test(pgSql)) {
            pgSql = `${pgSql} RETURNING *`;
        }
        return adapter.pool.query(pgSql, params).then((result) => ({
            lastID: result.rows[0]?.dbId ?? result.rows[0]?.dbid ?? null,
            row: result.rows[0] ? formatRow(result.rows[0]) : null,
            changes: result.rowCount,
        }));
    }

    return new Promise((resolve, reject) => {
        adapter.db.run(sql, params, function onRun(err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
}

function all(sql, params = []) {
    if (adapter.type === 'postgres') {
        const pgSql = toPgParams(normalizeSql(sql));
        return adapter.pool.query(pgSql, params).then((result) => result.rows.map(formatRow));
    }

    return new Promise((resolve, reject) => {
        adapter.db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve((rows || []).map(formatRow));
        });
    });
}

async function getMeta() {
    const countRows = await all('SELECT COUNT(*) AS total FROM todos');
    return {
        type: adapter.type,
        persistent: adapter.persistent,
        path: adapter.dbPath || null,
        total: Number(countRows[0]?.total || 0),
    };
}

function getAdapter() {
    return adapter;
}

const INSERT_COLUMNS = `
    id, area, front, initiative, owner, description, deliveries, gainCategory, gainDescription, size,
    weight, status, startDate, plannedEndDate, realEndDate, deadlineDays, deadlinePercent, progressPercent,
    severity, urgency, strategy, priority, impediment, notes, weightedDelivery,
    jan, fev, mar, abr, mai, jun, jul, ago, "set", "out", nov, dez, completed, approved, deprioritized
`;

const INSERT_PLACEHOLDERS = Array(40).fill('?').join(', ');

const INSERT_SQL = `INSERT INTO todos (${INSERT_COLUMNS}) VALUES (${INSERT_PLACEHOLDERS})`;

function buildInsertParams(item) {
    return [
        item.id, item.area, item.front, item.initiative, item.owner, item.description, item.deliveries,
        item.gainCategory, item.gainDescription, item.size, item.weight, item.status, item.startDate,
        item.plannedEndDate, item.realEndDate, item.deadlineDays, item.deadlinePercent, item.progressPercent,
        item.severity, item.urgency, item.strategy, item.priority, item.impediment, item.notes, item.weightedDelivery,
        item.jan, item.fev, item.mar, item.abr, item.mai, item.jun, item.jul, item.ago, item.set, item.out,
        item.nov, item.dez, item.completed, item.approved, item.deprioritized,
    ];
}

async function insertTodo(item) {
    const params = buildInsertParams(item);
    if (params.length !== 40) {
        throw new Error(`Parâmetros inválidos no insert (${params.length}/40).`);
    }

    const result = await run(INSERT_SQL, params);

    if (result.row) return result.row;

    const lastId = Number(result.lastID);
    if (!Number.isFinite(lastId) || lastId <= 0) {
        throw new Error('Insert executado, mas o ID gerado não foi retornado.');
    }

    const lookupSql = adapter.type === 'sqlite'
        ? 'SELECT * FROM todos WHERE rowid = ?'
        : 'SELECT * FROM todos WHERE "dbId" = ?';
    const rows = await all(lookupSql, [lastId]);
    if (!rows[0]) {
        throw new Error(`Insert com ID ${lastId}, mas registro não encontrado após leitura.`);
    }
    return rows[0];
}

async function listTodos() {
    return all('SELECT * FROM todos ORDER BY "dbId" DESC');
}

async function getTodo(dbId) {
    const rows = await all('SELECT * FROM todos WHERE "dbId" = ?', [Number(dbId)]);
    return rows[0] || null;
}

const UPDATE_SQL = `
    UPDATE todos SET
        id = ?, area = ?, front = ?, initiative = ?, owner = ?, description = ?, deliveries = ?, gainCategory = ?, gainDescription = ?, size = ?,
        weight = ?, status = ?, startDate = ?, plannedEndDate = ?, realEndDate = ?, deadlineDays = ?, deadlinePercent = ?, progressPercent = ?,
        severity = ?, urgency = ?, strategy = ?, priority = ?, impediment = ?, notes = ?, weightedDelivery = ?,
        jan = ?, fev = ?, mar = ?, abr = ?, mai = ?, jun = ?, jul = ?, ago = ?, "set" = ?, "out" = ?, nov = ?, dez = ?, completed = ?,
        approved = ?, deprioritized = ?
    WHERE "dbId" = ?
`;

async function updateTodo(dbId, item) {
    const params = buildInsertParams(item);
    params.push(Number(dbId));
    await run(UPDATE_SQL, params);
    return getTodo(dbId);
}

async function deleteTodo(dbId) {
    await run('DELETE FROM todos WHERE "dbId" = ?', [Number(dbId)]);
}

async function insertTodosBulk(items) {
    for (const item of items) {
        await insertTodo(item);
    }
    return items.length;
}

function formatTask(row) {
    if (!row) return row;
    return {
        id: row.id,
        initiativeDbId: row.initiativeDbId ?? row.initiativedbid ?? null,
        title: row.title ?? '',
        description: row.description ?? '',
        owner: row.owner ?? '',
        status: row.status ?? '',
        priority: row.priority ?? '',
        dueDate: row.dueDate ?? row.duedate ?? '',
        startDate: row.startDate ?? row.startdate ?? '',
        endDate: row.endDate ?? row.enddate ?? '',
        done: Boolean(row.done),
        createdAt: row.createdAt ?? row.createdat ?? null,
        updatedAt: row.updatedAt ?? row.updatedat ?? null,
    };
}

async function listTasks(initiativeDbId) {
    if (initiativeDbId != null && initiativeDbId !== '') {
        const rows = await all(
            'SELECT * FROM tasks WHERE initiativeDbId = ? ORDER BY createdAt DESC',
            [Number(initiativeDbId)],
        );
        return rows.map(formatTask);
    }
    const rows = await all('SELECT * FROM tasks ORDER BY createdAt DESC');
    return rows.map(formatTask);
}

async function getTask(id) {
    const rows = await all('SELECT * FROM tasks WHERE id = ?', [String(id)]);
    return rows[0] ? formatTask(rows[0]) : null;
}

function taskBool(value) {
    return adapter.type === 'postgres' ? Boolean(value) : (value ? 1 : 0);
}

async function insertTask(task) {
    const id = task.id || require('crypto').randomUUID();
    const now = new Date().toISOString();
    await run(
        `INSERT INTO tasks (id, initiativeDbId, title, description, owner, status, priority, dueDate, startDate, endDate, done, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            id,
            task.initiativeDbId != null ? Number(task.initiativeDbId) : null,
            task.title ?? '', task.description ?? '', task.owner ?? '', task.status ?? '', task.priority ?? '',
            task.dueDate ?? '', task.startDate ?? '', task.endDate ?? '', taskBool(task.done), now, now,
        ],
    );
    return getTask(id);
}

async function updateTask(id, task) {
    const now = new Date().toISOString();
    await run(
        `UPDATE tasks SET
            initiativeDbId = ?, title = ?, description = ?, owner = ?, status = ?, priority = ?, dueDate = ?,
            startDate = ?, endDate = ?, done = ?, updatedAt = ?
         WHERE id = ?`,
        [
            task.initiativeDbId != null ? Number(task.initiativeDbId) : null,
            task.title ?? '', task.description ?? '', task.owner ?? '', task.status ?? '', task.priority ?? '',
            task.dueDate ?? '', task.startDate ?? '', task.endDate ?? '', taskBool(task.done), now, String(id),
        ],
    );
    return getTask(id);
}

async function deleteTask(id) {
    await run('DELETE FROM tasks WHERE id = ?', [String(id)]);
}

module.exports = {
    monthKeys,
    initDatabase,
    run,
    all,
    getMeta,
    getAdapter,
    formatRow,
    insertTodo,
    insertTodosBulk,
    buildInsertParams,
    listTodos,
    getTodo,
    updateTodo,
    deleteTodo,
    listTasks,
    getTask,
    insertTask,
    updateTask,
    deleteTask,
};
