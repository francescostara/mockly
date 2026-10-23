/* IL FLUSSO GUIDATO DIETRO LA ROUTE /api/progetto (fase B, senza AI).
 *
 * Il server non ricorda niente: ogni richiesta porta la storia (passato, presente, futuro) e riceve
 * la storia nuova, l'anteprima della pagina e cio che serve alle schermate per offrire le scelte.
 * Ogni modifica passa da mutateSpec (engine/azioni.js), come in locale: online si comporta uguale.
 * Nessuna chiamata a un modello, quindi zero crediti.
 *
 * Modulo CommonJS puro: lo usano la route di Next (via require a runtime, come lib/engine.ts) e i
 * test (test/progetto-api.test.js), senza bisogno di avviare Next.
 */
'use strict';

const path = require('path');
const E = (...p) => require(path.join(__dirname, '..', 'engine', ...p));
const A = E('azioni.js');
const C = E('compila.js');
const P = E('progetto.js');
const LY = E('layout.js');
const ST = E('stili.js');
const R = E('render.js');

/* le nicchie col nome che l'utente legge (l'interfaccia e in inglese) */
const NICCHIE = {
  retail: 'Retail', 'b2b-sales': 'B2B sales', finanziario: 'Finance', social: 'Social media', immobiliare: 'Real estate',
  ristorazione: 'Restaurants', logistica: 'Logistics', 'energia-manifattura': 'Energy and manufacturing',
  'creator-economy': 'Creator economy', palestre: 'Gyms and fitness', 'ecommerce-moda': 'Fashion e-commerce',
  saas: 'SaaS', generica: 'General'
};

/* IL CSV DELL'UTENTE, senza configurazione: la colonna dell'anno (e del mese, se c'e) si riconosce
   dal nome o dai valori, le colonne di testo sono dimensioni coi loro membri, le altre sono campi.
   Lo stesso formato che engine/dati-forniti.js legge; i rifiuti restano i suoi. */
function datiDaCsv(testo) {
  const righe = String(testo || '').replace(/\r/g, '').split('\n').filter(r => r.trim());
  if (righe.length < 2) throw new Error('the CSV has no data rows');
  const sep = (righe[0].match(/;/g) || []).length > (righe[0].match(/,/g) || []).length ? ';' : ',';
  const hdr = righe[0].split(sep).map(x => x.trim().replace(/^"|"$/g, ''));
  const val = righe.slice(1).map(r => r.split(sep).map(x => x.trim().replace(/^"|"$/g, '')));
  const numerica = i => val.every(r => r[i] === '' || r[i] === undefined || isFinite(Number(String(r[i]).replace(',', '.'))));
  const anno = hdr.find((h, i) => /^(anno|year|yr|ye)$/i.test(h)) || hdr.find((h, i) => numerica(i) && val.every(r => /^(19|20)\d\d$/.test(r[i])));
  if (!anno) throw new Error('the CSV needs a year column (anno, year)');
  const mese = hdr.find(h => /^(mese|month|mo)$/i.test(h)) || null;
  const dimensioni = [], campi = [];
  hdr.forEach((h, i) => {
    if (h === anno || h === mese) return;
    if (numerica(i)) { campi.push(h); return; }
    const visti = [...new Set(val.map(r => r[i]).filter(Boolean))];
    dimensioni.push({ id: h, colonna: h, etichetta: h, membri: visti.map(v => ({ id: v, n: v })) });
  });
  if (!campi.length) throw new Error('the CSV needs at least one numeric column');
  if (!dimensioni.length) throw new Error('the CSV needs at least one text column (a dimension, e.g. region)');
  return { fonte: 'csv', csv: String(testo), anno, mese: mese || undefined, dimensioni, campi };
}

