"use client";

import { useMemo, useState } from "react";
import { BarChart3, Gauge, Layers, Target, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTodos } from "@/components/providers/todos-provider";
import { useResponsaveis } from "@/components/providers/responsaveis-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { getPriorityScore, hideInactiveOwners } from "@/lib/todo-utils";
import { EIXOS, EIXO_BY_KEY, eixoKeyOf, eixoStats, legadoKpis } from "@/lib/executive-utils";
import type { Initiative } from "@/lib/types";

const PALETTE = ["#2563EB", "#0F7C66", "#D97706", "#DB2777", "#0891B2", "#DC2626", "#7C3AED", "#059669", "#9333EA", "#B45309"];

// Valores de partida (editáveis) por eixo — placeholders até haver indicador estruturado.
const META_DEFAULTS: Record<string, { atual: number; alvo: number }> = {
  financeiro: { atual: 0, alvo: 500 },
  governanca: { atual: 40, alvo: 90 },
  iso: { atual: 0, alvo: 20 },
  produtividade: { atual: 0, alvo: 1000 },
  impacto: { atual: 0, alvo: 30 },
  experiencia: { atual: 60, alvo: 80 },
  outros: { atual: 0, alvo: 100 },
};

const nf = (n: number, dec = 1) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
const signed = (n: number, dec = 1) => (n >= 0 ? "+" : "−") + nf(Math.abs(n), dec);

interface SimRow {
  on: boolean;
  contrib: number;
  conf: number;
}

