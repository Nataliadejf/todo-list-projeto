"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { getOwnerWeightChartData } from "@/lib/todo-utils";
import type { Initiative } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/ui/fade-in";

interface InitiativesChartProps {
  todos: Initiative[];
  compact?: boolean;
}

export function InitiativesChart({ todos, compact = false }: InitiativesChartProps) {
  const data = getOwnerWeightChartData(todos);

  return (
    <FadeIn delay={0.08}>
      <Card>
        <CardHeader className={compact ? "space-y-1 pb-2" : undefined}>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-blue-600" />
            Iniciativas por Responsável × Peso
          </CardTitle>
          {!compact ? (
            <CardDescription>Distribuição de carga e prioridade por pessoa</CardDescription>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-rose-500" /> Alta</span>
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-orange-500" /> Média</span>
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-blue-500" /> Baixa</span>
          </div>
        </CardHeader>
        <CardContent className={compact ? "h-[200px] pb-2" : "h-[240px] pb-4"}>
          {data.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-500">Sem dados para exibir no gráfico.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="owner" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" height={70} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="alta" name="Alta" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
                <Bar dataKey="media" name="Média" stackId="a" fill="#f97316" />
                <Bar dataKey="baixa" name="Baixa" stackId="a" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </FadeIn>
  );
}
