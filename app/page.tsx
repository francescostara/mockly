'use client';

/* La schermata principale, sui ruoli del design system. Nessun hex qui dentro.
 *
 * Composizione (quella validata sul prototipo): barra fissa in alto, pannello del brief a
 * sinistra a larghezza fissa, palco a destra col pozzo del mockup.
 *
 * Il pannello ha TRE stati sullo stesso telaio — vuoto, brief in corso, completato — e il
 * telaio non si muove passando dall'uno all'altro: cambia il contenuto, non la struttura.
 * È il motivo per cui il riepilogo, la domanda corrente e il blocco delle azioni stanno
 * sempre nello stesso ordine e nella stessa colonna.
 */

import { useEffect, useRef, useState } from 'react';
import { INTAKE, type IntakeAnswers, type IntakeStep } from '@/lib/intake';
import { STRINGS, type Lang, LANG_KEY } from './i18n';
import { useTheme } from './theme';

type GenMeta = {
  valid: boolean; repairs: number; fallback: boolean; model: string;
  tokensIn: number; tokensOut: number; cacheRead: number; cacheWrite: number;
  latencyMs: number; costUsd: number; bytes: number; advisories?: string[];
};

const qOf = (s: IntakeStep, lang: Lang) => (lang === 'en' ? s.questionEn : s.question);
const hOf = (s: IntakeStep, lang: Lang) => (lang === 'en' ? s.hintEn : s.hint);

