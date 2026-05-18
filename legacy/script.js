const form = document.getElementById('todo-form');
const list = document.getElementById('todo-list');
const modal = document.getElementById('modal');
const closeModalBtn = document.getElementById('close-modal');
const modalTitle = document.getElementById('modal-title');
const modalFields = document.getElementById('modal-fields');
const totalCount = document.getElementById('total-count');
const notStartedCount = document.getElementById('not-started-count');
const inProgressCount = document.getElementById('in-progress-count');
const completedCount = document.getElementById('completed-count');
const filterIdInput = document.getElementById('filter-id');
const filterOwnerInput = document.getElementById('filter-owner');
const filterAreaInput = document.getElementById('filter-area');
const filterStatusInput = document.getElementById('filter-status');
const filterWeightInput = document.getElementById('filter-weight');
const filterPeriodStartInput = document.getElementById('filter-period-start');
const filterPeriodEndInput = document.getElementById('filter-period-end');
const clearFiltersBtn = document.getElementById('clear-filters-btn');
const downloadSpreadsheetBtn = document.getElementById('download-spreadsheet-btn');

const monthKeys = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const monthExportLabels = {
    jan: 'Mês Jan',
    fev: 'Mês Fev',
    mar: 'Mês Mar',
    abr: 'Mês Abr',
    mai: 'Mês Mai',
    jun: 'Mês Jun',
    jul: 'Mês Jul',
    ago: 'Mês Ago',
    set: 'Mês Set',
    out: 'Mês Out',
    nov: 'Mês Nov',
    dez: 'Mês Dez'
};
const labelMap = {
    id: 'ID',
    area: 'Área',
    front: 'Frente',
    initiative: 'Iniciativa',
    owner: 'Responsável',
    description: 'Descrição (Breve Descritivo)',
    deliveries: 'Entregas',
    gainCategory: 'Categoria Ganho',
    gainDescription: 'Descritivo dos Ganhos da iniciativa',
    size: 'Tam',
    weight: 'Peso',
    status: 'Status',
    startDate: 'Data Início',
    plannedEndDate: 'Data Previsão de Fim',
    realEndDate: 'Data Fim Real',
    deadlineDays: 'Prazo Dias',
    deadlinePercent: '% Prazo',
    progressPercent: '% Conclusão',
    severity: 'Gravidade',
    urgency: 'Urgência',
    strategy: 'Estratégia',
    priority: 'Prioridade',
    impediment: 'Impedimento',
    notes: 'Observação',
    weightedDelivery: 'Entrega Ponderada2'
};
const editableKeys = [
    'id', 'area', 'front', 'initiative', 'owner', 'description', 'deliveries', 'gainCategory', 'gainDescription', 'size',
    'weight', 'status', 'startDate', 'plannedEndDate', 'realEndDate', 'deadlineDays', 'deadlinePercent', 'progressPercent',
    'severity', 'urgency', 'strategy', 'priority', 'impediment', 'notes', 'weightedDelivery'
];

let todos = [];
let editingId = null;
const filters = {
    id: '',
    owner: '',
    area: '',
    status: '',
    weight: '',
    periodStart: '',
    periodEnd: ''
};

function normalizeStatus(status) {
    const raw = String(status || '').trim().toLowerCase();
    if (raw === 'concluido' || raw === 'concluído') return 'Concluído';
    if (raw === 'em andamento') return 'Em andamento';
    if (raw === 'a fazer' || raw === 'não iniciado' || raw === 'nao iniciado') return 'A fazer';
    return status || 'A fazer';
}

