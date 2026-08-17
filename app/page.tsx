'use client';

import { useEffect, useRef, useState } from 'react';
import { INTAKE, type IntakeAnswers } from '@/lib/intake';

type Msg = { who: 'bot' | 'me'; text: string; hint?: string };
type GenMeta = {
  valid: boolean; repairs: number; fallback: boolean; model: string;
  tokensIn: number; tokensOut: number; cacheRead: number; cacheWrite: number;
  latencyMs: number; costUsd: number; bytes: number; advisories?: string[];
};

const GREETING: Msg = {
  who: 'bot',
  text: 'Ciao! Ti faccio cinque domande veloci, poi genero il mockup interattivo.',
  hint: 'Le domande non consumano crediti: si paga solo la generazione.'
};

export default function Page() {
  const [msgs, setMsgs] = useState<Msg[]>([GREETING]);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<IntakeAnswers>({});
  const [followUp, setFollowUp] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [meta, setMeta] = useState<GenMeta | null>(null);
  const [session, setSession] = useState({ runs: 0, costUsd: 0 });
  const logRef = useRef<HTMLDivElement>(null);

  const current = step < INTAKE.length ? INTAKE[step] : null;
  const done = step >= INTAKE.length;

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [msgs, busy]);

  /* ask the next question as a bot bubble whenever the step advances */
  useEffect(() => {
    const q = step < INTAKE.length ? INTAKE[step] : null;
    setMsgs(m => {
      const last = m[m.length - 1];
      const text = q ? q.question : 'Perfetto, ho tutto. Premi «Genera mockup».';
      const hint = q ? q.hint : 'Ci vuole qualche secondo: modello dati, layout e rendering.';
      if (last && last.who === 'bot' && last.text === text) return m;
      return [...m, { who: 'bot', text, hint }];
    });
  }, [step]);

  function say(text: string) {
    setMsgs(m => [...m, { who: 'me', text }]);
  }

  function pick(value: string, label: string) {
    if (!current) return;
    say(label);
    if (current.followUp && current.followUp.whenValue === value) {
      setAnswers(a => ({ ...a, [current.id]: value }));
      setFollowUp(current.followUp.question);
      setMsgs(m => [...m, { who: 'bot', text: current.followUp!.question }]);
      return;
    }
    setAnswers(a => ({ ...a, [current.id]: value }));
    setStep(s => s + 1);
  }

  function submitText() {
    const text = draft.trim();
    if (!text) return;
    say(text);
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
    /* extra detail after the intake — appended to the brief */
    setAnswers(a => ({ ...a, domain: ((a.domain || '') + '\n' + text).trim() }));
  }

  function skipAll() {
    say('Fai tu, usa i default.');
    setFollowUp(null);
    setStep(INTAKE.length);
  }

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ brief: answers.domain || '', intake: answers })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Errore ${res.status}`);
      setHtml(data.html);
      setMeta(data.meta);
      setSession(s => ({ runs: s.runs + 1, costUsd: s.costUsd + (data.meta?.costUsd || 0) }));
      setMsgs(m => [...m, {
        who: 'bot',
        text: data.meta?.fallback
          ? 'Il modello non ha prodotto una spec valida: ho generato un mockup di riserva. Puoi riprovare.'
          : 'Fatto. Clicca dentro il mockup: le fette e le righe filtrano, il tasto destro sulla matrice apre il dettaglio.',
        hint: `${(data.meta.bytes / 1024).toFixed(0)}KB · ${(data.meta.latencyMs / 1000).toFixed(1)}s · ${data.meta.repairs} riparazioni`
      }]);
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
    setMsgs([GREETING]);
    setStep(0);
    setAnswers({});
    setFollowUp(null);
    setDraft('');
    setHtml(null);
    setMeta(null);
    setError(null);
  }

  const showOptions = !followUp && current?.kind === 'options';

  return (
    <div className="shell">
      <header className="top">
        <div className="mark" />
        <h1>Mockly</h1>
        <span className="sub">mockup di dashboard BI</span>
        <div className="spacer" />
        {session.runs > 0 && (
          <div className="meter">
            {session.runs} generazion{session.runs === 1 ? 'e' : 'i'} · ${session.costUsd.toFixed(4)} stimati
          </div>
        )}
      </header>

      <div className="cols">
        <section className="chat">
          <div className="log" ref={logRef}>
            {msgs.map((m, i) => (
              <div key={i} className={`bubble ${m.who}`}>
                {m.text}
                {m.hint && <span className="hint">{m.hint}</span>}
              </div>
            ))}

            {showOptions && (
              <div className="opts">
                {current!.options!.map(o => (
                  <button key={o.value} className="opt" onClick={() => pick(o.value, o.label)}>
                    {o.label}
                    {o.note && <small>{o.note}</small>}
                  </button>
                ))}
              </div>
            )}

            {busy && (
              <div className="bubble bot">
                <span className="spinner" /> Genero la spec e renderizzo…
              </div>
            )}
          </div>

          <div className="composer">
            <textarea
              value={draft}
              placeholder={
                followUp ? 'Scrivi qui…'
                  : current?.kind === 'text' ? 'Descrivi il report…'
                    : done ? 'Vuoi aggiungere qualcosa al brief? (opzionale)'
                      : 'Oppure scrivi liberamente…'
              }
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submitText(); }
              }}
            />
            <div className="row">
              <button className="btn ghost" onClick={submitText} disabled={!draft.trim()}>Invia</button>
              <div className="grow" />
              {!done && <button className="btn ghost" onClick={skipAll}>Salta, decidi tu</button>}
              <button className="btn" onClick={generate} disabled={busy || (!done && !answers.domain)}>
                {busy ? 'Genero…' : 'Genera mockup'}
              </button>
            </div>
            {error && <div className="err">{error}</div>}
            <div className="note">La chat è locale e non consuma crediti. Solo «Genera mockup» chiama il modello.</div>
          </div>
        </section>

        <section className="preview">
          <div className="bar">
            <span className="title">Anteprima</span>
            {meta && (
              <>
                <span className={`pill ${meta.fallback ? 'warn' : ''}`}>
                  {meta.fallback ? 'fallback' : meta.repairs ? `riparata ×${meta.repairs}` : 'spec valida'}
                </span>
                <span className="pill">{meta.model}</span>
                <span className="pill">
                  {meta.tokensIn.toLocaleString('it-IT')} in / {meta.tokensOut.toLocaleString('it-IT')} out
                  {meta.cacheRead > 0 ? ` · ${meta.cacheRead.toLocaleString('it-IT')} da cache` : ''}
                </span>
                <span className="pill">${meta.costUsd.toFixed(4)}</span>
              </>
            )}
            <div className="spacer" />
            <button className="btn ghost" onClick={restart} disabled={busy}>Ricomincia</button>
            <button className="btn ghost" onClick={() => alert('Condivisione link: in arrivo.')} disabled={!html}>
              Condividi link
            </button>
            <button className="btn" onClick={download} disabled={!html}>Scarica .html</button>
          </div>
          <div className="stage">
            {html ? (
              <iframe title="Mockup" srcDoc={html} sandbox="allow-scripts" />
            ) : (
              <div className="empty">
                <b>Nessun mockup ancora</b>
                Rispondi alle domande a sinistra e premi «Genera mockup».<br />
                Il report esce qui dentro, interattivo, e si scarica come file singolo.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
