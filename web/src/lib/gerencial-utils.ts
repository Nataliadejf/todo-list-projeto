import type { Initiative, Task } from "./types";
import { getPriorityScore, normalizeStatus, parseConclusionDate } from "./todo-utils";

export interface GerencialFilter {
  owners: string[];
  start: Date | null;
  end: Date | null;
}

const toDay = (d: Date | null) => (d ? new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12) : null);
const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

// Atividade no período: o intervalo [início, fim] do item cruza o intervalo filtrado.
function overlapsPeriod(start: Date | null, end: Date | null, f: GerencialFilter): boolean {
  if (!f.start && !f.end) return true;
  if (!start && !end) return false;
  const s = start ?? end!;
  const e = end; // null = em aberto (ainda em andamento)
  if (f.end && s > f.end) return false;
  if (f.start && e && e < f.start) return false;
  return true;
}

export function iniciativaDatas(t: Initiative): { start: Date | null; end: Date | null } {
  const planned = toDay(parseConclusionDate(t.plannedEndDate));
  const real = toDay(parseConclusionDate(t.realEndDate));
  return {
    start: toDay(parseConclusionDate(t.startDate)),
    end: (isConcluida(t) && real) || planned || real,
  };
}

function tarefaDatas(t: Task): { start: Date | null; end: Date | null } {
  const done = Boolean(t.done) || /conclu/i.test(String(t.status || ""));
  return {
    start: toDay(parseConclusionDate(t.startDate)) ?? toDay(parseConclusionDate(t.createdAt)),
    end:
      toDay(parseConclusionDate(t.endDate)) ??
      toDay(parseConclusionDate(t.dueDate)) ??
      (done ? toDay(parseConclusionDate(t.completedAt)) : null),
  };
}

/** Aplica Responsável e Período às iniciativas e às tarefas (cada tarefa pelo seu próprio responsável). */
export function applyGerencialFilter(todos: Initiative[], tasks: Task[], f: GerencialFilter) {
  const byOwner = (owner: string) => f.owners.length === 0 || f.owners.some((o) => sameName(o, owner || ""));
  const iniciativas = todos.filter((t) => {
    if (!byOwner(t.owner)) return false;
    const { start, end } = iniciativaDatas(t);
    return overlapsPeriod(start, end, f);
  });
  const tarefas = tasks.filter((t) => {
    if (!byOwner(t.owner)) return false;
    const { start, end } = tarefaDatas(t);
    return overlapsPeriod(start, end, f);
  });
  const periodoAtivo = Boolean(f.start || f.end);
  const semData = periodoAtivo
    ? todos.filter((t) => byOwner(t.owner)).filter((t) => { const d = iniciativaDatas(t); return !d.start && !d.end; }).length
    : 0;
  return { iniciativas, tarefas, semData };
}

/**
 * Visão Gerencial — mede, por EIXO ESTRATÉGICO (Categoria de Ganho já marcada
 * nas iniciativas), a quantidade de iniciativas e de tarefas, além de conclusão,
 * prioridade (GUT) e esforço. Tudo automático, a partir do que já está cadastrado.
 */

export interface EixoGanho { key: string; label: string; accent: string }

export const EIXOS_GANHO: EixoGanho[] = [
  { key: "financeiro", label: "Financeiro", accent: "#1FA15B" },
  { key: "governanca", label: "Governança (informação)", accent: "#2563EB" },
  { key: "iso", label: "Governança ISO", accent: "#7C3AED" },
  { key: "produtividade", label: "Produtividade / Eficiência", accent: "#D97706" },
  { key: "impacto", label: "Atividade de impacto", accent: "#DB2777" },
  { key: "experiencia", label: "Experiência do cliente", accent: "#0891B2" },
  { key: "outros", label: "Outros", accent: "#64748B" },
];

export const EIXO_GANHO_BY_KEY: Record<string, EixoGanho> = Object.fromEntries(EIXOS_GANHO.map((e) => [e.key, e]));

export function eixoGanhoKeyOf(gainCategory: string): string {
  const c = String(gainCategory || "").toLowerCase();
  if (/iso|norma/.test(c)) return "iso";
  if (/governan/.test(c)) return "governanca";
  if (/produtiv|efici/.test(c)) return "produtividade";
  if (/financ/.test(c)) return "financeiro";
  if (/impacto/.test(c)) return "impacto";
  if (/experi/.test(c)) return "experiencia";
  return "outros";
}

