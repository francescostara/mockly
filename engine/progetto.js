/* IL PROGETTO — il documento del flusso guidato (docs/pruva-prodotto-editor-PER-CLAUDE-CODE.md,
 * skill/references/flusso.md).
 *
 * Tutto cio che l'utente decide sta qui: il brief (e i dati, se li fornisce), la struttura, il
 * template, la configurazione di ogni pagina. La spec del motore non si scrive a mano: la ricava
 * engine/compila.js. Ogni modifica passa da engine/azioni.js (mutateSpec), che dopo ogni azione
 * compila e valida.
 *
 *   progetto = {
 *     versione: 1, lingua: 'en' | 'it',
 *     brief:     { testo, dati?: { fonte, csv | righe, anno, mese?, dimensioni, campi } },
 *     struttura: { title, purpose, niche, pages: [{ id, title, subtitle, content }] },
 *     template:  { id },
 *     build: { [pageId]: { kpiRow, cardStyle, kpis: [measureId], panelHeader, panelSubtitle, layout, archetipo } }
 *   }
 */
'use strict';

const CAT = require('./catalogo.js');
const ST = require('./stili.js');
const LY = require('./layout.js');

const VERSIONE = 1;
const NICCHIE = ['retail', 'b2b-sales', 'finanziario', 'social', 'immobiliare', 'ristorazione', 'logistica',
  'energia-manifattura', 'creator-economy', 'palestre', 'ecommerce-moda', 'saas', 'generica'];
const KPI_ROW = ['full', 'value', 'off'];
const MAX_PAGINE = 8, MAX_KPI = 6;

/* I TEMPLATE: i preset approvati del catalogo, ognuno con il suo stile di card e di pannelli. Un
   template e un aspetto completo (flusso.md); lo stile per difetto e quello che il preset porta. */
const STILE_TEMPLATE = {
  'corporate-classico': { card: 'plain', header: 'framed' }, 'editoriale-chiaro': { card: 'ruled', header: 'quiet' },
  'tecnico-scuro': { card: 'outline', header: 'band' }, 'commerciale-slate': { card: 'plain', header: 'framed' },
  'operativo-salvia': { card: 'wash', header: 'framed' }, 'agenzia-scura': { card: 'solid', header: 'tab' },
  'ristorazione-terrosa': { card: 'wash', header: 'quiet' }, 'consiglio-jewel': { card: 'ruled', header: 'quiet' },
  'analisi-editoriale': { card: 'ruled', header: 'quiet' }, 'operazioni-ghiaccio': { card: 'plain', header: 'framed' }
};
function templates() {
  return CAT.PRESET_APPROVATI.map(p => Object.assign({}, p, { stile: STILE_TEMPLATE[p.id] || { card: 'plain', header: 'framed' } }));
}
function template(id) { return templates().find(t => t.id === id) || null; }
/** 1-2 template consigliati per la nicchia: i preset che dichiarano la nicchia, nell'ordine del catalogo. */
function consigliati(niche) { return templates().filter(t => (t.nicchie || []).indexOf(niche) >= 0).slice(0, 2).map(t => t.id); }

let SEQ = 0;
const nuovoId = (pagine) => { let i = pagine.length + 1; while (pagine.some(p => p.id === 'p' + i)) i++; return 'p' + i; };

/** La configurazione di una pagina appena creata: niente decisioni prese per l'utente oltre ai default. */
function buildIniziale(progetto, kpis) {
  const t = template(progetto.template && progetto.template.id) || templates()[0];
  const n = Math.min(4, (kpis || []).length);   /* quattro di partenza: l'utente ne aggiunge fino a sei */
  const lista = (kpis || []).slice(0, n);
  return { kpiRow: 'full', cardStyle: t.stile.card, kpis: lista, panelHeader: t.stile.header, panelSubtitle: true,
    archetipo: 'scorecard', layout: LY.consigliato(lista.length || 4, 'scorecard') };
  /* senza KPI la griglia la decide il layout: quattro colonne */
}

