/* BANCO DI PROVA — heatmap fascia oraria x giorno, archetipo operativo.
 *
 * E' il caso che la `matrix` non poteva esprimere: le sue colonne sono MISURE, quindi non c'e
 * modo di ruotare una seconda dimensione. Fascia x giorno, cliente x SKU e coorte x mese
 * dall'ingresso sono la stessa forma, e nessuna era scrivibile.
 *
 * Il ripiego tentante era dichiarare sette campi lun...dom. Funziona a schermo e congela la
 * seconda dimensione dentro i campi: niente filtro, niente cross-filter, niente drill. Sarebbe
 * il filtro decorativo che il motore esiste per rendere impossibile.
 *
 * ANCORE (niches.md, voce ristorazione):
 *   prime cost   55 – 65% dei ricavi     -> food + lavoro = ricavi x prime cost
 *   food cost    25 – 32%
 *   scontrino    12 – 45 € a coperto     -> coperti = ricavi / scontrino
 *
 * LA STORIA NEGATIVA: il pranzo infrasettimanale non copre i costi fissi — la heatmap lo mostra
 * come una banda fredda che attraversa tutta la settimana, che nessun totale lascerebbe vedere.
 */
'use strict';
const builder = require('../../data-builder.js');

/* Il servizio vero di un ristorante: cena forte, pranzo debole, weekend pieno. La stagionalita
   per membro e cio che rende la heatmap una mappa e non un muro di un colore solo. */
const PRANZO = [0.62, 0.60, 0.66, 0.70, 0.74, 0.68, 0.58, 0.42, 0.72, 0.76, 0.70, 0.64];
const CENA = [1.24, 1.22, 1.30, 1.34, 1.40, 1.32, 1.18, 0.86, 1.36, 1.42, 1.38, 1.46];

const dataParams = {
  seed: 51908,
  years: [2024, 2025],
  seasonality: [0.92, 0.90, 1.02, 1.06, 1.14, 1.08, 0.96, 0.64, 1.04, 1.10, 1.06, 1.28],
  dims: {
    fascia: {
      members: [
        { id: 'pranzo', n: 'Pranzo 12–15', c: '#7FA8C6', base: 21000, growth: -0.11,
          seasonality: PRANZO, attrs: { scontrino: 17, prime: 0.64, food: 0.31 } },
        { id: 'aperi', n: 'Aperitivo 18–20', c: '#A8926E', base: 15000, growth: 0.22,
          attrs: { scontrino: 13, prime: 0.55, food: 0.26 } },
        { id: 'cena', n: 'Cena 20–23', c: '#12304F', base: 46000, growth: 0.09,
          seasonality: CENA, attrs: { scontrino: 38, prime: 0.58, food: 0.28 } }
      ]
    },
    giorno: {
      members: [
        { id: 'lun', n: 'Lun', c: '#C6D7E4', base: 1, attrs: {} },
        { id: 'mar', n: 'Mar', c: '#B5CBDD', base: 1, attrs: {} },
        { id: 'mer', n: 'Mer', c: '#A4BFD6', base: 1, attrs: {} },
        { id: 'gio', n: 'Gio', c: '#8FB3CC', base: 1, attrs: {} },
        { id: 'ven', n: 'Ven', c: '#4A7FA8', base: 1, attrs: {} },
        { id: 'sab', n: 'Sab', c: '#1F4E79', base: 1, attrs: {} },
        { id: 'dom', n: 'Dom', c: '#12304F', base: 1, attrs: {} }
      ]
    }
  },
  facts: {
    dim: 'fascia',
    /* il giorno e una dimensione VERA, non sette campi: si filtra, fa cross-filter, entra nel
       tooltip. E' esattamente cio che il ripiego dei sette campi avrebbe impedito. */
    split: { dim: 'giorno', shares: [0.10, 0.10, 0.11, 0.14, 0.19, 0.22, 0.14] },
    fields: [
      { id: 'ricavi', kind: 'seasonal', jitter: [0.92, 1.08] },
      { id: 'coperti', kind: 'divide', of: 'ricavi', attr: 'scontrino', jitter: [0.9, 1.1], min: 1 },
      { id: 'primeCost', kind: 'share', of: 'ricavi', attr: 'prime', jitter: [0.97, 1.04] },
      { id: 'foodCost', kind: 'share', of: 'ricavi', attr: 'food', jitter: [0.95, 1.06] }
    ]
  }
};

const M = (id, label, extra) => Object.assign({ id, label }, extra);

