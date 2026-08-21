"use client";

import { useEffect, useMemo, useState } from "react";
import { useTodos } from "@/components/providers/todos-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { METAS_GLOBAIS, META_BY_KEY, UNITS } from "@/lib/executive-utils";
import { fetchIndicadores, getExecPlan, saveExecPlan, type ExecEntry, type ExecPlan, type ExecTarget, type Indicador } from "@/lib/exec-api";

const EXEC_EMAIL = "administradorportfolio@gmail.com";

const nf = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const signed = (n: number) => (n >= 0 ? "+" : "−") + nf(Math.abs(n));
const groupKey = (metaGlobal: string, indicadorId: string, unidade: string) => `${metaGlobal}::${indicadorId}::${unidade}`;

function buildGroups(metaKey: string, allEntries: ExecEntry[], targets: Record<string, ExecTarget>) {
  const prefix = `${metaKey}::`;
  const metaEntries = allEntries.filter((e) => e.metaGlobal === metaKey);
  // grupos vêm das metas registradas (indicador selecionado) E das iniciativas lançadas
  const keys = new Set<string>();
  metaEntries.forEach((e) => keys.add(groupKey(metaKey, e.indicadorId, e.unidade)));
  Object.keys(targets).forEach((k) => { if (k.startsWith(prefix)) keys.add(k); });
  return [...keys].map((gk) => {
    const parts = gk.split("::");
    const indicadorId = parts[1];
    const unidade = parts.slice(2).join("::");
    const entries = metaEntries.filter((e) => groupKey(metaKey, e.indicadorId, e.unidade) === gk);
    const target = targets[gk] ?? { base: 0, alvo: 0 };
    const desired = target.alvo - target.base; // com sinal (para exibir)
    const magnitude = Math.abs(desired); // quanto é preciso mover, independe do sentido
    const direction: "reduzir" | "aumentar" = desired < 0 ? "reduzir" : "aumentar";
    const projecao = entries.reduce((s, e) => s + e.contrib * (e.conf / 100), 0);
    const cobertura = magnitude > 0 ? (projecao / magnitude) * 100 : 0;
    return { gk, indicadorId, unidade, entries, target, desired, magnitude, direction, projecao, cobertura };
  });
}

