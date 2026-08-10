import { MONTH_KEYS, type FilterState, type Initiative, type KanbanStage } from "./types";

export function normalizeStatus(status: string): string {
  const raw = String(status || "").trim().toLowerCase();
  if (raw === "concluido" || raw === "concluído") return "Concluído";
  // "Atrasado" foi descontinuado como status — vira "Em Andamento" (o atraso é visual).
  if (raw === "em andamento" || raw === "atrasado") return "Em Andamento";
  if (raw === "continuo" || raw === "contínuo") return "Contínuo";
  if (raw === "despriorizado" || raw === "despriorizada") return "Despriorizado";
  if (raw === "a fazer" || raw === "não iniciado" || raw === "nao iniciado") return "Não Iniciado";
  return status || "Não Iniciado";
}

// Iniciativa atrasada: data prevista de fim já passou e não está concluída/despriorizada.
export function isOverdue(todo: Initiative): boolean {
  const end = parseDate(todo.plannedEndDate);
  if (!end) return false;
  const status = normalizeStatus(todo.status);
  if (
    status === "Concluído" || status === "Despriorizado" || status === "Contínuo" ||
    todo.completed || todo.deprioritized
  ) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return end < today;
}

export function normalizeInitiative(
  todo: Partial<Initiative> & { text?: string; desc?: string },
): Initiative {
  const legacy = todo as Partial<Initiative> & { text?: string; desc?: string };
  const normalized = { ...todo } as Initiative;
  if (!normalized.initiative && legacy.text) normalized.initiative = legacy.text;
  if (!normalized.description && legacy.desc) normalized.description = legacy.desc;
  normalized.id = normalized.id || `ID-${Date.now()}`;
  normalized.status = normalizeStatus(normalized.status || "");
  normalized.completed = Boolean(normalized.completed);
  normalized.approved = Boolean(normalized.approved);
  normalized.deprioritized = Boolean(normalized.deprioritized);
  MONTH_KEYS.forEach((month) => {
    normalized[month] = Boolean(normalized[month]);
  });
  return normalized;
}

