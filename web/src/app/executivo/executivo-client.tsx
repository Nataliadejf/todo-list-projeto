"use client";

import { useEffect, useMemo, useState } from "react";
import { useTodos } from "@/components/providers/todos-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { METAS_GLOBAIS, META_BY_KEY, UNITS } from "@/lib/executive-utils";
import { fetchIndicadores, getExecPlan, saveExecPlan, type ExecEntry, type ExecPlan, type Indicador } from "@/lib/exec-api";

const EXEC_EMAIL = "administradorportfolio@gmail.com";

const nf = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const signed = (n: number) => (n >= 0 ? "+" : "−") + nf(Math.abs(n));
const groupKey = (metaGlobal: string, indicadorId: string, unidade: string) => `${metaGlobal}::${indicadorId}::${unidade}`;

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

  // agrupa por indicador + unidade
  const groups = useMemo(() => {
    const map = new Map<string, { indicadorId: string; unidade: string; entries: ExecEntry[] }>();
    metaEntries.forEach((e) => {
      const gk = groupKey(e.metaGlobal, e.indicadorId, e.unidade);
      if (!map.has(gk)) map.set(gk, { indicadorId: e.indicadorId, unidade: e.unidade, entries: [] });
      map.get(gk)!.entries.push(e);
    });
    return [...map.entries()].map(([gk, g]) => {
      const target = plan.targets[gk] ?? { base: 0, alvo: 0 };
      const desired = target.alvo - target.base;
      const projecao = g.entries.reduce((s, e) => s + e.contrib * (e.conf / 100), 0);
      const cobertura = desired > 0 ? (projecao / desired) * 100 : 0;
      return { gk, ...g, target, desired, projecao, cobertura };
    });
  }, [metaEntries, plan.targets]);

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
        <button className="btn add-btn" onClick={() => setAddOpen((v) => !v)}>+ Adicionar iniciativa</button>
      </div>

      {/* form adicionar */}
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
        <div className="empty-card">Nenhuma iniciativa nesta meta ainda. Clique em <b>“+ Adicionar iniciativa”</b> para começar.</div>
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
                    <div className="gh-desired"><span>meta</span><b>{signed(g.desired)}</b></div>
                  </div>
                  <div className={`gh-cover t-${tone}`}>{Math.round(g.cobertura)}%<span>cobertura</span></div>
                </div>
                <div className="cover-bar">
                  <div className="cover-fill" style={{ width: `${Math.min(Math.max(g.cobertura, 0), 100)}%` }} data-tone={tone} />
                  <div className="cover-goal" />
                </div>
                <div className="proj-line">Projeção: <b>{signed(g.projecao)} {g.unidade}</b> de {signed(g.desired)} {g.unidade}</div>

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
.exec .meta-summary .add-btn{margin-left:auto;background:var(--primary-soft);color:var(--primary);border-color:#EBCF7A;}
.exec .meta-summary .add-btn:hover{background:var(--primary-vivid);color:#1A1D29;}
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
