"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3 } from "lucide-react";
import {
  CHART_MODE_LABELS,
  CHART_SERIES,
  getOwnerChartData,
  type ChartMode,
} from "@/lib/todo-utils";
import type { Initiative } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/ui/fade-in";
import { cn } from "@/lib/utils";

interface InitiativesChartProps {
  todos: Initiative[];
  compact?: boolean;
}

const MODES: ChartMode[] = ["size", "priority"];

export function InitiativesChart({ todos, compact = false }: InitiativesChartProps) {
  const [mode, setMode] = useState<ChartMode>("size");
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const data = getOwnerChartData(todos, mode);
  const series = CHART_SERIES[mode];

  // Ao trocar a métrica, limpa os filtros de série (as chaves mudam).
  useEffect(() => setHidden(new Set()), [mode]);

  const toggleSeries = (key: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <FadeIn delay={0.08}>
      <Card>
        <CardHeader className={compact ? "space-y-1 pb-2" : undefined}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              Iniciativas por Responsável × {CHART_MODE_LABELS[mode]}
            </CardTitle>
            {/* Alternador de métrica do gráfico */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              {MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-semibold transition",
                    mode === m
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-700",
                  )}
                >
                  {CHART_MODE_LABELS[m]}
                </button>
              ))}
            </div>
          </div>
          {!compact ? (
            <CardDescription>Distribuição de carga por pessoa, agrupada por {CHART_MODE_LABELS[mode].toLowerCase()}</CardDescription>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-semibold">
            {series.map((s) => {
              const off = hidden.has(s.key);
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => toggleSeries(s.key)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md px-2 py-0.5 transition",
                    off ? "opacity-40" : "hover:bg-slate-100",
                  )}
                  title={off ? "Mostrar" : "Ocultar"}
                >
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
                  <span className={off ? "line-through" : ""}>{s.label}</span>
                </button>
              );
            })}
            <span className="ml-1 text-[11px] font-normal text-slate-400">(clique para filtrar)</span>
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
                {series.map((s, i) => (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    name={s.label}
                    stackId="a"
                    fill={s.color}
                    hide={hidden.has(s.key)}
                    radius={i === series.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </FadeIn>
  );
}