function normalizeText(value: string | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function parseDate(value: string | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function matchesDeadline(todo: Initiative, deadline: string) {
  if (!deadline) return true;
  const end = parseDate(todo.plannedEndDate) || parseDate(todo.realEndDate);
  const now = new Date();
  if (deadline === "overdue") {
    return Boolean(end && end < now && normalizeStatus(todo.status) !== "Concluído");
  }
  if (!end) return false;
  if (deadline === "month") {
    return end.getMonth() === now.getMonth() && end.getFullYear() === now.getFullYear();
  }
  if (deadline === "quarter") {
    const limit = new Date(now);
    limit.setMonth(limit.getMonth() + 3);
    return end >= now && end <= limit;
  }
  if (deadline === "year") {
    return end.getFullYear() === now.getFullYear();
  }
  return true;
}

// Oculta iniciativas cujo responsável está inativo (dados preservados no banco).
export function hideInactiveOwners(todos: Initiative[], inactive: Set<string>): Initiative[] {
  if (!inactive || inactive.size === 0) return todos;
  return todos.filter((t) => !inactive.has((t.owner || "").trim()));
}

export function filterInitiatives(todos: Initiative[], filters: FilterState) {
  return todos.filter((todo) => {
    const search = normalizeText(filters.search);
    if (search) {
      const haystack = [
        todo.id,
        todo.initiative,
        todo.area,
        todo.owner,
        todo.front,
        todo.description,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    if (filters.status.length && !filters.status.some((v) => normalizeText(v) === normalizeText(todo.status))) return false;
    if (filters.owner.length && !filters.owner.some((v) => normalizeText(v) === normalizeText(todo.owner))) return false;
    if (filters.area.length && !filters.area.some((v) => normalizeText(v) === normalizeText(todo.area))) return false;
    if (filters.size.length && !filters.size.some((v) => normalizeText(v) === normalizeText(todo.size))) return false;
    if (!matchesDeadline(todo, filters.deadline)) return false;

    const rangeStart = parseDate(filters.periodStart);
    const rangeEnd = parseDate(filters.periodEnd);
    if (rangeStart || rangeEnd) {
      const todoStart = parseDate(todo.startDate);
      const todoEnd = parseDate(todo.plannedEndDate) || todoStart;
      if (!todoStart && !todoEnd) return false;
      if (rangeStart && todoEnd && todoEnd < rangeStart) return false;
      if (rangeEnd && todoStart && todoStart > rangeEnd) return false;
    }
    return true;
  });
}

export function getMetrics(todos: Initiative[]) {
  let notStarted = 0;
  let inProgress = 0;
  let done = 0;
  let overdue = 0;

  todos.forEach((todo) => {
    const status = normalizeStatus(todo.status);
    if (status === "Concluído" || todo.completed) done += 1;
    else if (status === "Em Andamento") inProgress += 1;
    else if (status === "Não Iniciado") notStarted += 1;
    if (isOverdue(todo)) overdue += 1;
  });

  return {
    total: todos.length,
    notStarted,
    inProgress,
    done,
    overdue,
  };
}

export function toInitiativeInput(todo: Initiative): Omit<Initiative, "dbId"> {
  const { dbId: _dbId, ...rest } = todo;
  return rest;
}

export function getKanbanStage(todo: Initiative): KanbanStage {
  const status = normalizeStatus(todo.status);
  if (todo.deprioritized || status === "Despriorizado") return "despriorizados";
  if (status === "Concluído" || todo.completed) return "concluido";
  if (status === "Contínuo") return "continuo";
  if (status === "Em Andamento") return "andamento";
  return "nao_iniciado"; // Não Iniciado (aprovação foi descontinuada)
}

export function getPriorityScore(todo: Initiative): number {
  const g = Number.parseInt(todo.severity || "0", 10) || 0;
  const u = Number.parseInt(todo.urgency || "0", 10) || 0;
  return g * u;
}

export type PriorityBand = "alta" | "media" | "baixa" | "none";

// Prioridade = Gravidade × Urgência (GUT). Faixas: >=15 Alta, >=5 Média, senão Baixa.
export function getPriorityBand(todo: Initiative): PriorityBand {
  const score = getPriorityScore(todo);
  if (score <= 0) return "none";
  if (score >= 15) return "alta";
  if (score >= 5) return "media";
  return "baixa";
}

export type WeightBand = "alta" | "media" | "baixa";

export function getWeightBand(weight: string): WeightBand {
  const w = normalizeText(weight);
  if (w === "5" || w.includes("alta")) return "alta";
  if (w === "3" || w.includes("média") || w.includes("media")) return "media";
  return "baixa";
}

// ---- Gráfico "Iniciativas por Responsável", agrupável por métrica ----
export type ChartMode = "size" | "priority";

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
}

export const CHART_MODE_LABELS: Record<ChartMode, string> = {
  size: "Tamanho",
  priority: "Prioridade",
};

export const CHART_SERIES: Record<ChartMode, ChartSeries[]> = {
  size: [
    { key: "GG", label: "GG", color: "#7c3aed" },
    { key: "G", label: "G", color: "#2563eb" },
    { key: "M", label: "M", color: "#0891b2" },
    { key: "P", label: "P", color: "#16a34a" },
    { key: "PP", label: "PP", color: "#94a3b8" },
  ],
  priority: [
    { key: "alta", label: "Alta", color: "#ef4444" },
    { key: "media", label: "Média", color: "#f97316" },
    { key: "baixa", label: "Baixa", color: "#3b82f6" },
  ],
};

const SIZE_KEYS = ["PP", "P", "M", "G", "GG"];

// Classifica uma iniciativa na série correspondente ao modo escolhido.
function classifyByMode(todo: Initiative, mode: ChartMode): string | null {
  if (mode === "priority") {
    const band = getPriorityBand(todo);
    return band === "none" ? null : band;
  }
  const size = normalizeText(todo.size).toUpperCase();
  return SIZE_KEYS.includes(size) ? size : null;
}

export function getOwnerChartData(todos: Initiative[], mode: ChartMode) {
  const keys = CHART_SERIES[mode].map((s) => s.key);
  const map = new Map<string, Record<string, number>>();

  todos.forEach((todo) => {
    const owner = todo.owner?.trim() || "Sem responsável";
    if (!map.has(owner)) map.set(owner, Object.fromEntries(keys.map((k) => [k, 0])));
    const key = classifyByMode(todo, mode);
    if (key) map.get(owner)![key] += 1;
  });

  const total = (values: Record<string, number>) => keys.reduce((sum, k) => sum + values[k], 0);

  return [...map.entries()]
    .map(([owner, values]) => ({ owner, __total: total(values), ...values }))
    .filter((row) => row.__total > 0)
    .sort((a, b) => b.__total - a.__total)
    .slice(0, 12);
}

export function getUniqueValues(todos: Initiative[], key: keyof Initiative) {
  return [...new Set(todos.map((t) => String(t[key] || "").trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
}

export function formatUpdatedTime() {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

export function getDeadlineAlert(todo: Initiative) {
  const status = normalizeStatus(todo.status);
  if (status === "Concluído" || todo.completed) return { label: "—", tone: "muted" as const };
  if (status === "Contínuo") return { label: "Rotina", tone: "muted" as const };
  if (isOverdue(todo)) return { label: "Atrasado", tone: "danger" as const };
  // Não iniciado → Planejado; Em andamento (dentro do prazo) → No prazo (Urgente se ≤7 dias)
  if (status === "Não Iniciado") return { label: "Planejado", tone: "muted" as const };
  const end = parseDate(todo.plannedEndDate);
  if (end) {
    const diff = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff <= 7) return { label: "Urgente", tone: "warning" as const };
  }
  return { label: "No prazo", tone: "success" as const };
}
