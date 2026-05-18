import { EDITABLE_KEYS, LABEL_MAP, MONTH_LABELS } from "./constants";
import { MONTH_KEYS, type Initiative } from "./types";

const EXPORT_KEYS = [...EDITABLE_KEYS, ...MONTH_KEYS, "completed"] as const;

function escapeCsvCell(value: unknown) {
  const s = String(value ?? "");
  if (/[;\r\n"]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function headerLabel(key: string) {
  if (LABEL_MAP[key]) return LABEL_MAP[key];
  if (key in MONTH_LABELS) return `Mês ${MONTH_LABELS[key as keyof typeof MONTH_LABELS]}`;
  if (key === "completed") return "Marcado concluído";
  return key;
}

function cellValue(todo: Initiative, key: string) {
  if ((MONTH_KEYS as readonly string[]).includes(key)) return todo[key as keyof Initiative] ? "Sim" : "Não";
  if (key === "completed") return todo.completed ? "Sim" : "Não";
  return todo[key as keyof Initiative] ?? "";
}

export function downloadInitiativesCsv(todos: Initiative[]) {
  const headerLine = EXPORT_KEYS.map((key) => escapeCsvCell(headerLabel(key))).join(";");
  const dataLines = todos.map((todo) =>
    EXPORT_KEYS.map((key) => escapeCsvCell(cellValue(todo, key))).join(";"),
  );
  const csv = `\uFEFF${[headerLine, ...dataLines].join("\r\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  anchor.download = `iniciativas-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
