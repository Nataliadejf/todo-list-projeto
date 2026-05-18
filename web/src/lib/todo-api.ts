import type { Initiative, InitiativeInput } from "./types";
import { normalizeInitiative } from "./todo-utils";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!response.ok) {
    throw new Error(`Erro na API (${response.status})`);
  }
  if (response.status === 204) return null as T;
  return response.json() as Promise<T>;
}

export async function fetchInitiatives(): Promise<Initiative[]> {
  const rows = await request<Initiative[]>("/api/todos");
  return rows.map((row) => normalizeInitiative(row));
}

export async function createInitiative(payload: InitiativeInput): Promise<Initiative> {
  const created = await request<Initiative>("/api/todos", {
    method: "POST",
    body: JSON.stringify(normalizeInitiative(payload)),
  });
  return normalizeInitiative(created);
}

export async function updateInitiative(dbId: number, payload: InitiativeInput): Promise<Initiative> {
  const updated = await request<Initiative>(`/api/todos/${dbId}`, {
    method: "PUT",
    body: JSON.stringify(normalizeInitiative(payload)),
  });
  return normalizeInitiative(updated);
}

export async function deleteInitiative(dbId: number): Promise<void> {
  await request<void>(`/api/todos/${dbId}`, { method: "DELETE" });
}
