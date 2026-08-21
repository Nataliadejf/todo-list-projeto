"use client";

import { useMemo } from "react";
import { BarChart3, CheckSquare, Gauge, Layers, ListChecks, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useTodos } from "@/components/providers/todos-provider";
import { useTasks } from "@/components/providers/tasks-provider";
import { useResponsaveis } from "@/components/providers/responsaveis-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { hideInactiveOwners } from "@/lib/todo-utils";
import { gerencialStats } from "@/lib/gerencial-utils";

const nf = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

export function GerencialClient() {
  const { todos } = useTodos();
  const { tasks } = useTasks();
  const { inactiveNames } = useResponsaveis();
  const { isAdmin } = useAuth();

  const base = useMemo(
    () => (isAdmin ? todos : hideInactiveOwners(todos, inactiveNames)),
    [todos, isAdmin, inactiveNames],
  );
  const r = useMemo(() => gerencialStats(base, tasks), [base, tasks]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visão Gerencial"
        subtitle="Quantidade de iniciativas e tarefas por eixo estratégico (categoria de ganho), com conclusão, prioridade e esforço — leitura automática do que está cadastrado."
        showNewButton={false}
      />

      {/* KPIs gerais */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={<Layers className="h-4 w-4" />} label="Iniciativas" value={String(r.totalIniciativas)} note={`${r.totalIniConcluidas} concluídas`} accent="bg-blue-500" />
        <Kpi icon={<ListChecks className="h-4 w-4" />} label="Tarefas" value={String(r.totalTarefas)} note={`${r.totalTarefasConcluidas} concluídas`} accent="bg-indigo-500" />
        <Kpi icon={<TrendingUp className="h-4 w-4" />} label="Taxa de conclusão" value={`${r.totalIniciativas ? Math.round((r.totalIniConcluidas / r.totalIniciativas) * 100) : 0}%`} note="das iniciativas" accent="bg-emerald-500" />
        <Kpi icon={<BarChart3 className="h-4 w-4" />} label="Prioridade média" value={nf(r.gutAvg)} note="GUT (relev. × urgência)" accent="bg-amber-500" />
      </div>

      {/* Eixos estratégicos */}
      <div>
        <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Eixos estratégicos (categoria de ganho)</div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {r.eixos.map((e) => (
            <div key={e.key} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm" style={{ background: e.accent }} />
                <span className="text-sm font-bold text-slate-900">{e.label}</span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    <Layers className="h-3.5 w-3.5" /> Iniciativas
                  </div>
                  <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{e.iniciativas}</div>
                  <div className="text-[11px] text-slate-500">{e.iniConcluidas} concluídas</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    <CheckSquare className="h-3.5 w-3.5" /> Tarefas
                  </div>
                  <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{e.tarefas}</div>
                  <div className="text-[11px] text-slate-500">{e.tarefasConcluidas} concluídas</div>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Conclusão das iniciativas</span>
                  <span className="font-bold tabular-nums text-slate-700">{e.donePct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${e.donePct}%`, background: e.accent }} />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5" /> GUT médio <b className="text-slate-700">{nf(e.gutAvg)}</b></span>
                <span className="inline-flex items-center gap-1"><Gauge className="h-3.5 w-3.5" /> Esforço <b className="text-slate-700">{e.effortDone}</b> pts</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
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
