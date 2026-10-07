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
export const MARKET_INDICATORS: { name: string; unit: string; direction: "maior" | "menor" }[] = [
  { name: "Lead time do processo", unit: "Dias", direction: "menor" },
  { name: "Tempo de ciclo", unit: "Horas", direction: "menor" },
  { name: "Taxa de retrabalho", unit: "%", direction: "menor" },
  { name: "Taxa de erros / não conformidades", unit: "%", direction: "menor" },
  { name: "Nº de não conformidades em auditoria", unit: "Qtde", direction: "menor" },
  { name: "Aderência ao processo / padrão", unit: "%", direction: "maior" },
  { name: "SLA cumprido", unit: "%", direction: "maior" },
  { name: "OTIF (On Time In Full)", unit: "%", direction: "maior" },
  { name: "Nível de serviço", unit: "%", direction: "maior" },
  { name: "Acuracidade de estoque", unit: "%", direction: "maior" },
  { name: "Giro de estoque", unit: "Índice", direction: "maior" },
  { name: "Produtividade (unidades por hora)", unit: "Qtde", direction: "maior" },
  { name: "Horas economizadas (H/H)", unit: "H/H", direction: "maior" },
  { name: "Redução de custo", unit: "R$", direction: "maior" },
  { name: "Custo evitado", unit: "R$", direction: "maior" },
  { name: "Receita incremental", unit: "R$", direction: "maior" },
  { name: "Margem de contribuição", unit: "%", direction: "maior" },
  { name: "Inadimplência", unit: "%", direction: "menor" },
  { name: "Prazo médio de recebimento (PMR)", unit: "Dias", direction: "menor" },
  { name: "Satisfação do cliente (NPS / CSAT)", unit: "Pontos", direction: "maior" },
  { name: "Adoção de ferramenta / sistema", unit: "%", direction: "maior" },
  { name: "Horas de treinamento por colaborador", unit: "Horas", direction: "maior" },
  { name: "Turnover", unit: "%", direction: "menor" },
];

export const DIRECTION_LABELS = {
  maior: "Maior é melhor (aumentar)",
  menor: "Menor é melhor (reduzir)",
} as const;

// Exemplos de memória de cálculo para alguns indicadores comuns.
const MEMORY_EXAMPLES: Record<string, string> = {
  "OTIF (On Time In Full)":
    "OTIF (%) = (pedidos entregues no prazo e completos ÷ total de pedidos faturados no mês) × 100.\nFonte: relatório de expedição do ERP, extração mensal.\nPonto de partida: média dos 3 últimos meses (jan–mar/2026).\nPeriodicidade: mensal. Responsável pela apuração: Logística.",
  "Lead time do processo":
    "Lead time (dias) = data de conclusão do pedido − data de abertura, média dos pedidos concluídos no mês.\nFonte: sistema de chamados/ERP, extração mensal.\nPonto de partida: média dos 3 últimos meses. Desconsiderar pedidos cancelados.",
  "Taxa de retrabalho":
    "Retrabalho (%) = (nº de registros devolvidos para correção ÷ total de registros processados) × 100.\nFonte: log do processo. Periodicidade: mensal.",
  "Inadimplência":
    "Inadimplência (%) = (valor vencido há mais de 30 dias ÷ carteira total a receber) × 100.\nFonte: relatório de contas a receber, fechamento do mês.",
  "Custo evitado":
    "Custo evitado (R$) = (custo unitário anterior − custo unitário atual) × volume anual.\nPremissas: volume médio dos últimos 12 meses; custos conforme contrato vigente. Validação: Controladoria.",
  "Horas economizadas (H/H)":
    "H/H economizadas = (tempo médio antes − tempo médio depois, em horas) × nº de execuções por mês.\nFonte: cronometragem de amostra de 20 execuções antes e depois da melhoria.",
};

const GENERIC_MEMORY_EXAMPLE =
  "Indicador (unidade) = numerador ÷ denominador × 100.\nNumerador: o que é contado (ex.: pedidos entregues no prazo).\nDenominador: universo considerado (ex.: total de pedidos do mês).\nFonte dos dados: sistema/relatório e quem extrai.\nPonto de partida: como e quando foi medido (ex.: média dos 3 últimos meses).\nPeriodicidade da medição: mensal.";

export function memoryExample(name: string): string {
  return MEMORY_EXAMPLES[name.trim()] ?? GENERIC_MEMORY_EXAMPLE;
}

export function emptyIndicator(): InitiativeIndicator {
  return { name: "", unit: "%", base: "", target: "", achieved: "", direction: "maior", memory: "" };
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
            direction: i?.direction === "menor" ? "menor" : "maior",
            memory: String(i?.memory ?? ""),
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

/**
 * Ganho/retorno na direção do indicador: "maior" = realizado − partida; "menor" = partida − realizado
 * (positivo = melhorou). pct = quanto da variação prevista foi entregue (vale nas duas direções).
 */
export function indicatorResult(item: InitiativeIndicator): { gain: number; pct: number | null } | null {
  const base = toNumber(item.base);
  const achieved = toNumber(item.achieved);
  if (base === null || achieved === null) return null;
  const target = toNumber(item.target);
  const sign = item.direction === "menor" ? -1 : 1;
  const gain = Math.round(sign * (achieved - base) * 100) / 100;
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
