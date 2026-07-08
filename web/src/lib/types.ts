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

export type InitiativeStatus = "A fazer" | "Em andamento" | "Concluído";

export type KanbanStage =
  | "aprovacao"
  | "despriorizados"
  | "planejamento"
  | "andamento"
  | "revisao"
  | "concluido";

export interface Initiative {
  dbId: number;
  id: string;
  area: string;
  front: string;
  initiative: string;
  owner: string;
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
  done: false,
};

export interface FilterState {
  search: string;
  status: string;
  weight: string;
  owner: string;
  area: string;
  deadline: string;
  periodStart: string;
  periodEnd: string;
}

export const EMPTY_FILTERS: FilterState = {
  search: "",
  status: "",
  weight: "",
  owner: "",
  area: "",
  deadline: "",
  periodStart: "",
  periodEnd: "",
};
