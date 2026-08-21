import type { Initiative } from "./types";
import { getPriorityScore, normalizeStatus } from "./todo-utils";

/**
 * Visão Executiva — indicadores em 2 camadas.
 *
 *  Camada 1 (automática): derivada dos campos que já existem no legado
 *    (status, progresso, GUT, tamanho, categoria de ganho). Zero digitação.
 *  Camada 2 (estruturação futura): o simulador de alavancas usa uma
 *    contribuição/confiança por iniciativa — hoje editável na tela, amanhã
 *    persistida num campo estruturado (indicador-chave).
 *
 * Os "eixos" (metas globais) são as próprias categorias de ganho já marcadas
 * nas iniciativas — foi o resultado do estudo do legado.
 */

export interface Eixo {
  key: string;
  label: string;
  indicator: string; // indicador-chave sugerido
  unit: string;
  accent: string; // cor (hex) para segmentos/realces
}

export const EIXOS: Eixo[] = [
  { key: "financeiro", label: "Financeiro", indicator: "Resultado financeiro (receita ↑ / despesa ↓ / custo evitado)", unit: "R$ mil", accent: "#1FA15B" },
  { key: "governanca", label: "Governança (informação)", indicator: "Cobertura de padronização / rastreabilidade", unit: "%", accent: "#2563EB" },
  { key: "iso", label: "Governança ISO", indicator: "Não conformidades tratadas / aderência a requisitos", unit: "nº", accent: "#7C3AED" },
  { key: "produtividade", label: "Produtividade / Eficiência", indicator: "Horas economizadas / retrabalho evitado", unit: "h", accent: "#D97706" },
  { key: "impacto", label: "Atividade de impacto", indicator: "Entregas estratégicas concluídas", unit: "nº", accent: "#DB2777" },
  { key: "experiencia", label: "Experiência do cliente", indicator: "Satisfação / NPS", unit: "índice", accent: "#0891B2" },
  { key: "outros", label: "Outros", indicator: "—", unit: "", accent: "#64748B" },
];

export const EIXO_BY_KEY: Record<string, Eixo> = Object.fromEntries(EIXOS.map((e) => [e.key, e]));

/** Mapeia a categoria de ganho (texto livre do legado) para um eixo. */
export function eixoKeyOf(gainCategory: string): string {
  const c = String(gainCategory || "").toLowerCase();
  if (/iso|norma/.test(c)) return "iso";
  if (/governan/.test(c)) return "governanca";
  if (/produtiv|efici/.test(c)) return "produtividade";
  if (/financ/.test(c)) return "financeiro";
  if (/impacto/.test(c)) return "impacto";
  if (/experi/.test(c)) return "experiencia";
  return "outros";
}

/** Peso de esforço a partir do "tamanho" (PP..GG ou número). */
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

export interface EixoStats {
  key: string;
  label: string;
  unit: string;
  accent: string;
  count: number;
  done: number;
  donePct: number; // 0-100
  gutAvg: number;
  effortDone: number; // pontos de esforço concluídos
  progressAvg: number; // 0-100
}

export function eixoStats(todos: Initiative[]): EixoStats[] {
  const acc: Record<string, { count: number; done: number; gut: number; gutN: number; effortDone: number; prog: number; progN: number }> = {};
  todos.forEach((t) => {
    const k = eixoKeyOf(t.gainCategory);
    const a = (acc[k] = acc[k] || { count: 0, done: 0, gut: 0, gutN: 0, effortDone: 0, prog: 0, progN: 0 });
    a.count += 1;
    const done = isConcluida(t);
    if (done) {
      a.done += 1;
      a.effortDone += sizeWeight(t.size);
    }
    const gut = getPriorityScore(t);
    if (gut > 0) { a.gut += gut; a.gutN += 1; }
    const p = Number.parseInt(t.progressPercent || "0", 10);
    if (Number.isFinite(p)) { a.prog += p; a.progN += 1; }
  });

  return EIXOS.filter((e) => acc[e.key]).map((e) => {
    const a = acc[e.key];
    return {
      key: e.key,
      label: e.label,
      unit: e.unit,
      accent: e.accent,
      count: a.count,
      done: a.done,
      donePct: a.count ? Math.round((a.done / a.count) * 100) : 0,
      gutAvg: a.gutN ? Math.round((a.gut / a.gutN) * 10) / 10 : 0,
      effortDone: a.effortDone,
      progressAvg: a.progN ? Math.round(a.prog / a.progN) : 0,
    };
  }).sort((x, y) => y.count - x.count);
}

export interface LegadoKpis {
  total: number;
  done: number;
  donePct: number;
  gutAvg: number;
  effortDone: number;
}

export function legadoKpis(todos: Initiative[]): LegadoKpis {
  const total = todos.length;
  const done = todos.filter(isConcluida).length;
  let gut = 0, gutN = 0, effortDone = 0;
  todos.forEach((t) => {
    const g = getPriorityScore(t);
    if (g > 0) { gut += g; gutN += 1; }
    if (isConcluida(t)) effortDone += sizeWeight(t.size);
  });
  return {
    total,
    done,
    donePct: total ? Math.round((done / total) * 100) : 0,
    gutAvg: gutN ? Math.round((gut / gutN) * 10) / 10 : 0,
    effortDone,
  };
}
