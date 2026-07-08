import type { Task, TaskInput } from "./types";

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

export async function fetchTasks(initiativeDbId?: number | null): Promise<Task[]> {
  const query = initiativeDbId != null ? `?initiativeDbId=${initiativeDbId}` : "";
  const rows = await request<Task[]>(`/api/tasks${query}`);
  return rows ?? [];
}

export async function createTask(payload: TaskInput): Promise<Task> {
  const created = await request<Task>("/api/tasks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!created) throw new Error("Servidor não retornou a tarefa criada.");
  return created;
}

export async function updateTask(id: string, payload: TaskInput): Promise<Task> {
  const updated = await request<Task>(`/api/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  if (!updated) throw new Error("Servidor não retornou a tarefa atualizada.");
  return updated;
}

export async function deleteTask(id: string): Promise<void> {
  await request<void>(`/api/tasks/${id}`, { method: "DELETE" });
}
