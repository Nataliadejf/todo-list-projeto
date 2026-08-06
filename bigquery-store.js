/**
 * Persistência no Google BigQuery (iniciativas + tarefas).
 *
 * BigQuery é um data warehouse, não um banco transacional. Para funcionar como
 * armazenamento CRUD deste portfólio (baixo volume, 1 usuária) seguimos 3 regras:
 *   1. Toda escrita usa DML (INSERT/UPDATE/DELETE) — nunca streaming (tabExpr.insert),
 *      pois o streaming buffer bloqueia update/delete por ~90 min.
 *   2. IDs são gerados no servidor: dbId = MAX(dbId)+1 (todos), id = UUID (tasks).
 *   3. Leituras e escritas são parametrizadas (@param) contra SQL injection.
 *
 * Credenciais: mesma convenção do projeto_comex —
 *   GOOGLE_APPLICATION_CREDENTIALS_JSON = JSON puro OU base64 do service account.
 *   (fallback GOOGLE_APPLICATION_CREDENTIALS = caminho de arquivo / ADC)
 */
const crypto = require('crypto');

const monthKeys = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const textFields = [
    'id', 'area', 'front', 'initiative', 'owner', 'backup', 'efficacyIndicator', 'description', 'deliveries', 'gainCategory', 'gainDescription', 'size',
    'weight', 'status', 'startDate', 'plannedEndDate', 'realEndDate', 'deadlineDays', 'deadlinePercent', 'progressPercent',
    'severity', 'urgency', 'strategy', 'priority', 'impediment', 'notes', 'weightedDelivery',
];
const boolFields = [...monthKeys, 'completed', 'approved', 'deprioritized'];
const todoColumns = ['dbId', ...textFields, ...boolFields];

const taskColumns = ['id', 'initiativeDbId', 'title', 'description', 'owner', 'status', 'priority', 'dueDate', 'startDate', 'endDate', 'done', 'createdAt', 'updatedAt'];

const DATASET = process.env.BQ_DATASET || 'todolist';
const LOCATION = process.env.BQ_LOCATION || 'US';

let client = null;
let projectId = null;

function isEnabled() {
    return Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) || process.env.USE_BIGQUERY === '1';
}

function loadCredentials() {
    const raw = (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || '').trim();
    if (!raw) return null;
    let jsonStr = raw;
    if (!raw.startsWith('{')) {
        jsonStr = Buffer.from(raw, 'base64').toString('utf8');
    }
    return JSON.parse(jsonStr);
}

function getClient() {
    if (client) return client;
    const { BigQuery } = require('@google-cloud/bigquery');
    const creds = loadCredentials();
    const options = {};
    if (creds) {
        options.credentials = creds;
        options.projectId = creds.project_id;
    }
    if (process.env.BQ_PROJECT_ID) options.projectId = process.env.BQ_PROJECT_ID;
    client = new BigQuery(options);
    projectId = options.projectId || null;
    return client;
}

function tableRef(name) {
    if (!client) getClient();
    return projectId ? `\`${projectId}.${DATASET}.${name}\`` : `\`${DATASET}.${name}\``;
}

function col(name) {
    return `\`${name}\``;
}

async function query(sql, params = {}, types = {}) {
    const bq = getClient();
    const [rows] = await bq.query({ query: sql, params, types, location: LOCATION });
    return rows;
}

function toNumber(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'object' && 'value' in value) return Number(value.value);
    return Number(value);
}

function toIso(value) {
    if (!value) return null;
    if (typeof value === 'object' && 'value' in value) return value.value;
    return value;
}

function formatTodo(row) {
    if (!row) return row;
    const output = { ...row };
    output.dbId = toNumber(row.dbId);
    boolFields.forEach((field) => {
        output[field] = Boolean(row[field]);
    });
    textFields.forEach((field) => {
        output[field] = row[field] ?? '';
    });
    return output;
}

