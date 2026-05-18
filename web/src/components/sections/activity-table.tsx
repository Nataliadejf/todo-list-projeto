"use client";

import Link from "next/link";
import { getDeadlineAlert, getKanbanStage, normalizeStatus } from "@/lib/todo-utils";
import type { Initiative } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/ui/fade-in";
import { KANBAN_COLUMNS } from "@/lib/constants";

interface ActivityTableProps {
  todos: Initiative[];
}

const stageTitle = Object.fromEntries(KANBAN_COLUMNS.map((c) => [c.id, c.title]));

export function ActivityTable({ todos }: ActivityTableProps) {
  return (
    <FadeIn delay={0.1}>
      <Card>
        <CardHeader>
          <CardTitle>Lista Geral de Atividades</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 pb-2">
          <table className="min-w-full text-left text-sm">
            <thead className="border-y border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Iniciativa</th>
                <th className="px-4 py-3">Responsável</th>
                <th className="px-4 py-3">Prazo</th>
                <th className="px-4 py-3">Alerta</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Etapa</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {todos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                    Nenhuma atividade encontrada.
                  </td>
                </tr>
              ) : (
                todos.map((todo) => {
                  const alert = getDeadlineAlert(todo);
                  const stage = getKanbanStage(todo);
                  return (
                    <tr key={todo.dbId} className="border-b border-slate-100 hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-medium">{todo.id}</td>
                      <td className="max-w-[240px] px-4 py-3 font-medium text-slate-900">{todo.initiative}</td>
                      <td className="px-4 py-3">{todo.owner || "—"}</td>
                      <td className="px-4 py-3">{todo.plannedEndDate || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            alert.tone === "danger"
                              ? "danger"
                              : alert.tone === "warning"
                                ? "warning"
                                : "default"
                          }
                        >
                          {alert.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{normalizeStatus(todo.status)}</td>
                      <td className="px-4 py-3">{stageTitle[stage]}</td>
                      <td className="px-4 py-3">
                        <Link href={`/iniciativas?edit=${todo.dbId}`} className="text-sm font-semibold text-blue-600 hover:underline">
                          Editar
                        </Link>
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