function normalizeTodo(todo) {
    const normalized = { ...todo };
    if (!normalized.initiative && normalized.text) normalized.initiative = normalized.text;
    if (!normalized.description && normalized.desc) normalized.description = normalized.desc;
    normalized.id = normalized.id || `ID-${Date.now()}`;
    normalized.status = normalizeStatus(normalized.status);
    normalized.completed = Boolean(normalized.completed);
    monthKeys.forEach((month) => {
        normalized[month] = Boolean(normalized[month]);
    });
    return normalized;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getMonthsText(todo) {
    const enabled = monthKeys.filter((month) => todo[month]).map((month) => month.toUpperCase());
    return enabled.length ? enabled.join(', ') : 'Nenhum';
}

const spreadsheetExportKeys = [...editableKeys, ...monthKeys, 'completed'];

function escapeCsvCell(value) {
    const s = String(value ?? '');
    if (/[;\r\n"]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

function headerLabelForSpreadsheet(key) {
    if (labelMap[key]) return labelMap[key];
    if (monthExportLabels[key]) return monthExportLabels[key];
    if (key === 'completed') return 'Marcado concluído';
    return key;
}

function spreadsheetCellValue(todo, key) {
    if (monthKeys.includes(key)) return todo[key] ? 'Sim' : 'Não';
    if (key === 'completed') return todo.completed ? 'Sim' : 'Não';
    return todo[key] ?? '';
}

function downloadAllInitiativesSpreadsheet() {
    const headerLine = spreadsheetExportKeys.map((key) => escapeCsvCell(headerLabelForSpreadsheet(key))).join(';');
    const dataLines = todos.map((todo) =>
        spreadsheetExportKeys.map((key) => escapeCsvCell(spreadsheetCellValue(todo, key))).join(';')
    );
    const csv = `\uFEFF${[headerLine, ...dataLines].join('\r\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    a.download = `iniciativas-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function statusGroup(status) {
    const normalized = normalizeStatus(status);
    if (normalized === 'Concluído') return 'done';
    if (normalized === 'Em andamento') return 'progress';
    return 'notStarted';
}

function renderDashboard(sourceTodos = todos) {
    const counts = { total: sourceTodos.length, notStarted: 0, progress: 0, done: 0 };
    sourceTodos.forEach((todo) => {
        const group = statusGroup(todo.status);
        counts[group] += 1;
    });
    totalCount.textContent = String(counts.total);
    notStartedCount.textContent = String(counts.notStarted);
    inProgressCount.textContent = String(counts.progress);
    completedCount.textContent = String(counts.done);
}

function normalizeText(value) {
    return String(value ?? '').trim().toLowerCase();
}

function parseDateString(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function getFilteredTodos() {
    return todos.filter((todo) => {
        if (filters.id && !normalizeText(todo.id).includes(normalizeText(filters.id))) return false;
        if (filters.owner && normalizeText(todo.owner) !== normalizeText(filters.owner)) return false;
        if (filters.area && normalizeText(todo.area) !== normalizeText(filters.area)) return false;
        if (filters.status && normalizeText(todo.status) !== normalizeText(filters.status)) return false;
        if (filters.weight && !normalizeText(todo.weight).includes(normalizeText(filters.weight))) return false;

        const rangeStart = parseDateString(filters.periodStart);
        const rangeEnd = parseDateString(filters.periodEnd);
        if (rangeStart || rangeEnd) {
            const todoStart = parseDateString(todo.startDate);
            const todoEnd = parseDateString(todo.plannedEndDate) || todoStart;
            if (!todoStart && !todoEnd) return false;
            if (rangeStart && todoEnd && todoEnd < rangeStart) return false;
            if (rangeEnd && todoStart && todoStart > rangeEnd) return false;
        }
        return true;
    });
}

function fillSelectOptions(selectElement, values, allLabel) {
    const currentValue = selectElement.value;
    selectElement.innerHTML = `<option value="">${allLabel}</option>`;
    values.forEach((value) => {
        if (!value) return;
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        selectElement.appendChild(option);
    });
    if ([...selectElement.options].some((option) => option.value === currentValue)) {
        selectElement.value = currentValue;
    }
}

function updateFilterOptions() {
    const owners = [...new Set(todos.map((todo) => todo.owner).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const areas = [...new Set(todos.map((todo) => todo.area).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    fillSelectOptions(filterOwnerInput, owners, 'Responsável (todos)');
    fillSelectOptions(filterAreaInput, areas, 'Área (todas)');
}

function renderTodos() {
    list.innerHTML = '';
    const filteredTodos = getFilteredTodos();
    filteredTodos.forEach((todo) => {
        const li = document.createElement('li');
        li.className = todo.completed ? 'completed' : '';
        const isEditing = editingId === todo.dbId;
        if (isEditing) {
            const monthCheckboxes = monthKeys.map((month) => `
                <label><input type="checkbox" id="edit-${month}-${todo.dbId}" ${todo[month] ? 'checked' : ''}/> ${month.toUpperCase()}</label>
            `).join('');
            const fields = editableKeys.map((key) => {
                const value = escapeHtml(todo[key] || '');
                if (key === 'description' || key === 'deliveries' || key === 'gainDescription' || key === 'impediment' || key === 'notes') {
                    return `<label>${labelMap[key]}<textarea id="edit-${key}-${todo.dbId}" rows="2">${value}</textarea></label>`;
                }
                if (key.toLowerCase().includes('date')) {
                    return `<label>${labelMap[key]}<input type="date" id="edit-${key}-${todo.dbId}" value="${value}" /></label>`;
                }
                if (key === 'status') {
                    return `<label>${labelMap[key]}<select id="edit-status-${todo.dbId}">
                        <option value="A fazer" ${todo.status === 'A fazer' ? 'selected' : ''}>A fazer</option>
                        <option value="Em andamento" ${todo.status === 'Em andamento' ? 'selected' : ''}>Em andamento</option>
                        <option value="Concluído" ${todo.status === 'Concluído' ? 'selected' : ''}>Concluído</option>
                    </select></label>`;
                }
                if (key === 'size') {
                    return `<label>${labelMap[key]}<select id="edit-size-${todo.dbId}">
                        <option value="" ${!todo.size ? 'selected' : ''}>-</option>
                        <option value="P" ${todo.size === 'P' ? 'selected' : ''}>P</option>
                        <option value="M" ${todo.size === 'M' ? 'selected' : ''}>M</option>
                        <option value="G" ${todo.size === 'G' ? 'selected' : ''}>G</option>
                    </select></label>`;
                }
                return `<label>${labelMap[key]}<input type="text" id="edit-${key}-${todo.dbId}" value="${value}" /></label>`;
            }).join('');
            li.innerHTML = `<form class="edit-form" onsubmit="return saveEdit(${todo.dbId})">${fields}<div class="month-grid-inline">${monthCheckboxes}</div><div class="todo-actions"><button type="submit" title="Salvar">💾</button><button type="button" title="Cancelar" onclick="cancelEdit()">✖️</button></div></form>`;
        } else {
            li.innerHTML = `
                <span onclick="startEdit(${todo.dbId})" title="Clique para editar">${escapeHtml(todo.id)} - ${escapeHtml(todo.initiative)}</span>
                <div class="todo-actions">
                    <button title="Visualizar" onclick="showModal(${todo.dbId})">🔍</button>
                    <button title="Editar" onclick="startEdit(${todo.dbId})">✏️</button>
                    <button title="Concluir" onclick="toggleTodo(${todo.dbId})">✔️</button>
                    <button title="Remover" onclick="removeTodo(${todo.dbId})">🗑️</button>
                </div>
                <div class="todo-meta">
                    <span><strong>Status:</strong> ${escapeHtml(todo.status || '-')}</span> |
                    <span><strong>Responsável:</strong> ${escapeHtml(todo.owner || '-')}</span> |
                    <span><strong>Prioridade:</strong> ${escapeHtml(todo.priority || '-')}</span>
                </div>
            `;
        }
        list.appendChild(li);
    });
    renderDashboard(filteredTodos);
}

function readFormTodo() {
    const todo = {};
    Object.keys(labelMap).forEach((key) => {
        const input = document.getElementById(`todo-${key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}`);
        todo[key] = input ? input.value.trim() : '';
    });
    monthKeys.forEach((month) => {
        const input = document.getElementById(`todo-${month}`);
        todo[month] = input ? input.checked : false;
    });
    todo.completed = false;
    return normalizeTodo(todo);
}

function clearForm() {
    form.reset();
}

async function apiRequest(url, method = 'GET', payload) {
    const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: payload ? JSON.stringify(payload) : undefined
    });
    if (!response.ok) throw new Error(`Erro na API (${response.status})`);
    return response.status === 204 ? null : response.json();
}

async function loadTodos() {
    todos = (await apiRequest('/api/todos')).map(normalizeTodo);
    await migrateLocalDataIfNeeded();
    updateFilterOptions();
    renderTodos();
}

async function migrateLocalDataIfNeeded() {
    if (todos.length > 0) return;
    const localTodos = JSON.parse(localStorage.getItem('todos') || '[]');
    if (!Array.isArray(localTodos) || localTodos.length === 0) return;
    for (const localTodo of localTodos) {
        const normalized = normalizeTodo(localTodo);
        await apiRequest('/api/todos', 'POST', normalized);
    }
    localStorage.removeItem('todos');
    todos = (await apiRequest('/api/todos')).map(normalizeTodo);
}

function findTodoByDbId(dbId) {
    return todos.find((item) => item.dbId === dbId);
}

async function removeTodo(dbId) {
    if (editingId === dbId) editingId = null;
    await apiRequest(`/api/todos/${dbId}`, 'DELETE');
    todos = todos.filter((todo) => todo.dbId !== dbId);
    updateFilterOptions();
    renderTodos();
}

async function toggleTodo(dbId) {
    const todo = findTodoByDbId(dbId);
    if (!todo) return;
    todo.completed = !todo.completed;
    if (todo.completed) todo.status = 'Concluído';
    await apiRequest(`/api/todos/${dbId}`, 'PUT', todo);
    renderTodos();
}

function startEdit(dbId) {
    editingId = dbId;
    renderTodos();
}

async function saveEdit(dbId) {
    const todo = findTodoByDbId(dbId);
    if (!todo) return false;

    editableKeys.forEach((key) => {
        const element = document.getElementById(`edit-${key}-${dbId}`);
        if (element) todo[key] = element.value.trim();
    });
    monthKeys.forEach((month) => {
        const element = document.getElementById(`edit-${month}-${dbId}`);
        todo[month] = element ? element.checked : false;
    });

    Object.assign(todo, normalizeTodo(todo));
    await apiRequest(`/api/todos/${dbId}`, 'PUT', todo);
    editingId = null;
    updateFilterOptions();
    renderTodos();
    return false;
}

function cancelEdit() {
    editingId = null;
    renderTodos();
}

function showModal(dbId) {
    const todo = findTodoByDbId(dbId);
    if (!todo) return;
    modalTitle.textContent = `${todo.id} - ${todo.initiative}`;
    const rows = Object.keys(labelMap).map((key) => `<p><strong>${labelMap[key]}:</strong> ${escapeHtml(todo[key] || '-')}</p>`);
    rows.push(`<p><strong>Meses planejados:</strong> ${escapeHtml(getMonthsText(todo))}</p>`);
    modalFields.innerHTML = rows.join('');
    modal.style.display = 'flex';
}

form.onsubmit = async function (e) {
    e.preventDefault();
    const todo = readFormTodo();
    if (!todo.id || !todo.area || !todo.front || !todo.initiative || !todo.owner) return;
    const created = normalizeTodo(await apiRequest('/api/todos', 'POST', todo));
    todos.push(created);
    updateFilterOptions();
    renderTodos();
    clearForm();
};

closeModalBtn.onclick = function () {
    modal.style.display = 'none';
};

window.onclick = function (event) {
    if (event.target === modal) modal.style.display = 'none';
};

window.showModal = showModal;
window.removeTodo = removeTodo;
window.toggleTodo = toggleTodo;
window.startEdit = startEdit;
window.saveEdit = saveEdit;
window.cancelEdit = cancelEdit;

filterIdInput.addEventListener('input', () => {
    filters.id = filterIdInput.value;
    renderTodos();
});
filterOwnerInput.addEventListener('change', () => {
    filters.owner = filterOwnerInput.value;
    renderTodos();
});
filterAreaInput.addEventListener('change', () => {
    filters.area = filterAreaInput.value;
    renderTodos();
});
filterStatusInput.addEventListener('change', () => {
    filters.status = filterStatusInput.value;
    renderTodos();
});
filterWeightInput.addEventListener('input', () => {
    filters.weight = filterWeightInput.value;
    renderTodos();
});
filterPeriodStartInput.addEventListener('change', () => {
    filters.periodStart = filterPeriodStartInput.value;
    renderTodos();
});
filterPeriodEndInput.addEventListener('change', () => {
    filters.periodEnd = filterPeriodEndInput.value;
    renderTodos();
});
if (downloadSpreadsheetBtn) {
    downloadSpreadsheetBtn.addEventListener('click', () => downloadAllInitiativesSpreadsheet());
}

clearFiltersBtn.addEventListener('click', () => {
    filters.id = '';
    filters.owner = '';
    filters.area = '';
    filters.status = '';
    filters.weight = '';
    filters.periodStart = '';
    filters.periodEnd = '';
    filterIdInput.value = '';
    filterOwnerInput.value = '';
    filterAreaInput.value = '';
    filterStatusInput.value = '';
    filterWeightInput.value = '';
    filterPeriodStartInput.value = '';
    filterPeriodEndInput.value = '';
    renderTodos();
});

loadTodos().catch(() => {
    list.innerHTML = '<li>Erro ao carregar dados do banco. Verifique se o backend est&aacute; no ar.</li>';
});