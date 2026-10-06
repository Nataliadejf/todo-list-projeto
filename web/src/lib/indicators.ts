import type { IndicatorsData, InitiativeIndicator } from "./types";

export const INDICATOR_UNITS = ["%", "Qtde", "R$", "R$ mil", "H/H", "Horas", "Dias", "Ton", "Índice", "Pontos"] as const;

// Texto exibido na lista de unidades (o valor gravado continua sendo a sigla).
export const UNIT_LABELS: Record<string, string> = {
  "%": "% (percentual)",
  Qtde: "Qtde (quantidade)",
  "R$": "R$ (reais)",
  "R$ mil": "R$ mil (milhares de reais)",
  "H/H": "H/H (horas-homem)",
  Horas: "Horas",
  Dias: "Dias",
  Ton: "Ton (toneladas)",
  Índice: "Índice (valor adimensional)",
  Pontos: "Pontos",
};

// Indicadores de uso comum em operações, processos e finanças (sugestões — o texto também pode ser livre).
export const MARKET_INDICATORS: { name: string; unit: string }[] = [
  { name: "Lead time do processo", unit: "Dias" },
  { name: "Tempo de ciclo", unit: "Horas" },
  { name: "Taxa de retrabalho", unit: "%" },
  { name: "Taxa de erros / não conformidades", unit: "%" },
  { name: "Nº de não conformidades em auditoria", unit: "Qtde" },
  { name: "Aderência ao processo / padrão", unit: "%" },
  { name: "SLA cumprido", unit: "%" },
  { name: "OTIF (On Time In Full)", unit: "%" },
  { name: "Nível de serviço", unit: "%" },
  { name: "Acuracidade de estoque", unit: "%" },
  { name: "Giro de estoque", unit: "Índice" },
  { name: "Produtividade (unidades por hora)", unit: "Qtde" },
  { name: "Horas economizadas (H/H)", unit: "H/H" },
  { name: "Redução de custo", unit: "R$" },
  { name: "Custo evitado", unit: "R$" },
  { name: "Receita incremental", unit: "R$" },
  { name: "Margem de contribuição", unit: "%" },
  { name: "Inadimplência", unit: "%" },
  { name: "Prazo médio de recebimento (PMR)", unit: "Dias" },
  { name: "Satisfação do cliente (NPS / CSAT)", unit: "Pontos" },
  { name: "Adoção de ferramenta / sistema", unit: "%" },
  { name: "Horas de treinamento por colaborador", unit: "Horas" },
  { name: "Turnover", unit: "%" },
];

export function emptyIndicator(): InitiativeIndicator {
  return { name: "", unit: "%", base: "", target: "", achieved: "" };
}

export function emptyIndicatorsData(): IndicatorsData {
  return { has: "", justification: "", items: [] };
}

export function parseIndicatorsData(raw: string | null | undefined): IndicatorsData {
  if (!raw) return emptyIndicatorsData();
  try {
    const d = JSON.parse(raw) as Partial<IndicatorsData>;
    return {
      has: d.has === "Sim" || d.has === "Não" ? d.has : "",
      justification: String(d.justification ?? ""),
      items: Array.isArray(d.items)
        ? d.items.map((i) => ({
            name: String(i?.name ?? ""),
            unit: String(i?.unit ?? "%"),
            base: String(i?.base ?? ""),
            target: String(i?.target ?? ""),
            achieved: String(i?.achieved ?? ""),
          }))
        : [],
    };
  } catch {
    return emptyIndicatorsData();
  }
}

export function serializeIndicatorsData(data: IndicatorsData): string {
  if (!data.has) return "";
  return JSON.stringify(data);
}

export function toNumber(value: string): number | null {
  const s = String(value ?? "").trim().replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Ganho/retorno = realizado − ponto de partida; pct = quanto da variação prevista foi entregue. */
export function indicatorResult(item: InitiativeIndicator): { gain: number; pct: number | null } | null {
  const base = toNumber(item.base);
  const achieved = toNumber(item.achieved);
  if (base === null || achieved === null) return null;
  const target = toNumber(item.target);
  const gain = Math.round((achieved - base) * 100) / 100;
  const planned = target !== null ? target - base : 0;
  return { gain, pct: planned !== 0 ? Math.round(((achieved - base) / planned) * 1000) / 10 : null };
}

/** Mensagem do que falta preencher (null = válido). `concluded`: com a iniciativa concluída, o realizado é obrigatório. */
export function validateIndicatorsData(data: IndicatorsData, concluded = false): string | null {
  if (!data.has) return "Responda se a iniciativa possui indicador de eficácia (Sim ou Não).";
  if (data.has === "Não") {
    return data.justification.trim() ? null : "Justifique por que a iniciativa não possui indicador de eficácia.";
  }
  if (data.items.length === 0) return "Adicione ao menos um indicador de eficácia.";
  const bad = data.items.findIndex((i) => !i.name.trim() || !i.unit || i.base.trim() === "" || i.target.trim() === "");
  if (bad >= 0) return `Indicador ${bad + 1}: informe nome, unidade, ponto de partida e ponto de chegada.`;
  if (concluded) {
    const missing = data.items.findIndex((i) => i.achieved.trim() === "");
    if (missing >= 0) return `Indicador ${missing + 1}: com a iniciativa concluída, informe o realizado.`;
  }
  return null;
}
