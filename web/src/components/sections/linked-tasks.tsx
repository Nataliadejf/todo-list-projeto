"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Pencil, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTasks } from "@/components/providers/tasks-provider";
import type { Task } from "@/lib/types";

function statusVariant(status: string): "default" | "success" | "warning" | "info" {
  if (status === "Concluído") return "success";
  if (status === "Em andamento") return "warning";
  return "info";
}

export function LinkedTasks({ initiativeDbId, owner }: { initiativeDbId: number; owner?: string }) {
  const { tasks, update } = useTasks();
  const linked = tasks.filter((t) => t.initiativeDbId === initiativeDbId);

  // Ao ir para a tela de Tarefas, mantém o filtro por iniciativa e responsável.
  const ownerParam = owner?.trim() ? `&owner=${encodeURIComponent(owner.trim())}` : "";
  const newTaskHref = `/tarefas?initiativeDbId=${initiativeDbId}${ownerParam}`;
  const editTaskHref = (taskId: string) =>
    `/tarefas?editTask=${taskId}&initiativeDbId=${initiativeDbId}${ownerParam}`;

  const toggleDone = async (task: Task) => {
    const done = !task.done;
    await update(task.id, {
      initiativeDbId: task.initiativeDbId,
      title: task.title,
      description: task.description,
      owner: task.owner,
      status: done ? "Concluído" : task.status === "Concluído" ? "Em andamento" : task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      startDate: task.startDate,
      endDate: task.endDate,
      done,
    });
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Tarefas vinculadas ({linked.length})</CardTitle>
        <Button asChild variant="secondary" size="sm">
          <Link href={newTaskHref}>
            <Plus className="h-4 w-4" />
            Nova tarefa
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {linked.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-400">
            Nenhuma tarefa vinculada a esta iniciativa.
          </p>
        ) : (
          <ul className="space-y-2">
            {linked.map((task) => (
              <li
                key={task.id}
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3"
              >
                <button
                  type="button"
                  onClick={() => void toggleDone(task)}
                  className="mt-0.5 shrink-0 text-slate-400 transition-colors hover:text-emerald-500"
                  aria-label={task.done ? "Marcar como pendente" : "Marcar como concluída"}
                >
                  {task.done ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={task.done ? "font-medium text-slate-400 line-through" : "font-medium text-slate-900"}>
                      {task.title}
                    </p>
                    <Badge variant={statusVariant(task.status)}>{task.status || "A fazer"}</Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    {task.owner ? <span>Responsável: {task.owner}</span> : null}
                    {task.dueDate ? <span>Prazo: {task.dueDate}</span> : null}
                  </div>
                </div>
                <Button asChild variant="ghost" size="icon" aria-label="Editar tarefa" title="Editar na tela de Tarefas">
                  <Link href={editTaskHref(task.id)}>
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