export function ExecutivoClient() {
  const { todos } = useTodos();
  const { inactiveNames } = useResponsaveis();
  const { isAdmin } = useAuth();

  const base = useMemo(
    () => (isAdmin ? todos : hideInactiveOwners(todos, inactiveNames)),
    [todos, isAdmin, inactiveNames],
  );

  // --- Camada 1: legado (automático) ---
  const kpis = useMemo(() => legadoKpis(base), [base]);
  const stats = useMemo(() => eixoStats(base), [base]);

  // --- Camada 2: simulador ---
  const [eixoKey, setEixoKey] = useState("financeiro");
  const eixo = EIXO_BY_KEY[eixoKey] ?? EIXOS[0];
  const [metaNome, setMetaNome] = useState(eixo.indicator);
  const [atual, setAtual] = useState(META_DEFAULTS.financeiro.atual);
  const [alvo, setAlvo] = useState(META_DEFAULTS.financeiro.alvo);

  // iniciativas do eixo, ordenadas por prioridade
  const eixoInis = useMemo(
    () => base.filter((t) => eixoKeyOf(t.gainCategory) === eixoKey)
      .sort((a, b) => getPriorityScore(b) - getPriorityScore(a)),
    [base, eixoKey],
  );

  const seedSim = (inis: Initiative[], desired: number): Record<number, SimRow> => {
    const on = inis.slice(0, 6); // top 6 por prioridade entram por padrão
    const wsum = on.reduce((s, t) => s + Math.max(getPriorityScore(t), 1), 0) || 1;
    const map: Record<number, SimRow> = {};
    inis.forEach((t, i) => {
      const isOn = i < 6;
      const w = Math.max(getPriorityScore(t), 1);
      map[t.dbId] = { on: isOn, contrib: isOn ? Math.round((desired * w / wsum) * 10) / 10 : 0, conf: 70 };
    });
    return map;
  };

  const [sim, setSim] = useState<Record<number, SimRow>>(() => seedSim(eixoInis, META_DEFAULTS.financeiro.alvo - META_DEFAULTS.financeiro.atual));

  const changeEixo = (key: string) => {
    const e = EIXO_BY_KEY[key] ?? EIXOS[0];
    const d = META_DEFAULTS[key] ?? { atual: 0, alvo: 100 };
    setEixoKey(key);
    setMetaNome(e.indicator);
    setAtual(d.atual);
    setAlvo(d.alvo);
    const inis = base.filter((t) => eixoKeyOf(t.gainCategory) === key).sort((a, b) => getPriorityScore(b) - getPriorityScore(a));
    setSim(seedSim(inis, d.alvo - d.atual));
  };

  const desired = alvo - atual;
  const setRow = (dbId: number, patch: Partial<SimRow>) =>
    setSim((prev) => ({ ...prev, [dbId]: { ...prev[dbId], ...patch } }));
  const redistribuir = () => setSim(seedSim(eixoInis, desired));

  // projeções
  const rows = eixoInis.map((t, i) => {
    const s = sim[t.dbId] ?? { on: false, contrib: 0, conf: 70 };
    return { t, s, color: PALETTE[i % PALETTE.length], proj: s.on ? s.contrib * (s.conf / 100) : 0 };
  });
  const onRows = rows.filter((r) => r.s.on);
  const proj = onRows.reduce((a, r) => a + r.proj, 0);
  const bruto = onRows.reduce((a, r) => a + r.s.contrib, 0);
  const pct = desired > 0 ? (proj / desired) * 100 : 0;
  const gap = desired - proj;
  const unit = eixo.unit;
  const cls = pct >= 100 ? "good" : pct >= 70 ? "warn" : "bad";
  const statusLabel = pct >= 100 ? "Meta coberta" : pct >= 70 ? "Quase lá" : "Cobertura parcial";
  const ranking = [...onRows].sort((a, b) => b.proj - a.proj);
  const maxProj = ranking.length ? ranking[0].proj : 1;

  const tone = {
    good: { text: "text-emerald-600", bg: "bg-emerald-500", soft: "bg-emerald-50 text-emerald-700", bar: "before:bg-emerald-500" },
    warn: { text: "text-amber-600", bg: "bg-amber-500", soft: "bg-amber-50 text-amber-700", bar: "before:bg-amber-500" },
    bad: { text: "text-rose-600", bg: "bg-rose-500", soft: "bg-rose-50 text-rose-700", bar: "before:bg-rose-500" },
  }[cls];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visão Executiva"
        subtitle="Indicadores-chave do portfólio: leitura automática do legado por eixo estratégico e simulação do impacto das iniciativas sobre a meta global."
        showNewButton={false}
      />

      {/* ============ CAMADA 1 — LEGADO (AUTOMÁTICO) ============ */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Visão do legado</span>
          <span className="text-[11px] text-slate-400">— calculado a partir do que já está cadastrado</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi icon={<Layers className="h-4 w-4" />} label="Iniciativas" value={String(kpis.total)} note={`${kpis.done} concluídas`} accent="bg-blue-500" />
          <Kpi icon={<TrendingUp className="h-4 w-4" />} label="Taxa de conclusão" value={`${kpis.donePct}%`} note="do portfólio" accent="bg-emerald-500" />
          <Kpi icon={<BarChart3 className="h-4 w-4" />} label="Prioridade média" value={nf(kpis.gutAvg, 1)} note="GUT (relev. × urgência)" accent="bg-amber-500" />
          <Kpi icon={<Gauge className="h-4 w-4" />} label="Esforço entregue" value={String(kpis.effortDone)} note="pontos de tamanho concluídos" accent="bg-violet-500" />
        </div>
      </div>

      {/* Eixos estratégicos */}
      <div>
        <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Eixos estratégicos (categorias de ganho)</div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {stats.map((e) => {
            const activeSim = e.key === eixoKey;
            return (
              <button
                key={e.key}
                type="button"
                onClick={() => changeEixo(e.key)}
                className={`rounded-2xl border bg-white p-5 text-left shadow-[0_8px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-lg ${activeSim ? "border-slate-900 ring-1 ring-slate-900" : "border-slate-200/80"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-sm" style={{ background: e.accent }} />
                    <span className="text-sm font-bold text-slate-900">{e.label}</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-400">{e.count} inic.</span>
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <div className="text-2xl font-bold tabular-nums text-slate-900">{e.donePct}%</div>
                    <div className="text-[11px] text-slate-400">concluído</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold tabular-nums text-slate-700">GUT {nf(e.gutAvg, 1)}</div>
                    <div className="text-[11px] text-slate-400">{e.effortDone} pts esforço</div>
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${e.donePct}%`, background: e.accent }} />
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                  <span className="font-semibold text-slate-600">Indicador-chave:</span> {EIXO_BY_KEY[e.key]?.indicator}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ============ CAMADA 2 — SIMULADOR ============ */}
      <div className="mb-1 mt-2 flex items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Simulador de impacto</span>
        <span className="text-[11px] text-slate-400">— projeta quanto as iniciativas movem a meta (ponderado pela confiança)</span>
      </div>

      {/* Meta global */}
      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
            <Target className="h-4 w-4 text-slate-500" /> Meta global
          </div>
          <div className="grid items-end gap-4 md:grid-cols-[220px_minmax(0,1fr)_150px_150px_auto]">
            <Field label="Eixo estratégico">
              <select
                value={eixoKey}
                onChange={(e) => changeEixo(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                {stats.map((e) => (
                  <option key={e.key} value={e.key}>{e.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Indicador da meta">
              <input
                value={metaNome}
                onChange={(e) => setMetaNome(e.target.value)}
                className="w-full border-b-2 border-slate-200 bg-transparent px-0 py-1.5 text-base font-semibold text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </Field>
            <Field label={`Valor atual (${unit})`}>
              <input type="number" value={atual} onChange={(e) => setAtual(Number(e.target.value) || 0)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-slate-900" />
            </Field>
            <Field label={`Meta / alvo (${unit})`}>
              <input type="number" value={alvo} onChange={(e) => setAlvo(Number(e.target.value) || 0)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-slate-900" />
            </Field>
            <div className="rounded-xl border border-slate-900 bg-slate-900 px-4 py-2.5 text-center text-white">
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-300">Melhoria desejada</div>
              <div className="text-xl font-bold tabular-nums">{signed(desired)} <span className="text-sm font-semibold text-slate-300">{unit}</span></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs do simulador */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={<TrendingUp className="h-4 w-4" />} label="Projeção ponderada" value={`${signed(proj)}`} note={`Bruto: ${signed(bruto)} ${unit}`} accent="bg-slate-900" />
        <Kpi icon={<Gauge className="h-4 w-4" />} label="Cobertura da meta" value={`${Math.round(pct)}%`} note="da melhoria desejada" accent={tone.bg} />
        <Kpi icon={<Target className="h-4 w-4" />} label="Gap para a meta" value={gap > 0 ? signed(gap) : "+0,0"} note={gap > 0 ? "falta cobrir" : "meta coberta ✓"} accent={gap > 0 ? "bg-rose-500" : "bg-emerald-500"} />
        <Kpi icon={<Layers className="h-4 w-4" />} label="Iniciativas no plano" value={`${onRows.length} / ${eixoInis.length}`} note="alavancas ativas" accent="bg-blue-500" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Iniciativas / alavancas */}
        <Card>
          <CardContent className="p-5">
            <div className="mb-1 flex items-center justify-between">
              <div className="text-sm font-bold text-slate-900">Iniciativas &amp; alavancas</div>
              <Button variant="secondary" size="sm" onClick={redistribuir}>Redistribuir por prioridade</Button>
            </div>
            <p className="mb-3 text-xs text-slate-500">Marque as iniciativas do plano e ajuste a contribuição estimada e a confiança de cada uma. A estimativa inicial é distribuída pela prioridade (GUT).</p>
            <div className="max-h-[520px] space-y-2 overflow-auto pr-1">
              {rows.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">Nenhuma iniciativa neste eixo.</p>
              ) : rows.map((r) => (
                <div key={r.t.dbId} className={`rounded-xl border p-3 transition ${r.s.on ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50/50 opacity-60"}`}>
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => setRow(r.t.dbId, { on: !r.s.on })}
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 text-[11px] text-white transition"
                      style={{ background: r.s.on ? r.color : "transparent", borderColor: r.s.on ? r.color : "#cbd5e1" }}
                      aria-pressed={r.s.on}
                    >{r.s.on ? "✓" : ""}</button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold leading-snug text-slate-900">{r.t.initiative}</span>
                        <Badge variant="default">GUT {getPriorityScore(r.t) || "—"}</Badge>
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-400">{r.t.owner || "—"} · {r.t.area || "—"}{r.t.size ? ` · ${r.t.size}` : ""}</div>

                      {r.s.on ? (
                        <div className="mt-3 grid grid-cols-[110px_minmax(0,1fr)_78px] items-end gap-3">
                          <label className="block">
                            <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-400">Contrib. ({unit})</span>
                            <input type="number" step="0.1" value={r.s.contrib}
                              onChange={(e) => setRow(r.t.dbId, { contrib: Number(e.target.value) || 0 })}
                              className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-right text-sm font-bold tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900" />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-400">Confiança</span>
                            <div className="flex items-center gap-2">
                              <input type="range" min={0} max={100} step={5} value={r.s.conf}
                                onChange={(e) => setRow(r.t.dbId, { conf: Number(e.target.value) })}
                                className="flex-1" style={{ accentColor: r.color }} />
                              <span className="w-9 text-right text-xs font-bold tabular-nums text-slate-700">{r.s.conf}%</span>
                            </div>
                          </label>
                          <div className="text-right">
                            <div className="text-sm font-bold tabular-nums" style={{ color: r.color }}>{signed(r.proj)}</div>
                            <div className="text-[9px] uppercase text-slate-400">projeção</div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cobertura + ranking */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <div className="mb-3 text-sm font-bold text-slate-900">Cobertura da meta</div>
              <div className="text-center">
                <div className={`text-5xl font-bold tabular-nums ${tone.text}`}>{Math.round(pct)}<span className="text-2xl">%</span></div>
                <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">da meta projetada</div>
                <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${tone.soft}`}>{statusLabel}</span>
              </div>
              <div className="relative mt-4 flex h-7 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                {ranking.map((r) => {
                  const w = desired > 0 ? Math.min((r.proj / desired) * 100, 100) : 0;
                  return <div key={r.t.dbId} title={`${r.t.initiative}: ${signed(r.proj)} ${unit}`} style={{ width: `${w}%`, background: r.color }} className="h-full" />;
                })}
                <div className="absolute inset-y-0" style={{ left: "100%", width: 2, background: "#0f172a" }} />
              </div>
              <div className="mt-1.5 flex justify-between text-[9px] font-semibold text-slate-400"><span>0</span><span>meta</span></div>
              <div className="mt-3 space-y-1.5">
                {onRows.length === 0 ? <p className="text-xs text-slate-400">Nenhuma iniciativa selecionada.</p> :
                  onRows.map((r) => (
                    <div key={r.t.dbId} className="flex items-center gap-2 text-xs">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: r.color }} />
                      <span className="min-w-0 flex-1 truncate text-slate-500">{r.t.initiative}</span>
                      <span className="font-bold tabular-nums" style={{ color: r.color }}>{signed(r.proj)}</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="mb-3 text-sm font-bold text-slate-900">Ranking de contribuição</div>
              {ranking.length === 0 ? <p className="text-xs text-slate-400">Selecione iniciativas para ver o ranking.</p> :
                <div className="space-y-3">
                  {ranking.map((r) => (
                    <div key={r.t.dbId}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">{r.t.initiative}</span>
                        <span className="text-xs font-bold tabular-nums" style={{ color: r.color }}>{signed(r.proj)}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full" style={{ width: `${maxProj > 0 ? (r.proj / maxProj) * 100 : 0}%`, background: r.color }} />
                      </div>
                    </div>
                  ))}
                </div>}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="mb-2 text-sm font-bold text-slate-900">Como é calculado</div>
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
                Cada iniciativa projeta <span className="font-semibold text-slate-700">contribuição × confiança</span>. A soma das selecionadas é a projeção do plano; a <span className="font-semibold text-slate-700">cobertura</span> é a projeção ÷ melhoria desejada. O indicador-chave estruturado por iniciativa (linha de base → meta) entra numa próxima etapa e passa a alimentar estes números automaticamente.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, note, accent }: { icon: React.ReactNode; label: string; value: string; note: string; accent: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
      <span className={`absolute inset-y-0 left-0 w-1 ${accent}`} />
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <span className="text-slate-300">{icon}</span>
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{value}</div>
      <p className="mt-1 text-[11px] text-slate-500">{note}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
  );
}
