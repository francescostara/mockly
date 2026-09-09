/* ARCHETIPO 4 — SEGMENTAZIONE A QUADRANTI. Manifattura, tensione ricavo-vs-margine.
 *
 * DOMANDA: "chi o cosa rende davvero?" — che non e "chi fattura di piu", ed e tutta la
 * differenza. Il cliente piu grande e spesso quello che compra meglio.
 * APERTURA: lo scatter con le MEDIANE, grande. Meta pagina, non un riquadro: e li che si
 *           vede il quadrante in basso a destra — alto ricavo, basso margine — che e la
 *           storia firma dell'autore.
 * CHIUSURA: la matrice per cliente ordinata per margine, con la formattazione condizionale.
 *
 * ANCORE (niches.md, voce energia / manifattura):
 *   gross margin %        45 – 55%                 -> COGS = ricavi x (1 - GM%)
 *   prezzo medio unita    10 – 1000 € secondo il prodotto -> unita = ricavi / prezzo
 *   utilization impianti  65 – 90%
 *
 * STORIA NEGATIVA: il cliente piu grande sta sotto la mediana del margine. Nessun totale lo
 * mostra — nel fatturato e il migliore. Lo scatter lo mette da solo nel quadrante sbagliato.
 */
'use strict';
const builder = require('../data-builder.js');

const dataParams = {
  seed: 61205,
  years: [2024, 2025],
  seasonality: [0.96, 1.02, 1.08, 1.06, 1.10, 1.04, 0.92, 0.52, 1.08, 1.14, 1.10, 0.98],
  dims: {
    cliente: {
      members: [
        /* il piu grande e il peggiore per margine: e il quadrante in basso a destra */
        { id: 'vf', n: 'ValFrigo', c: '#12304F', base: 410000, growth: 0.18, attrs: { gm: 0.36, prezzo: 320 } },
        { id: 'mt', n: 'Meccanica Turati', c: '#1F4E79', base: 268000, growth: 0.07, attrs: { gm: 0.47, prezzo: 285 } },
        { id: 'ic', n: 'Idro Costruzioni', c: '#4A7FA8', base: 196000, growth: 0.11, attrs: { gm: 0.52, prezzo: 410 } },
        { id: 'ne', n: 'Nord Energia', c: '#7FA8C6', base: 152000, growth: 0.24, attrs: { gm: 0.55, prezzo: 620 } },
        { id: 'sg', n: 'SudGas', c: '#8FB3CC', base: 118000, growth: -0.09, attrs: { gm: 0.41, prezzo: 240 } },
        { id: 'ap', n: 'Alpi Pompe', c: '#C6D7E4', base: 86000, growth: 0.05, attrs: { gm: 0.58, prezzo: 780 } }
      ]
    },
    linea: {
      members: [
        { id: 'std', n: 'Standard', c: '#1F4E79', base: 1, attrs: {} },
        { id: 'cust', n: 'Su misura', c: '#4A7FA8', base: 1, attrs: {} },
        { id: 'serv', n: 'Ricambi e servizi', c: '#A8926E', base: 1, attrs: {} }
      ]
    }
  },
  facts: {
    dim: 'cliente',
    split: { dim: 'linea', shares: [0.48, 0.31, 0.21] },
    fields: [
      { id: 'ricavi', kind: 'seasonal', jitter: [0.93, 1.07] },
      /* COGS = ricavi x (1 - GM%): il complemento, cosi il margine e l'ancora e non un residuo.
         growthFactor agisce sul TASSO dichiarato, cioe sul GM: 0.97 lo abbassa di tre punti
         percentuali relativi nell'anno corrente, ed e l'erosione. Con 1.03 — il primo tentativo
         — il margine SALIVA, e la delta-card lo diceva in verde mentre il commento accanto
         parlava di erosione: il testo raccontava una storia e i numeri un'altra. */
      { id: 'cogs', kind: 'share', of: 'ricavi', attr: 'gm', complement: true, jitter: [0.97, 1.04], growthFactor: 0.97 },
      { id: 'margine', kind: 'combine', plus: ['ricavi'], minus: ['cogs'] },
      { id: 'unita', kind: 'divide', of: 'ricavi', attr: 'prezzo', jitter: [0.9, 1.1], min: 1 }
    ]
  }
};

const M = (id, label, extra) => Object.assign({ id, label }, extra);