export default function Page() {
  const [lang, setLang] = useState<Lang>('it');
  const [theme, setTheme] = useTheme();

  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<IntakeAnswers>({});
  const [followUp, setFollowUp] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  /* Le aggiunte dopo il questionario stanno per conto loro: concatenarle dentro la risposta
     alla domanda sul report faceva crescere quella riga senza fine, e il riepilogo diventava
     illeggibile dopo due invii. Al modello arriva comunque un brief solo. */
  const [extra, setExtra] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [meta, setMeta] = useState<GenMeta | null>(null);
  const [runs, setRuns] = useState({ n: 0, costUsd: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  const t = STRINGS[lang];
  const current = step < INTAKE.length ? INTAKE[step] : null;
  const done = step >= INTAKE.length;

  useEffect(() => {
    try {
      const s = localStorage.getItem(LANG_KEY);
      if (s === 'it' || s === 'en') setLang(s);
    } catch { /* modalità privata */ }
  }, []);

  function pickLang(l: Lang) {
    setLang(l);
    try { localStorage.setItem(LANG_KEY, l); } catch { /* modalità privata */ }
  }

  /* il pannello segue la domanda corrente, non l'ultimo pixel: si scorre solo se serve */
  useEffect(() => {
    if (panelRef.current) panelRef.current.scrollTop = panelRef.current.scrollHeight;
  }, [step, followUp, html]);

  function answered(id: IntakeStep['id']) { return answers[id] !== undefined; }

  function pick(value: string) {
    if (!current) return;
    setAnswers(a => ({ ...a, [current.id]: value }));
    if (current.followUp && current.followUp.whenValue === value) {
      setFollowUp(lang === 'en' ? current.followUp.questionEn : current.followUp.question);
      return;
    }
    setStep(s => s + 1);
  }

  function submitText() {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    if (followUp) {
      setAnswers(a => ({ ...a, brandColors: text }));
      setFollowUp(null);
      setStep(s => s + 1);
      return;
    }
    if (current && current.kind === 'text') {
      setAnswers(a => ({ ...a, [current.id]: text }));
      setStep(s => s + 1);
      return;
    }
    setExtra(x => [...x, text]);
  }

  /* Il brief che parte: la risposta sul report piu le aggiunte, in un testo solo. */
  const briefText = () => [answers.domain || '', ...extra].filter(Boolean).join('\n');

  function editStep(i: number) { setFollowUp(null); setStep(i); }

  function skipAll() { setFollowUp(null); setStep(INTAKE.length); }

  /* il percorso libero: si salta il questionario e si scrive il brief a parole proprie */
  function startFree() {
    setStarted(true);
    setStep(INTAKE.findIndex(s => s.id === 'domain'));
  }

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ brief: briefText(), intake: { ...answers, domain: briefText() } })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Errore ' + res.status);
      setHtml(data.html);
      setMeta(data.meta);
      setRuns(r => ({ n: r.n + 1, costUsd: r.costUsd + (data.meta?.costUsd || 0) }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function download() {
    if (!html) return;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mockly-report.html';
    a.click();
    URL.revokeObjectURL(url);
  }

  function restart() {
    setStarted(false); setStep(0); setAnswers({}); setFollowUp(null);
    setDraft(''); setHtml(null); setMeta(null); setError(null); setExtra([]);
  }

  const answeredSteps = INTAKE.filter((s, i) => i < step && answered(s.id));
  const showOptions = !followUp && current?.kind === 'options';
  const showText = !!followUp || current?.kind === 'text' || done;

  return (
    <div className="app">
      <header className="topbar">
        <h1 className="wordmark">Mockly</h1>
        <span className="tagline">{t.tagline}</span>
        <div className="spacer" />
        <div className="right">
          <span className="credits">
            <span className="num">{runs.n}</span>{' '}
            {lang === 'it' ? (runs.n === 1 ? 'generazione' : 'generazioni') : (runs.n === 1 ? 'generation' : 'generations')}
            {runs.n > 0 && <> · <span className="num">${runs.costUsd.toFixed(4)}</span></>}
          </span>

          <span className="seg" role="group" aria-label="Lingua">
            <button aria-pressed={lang === 'it'} onClick={() => pickLang('it')}>IT</button>
            <button aria-pressed={lang === 'en'} onClick={() => pickLang('en')}>EN</button>
          </span>

          <span className="seg" role="group" aria-label={lang === 'it' ? 'Tema' : 'Theme'}>
            <button aria-pressed={theme === 'light'} onClick={() => setTheme('light')}>{t.themeLight}</button>
            <button aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}>{t.themeDark}</button>
          </span>

          <span className="avatar" aria-hidden="true">FS</span>
        </div>
      </header>

      <div className="cols">
        <section className="panel" ref={panelRef}>
          {/* ---- stato 1: vuoto ---- */}
          {!started && (
            <>
              <p className="lede">{t.emptyHead}</p>
              <div className="q">
                <span className="qt">{t.emptyLead}</span>
                <div className="opts">
                  <button className="opt" onClick={() => setStarted(true)}>
                    {t.startGuided}
                    <span className="note">{t.startGuidedNote}</span>
                  </button>
                  <button className="opt" onClick={startFree}>
                    {t.startFree}
                    <span className="note">{t.startFreeNote}</span>
                  </button>
                </div>
              </div>
              <p className="note">{t.localNote}</p>
            </>
          )}

          {/* ---- stati 2 e 3: brief in corso e completato, sullo stesso telaio ---- */}
          {started && (
            <>
              <div className="panel-head">
                <span className="t">{t.briefTitle}</span>
                <div className="spacer" />
                <span className="step num">{t.briefStep(Math.min(step + (done ? 0 : 1), INTAKE.length), INTAKE.length)}</span>
              </div>

              {answeredSteps.length > 0 && (
                <div className="rows">
                  {answeredSteps.map((s) => {
                    const v = answers[s.id] as string;
                    const opt = s.options?.find(o => o.value === v);
                    const label = opt ? (lang === 'en' ? opt.labelEn : opt.label) : v;
                    return (
                      <div className="row-sum" key={s.id}>
                        <span className="k">{lang === 'en' ? s.summaryEn : s.summary}</span>
                        <span className="v">{label}</span>
                        <button className="lnk" onClick={() => editStep(INTAKE.indexOf(s))}>{t.edit}</button>
                      </div>
                    );
                  })}
                  {extra.length > 0 && (
                    <div className="row-sum">
                      <span className="k">{lang === 'it' ? 'Aggiunte' : 'Additions'}</span>
                      <span className="v">{extra.join(' · ')}</span>
                      <button className="lnk" onClick={() => setExtra([])}>
                        {lang === 'it' ? 'Togli' : 'Clear'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {!done && current && (
                <div className="q">
                  <span className="qt">{followUp || qOf(current, lang)}</span>
                  {!followUp && hOf(current, lang) && <span className="qh">{hOf(current, lang)}</span>}
                  {showOptions && (
                    <div className="opts">
                      {current.options!.map(o => (
                        <button key={o.value} className="opt" onClick={() => pick(o.value)}>
                          {lang === 'en' ? o.labelEn : o.label}
                          {(lang === 'en' ? o.noteEn : o.note) && (
                            <span className="note">{lang === 'en' ? o.noteEn : o.note}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {showText && (
                <div className="q">
                  <textarea
                    className="field"
                    value={draft}
                    placeholder={done ? t.freeTextExtra : t.freeText}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submitText(); }
                    }}
                  />
                  <div className="actions">
                    <button className="btn-ghost btn-sm" onClick={submitText} disabled={!draft.trim()}>{t.send}</button>
                    <div className="spacer" />
                    {!done && <button className="btn-ghost btn-sm" onClick={skipAll}>{t.skip}</button>}
                  </div>
                </div>
              )}

              {html && (
                <div className="q">
                  <span className="stamp">
                    {t.generated} {new Date().toLocaleTimeString(lang === 'it' ? 'it-IT' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}
                    {' · '}{meta && meta.costUsd === 0 ? t.free : '$' + (meta?.costUsd ?? 0).toFixed(4)}
                  </span>
                  <span className="qt">{t.ready}</span>
                  <span className="qh">{meta?.fallback ? t.fallbackNote : t.doneNote}</span>
                </div>
              )}

              {html && (
                <div className="q">
                  <span className="qt" style={{ fontSize: 13, fontWeight: 600 }}>{t.refine}</span>
                  <div className="actions">
                    {[t.refineMoreCorporate, t.refineAddMargin, t.refineDenser].map(label => (
                      <button className="chip" key={label} disabled title={lang === 'it' ? 'Non ancora attivo' : 'Not wired yet'}>
                        {label} <span className="cost">{t.oneCredit}</span>
                      </button>
                    ))}
                  </div>
                  <p className="note">{lang === 'it' ? 'Il raffinamento non è ancora collegato.' : 'Refinement is not wired yet.'}</p>
                </div>
              )}

              {error && <div className="alert" role="alert">{error}</div>}

              <div className="actions">
                <button className="btn" onClick={generate} disabled={busy || !briefText().trim()}>
                  {busy ? t.generating : t.generate}
                </button>
                <button className="btn-ghost" onClick={restart} disabled={busy}>{t.restart}</button>
              </div>
            </>
          )}
        </section>

        <section className="stage">
          <div className="toolbar">
            <button className="btn-ghost btn-sm" onClick={download} disabled={!html}>{t.download}</button>
            <button className="btn-ghost btn-sm" disabled={!html} title={lang === 'it' ? 'Non ancora attivo' : 'Not wired yet'}>{t.share}</button>
            <button className="btn-ghost btn-sm" onClick={generate} disabled={busy || !briefText().trim()}>{t.regenerate}</button>
            <div className="spacer" />
            <span className="stamp">{t.size}</span>
          </div>

          <div className="well">
            <div className={'frame' + (html ? '' : ' empty')}>
              {html
                ? <iframe title="Mockup" srcDoc={html} sandbox="allow-scripts" />
                : <><b>{t.stageEmpty}</b>{t.stageEmptyNote}</>}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