const spec = {
  meta: {
    title: 'Ristorante — servizio per fascia e giorno',
    subtitle: 'Dove il locale rende e dove tiene aperto per niente · {y}',
    locale: 'it-IT', currency: '€',
    months: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'],
    updated: 'aggiornato il 2 set 2026',
    watermark: 'Mockup dimostrativo · dati sintetici · banco di prova'
  },
  aesthetic: 'corporate-sober',
  archetype: 'operational',
  grid: { contentWidth: 1044, gutter: 12, columns: 4 },
  model: {
    sums: ['ricavi', 'coperti', 'primeCost', 'foodCost'],
    measures: [
      M('ricavi', 'Ricavi', { agg: 'sum', field: 'ricavi', unit: 'money', format: 'eur' }),
      M('coperti', 'Coperti', { agg: 'sum', field: 'coperti', unit: 'count', format: 'N' }),
      M('primeCost', 'Prime cost', { agg: 'sum', field: 'primeCost', unit: 'money', format: 'eur' }),
      M('foodCost', 'Food cost', { agg: 'sum', field: 'foodCost', unit: 'money', format: 'eur' }),
      M('scontrino', 'Scontrino medio', { agg: 'ratio', num: 'ricavi', den: 'coperti', unit: 'money', format: 'eurF' }),
      M('primePc', 'Prime cost %', { agg: 'ratio', num: 'primeCost', den: 'ricavi', unit: 'pct', format: 'pc', inv: true }),
      M('foodPc', 'Food cost %', { agg: 'ratio', num: 'foodCost', den: 'ricavi', unit: 'pct', format: 'pc', inv: true })
    ]
  },
  filters: {
    date: { levels: ['year', 'quarter', 'month'], default: { y: 2025, q: null, m: null } },
    dims: [
      { id: 'fascia', label: 'Fascia', control: 'list', allLabel: 'Tutte', pill: 'Fascia' },
      { id: 'giorno', label: 'Giorno', control: 'dropdown', allLabel: 'Tutti', pill: 'Giorno' }
    ]
  },
  kpiBand: [
    { id: 'ricavi', label: 'Ricavi', measure: 'ricavi', span: 1 },
    { id: 'coperti', label: 'Coperti', measure: 'coperti', span: 1 },
    { id: 'scontrino', label: 'Scontrino medio', measure: 'scontrino', span: 1 },
    { id: 'primePc', label: 'Prime cost %', measure: 'primePc', span: 1, inv: true }
  ],
  pages: [{
    id: 'main',
    title: 'Servizio per fascia e giorno',
    subtitle: 'La banda fredda del pranzo infrasettimanale non si vede in nessun totale',
    rows: [
      { visuals: [
        { type: 'heatmap', span: 3, h: 138, title: 'Ricavi per fascia e giorno — {y}',
          subtitle: 'piu scuro = piu ricavi; clicca una cella per filtrare la fascia',
          bind: { dim: 'fascia', measure: 'ricavi', by: 'giorno' } },
        { type: 'gauge', span: 1, h: 138, title: 'Prime cost',
          subtitle: 'soglia di sostenibilita 60%',
          bind: { measure: 'primePc', target: 0.60, targetLabel: 'soglia', max: 0.8 } }
      ] },
      /* La seconda riga e cio che rende la pagina OPERATIVA e non una panoramica: dopo aver
         visto DOVE il locale rende, si guarda con quante persone e a che costo. Un archetipo
         operativo con tre riquadri non e denso, e uno scorecard che si e dato un altro nome. */
      { visuals: [
        { type: 'colline', span: 2, h: 118, title: 'Coperti per mese — {y} vs {py}',
          bind: { measure: 'coperti' } },
        { type: 'hbar', span: 2, h: 118, title: 'Food cost % per fascia',
          subtitle: 'la fascia piu debole non e sempre la piu cara',
          bind: { dim: 'fascia', measure: 'foodPc' } }
      ] },
      { flex: true, visuals: [{
        type: 'matrix', span: 4, title: 'Dettaglio per fascia — {period}',
        bind: {
          dim: 'fascia', label: 'Fascia', sort: 'ricavi', drill: false, totalsLabel: 'Totale locale',
          columns: [
            { measure: 'ricavi', label: 'Ricavi' },
            { measure: 'ricavi', label: '{basis}', kind: 'var' },
            { measure: 'coperti', label: 'Coperti' },
            { measure: 'scontrino', label: 'Scontrino' },
            { measure: 'primePc', label: 'Prime cost', kind: 'heat', scale: [0.52, 0.68], inv: true }
          ]
        }
      }] }
    ]
  }]
};

module.exports = { spec, build: () => builder.build(dataParams), dataParams, name: 'Heatmap — fascia x giorno' };
