"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Layers } from "lucide-react";
import type { Initiative } from "@/lib/types";
import { getPriorityScore, normalizeStatus } from "@/lib/todo-utils";
import { isConcluida, sizeWeight } from "@/lib/gerencial-utils";
import { Badge } from "@/components/ui/badge";
import { InitiativesTable } from "@/components/sections/initiatives-table";

const SEM_MAE = "(Sem iniciativa mãe)";

function band(gut: number): { label: string; variant: "danger" | "warning" | "info" } {
  if (gut >= 15) return { label: "Alta", variant: "danger" };
  if (gut >= 5) return { label: "Média", variant: "warning" };
  return { label: "Baixa", variant: "info" };
}

export function MotherView({ todos }: { todos: Initiative[] }) {
  const [open, setOpen] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    const map = new Map<string, Initiative[]>();
    todos.forEach((t) => {
      const m = (t.mother || "").trim() || SEM_MAE;
      if (!map.has(m)) map.set(m, []);
      map.get(m)!.push(t);
    });
    return [...map.entries()]
      .map(([mother, filhas]) => {
        const done = filhas.filter(isConcluida).length;
        const esforco = filhas.reduce((s, t) => s + sizeWeight(t.size), 0);
        const guts = filhas.map(getPriorityScore).filter((g) => g > 0);
        const gutAvg = guts.length ? Math.round((guts.reduce((a, b) => a + b, 0) / guts.length) * 10) / 10 : 0;
        return { mother, filhas, done, donePct: filhas.length ? Math.round((done / filhas.length) * 100) : 0, esforco, gutAvg };
      })
      .sort((a, b) => {
        if (a.mother === SEM_MAE) return 1;
        if (b.mother === SEM_MAE) return -1;
        return b.filhas.length - a.filhas.length;
      });
  }, [todos]);

  const toggle = (m: string) => setOpen((prev) => {
    const next = new Set(prev);
    if (next.has(m)) next.delete(m); else next.add(m);
    return next;
  });

  if (groups.length === 0) {
    return <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">Nenhuma iniciativa com os filtros atuais.</p>;
  }

  return (
    <div className="space-y-3">
      {groups.map((g) => {
        const isOpen = open.has(g.mother);
        const b = band(g.gutAvg);
        return (
          <div key={g.mother} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
            <button
              type="button"
              onClick={() => toggle(g.mother)}
              className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50"
              aria-expanded={isOpen}
            >
              <ChevronRight className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-90" : ""}`} />
              <Layers className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="min-w-0 flex-1 truncate font-bold text-slate-900">
                {g.mother === SEM_MAE ? <span className="text-slate-400">{g.mother}</span> : g.mother}
              </span>
              <span className="hidden items-center gap-4 text-xs text-slate-500 sm:flex">
                <span><b className="tabular-nums text-slate-800">{g.filhas.length}</b> filhas</span>
                <span>Esforço <b className="tabular-nums text-slate-800">{g.esforco}</b></span>
                <span className="inline-flex items-center gap-1">Prioridade <Badge variant={b.variant}>{b.label}</Badge></span>
              </span>
              <span className="flex w-28 shrink-0 items-center gap-2">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${g.donePct}%` }} />
                </span>
                <span className="w-9 text-right text-xs font-bold tabular-nums text-slate-700">{g.donePct}%</span>
              </span>
            </button>
            {isOpen ? (
              <div className="border-t border-slate-100 bg-slate-50/50 p-3">
                <InitiativesTable todos={g.filhas} title={`Filhas de ${g.mother === SEM_MAE ? "iniciativas sem mãe" : g.mother}`} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
