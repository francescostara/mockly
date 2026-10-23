/* DAL PROGETTO ALLA SPEC — deterministico, senza modello (skill/references/flusso.md).
 *
 * Il progetto dice la FORMA (pagine, riga KPI, stili, layout); questo modulo ne ricava la spec del
 * motore e i dati. Finche Fill page non ha riempito una pagina, i suoi pannelli sono segnaposto: la
 * pagina si prova davvero (griglia, fit, riga KPI, geometria) a costo zero.
 *
 * I dati: quelli forniti dall'utente (engine/dati-forniti.js), oppure il dataset d'esempio della
 * nicchia, preso da un caso del corpus. I KPI inseribili vengono dalle misure di quei dati.
 */
'use strict';

const CAT = require('./catalogo.js');
const P = require('./progetto.js');
const LY = require('./layout.js');
const DF = require('./dati-forniti.js');

/* il dataset d'esempio di ogni nicchia: un caso del corpus, in inglese dove esiste */
const ESEMPIO = {
  retail: './specs/locale/retail-parsa.js', 'ecommerce-moda': './specs/locale/retail-parsa.js',
  logistica: './specs/locale/supply-chain-muttahar.js', 'energia-manifattura': './specs/locale/supply-chain-muttahar.js',
  finanziario: './specs/locale/cfo-bodan.js', immobiliare: './specs/locale/cfo-bodan.js',
  social: './specs/social-monthly.js', 'creator-economy': './specs/social-monthly.js',
  'b2b-sales': './templates/funnel.js', saas: './templates/executive-summary.js',
  palestre: './templates/operational.js', ristorazione: './templates/operational.js',
  generica: './specs/locale/retail-parsa.js'
};
const cache = {};
function esempio(niche) {
  const f = ESEMPIO[niche] || ESEMPIO.generica;
  if (!cache[f]) { const m = require(f); cache[f] = { spec: m.spec, data: m.build() }; }
  return cache[f];
}

/** Il modello, i filtri e i dati del progetto. */
function base(progetto) {
  const d = progetto.brief && progetto.brief.dati;
  if (d) {
    const data = DF.carica(d);
    const campi = d.campi || [];
    const misure = (d.misure && d.misure.length) ? d.misure
      : campi.map(c => ({ id: c, label: c, agg: 'sum', field: c, unit: 'count', format: 'N' }));
    const dims = (d.dimensioni || []).filter(x => x.colonna).map(x => ({ id: x.id, label: x.etichetta || x.id, control: 'dropdown', allLabel: 'All', pill: x.etichetta || x.id }));
    const annuale = !data.mensili.length;
    return { data, model: { sums: campi, measures: misure },
      filters: { date: { levels: annuale ? ['year'] : ['year', 'quarter', 'month'], default: { y: data.years[data.years.length - 1] } }, dims },
      meta: { currency: d.valuta || '$' } };
  }
  const es = esempio(progetto.struttura.niche);
  /* nel flusso i filtri sono menu a tendina: con ogni shell e ogni template la riga dei filtri ci sta
     (un elenco a bottoni sforava di 175px nella shell senza rail, minimo-senza-kpi) */
  const filters = Object.assign({}, es.spec.filters, { dims: (es.spec.filters.dims || []).map(d => Object.assign({}, d, { control: 'dropdown' })) });
  return { data: es.data, model: es.spec.model, filters, meta: { currency: es.spec.meta.currency, months: es.spec.meta.locale.slice(0, 2) === (progetto.lingua || 'en') ? es.spec.meta.months : undefined } };
}

/** I KPI che si possono mettere nella riga: le misure dei dati. */
function kpiDisponibili(progetto) {
  return base(progetto).model.measures.map(m => ({ id: m.id, label: m.label || m.id, unit: m.unit, agg: m.agg }));
}

/** La configurazione di ogni pagina, coi default dove l'utente non ha ancora deciso. */
function buildDi(progetto, pg) {
  return progetto.build[pg.id] || P.buildIniziale(progetto, kpiDisponibili(progetto).map(k => k.id));
}

const ALTEZZA = { 1: 400, 2: 190, 3: 118 };

/** progetto -> { spec, data } */
function compila(progetto) {
  const B = base(progetto);
  const t = P.template(progetto.template.id);
  const skin = Object.assign({}, t.skin);
  const misure = {};
  B.model.measures.forEach(m => { misure[m.id] = m; });
  const pagine = progetto.struttura.pages.map((pg, i) => {
    const b = buildDi(progetto, pg);
    const cards = b.kpiRow === 'off' ? [] : b.kpis.map(id => ({ id: 'k_' + pg.id + '_' + id, label: (misure[id] && misure[id].label) || id, measure: id, span: 1 }));
    const righe = LY.leggi(b.layout) || [[cards.length || 4]];
    const nc = cards.length || LY.colonne(b.layout) || 4;
    const h = ALTEZZA[righe.length] || 118;
    let n = 0;
    const out = {
      id: pg.id, title: pg.title, subtitle: pg.subtitle || undefined,
      kpi: { mode: b.kpiRow, cards, style: b.cardStyle },
      panels: { header: b.panelHeader, subtitle: b.panelSubtitle },
      rows: righe.map(r => ({ visuals: r.map(span => {
        n++;
        return { type: 'segnaposto', span, h, title: 'Panel ' + n, subtitle: b.panelSubtitle ? (pg.content || 'filled by Fill page') : undefined, bind: { etichetta: 'Panel ' + n } };
      }) }))
    };
    if (!cards.length) out.columns = nc;
    if (progetto.struttura.pages.length > 1) out.nav = pg.title;
    return out;
  });
  const p0 = pagine[0];
  const spec = {
    meta: Object.assign({
      title: progetto.struttura.title, subtitle: progetto.struttura.purpose || undefined,
      locale: progetto.lingua === 'it' ? 'it-IT' : 'en-US',
      watermark: progetto.lingua === 'it' ? 'Mockup dimostrativo · dati sintetici' : 'Demo mockup · synthetic data'
    }, B.meta.months ? { months: B.meta.months } : {}, { currency: B.meta.currency || '$' }),
    aesthetic: 'corporate-sober',
    skin,
    archetype: 'scorecard',
    grid: { contentWidth: CAT.LARGHEZZE[skin.shell], gutter: CAT.GUTTER[skin.densita], columns: p0.columns || p0.kpi.cards.length },
    model: B.model,
    filters: B.filters,
    kpiBand: [],
    pages: pagine
  };
  return { spec, data: B.data };
}

module.exports = { compila, kpiDisponibili, buildDi, base, ESEMPIO };
