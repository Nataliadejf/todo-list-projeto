"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, BarChart3, CheckCircle2, ClipboardList, Search, Target, User } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { SelectField } from "@/components/ui/select-field";
import { useTodos } from "@/components/providers/todos-provider";
import { useResponsaveis } from "@/components/providers/responsaveis-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { hideInactiveOwners } from "@/lib/todo-utils";
import { summarizeIndicators, type IndicatorRow, type IndicatorState } from "@/lib/indicators-summary";
import { cn } from "@/lib/utils";

const nf = (n: number | null, digits = 1) =>
  n === null ? "—" : n.toLocaleString("pt-BR", { maximumFractionDigits: digits });

const STATE_LABEL: Record<IndicatorState, { label: string; className: string }> = {
  atingida: { label: "Meta atingida", className: "bg-emerald-50 text-emerald-700" },
  parcial: { label: "Em evolução", className: "bg-amber-50 text-amber-700" },
  sem_realizado: { label: "Sem realizado", className: "bg-slate-100 text-slate-500" },
};

export function IndicadoresClient() {
  const { todos } = useTodos();
  const { inactiveNames } = useResponsaveis();
  const { isAdmin } = useAuth();

  const [owners, setOwners] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [situacao, setSituacao] = useState<"" | IndicatorState>("");

  const base = useMemo(() => (isAdmin ? todos : hideInactiveOwners(todos, inactiveNames)), [todos, isAdmin, inactiveNames]);
  const ownerOptions = useMemo(
    () => [...new Set(base.map((t) => t.owner?.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [base],
  );
  const scoped = useMemo(
    () => (owners.length ? base.filter((t) => owners.some((o) => o.toLowerCase() === (t.owner || "").trim().toLowerCase())) : base),
    [base, owners],
  );
  const s = useMemo(() => summarizeIndicators(scoped), [scoped]);

  const q = search.trim().toLowerCase();
  const rows = useMemo(
    () =>
      s.rows.filter((r) => {
        if (situacao && r.state !== situacao) return false;
        if (q && !`${r.name} ${r.initiative} ${r.owner}`.toLowerCase().includes(q)) return false;
        return true;
      }),
    [s.rows, q, situacao],
  );
  const groups = useMemo(
    () => (q ? s.groups.filter((g) => g.name.toLowerCase().includes(q)) : s.groups),
    [s.groups, q],
  );

  const coverage = [
    { key: "sim", label: "Com indicador", value: s.sim, color: "bg-emerald-500" },
    { key: "nao", label: "Sem indicador (justificado)", value: s.nao, color: "bg-amber-400" },
    { key: "pend", label: "Sem resposta", value: s.semResposta, color: "bg-slate-300" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Indicadores"
        subtitle="Consolidação dos indicadores de eficácia cadastrados nas iniciativas: cobertura, evolução frente à meta e pendências de preenchimento."
        showNewButton={false}
      />

      {/* Filtros */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MultiSelect
            label="Responsável"
            icon={<User className="h-4 w-4" />}
            options={ownerOptions}
            value={owners}
            onChange={setOwners}
            placeholder="Todos"
          />
          <SelectField
            label="Situação do indicador"
            icon={<Target className="h-4 w-4" />}
            value={situacao}
            onChange={(e) => setSituacao(e.target.value as "" | IndicatorState)}
          >
            <option value="">Todas</option>
            <option value="atingida">Meta atingida</option>
            <option value="parcial">Em evolução</option>
            <option value="sem_realizado">Sem realizado</option>
          </SelectField>
          <label className="block space-y-1.5">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">Buscar</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-9" placeholder="Indicador, iniciativa ou responsável" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </label>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi icon={<ClipboardList className="h-4 w-4" />} label="Cobertura" value={`${s.coberturaPct}%`} note={`${s.sim} de ${s.totalIniciativas} iniciativas têm indicador`} accent="bg-blue-500" />
        <Kpi icon={<BarChart3 className="h-4 w-4" />} label="Indicadores" value={String(s.totalIndicadores)} note="cadastrados nas iniciativas" accent="bg-indigo-500" />
        <Kpi icon={<CheckCircle2 className="h-4 w-4" />} label="Com realizado" value={String(s.comRealizado)} note={`${s.totalIndicadores - s.comRealizado} ainda sem resultado`} accent="bg-cyan-500" />
        <Kpi icon={<Target className="h-4 w-4" />} label="Metas atingidas" value={String(s.atingidas)} note="realizado ≥ meta" accent="bg-emerald-500" />
        <Kpi icon={<BarChart3 className="h-4 w-4" />} label="% médio da meta" value={s.avgPct === null ? "—" : `${nf(s.avgPct)}%`} note="entre os com realizado" accent="bg-amber-500" />
      </div>

      {/* Cobertura */}
      <Card title="Cobertura de indicadores nas iniciativas">
        {s.totalIniciativas === 0 ? (
          <Empty text="Nenhuma iniciativa no filtro selecionado." />
        ) : (
          <>
            <div className="flex h-3 overflow-hidden rounded-full bg-slate-100" role="img" aria-label="Cobertura de indicadores">
              {coverage.map((c) => (
                <div key={c.key} className={c.color} style={{ width: `${(c.value / s.totalIniciativas) * 100}%` }} title={`${c.label}: ${c.value}`} />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-600">
              {coverage.map((c) => (
                <span key={c.key} className="inline-flex items-center gap-2">
                  <span className={cn("h-2.5 w-2.5 rounded-sm", c.color)} />
                  {c.label}: <b className="tabular-nums text-slate-800">{c.value}</b>
                  <span className="text-slate-400">({Math.round((c.value / s.totalIniciativas) * 100)}%)</span>
                </span>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Resumo por indicador */}
      <Card title="Resumo por indicador">
        {groups.length === 0 ? (
          <Empty text="Nenhum indicador cadastrado ainda. Eles aparecem aqui assim que as iniciativas forem preenchidas." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Indicador</th>
                  <th className="px-3 py-2">Unidade</th>
                  <th className="px-3 py-2">Direção</th>
                  <th className="px-3 py-2 text-right">Iniciativas</th>
                  <th className="px-3 py-2 text-right">Com realizado</th>
                  <th className="px-3 py-2 text-right">Metas atingidas</th>
                  <th className="px-3 py-2 text-right">% médio da meta</th>
                  <th className="py-2 pl-3 text-right">Ganho</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr key={g.key} className="border-b border-slate-50 last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-slate-900">{g.name}</td>
                    <td className="px-3 py-2.5 text-slate-600">{g.unit}</td>
                    <td className="px-3 py-2.5 text-slate-600">{g.direction === "menor" ? "Menor é melhor" : "Maior é melhor"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{g.initiatives}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{g.withAchieved}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{g.reached}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{g.avgPct === null ? "—" : `${nf(g.avgPct)}%`}</td>
                    <td className="py-2.5 pl-3 text-right tabular-nums">
                      {g.gain === null ? "—" : (
                        <span className={g.gain >= 0 ? "font-semibold text-emerald-700" : "font-semibold text-rose-600"}>
                          {g.gain > 0 ? "+" : ""}{nf(g.gain, 2)} {g.unit}
                          <span className="ml-1 text-[10px] font-normal text-slate-400">{g.gainMode === "soma" ? "total" : "média"}</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Detalhamento */}
      <Card title={`Detalhamento (${rows.length})`}>
        {rows.length === 0 ? (
          <Empty text="Nenhum indicador para os filtros selecionados." />
        ) : (
          <div className="max-h-[560px] overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 bg-white text-[11px] font-bold uppercase tracking-wide text-slate-500 shadow-[0_1px_0_rgb(241,245,249)]">
                <tr>
                  <th className="py-2 pr-4">Indicador / iniciativa</th>
                  <th className="px-3 py-2">Responsável</th>
                  <th className="px-3 py-2 text-right">Partida</th>
                  <th className="px-3 py-2 text-right">Meta</th>
                  <th className="px-3 py-2 text-right">Realizado</th>
                  <th className="px-3 py-2 text-right">Ganho</th>
                  <th className="px-3 py-2 text-right">% da meta</th>
                  <th className="py-2 pl-3">Situação</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <DetailRow key={`${r.dbId}-${i}`} r={r} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={`Sem indicador — justificativas (${s.justificativas.length})`}>
          {s.justificativas.length === 0 ? (
            <Empty text="Nenhuma iniciativa justificou a ausência de indicador." />
          ) : (
            <ul className="max-h-80 space-y-2 overflow-auto pr-1">
              {s.justificativas.map((j) => (
                <li key={j.dbId} className="rounded-xl bg-slate-50 p-3 text-xs">
                  <Link href={`/iniciativas?edit=${j.dbId}`} className="font-semibold text-slate-800 hover:underline">{j.initiative}</Link>
                  <span className="ml-2 text-slate-400">{j.owner}</span>
                  <p className="mt-1 text-slate-600">{j.text}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Pendências de preenchimento por responsável">
          {s.pendencias.length === 0 ? (
            <Empty text="Nenhuma pendência: todas as iniciativas responderam e os indicadores concluídos têm realizado." />
          ) : (
            <div className="max-h-80 overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-4">Responsável</th>
                    <th className="px-3 py-2 text-right">Sem resposta</th>
                    <th className="py-2 pl-3 text-right">Concluídas sem realizado</th>
                  </tr>
                </thead>
                <tbody>
                  {s.pendencias.map((p) => (
                    <tr key={p.owner} className="border-t border-slate-50">
                      <td className="py-2 pr-4 text-slate-800">{p.owner}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{p.semResposta || "—"}</td>
                      <td className="py-2 pl-3 text-right tabular-nums">
                        {p.semRealizado ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {p.semRealizado}
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function DetailRow({ r }: { r: IndicatorRow }) {
  const st = STATE_LABEL[r.state];
  return (
    <tr className="border-t border-slate-50 align-top">
      <td className="max-w-md py-2.5 pr-4">
        <div className="font-medium text-slate-900">{r.name}</div>
        <Link href={`/iniciativas?edit=${r.dbId}`} className="text-xs text-slate-500 hover:underline">{r.initiative}</Link>
        {r.memory.trim() ? (
          <details className="mt-1 text-xs text-slate-500">
            <summary className="cursor-pointer text-blue-600">Memória de cálculo</summary>
            <p className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-slate-600">{r.memory}</p>
          </details>
        ) : null}
      </td>
      <td className="px-3 py-2.5 text-slate-600">{r.owner || "—"}</td>
      <td className="px-3 py-2.5 text-right tabular-nums">{nf(r.base, 2)} <span className="text-[10px] text-slate-400">{r.unit}</span></td>
      <td className="px-3 py-2.5 text-right tabular-nums">{nf(r.target, 2)}</td>
      <td className="px-3 py-2.5 text-right tabular-nums">{nf(r.achieved, 2)}</td>
      <td className="px-3 py-2.5 text-right tabular-nums">
        {r.gain === null ? "—" : (
          <span className={r.gain >= 0 ? "font-semibold text-emerald-700" : "font-semibold text-rose-600"}>
            {r.gain > 0 ? "+" : ""}{nf(r.gain, 2)}
          </span>
        )}
      </td>
      <td
        className="px-3 py-2.5 text-right tabular-nums"
        title={r.pctBasis === "meta" ? "Partida = meta: calculado como realizado ÷ meta" : r.pctBasis === "variacao" ? "Avanço da partida até a meta" : undefined}
      >
        {r.pct === null ? "—" : `${nf(r.pct)}%`}
      </td>
      <td className="py-2.5 pl-3">
        <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold", st.className)}>{st.label}</span>
        {r.concluded && r.state === "sem_realizado" ? (
          <span className="mt-1 flex items-center gap-1 text-[10px] text-amber-700"><AlertTriangle className="h-3 w-3" />iniciativa concluída</span>
        ) : null}
      </td>
    </tr>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
      <h2 className="mb-4 text-sm font-bold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-400">{text}</p>;
}

function Kpi({ icon, label, value, note, accent }: { icon: React.ReactNode; label: string; value: string; note: string; accent: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
      <span className={`absolute inset-y-0 left-0 w-1 ${accent}`} />
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <span className="text-slate-300">{icon}</span>
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{value}</div>
      <p className="mt-1 text-[11px] text-slate-500">{note}</p>
    </div>
  );
}
