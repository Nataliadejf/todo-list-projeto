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
  | "Concluído"
  | "Despriorizado";

export type KanbanStage =
  | "nao_iniciado"
  | "andamento"
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

export type InitiativeInput = Omit<Initiative, "dbId">;

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
}

export type TaskInput = Omit<Task, "id" | "createdAt" | "updatedAt">;

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
  deadline: string;
  periodStart: string;
  periodEnd: string;
  showInactive: boolean;
}

export const EMPTY_FILTERS: FilterState = {
  search: "",
  status: [],
  weight: "",
  size: [],
  owner: [],
  area: [],
  deadline: "",
  periodStart: "",
  periodEnd: "",
  showInactive: false,
};
