/* BANCO DI PROVA — ribbon con un sorpasso costruito apposta.
 *
 * Scritto a mano, nessun modello, nessun credito. Serve a due cose:
 *   1. avere sempre qualcosa da aprire e cliccare mentre i visual nuovi vengono costruiti;
 *   2. dare al test del sorpasso un caso in cui la risposta giusta e nota in partenza.
 *
 * Il criterio: se due entita si scambiano di posizione fra due periodi, i loro nastri DEVONO
 * incrociarsi. Se non si incrociano mai, il visual sta impilando per valore ed e un area chart
 * travestito. Qui "Nord" parte davanti e finisce dietro a "Sud": il sorpasso e nel dato.
 */
'use strict';
const builder = require('../../data-builder.js');

const dataParams = {
  seed: 8123,
  /* CINQUE ANNI DI STORIA, non due: e la richiesta arrivata in revisione ("un date range piu
     lungo applicato dinamicamente"). Gli ultimi tre restano mensili, i due piu vecchi arrivano
     gia sommati per anno — il selettore "Quanti anni" li rende guardabili, il file resta leggero.
     Vedi engine/data-builder.js, passo 4.5. */
  years: [2021, 2022, 2023, 2024, 2025],
  /* piatta di proposito: il sorpasso deve venire dalla crescita delle aree, non dalla stagione */
  seasonality: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  dims: {
    area: {
      members: [
        /* Nord parte alto e scende, Sud parte basso e sale: si incrociano dentro l'anno */
        /* la stagionalita PER MEMBRO e cio che rende possibile il sorpasso dentro l'anno:
           la crescita agisce fra gli anni, quindi da sola lascia i ranghi immobili */
        /* La crescita e ANNUA e si compone: con cinque anni di storia i vecchi -18% e +34%
           portavano il Sud tanto avanti che nel 2025 il sorpasso era gia avvenuto a gennaio, e
           il ribbon tornava a essere un area chart. I tassi qui sotto sono gli stessi di prima
           presi alla radice quarta: l'anno corrente arriva agli stessi livelli, e la storia
           dietro e una salita lenta invece di un salto. */
        { id: 'nord', n: 'Nord', c: '#12304F', base: 52000, growth: -0.049, attrs: { deal: 4200 },
          seasonality: [1.45, 1.40, 1.32, 1.18, 1.05, 0.95, 0.86, 0.80, 0.74, 0.70, 0.65, 0.62] },
        { id: 'sud', n: 'Sud', c: '#A8926E', base: 46000, growth: 0.076, attrs: { deal: 3100 },
          seasonality: [0.58, 0.64, 0.72, 0.84, 0.96, 1.06, 1.16, 1.24, 1.32, 1.40, 1.48, 1.56] },
        { id: 'centro', n: 'Centro', c: '#4A7FA8', base: 44000, growth: 0.012, attrs: { deal: 3800 } },
        { id: 'isole', n: 'Isole', c: '#7FA8C6', base: 19000, growth: 0.029, attrs: { deal: 2600 } }
      ]
    }
  },
  facts: {
    dim: 'area',
    fields: [
      { id: 'rev', kind: 'seasonal' },
      { id: 'deals', kind: 'divide', of: 'rev', attr: 'deal', jitter: [0.9, 1.1], min: 1 }
    ]
  }
};

const spec = {
  meta: {
    title: 'Banco — sorpasso fra aree',
    subtitle: 'Il ribbon deve far vedere lo scambio di posizione, non solo la crescita',
    locale: 'it-IT', currency: '€',
    months: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'],
    updated: 'aggiornato il 2 set 2026',
    watermark: 'Mockup dimostrativo · dati sintetici · banco di prova'
  },
  aesthetic: 'corporate-sober',
  archetype: 'scorecard',
  grid: { contentWidth: 1044, gutter: 12, columns: 3 },
  model: {
    sums: ['rev', 'deals'],
    measures: [
      { id: 'rev', label: 'Fatturato', agg: 'sum', field: 'rev', unit: 'money', format: 'eur' },
      { id: 'deals', label: 'Trattative', agg: 'sum', field: 'deals', unit: 'count', format: 'N' },
      { id: 'aov', label: 'Valore medio', agg: 'ratio', num: 'rev', den: 'deals', unit: 'money', format: 'eurF' }
    ]
  },
  filters: {
    date: { levels: ['year', 'quarter', 'month'], default: { y: 2025, q: null, m: null } },
    dims: [{ id: 'area', label: 'Area', control: 'list', allLabel: 'Tutte', pill: 'Area' }]
  },
  kpiBand: [
    { id: 'rev', label: 'Fatturato', measure: 'rev', span: 1 },
    { id: 'deals', label: 'Trattative', measure: 'deals', span: 1 },
    { id: 'aov', label: 'Valore medio', measure: 'aov', span: 1 }
  ],
  pages: [{
    id: 'main',
    title: 'Sorpasso fra aree',
    subtitle: 'Nord parte davanti e finisce dietro: i nastri devono incrociarsi',
    rows: [
      { visuals: [{ type: 'ribbon', span: 3, h: 190, title: 'Evoluzione del ranking — {y}', bind: { dim: 'area', measure: 'rev', by: 'q' } }] },
      { flex: true, visuals: [{
        type: 'matrix', span: 3, title: 'Dettaglio per area',
        bind: {
          dim: 'area', label: 'Area', sort: 'rev', totalsLabel: 'Totale',
          columns: [
            { measure: 'rev', label: 'Fatturato' },
            { measure: 'rev', label: '{basis}', kind: 'var' },
            { measure: 'deals', label: 'Trattative' },
            { measure: 'rev', label: 'Quota', kind: 'share' }
          ]
        }
      }] }
    ]
  }]
};

module.exports = { spec, build: () => builder.build(dataParams), dataParams, name: 'Ribbon — sorpasso' };