/** Le scelte che le schermate offrono, per il progetto e la pagina correnti. */
function scelte(progetto, paginaId) {
  const pg = progetto.struttura.pages.find(x => x.id === paginaId) || progetto.struttura.pages[0];
  const b = C.buildDi(progetto, pg);
  const nc = b.kpiRow === 'off' || !b.kpis.length ? (LY.colonne(b.layout) || 4) : b.kpis.length;
  const { spec, data } = C.compila(progetto);
  const misure = spec.model.measures;
  const consigliati = P.consigliati(progetto.struttura.niche);
  return {
    pagina: pg.id,
    build: b,
    colonne: nc,
    nicchie: P.NICCHIE.map(id => ({ id, nome: NICCHIE[id] || id })),
    templates: P.templates().map(t => ({ id: t.id, nome: t.name || t.nome, consigliato: consigliati.indexOf(t.id) >= 0, card: t.stile.card, header: t.stile.header })),
    kpi: C.kpiDisponibili(progetto),
    maxKpi: P.MAX_KPI,
    card: ST.CARD.map(s => {
      const no = b.kpis.map(id => ({ id, r: ST.supporta(s.id, misure.find(m => m.id === id), data) })).filter(x => !x.r.ok);
      return { id: s.id, nome: s.nome, gruppo: s.gruppo, desc: s.desc, ok: !no.length, motivo: no.length ? no.map(x => ((misure.find(m => m.id === x.id) || {}).label || x.id) + ': ' + x.r.motivo).join('; ') : '' };
    }),
    header: ST.HEADER.map(h => ({ id: h.id, nome: h.nome, desc: h.desc })),
    layout: LY.catalogo(nc).map(l => Object.assign({}, l, { consigliato: l.codice === LY.consigliato(nc, b.archetipo) })),
    puoAnnullare: false, puoRipetere: false
  };
}

/** L'anteprima: il report compilato. La pagina da mostrare la apre la schermata, col clic sulla sua
    voce di navigazione: riordinare le pagine qui cambierebbe anche l'ordine della navigazione. */
function anteprima(progetto) {
  const { spec, data } = C.compila(progetto);
  return R.render(spec, data);
}

function risposta(storia, paginaId, extra) {
  const pr = storia.presente;
  const pg = pr.struttura.pages.some(x => x.id === paginaId) ? paginaId : pr.struttura.pages[0].id;
  const sc = scelte(pr, pg);
  sc.puoAnnullare = A.puoAnnullare(storia); sc.puoRipetere = A.puoRipetere(storia);
  return Object.assign({ ok: true, storia, scelte: sc, html: anteprima(pr, pg), errori: [], avvisi: [] }, extra || {});
}

/**
 * Una richiesta del flusso. Le operazioni:
 *   { op: 'nuovo', testo, niche, lingua, pagine?, csv? }
 *   { op: 'azione', storia, azione, pagina }
 *   { op: 'annulla' | 'ripeti' | 'vedi', storia, pagina }
 *   { op: 'anteprimaTemplate', storia, template }   l'anteprima di un template sul report dell'utente
 */
function gestisci(req) {
  const q = req || {};
  try {
    if (q.op === 'nuovo') {
      let dati;
      if (q.csv) dati = datiDaCsv(q.csv);
      const pr = P.nuovo(q.testo || '', { niche: q.niche, lingua: q.lingua, title: q.title || undefined, pagine: q.pagine, dati });
      const err = A.controlla(pr);
      if (err.length) return { ok: false, errori: err };
      return risposta(A.storia(pr), pr.struttura.pages[0].id);
    }
    if (!q.storia || !q.storia.presente) return { ok: false, errori: ['the request has no project'] };
    const st = q.storia;
    if (q.op === 'azione') {
      const r = A.mutateSpec(st, q.azione);
      if (!r.ok) return Object.assign(risposta(st, q.pagina), { ok: false, errori: r.errori, avvisi: r.avvisi });
      const nuova = (r.esito && r.esito.id) || q.pagina;
      return risposta(r.storia, nuova, { avvisi: r.avvisi });
    }
    if (q.op === 'annulla') return risposta(A.annulla(st), q.pagina);
    if (q.op === 'ripeti') return risposta(A.ripeti(st), q.pagina);
    if (q.op === 'vedi') return risposta(st, q.pagina);
    if (q.op === 'anteprimaTemplate') {
      const r = A.mutateSpec(A.storia(st.presente), { tipo: 'scegliTemplate', valore: q.template });
      if (!r.ok) return { ok: false, errori: r.errori };
      return { ok: true, html: anteprima(r.storia.presente, q.pagina) };
    }
    return { ok: false, errori: ['unknown operation "' + q.op + '"'] };
  } catch (e) {
    return { ok: false, errori: [String((e && e.message) || e)] };
  }
}

module.exports = { gestisci, scelte, anteprima, datiDaCsv, NICCHIE };
