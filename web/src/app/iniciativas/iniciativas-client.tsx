"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { InitiativeForm } from "@/components/sections/initiative-form";
import { InitiativesTable } from "@/components/sections/initiatives-table";
import { FiltersPanel } from "@/components/sections/filters-panel";
import { useTodos } from "@/components/providers/todos-provider";
import { filterInitiatives } from "@/lib/todo-utils";

export function IniciativasClient() {
  const searchParams = useSearchParams();
  const editId = Number(searchParams.get("edit"));
  const { todos, filters } = useTodos();

  const editing = useMemo(
    () => (editId ? todos.find((item) => item.dbId === editId) ?? null : null),
    [editId, todos],
  );

  const filtered = filterInitiatives(todos, filters);

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
          <InitiativesTable todos={filtered} title="Iniciativas cadastradas" />
        </div>
      </div>
    </div>
  );
}
