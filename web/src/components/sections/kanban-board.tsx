"use client";

import Link from "next/link";
import { KANBAN_COLUMNS } from "@/lib/constants";
import { getKanbanStage, normalizeStatus } from "@/lib/todo-utils";
import type { Initiative } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn, StaggerItem, StaggerList } from "@/components/ui/fade-in";

interface KanbanBoardProps {
  todos: Initiative[];
}

export function KanbanBoard({ todos }: KanbanBoardProps) {
  const grouped = KANBAN_COLUMNS.map((column) => ({
    ...column,
    items: todos.filter((todo) => getKanbanStage(todo) === column.id),
  }));

  return (
    <StaggerList className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {grouped.map((column, index) => (
        <StaggerItem key={column.id}>
          <FadeIn delay={index * 0.05}>
            <Card className="h-full">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
                  <span className={`h-2.5 w-2.5 rounded-full ${column.dotClass}`} />
                  {column.title}
                </CardTitle>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                  {column.items.length}
                </span>
              </CardHeader>
              <CardContent className="space-y-2">
                {column.items.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 px-3 py-8 text-center text-xs text-slate-400">
                    Nenhuma iniciativa nesta etapa
                  </p>
                ) : (
                  column.items.map((todo) => (
                    <Link
                      key={todo.dbId}
                      href={`/iniciativas?edit=${todo.dbId}`}
                      className="block rounded-xl border border-slate-200 bg-slate-50/80 p-3 transition hover:border-blue-200 hover:bg-white hover:shadow-sm"
                    >
                      <p className="text-sm font-semibold text-slate-900">{todo.initiative}</p>
                      <p className="mt-1 text-xs text-slate-500">{todo.owner || "Sem responsável"}</p>
                      <p className="mt-2 text-xs font-medium text-slate-600">{normalizeStatus(todo.status)}</p>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
          </FadeIn>
        </StaggerItem>
      ))}
    </StaggerList>
  );
}
