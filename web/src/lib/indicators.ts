import type { IndicatorsData, InitiativeIndicator } from "./types";

export const INDICATOR_UNITS = ["%", "Qtde", "R$", "R$ mil", "H/H", "Horas", "Dias", "Ton", "Índice", "Pontos"] as const;

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
  return { name: "", unit: "%", base: "", target: "", gain: "" };
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
            gain: String(i?.gain ?? ""),
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

/** Mensagem do que falta preencher (null = válido). */
export function validateIndicatorsData(data: IndicatorsData): string | null {
  if (!data.has) return "Responda se a iniciativa possui indicador de eficácia (Sim ou Não).";
  if (data.has === "Não") {
    return data.justification.trim() ? null : "Justifique por que a iniciativa não possui indicador de eficácia.";
  }
  if (data.items.length === 0) return "Adicione ao menos um indicador de eficácia.";
  const bad = data.items.findIndex((i) => !i.name.trim() || !i.unit || i.base.trim() === "" || i.target.trim() === "");
  if (bad >= 0) return `Indicador ${bad + 1}: informe nome, unidade, ponto de partida e ponto de chegada.`;
  return null;
}
