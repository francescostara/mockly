/* CICLO LOCALE — giro 1. Brief di trasporti, scritto come lo scriverebbe un utente vero.
 *
 * BRIEF (testuale, sporco, incompleto — come arrivano davvero):
 *   "ciao, ho una piccola azienda di trasporti a Verona, 18 mezzi, facciamo consegne per
 *    e-commerce nel nord italia. vorrei far vedere ai miei soci quali rotte ci fanno guadagnare
 *    e quali no, perche ho il sospetto che su alcune ci rimettiamo. non ho un CRM, uso excel e
 *    il gestionale del trasporto"
 *
 * RAGIONAMENTO DICHIARATO (la parte che si corregge per prima, vedi LOCAL-EVAL.md)
 *   nicchia    logistica / trasporti — "azienda di trasporti", "consegne", "rotte"
 *   taglia     PICCOLA. Segnali che abbassano: "piccola", 18 mezzi, "non ho un CRM", "uso
 *              excel". Nessun segnale che alza. Quindi FLOOR + la parte di livello 2 che il
 *              brief nomina esplicitamente: le ROTTE, che il gestionale del trasporto ha e che
 *              il brief chiede per nome.
 *   domanda    "quali rotte ci fanno guadagnare e quali no" — non "quanto ho fatturato". E'
 *              una domanda di redditivita per entita, e la risposta deve poter dire "questa
 *              perde", non solo "questa e piu piccola".
 *   archetipo  quadrants. La domanda e "chi rende davvero": lo scatter con le mediane mette le
 *              rotte in perdita nel quadrante in basso da sole, che e cio che il socio deve
 *              vedere in tre secondi. Lo scorecard direbbe "va tutto bene, +9%".
 *   pelle      shell rail-slim · palette dark-tecnico · tipografia condensato · densita medio.
 *              Dentro la PELLE PLAUSIBILE della nicchia, ruotata dal seme del brief.
 *   ancore     margine netto ~10% (settore a margine sottile, il report reale ~10-11%)
 *              costo per spedizione 3 - 30 EUR -> spedizioni = costi / costo per spedizione
 *              quota carrier ~85% dei costi (nel report reale ~91/9)
 *              Le conte discendono: nessun numero scelto a mano.
 *
 * BUCO DELLA SKILL TROVATO IN QUESTO GIRO (annotato in LOCAL-EVAL.md):
 *   niches.md dichiara il MARGINE PER KM come "unita di verita" della nicchia, ma
 *   data-availability.md mette "margine per km (distanze)" nella colonna RARO, da includere
 *   solo se il brief lo cita. Questo brief non lo cita. Le due regole si contraddicono, e in
 *   produzione il modello sceglierebbe a caso. Qui si applica la regola piu prudente — "in
 *   caso di dubbio resta al floor" — e si costruisce sul margine per spedizione.
 */
'use strict';
const builder = require('../../data-builder.js');

/* Otto rotte del nord: due perdono davvero. La perdita non e un dato inventato per fare colore
   — e la storia negativa firma della nicchia (leakage), e senza almeno una rotta sotto zero il
   report risponderebbe "no" a una domanda che il cliente ha posto perche sospetta "si". */
const ROTTE = [
  ['vr-mi', 'Verona-Milano', '#4E8CC4', 128000, 0.11, 0.14, 9.2],
  ['vr-bo', 'Verona-Bologna', '#3E86C4', 96000, 0.08, 0.12, 8.6],
  ['vr-to', 'Verona-Torino', '#5FA8D8', 74000, 0.15, 0.07, 12.4],
  ['vr-ve', 'Verona-Venezia', '#7FC4E4', 61000, 0.04, 0.16, 7.1],
  ['vr-bs', 'Verona-Brescia', '#A6D6EC', 52000, 0.06, 0.18, 6.4],
  ['vr-tn', 'Verona-Trento', '#CDE8F5', 38000, -0.03, 0.09, 11.8],
  /* le due in perdita: alto costo per spedizione e margine negativo */
  ['vr-ge', 'Verona-Genova', '#8FB3CC', 44000, 0.21, -0.04, 16.9],
  ['vr-ud', 'Verona-Udine', '#B5CBDD', 29000, -0.09, -0.02, 15.2]
];