const spec = {
  meta: {
    title: 'Clienti — ricavo contro margine',
    subtitle: 'Chi fattura non e sempre chi rende · {y}',
    locale: 'it-IT', currency: '€',
    months: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'],
    updated: 'aggiornato il 2 set 2026',
    watermark: 'Mockup dimostrativo · dati sintetici'
  },
  aesthetic: 'corporate-sober',
  archetype: 'quadrants',
  grid: { contentWidth: 1044, gutter: 12, columns: 4 },
  model: {
    sums: ['ricavi', 'cogs', 'margine', 'unita'],
    measures: [
      M('ricavi', 'Ricavi', { agg: 'sum', field: 'ricavi', unit: 'money', format: 'eur' }),
      M('cogs', 'Costo del venduto', { agg: 'sum', field: 'cogs', unit: 'money', format: 'eur' }),
      M('margine', 'Margine lordo', { agg: 'sum', field: 'margine', unit: 'money', format: 'eur' }),
      M('unita', 'Unita vendute', { agg: 'sum', field: 'unita', unit: 'count', format: 'N' }),
      M('gm', 'Margine lordo %', { agg: 'ratio', num: 'margine', den: 'ricavi', unit: 'pct', format: 'pc' }),
      M('prezzo', 'Prezzo medio', { agg: 'ratio', num: 'ricavi', den: 'unita', unit: 'money', format: 'eurF' })
    ]
  },
  filters: {
    date: { levels: ['year', 'quarter', 'month'], default: { y: 2025, q: null, m: null } },
    dims: [
      { id: 'cliente', label: 'Cliente', control: 'dropdown', allLabel: 'Tutti', pill: 'Cliente' },
      { id: 'linea', label: 'Linea', control: 'list', allLabel: 'Tutte', pill: 'Linea' }
    ]
  },
  kpiBand: [
    { id: 'ricavi', label: 'Ricavi', measure: 'ricavi', span: 1 },
    { id: 'margine', label: 'Margine lordo', measure: 'margine', span: 1 },
    { id: 'gm', label: 'Margine lordo %', measure: 'gm', span: 1 },
    { id: 'prezzo', label: 'Prezzo medio', measure: 'prezzo', span: 1 }
  ],
  pages: [{
    id: 'main',
    title: 'Segmentazione clienti',
    nav: 'Segmentazione',
    subtitle: 'Il cliente piu grande sta sotto la mediana del margine: in basso a destra',
    rows: [
      { visuals: [
        /* L'APERTURA. Le due linee tratteggiate sono le mediane: dividono i clienti in quattro
           quadranti, e quello in basso a destra — tanto ricavo, poco margine — e la domanda. */
        { type: 'scatter', span: 3, h: 224, title: 'Margine % contro ricavo, per cliente — {period}',
          subtitle: 'le tratteggiate sono le mediane; la dimensione della bolla e il margine in euro',
          bind: { dim: 'cliente', x: 'ricavi', y: 'gm', size: 'margine' } },
        { type: 'delta-card', span: 1, h: 224, title: 'Margine lordo %', bind: { measure: 'gm' } }
      ] },
      /* LA CHIUSURA. L'archetipo a quadranti puo chiudere con la heatmap invece che con la
         tabella, e qui e la scelta giusta: la matrice sopra dice CHI, la heatmap dice QUANDO —
         in quale trimestre il margine di ciascun cliente si e mosso. Chiudere anche questo
         report con una tabella a piena larghezza sarebbe la terza chiusura identica su quattro
         esempi, ed e esattamente il conto che il gate anti-generico tiene. */
      { visuals: [
        { type: 'heatmap', span: 4, h: 152, title: 'Margine % per cliente e trimestre',
          subtitle: 'piu chiaro = margine piu basso; clicca una cella per filtrare il cliente',
          bind: { dim: 'cliente', measure: 'gm', by: 'q', scale: [0.3, 0.6] } }
      ] }
    ]
  }, {
    /* Il dettaglio per entita non sparisce: cambia posto. Tre righe di contenuto piu una
       tabella di sei clienti non stanno in 720px — il motore lo rifiuta invece di lasciarla
       tagliata — e la seconda pagina e proprio la via d'uscita che l'errore suggerisce. */
    id: 'clienti',
    title: 'Dettaglio clienti',
    nav: 'Clienti',
    subtitle: 'Ordinati per margine, con la formattazione condizionale sul GM%',
    rows: [
      { flex: true, visuals: [{
        type: 'matrix', span: 4, title: 'Clienti — ricavo, margine e prezzo medio · {period}',
        bind: {
          dim: 'cliente', label: 'Cliente', sort: 'margine', drill: true, totalsLabel: 'Totale portafoglio',
          columns: [
            { measure: 'ricavi', label: 'Ricavi' },
            { measure: 'ricavi', label: '{basis}', kind: 'var' },
            { measure: 'margine', label: 'Margine' },
            { measure: 'gm', label: 'Margine %', kind: 'heat', scale: [0.32, 0.6] },
            { measure: 'prezzo', label: 'Prezzo medio' }
          ]
        }
      }] },
    ]
  }],
  drill: {
    dim: 'cliente',
    page: {
      id: '__drill__',
      title: '{drill}',
      drillHeader: 'Dettaglio del cliente — {period}',
      backLabel: 'Torna alla segmentazione',
      rows: [
        { visuals: [
          { type: 'colline', span: 2, h: 190, title: 'Ricavi per mese, con il margine % come linea',
            bind: { measure: 'ricavi', line: 'gm' } },
          { type: 'hbar', span: 2, h: 190, title: 'Margine per linea di prodotto',
            bind: { dim: 'linea', measure: 'margine' } }
        ] }
      ]
    }
  }
};

module.exports = {
  spec, dataParams, build: () => builder.build(dataParams),
  name: 'Archetipo 4 — quadranti (ricavo contro margine)'
};
