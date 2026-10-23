'use client';

/* IL FLUSSO GUIDATO, FASE B: Brief → Structure → Template → Build, senza AI.
 *
 * L'utente decide la FORMA; i pannelli restano segnaposto finché Fill page (fase C) non li riempie.
 * Ogni scelta è un'azione che va a /api/progetto e passa da mutateSpec: il server compila, valida
 * e restituisce la storia nuova con l'anteprima. Se l'azione è rifiutata lo stato resta quello di
 * prima e il messaggio dice perché. La storia vive qui, nel client: annulla e ripeti non chiedono
 * niente a nessuno se non il ricalcolo dell'anteprima.
 *
 * Le regole della cornice (DESIGN.md) valgono anche qui: nessun colore nell'interfaccia, la
 * selezione è inchiostro, un solo bottone invertito per schermata. I nomi di template, stili e
 * layout sono di Pruva, in inglese come l'interfaccia.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { creaCoda } from '@/lib/coda.js';
import './progetto.css';

type Storia = { passato: unknown[]; presente: Progetto; futuro: unknown[] };
type Pagina = { id: string; title: string; subtitle: string; content: string };
type Progetto = {
  versione: number; lingua: 'en' | 'it';
  brief: { testo: string };
  struttura: { title: string; purpose: string; niche: string; pages: Pagina[] };
  template: { id: string };
};
type Build = { kpiRow: 'full' | 'value' | 'off'; cardStyle: string; kpis: string[]; panelHeader: string; panelSubtitle: boolean; layout: string; archetipo: string };
type Scelte = {
  pagina: string; build: Build; colonne: number;
  nicchie: { id: string; nome: string }[];
  templates: { id: string; nome: string; consigliato: boolean; card: string; header: string }[];
  kpi: { id: string; label: string }[]; maxKpi: number;
  card: { id: string; nome: string; gruppo: string; desc: string; ok: boolean; motivo: string }[];
  header: { id: string; nome: string; desc: string }[];
  layout: { codice: string; righe: number; pannelli: number; forma: string; consigliato: boolean }[];
  puoAnnullare: boolean; puoRipetere: boolean;
};
type Risposta = { ok: boolean; storia?: Storia; scelte?: Scelte; html?: string; errori: string[]; avvisi: string[] };
type Azione = Record<string, unknown> & { tipo: string };

const PASSI = ['Brief', 'Structure', 'Template', 'Build', 'Editor'] as const;

async function chiedi(body: unknown): Promise<Risposta> {
  const r = await fetch('/api/progetto', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return r.json();
}

export default function Flusso() {
  const [passo, setPasso] = useState(0);
  const [storia, setStoria] = useState<Storia | null>(null);
  const [scelte, setScelte] = useState<Scelte | null>(null);
  const [html, setHtml] = useState('');
  const [pagina, setPagina] = useState('p1');
  const [messaggio, setMessaggio] = useState<{ tipo: 'errore' | 'avviso'; testo: string } | null>(null);
  const [busy, setBusy] = useState(false);

  /* LE AZIONI IN FILA (lib/coda.js): ogni richiesta parte quando la precedente e tornata, e legge la
     storia piu recente dal ref, non quella che il componente aveva al momento del clic. */
  const storiaRef = useRef<Storia | null>(null);
  const paginaRef = useRef('p1');
  const coda = useRef<(lavoro: () => Promise<boolean>) => Promise<boolean>>(creaCoda());

  const applica = useCallback((r: Risposta) => {
    if (r.storia) { storiaRef.current = r.storia; setStoria(r.storia); }
    if (r.scelte) { paginaRef.current = r.scelte.pagina; setScelte(r.scelte); setPagina(r.scelte.pagina); }
    if (r.html) setHtml(r.html);
    if (!r.ok) setMessaggio({ tipo: 'errore', testo: (r.errori || []).join(' · ') || 'Not applied' });
    else if (r.avvisi && r.avvisi.length) setMessaggio({ tipo: 'avviso', testo: r.avvisi.join(' · ') });
    else setMessaggio(null);
    return r.ok;
  }, []);

  /* `corpo` riceve la storia e la pagina correnti nel momento in cui la richiesta parte davvero */
  const invia = useCallback((corpo: (st: Storia | null, pg: string) => Record<string, unknown> | null) => {
    return coda.current(async () => {
      const body = corpo(storiaRef.current, paginaRef.current);
      if (!body) return false;
      setBusy(true);
      try { return applica(await chiedi(body)); }
      catch { setMessaggio({ tipo: 'errore', testo: 'The server did not answer' }); return false; }
      finally { setBusy(false); }
    });
  }, [applica]);

  const azione = useCallback((a: Azione, pg?: string) => invia((st, p) => st ? { op: 'azione', storia: st, azione: a, pagina: pg || p } : null), [invia]);
  const annulla = useCallback(() => { invia((st, p) => st && st.passato.length ? { op: 'annulla', storia: st, pagina: p } : null); }, [invia]);
  const ripeti = useCallback(() => { invia((st, p) => st && st.futuro.length ? { op: 'ripeti', storia: st, pagina: p } : null); }, [invia]);
  const vedi = useCallback((pg: string) => { invia(st => st ? { op: 'vedi', storia: st, pagina: pg } : null); }, [invia]);

  /* Ctrl+Z e Ctrl+Shift+Z (o Ctrl+Y), ma non dentro un campo: lì annulla il testo, come ovunque */
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      const z = e.key.toLowerCase() === 'z', y = e.key.toLowerCase() === 'y';
      if (z && !e.shiftKey) { e.preventDefault(); annulla(); }
      else if ((z && e.shiftKey) || y) { e.preventDefault(); ripeti(); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [annulla, ripeti]);

  const pr = storia?.presente;

  return (
    <div className="fl">
      <header className="fl-top">
        <a className="wordmark" href="/">Pruva</a>
        <ol className="fl-passi" aria-label="Steps">
          {PASSI.map((p, i) => {
            const spento = i === 4 || (!pr && i > 0);
            return (
              <li key={p} className={'fl-passo' + (i === passo ? ' on' : '') + (spento ? ' off' : '')}>
                <button disabled={spento} onClick={() => setPasso(i)} aria-current={i === passo ? 'step' : undefined} aria-label={(i + 1) + ' ' + p + (i === 4 ? ' (after Fill page)' : '')}>
                  <span className="n num">{i + 1}</span><span className="t">{p}</span>
                </button>
                {i < PASSI.length - 1 && <span className="sep" aria-hidden />}
              </li>
            );
          })}
        </ol>
        <div className="fl-storia">
          <button className="btn-ghost btn-sm" onClick={annulla} disabled={!scelte?.puoAnnullare || busy} title="Undo (Ctrl+Z)">Undo</button>
          <button className="btn-ghost btn-sm" onClick={ripeti} disabled={!scelte?.puoRipetere || busy} title="Redo (Ctrl+Shift+Z)">Redo</button>
        </div>
      </header>
      <div className={'fl-msg' + (messaggio ? ' ' + messaggio.tipo : '')} role="status" aria-live="polite">{messaggio?.testo || ''}</div>

      {passo === 0 && <PassoBrief progetto={pr} busy={busy} onCrea={async (b) => { if (await invia(() => Object.assign({ op: 'nuovo' }, b))) setPasso(1); }} onAvanti={() => setPasso(1)} />}
      {passo === 1 && pr && scelte && <PassoStruttura progetto={pr} scelte={scelte} azione={azione} onAvanti={() => setPasso(2)} />}
      {passo === 2 && pr && scelte && storia && <PassoTemplate progetto={pr} storia={storia} scelte={scelte} pagina={pagina} azione={azione} onAvanti={() => setPasso(3)} />}
      {passo === 3 && pr && scelte && <PassoBuild progetto={pr} scelte={scelte} html={html} pagina={pagina} busy={busy} azione={azione} vedi={vedi} />}
    </div>
  );
}

