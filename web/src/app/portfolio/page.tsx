"use client";

import { FiltersPanel } from "@/components/sections/filters-panel";
import { InitiativesChart } from "@/components/sections/initiatives-chart";
import { InitiativesTable } from "@/components/sections/initiatives-table";
import { MetricsRow } from "@/components/sections/metrics-row";
import { PageHeader } from "@/components/layout/page-header";
import { useTodos } from "@/components/providers/todos-provider";
import { filterInitiatives } from "@/lib/todo-utils";

export default function PortfolioPage() {
  const { todos, filters, loading, error } = useTodos();
  const filtered = filterInitiatives(todos, filters);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Portfólio" />
      <FiltersPanel layout="horizontal" showArea showPeriod />

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
