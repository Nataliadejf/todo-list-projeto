import type { Initiative, InitiativeInput } from "./types";
import { normalizeInitiative } from "./todo-utils";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const text = await response.text();

  if (!response.ok) {
    let message = `Erro na API (${response.status})`;
    if (text) {
      try {
        const body = JSON.parse(text) as { error?: string };
        if (body.error) message = body.error;
      } catch {
        message = text.slice(0, 200);
      }
    }
    throw new Error(message);
  }

  if (response.status === 204 || !text) {
    return null as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Resposta inválida do servidor. Verifique se a API está configurada.");
  }
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
  if (!created) throw new Error("Servidor não retornou a iniciativa criada.");
  return normalizeInitiative(created);
}

export async function updateInitiative(dbId: number, payload: InitiativeInput): Promise<Initiative> {
  const updated = await request<Initiative>(`/api/todos/${dbId}`, {
    method: "PUT",
    body: JSON.stringify(normalizeInitiative(payload)),
  });
  if (!updated) throw new Error("Servidor não retornou a iniciativa atualizada.");
  return normalizeInitiative(updated);
}

export async function deleteInitiative(dbId: number): Promise<void> {
  await request<void>(`/api/todos/${dbId}`, { method: "DELETE" });
}
