"use client";

import { useState } from "react";
import Link from "next/link";
import { GripVertical, Trash2 } from "lucide-react";
import { KANBAN_COLUMNS } from "@/lib/constants";
import { getKanbanStage, normalizeStatus, toInitiativeInput } from "@/lib/todo-utils";
import type { Initiative, InitiativeInput, KanbanStage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn, StaggerItem, StaggerList } from "@/components/ui/fade-in";
import { useTodos } from "@/components/providers/todos-provider";
import { cn } from "@/lib/utils";

interface KanbanBoardProps {
  todos: Initiative[];
}

// Ao soltar um card numa coluna, define os campos que refletem aquela etapa.
function stagePatch(stage: KanbanStage): Partial<InitiativeInput> {
  switch (stage) {
    case "nao_iniciado":
      return { status: "Não Iniciado", deprioritized: false, completed: false };
    case "andamento":
      return { status: "Em Andamento", deprioritized: false, completed: false };
    case "continuo":
      return { status: "Contínuo", deprioritized: false, completed: false };
    case "concluido":
      return { status: "Concluído", deprioritized: false, completed: true };
    case "despriorizados":
      return { status: "Despriorizado", deprioritized: true, completed: false };
    default:
      return {};
  }
}

function KanbanCard({
  todo,
  onDragStart,
  onDragEnd,
  dragging,
}: {
  todo: Initiative;
  onDragStart: () => void;
  onDragEnd: () => void;
  dragging: boolean;
}) {
  const { remove } = useTodos();
  const [confirmDelete, setConfirmDelete] = useState(false);

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
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", String(todo.dbId));
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "group rounded-xl border bg-slate-50/80 p-3 transition",
        dragging ? "opacity-40" : "",
        confirmDelete
          ? "border-rose-300 bg-rose-50/50"
          : "border-slate-200 hover:border-blue-200 hover:bg-white hover:shadow-sm",
        todo.deprioritized && "opacity-80",
      )}
    >
      <div className="flex items-start gap-1.5">
        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-slate-300 group-hover:text-slate-400 active:cursor-grabbing" />
        <Link href={`/iniciativas?edit=${todo.dbId}`} className="block min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-slate-900">{todo.initiative}</p>
          {todo.front ? (
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{todo.front}</p>
          ) : null}
          <p className="mt-2 text-xs text-slate-500">{todo.owner || "Sem responsável"}</p>
          <p className="mt-1 text-xs font-medium text-slate-600">{normalizeStatus(todo.status)}</p>
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-slate-100 pt-2">
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
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={`Excluir ${todo.initiative}`} onClick={() => void handleDelete()}>
            <Trash2 className="h-3.5 w-3.5 text-rose-600" />
          </Button>
        )}
      </div>
    </article>
  );
}

export function KanbanBoard({ todos }: KanbanBoardProps) {
  const { update } = useTodos();
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [overStage, setOverStage] = useState<KanbanStage | null>(null);

  const grouped = KANBAN_COLUMNS.map((column) => ({
    ...column,
    items: todos.filter((todo) => getKanbanStage(todo) === column.id),
  }));

  async function moveTo(stage: KanbanStage, dbId: number) {
    const todo = todos.find((t) => t.dbId === dbId);
    if (!todo || getKanbanStage(todo) === stage) return;
    await update(dbId, { ...toInitiativeInput(todo), ...stagePatch(stage) });
  }

  return (
    <div className="kanban-scroll overflow-x-auto pb-3">
      <StaggerList className="grid min-w-[820px] grid-cols-2 gap-3 lg:grid-cols-3 xl:min-w-0 xl:grid-cols-6">
        {grouped.map((column, index) => (
          <StaggerItem key={column.id}>
            <FadeIn delay={index * 0.04}>
              <Card
                className={cn(
                  "flex h-full max-h-[72vh] flex-col transition",
                  overStage === column.id ? "ring-2 ring-blue-400" : "",
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (overStage !== column.id) setOverStage(column.id as KanbanStage);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverStage(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const dbId = Number(e.dataTransfer.getData("text/plain"));
                  setOverStage(null);
                  setDraggingId(null);
                  if (dbId) void moveTo(column.id as KanbanStage, dbId);
                }}
              >
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
                      {overStage === column.id ? "Solte aqui" : "Nenhuma iniciativa"}
                    </p>
                  ) : (
                    column.items.map((todo) => (
                      <KanbanCard
                        key={todo.dbId}
                        todo={todo}
                        dragging={draggingId === todo.dbId}
                        onDragStart={() => setDraggingId(todo.dbId)}
                        onDragEnd={() => setDraggingId(null)}
                      />
                    ))
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