/* ---------- un campo di testo che diventa un'azione quando lo si lascia ---------- */
function Campo({ valore, onCommit, multi, placeholder, label, aiuto, id }: { valore: string; onCommit: (v: string) => void; multi?: boolean; placeholder?: string; label: string; aiuto?: string; id: string }) {
  const [v, setV] = useState(valore);
  useEffect(() => setV(valore), [valore]);
  const fine = () => { if (v !== valore) onCommit(v); };
  return (
    <label className="fl-campo" htmlFor={id}>
      <span className="l">{label}</span>
      {aiuto && <span className="h">{aiuto}</span>}
      {multi
        ? <textarea id={id} value={v} placeholder={placeholder} rows={3} onChange={e => setV(e.target.value)} onBlur={fine} />
        : <input id={id} value={v} placeholder={placeholder} onChange={e => setV(e.target.value)} onBlur={fine} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />}
    </label>
  );
}

/* ---------- 1. Brief ---------- */
const NICCHIE_BRIEF: { id: string; nome: string }[] = [
  { id: 'retail', nome: 'Retail' }, { id: 'b2b-sales', nome: 'B2B sales' }, { id: 'finanziario', nome: 'Finance' },
  { id: 'social', nome: 'Social media' }, { id: 'immobiliare', nome: 'Real estate' }, { id: 'ristorazione', nome: 'Restaurants' },
  { id: 'logistica', nome: 'Logistics' }, { id: 'energia-manifattura', nome: 'Energy and manufacturing' },
  { id: 'creator-economy', nome: 'Creator economy' }, { id: 'palestre', nome: 'Gyms and fitness' },
  { id: 'ecommerce-moda', nome: 'Fashion e-commerce' }, { id: 'saas', nome: 'SaaS' }, { id: 'generica', nome: 'General' }
];
function PassoBrief({ progetto, busy, onCrea, onAvanti }: { progetto?: Progetto; busy: boolean; onCrea: (b: Record<string, unknown>) => void; onAvanti: () => void }) {
  const [testo, setTesto] = useState('');
  const [title, setTitle] = useState('');
  const [niche, setNiche] = useState('');
  const [lingua, setLingua] = useState<'en' | 'it'>('en');
  const [csv, setCsv] = useState<{ nome: string; testo: string } | null>(null);
  const pronto = testo.trim().length > 0 && niche;
  return (
    <main className="fl-modulo">
      <h1>Describe the report</h1>
      <p className="fl-lede">Say in your own words what the report must answer. Pruva turns it into a structure you can correct before anything is drawn.</p>
      <div className="fl-scheda">
        <Campo id="b-title" label="Report title" valore={title} onCommit={setTitle} placeholder="e.g. Picking optimisation" />
        <label className="fl-campo" htmlFor="b-testo">
          <span className="l">Brief</span>
          <span className="h">Who reads it, what they decide with it, what must be on it.</span>
          <textarea id="b-testo" rows={6} value={testo} onChange={e => setTesto(e.target.value)} placeholder="e.g. Warehouse managers need to see where picking time is lost and which locations to re-slot." />
        </label>
        <label className="fl-campo" htmlFor="b-niche">
          <span className="l">Industry</span>
          <span className="h">Required. It decides the measures offered, the recommended templates and the sample data.</span>
          <select id="b-niche" value={niche} onChange={e => setNiche(e.target.value)}>
            <option value="">Select…</option>
            {NICCHIE_BRIEF.map(n => <option key={n.id} value={n.id}>{n.nome}</option>)}
          </select>
        </label>
        <div className="fl-campo">
          <span className="l">Report language</span>
          <div className="seg" role="group" aria-label="Report language">
            <button aria-pressed={lingua === 'en'} onClick={() => setLingua('en')}>English</button>
            <button aria-pressed={lingua === 'it'} onClick={() => setLingua('it')}>Italiano</button>
          </div>
        </div>
        <label className="fl-campo" htmlFor="b-csv">
          <span className="l">Your data <span className="opz">(optional)</span></span>
          <span className="h">A CSV with a year column, text columns for the dimensions and numeric columns for the measures. Without it, the report uses sample data for the industry.</span>
          <input id="b-csv" type="file" accept=".csv,text/csv" onChange={async e => {
            const f = e.target.files && e.target.files[0];
            setCsv(f ? { nome: f.name, testo: await f.text() } : null);
          }} />
          {csv && <span className="h num">{csv.nome} · {csv.testo.split('\n').length - 1} rows</span>}
        </label>
      </div>
      <div className="fl-azioni">
        {progetto && <button className="btn-ghost" onClick={onAvanti}>Back to the current report</button>}
        <span className="spacer" />
        <button className="btn" disabled={!pronto || busy} onClick={() => onCrea({ testo, title: title || undefined, niche, lingua, csv: csv?.testo })}>
          {progetto ? 'Start a new report' : 'Build the structure'}
        </button>
      </div>
    </main>
  );
}

