export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
}

export interface AdminUserRow extends AuthUser {
  createdAt: string | null;
  sessions: number;
  totalSeconds: number;
  lastLogin: string | null;
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

export function apiLogin(email: string, password: string) {
  return request<{ user: AuthUser }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function apiRegister(name: string, email: string, password: string) {
  return request<{ ok: boolean; pending: boolean }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export function apiLogout() {
  return request<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
}

export function apiMe() {
  return request<{ user: AuthUser }>("/api/auth/me");
}

export function apiHeartbeat() {
  return request<{ ok: boolean }>("/api/auth/heartbeat", { method: "POST" });
}

export function apiListUsers() {
  return request<AdminUserRow[]>("/api/admin/users");
}

export function apiApproveUser(id: string) {
  return request<AuthUser>(`/api/admin/users/${id}/approve`, { method: "POST" });
}

export function apiRevokeUser(id: string) {
  return request<AuthUser>(`/api/admin/users/${id}/revoke`, { method: "POST" });
}
