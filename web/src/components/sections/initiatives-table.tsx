"use client";

import { Eye, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { getDeadlineAlert, normalizeStatus } from "@/lib/todo-utils";
import type { Initiative } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/ui/fade-in";
import { useTodos } from "@/components/providers/todos-provider";

interface InitiativesTableProps {
  todos: Initiative[];
  title?: string;
  tall?: boolean;
}

export function InitiativesTable({ todos, title = "Todas as Iniciativas", tall = false }: InitiativesTableProps) {
  const { remove } = useTodos();

  return (
    <FadeIn delay={0.12}>
      <Card className={tall ? "flex h-full flex-col" : undefined}>
        <CardHeader className="shrink-0 py-3">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent
          className={`overflow-auto p-0 ${tall ? "min-h-0 flex-1" : "pb-2"}`}
          style={tall ? { maxHeight: "min(62vh, 720px)" } : undefined}
        >
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 z-10 border-y border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Iniciativa</th>
                <th className="px-4 py-3">Área</th>
                <th className="px-4 py-3">Responsável</th>
                <th className="px-4 py-3">Prev. Fim</th>
                <th className="px-4 py-3">Alerta</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Peso</th>
                <th className="px-4 py-3">% Conc.</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {todos.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-slate-500">
                    Nenhuma iniciativa encontrada com os filtros atuais.
                  </td>
                </tr>
              ) : (
                todos.map((todo) => {
                  const alert = getDeadlineAlert(todo);
                  return (
                    <tr key={todo.dbId} className="border-b border-slate-100 hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-medium text-slate-700">{todo.id}</td>
                      <td className="max-w-[220px] px-4 py-3 font-medium text-slate-900">{todo.initiative}</td>
                      <td className="px-4 py-3 text-slate-600">{todo.area || "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{todo.owner || "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{todo.plannedEndDate || "—"}</td>
                      <td className="px-4 py-3">
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
                      <td className="px-4 py-3">{normalizeStatus(todo.status)}</td>
                      <td className="px-4 py-3">{todo.weight || "—"}</td>
                      <td className="px-4 py-3">{todo.progressPercent || "0"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" asChild aria-label={`Editar ${todo.initiative}`}>
                            <Link href={`/iniciativas?edit=${todo.dbId}`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" asChild aria-label={`Ver ${todo.initiative}`}>
                            <Link href={`/iniciativas?edit=${todo.dbId}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Remover ${todo.initiative}`}
                            onClick={() => void remove(todo.dbId)}
                          >
                            <Trash2 className="h-4 w-4 text-rose-600" />
                          </Button>
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
