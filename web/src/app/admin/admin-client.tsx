"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, KeyRound, Plus, Power, RefreshCw, ShieldOff } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/providers/auth-provider";
import { apiApproveUser, apiListUsers, apiResetUserPassword, apiRevokeUser, type AdminUserRow } from "@/lib/auth-api";
import { apiAddResponsavel, apiListResponsaveis, apiToggleResponsavel, type Responsavel } from "@/lib/responsaveis-api";

function fmtDuration(seconds: number) {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m}min`;
  return `${seconds}s`;
}

function fmtDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("pt-BR");
}

function statusBadge(status: string): "success" | "warning" | "danger" | "default" {
  if (status === "approved") return "success";
  if (status === "pending") return "warning";
  if (status === "revoked") return "danger";
  return "default";
}

const statusLabel: Record<string, string> = {
  approved: "Aprovado",
  pending: "Pendente",
  revoked: "Revogado",
};

export function AdminClient() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resps, setResps] = useState<Responsavel[]>([]);
  const [newResp, setNewResp] = useState("");
  const [respBusy, setRespBusy] = useState(false);

  const loadResps = useCallback(async () => {
    try {
      setResps(await apiListResponsaveis());
    } catch {
      /* ignora */
    }
  }, []);

  const addResp = async () => {
    const name = newResp.trim();
    if (!name) return;
    setRespBusy(true);
    try {
      await apiAddResponsavel(name);
      setNewResp("");
      await loadResps();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao adicionar responsável.");
    } finally {
      setRespBusy(false);
    }
  };

  const toggleResp = async (r: Responsavel) => {
    setRespBusy(true);
    try {
      await apiToggleResponsavel(r.id);
      await loadResps();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao alterar responsável.");
    } finally {
      setRespBusy(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await apiListUsers());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar usuários.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void load();
      void loadResps();
    } else {
      setLoading(false);
    }
  }, [isAdmin, load, loadResps]);

  const act = async (id: string, action: "approve" | "revoke") => {
    setBusyId(id);
    try {
      if (action === "approve") await apiApproveUser(id);
      else await apiRevokeUser(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro na ação.");
    } finally {
      setBusyId(null);
    }
  };

  const resetPassword = async (u: AdminUserRow) => {
    const pwd = typeof window !== "undefined" ? window.prompt(`Nova senha para ${u.email} (mín. 6 caracteres):`) : null;
    if (pwd == null) return;
    if (pwd.length < 6) {
      setError("A senha deve ter ao menos 6 caracteres.");
      return;
    }
    setBusyId(u.id);
    try {
      await apiResetUserPassword(u.id, pwd);
      setError(null);
      if (typeof window !== "undefined") window.alert(`Senha de ${u.email} redefinida com sucesso.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao redefinir a senha.");
    } finally {
      setBusyId(null);
    }
  };

  const pending = useMemo(() => rows.filter((r) => r.status === "pending").length, [rows]);

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-slate-500">
          Acesso restrito ao administrador.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administração"
        subtitle={`${rows.length} usuários · ${pending} pendente(s) de aprovação`}
        showNewButton={false}
      />

      <div className="flex justify-end">
        <Button variant="secondary" onClick={() => void load()} disabled={loading}>
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="min-w-full text-left text-sm">
            <thead className="border-y border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Papel</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Acessos</th>
                <th className="px-4 py-3">Tempo total</th>
                <th className="px-4 py-3">Último acesso</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">Carregando...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">Nenhum usuário.</td></tr>
              ) : (
                rows.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-medium text-slate-800">{u.name || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="px-4 py-3">{u.role === "admin" ? "Admin" : "Usuário"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusBadge(u.status)}>{statusLabel[u.status] || u.status}</Badge>
                    </td>
                    <td className="px-4 py-3">{u.sessions}</td>
                    <td className="px-4 py-3">{fmtDuration(u.totalSeconds)}</td>
                    <td className="px-4 py-3 text-slate-600">{fmtDate(u.lastLogin)}</td>
                    <td className="px-4 py-3">
                      {u.role === "admin" ? (
                        <span className="text-xs text-slate-400">—</span>
                      ) : (
                        <div className="flex gap-1">
                          {u.status !== "approved" ? (
                            <Button size="sm" className="h-8 text-xs" disabled={busyId === u.id} onClick={() => void act(u.id, "approve")}>
                              <Check className="h-3.5 w-3.5" />
                              Aprovar
                            </Button>
                          ) : null}
                          {u.status === "approved" ? (
                            <Button size="sm" variant="destructive" className="h-8 text-xs" disabled={busyId === u.id} onClick={() => void act(u.id, "revoke")}>
                              <ShieldOff className="h-3.5 w-3.5" />
                              Revogar
                            </Button>
                          ) : null}
                          <Button size="sm" variant="secondary" className="h-8 text-xs" disabled={busyId === u.id} onClick={() => void resetPassword(u)}>
                            <KeyRound className="h-3.5 w-3.5" />
                            Redefinir senha
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Responsáveis</CardTitle>
          <p className="text-sm text-slate-500">
            Responsáveis inativos somem da seleção de novas iniciativas, mas o histórico é preservado.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-full max-w-xs">
              <Input
                value={newResp}
                onChange={(e) => setNewResp(e.target.value)}
                placeholder="Nome do novo responsável"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void addResp();
                  }
                }}
              />
            </div>
            <Button onClick={() => void addResp()} disabled={respBusy || !newResp.trim()}>
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>

          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {resps.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-slate-500">Nenhum responsável cadastrado.</li>
            ) : (
              resps.map((r) => (
                <li key={r.id} className="flex items-center justify-between px-4 py-2.5">
                  <span className="flex items-center gap-2 text-sm">
                    <span className={r.active ? "text-slate-800" : "text-slate-400 line-through"}>{r.name}</span>
                    <Badge variant={r.active ? "success" : "default"}>{r.active ? "Ativo" : "Inativo"}</Badge>
                  </span>
                  <Button
                    variant={r.active ? "secondary" : "default"}
                    size="sm"
                    className="h-8 text-xs"
                    disabled={respBusy}
                    onClick={() => void toggleResp(r)}
                  >
                    <Power className="h-3.5 w-3.5" />
                    {r.active ? "Inativar" : "Ativar"}
                  </Button>
                </li>
              ))
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
