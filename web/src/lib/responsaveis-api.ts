export interface Responsavel {
  id: string;
  name: string;
  active: boolean;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const text = await response.text();
  if (!response.ok) {
    let message = `Erro (${response.status})`;
    try {
      const body = JSON.parse(text) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      if (text) message = text.slice(0, 200);
    }
    throw new Error(message);
  }
  return (text ? JSON.parse(text) : null) as T;
}

export function fetchResponsaveis() {
  return request<string[]>("/api/responsaveis");
}

export function apiListResponsaveis() {
  return request<Responsavel[]>("/api/admin/responsaveis");
}

export function apiAddResponsavel(name: string) {
  return request<Responsavel>("/api/admin/responsaveis", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function apiToggleResponsavel(id: string) {
  return request<Responsavel>(`/api/admin/responsaveis/${id}/toggle`, { method: "POST" });
}
