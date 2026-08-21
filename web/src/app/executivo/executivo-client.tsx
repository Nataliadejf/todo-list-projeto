"use client";

import { useMemo, useRef, useState } from "react";
import { useTodos } from "@/components/providers/todos-provider";
import { useResponsaveis } from "@/components/providers/responsaveis-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { getPriorityScore, hideInactiveOwners } from "@/lib/todo-utils";
import { EIXOS, EIXO_BY_KEY, eixoKeyOf, eixoStats, legadoKpis } from "@/lib/executive-utils";
import type { Initiative } from "@/lib/types";

const EXEC_EMAIL = "administradorportfolio@gmail.com";
const SEG = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)", "var(--c5)", "var(--c6)"];

const META_DEFAULTS: Record<string, { atual: number; alvo: number }> = {
  financeiro: { atual: 0, alvo: 500 },
  governanca: { atual: 40, alvo: 90 },
  iso: { atual: 0, alvo: 20 },
  produtividade: { atual: 0, alvo: 1000 },
  impacto: { atual: 0, alvo: 30 },
  experiencia: { atual: 60, alvo: 80 },
  outros: { atual: 0, alvo: 100 },
};

const nf = (n: number, dec = 1) => n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
const signed = (n: number, dec = 1) => (n >= 0 ? "+" : "−") + nf(Math.abs(n), dec);

interface Lever { id: number; nome: string; base: string; contrib: number; conf: number }
interface IniState { on: boolean; open: boolean; levers: Lever[] }

