import { MONTH_KEYS, type FilterState, type Initiative, type KanbanStage } from "./types";

export function normalizeStatus(status: string): string {
  const raw = String(status || "").trim().toLowerCase();
  if (raw === "concluido" || raw === "concluído") return "Concluído";
  if (raw === "em andamento") return "Em Andamento";
  if (raw === "atrasado") return "Atrasado";
  if (raw === "despriorizado" || raw === "despriorizada") return "Despriorizado";
  if (raw === "a fazer" || raw === "não iniciado" || raw === "nao iniciado") return "Não Iniciado";
  return status || "Não Iniciado";
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

function matchesWeight(todo: Initiative, weight: string) {
  if (!weight) return true;
  const w = normalizeText(todo.weight);
  if (weight === "5") return w === "5" || w.includes("alta");
  if (weight === "3") return w === "3" || w.includes("média") || w.includes("media");
  if (weight === "1") return w === "1" || w.includes("baixa");
  return w.includes(normalizeText(weight));
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
    if (filters.status && normalizeText(todo.status) !== normalizeText(filters.status)) return false;
    if (filters.owner && normalizeText(todo.owner) !== normalizeText(filters.owner)) return false;
    if (filters.area && normalizeText(todo.area) !== normalizeText(filters.area)) return false;
    if (!matchesWeight(todo, filters.weight)) return false;
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
  let inApproval = 0;

  todos.forEach((todo) => {
    const status = normalizeStatus(todo.status);
    if (status === "Concluído" || todo.completed) done += 1;
    else if (status === "Em Andamento") inProgress += 1;
    else if (status === "Não Iniciado") notStarted += 1;
    if (!todo.approved && !todo.deprioritized && status !== "Concluído") inApproval += 1;
  });

  return {
    total: todos.length,
    notStarted,
    inProgress,
    done,
    inApproval,
  };
}

export function toInitiativeInput(todo: Initiative): Omit<Initiative, "dbId"> {
  const { dbId: _dbId, ...rest } = todo;
  return rest;
}

export function getKanbanStage(todo: Initiative): KanbanStage {
  const status = normalizeStatus(todo.status);
  if (todo.deprioritized || status === "Despriorizado") return "despriorizados";
  if (!todo.approved) return "aprovacao";
  if (status === "Concluído" || todo.completed) return "concluido";
  if (status === "Atrasado") return "atrasado";
  if (status === "Em Andamento") return "andamento";
  return "nao_iniciado";
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

export function getOwnerWeightChartData(todos: Initiative[]) {
  const map = new Map<string, { alta: number; media: number; baixa: number }>();

  todos.forEach((todo) => {
    const owner = todo.owner?.trim() || "Sem responsável";
    if (!map.has(owner)) map.set(owner, { alta: 0, media: 0, baixa: 0 });
    const bucket = map.get(owner)!;
    const band = getWeightBand(todo.weight);
    bucket[band] += 1;
  });

  return [...map.entries()]
    .map(([owner, values]) => ({ owner, ...values }))
    .sort((a, b) => b.alta + b.media + b.baixa - (a.alta + a.media + a.baixa))
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
  const end = parseDate(todo.plannedEndDate);
  if (!end || normalizeStatus(todo.status) === "Concluído") return { label: "—", tone: "muted" as const };
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: "Atrasado", tone: "danger" as const };
  if (diff <= 7) return { label: "Urgente", tone: "warning" as const };
  if (diff <= 30) return { label: "No prazo", tone: "success" as const };
  return { label: "Planejado", tone: "muted" as const };
}
