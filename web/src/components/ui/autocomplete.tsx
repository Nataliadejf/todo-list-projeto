"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface AutocompleteOption {
  value: string;
  label: string;
  hint?: string;
}

interface AutocompleteProps {
  label?: string;
  placeholder?: string;
  options: AutocompleteOption[];
  value: string | null;
  onChange: (value: string | null, option: AutocompleteOption | null) => void;
  allowClear?: boolean;
  emptyLabel?: string;
}

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function Autocomplete({
  label,
  placeholder = "Digite para buscar...",
  options,
  value,
  onChange,
  allowClear = true,
  emptyLabel = "Nenhum resultado",
}: AutocompleteProps) {
  const selected = useMemo(() => options.find((o) => o.value === value) ?? null, [options, value]);
  const [query, setQuery] = useState(selected?.label ?? "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(selected?.label ?? "");
  }, [selected]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery(selected?.label ?? "");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [selected]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q || q === normalize(selected?.label ?? "")) return options.slice(0, 50);
    return options.filter((o) => normalize(o.label).includes(q) || normalize(o.hint ?? "").includes(q)).slice(0, 50);
  }, [options, query, selected]);

  const select = (option: AutocompleteOption) => {
    onChange(option.value, option);
    setQuery(option.label);
    setOpen(false);
  };

  const clear = () => {
    onChange(null, null);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="block space-y-1.5" ref={containerRef}>
      {label ? (
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      ) : null}
      <div className="relative">
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          onFocus={() => {
            setOpen(true);
            setActiveIndex(0);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIndex(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              if (open && filtered[activeIndex]) {
                e.preventDefault();
                select(filtered[activeIndex]);
              }
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className={cn(
            "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 pr-8 text-sm text-slate-900 shadow-sm",
            "placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30",
          )}
        />
        {allowClear && value ? (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label="Limpar"
          >
            ✕
          </button>
        ) : (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">▾</span>
        )}

        {open ? (
          <ul className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-400">{emptyLabel}</li>
            ) : (
              filtered.map((option, index) => (
                <li key={option.value}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      select(option);
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cn(
                      "flex w-full flex-col items-start px-3 py-2 text-left text-sm",
                      index === activeIndex ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50",
                    )}
                  >
                    <span className="font-medium">{option.label}</span>
                    {option.hint ? <span className="text-xs text-slate-400">{option.hint}</span> : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
