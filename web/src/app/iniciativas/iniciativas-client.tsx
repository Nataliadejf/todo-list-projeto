"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { InitiativeForm } from "@/components/sections/initiative-form";
import { InitiativesTable } from "@/components/sections/initiatives-table";
import { LinkedTasks } from "@/components/sections/linked-tasks";
import { FiltersPanel } from "@/components/sections/filters-panel";
import { useTodos } from "@/components/providers/todos-provider";
import { useResponsaveis } from "@/components/providers/responsaveis-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { filterInitiatives, hideInactiveOwners } from "@/lib/todo-utils";

export function IniciativasClient() {
  const searchParams = useSearchParams();
  const editId = Number(searchParams.get("edit"));
  const { todos, filters } = useTodos();
  const { inactiveNames } = useResponsaveis();
  const { isAdmin } = useAuth();

  const editing = useMemo(
    () => (editId ? todos.find((item) => item.dbId === editId) ?? null : null),
    [editId, todos],
  );

  const base = isAdmin && filters.showInactive ? todos : hideInactiveOwners(todos, inactiveNames);
  const filtered = filterInitiatives(base, filters);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Iniciativas"
        subtitle="Cadastro completo, edição e exportação em planilha"
        showNewButton={false}
      />

      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <FiltersPanel showArea showPeriod />
        <div className="space-y-6">
          <InitiativeForm
            editing={editing}
            onCancelEdit={() => {
              window.history.replaceState({}, "", "/iniciativas");
            }}
          />
          {editing ? (
            <LinkedTasks initiativeDbId={editing.dbId} />
          ) : (
            <InitiativesTable todos={filtered} title="Iniciativas cadastradas" tall />
          )}
        </div>
      </div>
    </div>
  );
}