/** Un progetto nuovo dal testo del brief, deterministico (la struttura vera la propone l'AI in fase C). */
function nuovo(testo, opz) {
  const o = opz || {};
  const niche = NICCHIE.indexOf(o.niche) >= 0 ? o.niche : 'generica';
  const t = consigliati(niche)[0] || templates()[0].id;
  const pages = (o.pagine || ['Overview']).map((ti, i) => ({ id: 'p' + (i + 1), title: ti, subtitle: '', content: '' }));
  const p = {
    versione: VERSIONE, lingua: o.lingua === 'it' ? 'it' : 'en',
    brief: { testo: String(testo || '') },
    struttura: { title: o.title || 'Report', purpose: o.purpose || '', niche, pages },
    template: { id: t },
    build: {}
  };
  if (o.dati) p.brief.dati = o.dati;
  return p;
}

/** I rifiuti del progetto: la forma, prima ancora di compilare. */
function valida(p) {
  const e = [];
  if (!p || typeof p !== 'object') return ['il progetto non e un oggetto'];
  if (p.versione !== VERSIONE) e.push(`versione ${p.versione}: questo motore legge la versione ${VERSIONE}`);
  if (['en', 'it'].indexOf(p.lingua) < 0) e.push('lingua e "en" o "it"');
  if (!p.brief || typeof p.brief.testo !== 'string') e.push('brief.testo e il testo del brief');
  const s = p.struttura || {};
  if (!s.title || !String(s.title).trim()) e.push('struttura.title: il report ha bisogno di un titolo');
  if (NICCHIE.indexOf(s.niche) < 0) e.push(`struttura.niche "${s.niche}" non e una nicchia (${NICCHIE.join(', ')})`);
  if (!Array.isArray(s.pages) || !s.pages.length) e.push('struttura.pages: almeno una pagina');
  else {
    if (s.pages.length > MAX_PAGINE) e.push(`struttura.pages: al massimo ${MAX_PAGINE} pagine`);
    const ids = new Set();
    s.pages.forEach((pg, i) => {
      if (!pg.id || ids.has(pg.id)) e.push(`pagina ${i + 1}: id mancante o ripetuto`);
      ids.add(pg.id);
      if (!pg.title || !String(pg.title).trim()) e.push(`pagina "${pg.id}": serve un titolo`);
    });
  }
  if (!template(p.template && p.template.id)) e.push(`template "${p.template && p.template.id}" non e nel catalogo`);
  Object.keys(p.build || {}).forEach(id => {
    const b = p.build[id];
    if (!(s.pages || []).some(x => x.id === id)) { e.push(`build "${id}": la pagina non esiste piu`); return; }
    if (KPI_ROW.indexOf(b.kpiRow) < 0) e.push(`pagina "${id}": kpiRow e ${KPI_ROW.join(' · ')}`);
    if (ST.ID_CARD.indexOf(b.cardStyle) < 0) e.push(`pagina "${id}": cardStyle "${b.cardStyle}" non e uno stile delle card`);
    if (ST.ID_HEADER.indexOf(b.panelHeader) < 0) e.push(`pagina "${id}": panelHeader "${b.panelHeader}" non e uno stile dei pannelli`);
    if (typeof b.panelSubtitle !== 'boolean') e.push(`pagina "${id}": panelSubtitle e si o no`);
    if (!Array.isArray(b.kpis) || b.kpis.length > MAX_KPI) e.push(`pagina "${id}": da 0 a ${MAX_KPI} KPI`);
    else if (new Set(b.kpis).size !== b.kpis.length) e.push(`pagina "${id}": lo stesso KPI due volte nella riga`);
  });
  return e;
}

module.exports = { VERSIONE, NICCHIE, KPI_ROW, MAX_PAGINE, MAX_KPI, templates, template, consigliati, nuovo, valida, buildIniziale, nuovoId };
