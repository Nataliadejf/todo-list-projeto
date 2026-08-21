/**
 * Visão Executiva — modelo por META GLOBAL → INDICADOR → iniciativas.
 * As 5 metas globais são fixas (empresa). Os indicadores de cada meta são
 * cadastrados pelos admins. A unidade é escolhida por iniciativa na tela.
 * Consolidação por indicador + unidade.
 */

export interface MetaGlobal { key: string; label: string; accent: string }

export const METAS_GLOBAIS: MetaGlobal[] = [
  { key: "lucratividade", label: "Lucratividade", accent: "#1FA15B" },
  { key: "horizontalizacao", label: "Horizontalização", accent: "#2563EB" },
  { key: "inovacao", label: "Inovação e Processo", accent: "#7C3AED" },
  { key: "pessoas", label: "Gestão de Pessoas", accent: "#D97706" },
  { key: "internacionalizacao", label: "Internacionalização", accent: "#0891B2" },
];

export const META_BY_KEY: Record<string, MetaGlobal> = Object.fromEntries(METAS_GLOBAIS.map((m) => [m.key, m]));

export const UNITS = ["%", "Qtde", "R$", "R$ mil", "H/H", "Dias", "Ton", "Índice", "Pontos"] as const;
