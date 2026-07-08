#!/usr/bin/env node
/**
 * Migra as iniciativas existentes para o BigQuery.
 *
 * Origem:
 *   - DATABASE_URL definido  -> lê do PostgreSQL (ex.: banco do Render).
 *   - senão                  -> lê do SQLite local (data.sqlite).
 *   - flag --from-seed       -> ignora o banco e usa seed-data.json.
 *
 * Destino: BigQuery (usa GOOGLE_APPLICATION_CREDENTIALS_JSON + BQ_DATASET).
 *
 * Flags:
 *   --reset       trunca a tabela todos no BigQuery antes de inserir.
 *   --from-seed   carrega a partir de seed-data.json.
 *
 * Exemplos:
 *   DATABASE_URL="postgres://..." GOOGLE_APPLICATION_CREDENTIALS_JSON="$(cat sa.json)" \
 *     node scripts/migrate-to-bigquery.js --reset
 *   GOOGLE_APPLICATION_CREDENTIALS_JSON=... node scripts/migrate-to-bigquery.js --from-seed
 */
const fs = require('fs');
const path = require('path');
const bq = require('../bigquery-store');

const args = process.argv.slice(2);
const RESET = args.includes('--reset');
const FROM_SEED = args.includes('--from-seed');

const monthKeys = bq.monthKeys;
const textFields = [
    'id', 'area', 'front', 'initiative', 'owner', 'description', 'deliveries', 'gainCategory', 'gainDescription', 'size',
    'weight', 'status', 'startDate', 'plannedEndDate', 'realEndDate', 'deadlineDays', 'deadlinePercent', 'progressPercent',
    'severity', 'urgency', 'strategy', 'priority', 'impediment', 'notes', 'weightedDelivery',
];

function normalizeSeedItem(raw) {
    const item = {};
    textFields.forEach((field) => { item[field] = raw[field] ?? ''; });
    monthKeys.forEach((month) => { item[month] = Boolean(raw[month]); });
    item.completed = Boolean(raw.completed);
    item.approved = raw.approved === undefined ? true : Boolean(raw.approved);
    item.deprioritized = Boolean(raw.deprioritized);
    return item;
}

async function loadFromSeed() {
    const seedPath = path.join(__dirname, '..', 'seed-data.json');
    const rows = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    console.log(`Origem: seed-data.json (${rows.length} registros).`);
    return rows.map((raw) => ({ item: normalizeSeedItem(raw), dbId: null }));
}

async function loadFromDatabase() {
    const db = require('../database');
    await db.initDatabase();
    const type = db.getAdapter().type;
    const rows = await db.listTodos();
    console.log(`Origem: ${type} (${rows.length} registros).`);
    return rows.map((row) => {
        const { dbId, ...rest } = row;
        return { item: rest, dbId };
    });
}

async function main() {
    if (!bq.isEnabled()) {
        console.error('ERRO: BigQuery não configurado. Defina GOOGLE_APPLICATION_CREDENTIALS_JSON (ou USE_BIGQUERY=1).');
        process.exit(1);
    }

    await bq.ensureSchema();

    if (RESET) {
        const client = bq._internal.getClient();
        const ref = bq._internal.tableRef('todos');
        console.log(`Truncando ${ref}...`);
        await client.query({ query: `TRUNCATE TABLE ${ref}`, location: bq._internal.LOCATION });
    }

    const source = FROM_SEED ? await loadFromSeed() : await loadFromDatabase();
    if (source.length === 0) {
        console.log('Nada a migrar.');
        return;
    }

    let ok = 0;
    for (const { item, dbId } of source) {
        try {
            await bq.insertTodo(item, dbId);
            ok += 1;
            if (ok % 25 === 0) console.log(`  ${ok}/${source.length} inseridos...`);
        } catch (err) {
            console.error(`  Falha ao inserir dbId=${dbId}: ${err.message}`);
        }
    }

    const meta = await bq.getMeta();
    console.log(`Migração concluída: ${ok}/${source.length} inseridos. Total no BigQuery: ${meta.total}.`);
}

main().catch((err) => {
    console.error('Falha na migração:', err);
    process.exit(1);
});