export function sizeWeight(size: string): number {
  const s = String(size || "").trim().toUpperCase();
  const map: Record<string, number> = { PP: 1, P: 2, M: 3, G: 5, GG: 8 };
  if (map[s]) return map[s];
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export function isConcluida(t: Initiative): boolean {
  return /conclu/i.test(normalizeStatus(t.status)) || Boolean(t.completed);
}

function taskDone(t: Task): boolean {
  return Boolean(t.done) || /conclu/i.test(String(t.status || ""));
}

export interface EixoStats {
  key: string;
  label: string;
  accent: string;
  iniciativas: number;
  iniConcluidas: number;
  donePct: number; // 0-100
  tarefas: number;
  tarefasConcluidas: number;
  gutAvg: number;
  effortDone: number;
  progressAvg: number;
}

export interface GerencialResult {
  eixos: EixoStats[];
  totalIniciativas: number;
  totalIniConcluidas: number;
  totalTarefas: number;
  totalTarefasConcluidas: number;
  gutAvg: number;
  effortDone: number;
}

/** Consolida iniciativas + tarefas por eixo estratégico. */
export function gerencialStats(todos: Initiative[], tasks: Task[]): GerencialResult {
  // mapa dbId -> eixo (via categoria de ganho da iniciativa)
  const eixoByDbId = new Map<number, string>();
  todos.forEach((t) => eixoByDbId.set(t.dbId, eixoGanhoKeyOf(t.gainCategory)));

  const acc: Record<string, { ini: number; iniDone: number; tar: number; tarDone: number; gut: number; gutN: number; effortDone: number; prog: number; progN: number }> = {};
  const ensure = (k: string) => (acc[k] = acc[k] || { ini: 0, iniDone: 0, tar: 0, tarDone: 0, gut: 0, gutN: 0, effortDone: 0, prog: 0, progN: 0 });

  todos.forEach((t) => {
    const k = eixoGanhoKeyOf(t.gainCategory);
    const a = ensure(k);
    a.ini += 1;
    if (isConcluida(t)) { a.iniDone += 1; a.effortDone += sizeWeight(t.size); }
    const gut = getPriorityScore(t);
    if (gut > 0) { a.gut += gut; a.gutN += 1; }
    const p = Number.parseInt(t.progressPercent || "0", 10);
    if (Number.isFinite(p)) { a.prog += p; a.progN += 1; }
  });

  tasks.forEach((task) => {
    const dbId = task.initiativeDbId;
    const k = dbId != null && eixoByDbId.has(dbId) ? eixoByDbId.get(dbId)! : "outros";
    const a = ensure(k);
    a.tar += 1;
    if (taskDone(task)) a.tarDone += 1;
  });

  const eixos: EixoStats[] = EIXOS_GANHO.filter((e) => acc[e.key]).map((e) => {
    const a = acc[e.key];
    return {
      key: e.key,
      label: e.label,
      accent: e.accent,
      iniciativas: a.ini,
      iniConcluidas: a.iniDone,
      donePct: a.ini ? Math.round((a.iniDone / a.ini) * 100) : 0,
      tarefas: a.tar,
      tarefasConcluidas: a.tarDone,
      gutAvg: a.gutN ? Math.round((a.gut / a.gutN) * 10) / 10 : 0,
      effortDone: a.effortDone,
      progressAvg: a.progN ? Math.round(a.prog / a.progN) : 0,
    };
  }).sort((x, y) => y.iniciativas - x.iniciativas);

  const totalIniciativas = todos.length;
  const totalIniConcluidas = todos.filter(isConcluida).length;
  const totalTarefas = tasks.length;
  const totalTarefasConcluidas = tasks.filter(taskDone).length;
  let gut = 0, gutN = 0, effortDone = 0;
  todos.forEach((t) => {
    const g = getPriorityScore(t);
    if (g > 0) { gut += g; gutN += 1; }
    if (isConcluida(t)) effortDone += sizeWeight(t.size);
  });

  return {
    eixos,
    totalIniciativas,
    totalIniConcluidas,
    totalTarefas,
    totalTarefasConcluidas,
    gutAvg: gutN ? Math.round((gut / gutN) * 10) / 10 : 0,
    effortDone,
  };
}
