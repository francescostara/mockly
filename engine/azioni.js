/* MUTATESPEC — ogni azione dell'utente sul progetto, con validazione dopo ogni passo e annulla/ripeti
 * (skill/references/flusso.md).
 *
 * Un'azione non cambia il progetto: ne produce uno nuovo. Il nuovo progetto si valida (forma),
 * si compila (engine/compila.js) e la spec compilata passa la validazione del motore. Se qualcosa
 * fallisce, l'azione e rifiutata: lo stato resta quello di prima e il messaggio nomina il campo.
 * La storia e una pila di progetti: passato, presente, futuro.
 *
 *   let st = storia(progetto)
 *   const r = mutateSpec(st, { tipo: 'setKpiRow', pagina: 'p1', valore: 'value' })
 *   if (r.ok) st = r.storia  else  mostra(r.errori)
 *   st = annulla(st); st = ripeti(st)
 */
'use strict';

const P = require('./progetto.js');
const C = require('./compila.js');
const LY = require('./layout.js');
const ST = require('./stili.js');
const R = require('./render.js');

const MAX_STORIA = 100;
const clona = o => JSON.parse(JSON.stringify(o));

/** La storia di partenza. */
function storia(progetto) { return { passato: [], presente: clona(progetto), futuro: [] }; }
const puoAnnullare = s => s.passato.length > 0;
const puoRipetere = s => s.futuro.length > 0;
function annulla(s) { if (!puoAnnullare(s)) return s; return { passato: s.passato.slice(0, -1), presente: s.passato[s.passato.length - 1], futuro: [s.presente].concat(s.futuro) }; }
function ripeti(s) { if (!puoRipetere(s)) return s; return { passato: s.passato.concat([s.presente]), presente: s.futuro[0], futuro: s.futuro.slice(1) }; }

/* la configurazione della pagina, materializzata: da qui in poi e una decisione dell'utente */
function cfg(p, id) {
  if (!p.struttura.pages.some(x => x.id === id)) throw new Error(`pagina "${id}": non esiste`);
  if (!p.build[id]) p.build[id] = C.buildDi(p, p.struttura.pages.find(x => x.id === id));
  return p.build[id];
}
/* le colonne della griglia della pagina dopo la modifica: tante quante le card, o quelle del layout */
function colonne(b) { return b.kpiRow === 'off' || !b.kpis.length ? LY.colonne(b.layout) : b.kpis.length; }
/* se le colonne cambiano, il layout si riadatta al consigliato e lo si dice (non si rifiuta) */
function riallinea(b, avvisi) {
  const nc = b.kpiRow === 'off' || !b.kpis.length ? (LY.colonne(b.layout) || 4) : b.kpis.length;
  if (LY.valida(b.layout, nc).length) {
    const prima = b.layout;
    b.layout = LY.consigliato(nc, b.archetipo);
    avvisi.push(`layout ${prima} does not fit ${nc} columns: switched to the recommended ${b.layout}`);
  }
}

