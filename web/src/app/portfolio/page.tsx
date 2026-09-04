"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, GitBranch, ListTree } from "lucide-react";
import { FiltersPanel } from "@/components/sections/filters-panel";
import { InitiativesChart } from "@/components/sections/initiatives-chart";
import { InitiativesTable } from "@/components/sections/initiatives-table";
import { MotherView } from "@/components/sections/mother-view";
import { MetricsRow } from "@/components/sections/metrics-row";
import { PageHeader } from "@/components/layout/page-header";
import { useTodos } from "@/components/providers/todos-provider";
import { useTasks } from "@/components/providers/tasks-provider";
import { useResponsaveis } from "@/components/providers/responsaveis-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { filterInitiatives, getCompletedRange, hideInactiveOwners } from "@/lib/todo-utils";
import { cn } from "@/lib/utils";

export default function PortfolioPage() {
  const { todos, filters, loading, error } = useTodos();
  const { tasks } = useTasks();
  const { inactiveNames } = useResponsaveis();
  const { isAdmin } = useAuth();
  const [view, setView] = useState<"filha" | "mae">("filha");
  const base = isAdmin && filters.showInactive ? todos : hideInactiveOwners(todos, inactiveNames);
  const filtered = filterInitiatives(base, filters);
  const maesCount = new Set(filtered.map((t) => (t.mother || "").trim()).filter(Boolean)).size;
  const semMae = filtered.filter((t) => !(t.mother || "").trim()).length;

  const completedRange = useMemo(() => getCompletedRange(filters), [filters]);
  const iniName = useMemo(() => {
    const m = new Map<number, string>();
    todos.forEach((t) => m.set(t.dbId, t.initiative || t.id || `Iniciativa ${t.dbId}`));
    return m;
  }, [todos]);
  const completedInitiatives = useMemo(() => {
    if (!completedRange) return [];
    return filtered
      .filter((t) => t.completedAt)
      .filter((t) => {
        const d = new Date(t.completedAt);
        return !Number.isNaN(d.getTime()) && d >= completedRange.start && d <= completedRange.end;
      })
      .sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""));
  }, [filtered, completedRange]);
  const completedTasks = useMemo(() => {
    if (!completedRange) return [];
    return tasks
      .filter((t) => t.completedAt)
      .filter((t) => {
        const d = new Date(t.completedAt as string);
        return !Number.isNaN(d.getTime()) && d >= completedRange.start && d <= completedRange.end;
      })
      .sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""));
  }, [tasks, completedRange]);
  const fmtDateTime = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Portfólio" />
      <FiltersPanel layout="horizontal" showArea showMother showSize showAlert showPeriod showCompletedPeriod />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
          <span className="absolute inset-y-0 left-0 w-1 bg-violet-500" />
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Iniciativas Mãe</p>
          <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{maesCount}</div>
          <p className="mt-1 text-[11px] text-slate-500">
            agrupadores em uso{semMae > 0 ? ` · ${semMae} sem mãe` : ""}
          </p>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}. Configure PostgreSQL no Render (variável DATABASE_URL).
        </p>
      ) : null}
      {loading ? <p className="text-sm text-slate-500">Carregando iniciativas...</p> : null}

      <MetricsRow todos={filtered} compact />

      <InitiativesChart todos={filtered} />

      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Ver por:</span>
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setView("filha")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
              view === "filha" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900",
            )}
          >
            <ListTree className="h-3.5 w-3.5" />
            Iniciativa (filha)
          </button>
          <button
            type="button"
            onClick={() => setView("mae")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
              view === "mae" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900",
            )}
          >
            <GitBranch className="h-3.5 w-3.5" />
            Iniciativa Mãe
          </button>
        </div>
      </div>

      {view === "mae" ? <MotherView todos={filtered} /> : <InitiativesTable todos={filtered} tall />}

      {completedRange ? (
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Concluídas no período selecionado</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Iniciativas ({completedInitiatives.length})
              </p>
              {completedInitiatives.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-xs text-slate-400">
                  Nenhuma iniciativa concluída neste período.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {completedInitiatives.map((t) => (
                    <li key={t.dbId} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-xs shadow-sm">
                      <span className="min-w-0 flex-1 truncate font-medium text-slate-700">{t.initiative}</span>
                      <span className="shrink-0 text-slate-400">{fmtDateTime(t.completedAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Tarefas ({completedTasks.length})
              </p>
              {completedTasks.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-xs text-slate-400">
                  Nenhuma tarefa concluída neste período.
                </p>
              ) : (
                <ul className="max-h-72 space-y-1.5 overflow-auto pr-1">
                  {completedTasks.map((t) => (
                    <li key={t.id} className="rounded-lg bg-white px-3 py-2 text-xs shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 flex-1 truncate font-medium text-slate-700">{t.title}</span>
                        <span className="shrink-0 text-slate-400">{fmtDateTime(t.completedAt as string)}</span>
                      </div>
                      <div className="mt-0.5 truncate text-[10.5px] text-slate-400">
                        {t.owner || "—"}{t.initiativeDbId != null ? ` · ${iniName.get(t.initiativeDbId) || `#${t.initiativeDbId}`}` : ""}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
