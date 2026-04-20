const form = document.getElementById('todo-form');
const list = document.getElementById('todo-list');
const modal = document.getElementById('modal');
const closeModalBtn = document.getElementById('close-modal');
const modalTitle = document.getElementById('modal-title');
const modalFields = document.getElementById('modal-fields');

const monthKeys = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
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

let todos = (JSON.parse(localStorage.getItem('todos')) || []).map(normalizeTodo);
let editingIdx = null;

function normalizeTodo(todo) {
    const normalized = { ...todo };
    if (!normalized.initiative && normalized.text) {
        normalized.initiative = normalized.text;
    }
    if (!normalized.description && normalized.desc) {
        normalized.description = normalized.desc;
    }
    normalized.id = normalized.id || `ID-${Date.now()}`;
    normalized.status = normalized.status || 'A fazer';
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

function renderTodos() {
    list.innerHTML = '';
    todos.forEach((todo, idx) => {
        const li = document.createElement('li');
        li.className = todo.completed ? 'completed' : '';
        if (editingIdx === idx) {
            const monthCheckboxes = monthKeys.map((month) => `
                <label><input type="checkbox" id="edit-${month}-${idx}" ${todo[month] ? 'checked' : ''}/> ${month.toUpperCase()}</label>
            `).join('');
            const fields = editableKeys.map((key) => {
                const value = escapeHtml(todo[key] || '');
                if (key === 'description' || key === 'deliveries' || key === 'gainDescription' || key === 'impediment' || key === 'notes') {
                    return `<label>${labelMap[key]}<textarea id="edit-${key}-${idx}" rows="2">${value}</textarea></label>`;
                }
                if (key.toLowerCase().includes('date')) {
                    return `<label>${labelMap[key]}<input type="date" id="edit-${key}-${idx}" value="${value}" /></label>`;
                }
                if (key === 'status') {
                    return `<label>${labelMap[key]}<select id="edit-status-${idx}">
                        <option value="A fazer" ${todo.status === 'A fazer' ? 'selected' : ''}>A fazer</option>
                        <option value="Em andamento" ${todo.status === 'Em andamento' ? 'selected' : ''}>Em andamento</option>
                        <option value="Concluído" ${todo.status === 'Concluído' ? 'selected' : ''}>Concluído</option>
                    </select></label>`;
                }
                if (key === 'size') {
                    return `<label>${labelMap[key]}<select id="edit-size-${idx}">
                        <option value="" ${!todo.size ? 'selected' : ''}>-</option>
                        <option value="P" ${todo.size === 'P' ? 'selected' : ''}>P</option>
                        <option value="M" ${todo.size === 'M' ? 'selected' : ''}>M</option>
                        <option value="G" ${todo.size === 'G' ? 'selected' : ''}>G</option>
                    </select></label>`;
                }
                return `<label>${labelMap[key]}<input type="text" id="edit-${key}-${idx}" value="${value}" /></label>`;
            }).join('');
            li.innerHTML = `<form class="edit-form" onsubmit="return saveEdit(${idx})">${fields}<div class="month-grid-inline">${monthCheckboxes}</div><div class="todo-actions"><button type="submit" title="Salvar">💾</button><button type="button" title="Cancelar" onclick="cancelEdit()">✖️</button></div></form>`;
        } else {
            li.innerHTML = `
                <span onclick="startEdit(${idx})" title="Clique para editar">${escapeHtml(todo.id)} - ${escapeHtml(todo.initiative)}</span>
                <div class="todo-actions">
                    <button title="Visualizar" onclick="showModal(${idx})">🔍</button>
                    <button title="Editar" onclick="startEdit(${idx})">✏️</button>
                    <button title="Concluir" onclick="toggleTodo(${idx})">✔️</button>
                    <button title="Remover" onclick="removeTodo(${idx})">🗑️</button>
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

function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

function clearForm() {
    form.reset();
}

function removeTodo(idx) {
    if (editingIdx === idx) editingIdx = null;
    todos.splice(idx, 1);
    saveTodos();
    renderTodos();
}

function toggleTodo(idx) {
    todos[idx].completed = !todos[idx].completed;
    saveTodos();
    renderTodos();
}

function startEdit(idx) {
    editingIdx = idx;
    renderTodos();
}

function saveEdit(idx) {
    editableKeys.forEach((key) => {
        const element = document.getElementById(`edit-${key}-${idx}`);
        if (element) todos[idx][key] = element.value.trim();
    });
    monthKeys.forEach((month) => {
        const element = document.getElementById(`edit-${month}-${idx}`);
        todos[idx][month] = element ? element.checked : false;
    });
    todos[idx] = normalizeTodo(todos[idx]);
    editingIdx = null;
    saveTodos();
    renderTodos();
    return false;
}

function cancelEdit() {
    editingIdx = null;
    renderTodos();
}

function showModal(idx) {
    const todo = todos[idx];
    modalTitle.textContent = `${todo.id} - ${todo.initiative}`;
    const rows = Object.keys(labelMap).map((key) => `<p><strong>${labelMap[key]}:</strong> ${escapeHtml(todo[key] || '-')}</p>`);
    rows.push(`<p><strong>Meses planejados:</strong> ${escapeHtml(getMonthsText(todo))}</p>`);
    modalFields.innerHTML = rows.join('');
    modal.style.display = 'flex';
}

form.onsubmit = function (e) {
    e.preventDefault();
    const todo = readFormTodo();
    if (!todo.id || !todo.area || !todo.front || !todo.initiative || !todo.owner) {
        return;
    }
    todos.push(todo);
    saveTodos();
    renderTodos();
    clearForm();
};

closeModalBtn.onclick = function () {
    modal.style.display = 'none';
};

window.onclick = function (event) {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
};

window.showModal = showModal;
window.removeTodo = removeTodo;
window.toggleTodo = toggleTodo;
window.startEdit = startEdit;
window.saveEdit = saveEdit;
window.cancelEdit = cancelEdit;

renderTodos();