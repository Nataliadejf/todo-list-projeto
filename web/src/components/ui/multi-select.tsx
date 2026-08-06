"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface MultiSelectProps {
  label?: string;
  icon?: React.ReactNode;
  options: readonly string[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

export function MultiSelect({ label, icon, options, value, onChange, placeholder = "Todos" }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const toggle = (opt: string) => {
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  };

  const summary =
    value.length === 0 ? placeholder : value.length === 1 ? value[0] : `${value.length} selecionados`;

  return (
    <div className="block space-y-1.5" ref={ref}>
      {label ? <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span> : null}
      <div className="relative">
        {icon ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span> : null}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white pr-8 text-left text-sm text-slate-800 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30",
            icon ? "pl-9" : "pl-3",
          )}
        >
          <span className={cn("truncate", value.length === 0 && "text-slate-400")}>{summary}</span>
        </button>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">▾</span>

        {open ? (
          <div className="column-scroll absolute z-[70] mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
            {value.length > 0 ? (
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onChange([]); }}
                className="w-full px-3 py-1.5 text-left text-xs font-semibold text-blue-600 hover:bg-slate-50"
              >
                Limpar seleção
              </button>
            ) : null}
            {options.map((opt) => {
              const checked = value.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); toggle(opt); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]",
                      checked ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300",
                    )}
                  >
                    {checked ? "✓" : ""}
                  </span>
                  <span className="truncate">{opt}</span>
                </button>
              );
            })}
            {options.length === 0 ? <p className="px-3 py-2 text-sm text-slate-400">Sem opções</p> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
