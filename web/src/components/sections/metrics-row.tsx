"use client";

import { getMetrics } from "@/lib/todo-utils";
import type { Initiative } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { FadeIn, StaggerItem, StaggerList } from "@/components/ui/fade-in";

interface MetricsRowProps {
  todos: Initiative[];
}

const items = [
  { key: "total", label: "Total", color: "text-blue-600" },
  { key: "inProgress", label: "Em Andamento", color: "text-blue-600" },
  { key: "done", label: "Concluídos", color: "text-emerald-600" },
  { key: "notStarted", label: "Não Iniciados", color: "text-slate-600" },
  { key: "inApproval", label: "Em Aprovação", color: "text-orange-500" },
] as const;

export function MetricsRow({ todos }: MetricsRowProps) {
  const metrics = getMetrics(todos);

  return (
    <StaggerList className="grid grid-cols-2 gap-3 xl:grid-cols-5">
      {items.map((item, index) => (
        <StaggerItem key={item.key}>
          <FadeIn delay={index * 0.04}>
            <Card className="relative overflow-hidden">
              <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-blue-100/70 blur-2xl" />
              <CardContent className="p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{item.label}</p>
                <p className={`mt-2 text-3xl font-bold ${item.color}`}>
                  {metrics[item.key as keyof typeof metrics]}
                </p>
              </CardContent>
            </Card>
          </FadeIn>
        </StaggerItem>
      ))}
    </StaggerList>
  );
}