/* LE AZIONI. Ognuna modifica la copia `p` e puo aggiungere avvisi; un errore si lancia. */
const AZIONI = {
  setBrief: (p, a) => { p.brief.testo = String(a.valore || ''); },
  setDati: (p, a) => { if (a.valore) p.brief.dati = a.valore; else delete p.brief.dati; p.build = {}; },
  setTitolo: (p, a) => { p.struttura.title = String(a.valore || ''); },
  setScopo: (p, a) => { p.struttura.purpose = String(a.valore || ''); },
  setNicchia: (p, a) => { p.struttura.niche = a.valore; },
  setLingua: (p, a) => { p.lingua = a.valore; },
  aggiungiPagina: (p, a) => {
    const id = P.nuovoId(p.struttura.pages);
    const nuova = { id, title: a.titolo || 'New page', subtitle: '', content: '' };
    const i = a.dopo ? p.struttura.pages.findIndex(x => x.id === a.dopo) + 1 : p.struttura.pages.length;
    p.struttura.pages.splice(i < 1 ? p.struttura.pages.length : i, 0, nuova);
    return { id };
  },
  eliminaPagina: (p, a) => {
    if (p.struttura.pages.length === 1) throw new Error('struttura.pages: almeno una pagina; e l\'ultima');
    const i = p.struttura.pages.findIndex(x => x.id === a.pagina);
    if (i < 0) throw new Error(`pagina "${a.pagina}": non esiste`);
    p.struttura.pages.splice(i, 1); delete p.build[a.pagina];
  },
  spostaPagina: (p, a) => {
    const i = p.struttura.pages.findIndex(x => x.id === a.pagina);
    if (i < 0) throw new Error(`pagina "${a.pagina}": non esiste`);
    const j = Math.max(0, Math.min(p.struttura.pages.length - 1, a.a));
    const [pg] = p.struttura.pages.splice(i, 1); p.struttura.pages.splice(j, 0, pg);
  },
  setPagina: (p, a) => {
    const pg = p.struttura.pages.find(x => x.id === a.pagina);
    if (!pg) throw new Error(`pagina "${a.pagina}": non esiste`);
    if (['title', 'subtitle', 'content'].indexOf(a.campo) < 0) throw new Error(`pagina: il campo "${a.campo}" non si modifica (title · subtitle · content)`);
    pg[a.campo] = String(a.valore || '');
  },
  scegliTemplate: (p, a, avvisi) => {
    const t = P.template(a.valore);
    if (!t) throw new Error(`template "${a.valore}" non e nel catalogo`);
    p.template = { id: t.id };
    /* lo stile del template vale per le pagine che non l'hanno cambiato a mano */
    Object.keys(p.build).forEach(id => { const b = p.build[id]; if (!b.cardStyleScelto) b.cardStyle = t.stile.card; if (!b.panelHeaderScelto) b.panelHeader = t.stile.header; });
  },
  setKpiRow: (p, a, avvisi) => {
    if (P.KPI_ROW.indexOf(a.valore) < 0) throw new Error(`kpiRow e ${P.KPI_ROW.join(' · ')}`);
    const b = cfg(p, a.pagina); const nc0 = colonne(b);
    b.kpiRow = a.valore;
    if (a.valore === 'off' && !LY.colonne(b.layout)) b.layout = LY.consigliato(nc0 || 4, b.archetipo);
    riallinea(b, avvisi);
  },
  setCardStyle: (p, a, avvisi) => {
    if (ST.ID_CARD.indexOf(a.valore) < 0) throw new Error(`cardStyle "${a.valore}" non e uno stile delle card (${ST.ID_CARD.join(' · ')})`);
    const b = cfg(p, a.pagina);
    const { data, spec } = C.compila(p);
    const non = b.kpis.map(id => ({ id, r: ST.supporta(a.valore, spec.model.measures.find(m => m.id === id), data) })).filter(x => !x.r.ok);
    if (non.length) throw new Error(`cardStyle "${a.valore}": ${non.map(x => x.id + ' — ' + x.r.motivo).join('; ')}`);
    b.cardStyle = a.valore; b.cardStyleScelto = true;
  },
  setKpiCount: (p, a, avvisi) => {
    const n = a.valore;
    if (!Number.isInteger(n) || n < 0 || n > P.MAX_KPI) throw new Error(`il numero di KPI va da 0 a ${P.MAX_KPI}`);
    const b = cfg(p, a.pagina);
    const disp = C.kpiDisponibili(p).map(k => k.id).filter(id => b.kpis.indexOf(id) < 0);
    if (n > b.kpis.length + disp.length) throw new Error(`ci sono solo ${b.kpis.length + disp.length} KPI inseribili`);
    b.kpis = n <= b.kpis.length ? b.kpis.slice(0, n) : b.kpis.concat(disp.slice(0, n - b.kpis.length));
    if (!n && !LY.colonne(b.layout)) b.layout = LY.consigliato(4, b.archetipo);
    riallinea(b, avvisi);
  },
  setKpi: (p, a) => {
    const b = cfg(p, a.pagina);
    if (!Number.isInteger(a.posizione) || a.posizione < 0 || a.posizione >= b.kpis.length) throw new Error(`KPI in posizione ${a.posizione}: la riga ne ha ${b.kpis.length}`);
    if (!C.kpiDisponibili(p).some(k => k.id === a.valore)) throw new Error(`KPI "${a.valore}": non e una misura dei dati`);
    if (b.kpis.some((k, i) => k === a.valore && i !== a.posizione)) throw new Error(`KPI "${a.valore}": e gia nella riga`);
    b.kpis[a.posizione] = a.valore;
  },
  setPanelHeader: (p, a) => {
    if (ST.ID_HEADER.indexOf(a.valore) < 0) throw new Error(`panelHeader "${a.valore}" non e uno stile dei pannelli (${ST.ID_HEADER.join(' · ')})`);
    const b = cfg(p, a.pagina); b.panelHeader = a.valore; b.panelHeaderScelto = true;
  },
  setPanelSubtitle: (p, a) => { cfg(p, a.pagina).panelSubtitle = !!a.valore; },
  setLayout: (p, a) => {
    const b = cfg(p, a.pagina);
    const nc = b.kpiRow === 'off' || !b.kpis.length ? LY.colonne(a.valore) : b.kpis.length;
    const e = LY.valida(a.valore, nc);
    if (e.length) throw new Error(e.join('; '));
    b.layout = a.valore;
  },
  setArchetipo: (p, a) => { cfg(p, a.pagina).archetipo = a.valore; }
};
const TIPI = Object.keys(AZIONI);

/** Valida un progetto fino in fondo: forma, compilazione, motore. @returns errori (vuoto = buono) */
function controlla(p) {
  const e = P.valida(p);
  if (e.length) return e;
  try {
    const { spec, data } = C.compila(p);
    R.validate(spec, data);
    return [];
  } catch (err) {
    return String(err.message || err).split('\n').map(l => l.replace(/^\s*-\s*/, '').trim()).filter(l => l && !/validation failed/i.test(l));
  }
}

/** Applica un'azione. @returns { ok, storia, errori, avvisi, esito } */
function mutateSpec(s, azione) {
  const f = AZIONI[azione && azione.tipo];
  if (!f) return { ok: false, storia: s, errori: [`azione "${azione && azione.tipo}" sconosciuta (${TIPI.join(', ')})`], avvisi: [] };
  const p = clona(s.presente), avvisi = [];
  let esito;
  try { esito = f(p, azione, avvisi); } catch (err) { return { ok: false, storia: s, errori: [String(err.message || err)], avvisi: [] }; }
  const errori = controlla(p);
  if (errori.length) return { ok: false, storia: s, errori, avvisi };
  const passato = s.passato.concat([s.presente]).slice(-MAX_STORIA);
  return { ok: true, storia: { passato, presente: p, futuro: [] }, errori: [], avvisi, esito };
}

module.exports = { mutateSpec, storia, annulla, ripeti, puoAnnullare, puoRipetere, controlla, TIPI, MAX_STORIA };
