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
        completed BOOLEAN DEFAULT false
    )
`;

const createTableSqlite = createTableSql
    .replace('dbId SERIAL PRIMARY KEY', 'dbId INTEGER PRIMARY KEY AUTOINCREMENT')
    .replace(/BOOLEAN DEFAULT false/g, 'INTEGER DEFAULT 0');

let adapter = null;

function toPgParams(sql) {
    let index = 0;
    return sql.replace(/\?/g, () => {
        index += 1;
        return `$${index}`;
    });
}

function formatRow(row) {
    if (!row) return row;
    const output = { ...row };
    output.dbId = Number(output.dbId ?? output.dbid);
    output.completed = Boolean(output.completed);
    monthKeys.forEach((month) => {
        output[month] = Boolean(output[month]);
    });
    return output;
}

async function initDatabase() {
    if (process.env.DATABASE_URL) {
        const { Pool } = require('pg');
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.PG_SSL === 'false' ? false : { rejectUnauthorized: false },
        });
        await pool.query(createTableSql);
        adapter = { type: 'postgres', pool, persistent: true };
        console.log('Banco PostgreSQL conectado (persistente).');
        return adapter;
    }

    const sqlite3 = require('sqlite3').verbose();
    const dataDir = process.env.DATA_DIR || __dirname;
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const dbPath = path.join(dataDir, 'data.sqlite');
    const persistent = Boolean(process.env.DATA_DIR);

    const db = new sqlite3.Database(dbPath);
    await new Promise((resolve, reject) => {
        db.run(createTableSqlite, (err) => (err ? reject(err) : resolve()));
    });

    adapter = { type: 'sqlite', db, dbPath, persistent };
    console.log(`Banco SQLite em ${dbPath}${persistent ? ' (disco persistente)' : ''}.`);
    if (!persistent && process.env.NODE_ENV === 'production') {
        console.warn('AVISO: SQLite sem DATA_DIR/DATABASE_URL — dados podem sumir ao reiniciar no Render.');
    }
    return adapter;
}

function run(sql, params = []) {
    if (adapter.type === 'postgres') {
        let pgSql = toPgParams(sql);
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
        const pgSql = toPgParams(sql);
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

module.exports = {
    monthKeys,
    initDatabase,
    run,
    all,
    getMeta,
    getAdapter,
    formatRow,
};