/* ---------- 2. Structure ---------- */
function PassoStruttura({ progetto, scelte, azione, onAvanti }: { progetto: Progetto; scelte: Scelte; azione: (a: Azione) => Promise<boolean>; onAvanti: () => void }) {
  const s = progetto.struttura;
  return (
    <main className="fl-modulo larga">
      <h1>Structure</h1>
      <p className="fl-lede">The pages of the report and what each one must show. Every field can change before you go on.</p>
      <div className="fl-scheda">
        <Campo id="s-title" label="Title" valore={s.title} onCommit={v => azione({ tipo: 'setTitolo', valore: v })} />
        <Campo id="s-purpose" label="Purpose" aiuto="One sentence: the decision the report supports." valore={s.purpose} onCommit={v => azione({ tipo: 'setScopo', valore: v })} />
        <label className="fl-campo" htmlFor="s-niche">
          <span className="l">Industry</span>
          <select id="s-niche" value={s.niche} onChange={e => azione({ tipo: 'setNicchia', valore: e.target.value })}>
            {scelte.nicchie.map(n => <option key={n.id} value={n.id}>{n.nome}</option>)}
          </select>
        </label>
      </div>
      <h2 className="fl-h2">Pages <span className="num">{s.pages.length}</span></h2>
      <ol className="fl-pagine">
        {s.pages.map((p, i) => (
          <li key={p.id} className="fl-scheda">
            <div className="fl-pagina-testa">
              <span className="num n">{i + 1}</span>
              <span className="spacer" />
              <button className="btn-ghost btn-sm" disabled={i === 0} onClick={() => azione({ tipo: 'spostaPagina', pagina: p.id, a: i - 1 })} aria-label={'Move ' + p.title + ' up'}>↑</button>
              <button className="btn-ghost btn-sm" disabled={i === s.pages.length - 1} onClick={() => azione({ tipo: 'spostaPagina', pagina: p.id, a: i + 1 })} aria-label={'Move ' + p.title + ' down'}>↓</button>
              <button className="btn-ghost btn-sm" disabled={s.pages.length === 1} onClick={() => azione({ tipo: 'eliminaPagina', pagina: p.id })}>Remove</button>
            </div>
            <Campo id={'p-t-' + p.id} label="Page title" valore={p.title} onCommit={v => azione({ tipo: 'setPagina', pagina: p.id, campo: 'title', valore: v })} />
            <Campo id={'p-s-' + p.id} label="Subtitle" valore={p.subtitle} onCommit={v => azione({ tipo: 'setPagina', pagina: p.id, campo: 'subtitle', valore: v })} />
            <Campo id={'p-c-' + p.id} label="What the page must show" multi valore={p.content} onCommit={v => azione({ tipo: 'setPagina', pagina: p.id, campo: 'content', valore: v })} />
          </li>
        ))}
      </ol>
      <div className="fl-azioni">
        <button className="btn-ghost" disabled={s.pages.length >= 8} onClick={() => azione({ tipo: 'aggiungiPagina', titolo: 'New page' })}>Add a page</button>
        <span className="spacer" />
        <button className="btn" onClick={onAvanti}>Choose a template</button>
      </div>
    </main>
  );
}

