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
    <div className="space-y-6">
      <PageHeader title="Portfólio" />

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <FiltersPanel showArea showPeriod />
        <div className="space-y-6">
          {error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}. Inicie a API com <code className="font-mono">npm run api</code> na raiz do projeto.
            </p>
          ) : null}
          {loading ? <p className="text-sm text-slate-500">Carregando iniciativas...</p> : null}
          <MetricsRow todos={filtered} />
          <InitiativesChart todos={filtered} />
          <InitiativesTable todos={filtered} />
        </div>
      </div>
    </div>
  );
}
