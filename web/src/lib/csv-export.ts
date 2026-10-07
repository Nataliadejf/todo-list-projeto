import { EDITABLE_KEYS, LABEL_MAP } from "./constants";
import { indicatorResult, parseIndicatorsData } from "./indicators";
import type { Initiative, Task } from "./types";

const EXPORT_KEYS = EDITABLE_KEYS;

const ptNumber = (n: number) => String(n).replace(".", ",");

// Colunas dos indicadores de eficácia: resposta, justificativa e N indicadores (N = maior quantidade entre as iniciativas).
function indicatorHeaders(maxItems: number): string[] {
  const headers = ["Possui indicador de eficácia?", "Justificativa (sem indicador)"];
  for (let i = 1; i <= maxItems; i += 1) {
    headers.push(
      `Indicador ${i} - Nome`, `Indicador ${i} - Unidade`, `Indicador ${i} - Direção`,
      `Indicador ${i} - Ponto de partida`, `Indicador ${i} - Ponto de chegada`, `Indicador ${i} - Realizado`,
      `Indicador ${i} - Ganho / retorno`, `Indicador ${i} - % da meta`, `Indicador ${i} - Memória de cálculo`,
    );
  }
  return headers;
}

function indicatorCells(todo: Initiative, maxItems: number): string[] {
  const data = parseIndicatorsData(todo.indicatorsData);
  const cells = [data.has, data.has === "Não" ? data.justification : ""];
  for (let i = 0; i < maxItems; i += 1) {
    const item = data.has === "Sim" ? data.items[i] : undefined;
    if (!item) {
      cells.push("", "", "", "", "", "", "", "", "");
      continue;
    }
    const result = indicatorResult(item);
    cells.push(
      item.name, item.unit, item.direction === "menor" ? "Menor é melhor" : "Maior é melhor",
      item.base, item.target, item.achieved,
      result ? ptNumber(result.gain) : "", result?.pct != null ? ptNumber(result.pct) : "",
      item.memory,
    );
  }
  return cells;
}

function escapeCsvCell(value: unknown) {
  const s = String(value ?? "");
  if (/[;\r\n"]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function headerLabel(key: string) {
  return LABEL_MAP[key] ?? key;
}

function cellValue(todo: Initiative, key: string) {
  return todo[key as keyof Initiative] ?? "";
}

function triggerDownload(csv: string, prefix: string) {
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  anchor.download = `${prefix}-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

const TASK_HEADERS = [
  "Iniciativa",
  "ID Iniciativa",
  "Responsável",
  "Tarefa",
  "Descrição",
  "Status",
  "Prioridade",
  "Início",
  "Término",
  "Prazo",
  "Concluída",
  "Criada em",
];

export function downloadTasksCsv(tasks: Task[], initiativeName: Map<number, string>) {
  const headerLine = TASK_HEADERS.map((h) => escapeCsvCell(h)).join(";");
  const dataLines = tasks.map((task) => {
    const initiative = task.initiativeDbId != null ? initiativeName.get(task.initiativeDbId) ?? "" : "";
    return [
      initiative,
      task.initiativeDbId ?? "",
      task.owner,
      task.title,
      task.description,
      task.status,
      task.priority,
      task.startDate,
      task.endDate,
      task.dueDate,
      task.done ? "Sim" : "Não",
      task.createdAt ? new Date(task.createdAt).toLocaleString("pt-BR") : "",
    ]
      .map((cell) => escapeCsvCell(cell))
      .join(";");
  });
  triggerDownload([headerLine, ...dataLines].join("\r\n"), "tarefas");
}

export function downloadInitiativesCsv(todos: Initiative[]) {
  const maxItems = Math.max(1, ...todos.map((t) => parseIndicatorsData(t.indicatorsData).items.length));
  const headerLine = [...EXPORT_KEYS.map((key) => headerLabel(key)), ...indicatorHeaders(maxItems)]
    .map((h) => escapeCsvCell(h))
    .join(";");
  const dataLines = todos.map((todo) =>
    [...EXPORT_KEYS.map((key) => cellValue(todo, key)), ...indicatorCells(todo, maxItems)]
      .map((cell) => escapeCsvCell(cell))
      .join(";"),
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