export function ExecutivoClient() {
  const { todos } = useTodos();
  const { inactiveNames } = useResponsaveis();
  const { user, isAdmin } = useAuth();
  const canView = (user?.email || "").toLowerCase() === EXEC_EMAIL;

  const base = useMemo(
    () => (isAdmin ? todos : hideInactiveOwners(todos, inactiveNames)),
    [todos, isAdmin, inactiveNames],
  );

  const leverSeq = useRef(1);
  const [eixoKey, setEixoKey] = useState("financeiro");
  const eixo = EIXO_BY_KEY[eixoKey] ?? EIXOS[0];
  const [metaNome, setMetaNome] = useState(eixo.indicator);
  const [atual, setAtual] = useState(META_DEFAULTS.financeiro.atual);
  const [alvo, setAlvo] = useState(META_DEFAULTS.financeiro.alvo);
  const [showLegado, setShowLegado] = useState(false);

  const eixoInis = useMemo(
    () => base.filter((t) => eixoKeyOf(t.gainCategory) === eixoKey).sort((a, b) => getPriorityScore(b) - getPriorityScore(a)),
    [base, eixoKey],
  );

  const seedSim = (inis: Initiative[], desired: number): Record<number, IniState> => {
    const on = inis.slice(0, 6);
    const wsum = on.reduce((s, t) => s + Math.max(getPriorityScore(t), 1), 0) || 1;
    const map: Record<number, IniState> = {};
    inis.forEach((t, i) => {
      const isOn = i < 6;
      const w = Math.max(getPriorityScore(t), 1);
      const nome = (t.gainDescription || "").trim().replace(/^[*•\-\s]+/, "").split(/[\n.]/)[0].slice(0, 60) || "Alavanca principal";
      map[t.dbId] = {
        on: isOn,
        open: i === 0,
        levers: [{
          id: leverSeq.current++,
          nome,
          base: [t.front, t.size ? `tam. ${t.size}` : ""].filter(Boolean).join(" · "),
          contrib: isOn ? Math.round((desired * w / wsum) * 10) / 10 : 0,
          conf: 70,
        }],
      };
    });
    return map;
  };

  const [sim, setSim] = useState<Record<number, IniState>>(() => seedSim(eixoInis, META_DEFAULTS.financeiro.alvo - META_DEFAULTS.financeiro.atual));

  const changeEixo = (key: string) => {
    const e = EIXO_BY_KEY[key] ?? EIXOS[0];
    const d = META_DEFAULTS[key] ?? { atual: 0, alvo: 100 };
    setEixoKey(key); setMetaNome(e.indicator); setAtual(d.atual); setAlvo(d.alvo);
    const inis = base.filter((t) => eixoKeyOf(t.gainCategory) === key).sort((a, b) => getPriorityScore(b) - getPriorityScore(a));
    setSim(seedSim(inis, d.alvo - d.atual));
  };

  const desired = alvo - atual;
  const patchIni = (dbId: number, p: Partial<IniState>) => setSim((s) => ({ ...s, [dbId]: { ...s[dbId], ...p } }));
  const patchLever = (dbId: number, lid: number, p: Partial<Lever>) =>
    setSim((s) => ({ ...s, [dbId]: { ...s[dbId], levers: s[dbId].levers.map((l) => (l.id === lid ? { ...l, ...p } : l)) } }));
  const addLever = (dbId: number) =>
    setSim((s) => ({ ...s, [dbId]: { ...s[dbId], levers: [...s[dbId].levers, { id: leverSeq.current++, nome: "Nova alavanca", base: "", contrib: 0, conf: 70 }] } }));
  const delLever = (dbId: number, lid: number) =>
    setSim((s) => ({ ...s, [dbId]: { ...s[dbId], levers: s[dbId].levers.filter((l) => l.id !== lid) } }));
  const redistribuir = () => setSim(seedSim(eixoInis, desired));
  const allOn = (v: boolean) => setSim((s) => { const n = { ...s }; eixoInis.forEach((t) => { n[t.dbId] = { ...n[t.dbId], on: v }; }); return n; });

  const leverProj = (l: Lever) => l.contrib * (l.conf / 100);
  const rows = eixoInis.map((t, i) => {
    const st = sim[t.dbId];
    const proj = st?.on ? st.levers.reduce((a, l) => a + leverProj(l), 0) : 0;
    return { t, st, proj, seg: SEG[i % SEG.length] };
  });
  const onRows = rows.filter((r) => r.st?.on);
  const proj = onRows.reduce((a, r) => a + r.proj, 0);
  const bruto = onRows.reduce((a, r) => a + (r.st?.levers.reduce((x, l) => x + l.contrib, 0) || 0), 0);
  const pct = desired > 0 ? (proj / desired) * 100 : 0;
  const gap = desired - proj;
  const unit = eixo.unit;
  const cls = pct >= 100 ? "good" : pct >= 70 ? "warn" : "bad";
  const statusLabel = pct >= 100 ? "Meta coberta" : pct >= 70 ? "Quase lá" : "Cobertura parcial";
  const levsRank = onRows.flatMap((r) => r.st!.levers.map((l) => ({ ...l, ini: r.t.initiative, seg: r.seg, p: leverProj(l) }))).sort((a, b) => b.p - a.p);
  const maxP = levsRank.length ? levsRank[0].p : 1;

  const kpis = useMemo(() => legadoKpis(base), [base]);
  const stats = useMemo(() => eixoStats(base), [base]);

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

  return (
    <div className="exec">
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap" />
      <style>{CSS}</style>

      <div className="exec-head">
        <p className="exec-eyebrow">Simulador de impacto</p>
        <h2>Visão Executiva</h2>
        <p className="exec-sub">Escolha a <b>meta global</b>, selecione as <b>iniciativas</b> que a sustentam e ajuste as <b>alavancas</b> de cada uma. O painel projeta, ponderando pela confiança, o quanto o conjunto move a meta.</p>
      </div>

      {/* META GLOBAL */}
      <section className="exec-card">
        <p className="card-title"><span className="n">1</span> Meta global</p>
        <p className="card-hint">O indicador estratégico do período. Escolha o eixo — as iniciativas dele entram como alavancas.</p>
        <div className="meta-grid">
          <div className="field">
            <label>Eixo estratégico</label>
            <select value={eixoKey} onChange={(e) => changeEixo(e.target.value)} className="sel">
              {stats.map((e) => <option key={e.key} value={e.key}>{EIXO_BY_KEY[e.key]?.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Indicador da meta</label>
            <input type="text" className="big" value={metaNome} onChange={(e) => setMetaNome(e.target.value)} />
          </div>
          <div className="field">
            <label>Valor atual</label>
            <div className="metric-unit"><input type="number" value={atual} onChange={(e) => setAtual(Number(e.target.value) || 0)} /><span className="u">{unit}</span></div>
          </div>
          <div className="field">
            <label>Meta (alvo)</label>
            <div className="metric-unit"><input type="number" value={alvo} onChange={(e) => setAlvo(Number(e.target.value) || 0)} /><span className="u">{unit}</span></div>
          </div>
          <div className="desired-chip">
            <div className="lbl">Melhoria desejada</div>
            <div className="val">{signed(desired)} <span>{unit}</span></div>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <div className="kpi-row">
        <div className="kpi" style={{ ["--accent" as string]: "var(--primary-vivid)" }}>
          <p className="lbl">Projeção ponderada</p>
          <div className="val">{signed(proj)} <span>{unit}</span></div>
          <p className="note">Potencial bruto: <b>{signed(bruto)} {unit}</b></p>
        </div>
        <div className="kpi" style={{ ["--accent" as string]: `var(--${cls})` }}>
          <p className="lbl">Cobertura da meta</p>
          <div className="val">{Math.round(pct)}<span>%</span></div>
          <p className="note">da melhoria desejada</p>
        </div>
        <div className="kpi" style={{ ["--accent" as string]: gap > 0 ? "var(--bad)" : "var(--good)" }}>
          <p className="lbl">Gap para a meta</p>
          <div className="val">{gap > 0 ? signed(gap) : "+0,0"} <span>{unit}</span></div>
          <p className="note">{gap > 0 ? "falta cobrir" : "meta coberta ✓"}</p>
        </div>
        <div className="kpi" style={{ ["--accent" as string]: "var(--blue)" }}>
          <p className="lbl">Iniciativas no plano</p>
          <div className="val">{onRows.length}<span> / {eixoInis.length}</span></div>
          <p className="note"><b>{onRows.reduce((a, r) => a + (r.st?.levers.length || 0), 0)}</b> alavancas</p>
        </div>
      </div>

      <div className="cols">
        {/* INICIATIVAS + ALAVANCAS */}
        <section>
          <section className="exec-card" style={{ paddingBottom: 8 }}>
            <p className="card-title"><span className="n">2</span> Iniciativas &amp; alavancas</p>
            <p className="card-hint">Marque as iniciativas do plano. Abra cada uma para calibrar suas alavancas (contribuição e confiança de entrega).</p>
            <div className="ini-list">
              {rows.length === 0 ? <p className="empty">Nenhuma iniciativa neste eixo.</p> : rows.map((r) => {
                const st = r.st!;
                return (
                  <div key={r.t.dbId} className={`ini${st.on ? "" : " off"}${st.open ? " expanded" : ""}`} style={{ ["--seg" as string]: r.seg }}>
                    <div className="ini-head" onClick={() => patchIni(r.t.dbId, { open: !st.open })}>
                      <div className={`chk${st.on ? " on" : ""}`} role="checkbox" aria-checked={st.on} tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); patchIni(r.t.dbId, { on: !st.on }); }}
                        onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); patchIni(r.t.dbId, { on: !st.on }); } }}>
                        {st.on ? "✓" : ""}
                      </div>
                      <div className="ini-main">
                        <div className="ini-name">{r.t.initiative}</div>
                        <div className="ini-area">{r.t.owner || "—"} · {r.t.area || "—"} · GUT {getPriorityScore(r.t) || "—"} · {st.levers.length} alavanca(s)</div>
                      </div>
                      <div className="ini-contrib"><b style={{ color: st.on ? r.seg : "var(--ink-faint)" }}>{signed(r.proj)}</b><span>{unit} proj.</span></div>
                      <div className="caret">▶</div>
                    </div>
                    <div className="levers">
                      {st.levers.map((l) => (
                        <div className="lever" key={l.id}>
                          <div className="lever-name">
                            <input className="lv-nome" value={l.nome} onChange={(e) => patchLever(r.t.dbId, l.id, { nome: e.target.value })} />
                            {l.base ? <span className="base">{l.base}</span> : null}
                          </div>
                          <div className="lv-field">
                            <label>Contrib. ({unit})</label>
                            <input type="number" step="0.1" value={l.contrib} onChange={(e) => patchLever(r.t.dbId, l.id, { contrib: Number(e.target.value) || 0 })} />
                          </div>
                          <div className="conf">
                            <label>Confiança</label>
                            <div className="rowc">
                              <input type="range" min={0} max={100} step={5} value={l.conf} onChange={(e) => patchLever(r.t.dbId, l.id, { conf: Number(e.target.value) })} style={{ accentColor: r.seg }} />
                              <span className="pct">{l.conf}%</span>
                            </div>
                          </div>
                          <div className="lv-out"><b style={{ color: r.seg }}>{signed(leverProj(l))}</b><span>projeção</span></div>
                          <button className="lv-del" title="Remover alavanca" onClick={() => delLever(r.t.dbId, l.id)} disabled={st.levers.length <= 1}>✕</button>
                        </div>
                      ))}
                      <button className="add-lever" onClick={() => addLever(r.t.dbId)}>+ Adicionar alavanca</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          <div className="actions">
            <button className="btn primary" onClick={redistribuir}>Redistribuir por prioridade</button>
            <button className="btn ghost" onClick={() => allOn(true)}>Selecionar todas</button>
            <button className="btn ghost" onClick={() => allOn(false)}>Limpar seleção</button>
          </div>
        </section>

        {/* COBERTURA */}
        <aside>
          <div className="rail-card">
            <p className="card-title" style={{ marginBottom: 12 }}>Cobertura da meta</p>
            <div className="gauge-num"><b className={`t-${cls}`}>{Math.round(pct)}<span>%</span></b><div className="cap">da meta projetada</div></div>
            <div className="status-wrap"><span className={`status-pill ${cls}`}>{statusLabel}</span></div>
            <div className="cover-bar">
              {onRows.map((r) => { const w = desired > 0 ? Math.min(r.proj / desired * 100, 100) : 0; return <div key={r.t.dbId} className="cover-seg" style={{ width: `${w}%`, background: r.seg }} title={`${r.t.initiative}: ${signed(r.proj)} ${unit}`} />; })}
              <div className="cover-goal" style={{ left: "100%" }} />
            </div>
            <div className="cover-scale"><span>0</span><span>meta</span></div>
            <div className="cover-legend">
              {onRows.length === 0 ? <div className="leg-row" style={{ color: "var(--ink-faint)" }}>Nenhuma iniciativa selecionada.</div> :
                onRows.map((r) => <div className="leg-row" key={r.t.dbId}><span className="leg-dot" style={{ background: r.seg }} /><span className="leg-name">{r.t.initiative}</span><span className="leg-val" style={{ color: r.seg }}>{signed(r.proj)}</span></div>)}
            </div>
          </div>

          <div className="rail-card">
            <p className="card-title" style={{ marginBottom: 14 }}>Ranking de alavancas</p>
            {levsRank.length === 0 ? <div className="mini">Selecione iniciativas para ver o ranking.</div> :
              levsRank.slice(0, 12).map((l) => (
                <div className="rank-row" key={l.id}>
                  <div className="rank-name">{l.nome}<span>{l.ini}</span></div>
                  <div className="rank-val" style={{ color: l.seg }}>{signed(l.p)}</div>
                  <div className="rank-track"><div className="rank-fill" style={{ width: `${maxP > 0 ? l.p / maxP * 100 : 0}%`, background: l.seg }} /></div>
                </div>
              ))}
          </div>

          <div className="rail-card">
            <p className="card-title" style={{ marginBottom: 10 }}>Como é calculado</p>
            <p className="formula">Cada alavanca projeta <code>contribuição × confiança</code>.<br />A <b>iniciativa</b> soma suas alavancas; o <b>plano</b> soma as iniciativas selecionadas.<br /><b>Cobertura</b> = projeção ÷ melhoria desejada.</p>
          </div>
        </aside>
      </div>

      {/* LEGADO (segundo plano, recolhido) */}
      <div className="legado">
        <button className="legado-toggle" onClick={() => setShowLegado((v) => !v)}>
          <span className={`caret2${showLegado ? " open" : ""}`}>▶</span>
          Leitura do legado — {kpis.total} iniciativas · {kpis.donePct}% concluído · GUT médio {nf(kpis.gutAvg, 1)}
        </button>
        {showLegado ? (
          <div className="legado-body">
            <div className="legado-grid">
              {stats.map((e) => (
                <button key={e.key} className={`legado-eixo${e.key === eixoKey ? " active" : ""}`} onClick={() => changeEixo(e.key)}>
                  <div className="le-top"><span className="le-dot" style={{ background: e.accent }} />{e.label}<span className="le-n">{e.count}</span></div>
                  <div className="le-mid"><b>{e.donePct}%</b> concl. · GUT {nf(e.gutAvg, 1)} · {e.effortDone} pts</div>
                  <div className="le-track"><div style={{ width: `${e.donePct}%`, background: e.accent }} /></div>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const CSS = `
.exec{--bg:#F4F5F8;--surface:#FFFFFF;--surface-2:#FAFBFC;--ink:#1A1D29;--ink-soft:#7B8190;--ink-faint:#A6ABB6;--line:#E7E9EE;--primary:#B9870A;--primary-soft:#FDF4D6;--primary-vivid:#FBAB18;--primary-vivid-deep:#E0960A;--good:#1FA15B;--good-soft:#E7F7EE;--warn:#D98A1B;--warn-soft:#FCF1DE;--bad:#E0473A;--bad-soft:#FBEAE8;--blue:#2F6FE0;--c1:#FBAB18;--c2:#0F7C66;--c3:#2F6FE0;--c4:#B9870A;--c5:#1FA15B;--c6:#8A909C;font-family:'Nunito',-apple-system,'Segoe UI',sans-serif;color:var(--ink);}
.exec *{box-sizing:border-box;}
.exec .exec-head{margin-bottom:20px;}
.exec .exec-eyebrow{font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--primary);margin:0 0 5px;display:flex;align-items:center;gap:8px;}
.exec .exec-eyebrow::before{content:"";width:22px;height:2px;background:var(--primary-vivid);border-radius:2px;}
.exec h2{font-size:23px;margin:0 0 6px;font-weight:800;letter-spacing:-.02em;}
.exec .exec-sub{color:var(--ink-soft);font-size:13px;margin:0;max-width:640px;line-height:1.5;}
.exec .exec-card{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:18px 20px;box-shadow:0 1px 2px rgba(20,22,30,.03);margin-bottom:16px;}
.exec .card-title{display:flex;align-items:center;gap:9px;font-size:13px;font-weight:800;margin:0 0 3px;}
.exec .card-title .n{width:20px;height:20px;border-radius:50%;background:var(--primary-vivid);color:#1A1D29;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;flex:none;}
.exec .card-hint{font-size:11.5px;color:var(--ink-soft);margin:0 0 14px;line-height:1.45;padding-left:29px;}
.exec .meta-grid{display:grid;grid-template-columns:200px 1.3fr .8fr .8fr auto;gap:16px;align-items:end;}
.exec .field label{display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-faint);margin-bottom:5px;}
.exec .field input[type=text],.exec .field input[type=number],.exec .sel{width:100%;font-size:14px;font-weight:600;padding:9px 11px;border:1px solid var(--line);border-radius:9px;background:var(--surface-2);color:var(--ink);font-family:inherit;}
.exec .field input:focus,.exec .sel:focus{outline:2px solid var(--primary);outline-offset:1px;border-color:transparent;}
.exec .field .big{font-size:20px;font-weight:800;border:none;border-bottom:2px solid var(--line);border-radius:0;background:transparent;padding:2px 0 6px;}
.exec .field .big:focus{outline:none;border-bottom-color:var(--primary);}
.exec .metric-unit{display:flex;align-items:baseline;gap:6px;}
.exec .metric-unit .u{font-size:12px;color:var(--ink-faint);font-weight:700;white-space:nowrap;}
.exec .desired-chip{background:linear-gradient(135deg,var(--primary-soft),#FDE9B0);border:1px solid #EBCF7A;border-radius:12px;padding:10px 16px;text-align:center;min-width:150px;}
.exec .desired-chip .lbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--primary);margin-bottom:2px;}
.exec .desired-chip .val{font-size:22px;font-weight:800;color:var(--ink);font-variant-numeric:tabular-nums;line-height:1;}
.exec .desired-chip .val span{font-size:12px;color:var(--ink-soft);font-weight:700;}
.exec .kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:0 0 18px;}
.exec .kpi{position:relative;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:16px 18px;box-shadow:0 1px 2px rgba(20,22,30,.03);overflow:hidden;}
.exec .kpi::after{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--accent,var(--primary-vivid));}
.exec .kpi .lbl{font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-faint);margin:0 0 8px;}
.exec .kpi .val{font-size:26px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums;}
.exec .kpi .val span{font-size:14px;color:var(--ink-soft);font-weight:700;}
.exec .kpi .note{font-size:11px;color:var(--ink-soft);margin-top:7px;}
.exec .kpi .note b{color:var(--ink);}
.exec .cols{display:grid;grid-template-columns:1fr 372px;gap:18px;align-items:start;}
@media(max-width:1080px){.exec .cols{grid-template-columns:1fr;}}
.exec .ini-list{margin-top:4px;}
.exec .empty{padding:26px;text-align:center;color:var(--ink-faint);font-size:13px;}
.exec .ini{border:1px solid var(--line);border-left:4px solid var(--seg,var(--line));border-radius:12px;background:var(--surface);margin-bottom:12px;box-shadow:0 1px 2px rgba(20,22,30,.03);overflow:hidden;transition:opacity .15s;}
.exec .ini.off{opacity:.5;}
.exec .ini-head{display:flex;align-items:center;gap:12px;padding:13px 15px;cursor:pointer;}
.exec .ini-head:hover{background:var(--surface-2);}
.exec .chk{flex:none;width:20px;height:20px;border-radius:6px;border:2px solid var(--line);background:var(--surface);display:flex;align-items:center;justify-content:center;font-size:12px;color:#fff;transition:.12s;cursor:pointer;}
.exec .chk.on{background:var(--seg,var(--primary-vivid));border-color:var(--seg,var(--primary-vivid));}
.exec .ini-main{flex:1;min-width:0;}
.exec .ini-name{font-size:13.5px;font-weight:700;line-height:1.3;}
.exec .ini-area{font-size:10.5px;color:var(--ink-faint);margin-top:2px;}
.exec .ini-contrib{flex:none;text-align:right;}
.exec .ini-contrib b{font-size:16px;font-weight:800;font-variant-numeric:tabular-nums;}
.exec .ini-contrib span{display:block;font-size:9.5px;color:var(--ink-faint);text-transform:uppercase;letter-spacing:.04em;}
.exec .caret{flex:none;color:var(--ink-faint);font-size:11px;transition:transform .15s;}
.exec .ini.expanded .caret{transform:rotate(90deg);}
.exec .levers{border-top:1px solid var(--line);background:var(--surface-2);padding:6px 15px 12px;display:none;}
.exec .ini.expanded .levers{display:block;}
.exec .lever{display:grid;grid-template-columns:1fr 92px 150px 70px 22px;gap:11px;align-items:center;padding:11px 0;border-bottom:1px dashed var(--line);}
.exec .lever:last-of-type{border-bottom:none;}
.exec .lever-name .lv-nome{width:100%;font-size:12px;font-weight:700;border:none;background:transparent;padding:2px 0;color:var(--ink);font-family:inherit;}
.exec .lever-name .lv-nome:focus{outline:none;border-bottom:1px solid var(--primary);}
.exec .lever-name .base{display:block;font-size:10px;color:var(--ink-faint);font-weight:500;margin-top:2px;}
.exec .lv-field{display:flex;flex-direction:column;gap:3px;}
.exec .lv-field label,.exec .conf label{font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-faint);}
.exec .lv-field input{width:100%;font-size:12.5px;font-weight:700;padding:6px 8px;border:1px solid var(--line);border-radius:7px;background:var(--surface);color:var(--ink);text-align:right;font-variant-numeric:tabular-nums;font-family:inherit;}
.exec .lv-field input:focus{outline:2px solid var(--primary);outline-offset:1px;}
.exec .conf{display:flex;flex-direction:column;gap:3px;}
.exec .conf .rowc{display:flex;align-items:center;gap:7px;}
.exec .conf input[type=range]{flex:1;height:4px;}
.exec .conf .pct{font-size:11px;font-weight:800;width:32px;text-align:right;font-variant-numeric:tabular-nums;}
.exec .lv-out{text-align:right;}
.exec .lv-out b{font-size:14px;font-weight:800;font-variant-numeric:tabular-nums;}
.exec .lv-out span{display:block;font-size:8.5px;color:var(--ink-faint);text-transform:uppercase;}
.exec .lv-del{background:none;border:none;color:var(--ink-faint);cursor:pointer;font-size:12px;padding:4px;border-radius:5px;}
.exec .lv-del:hover:not(:disabled){background:var(--bad-soft);color:var(--bad);}
.exec .lv-del:disabled{opacity:.25;cursor:default;}
.exec .add-lever{margin-top:6px;background:none;border:1px dashed var(--line);color:var(--ink-soft);font-size:11px;font-weight:700;padding:6px 12px;border-radius:8px;cursor:pointer;font-family:inherit;}
.exec .add-lever:hover{border-color:var(--primary);color:var(--primary);background:var(--primary-soft);}
.exec .actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:2px;}
.exec .btn{font-size:12.5px;font-weight:700;border-radius:9px;padding:9px 16px;cursor:pointer;border:1px solid transparent;font-family:inherit;}
.exec .btn.primary{background:var(--primary-vivid);color:#1A1D29;}
.exec .btn.primary:hover{background:var(--primary-vivid-deep);}
.exec .btn.ghost{background:transparent;border-color:var(--line);color:var(--ink-soft);}
.exec .btn.ghost:hover{background:var(--surface-2);color:var(--ink);}
.exec .rail-card{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:18px 20px;box-shadow:0 1px 2px rgba(20,22,30,.03);margin-bottom:16px;}
.exec .gauge-num{text-align:center;margin:6px 0 4px;}
.exec .gauge-num b{font-size:44px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums;}
.exec .gauge-num b span{font-size:20px;}
.exec .gauge-num .cap{font-size:11px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em;font-weight:700;margin-top:4px;}
.exec .t-good{color:var(--good);}.exec .t-warn{color:var(--warn);}.exec .t-bad{color:var(--bad);}
.exec .status-wrap{text-align:center;margin-bottom:16px;}
.exec .status-pill{display:inline-flex;font-size:11px;font-weight:800;padding:4px 12px;border-radius:20px;margin-top:8px;}
.exec .status-pill.good{background:var(--good-soft);color:var(--good);}
.exec .status-pill.warn{background:var(--warn-soft);color:var(--warn);}
.exec .status-pill.bad{background:var(--bad-soft);color:var(--bad);}
.exec .cover-bar{position:relative;height:28px;border-radius:8px;background:var(--surface-2);border:1px solid var(--line);overflow:hidden;display:flex;margin:4px 0 4px;}
.exec .cover-seg{height:100%;transition:width .35s ease;}
.exec .cover-goal{position:absolute;top:-3px;bottom:-3px;width:2px;background:var(--ink);z-index:3;}
.exec .cover-scale{display:flex;justify-content:space-between;font-size:9.5px;color:var(--ink-faint);font-weight:600;margin-top:6px;}
.exec .cover-legend{margin-top:14px;display:flex;flex-direction:column;gap:7px;}
.exec .leg-row{display:flex;align-items:center;gap:9px;font-size:11.5px;}
.exec .leg-dot{width:11px;height:11px;border-radius:3px;flex:none;}
.exec .leg-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ink-soft);}
.exec .leg-val{font-weight:800;font-variant-numeric:tabular-nums;}
.exec .mini{font-size:11.5px;color:var(--ink-faint);}
.exec .rank-row{display:grid;grid-template-columns:1fr 46px;gap:10px;align-items:center;margin-bottom:11px;}
.exec .rank-name{font-size:11.5px;font-weight:600;line-height:1.3;}
.exec .rank-name span{display:block;font-size:9.5px;color:var(--ink-faint);}
.exec .rank-track{grid-column:1 / -1;height:7px;border-radius:5px;background:var(--surface-2);overflow:hidden;margin-top:-4px;}
.exec .rank-fill{height:100%;border-radius:5px;transition:width .35s ease;}
.exec .rank-val{font-size:12px;font-weight:800;text-align:right;font-variant-numeric:tabular-nums;}
.exec .formula{font-size:11px;color:var(--ink-soft);background:var(--surface-2);border:1px dashed var(--line);border-radius:10px;padding:11px 14px;line-height:1.6;margin:0;}
.exec .formula b{color:var(--ink);}
.exec .formula code{background:var(--primary-soft);color:var(--primary);padding:1px 6px;border-radius:5px;font-weight:700;}
.exec .legado{margin-top:6px;}
.exec .legado-toggle{width:100%;text-align:left;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:12px 16px;font-size:12px;font-weight:700;color:var(--ink-soft);cursor:pointer;display:flex;align-items:center;gap:9px;font-family:inherit;}
.exec .legado-toggle:hover{border-color:var(--primary);color:var(--ink);}
.exec .caret2{color:var(--ink-faint);font-size:10px;transition:transform .15s;}
.exec .caret2.open{transform:rotate(90deg);}
.exec .legado-body{margin-top:12px;}
.exec .legado-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;}
.exec .legado-eixo{text-align:left;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:13px 15px;cursor:pointer;box-shadow:0 1px 2px rgba(20,22,30,.03);font-family:inherit;}
.exec .legado-eixo.active{border-color:var(--primary);box-shadow:0 0 0 1px var(--primary-vivid);}
.exec .legado-eixo:hover{box-shadow:0 6px 14px rgba(20,22,30,.07);}
.exec .le-top{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:700;color:var(--ink);}
.exec .le-dot{width:11px;height:11px;border-radius:3px;flex:none;}
.exec .le-n{margin-left:auto;font-size:11px;color:var(--ink-faint);font-weight:700;}
.exec .le-mid{font-size:11px;color:var(--ink-soft);margin:8px 0 8px;font-weight:600;}
.exec .le-track{height:6px;border-radius:4px;background:var(--surface-2);overflow:hidden;}
.exec .le-track>div{height:100%;border-radius:4px;}
`;