function formatTask(row) {
    if (!row) return row;
    return {
        id: row.id,
        initiativeDbId: toNumber(row.initiativeDbId),
        title: row.title ?? '',
        description: row.description ?? '',
        owner: row.owner ?? '',
        status: row.status ?? '',
        priority: row.priority ?? '',
        dueDate: row.dueDate ?? '',
        startDate: row.startDate ?? '',
        endDate: row.endDate ?? '',
        done: Boolean(row.done),
        createdAt: toIso(row.createdAt),
        updatedAt: toIso(row.updatedAt),
    };
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

async function ensureSchema() {
    const bq = getClient();
    const dataset = bq.dataset(DATASET, { location: LOCATION });
    const [datasetExists] = await dataset.exists();
    if (!datasetExists) {
        await dataset.create({ location: LOCATION });
        console.log(`Dataset BigQuery criado: ${DATASET} (${LOCATION}).`);
    }

    const todosSchema = [
        { name: 'dbId', type: 'INT64' },
        ...textFields.map((name) => ({ name, type: 'STRING' })),
        ...boolFields.map((name) => ({ name, type: 'BOOL' })),
    ];
    const tasksSchema = [
        { name: 'id', type: 'STRING' },
        { name: 'initiativeDbId', type: 'INT64' },
        { name: 'title', type: 'STRING' },
        { name: 'description', type: 'STRING' },
        { name: 'owner', type: 'STRING' },
        { name: 'status', type: 'STRING' },
        { name: 'priority', type: 'STRING' },
        { name: 'dueDate', type: 'STRING' },
        { name: 'startDate', type: 'STRING' },
        { name: 'endDate', type: 'STRING' },
        { name: 'done', type: 'BOOL' },
        { name: 'createdAt', type: 'TIMESTAMP' },
        { name: 'updatedAt', type: 'TIMESTAMP' },
    ];

    const usersSchema = [
        { name: 'id', type: 'STRING' },
        { name: 'email', type: 'STRING' },
        { name: 'name', type: 'STRING' },
        { name: 'passwordHash', type: 'STRING' },
        { name: 'role', type: 'STRING' },
        { name: 'status', type: 'STRING' },
        { name: 'createdAt', type: 'TIMESTAMP' },
        { name: 'approvedAt', type: 'TIMESTAMP' },
        { name: 'approvedBy', type: 'STRING' },
    ];
    const sessionsSchema = [
        { name: 'id', type: 'STRING' },
        { name: 'email', type: 'STRING' },
        { name: 'loginAt', type: 'TIMESTAMP' },
        { name: 'lastSeenAt', type: 'TIMESTAMP' },
    ];

    const responsaveisSchema = [
        { name: 'id', type: 'STRING' },
        { name: 'name', type: 'STRING' },
        { name: 'active', type: 'BOOL' },
    ];

    await ensureTable(dataset, 'todos', todosSchema);
    await ensureTable(dataset, 'tasks', tasksSchema);
    await ensureTable(dataset, 'users', usersSchema);
    await ensureTable(dataset, 'sessions', sessionsSchema);
    await ensureTable(dataset, 'responsaveis', responsaveisSchema);
    // adiciona colunas novas em tabelas já existentes
    await query(`ALTER TABLE ${tableRef('tasks')} ADD COLUMN IF NOT EXISTS startDate STRING`).catch(() => {});
    await query(`ALTER TABLE ${tableRef('tasks')} ADD COLUMN IF NOT EXISTS endDate STRING`).catch(() => {});
    await query(`ALTER TABLE ${tableRef('todos')} ADD COLUMN IF NOT EXISTS backup STRING`).catch(() => {});
    await query(`ALTER TABLE ${tableRef('todos')} ADD COLUMN IF NOT EXISTS efficacyIndicator STRING`).catch(() => {});
}

async function ensureTable(dataset, name, schema) {
    const table = dataset.table(name);
    const [exists] = await table.exists();
    if (!exists) {
        await table.create({ schema, location: LOCATION });
        console.log(`Tabela BigQuery criada: ${DATASET}.${name}.`);
    }
}

// ---------------------------------------------------------------------------
// Meta / Todos
// ---------------------------------------------------------------------------

async function getMeta() {
    const rows = await query(`SELECT COUNT(*) AS total FROM ${tableRef('todos')}`);
    return {
        type: 'bigquery',
        persistent: true,
        dataset: DATASET,
        total: toNumber(rows[0]?.total) || 0,
    };
}

async function listTodos() {
    const rows = await query(`SELECT * FROM ${tableRef('todos')} ORDER BY dbId DESC`);
    return rows.map(formatTodo);
}

async function getTodo(dbId) {
    const rows = await query(
        `SELECT * FROM ${tableRef('todos')} WHERE dbId = @dbId`,
        { dbId: Number(dbId) },
        { dbId: 'INT64' },
    );
    return rows[0] ? formatTodo(rows[0]) : null;
}

function buildTodoParams(item, dbId) {
    const params = { dbId: Number(dbId) };
    const types = { dbId: 'INT64' };
    textFields.forEach((field) => {
        params[field] = item[field] ?? '';
        types[field] = 'STRING';
    });
    boolFields.forEach((field) => {
        params[field] = Boolean(item[field]);
        types[field] = 'BOOL';
    });
    return { params, types };
}

async function nextTodoId() {
    const rows = await query(`SELECT IFNULL(MAX(dbId), 0) + 1 AS nextId FROM ${tableRef('todos')}`);
    return toNumber(rows[0]?.nextId) || 1;
}

async function insertTodo(item, forcedDbId) {
    const dbId = forcedDbId != null ? Number(forcedDbId) : await nextTodoId();
    const { params, types } = buildTodoParams(item, dbId);
    const columnsSql = todoColumns.map(col).join(', ');
    const valuesSql = todoColumns.map((name) => `@${name}`).join(', ');
    await query(
        `INSERT INTO ${tableRef('todos')} (${columnsSql}) VALUES (${valuesSql})`,
        params,
        types,
    );
    return getTodo(dbId);
}

async function insertTodosBulk(items) {
    if (!items || items.length === 0) return 0;
    const startId = await nextTodoId();
    const chunkSize = 50;
    const columnsSql = todoColumns.map(col).join(', ');
    let inserted = 0;

    for (let offset = 0; offset < items.length; offset += chunkSize) {
        const chunk = items.slice(offset, offset + chunkSize);
        const params = {};
        const types = {};
        const valuesRows = chunk.map((item, j) => {
            const idx = offset + j;
            const placeholders = todoColumns.map((name) => {
                const pname = `${name}_${idx}`;
                if (name === 'dbId') {
                    params[pname] = startId + idx;
                    types[pname] = 'INT64';
                } else if (textFields.includes(name)) {
                    params[pname] = item[name] ?? '';
                    types[pname] = 'STRING';
                } else {
                    params[pname] = Boolean(item[name]);
                    types[pname] = 'BOOL';
                }
                return `@${pname}`;
            });
            return `(${placeholders.join(', ')})`;
        });
        await query(
            `INSERT INTO ${tableRef('todos')} (${columnsSql}) VALUES ${valuesRows.join(', ')}`,
            params,
            types,
        );
        inserted += chunk.length;
    }
    return inserted;
}

async function updateTodo(dbId, item) {
    const { params, types } = buildTodoParams(item, dbId);
    const assignments = [...textFields, ...boolFields].map((name) => `${col(name)} = @${name}`).join(', ');
    await query(
        `UPDATE ${tableRef('todos')} SET ${assignments} WHERE dbId = @dbId`,
        params,
        types,
    );
    return getTodo(dbId);
}

async function deleteTodo(dbId) {
    await query(
        `DELETE FROM ${tableRef('todos')} WHERE dbId = @dbId`,
        { dbId: Number(dbId) },
        { dbId: 'INT64' },
    );
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

async function listTasks(initiativeDbId) {
    if (initiativeDbId != null && initiativeDbId !== '') {
        const rows = await query(
            `SELECT * FROM ${tableRef('tasks')} WHERE initiativeDbId = @initiativeDbId ORDER BY createdAt DESC`,
            { initiativeDbId: Number(initiativeDbId) },
            { initiativeDbId: 'INT64' },
        );
        return rows.map(formatTask);
    }
    const rows = await query(`SELECT * FROM ${tableRef('tasks')} ORDER BY createdAt DESC`);
    return rows.map(formatTask);
}

async function getTask(id) {
    const rows = await query(
        `SELECT * FROM ${tableRef('tasks')} WHERE id = @id`,
        { id: String(id) },
        { id: 'STRING' },
    );
    return rows[0] ? formatTask(rows[0]) : null;
}

async function insertTask(task) {
    const id = task.id || crypto.randomUUID();
    const now = new Date();
    const params = {
        id,
        initiativeDbId: task.initiativeDbId != null ? Number(task.initiativeDbId) : null,
        title: task.title ?? '',
        description: task.description ?? '',
        owner: task.owner ?? '',
        status: task.status ?? '',
        priority: task.priority ?? '',
        dueDate: task.dueDate ?? '',
        startDate: task.startDate ?? '',
        endDate: task.endDate ?? '',
        done: Boolean(task.done),
        createdAt: now,
        updatedAt: now,
    };
    const types = {
        id: 'STRING', initiativeDbId: 'INT64', title: 'STRING', description: 'STRING', owner: 'STRING',
        status: 'STRING', priority: 'STRING', dueDate: 'STRING', startDate: 'STRING', endDate: 'STRING',
        done: 'BOOL', createdAt: 'TIMESTAMP', updatedAt: 'TIMESTAMP',
    };
    const columnsSql = taskColumns.map(col).join(', ');
    const valuesSql = taskColumns.map((name) => `@${name}`).join(', ');
    await query(
        `INSERT INTO ${tableRef('tasks')} (${columnsSql}) VALUES (${valuesSql})`,
        params,
        types,
    );
    return getTask(id);
}

async function updateTask(id, task) {
    const params = {
        id: String(id),
        initiativeDbId: task.initiativeDbId != null ? Number(task.initiativeDbId) : null,
        title: task.title ?? '',
        description: task.description ?? '',
        owner: task.owner ?? '',
        status: task.status ?? '',
        priority: task.priority ?? '',
        dueDate: task.dueDate ?? '',
        startDate: task.startDate ?? '',
        endDate: task.endDate ?? '',
        done: Boolean(task.done),
        updatedAt: new Date(),
    };
    const types = {
        id: 'STRING', initiativeDbId: 'INT64', title: 'STRING', description: 'STRING', owner: 'STRING',
        status: 'STRING', priority: 'STRING', dueDate: 'STRING', startDate: 'STRING', endDate: 'STRING',
        done: 'BOOL', updatedAt: 'TIMESTAMP',
    };
    await query(
        `UPDATE ${tableRef('tasks')} SET
            initiativeDbId = @initiativeDbId, title = @title, description = @description, owner = @owner,
            status = @status, priority = @priority, dueDate = @dueDate, startDate = @startDate, endDate = @endDate,
            done = @done, updatedAt = @updatedAt
         WHERE id = @id`,
        params,
        types,
    );
    return getTask(id);
}

async function deleteTask(id) {
    await query(
        `DELETE FROM ${tableRef('tasks')} WHERE id = @id`,
        { id: String(id) },
        { id: 'STRING' },
    );
}

// ---------------------------------------------------------------------------
// Usuários e sessões (autenticação)
// ---------------------------------------------------------------------------

function formatUser(row) {
    if (!row) return null;
    return {
        id: row.id, email: row.email, name: row.name ?? '', passwordHash: row.passwordHash ?? '',
        role: row.role ?? 'user', status: row.status ?? 'pending',
        createdAt: toIso(row.createdAt), approvedAt: toIso(row.approvedAt), approvedBy: row.approvedBy ?? '',
    };
}

async function getUserByEmail(email) {
    const rows = await query(
        `SELECT * FROM ${tableRef('users')} WHERE LOWER(email) = LOWER(@email) LIMIT 1`,
        { email: String(email) }, { email: 'STRING' },
    );
    return formatUser(rows[0]);
}

async function getUserById(id) {
    const rows = await query(`SELECT * FROM ${tableRef('users')} WHERE id = @id LIMIT 1`,
        { id: String(id) }, { id: 'STRING' });
    return formatUser(rows[0]);
}

async function createUser(u) {
    const params = {
        id: u.id, email: u.email, name: u.name ?? '', passwordHash: u.passwordHash,
        role: u.role ?? 'user', status: u.status ?? 'pending',
        createdAt: new Date(), approvedAt: u.approvedAt ?? null, approvedBy: u.approvedBy ?? '',
    };
    const types = {
        id: 'STRING', email: 'STRING', name: 'STRING', passwordHash: 'STRING', role: 'STRING',
        status: 'STRING', createdAt: 'TIMESTAMP', approvedAt: 'TIMESTAMP', approvedBy: 'STRING',
    };
    await query(
        `INSERT INTO ${tableRef('users')} (id,email,name,passwordHash,role,status,createdAt,approvedAt,approvedBy)
         VALUES (@id,@email,@name,@passwordHash,@role,@status,@createdAt,@approvedAt,@approvedBy)`,
        params, types,
    );
    return getUserById(u.id);
}

async function setUserStatus(id, status, approvedBy) {
    await query(
        `UPDATE ${tableRef('users')} SET status=@status, approvedAt=@approvedAt, approvedBy=@approvedBy WHERE id=@id`,
        { id: String(id), status, approvedAt: status === 'approved' ? new Date() : null, approvedBy: approvedBy || '' },
        { id: 'STRING', status: 'STRING', approvedAt: 'TIMESTAMP', approvedBy: 'STRING' },
    );
    return getUserById(id);
}

async function updateUserPasswordHash(id, passwordHash) {
    await query(`UPDATE ${tableRef('users')} SET passwordHash=@h WHERE id=@id`,
        { id: String(id), h: passwordHash }, { id: 'STRING', h: 'STRING' });
}

async function listUsers() {
    const rows = await query(`SELECT * FROM ${tableRef('users')} ORDER BY createdAt DESC`);
    return rows.map(formatUser);
}

async function startSession(id, email) {
    await query(
        `INSERT INTO ${tableRef('sessions')} (id,email,loginAt,lastSeenAt) VALUES (@id,@email,@t,@t)`,
        { id: String(id), email: String(email), t: new Date() },
        { id: 'STRING', email: 'STRING', t: 'TIMESTAMP' },
    );
}

async function touchSession(id) {
    await query(`UPDATE ${tableRef('sessions')} SET lastSeenAt=@t WHERE id=@id`,
        { id: String(id), t: new Date() }, { id: 'STRING', t: 'TIMESTAMP' });
}

async function getAccessStats() {
    const rows = await query(
        `SELECT email,
                COUNT(*) AS sessions,
                SUM(TIMESTAMP_DIFF(lastSeenAt, loginAt, SECOND)) AS totalSeconds,
                MAX(loginAt) AS lastLogin
         FROM ${tableRef('sessions')} GROUP BY email`,
    );
    return rows.map((r) => ({
        email: r.email, sessions: toNumber(r.sessions) || 0,
        totalSeconds: toNumber(r.totalSeconds) || 0, lastLogin: toIso(r.lastLogin),
    }));
}

// ---------------------------------------------------------------------------
// Responsáveis (lista gerenciável, ativo/inativo)
// ---------------------------------------------------------------------------

async function listResponsaveis(activeOnly) {
    const where = activeOnly ? 'WHERE active = true' : '';
    const rows = await query(`SELECT id, name, active FROM ${tableRef('responsaveis')} ${where} ORDER BY name`);
    return rows.map((r) => ({ id: r.id, name: r.name, active: Boolean(r.active) }));
}

async function addResponsavel(name) {
    const id = crypto.randomUUID();
    await query(
        `INSERT INTO ${tableRef('responsaveis')} (id, name, active) VALUES (@id, @name, true)`,
        { id, name: String(name) }, { id: 'STRING', name: 'STRING' },
    );
    return { id, name: String(name), active: true };
}

async function setResponsavelActive(id, active) {
    await query(
        `UPDATE ${tableRef('responsaveis')} SET active = @active WHERE id = @id`,
        { id: String(id), active: Boolean(active) }, { id: 'STRING', active: 'BOOL' },
    );
}

async function seedResponsaveisIfEmpty(names) {
    const rows = await query(`SELECT COUNT(*) AS total FROM ${tableRef('responsaveis')}`);
    if ((toNumber(rows[0]?.total) || 0) > 0) return;
    const params = {};
    const types = {};
    const values = names.map((name, i) => {
        params[`id${i}`] = crypto.randomUUID();
        params[`name${i}`] = name;
        types[`id${i}`] = 'STRING';
        types[`name${i}`] = 'STRING';
        return `(@id${i}, @name${i}, true)`;
    });
    await query(
        `INSERT INTO ${tableRef('responsaveis')} (id, name, active) VALUES ${values.join(', ')}`,
        params, types,
    );
    console.log(`Responsáveis semeados: ${names.length}.`);
}

module.exports = {
    isEnabled,
    monthKeys,
    ensureSchema,
    listResponsaveis,
    addResponsavel,
    setResponsavelActive,
    seedResponsaveisIfEmpty,
    getUserByEmail,
    getUserById,
    createUser,
    setUserStatus,
    updateUserPasswordHash,
    listUsers,
    startSession,
    touchSession,
    getAccessStats,
    getMeta,
    listTodos,
    getTodo,
    insertTodo,
    insertTodosBulk,
    updateTodo,
    deleteTodo,
    listTasks,
    getTask,
    insertTask,
    updateTask,
    deleteTask,
    // exposto para o script de migração
    _internal: { getClient, tableRef, DATASET, LOCATION, todoColumns },
};
