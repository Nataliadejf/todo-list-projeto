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

export interface Indicador {
  id: string;
  metaGlobal: string;
  nome: string;
  active: boolean;
}

/** Uma iniciativa participando de um indicador na Visão Executiva. */
export interface ExecEntry {
  key: string; // id local estável do lançamento
  initiativeDbId: number | null;
  metaGlobal: string;
  indicadorId: string;
  unidade: string;
  contrib: number;
  conf: number;
}

/** Alvo do período por grupo (meta::indicador::unidade). */
export interface ExecTarget { base: number; alvo: number }

export interface ExecPlan {
  targets: Record<string, ExecTarget>;
  entries: ExecEntry[];
}

// ---- Indicadores ----
export const fetchIndicadores = () => request<Indicador[]>("/api/indicadores");
export const apiListIndicadores = () => request<Indicador[]>("/api/admin/indicadores");
export const apiAddIndicador = (metaGlobal: string, nome: string) =>
  request<Indicador>("/api/admin/indicadores", { method: "POST", body: JSON.stringify({ metaGlobal, nome }) });
export const apiToggleIndicador = (id: string) =>
  request<Indicador>(`/api/admin/indicadores/${id}/toggle`, { method: "POST" });
export const apiDeleteIndicador = (id: string) =>
  request<null>(`/api/admin/indicadores/${id}`, { method: "DELETE" });

// ---- Plano executivo ----
export const getExecPlan = () => request<ExecPlan>("/api/exec-plan");
export const saveExecPlan = (plan: ExecPlan) =>
  request<{ ok: boolean }>("/api/exec-plan", { method: "PUT", body: JSON.stringify(plan) });
