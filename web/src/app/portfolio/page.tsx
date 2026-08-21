"use client";

import { FiltersPanel } from "@/components/sections/filters-panel";
import { InitiativesChart } from "@/components/sections/initiatives-chart";
import { InitiativesTable } from "@/components/sections/initiatives-table";
import { MetricsRow } from "@/components/sections/metrics-row";
import { PageHeader } from "@/components/layout/page-header";
import { useTodos } from "@/components/providers/todos-provider";
import { useResponsaveis } from "@/components/providers/responsaveis-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { filterInitiatives, hideInactiveOwners } from "@/lib/todo-utils";

export default function PortfolioPage() {
  const { todos, filters, loading, error } = useTodos();
  const { inactiveNames } = useResponsaveis();
  const { isAdmin } = useAuth();
  const base = isAdmin && filters.showInactive ? todos : hideInactiveOwners(todos, inactiveNames);
  const filtered = filterInitiatives(base, filters);
  const maesCount = new Set(filtered.map((t) => (t.mother || "").trim()).filter(Boolean)).size;
  const semMae = filtered.filter((t) => !(t.mother || "").trim()).length;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Portfólio" />
      <FiltersPanel layout="horizontal" showArea showMother showSize showAlert showPeriod />

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

      <InitiativesTable todos={filtered} tall />
    </div>
  );
}
