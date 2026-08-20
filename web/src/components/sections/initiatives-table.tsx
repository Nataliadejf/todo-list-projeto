"use client";

import { useState } from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { getDeadlineAlert, getPriorityBand, getPriorityScore, isOverdue, normalizeStatus } from "@/lib/todo-utils";
import type { Initiative } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/ui/fade-in";
import { useTodos } from "@/components/providers/todos-provider";
import { cn } from "@/lib/utils";

interface InitiativesTableProps {
  todos: Initiative[];
  title?: string;
  tall?: boolean;
}

export function InitiativesTable({ todos, title = "Todas as Iniciativas", tall = false }: InitiativesTableProps) {
  const { remove } = useTodos();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function confirmRemove(todo: Initiative) {
    if (deletingId !== todo.dbId) {
      setDeletingId(todo.dbId);
      return;
    }
    await remove(todo.dbId);
    setDeletingId(null);
  }

  return (
    <FadeIn delay={0.12}>
      <Card className={tall ? "flex h-full flex-col" : undefined}>
        <CardHeader className="shrink-0 px-5 py-4">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent
          className={`overflow-auto p-0 ${tall ? "kanban-scroll min-h-0 flex-1" : "pb-2"}`}
          style={tall ? { maxHeight: "min(72vh, 800px)" } : undefined}
        >
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 z-10 border-y border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Iniciativa</th>
                <th className="px-4 py-3">Área</th>
                <th className="px-4 py-3">Tamanho</th>
                <th className="px-4 py-3">Responsável</th>
                <th className="px-4 py-3">Prev. Fim</th>
                <th className="px-4 py-3">Alerta</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Prioridade</th>
                <th className="px-4 py-3">% Conc.</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {todos.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-10 text-center text-slate-500">
                    Nenhuma iniciativa encontrada com os filtros atuais.
                  </td>
                </tr>
              ) : (
                todos.map((todo) => {
                  const alert = getDeadlineAlert(todo);
                  const isConfirmingDelete = deletingId === todo.dbId;
                  return (
                    <tr
                      key={todo.dbId}
                      className={cn(
                        "border-b border-slate-100 hover:bg-slate-50/60",
                        isOverdue(todo) ? "bg-rose-50/40" : "",
                      )}
                    >
                      <td className="max-w-[260px] px-5 py-3.5">
                        <p className="pl-0.5 font-medium leading-snug text-slate-900">{todo.initiative}</p>
                        {todo.front ? (
                          <p className="mt-1.5 pl-0.5 text-xs leading-relaxed text-slate-500">{todo.front}</p>
                        ) : null}
                        {todo.description && !todo.front ? (
                          <p className="mt-1.5 line-clamp-1 pl-0.5 text-xs leading-relaxed text-slate-400">
                            {todo.description}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{todo.area || "—"}</td>
                      <td className="px-4 py-3.5 text-slate-600">{todo.size || "—"}</td>
                      <td className="px-4 py-3.5 text-slate-600">{todo.owner || "—"}</td>
                      <td
                        className={cn(
                          "px-4 py-3.5",
                          isOverdue(todo) ? "font-semibold text-rose-600" : "text-slate-600",
                        )}
                        title={isOverdue(todo) ? "Prazo vencido" : undefined}
                      >
                        {todo.plannedEndDate || "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge
                          variant={
                            alert.tone === "danger"
                              ? "danger"
                              : alert.tone === "warning"
                                ? "warning"
                                : alert.tone === "success"
                                  ? "success"
                                  : "default"
                          }
                        >
                          {alert.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        {normalizeStatus(todo.status) === "Concluído (Em análise)" ? (
                          <Badge variant="orange">Concluído (Em análise)</Badge>
                        ) : (
                          normalizeStatus(todo.status)
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {(() => {
                          const band = getPriorityBand(todo);
                          if (band === "none") return <span className="text-slate-400">—</span>;
                          const map = {
                            alta: { label: "Alta", variant: "danger" as const },
                            media: { label: "Média", variant: "warning" as const },
                            baixa: { label: "Baixa", variant: "info" as const },
                          };
                          const it = map[band];
                          return (
                            <Badge variant={it.variant} title={`Relevância × Urgência = ${getPriorityScore(todo)}`}>
                              {it.label}
                            </Badge>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3.5">{todo.progressPercent || "0"}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap items-center gap-1">
                          <Button variant="ghost" size="icon" asChild aria-label={`Editar ${todo.initiative}`}>
                            <Link href={`/iniciativas?edit=${todo.dbId}`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" asChild aria-label={`Visualizar ${todo.initiative}`} title="Visualizar iniciativa e tarefas">
                            <Link href={`/iniciativas?edit=${todo.dbId}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant={isConfirmingDelete ? "destructive" : "ghost"}
                            size={isConfirmingDelete ? "sm" : "icon"}
                            aria-label={`Remover ${todo.initiative}`}
                            onClick={() => void confirmRemove(todo)}
                          >
                            {isConfirmingDelete ? (
                              "Confirmar"
                            ) : (
                              <Trash2 className="h-4 w-4 text-rose-600" />
                            )}
                          </Button>
                          {isConfirmingDelete ? (
                            <Button type="button" variant="ghost" size="sm" onClick={() => setDeletingId(null)}>
                              Cancelar
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </FadeIn>
  );
}
