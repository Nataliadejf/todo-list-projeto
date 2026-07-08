/**
 * Camada de repositório: expõe operações de alto nível (todos + tasks) e
 * despacha para o backend ativo.
 *   - BigQuery  -> quando GOOGLE_APPLICATION_CREDENTIALS_JSON/USE_BIGQUERY presentes (produção).
 *   - SQLite/PG -> fallback local zero-config (dev), via database.js.
 */
const bq = require('./bigquery-store');
const db = require('./database');

let backend = null;

async function initStore() {
    if (bq.isEnabled()) {
        await bq.ensureSchema();
        backend = bq;
        console.log(`Persistência: BigQuery (dataset ${process.env.BQ_DATASET || 'todolist'}).`);
    } else {
        await db.initDatabase();
        backend = db;
        console.log(`Persistência: ${db.getAdapter().type}.`);
    }
    return backend;
}

function isBigQuery() {
    return backend === bq;
}

function getBackendType() {
    if (isBigQuery()) return 'bigquery';
    return db.getAdapter()?.type || 'sqlite';
}

/** Booleans reais (true/false) para PG e BigQuery; 0/1 para SQLite. */
function wantsBooleans() {
    const type = getBackendType();
    return type === 'postgres' || type === 'bigquery';
}

module.exports = {
    initStore,
    isBigQuery,
    getBackendType,
    wantsBooleans,
    monthKeys: db.monthKeys,
    getMeta: (...args) => backend.getMeta(...args),
    listTodos: (...args) => backend.listTodos(...args),
    getTodo: (...args) => backend.getTodo(...args),
    insertTodo: (...args) => backend.insertTodo(...args),
    updateTodo: (...args) => backend.updateTodo(...args),
    deleteTodo: (...args) => backend.deleteTodo(...args),
    listTasks: (...args) => backend.listTasks(...args),
    getTask: (...args) => backend.getTask(...args),
    insertTask: (...args) => backend.insertTask(...args),
    updateTask: (...args) => backend.updateTask(...args),
    deleteTask: (...args) => backend.deleteTask(...args),
};
