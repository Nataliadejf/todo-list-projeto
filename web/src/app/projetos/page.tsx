"use client";

import { PageHeader } from "@/components/layout/page-header";
import { ActivityTable } from "@/components/sections/activity-table";
import { FiltersPanel } from "@/components/sections/filters-panel";
import { KanbanBoard } from "@/components/sections/kanban-board";
import { useTodos } from "@/components/providers/todos-provider";
import { filterInitiatives } from "@/lib/todo-utils";

export default function ProjetosPage() {
  const { todos, filters, loading } = useTodos();
  const filtered = filterInitiatives(todos, filters);

  return (
    <div className="space-y-6">
      <PageHeader title="Projetos" subtitle="Kanban com persistência real no banco" />

      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <FiltersPanel compact showStatus={false} showDeadline={false} />
        <div className="space-y-6">
          {loading ? <p className="text-sm text-slate-500">Carregando...</p> : null}
          <KanbanBoard todos={filtered} />
          <ActivityTable todos={filtered} />
        </div>
      </div>
    </div>
  );
}