export function ExecutivoClient() {
  const { todos } = useTodos();
  const { user } = useAuth();
  const canView = (user?.email || "").toLowerCase() === EXEC_EMAIL;

  const [indicadores, setIndicadores] = useState<Indicador[]>([]);
  const [plan, setPlan] = useState<ExecPlan>({ targets: {}, entries: [] });
  const [metaKey, setMetaKey] = useState(METAS_GLOBAIS[0].key);
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // formulário "adicionar iniciativa"
  const [addOpen, setAddOpen] = useState(false);
  const [af, setAf] = useState({ initiativeDbId: "", indicadorId: "", unidade: "%", contrib: 0, conf: 70 });
  // formulário "adicionar indicador ao plano" (seleciona indicador cadastrado + registra a meta)
  const [indOpen, setIndOpen] = useState(false);
  const [indForm, setIndForm] = useState({ indicadorId: "", unidade: "%", base: 0, alvo: 0 });

  useEffect(() => {
    if (!canView) return;
    Promise.all([fetchIndicadores().catch(() => []), getExecPlan().catch(() => ({ targets: {}, entries: [] }))])
      .then(([inds, p]) => { setIndicadores(inds); setPlan({ targets: p.targets || {}, entries: p.entries || [] }); })
      .finally(() => setLoaded(true));
  }, [canView]);

  const iniName = useMemo(() => {
    const m = new Map<number, string>();
    todos.forEach((t) => m.set(t.dbId, t.initiative || t.id || `Iniciativa ${t.dbId}`));
    return m;
  }, [todos]);
  const indName = useMemo(() => {
    const m = new Map<string, string>();
    indicadores.forEach((i) => m.set(i.id, i.nome));
    return m;
  }, [indicadores]);

  const metaInds = indicadores.filter((i) => i.metaGlobal === metaKey);
  const metaEntries = plan.entries.filter((e) => e.metaGlobal === metaKey);

  // agrupa por indicador + unidade (meta selecionada)
  const groups = useMemo(() => buildGroups(metaKey, plan.entries, plan.targets), [metaKey, plan]);

  // consolidação (todas as metas)
  const metaStats = useMemo(() => METAS_GLOBAIS.map((m) => {
    const gs = buildGroups(m.key, plan.entries, plan.targets);
    const cov = gs.length ? gs.reduce((a, g) => a + g.cobertura, 0) / gs.length : 0;
    const iniciativas = plan.entries.filter((e) => e.metaGlobal === m.key).length;
    return { meta: m, indicadores: gs.length, iniciativas, cobertura: cov };
  }), [plan]);

  // ganhos projetados somados por unidade (soma só faz sentido dentro da mesma unidade)
  const ganhosPorUnidade = useMemo(() => {
    const map: Record<string, number> = {};
    plan.entries.forEach((e) => { map[e.unidade] = (map[e.unidade] || 0) + e.contrib * (e.conf / 100); });
    return Object.entries(map).filter(([, v]) => Math.abs(v) > 0.0001).sort((a, b) => b[1] - a[1]);
  }, [plan.entries]);

  const markDirty = () => { setDirty(true); setMsg(null); };
  const setTarget = (gk: string, patch: Partial<{ base: number; alvo: number }>) => {
    setPlan((p) => {
      const cur = p.targets[gk] ?? { base: 0, alvo: 0 };
      return { ...p, targets: { ...p.targets, [gk]: { ...cur, ...patch } } };
    });
    markDirty();
  };
  const patchEntry = (key: string, patch: Partial<ExecEntry>) => {
    setPlan((p) => ({ ...p, entries: p.entries.map((e) => (e.key === key ? { ...e, ...patch } : e)) }));
    markDirty();
  };
  const removeEntry = (key: string) => {
    setPlan((p) => ({ ...p, entries: p.entries.filter((e) => e.key !== key) }));
    markDirty();
  };
  const addEntry = () => {
    if (!af.indicadorId || !af.unidade) { setMsg("Selecione o indicador e a unidade."); return; }
    const entry: ExecEntry = {
      key: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now() + Math.random()),
      initiativeDbId: af.initiativeDbId ? Number(af.initiativeDbId) : null,
      metaGlobal: metaKey,
      indicadorId: af.indicadorId,
      unidade: af.unidade,
      contrib: Number(af.contrib) || 0,
      conf: Number(af.conf) || 0,
    };
    setPlan((p) => ({ ...p, entries: [...p.entries, entry] }));
    setAf((f) => ({ ...f, initiativeDbId: "", contrib: 0 }));
    setAddOpen(false);
    markDirty();
  };
  const addIndicadorToPlan = () => {
    if (!indForm.indicadorId || !indForm.unidade) { setMsg("Selecione o indicador e a unidade."); return; }
    const gk = groupKey(metaKey, indForm.indicadorId, indForm.unidade);
    setPlan((p) => ({ ...p, targets: { ...p.targets, [gk]: { base: Number(indForm.base) || 0, alvo: Number(indForm.alvo) || 0 } } }));
    setIndForm((f) => ({ ...f, indicadorId: "", base: 0, alvo: 0 }));
    setIndOpen(false);
    markDirty();
  };
  const removeGroup = (gk: string) => {
    setPlan((p) => {
      const targets = { ...p.targets }; delete targets[gk];
      const entries = p.entries.filter((e) => groupKey(e.metaGlobal, e.indicadorId, e.unidade) !== gk);
      return { targets, entries };
    });
    markDirty();
  };
  const save = async () => {
    setSaving(true); setMsg(null);
    try { await saveExecPlan(plan); setDirty(false); setMsg("Plano salvo."); }
    catch (e) { setMsg(e instanceof Error ? e.message : "Erro ao salvar."); }
    finally { setSaving(false); }
  };

  const toneOf = (pct: number) => (pct >= 100 ? "good" : pct >= 70 ? "warn" : "bad");
  const metaSummary = useMemo(() => {
    const inis = new Set(metaEntries.map((e) => e.key)).size;
    const covs = groups.map((g) => g.cobertura);
    const avg = covs.length ? covs.reduce((a, b) => a + b, 0) / covs.length : 0;
    return { indicadores: groups.length, iniciativas: inis, cobertura: avg };
  }, [metaEntries, groups]);

  if (!canView) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
          <h2 className="text-lg font-bold text-slate-900">Acesso restrito</h2>
          <p className="mt-1.5 text-sm text-slate-500">A Visão Executiva está disponível apenas para o perfil executivo.</p>
        </div>
      </div>
    );
  }

  const todosSorted = [...todos].sort((a, b) => (a.initiative || "").localeCompare(b.initiative || "", "pt-BR"));

  return (
    <div className="exec">
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap" />
      <style>{CSS}</style>

      <div className="exec-head">
        <div className="head-row">
          <div>
            <p className="exec-eyebrow">Metas globais · Indicadores</p>
            <h2>Visão Executiva</h2>
          </div>
          <div className="save-box">
            {msg ? <span className={`save-msg ${dirty ? "" : "ok"}`}>{msg}</span> : null}
            {dirty ? <span className="dirty-dot">alterações não salvas</span> : null}
            <button className="btn primary" onClick={() => void save()} disabled={saving || !dirty}>{saving ? "Salvando…" : "Salvar plano"}</button>
          </div>
        </div>
        <p className="exec-sub">Escolha a meta global, adicione iniciativas e vincule cada uma a um indicador com sua unidade. O painel consolida por indicador, comparando a projeção (contribuição × confiança) com o alvo do período.</p>
      </div>

      {/* CONSOLIDAÇÃO — visão geral das 5 metas */}
      <div className="consol">
        <div className="consol-head">Consolidação — visão geral</div>
        <div className="consol-metas">
          {metaStats.map((s) => {
            const tone = toneOf(s.cobertura);
            return (
              <button key={s.meta.key} className={`consol-card${s.meta.key === metaKey ? " on" : ""}`} onClick={() => setMetaKey(s.meta.key)} style={{ ["--acc" as string]: s.meta.accent }}>
                <div className="cc-top"><span className="cc-dot" style={{ background: s.meta.accent }} />{s.meta.label}</div>
                <div className={`cc-cov t-${tone}`}>{Math.round(s.cobertura)}%<span>cobertura</span></div>
                <div className="cc-track"><div style={{ width: `${Math.min(Math.max(s.cobertura, 0), 100)}%`, background: s.meta.accent }} /></div>
                <div className="cc-meta"><b>{s.iniciativas}</b> iniciativas · <b>{s.indicadores}</b> indic.</div>
              </button>
            );
          })}
        </div>
        {ganhosPorUnidade.length > 0 ? (
          <div className="consol-ganhos">
            <span className="cg-lbl">Ganho projetado (por unidade):</span>
            {ganhosPorUnidade.map(([u, v]) => <span className="cg-chip" key={u}><b>{signed(v)}</b> {u}</span>)}
          </div>
        ) : (
          <div className="consol-ganhos empty">Adicione iniciativas com contribuição para consolidar os ganhos aqui.</div>
        )}
      </div>

      {/* METAS GLOBAIS */}
      <div className="metas">
        {METAS_GLOBAIS.map((m) => {
          const n = plan.entries.filter((e) => e.metaGlobal === m.key).length;
          return (
            <button key={m.key} className={`meta-pill${m.key === metaKey ? " on" : ""}`} onClick={() => setMetaKey(m.key)} style={{ ["--acc" as string]: m.accent }}>
              <span className="mp-dot" style={{ background: m.accent }} />
              {m.label}
              {n > 0 ? <span className="mp-n">{n}</span> : null}
            </button>
          );
        })}
      </div>

      {/* resumo da meta */}
      <div className="meta-summary">
        <div><b>{metaSummary.indicadores}</b><span>indicadores</span></div>
        <div><b>{metaSummary.iniciativas}</b><span>iniciativas</span></div>
        <div><b className={`t-${toneOf(metaSummary.cobertura)}`}>{Math.round(metaSummary.cobertura)}%</b><span>cobertura média</span></div>
        <div className="ms-actions">
          <button className="btn add-btn ghost2" onClick={() => setIndOpen((v) => !v)}>+ Adicionar indicador</button>
          <button className="btn add-btn" onClick={() => setAddOpen((v) => !v)}>+ Adicionar iniciativa</button>
        </div>
      </div>

      {/* form adicionar indicador ao plano (seleciona + registra a meta) */}
      {indOpen ? (
        <div className="add-form">
          <div className="af-grid" style={{ gridTemplateColumns: "1.6fr .9fr .9fr .9fr auto" }}>
            <label className="af-field"><span>Indicador (cadastrado)</span>
              <select value={indForm.indicadorId} onChange={(e) => setIndForm((f) => ({ ...f, indicadorId: e.target.value }))}>
                <option value="">— selecione —</option>
                {metaInds.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
              </select>
            </label>
            <label className="af-field sm"><span>Unidade</span>
              <select value={indForm.unidade} onChange={(e) => setIndForm((f) => ({ ...f, unidade: e.target.value }))}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </label>
            <label className="af-field sm"><span>Base</span>
              <input type="number" step="0.1" value={indForm.base} onChange={(e) => setIndForm((f) => ({ ...f, base: Number(e.target.value) }))} />
            </label>
            <label className="af-field sm"><span>Alvo</span>
              <input type="number" step="0.1" value={indForm.alvo} onChange={(e) => setIndForm((f) => ({ ...f, alvo: Number(e.target.value) }))} />
            </label>
            <button className="btn primary" onClick={addIndicadorToPlan} disabled={!indForm.indicadorId}>Adicionar ao plano</button>
          </div>
          {metaInds.length === 0 ? <p className="af-warn">Esta meta ainda não tem indicadores. Cadastre em Administração → Indicadores.</p>
            : <p className="af-warn" style={{ color: "var(--ink-soft)" }}>Escolha um indicador já cadastrado e registre a meta (base → alvo). Depois adicione iniciativas nele.</p>}
        </div>
      ) : null}

      {/* form adicionar iniciativa */}
      {addOpen ? (
        <div className="add-form">
          <div className="af-grid">
            <label className="af-field"><span>Iniciativa</span>
              <select value={af.initiativeDbId} onChange={(e) => setAf((f) => ({ ...f, initiativeDbId: e.target.value }))}>
                <option value="">— selecione —</option>
                {todosSorted.map((t) => <option key={t.dbId} value={t.dbId}>{t.initiative || `#${t.dbId}`}</option>)}
              </select>
            </label>
            <label className="af-field"><span>Indicador</span>
              <select value={af.indicadorId} onChange={(e) => setAf((f) => ({ ...f, indicadorId: e.target.value }))}>
                <option value="">— selecione —</option>
                {metaInds.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
              </select>
            </label>
            <label className="af-field sm"><span>Unidade</span>
              <select value={af.unidade} onChange={(e) => setAf((f) => ({ ...f, unidade: e.target.value }))}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </label>
            <label className="af-field sm"><span>Contribuição</span>
              <input type="number" step="0.1" value={af.contrib} onChange={(e) => setAf((f) => ({ ...f, contrib: Number(e.target.value) }))} />
            </label>
            <label className="af-field sm"><span>Confiança %</span>
              <input type="number" min={0} max={100} step={5} value={af.conf} onChange={(e) => setAf((f) => ({ ...f, conf: Number(e.target.value) }))} />
            </label>
            <button className="btn primary" onClick={addEntry}>Adicionar</button>
          </div>
          {metaInds.length === 0 ? <p className="af-warn">Esta meta ainda não tem indicadores. Cadastre em Administração → Indicadores.</p> : null}
        </div>
      ) : null}

      {/* GRUPOS (indicador + unidade) */}
      {!loaded ? <p className="loading">Carregando plano…</p> : groups.length === 0 ? (
        <div className="empty-card">Nenhum indicador nesta meta ainda. Clique em <b>“+ Adicionar indicador”</b> para registrar a meta (base → alvo) e depois adicione iniciativas.</div>
      ) : (
        <div className="groups">
          {groups.map((g) => {
            const tone = toneOf(g.cobertura);
            return (
              <div className="group" key={g.gk}>
                <div className="group-head">
                  <div className="gh-title">
                    <span className="gh-name">{indName.get(g.indicadorId) || "Indicador"}</span>
                    <span className="gh-unit">{g.unidade}</span>
                  </div>
                  <div className="gh-target">
                    <label><span>Base</span><input type="number" step="0.1" value={g.target.base} onChange={(e) => setTarget(g.gk, { base: Number(e.target.value) })} /></label>
                    <span className="arrow">→</span>
                    <label><span>Alvo</span><input type="number" step="0.1" value={g.target.alvo} onChange={(e) => setTarget(g.gk, { alvo: Number(e.target.value) })} /></label>
                    <div className="gh-desired"><span>{g.direction}</span><b>{g.direction === "reduzir" ? "↓" : "↑"} {nf(g.magnitude)}</b></div>
                  </div>
                  <div className={`gh-cover t-${tone}`}>{Math.round(g.cobertura)}%<span>cobertura</span></div>
                  <button className="gh-del" title="Remover indicador do plano" onClick={() => removeGroup(g.gk)}>✕</button>
                </div>
                <div className="cover-bar">
                  <div className="cover-fill" style={{ width: `${Math.min(Math.max(g.cobertura, 0), 100)}%` }} data-tone={tone} />
                  <div className="cover-goal" />
                </div>
                <div className="proj-line">Projeção: <b>{nf(g.projecao)} {g.unidade}</b> de {nf(g.magnitude)} {g.unidade} a {g.direction}</div>

                <div className="entries">
                  {g.entries.map((e) => {
                    const p = e.contrib * (e.conf / 100);
                    return (
                      <div className="entry" key={e.key}>
                        <div className="e-name">{e.initiativeDbId != null ? (iniName.get(e.initiativeDbId) || `#${e.initiativeDbId}`) : "— (sem iniciativa)"}</div>
                        <label className="e-f"><span>Contrib. ({g.unidade})</span><input type="number" step="0.1" value={e.contrib} onChange={(ev) => patchEntry(e.key, { contrib: Number(ev.target.value) })} /></label>
                        <label className="e-f conf"><span>Confiança</span>
                          <div className="rowc"><input type="range" min={0} max={100} step={5} value={e.conf} onChange={(ev) => patchEntry(e.key, { conf: Number(ev.target.value) })} style={{ accentColor: META_BY_KEY[metaKey]?.accent }} /><i>{e.conf}%</i></div>
                        </label>
                        <div className="e-out"><b>{signed(p)}</b><span>proj.</span></div>
                        <button className="e-del" title="Remover" onClick={() => removeEntry(e.key)}>✕</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const CSS = `
.exec{--bg:#F4F5F8;--surface:#FFFFFF;--surface-2:#FAFBFC;--ink:#1A1D29;--ink-soft:#7B8190;--ink-faint:#A6ABB6;--line:#E7E9EE;--primary:#B9870A;--primary-soft:#FDF4D6;--primary-vivid:#FBAB18;--primary-vivid-deep:#E0960A;--good:#1FA15B;--good-soft:#E7F7EE;--warn:#D98A1B;--warn-soft:#FCF1DE;--bad:#E0473A;--bad-soft:#FBEAE8;font-family:'Nunito',-apple-system,'Segoe UI',sans-serif;color:var(--ink);}
.exec *{box-sizing:border-box;}
.exec .exec-head{margin-bottom:16px;}
.exec .head-row{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;}
.exec .exec-eyebrow{font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--primary);margin:0 0 5px;display:flex;align-items:center;gap:8px;}
.exec .exec-eyebrow::before{content:"";width:22px;height:2px;background:var(--primary-vivid);border-radius:2px;}
.exec h2{font-size:23px;margin:0;font-weight:800;letter-spacing:-.02em;}
.exec .exec-sub{color:var(--ink-soft);font-size:13px;margin:10px 0 0;max-width:680px;line-height:1.5;}
.exec .save-box{display:flex;align-items:center;gap:10px;}
.exec .save-msg{font-size:11.5px;font-weight:700;color:var(--warn);}
.exec .save-msg.ok{color:var(--good);}
.exec .dirty-dot{font-size:10.5px;font-weight:700;color:var(--warn);background:var(--warn-soft);border-radius:20px;padding:3px 9px;}
.exec .btn{font-size:12.5px;font-weight:700;border-radius:9px;padding:9px 16px;cursor:pointer;border:1px solid transparent;font-family:inherit;}
.exec .btn.primary{background:var(--primary-vivid);color:#1A1D29;}
.exec .btn.primary:hover:not(:disabled){background:var(--primary-vivid-deep);}
.exec .btn:disabled{opacity:.5;cursor:default;}
.exec .consol{background:linear-gradient(135deg,var(--primary-soft),#FDE9B0);border:1px solid #EBCF7A;border-radius:16px;padding:18px 20px;margin-bottom:18px;}
.exec .consol-head{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--primary);margin-bottom:14px;}
.exec .consol-metas{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;}
@media(max-width:900px){.exec .consol-metas{grid-template-columns:repeat(2,1fr);}}
.exec .consol-card{text-align:left;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:13px 14px;cursor:pointer;font-family:inherit;transition:.12s;box-shadow:0 1px 2px rgba(20,22,30,.04);}
.exec .consol-card:hover{border-color:var(--acc);box-shadow:0 6px 16px rgba(20,22,30,.09);}
.exec .consol-card.on{border-color:var(--acc);box-shadow:0 0 0 1px var(--acc);}
.exec .cc-top{display:flex;align-items:center;gap:7px;font-size:11.5px;font-weight:800;color:var(--ink);line-height:1.25;}
.exec .cc-dot{width:9px;height:9px;border-radius:3px;flex:none;}
.exec .cc-cov{font-size:24px;font-weight:800;margin-top:8px;line-height:1;font-variant-numeric:tabular-nums;color:var(--ink);}
.exec .cc-cov span{display:block;font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-faint);margin-top:2px;}
.exec .cc-cov.t-good{color:var(--good);}.exec .cc-cov.t-warn{color:var(--warn);}.exec .cc-cov.t-bad{color:var(--bad);}
.exec .cc-track{height:5px;border-radius:4px;background:var(--surface-2);overflow:hidden;margin:9px 0 8px;}
.exec .cc-track>div{height:100%;border-radius:4px;}
.exec .cc-meta{font-size:11px;color:var(--ink-soft);font-weight:600;}
.exec .cc-meta b{color:var(--ink);font-weight:800;font-variant-numeric:tabular-nums;}
.exec .consol-ganhos{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-top:14px;padding-top:14px;border-top:1px solid #EBCF7A;}
.exec .consol-ganhos.empty{color:var(--primary);font-size:11.5px;font-weight:600;}
.exec .cg-lbl{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--primary);}
.exec .cg-chip{background:var(--surface);border:1px solid #EBCF7A;border-radius:20px;padding:4px 12px;font-size:12px;color:var(--ink-soft);}
.exec .cg-chip b{color:var(--ink);font-weight:800;font-variant-numeric:tabular-nums;}
.exec .metas{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;}
.exec .meta-pill{display:flex;align-items:center;gap:8px;border:1px solid var(--line);background:var(--surface);border-radius:22px;padding:8px 15px;font-size:12.5px;font-weight:700;color:var(--ink-soft);cursor:pointer;font-family:inherit;}
.exec .meta-pill:hover{border-color:var(--acc);color:var(--ink);}
.exec .meta-pill.on{border-color:var(--acc);background:color-mix(in srgb,var(--acc) 12%,white);color:var(--ink);}
.exec .mp-dot{width:10px;height:10px;border-radius:3px;flex:none;}
.exec .mp-n{background:var(--ink);color:#fff;font-size:10px;border-radius:20px;padding:1px 7px;}
.exec .meta-summary{display:flex;align-items:center;gap:26px;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px 20px;margin-bottom:14px;box-shadow:0 1px 2px rgba(20,22,30,.03);}
.exec .meta-summary>div{display:flex;flex-direction:column;}
.exec .meta-summary b{font-size:22px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums;}
.exec .meta-summary span{font-size:10.5px;color:var(--ink-faint);text-transform:uppercase;letter-spacing:.04em;margin-top:3px;}
.exec .meta-summary .ms-actions{margin-left:auto;display:flex;gap:8px;flex-wrap:wrap;}
.exec .meta-summary .add-btn{background:var(--primary-soft);color:var(--primary);border-color:#EBCF7A;}
.exec .meta-summary .add-btn:hover{background:var(--primary-vivid);color:#1A1D29;}
.exec .meta-summary .add-btn.ghost2{background:transparent;color:var(--ink-soft);border-color:var(--line);}
.exec .meta-summary .add-btn.ghost2:hover{background:var(--surface-2);color:var(--ink);border-color:var(--primary);}
.exec .gh-del{background:none;border:none;color:var(--ink-faint);cursor:pointer;font-size:13px;padding:4px 6px;border-radius:6px;align-self:flex-start;}
.exec .gh-del:hover{background:var(--bad-soft);color:var(--bad);}
.exec .t-good{color:var(--good);}.exec .t-warn{color:var(--warn);}.exec .t-bad{color:var(--bad);}
.exec .add-form{background:var(--surface);border:1px solid var(--primary-vivid);border-radius:14px;padding:16px 18px;margin-bottom:16px;box-shadow:0 1px 2px rgba(20,22,30,.03);}
.exec .af-grid{display:grid;grid-template-columns:1.6fr 1.4fr .8fr .9fr .9fr auto;gap:12px;align-items:end;}
@media(max-width:900px){.exec .af-grid{grid-template-columns:1fr 1fr;}}
.exec .af-field{display:flex;flex-direction:column;gap:4px;}
.exec .af-field>span{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-faint);}
.exec .af-field select,.exec .af-field input{width:100%;font-size:12.5px;font-weight:600;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2);color:var(--ink);font-family:inherit;}
.exec .af-field select:focus,.exec .af-field input:focus{outline:2px solid var(--primary);outline-offset:1px;}
.exec .af-warn{margin:10px 0 0;font-size:11.5px;color:var(--warn);font-weight:600;}
.exec .loading,.exec .empty-card{background:var(--surface);border:1px dashed var(--line);border-radius:14px;padding:30px;text-align:center;color:var(--ink-soft);font-size:13px;}
.exec .groups{display:flex;flex-direction:column;gap:14px;}
.exec .group{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:16px 18px;box-shadow:0 1px 2px rgba(20,22,30,.03);}
.exec .group-head{display:flex;align-items:center;gap:18px;flex-wrap:wrap;}
.exec .gh-title{display:flex;flex-direction:column;gap:2px;min-width:150px;}
.exec .gh-name{font-size:14.5px;font-weight:800;}
.exec .gh-unit{font-size:10.5px;color:var(--ink-faint);font-weight:700;text-transform:uppercase;letter-spacing:.04em;}
.exec .gh-target{display:flex;align-items:flex-end;gap:8px;}
.exec .gh-target label{display:flex;flex-direction:column;gap:3px;}
.exec .gh-target label span{font-size:9px;font-weight:700;text-transform:uppercase;color:var(--ink-faint);}
.exec .gh-target input{width:82px;font-size:12.5px;font-weight:700;padding:5px 8px;border:1px solid var(--line);border-radius:7px;background:var(--surface-2);text-align:right;font-variant-numeric:tabular-nums;font-family:inherit;}
.exec .gh-target input:focus{outline:2px solid var(--primary);outline-offset:1px;}
.exec .gh-target .arrow{color:var(--ink-faint);padding-bottom:6px;}
.exec .gh-desired{display:flex;flex-direction:column;padding-bottom:2px;margin-left:4px;}
.exec .gh-desired span{font-size:9px;font-weight:700;text-transform:uppercase;color:var(--ink-faint);}
.exec .gh-desired b{font-size:14px;font-weight:800;font-variant-numeric:tabular-nums;}
.exec .gh-cover{margin-left:auto;text-align:right;font-size:26px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums;display:flex;flex-direction:column;}
.exec .gh-cover span{font-size:9.5px;color:var(--ink-faint);text-transform:uppercase;letter-spacing:.04em;font-weight:700;}
.exec .cover-bar{position:relative;height:9px;border-radius:6px;background:var(--surface-2);border:1px solid var(--line);overflow:hidden;margin:14px 0 8px;}
.exec .cover-fill{height:100%;border-radius:6px;transition:width .35s ease;}
.exec .cover-fill[data-tone=good]{background:var(--good);}
.exec .cover-fill[data-tone=warn]{background:var(--warn);}
.exec .cover-fill[data-tone=bad]{background:var(--bad);}
.exec .cover-goal{position:absolute;right:0;top:-3px;bottom:-3px;width:2px;background:var(--ink);}
.exec .proj-line{font-size:11.5px;color:var(--ink-soft);margin-bottom:10px;}
.exec .proj-line b{color:var(--ink);}
.exec .entries{border-top:1px solid var(--line);padding-top:6px;}
.exec .entry{display:grid;grid-template-columns:1fr 120px 170px 66px 22px;gap:12px;align-items:center;padding:9px 0;border-bottom:1px dashed var(--line);}
.exec .entry:last-child{border-bottom:none;}
.exec .e-name{font-size:12.5px;font-weight:600;line-height:1.3;}
.exec .e-f{display:flex;flex-direction:column;gap:3px;}
.exec .e-f>span{font-size:8.5px;font-weight:700;text-transform:uppercase;color:var(--ink-faint);}
.exec .e-f input[type=number]{width:100%;font-size:12px;font-weight:700;padding:5px 8px;border:1px solid var(--line);border-radius:6px;background:var(--surface);text-align:right;font-variant-numeric:tabular-nums;font-family:inherit;}
.exec .e-f .rowc{display:flex;align-items:center;gap:7px;}
.exec .e-f .rowc input[type=range]{flex:1;height:4px;}
.exec .e-f .rowc i{font-style:normal;font-size:11px;font-weight:800;width:32px;text-align:right;}
.exec .e-out{text-align:right;}
.exec .e-out b{font-size:13.5px;font-weight:800;font-variant-numeric:tabular-nums;}
.exec .e-out span{display:block;font-size:8.5px;color:var(--ink-faint);text-transform:uppercase;}
.exec .e-del{background:none;border:none;color:var(--ink-faint);cursor:pointer;font-size:12px;padding:4px;border-radius:5px;}
.exec .e-del:hover{background:var(--bad-soft);color:var(--bad);}
`;
