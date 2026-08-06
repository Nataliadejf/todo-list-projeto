import type { MonthKey } from "./types";

export const BRAND = {
  name: "GHT",
  subtitle: "PLANEJAMENTO ESTRATÉGICO",
  appTitle: "Portfólio",
  connectionLabel: "Conectado ao SQLite",
  version: "MVP v4.0 — Live Database",
} as const;

export const NAV_ITEMS = [
  { href: "/portfolio", label: "Portfólio", icon: "folder" as const },
  { href: "/projetos", label: "Projetos", icon: "rocket" as const },
  { href: "/iniciativas", label: "Iniciativas", icon: "list" as const },
  { href: "/tarefas", label: "Tarefas", icon: "check" as const },
] as const;

export const TASK_STATUS_OPTIONS = [
  { value: "A fazer", label: "A fazer" },
  { value: "Em andamento", label: "Em andamento" },
  { value: "Concluído", label: "Concluído" },
] as const;

export const TASK_PRIORITY_OPTIONS = [
  { value: "", label: "Sem prioridade" },
  { value: "Alta", label: "Alta" },
  { value: "Média", label: "Média" },
  { value: "Baixa", label: "Baixa" },
] as const;

export const LABEL_MAP: Record<string, string> = {
  id: "ID",
  area: "Área",
  front: "Frente",
  initiative: "Iniciativa",
  owner: "Responsável",
  backup: "Backup (Responsável)",
  efficacyIndicator: "Indicador de Eficácia (acompanhamento)",
  description: "Descrição (Breve Descritivo)",
  deliveries: "Entregas",
  gainCategory: "Categoria Ganho",
  gainDescription: "Descritivo dos Ganhos da iniciativa",
  size: "Tam",
  weight: "Peso",
  status: "Status",
  startDate: "Data Início",
  plannedEndDate: "Data Previsão de Fim",
  realEndDate: "Data Fim Real",
  deadlineDays: "Prazo Dias",
  deadlinePercent: "% Prazo",
  progressPercent: "% Conclusão",
  severity: "Gravidade",
  urgency: "Urgência",
  strategy: "Estratégia",
  priority: "Prioridade",
  impediment: "Impedimento",
  notes: "Observação",
  weightedDelivery: "Entrega Ponderada2",
};

export const EDITABLE_KEYS = [
  "id",
  "area",
  "front",
  "initiative",
  "owner",
  "backup",
  "efficacyIndicator",
  "description",
  "deliveries",
  "gainCategory",
  "gainDescription",
  "size",
  "status",
  "startDate",
  "plannedEndDate",
  "realEndDate",
  "deadlineDays",
  "progressPercent",
  "severity",
  "urgency",
  "strategy",
  "priority",
  "impediment",
  "notes",
  "weightedDelivery",
] as const;

export const MONTH_LABELS: Record<MonthKey, string> = {
  jan: "Jan",
  fev: "Fev",
  mar: "Mar",
  abr: "Abr",
  mai: "Mai",
  jun: "Jun",
  jul: "Jul",
  ago: "Ago",
  set: "Set",
  out: "Out",
  nov: "Nov",
  dez: "Dez",
};

export const STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "Não Iniciado", label: "Não Iniciado" },
  { value: "Em Andamento", label: "Em Andamento" },
  { value: "Concluído", label: "Concluído" },
  { value: "Despriorizado", label: "Despriorizado" },
] as const;

export const WEIGHT_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "5", label: "Alta (5)" },
  { value: "3", label: "Média (3)" },
  { value: "1", label: "Baixa (1)" },
] as const;

// ---- Listas oficiais (Planilha de Acompanhamento V4 — aba Apoio) ----
export const AREA_OPTIONS = ["Processos", "Projetos", "Adm Vendas", "Planej Estrat"] as const;

export const RESPONSAVEL_OPTIONS = [
  "Beatriz Cavalcante", "Bruno Fernandes", "Georgia Leite", "Larissa Lande", "Marcelo Araújo",
  "Thainá Morais", "Thais Paixão", "Vitor Moraes", "Vitoria Ferreira", "Carlos Merigo",
  "André Pascoal", "Natalia de Jesus Franca", "Gabriel Gopfert", "Aline Saito", "Carlos Freires", "Backlog",
] as const;

export const CATEGORIA_GANHO_OPTIONS = [
  "Governança (informações / indicadores/ padronização/ rastreabilidade)",
  "Produtividade / Eficiência Operacional",
  "Financeiro (aumento receita / redução de despesas / custo evitado)",
  "Governança (Adequação norma ISO)",
  "ESG / Compliance",
  "Experiência do Cliente",
  "Atividade de Impacto",
] as const;

export const TAMANHO_OPTIONS = ["PP", "P", "M", "G", "GG"] as const;
export const GUT_OPTIONS = ["1", "3", "5"] as const;
export const SIM_NAO_OPTIONS = ["Sim", "Não"] as const;
export const INITIATIVE_STATUS_OPTIONS = [
  "Não Iniciado", "Em Andamento", "Concluído", "Despriorizado",
] as const;

export const DEADLINE_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "overdue", label: "Atrasados" },
  { value: "month", label: "Este mês" },
  { value: "quarter", label: "Próx. 3 meses" },
  { value: "year", label: "Este ano" },
] as const;

export const KANBAN_COLUMNS = [
  { id: "nao_iniciado", title: "Não Iniciado", dotClass: "bg-blue-500" },
  { id: "andamento", title: "Em Andamento", dotClass: "bg-amber-400" },
  { id: "concluido", title: "Concluído", dotClass: "bg-emerald-500" },
  { id: "despriorizados", title: "Despriorizado", dotClass: "bg-slate-400" },
] as const;
