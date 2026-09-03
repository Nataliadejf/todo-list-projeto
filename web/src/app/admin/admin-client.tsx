"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Check, Clock, Crown, GitBranch, KeyRound, LogIn, Plus, Power, RefreshCw, ShieldOff, Trash2, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/providers/auth-provider";
import { useTodos } from "@/components/providers/todos-provider";
import { toInitiativeInput } from "@/lib/todo-utils";
import { apiApproveUser, apiListUsers, apiResetUserPassword, apiRevokeUser, apiSetUserResponsavel, apiSetUserRole, apiUsage, type AdminUserRow, type UsageMonth } from "@/lib/auth-api";
import { apiAddResponsavel, apiListResponsaveis, apiToggleResponsavel, type Responsavel } from "@/lib/responsaveis-api";
import { apiAddIndicador, apiDeleteIndicador, apiListIndicadores, apiToggleIndicador, type Indicador } from "@/lib/exec-api";
import { METAS_GLOBAIS } from "@/lib/executive-utils";

function lastMonths(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = n - 1; i >= 0; i -= 1) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

function fmtDuration(seconds: number) {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m}min`;
  return `${seconds}s`;
}

// Tempo em dias/horas de trabalho (1 dia = 8h). Ex.: 29h -> "3 dias e 5 horas".
function fmtWorkTime(seconds: number) {
  if (!seconds) return "—";
  const totalMin = Math.round(seconds / 60);
  if (totalMin < 60) return `${totalMin} min`;
  const totalHours = Math.floor(totalMin / 60);
  const days = Math.floor(totalHours / 8);
  const hours = totalHours - days * 8;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ${days === 1 ? "dia" : "dias"}`);
  if (hours > 0 || days === 0) parts.push(`${hours} ${hours === 1 ? "hora" : "horas"}`);
  return parts.join(" e ");
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
  const { todos, update } = useTodos();
  const [maeBusy, setMaeBusy] = useState<string | null>(null);
  const [maeConfirm, setMaeConfirm] = useState<string | null>(null);

  // Mães em uso (derivadas das iniciativas) + contagem de filhas.
  const maes = useMemo(() => {
    const map = new Map<string, number>();
    todos.forEach((t) => { const m = (t.mother || "").trim(); if (m) map.set(m, (map.get(m) || 0) + 1); });
    return [...map.entries()].map(([nome, filhas]) => ({ nome, filhas })).sort((a, b) => b.filhas - a.filhas);
  }, [todos]);

  // "Excluir" a mãe = remover o vínculo de todas as iniciativas que a usam.
  const deleteMae = async (nome: string) => {
    setMaeBusy(nome);
    try {
      const filhas = todos.filter((t) => (t.mother || "").trim() === nome);
      for (const t of filhas) {
        await update(t.dbId, { ...toInitiativeInput(t), mother: "" });
      }
      setMaeConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir a iniciativa mãe.");
    } finally {
      setMaeBusy(null);
    }
  };
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resps, setResps] = useState<Responsavel[]>([]);
  const [newResp, setNewResp] = useState("");
  const [respBusy, setRespBusy] = useState(false);
  const [byMonth, setByMonth] = useState<UsageMonth[]>([]);
  const [inds, setInds] = useState<Indicador[]>([]);
  const [newIndMeta, setNewIndMeta] = useState(METAS_GLOBAIS[0].key);
  const [newIndNome, setNewIndNome] = useState("");
  const [indBusy, setIndBusy] = useState(false);

  const loadUsage = useCallback(async () => {
    try {
      const res = await apiUsage();
      setByMonth(res.byMonth || []);
    } catch {
      /* ignora */
    }
  }, []);

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

  const loadInds = useCallback(async () => {
    try {
      setInds(await apiListIndicadores());
    } catch {
      /* ignora */
    }
  }, []);

  const addInd = async () => {
    const nome = newIndNome.trim();
    if (!nome) return;
    setIndBusy(true);
    try {
      await apiAddIndicador(newIndMeta, nome);
      setNewIndNome("");
      await loadInds();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao adicionar indicador.");
    } finally {
      setIndBusy(false);
    }
  };

  const toggleInd = async (it: Indicador) => {
    setIndBusy(true);
    try {
      await apiToggleIndicador(it.id);
      await loadInds();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao alterar indicador.");
    } finally {
      setIndBusy(false);
    }
  };

  const removeInd = async (it: Indicador) => {
    setIndBusy(true);
    try {
      await apiDeleteIndicador(it.id);
      await loadInds();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover indicador.");
    } finally {
      setIndBusy(false);
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
      void loadUsage();
      void loadInds();
    } else {
      setLoading(false);
    }
  }, [isAdmin, load, loadResps, loadUsage, loadInds]);

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

  const activeRespNames = useMemo(() => resps.filter((r) => r.active).map((r) => r.name), [resps]);
  const respOptions = (current: string) =>
    current && !activeRespNames.includes(current) ? [current, ...activeRespNames] : activeRespNames;

  const setUserResp = async (u: AdminUserRow, value: string) => {
    setBusyId(u.id);
    try {
      await apiSetUserResponsavel(u.id, value);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao vincular responsável.");
    } finally {
      setBusyId(null);
    }
  };

  const setRole = async (u: AdminUserRow, role: "admin" | "user") => {
    setBusyId(u.id);
    try {
      await apiSetUserRole(u.id, role);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao alterar o papel.");
    } finally {
      setBusyId(null);
    }
  };

  const pending = useMemo(() => rows.filter((r) => r.status === "pending").length, [rows]);

  const totals = useMemo(() => {
    const activeUsers = rows.filter((r) => r.sessions > 0).length;
    const totalAccesses = rows.reduce((s, r) => s + (r.sessions || 0), 0);
    const totalSeconds = rows.reduce((s, r) => s + (r.totalSeconds || 0), 0);
    return { activeUsers, totalAccesses, totalSeconds };
  }, [rows]);

  const chartData = useMemo(() => {
    const map = new Map(byMonth.map((m) => [m.month, m]));
    return lastMonths(12).map((ym) => {
      const found = map.get(ym);
      const [y, mo] = ym.split("-");
      return { label: `${mo}/${y.slice(2)}`, acessos: found ? found.accesses : 0 };
    });
  }, [byMonth]);

  const topUser = useMemo(() => {
    const withUse = rows.filter((r) => r.sessions > 0);
    if (withUse.length === 0) return null;
    return withUse.reduce((a, b) => (b.totalSeconds > a.totalSeconds ? b : a));
  }, [rows]);

  const userChart = useMemo(
    () =>
      rows
        .filter((r) => r.sessions > 0)
        .sort((a, b) => b.totalSeconds - a.totalSeconds)
        .slice(0, 12)
        .map((u) => ({
          name: (u.name || u.email || "—").split(" ")[0],
          horas: Math.round((u.totalSeconds / 3600) * 10) / 10,
        })),
    [rows],
  );

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
        <CardHeader>
          <CardTitle>Dashboard de Uso</CardTitle>
          <p className="text-sm text-slate-500">Acessos e tempo de uso a partir das sessões de login.</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 p-4 text-white">
              <p className="flex items-center gap-2 text-xs font-semibold opacity-90"><Users className="h-4 w-4" />Usuários ativos</p>
              <p className="mt-1 text-3xl font-bold">{totals.activeUsers}</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 p-4 text-white">
              <p className="flex items-center gap-2 text-xs font-semibold opacity-90"><LogIn className="h-4 w-4" />Total de acessos</p>
              <p className="mt-1 text-3xl font-bold">{totals.totalAccesses}</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 p-4 text-white">
              <p className="flex items-center gap-2 text-xs font-semibold opacity-90"><Clock className="h-4 w-4" />Tempo total</p>
              <p className="mt-1 text-2xl font-bold">{fmtWorkTime(totals.totalSeconds)}</p>
              <p className="text-[11px] opacity-80">1 dia = 8h de trabalho</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 p-4 text-white">
              <p className="flex items-center gap-2 text-xs font-semibold opacity-90"><Crown className="h-4 w-4" />Quem mais usa</p>
              <p className="mt-1 truncate text-lg font-bold" title={topUser ? topUser.email : ""}>
                {topUser ? topUser.email.split("@")[0] : "—"}
              </p>
              <p className="text-[11px] opacity-90">{topUser ? fmtWorkTime(topUser.totalSeconds) : ""}</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Acessos por mês (12 meses)</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="acessos" name="Acessos" fill="#2563eb" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Uso por usuário (horas)</p>
              <div className="h-56">
                {userChart.length === 0 ? (
                  <p className="py-16 text-center text-sm text-slate-400">Sem dados de uso ainda.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={userChart} margin={{ top: 8, right: 8, left: 0, bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" height={50} />
                      <YAxis tick={{ fontSize: 11 }} unit=" h" />
                      <Tooltip />
                      <Bar dataKey="horas" name="Horas de uso" fill="#10b981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="min-w-full text-left text-sm">
            <thead className="border-y border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Papel</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Responsável (iniciativas)</th>
                <th className="px-4 py-3">Acessos</th>
                <th className="px-4 py-3">Tempo total</th>
                <th className="px-4 py-3">Média/sessão</th>
                <th className="px-4 py-3">Último acesso</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-slate-500">Carregando...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-slate-500">Nenhum usuário.</td></tr>
              ) : (
                rows.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-medium text-slate-800">{u.name || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <select
                        className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                        value={u.role === "admin" ? "admin" : "user"}
                        disabled={busyId === u.id}
                        onChange={(e) => void setRole(u, e.target.value as "admin" | "user")}
                        title="Papel do usuário"
                      >
                        <option value="user">Usuário</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusBadge(u.status)}>{statusLabel[u.status] || u.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                        value={u.responsavel || ""}
                        disabled={busyId === u.id}
                        onChange={(e) => void setUserResp(u, e.target.value)}
                        title="Responsável usado nas iniciativas deste usuário"
                      >
                        <option value="">— (nenhum)</option>
                        {respOptions(u.responsavel).map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">{u.sessions}</td>
                    <td className="px-4 py-3">{fmtWorkTime(u.totalSeconds)}</td>
                    <td className="px-4 py-3">{u.sessions > 0 ? fmtDuration(Math.round(u.totalSeconds / u.sessions)) : "—"}</td>
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

      <Card>
        <CardHeader>
          <CardTitle>Indicadores (Visão Executiva)</CardTitle>
          <p className="text-sm text-slate-500">
            Tipos de indicador por meta global. A Visão Executiva usa esta lista; a unidade e o alvo são definidos lá.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <select
              value={newIndMeta}
              onChange={(e) => setNewIndMeta(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              {METAS_GLOBAIS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
            <div className="w-full max-w-xs">
              <Input
                value={newIndNome}
                onChange={(e) => setNewIndNome(e.target.value)}
                placeholder="Nome do indicador (ex.: EBITDA)"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void addInd(); } }}
              />
            </div>
            <Button onClick={() => void addInd()} disabled={indBusy || !newIndNome.trim()}>
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {METAS_GLOBAIS.map((m) => {
              const items = inds.filter((i) => i.metaGlobal === m.key);
              return (
                <div key={m.key} className="rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: m.accent }} />
                    <span className="text-sm font-bold text-slate-800">{m.label}</span>
                    <span className="ml-auto text-xs text-slate-400">{items.length}</span>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {items.length === 0 ? (
                      <li className="px-4 py-4 text-center text-xs text-slate-400">Nenhum indicador.</li>
                    ) : items.map((it) => (
                      <li key={it.id} className="flex items-center justify-between gap-2 px-4 py-2">
                        <span className={`text-sm ${it.active ? "text-slate-700" : "text-slate-400 line-through"}`}>{it.nome}</span>
                        <span className="flex items-center gap-1">
                          <Button variant={it.active ? "secondary" : "default"} size="sm" className="h-7 text-xs" disabled={indBusy} onClick={() => void toggleInd(it)}>
                            {it.active ? "Inativar" : "Ativar"}
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-rose-600" disabled={indBusy} onClick={() => void removeInd(it)} title="Remover">✕</Button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Iniciativas Mãe</CardTitle>
          <p className="text-sm text-slate-500">
            Excluir uma mãe remove o vínculo de todas as iniciativas que a usam — as iniciativas permanecem, apenas ficam sem mãe.
          </p>
        </CardHeader>
        <CardContent>
          {maes.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
              Nenhuma iniciativa mãe em uso.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {maes.map((m) => (
                <li key={m.nome} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    <GitBranch className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="truncate font-medium text-slate-800">{m.nome}</span>
                    <Badge variant="default">{m.filhas} {m.filhas === 1 ? "filha" : "filhas"}</Badge>
                  </span>
                  {maeConfirm === m.nome ? (
                    <span className="flex items-center gap-1">
                      <Button variant="destructive" size="sm" className="h-8 text-xs" disabled={maeBusy === m.nome} onClick={() => void deleteMae(m.nome)}>
                        {maeBusy === m.nome ? "Excluindo…" : "Confirmar exclusão"}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 text-xs" disabled={maeBusy === m.nome} onClick={() => setMaeConfirm(null)}>Cancelar</Button>
                    </span>
                  ) : (
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-rose-600" onClick={() => setMaeConfirm(m.nome)}>
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
