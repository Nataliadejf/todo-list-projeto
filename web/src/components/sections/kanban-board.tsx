"use client";

import { useState } from "react";
import Link from "next/link";
import { Flag, Trash2 } from "lucide-react";
import { KANBAN_COLUMNS } from "@/lib/constants";
import { getKanbanStage, normalizeStatus, toInitiativeInput } from "@/lib/todo-utils";
import type { Initiative } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn, StaggerItem, StaggerList } from "@/components/ui/fade-in";
import { useTodos } from "@/components/providers/todos-provider";
import { cn } from "@/lib/utils";

interface KanbanBoardProps {
  todos: Initiative[];
}

function KanbanCard({ todo }: { todo: Initiative }) {
  const { update, remove } = useTodos();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const stage = getKanbanStage(todo);

  async function toggleApproval() {
    const nextApproved = !todo.approved;
    await update(todo.dbId, {
      ...toInitiativeInput(todo),
      approved: nextApproved,
      deprioritized: nextApproved ? false : todo.deprioritized,
    });
  }

  async function deprioritize() {
    await update(todo.dbId, {
      ...toInitiativeInput(todo),
      approved: false,
      deprioritized: true,
    });
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await remove(todo.dbId);
    setConfirmDelete(false);
  }

  return (
    <article
      className={cn(
        "rounded-xl border bg-slate-50/80 p-3 transition",
        confirmDelete ? "border-rose-300 bg-rose-50/50" : "border-slate-200 hover:border-blue-200 hover:bg-white hover:shadow-sm",
        todo.deprioritized && "opacity-80",
      )}
    >
      <Link href={`/iniciativas?edit=${todo.dbId}`} className="block">
        <p className="pl-0.5 text-sm font-semibold leading-snug text-slate-900">{todo.initiative}</p>
        {todo.front ? (
          <p className="mt-1.5 pl-0.5 text-xs leading-relaxed text-slate-500">{todo.front}</p>
        ) : null}
        <p className="mt-2 pl-0.5 text-xs text-slate-500">{todo.owner || "Sem responsável"}</p>
        <p className="mt-1 pl-0.5 text-xs font-medium text-slate-600">{normalizeStatus(todo.status)}</p>
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-slate-100 pt-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title={todo.approved ? "Aprovada" : "Aprovar"}
          aria-label={todo.approved ? "Remover aprovação" : "Aprovar"}
          onClick={() => void toggleApproval()}
        >
          <Flag
            className={cn("h-3.5 w-3.5", todo.approved ? "fill-emerald-500 text-emerald-600" : "text-slate-300")}
          />
        </Button>

        {stage === "aprovacao" ? (
          <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => void deprioritize()}>
            Desprioritizar
          </Button>
        ) : null}

        {confirmDelete ? (
          <>
            <Button type="button" variant="destructive" size="sm" className="h-8 text-xs" onClick={() => void handleDelete()}>
              Confirmar exclusão
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={`Excluir ${todo.initiative}`}
            onClick={() => void handleDelete()}
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-600" />
          </Button>
        )}
      </div>
    </article>
  );
}

export function KanbanBoard({ todos }: KanbanBoardProps) {
  const grouped = KANBAN_COLUMNS.map((column) => ({
    ...column,
    items: todos.filter((todo) => getKanbanStage(todo) === column.id),
  }));

  return (
    <div className="kanban-scroll overflow-x-auto pb-3">
      <StaggerList className="grid min-w-[820px] grid-cols-2 gap-3 lg:grid-cols-3 xl:min-w-0 xl:grid-cols-6">
        {grouped.map((column, index) => (
          <StaggerItem key={column.id}>
            <FadeIn delay={index * 0.04}>
              <Card className="flex h-full max-h-[72vh] flex-col">
                <CardHeader className="flex-row items-center justify-between space-y-0 gap-2 px-4 py-3">
                  <CardTitle className="flex min-w-0 flex-1 items-center gap-2 pr-1 text-xs font-bold uppercase tracking-wide">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${column.dotClass}`} />
                    <span className="truncate leading-tight">{column.title}</span>
                  </CardTitle>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                    {column.items.length}
                  </span>
                </CardHeader>
                <CardContent className="column-scroll flex-1 space-y-2 overflow-y-auto px-3 pb-3">
                  {column.items.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
                      Nenhuma iniciativa
                    </p>
                  ) : (
                    column.items.map((todo) => <KanbanCard key={todo.dbId} todo={todo} />)
                  )}
                </CardContent>
              </Card>
            </FadeIn>
          </StaggerItem>
        ))}
      </StaggerList>
    </div>
  );
}