/* ---------- l'anteprima: il report vero a 1280×720, ridotto a misura del contenitore ---------- */
function Anteprima({ html, pagina, titolo }: { html: string; pagina?: string; titolo: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [scala, setScala] = useState(0.5);
  useEffect(() => {
    if (!box.current) return;
    const ro = new ResizeObserver(([e]) => setScala(e.contentRect.width / 1280));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, []);
  /* la pagina si apre col clic sulla sua voce di navigazione, come farebbe il lettore */
  const cornice = useRef<HTMLIFrameElement>(null);
  const apri = useCallback(() => {
    const f = cornice.current;
    try {
      const b = f && f.contentDocument && pagina ? f.contentDocument.querySelector('.navbtn[data-page="' + pagina + '"]') as HTMLElement | null : null;
      if (b) b.click();
    } catch { /* anteprima di un'altra origine: resta sulla prima pagina */ }
  }, [pagina]);
  /* Cambiare pagina senza cambiare il report lascia lo stesso HTML: l'iframe non si ricarica e
     onLoad non scatta, quindi l'anteprima restava sulla pagina di prima mentre il pannello a
     sinistra mostrava l'altra. Il clic si rifà a ogni cambio di pagina. */
  useEffect(() => { apri(); }, [apri]);
  return (
    <div className="fl-anteprima" ref={box} style={{ height: 720 * scala }}>
      <iframe ref={cornice} title={titolo} srcDoc={html} onLoad={apri} style={{ transform: 'scale(' + scala + ')' }} tabIndex={-1} />
    </div>
  );
}

/* ---------- 3. Template ---------- */
function PassoTemplate({ progetto, storia, scelte, pagina, azione, onAvanti }: { progetto: Progetto; storia: Storia; scelte: Scelte; pagina: string; azione: (a: Azione) => Promise<boolean>; onAvanti: () => void }) {
  const [anteprime, setAnteprime] = useState<Record<string, string>>({});
  /* le anteprime sono il report dell'utente con ogni template: deterministiche, quindi gratis.
     Si chiedono una volta per struttura; cambiare template non le invalida. */
  const chiave = JSON.stringify(progetto.struttura) + JSON.stringify((storia.presente as unknown as { build: unknown }).build);
  useEffect(() => {
    let vivo = true;
    setAnteprime({});
    scelte.templates.forEach(t => {
      chiedi({ op: 'anteprimaTemplate', storia, template: t.id, pagina })
        .then(r => { if (vivo) setAnteprime(a => Object.assign({}, a, { [t.id]: r.html || '!' + ((r.errori || [])[0] || 'not available') })); })
        .catch(() => { if (vivo) setAnteprime(a => Object.assign({}, a, { [t.id]: '!The server did not answer' })); });
    });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chiave]);
  const ordinati = useMemo(() => scelte.templates.slice().sort((a, b) => Number(b.consigliato) - Number(a.consigliato)), [scelte.templates]);
  return (
    <main className="fl-modulo larga">
      <h1>Template</h1>
      <p className="fl-lede">A complete look: palette, typography, card style and panel style. The previews are your report, not an example.</p>
      <div className="fl-griglia-t">
        {ordinati.map(t => {
          const on = progetto.template.id === t.id;
          return (
            <button key={t.id} className={'fl-tpl' + (on ? ' on' : '')} aria-pressed={on} onClick={() => azione({ tipo: 'scegliTemplate', valore: t.id })}>
              <div className="pv">{!anteprime[t.id] ? <div className="fl-attesa">Drawing…</div>
                : anteprime[t.id][0] === '!' ? <div className="fl-attesa">{anteprime[t.id].slice(1)}</div>
                  : <Anteprima html={anteprime[t.id]} pagina={pagina} titolo={'Preview of ' + t.nome} />}</div>
              <div className="meta">
                <span className="nome">{t.nome}</span>
                {t.consigliato && <span className="tag">Recommended</span>}
                {on && <span className="spunta" aria-label="Selected">✓</span>}
              </div>
            </button>
          );
        })}
      </div>
      <div className="fl-azioni"><span className="spacer" /><button className="btn" onClick={onAvanti}>Build the pages</button></div>
    </main>
  );
}

/* ---------- 4. Build ---------- */
function PassoBuild({ progetto, scelte, html, pagina, busy, azione, vedi }: { progetto: Progetto; scelte: Scelte; html: string; pagina: string; busy: boolean; azione: (a: Azione, pg?: string) => Promise<boolean>; vedi: (pg: string) => void }) {
  const [finestra, setFinestra] = useState<'card' | 'panel' | 'layout' | null>(null);
  const b = scelte.build;
  const a = (x: Record<string, unknown> & { tipo: string }) => azione(Object.assign({ pagina }, x));
  const card = scelte.card.find(c => c.id === b.cardStyle);
  const header = scelte.header.find(h => h.id === b.panelHeader);
  return (
    <div className="fl-build">
      <aside className="fl-conf">
        <div className="fl-tab" role="tablist" aria-label="Pages">
          {progetto.struttura.pages.map((p, i) => (
            <button key={p.id} role="tab" aria-selected={p.id === pagina} onClick={() => vedi(p.id)}><span className="num">{i + 1}</span> {p.title}</button>
          ))}
        </div>
        <section>
          <h3>KPI row</h3>
          <div className="seg" role="group" aria-label="KPI row">
            {(['full', 'value', 'off'] as const).map(m => <button key={m} aria-pressed={b.kpiRow === m} onClick={() => a({ tipo: 'setKpiRow', valore: m })}>{m === 'full' ? 'Full' : m === 'value' ? 'Value' : 'Off'}</button>)}
          </div>
          <p className="h">{b.kpiRow === 'full' ? 'Value with its variations.' : b.kpiRow === 'value' ? 'The value only.' : 'No KPI row: the space goes to the panels.'}</p>
        </section>
        {b.kpiRow !== 'off' && <>
          <section>
            <h3>Card style</h3>
            <button className="fl-scelta" onClick={() => setFinestra('card')}><MiniCard stile={b.cardStyle} /><span><b>{card?.nome}</b><span className="h">{card?.desc}</span></span></button>
          </section>
          <section>
            <h3>KPIs <span className="num">{b.kpis.length}</span></h3>
            <div className="fl-conta">
              <button className="btn-ghost btn-sm" disabled={b.kpis.length <= 0} onClick={() => a({ tipo: 'setKpiCount', valore: b.kpis.length - 1 })} aria-label="One KPI less">−</button>
              <span className="num">{b.kpis.length} / {scelte.maxKpi}</span>
              <button className="btn-ghost btn-sm" disabled={b.kpis.length >= Math.min(scelte.maxKpi, scelte.kpi.length)} onClick={() => a({ tipo: 'setKpiCount', valore: b.kpis.length + 1 })} aria-label="One KPI more">+</button>
            </div>
            {b.kpis.map((k, i) => (
              <select key={i} aria-label={'KPI ' + (i + 1)} value={k} onChange={e => a({ tipo: 'setKpi', posizione: i, valore: e.target.value })}>
                {scelte.kpi.map(m => <option key={m.id} value={m.id} disabled={m.id !== k && b.kpis.indexOf(m.id) >= 0}>{m.label}</option>)}
              </select>
            ))}
          </section>
        </>}
        <section>
          <h3>Panel style</h3>
          <button className="fl-scelta" onClick={() => setFinestra('panel')}><MiniPanel header={b.panelHeader} sottotitolo={b.panelSubtitle} /><span><b>{header?.nome}</b><span className="h">{b.panelSubtitle ? 'with subtitle' : 'title only'}</span></span></button>
        </section>
        <section>
          <h3>Panel layout</h3>
          <button className="fl-scelta" onClick={() => setFinestra('layout')}><MiniLayout codice={b.layout} /><span><b className="num">{b.layout}</b><span className="h">{scelte.colonne} columns{scelte.layout.find(l => l.codice === b.layout)?.consigliato ? ' · recommended' : ''}</span></span></button>
        </section>
        <section>
          <button className="btn" disabled title="Fill page arrives in phase C">Fill page</button>
          <p className="h">Fills the panels with visuals and data. Coming next: the panels stay placeholders for now.</p>
        </section>
      </aside>
      <div className={'fl-palco' + (busy ? ' busy' : '')}>
        <Anteprima html={html} pagina={pagina} titolo="Report preview" />
      </div>
      {finestra === 'card' && <FinestraCard scelte={scelte} onScegli={id => { a({ tipo: 'setCardStyle', valore: id }); setFinestra(null); }} onChiudi={() => setFinestra(null)} />}
      {finestra === 'panel' && <FinestraPanel scelte={scelte} onHeader={id => a({ tipo: 'setPanelHeader', valore: id })} onSottotitolo={v => a({ tipo: 'setPanelSubtitle', valore: v })} onChiudi={() => setFinestra(null)} />}
      {finestra === 'layout' && <FinestraLayout scelte={scelte} onScegli={c => { a({ tipo: 'setLayout', valore: c }); setFinestra(null); }} onChiudi={() => setFinestra(null)} />}
    </div>
  );
}

/* ---------- le finestre a galleria ---------- */
function Finestra({ titolo, sotto, onChiudi, children }: { titolo: string; sotto: string; onChiudi: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onChiudi(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onChiudi]);
  return (
    <div className="fl-velo" onMouseDown={e => { if (e.target === e.currentTarget) onChiudi(); }}>
      <div className="fl-fin" role="dialog" aria-modal="true" aria-label={titolo}>
        <div className="fl-fin-testa"><div><h2>{titolo}</h2><p>{sotto}</p></div><button className="btn-ghost btn-sm" onClick={onChiudi} aria-label="Close">×</button></div>
        <div className="fl-fin-corpo">{children}</div>
        <div className="fl-fin-piede"><button className="btn-ghost" onClick={onChiudi}>Close</button></div>
      </div>
    </div>
  );
}

function FinestraCard({ scelte, onScegli, onChiudi }: { scelte: Scelte; onScegli: (id: string) => void; onChiudi: () => void }) {
  const gruppi = [{ id: 'number', t: 'Number only' }, { id: 'chart', t: 'With a chart' }];
  return (
    <Finestra titolo="Card style" sotto="How the KPI cards of this page look. The preview updates as soon as you pick." onChiudi={onChiudi}>
      {gruppi.map(g => (
        <div key={g.id}>
          <h4 className="fl-gruppo">{g.t}</h4>
          <div className="fl-galleria">
            {scelte.card.filter(c => c.gruppo === g.id).map(c => {
              const on = scelte.build.cardStyle === c.id;
              return (
                <button key={c.id} className={'fl-voce' + (on ? ' on' : '')} disabled={!c.ok} aria-pressed={on} title={c.ok ? c.desc : c.motivo} onClick={() => onScegli(c.id)}>
                  <div className="pv"><MiniCard stile={c.id} /></div>
                  <span className="nome">{c.nome}{on && <span className="spunta" aria-label="Selected"> ✓</span>}</span>
                  <span className="h">{c.ok ? c.desc : c.motivo}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </Finestra>
  );
}

function FinestraPanel({ scelte, onHeader, onSottotitolo, onChiudi }: { scelte: Scelte; onHeader: (id: string) => void; onSottotitolo: (v: boolean) => void; onChiudi: () => void }) {
  const b = scelte.build;
  return (
    <Finestra titolo="Panel style" sotto="One choice for every panel of the page. The frame always stays visible." onChiudi={onChiudi}>
      <h4 className="fl-gruppo">Header</h4>
      <div className="fl-galleria">
        {scelte.header.map(h => {
          const on = b.panelHeader === h.id;
          return (
            <button key={h.id} className={'fl-voce' + (on ? ' on' : '')} aria-pressed={on} onClick={() => onHeader(h.id)}>
              <div className="pv"><MiniPanel header={h.id} sottotitolo={b.panelSubtitle} /></div>
              <span className="nome">{h.nome}{on && <span className="spunta" aria-label="Selected"> ✓</span>}</span>
              <span className="h">{h.desc}</span>
            </button>
          );
        })}
      </div>
      <h4 className="fl-gruppo">Subtitle</h4>
      <div className="seg" role="group" aria-label="Subtitle">
        <button aria-pressed={b.panelSubtitle} onClick={() => onSottotitolo(true)}>Yes</button>
        <button aria-pressed={!b.panelSubtitle} onClick={() => onSottotitolo(false)}>No</button>
      </div>
    </Finestra>
  );
}

/* La ricerca legge la grammatica di Pruva: "3+2" trova i layout che hanno quella riga, "2/" quelli a
   due righe di pannelli, un numero solo la riga che occupa tutta la griglia. */
function FinestraLayout({ scelte, onScegli, onChiudi }: { scelte: Scelte; onScegli: (c: string) => void; onChiudi: () => void }) {
  const [q, setQ] = useState('');
  const trovati = useMemo(() => {
    const t = q.replace(/\s+/g, '');
    if (!t) return scelte.layout;
    const m = /^(\d)\/$/.exec(t);
    if (m) return scelte.layout.filter(l => l.righe === Number(m[1]));
    return scelte.layout.filter(l => l.codice === t || l.codice.split('/').some(r => r === t) || l.codice.indexOf(t) === 0);
  }, [q, scelte.layout]);
  const gruppi = useMemo(() => {
    const g: Record<string, typeof trovati> = {};
    trovati.forEach(l => { const k = l.righe + (l.righe === 1 ? ' row' : ' rows'); (g[k] = g[k] || []).push(l); });
    return g;
  }, [trovati]);
  return (
    <Finestra titolo="Panel layout" sotto={'How the panels sit below the KPI row, on the page grid of ' + scelte.colonne + ' columns.'} onChiudi={onChiudi}>
      <label className="fl-cerca">
        <span className="vh">Search layouts</span>
        <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search by code: 3+2, 2+1/3, 2/ for two rows…" />
      </label>
      <p className="h">A code is the spans of each row: “+” between panels, “/” between rows. Every row fills the {scelte.colonne} columns.</p>
      {!trovati.length && <p className="h">No layout matches “{q}” on {scelte.colonne} columns.</p>}
      {Object.keys(gruppi).map(k => (
        <div key={k}>
          <h4 className="fl-gruppo">{k} <span className="num">({gruppi[k].length})</span></h4>
          <div className="fl-galleria fitta">
            {gruppi[k].map(l => {
              const on = scelte.build.layout === l.codice;
              return (
                <button key={l.codice} className={'fl-voce' + (on ? ' on' : '')} aria-pressed={on} onClick={() => onScegli(l.codice)} title={l.codice}>
                  <div className="pv"><MiniLayout codice={l.codice} /></div>
                  <span className="nome num">{l.codice}{on && <span className="spunta" aria-label="Selected"> ✓</span>}</span>
                  {l.consigliato && <span className="tag">Recommended</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </Finestra>
  );
}

/* ---------- i disegni delle scelte: inchiostro su carta, nessun colore ---------- */
function MiniCard({ stile }: { stile: string }) {
  const grafico = stile === 'columns' || stile === 'area' || stile === 'stack';
  return (
    <div className={'mc mc-' + stile} aria-hidden>
      <div className="mc-k">{stile === 'badge' && <i className="mc-ic" />}<span /></div>
      <div className="mc-v"><span className="val" /><span className="d" /></div>
      {grafico ? <div className={'mc-g ' + stile}>{Array.from({ length: 8 }).map((_, i) => <span key={i} style={{ height: [40, 55, 48, 62, 58, 70, 66, 82][i] + '%' }} />)}</div> : <div className="mc-det" />}
      {stile === 'ring' && <i className="mc-anello" />}
    </div>
  );
}
function MiniPanel({ header, sottotitolo }: { header: string; sottotitolo: boolean }) {
  return (
    <div className={'mp mp-' + header} aria-hidden>
      <div className="mp-h"><span className="t" />{sottotitolo && <span className="s" />}</div>
      <div className="mp-b" />
    </div>
  );
}
function MiniLayout({ codice }: { codice: string }) {
  const righe = codice.split('/').map(r => r.split('+').map(Number));
  return (
    <div className="ml" aria-hidden>
      {righe.map((r, i) => <div key={i} className="ml-r">{r.map((s, j) => <span key={j} style={{ flex: s }} />)}</div>)}
    </div>
  );
}