const dataParams = {
  seed: 51477,
  years: [2024, 2025],
  /* stagionalita del trasporto e-commerce: novembre e dicembre fanno l'anno, agosto crolla */
  seasonality: [0.88, 0.86, 0.96, 0.94, 0.98, 0.92, 0.84, 0.48, 1.02, 1.14, 1.42, 1.36],
  dims: {
    rotta: {
      members: ROTTE.map(([id, n, c, base, growth, margine, costoSped]) => ({
        id, n, c, base, growth, attrs: { margine: [+(margine + 0.012).toFixed(3), margine], costoSped, quotaCarrier: 0.85 }   /* il margine scende di un punto: i confronti con l'anno prima dicono qualcosa (engine/tassi.js) */
      }))
    },
    vettore: {
      members: [
        { id: 'propria', n: 'Flotta propria', c: '#4E8CC4', base: 1, attrs: {} },
        { id: 'carrier', n: 'Carrier terzi', c: '#A6D6EC', base: 1, attrs: {} }
      ]
    }
  },
  facts: {
    dim: 'rotta',
    /* i costi carrier dominano sulla flotta propria: nel report reale ~91/9 */
    split: { dim: 'vettore', shares: [0.15, 0.85] },
    fields: [
      { id: 'ricavi', kind: 'seasonal', jitter: [0.9, 1.11] },
      /* costi = ricavi x (1 - margine): il margine e l'ancora, il costo ne discende. Con un
         margine negativo il costo supera il ricavo, che e esattamente il leakage. */
      { id: 'costi', kind: 'share', of: 'ricavi', attr: 'margine', complement: true, jitter: [0.97, 1.05] },
      { id: 'profitto', kind: 'combine', plus: ['ricavi'], minus: ['costi'] },
      /* spedizioni = costi / costo per spedizione: mai una conta scelta a mano */
      { id: 'spedizioni', kind: 'divide', of: 'costi', attr: 'costoSped', jitter: [0.92, 1.09], min: 1 }
    ]
  }
};

const M = (id, label, extra) => Object.assign({ id, label }, extra);

