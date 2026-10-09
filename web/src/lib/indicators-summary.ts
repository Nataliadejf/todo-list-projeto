import { indicatorResult, parseIndicatorsData, toNumber } from "./indicators";
import type { Initiative } from "./types";

export type IndicatorState = "atingida" | "parcial" | "sem_realizado";

export interface IndicatorRow {
  dbId: number;
  initiative: string;
  owner: string;
  area: string;
  status: string;
  concluded: boolean;
  name: string;
  unit: string;
  direction: "maior" | "menor";
  base: number | null;
  target: number | null;
  achieved: number | null;
  gain: number | null;
  pct: number | null;
  pctBasis: "variacao" | "meta" | null;
  memory: string;
  state: IndicatorState;
}

export interface IndicatorGroup {
  key: string;
  name: string;
  unit: string;
  direction: "maior" | "menor";
  initiatives: number;
  withAchieved: number;
  reached: number;
  avgPct: number | null;
  /** Unidades somáveis (R$, H/H, Ton...) somam o ganho; as demais (%, dias, índice...) usam a média. */
  gainMode: "soma" | "media";
  gain: number | null;
}

export interface Justification {
  dbId: number;
  initiative: string;
  owner: string;
  text: string;
}

export interface OwnerPending {
  owner: string;
  semResposta: number;
  semRealizado: number;
}

export interface IndicatorsSummary {
  totalIniciativas: number;
  sim: number;
  nao: number;
  semResposta: number;
  coberturaPct: number;
  totalIndicadores: number;
  comRealizado: number;
  atingidas: number;
  avgPct: number | null;
  rows: IndicatorRow[];
  groups: IndicatorGroup[];
  justificativas: Justification[];
  pendencias: OwnerPending[];
}

const ADDITIVE_UNITS = new Set(["R$", "R$ mil", "H/H", "Horas", "Ton", "Qtde"]);
const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

function isConcluded(t: Initiative): boolean {
  return /conclu/i.test(String(t.status || "")) || Boolean(t.completed);
}

export function summarizeIndicators(todos: Initiative[]): IndicatorsSummary {
  const rows: IndicatorRow[] = [];
  const justificativas: Justification[] = [];
  const pend = new Map<string, OwnerPending>();
  let sim = 0;
  let nao = 0;
  let semResposta = 0;

  const bump = (owner: string, field: "semResposta" | "semRealizado") => {
    const key = owner.trim() || "(Sem responsável)";
    const cur = pend.get(key) ?? { owner: key, semResposta: 0, semRealizado: 0 };
    cur[field] += 1;
    pend.set(key, cur);
  };

  todos.forEach((t) => {
    const data = parseIndicatorsData(t.indicatorsData);
    const concluded = isConcluded(t);
    if (data.has === "Sim") {
      sim += 1;
      data.items.forEach((item) => {
        const result = indicatorResult(item);
        const achieved = toNumber(item.achieved);
        const pct = result?.pct ?? null;
        const state: IndicatorState = achieved === null ? "sem_realizado" : pct !== null && pct >= 100 ? "atingida" : "parcial";
        if (concluded && achieved === null) bump(t.owner, "semRealizado");
        rows.push({
          dbId: t.dbId,
          initiative: t.initiative,
          owner: t.owner,
          area: t.area,
          status: t.status,
          concluded,
          name: item.name.trim(),
          unit: item.unit,
          direction: item.direction,
          base: toNumber(item.base),
          target: toNumber(item.target),
          achieved,
          gain: result?.gain ?? null,
          pct,
          pctBasis: result?.basis ?? null,
          memory: item.memory,
          state,
        });
      });
    } else if (data.has === "Não") {
      nao += 1;
      justificativas.push({ dbId: t.dbId, initiative: t.initiative, owner: t.owner, text: data.justification });
    } else {
      semResposta += 1;
      bump(t.owner, "semResposta");
    }
  });

  const byKey = new Map<string, IndicatorRow[]>();
  rows.forEach((r) => {
    const key = `${r.name.toLowerCase()}|${r.unit}`;
    byKey.set(key, [...(byKey.get(key) ?? []), r]);
  });

  const groups: IndicatorGroup[] = [...byKey.entries()].map(([key, list]) => {
    const pcts = list.map((r) => r.pct).filter((p): p is number => p !== null);
    const gains = list.map((r) => r.gain).filter((g): g is number => g !== null);
    const mode: "soma" | "media" = ADDITIVE_UNITS.has(list[0].unit) ? "soma" : "media";
    const gainTotal = gains.reduce((s, g) => s + g, 0);
    return {
      key,
      name: list[0].name,
      unit: list[0].unit,
      direction: list[0].direction,
      initiatives: new Set(list.map((r) => r.dbId)).size,
      withAchieved: list.filter((r) => r.achieved !== null).length,
      reached: list.filter((r) => r.state === "atingida").length,
      avgPct: pcts.length ? round1(pcts.reduce((s, p) => s + p, 0) / pcts.length) : null,
      gainMode: mode,
      gain: gains.length ? round2(mode === "soma" ? gainTotal : gainTotal / gains.length) : null,
    };
  }).sort((a, b) => b.initiatives - a.initiatives || a.name.localeCompare(b.name, "pt-BR"));

  const allPcts = rows.map((r) => r.pct).filter((p): p is number => p !== null);
  const total = todos.length;

  return {
    totalIniciativas: total,
    sim,
    nao,
    semResposta,
    coberturaPct: total ? Math.round((sim / total) * 100) : 0,
    totalIndicadores: rows.length,
    comRealizado: rows.filter((r) => r.achieved !== null).length,
    atingidas: rows.filter((r) => r.state === "atingida").length,
    avgPct: allPcts.length ? round1(allPcts.reduce((s, p) => s + p, 0) / allPcts.length) : null,
    rows,
    groups,
    justificativas,
    pendencias: [...pend.values()].sort((a, b) => b.semResposta + b.semRealizado - (a.semResposta + a.semRealizado)),
  };
}
