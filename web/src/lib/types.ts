export const MONTH_KEYS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
] as const;

export type MonthKey = (typeof MONTH_KEYS)[number];

export type InitiativeStatus =
  | "Não Iniciado"
  | "Em Andamento"
  | "Contínuo"
  | "Concluído"
  | "Despriorizado";

export type KanbanStage =
  | "nao_iniciado"
  | "andamento"
  | "continuo"
  | "concluido"
  | "despriorizados";

export interface Initiative {
  dbId: number;
  id: string;
  area: string;
  front: string;
  initiative: string;
  owner: string;
  backup: string;
  efficacyIndicator: string;
  description: string;
  deliveries: string;
  gainCategory: string;
  gainDescription: string;
  size: string;
  weight: string;
  status: string;
  startDate: string;
  plannedEndDate: string;
  realEndDate: string;
  deadlineDays: string;
  deadlinePercent: string;
  progressPercent: string;
  severity: string;
  urgency: string;
  strategy: string;
  priority: string;
  impediment: string;
  notes: string;
  weightedDelivery: string;
  mother: string;
  /** Preenchido pelo servidor quando a iniciativa é concluída (ISO). Não editável no formulário. */
  completedAt: string;
  completed: boolean;
  approved: boolean;
  deprioritized: boolean;
  jan: boolean;
  fev: boolean;
  mar: boolean;
  abr: boolean;
  mai: boolean;
  jun: boolean;
  jul: boolean;
  ago: boolean;
  set: boolean;
  out: boolean;
  nov: boolean;
  dez: boolean;
}

export type InitiativeInput = Omit<Initiative, "dbId" | "completedAt">;

export type TaskStatus = "A fazer" | "Em andamento" | "Concluído";

export interface Task {
  id: string;
  initiativeDbId: number | null;
  title: string;
  description: string;
  owner: string;
  status: string;
  priority: string;
  dueDate: string;
  startDate: string;
  endDate: string;
  done: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  /** Preenchido pelo servidor quando a tarefa é concluída (ISO). Não editável no formulário. */
  completedAt: string | null;
}

export type TaskInput = Omit<Task, "id" | "createdAt" | "updatedAt" | "completedAt">;

export const EMPTY_TASK: TaskInput = {
  initiativeDbId: null,
  title: "",
  description: "",
  owner: "",
  status: "A fazer",
  priority: "",
  dueDate: "",
  startDate: "",
  endDate: "",
  done: false,
};

export interface FilterState {
  search: string;
  status: string[];
  weight: string;
  size: string[];
  owner: string[];
  area: string[];
  mother: string[];
  alert: string[];
  deadline: string;
  periodStart: string;
  periodEnd: string;
  showInactive: boolean;
  /** Filtro "Concluídas em" — usa o timestamp automático de conclusão (completedAt). */
  completedPeriod: string;
  completedStart: string;
  completedEnd: string;
}

export const EMPTY_FILTERS: FilterState = {
  search: "",
  status: [],
  weight: "",
  size: [],
  owner: [],
  area: [],
  mother: [],
  alert: [],
  deadline: "",
  periodStart: "",
  periodEnd: "",
  showInactive: false,
  completedPeriod: "",
  completedStart: "",
  completedEnd: "",
};
