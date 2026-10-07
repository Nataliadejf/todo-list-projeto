"use client";

import { Plus, Trash2 } from "lucide-react";
import { DIRECTION_LABELS, INDICATOR_UNITS, MARKET_INDICATORS, UNIT_LABELS, emptyIndicator, indicatorResult, memoryExample, toNumber } from "@/lib/indicators";
import type { IndicatorsData, InitiativeIndicator } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const selectClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30";

interface Props {
  value: IndicatorsData;
  onChange: (next: IndicatorsData) => void;
  concluded?: boolean;
}

export function InitiativeIndicators({ value, onChange, concluded = false }: Props) {
  function patchItem(index: number, patch: Partial<InitiativeIndicator>) {
    onChange({ ...value, items: value.items.map((it, i) => (i === index ? { ...it, ...patch } : it)) });
  }

  function pickName(index: number, name: string) {
    const known = MARKET_INDICATORS.find((m) => m.name.toLowerCase() === name.trim().toLowerCase());
    patchItem(index, known ? { name: known.name, unit: known.unit, direction: known.direction } : { name });
  }

  function answer(has: "Sim" | "Não") {
    if (has === value.has) return;
    onChange({ ...value, has });
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="space-y-2">
        <Label>Possui indicador de eficácia? *</Label>
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm" role="radiogroup" aria-label="Possui indicador de eficácia">
          {(["Sim", "Não"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={value.has === opt}
              onClick={() => answer(opt)}
              className={
                "rounded-lg px-5 py-1.5 text-sm font-semibold transition-colors " +
                (value.has === opt ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900")
              }
            >
              {opt}
            </button>
          ))}
        </div>
        {!value.has ? <p className="text-[11px] text-amber-600">Resposta obrigatória.</p> : null}
      </div>

      {value.has === "Não" ? (
        <div className="space-y-1.5">
          <Label htmlFor="indicator-justification">Justificativa *</Label>
          <Textarea
            id="indicator-justification"
            rows={2}
            value={value.justification}
            onChange={(e) => onChange({ ...value, justification: e.target.value })}
            placeholder="Por que esta iniciativa não possui indicador de eficácia?"
          />
        </div>
      ) : null}

      {value.has === "Sim" ? (
        <div className="space-y-3">
          <datalist id="market-indicators">
            {MARKET_INDICATORS.map((m) => (
              <option key={m.name} value={m.name} />
            ))}
          </datalist>

          {value.items.map((item, index) => {
            const base = toNumber(item.base);
            const target = toNumber(item.target);
            const delta = base !== null && target !== null ? Math.round((target - base) * 100) / 100 : null;
            const result = indicatorResult(item);
            return (
              <div key={index} className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Indicador {index + 1}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remover indicador ${index + 1}`}
                    onClick={() => onChange({ ...value, items: value.items.filter((_, i) => i !== index) })}
                  >
                    <Trash2 className="h-4 w-4 text-rose-600" />
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                  <div className="space-y-1.5">
                    <Label htmlFor={`ind-name-${index}`}>Indicador *</Label>
                    <Input
                      id={`ind-name-${index}`}
                      list="market-indicators"
                      autoComplete="off"
                      value={item.name}
                      onChange={(e) => pickName(index, e.target.value)}
                      placeholder="Selecione uma sugestão ou escreva o seu"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`ind-unit-${index}`}>Unidade de medida *</Label>
                    <select
                      id={`ind-unit-${index}`}
                      className={selectClass}
                      value={item.unit}
                      onChange={(e) => patchItem(index, { unit: e.target.value })}
                    >
                      {INDICATOR_UNITS.map((u) => (
                        <option key={u} value={u}>{UNIT_LABELS[u] ?? u}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={`ind-dir-${index}`}>Direção do indicador *</Label>
                    <select
                      id={`ind-dir-${index}`}
                      className={selectClass}
                      value={item.direction}
                      onChange={(e) => patchItem(index, { direction: e.target.value as "maior" | "menor" })}
                    >
                      <option value="maior">{DIRECTION_LABELS.maior}</option>
                      <option value="menor">{DIRECTION_LABELS.menor}</option>
                    </select>
                  </div>
                  <p className="self-end pb-2 text-[11px] text-slate-400">
                    {item.direction === "menor"
                      ? "O ganho é calculado como ponto de partida − realizado (redução = ganho)."
                      : "O ganho é calculado como realizado − ponto de partida (aumento = ganho)."}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={`ind-base-${index}`}>Ponto de partida *</Label>
                    <Input id={`ind-base-${index}`} inputMode="decimal" value={item.base} onChange={(e) => patchItem(index, { base: e.target.value })} placeholder="Hoje" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`ind-target-${index}`}>Ponto de chegada *</Label>
                    <Input id={`ind-target-${index}`} inputMode="decimal" value={item.target} onChange={(e) => patchItem(index, { target: e.target.value })} placeholder="Meta" />
                    {delta !== null ? (
                      <p className="text-[11px] text-slate-400">
                        Variação prevista: {delta > 0 ? "+" : ""}{delta.toLocaleString("pt-BR")} {item.unit}
                      </p>
                    ) : null}
                    {delta !== null && delta !== 0 && (item.direction === "menor" ? delta > 0 : delta < 0) ? (
                      <p className="text-[11px] text-amber-600">
                        A meta vai na direção oposta à escolhida ({item.direction === "menor" ? "reduzir" : "aumentar"}). Confira os valores.
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={`ind-achieved-${index}`}>Realizado{concluded ? " *" : ""}</Label>
                    <Input
                      id={`ind-achieved-${index}`}
                      inputMode="decimal"
                      value={item.achieved}
                      onChange={(e) => patchItem(index, { achieved: e.target.value })}
                      placeholder="Resultado obtido"
                    />
                    <p className="text-[11px] text-slate-400">
                      {concluded ? "Obrigatório: a iniciativa está concluída." : "Preencha ao concluir a iniciativa."}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Ganho / retorno</Label>
                    <div className="flex h-10 items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 text-sm">
                      {result ? (
                        <span className={result.gain >= 0 ? "font-semibold text-emerald-700" : "font-semibold text-rose-600"}>
                          {result.gain > 0 ? "+" : ""}{result.gain.toLocaleString("pt-BR")} {item.unit}
                          {result.pct !== null ? <span className="ml-2 font-normal text-slate-500">({result.pct.toLocaleString("pt-BR")}% da meta)</span> : null}
                        </span>
                      ) : (
                        <span className="text-slate-400">{item.direction === "menor" ? "Partida − realizado" : "Realizado − ponto de partida"}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor={`ind-memory-${index}`}>Memória de cálculo</Label>
                    <button
                      type="button"
                      className="text-[11px] font-semibold text-blue-600 hover:underline"
                      onClick={() => patchItem(index, { memory: memoryExample(item.name) })}
                      title="Preenche o campo com um modelo para você adaptar"
                    >
                      {item.memory.trim() ? "Substituir pelo exemplo" : "Usar exemplo"}
                    </button>
                  </div>
                  <Textarea
                    id={`ind-memory-${index}`}
                    rows={4}
                    value={item.memory}
                    onChange={(e) => patchItem(index, { memory: e.target.value })}
                    placeholder={memoryExample(item.name)}
                  />
                  <p className="text-[11px] text-slate-400">Descreva a fórmula, a fonte dos dados, como o ponto de partida foi medido e a periodicidade.</p>
                </div>
              </div>
            );
          })}

          {value.items.length === 0 ? (
            <p className="text-xs text-slate-500">Cadastre o indicador de eficácia da iniciativa. É possível adicionar mais de um.</p>
          ) : null}
          <Button type="button" variant="secondary" onClick={() => onChange({ ...value, items: [...value.items, emptyIndicator()] })}>
            <Plus className="h-4 w-4" />
            {value.items.length === 0 ? "Adicionar indicador" : "Adicionar outro indicador"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