const spec = {
  meta: {
    title: 'Trasporti Bassani — redditivita per rotta',
    subtitle: 'Quali rotte guadagnano e quali no · {y}',
    locale: 'it-IT', currency: '€',
    months: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'],
    updated: 'aggiornato il 2 set 2026',
    watermark: 'Mockup dimostrativo · dati sintetici'
  },
  aesthetic: 'corporate-sober',
  skin: { shell: 'rail-slim', palette: 'dark-tecnico', tipografia: 'grottesco', densita: 'medio' },
  archetype: 'quadrants',
  grid: { contentWidth: 1116, gutter: 12, columns: 4 },
  model: {
    sums: ['ricavi', 'costi', 'profitto', 'spedizioni'],
    measures: [
      M('ricavi', 'Ricavi', { agg: 'sum', field: 'ricavi', unit: 'money', format: 'eur' }),
      M('costi', 'Costi', { agg: 'sum', field: 'costi', unit: 'money', format: 'eur', inv: true }),
      M('profitto', 'Profitto', { agg: 'sum', field: 'profitto', unit: 'money', format: 'eur' }),
      M('spedizioni', 'Spedizioni', { agg: 'sum', field: 'spedizioni', unit: 'count', format: 'N' }),
      M('margine', 'Margine %', { agg: 'ratio', num: 'profitto', den: 'ricavi', unit: 'pct', format: 'pc' }),
      M('costoSped', 'Costo per spedizione', { agg: 'ratio', num: 'costi', den: 'spedizioni', unit: 'money', format: 'eurF', inv: true }),
      M('ricavoSped', 'Ricavo per spedizione', { agg: 'ratio', num: 'ricavi', den: 'spedizioni', unit: 'money', format: 'eurF' })
    ]
  },
  filters: {
    date: { levels: ['year', 'quarter', 'month'], default: { y: 2025, q: null, m: null } },
    dims: [
      { id: 'rotta', label: 'Rotta', control: 'dropdown', allLabel: 'Tutte', pill: 'Rotta' },
      { id: 'vettore', label: 'Vettore', control: 'dropdown', allLabel: 'Tutti', pill: 'Vettore' }
    ]
  },
  kpiBand: [
    { id: 'ricavi', label: 'Ricavi', measure: 'ricavi', span: 1 },
    { id: 'profitto', label: 'Profitto', measure: 'profitto', span: 1 },
    { id: 'margine', label: 'Margine %', measure: 'margine', span: 1 },
    { id: 'costoSped', label: 'Costo per spedizione', measure: 'costoSped', span: 1, inv: true }
  ],
  pages: [{
    id: 'main',
    title: 'Redditivita per rotta',
    nav: 'Rotte',
    subtitle: 'Due rotte su otto lavorano in perdita: il totale non le mostra',
    rows: [
      { visuals: [
        /* L'APERTURA dell'archetipo a quadranti: le mediane dividono le rotte in quattro
           gruppi, e quelle sotto la linea orizzontale sono quelle che il socio deve vedere. */
        { type: 'scatter', span: 3, h: 176, title: 'Margine % contro ricavi, per rotta — {period}',
          subtitle: 'sotto la mediana orizzontale si lavora sotto la media; sotto lo zero si perde',
          bind: { dim: 'rotta', x: 'ricavi', y: 'margine', size: 'spedizioni' } },
        { type: 'delta-card', span: 1, h: 176, title: 'Profitto', bind: { measure: 'profitto' } }
      ] },
      /* LA CHIUSURA: la tabella leakage, firma della nicchia — margine in rosso dove si perde. */
      { flex: true, visuals: [{
        type: 'matrix', span: 4, title: 'Rotte — ricavi, profitto e costo per spedizione · {period}',
        bind: {
          dim: 'rotta', label: 'Rotta', sort: 'profitto', drill: true, totalsLabel: 'Totale azienda',
          columns: [
            { measure: 'ricavi', label: 'Ricavi' },
            { measure: 'spedizioni', label: 'Spedizioni' },
            { measure: 'profitto', label: 'Profitto' },
            { measure: 'margine', label: 'Margine %', kind: 'heat', scale: [-0.05, 0.2] },
            { measure: 'costoSped', label: 'Costo/sped.', kind: 'heat', scale: [6, 17], inv: true },
            { measure: 'ricavoSped', label: 'Ricavo/sped.' }
          ]
        }
      }] }
    ]
  }],
  drill: {
    dim: 'rotta',
    page: {
      id: '__drill__',
      title: '{drill}',
      drillHeader: 'Dettaglio della rotta — {period}',
      backLabel: 'Torna alle rotte',
      rows: [
        { visuals: [
          { type: 'colline', span: 2, h: 190, title: 'Ricavi per mese, col margine come linea',
            bind: { measure: 'ricavi', line: 'margine' } },
          { type: 'donut', span: 2, h: 190, title: 'Costi: flotta propria contro carrier',
            subtitle: 'due categorie, il totale al centro', centreLabel: 'Costi',
            bind: { dim: 'vettore', measure: 'costi', alert: 'carrier' } }
        ] }
      ]
    }
  }
};

module.exports = {
  spec, dataParams, build: () => builder.build(dataParams),
  name: 'Ciclo locale 1 — trasporti (quali rotte perdono)'
};
