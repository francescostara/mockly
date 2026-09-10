/* BANCO DI PROVA — la CONCENTRAZIONE come storia negativa, coi due donut che la dicono.
 *
 * Studio di consulenza. Il fatturato cresce, i margini tengono, e nessun totale mostra il
 * problema: TRE clienti su nove fanno il 69% del fatturato. Non e una statistica, e una
 * dipendenza — se il primo non rinnova, l'anno prossimo manca un terzo dello studio. E' il
 * gancio di pre-vendita piu forte che un mockup possa avere, e si vede solo se qualcuno lo
 * disegna: nella matrice per cliente si legge riga per riga e non colpisce nessuno.
 *
 * I DUE CASI del donut, affiancati di proposito:
 *   - TOP-N + coda: i primi tre piu "Altri", col centro sulla QUOTA (69%) invece che sul
 *     totale. E' la forma della concentrazione.
 *   - DUE CATEGORIE: ricorrente contro progetti, col centro sul totale. E' la forma piu
 *     forte quando la domanda e "quanto di questo e solido".
 *
 * ANCORE (niches.md, voce vendite B2B e finanziario):
 *   valore medio contratto   coerente col segmento, decine di migliaia di euro
 *   margine lordo            45 - 55% per i servizi professionali
 *   giorni di incasso (DSO)  30 - 90 giorni, mai zero
 */
'use strict';
const builder = require('../../data-builder.js');

/* Nove clienti: tre grossi e una coda di sei. La coda serve — senza, il donut con "Altri" non
   avrebbe niente da aggregare e la concentrazione non si vedrebbe. Nove e anche il massimo che
   la tabella di chiusura regge in 720px con una riga di grafici sopra: il motore lo rifiuta
   invece di tagliarla, e dodici clienti sforavano di cinquantadue pixel.
   Le basi sono scelte perche i primi tre facciano circa il 68% — l'ancora della storia. */
const CL = [
  ['acme', 'Acme Manifattura', '#12304F', 980000, 0.14, 0.44],
  ['borgo', 'Gruppo Borgo', '#1F4E79', 720000, 0.09, 0.47],
  ['delta', 'Delta Energia', '#4A7FA8', 560000, 0.21, 0.41],
  ['nova', 'Nova Retail', '#7FA8C6', 273000, 0.05, 0.52],
  ['pico', 'Pico Software', '#8FB3CC', 218000, 0.32, 0.58],
  ['rossi', 'Rossi & Figli', '#A8926E', 185000, -0.04, 0.49],
  ['tirreno', 'Tirreno Log', '#C6D7E4', 153000, 0.07, 0.45],
  ['vela', 'Vela Assicura', '#B5CBDD', 125000, 0.12, 0.53],
  ['mistral', 'Mistral Food', '#A4BFD6', 109000, -0.11, 0.42]
];

const dataParams = {
  seed: 80413,
  years: [2024, 2025],
  seasonality: [0.92, 0.98, 1.08, 1.06, 1.10, 1.04, 0.88, 0.46, 1.10, 1.16, 1.12, 1.10],
  dims: {
    cliente: {
      members: CL.map(([id, n, c, base, growth, gm]) => ({
        id, n, c, base, growth, attrs: { gm, dso: 62, tariffa: 118 }
      }))
    },
    natura: {
      members: [
        { id: 'ric', n: 'Ricorrente', c: '#1F4E79', base: 1, attrs: {} },
        { id: 'prog', n: 'Progetti', c: '#A8926E', base: 1, attrs: {} }
      ]
    }
  },
  facts: {
    dim: 'cliente',
    /* la seconda dimensione e la solidita del fatturato: ricorrente contro progetti una tantum */
    split: { dim: 'natura', shares: [0.38, 0.62] },
    fields: [
      { id: 'fatturato', kind: 'seasonal', jitter: [0.92, 1.09] },
      { id: 'costoDiretto', kind: 'share', of: 'fatturato', attr: 'gm', complement: true, jitter: [0.97, 1.04] },
      { id: 'margine', kind: 'combine', plus: ['fatturato'], minus: ['costoDiretto'] },
      { id: 'ore', kind: 'divide', of: 'fatturato', attr: 'tariffa', jitter: [0.93, 1.08], min: 1 },
      { id: 'crediti', kind: 'share', of: 'fatturato', attr: 'dsoQuota', jitter: [0.9, 1.12] }
    ]
  }
};
/* crediti = fatturato / 365 x DSO: l'ancora e il DSO, la conta ne discende */
dataParams.dims.cliente.members.forEach(m => { m.attrs.dsoQuota = m.attrs.dso / 365; });

const M = (id, label, extra) => Object.assign({ id, label }, extra);

const spec = {
  meta: {
    title: 'Studio Vianello — portafoglio clienti',
    subtitle: 'Il fatturato cresce, e dipende da tre nomi · {y}',
    locale: 'it-IT', currency: '€',
    months: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'],
    updated: 'aggiornato il 2 set 2026',
    watermark: 'Mockup dimostrativo · dati sintetici · banco di prova'
  },
  aesthetic: 'corporate-sober',
  skin: { palette: 'slate-freddo', tipografia: 'serif-display', densita: 'medio' },
  archetype: 'scorecard',
  grid: { contentWidth: 1044, gutter: 12, columns: 4 },
  model: {
    sums: ['fatturato', 'costoDiretto', 'margine', 'ore', 'crediti'],
    measures: [
      M('fatturato', 'Fatturato', { agg: 'sum', field: 'fatturato', unit: 'money', format: 'eur' }),
      M('costoDiretto', 'Costi diretti', { agg: 'sum', field: 'costoDiretto', unit: 'money', format: 'eur' }),
      M('margine', 'Margine lordo', { agg: 'sum', field: 'margine', unit: 'money', format: 'eur' }),
      M('ore', 'Ore fatturate', { agg: 'sum', field: 'ore', unit: 'count', format: 'N' }),
      M('crediti', 'Crediti', { agg: 'sum', field: 'crediti', unit: 'money', format: 'eur', inv: true }),
      M('gm', 'Margine lordo %', { agg: 'ratio', num: 'margine', den: 'fatturato', unit: 'pct', format: 'pc' }),
      M('tariffa', 'Tariffa oraria', { agg: 'ratio', num: 'fatturato', den: 'ore', unit: 'money', format: 'eurF' })
    ]
  },
  filters: {
    date: { levels: ['year', 'quarter', 'month'], default: { y: 2025, q: null, m: null } },
    dims: [
      { id: 'cliente', label: 'Cliente', control: 'dropdown', allLabel: 'Tutti', pill: 'Cliente' },
      { id: 'natura', label: 'Natura', control: 'list', allLabel: 'Tutte', pill: 'Natura' }
    ]
  },
  kpiBand: [
    { id: 'fatturato', label: 'Fatturato', measure: 'fatturato', span: 1 },
    { id: 'margine', label: 'Margine lordo', measure: 'margine', span: 1 },
    { id: 'gm', label: 'Margine lordo %', measure: 'gm', span: 1 },
    { id: 'tariffa', label: 'Tariffa oraria', measure: 'tariffa', span: 1 }
  ],
  pages: [{
    id: 'main',
    title: 'Portafoglio',
    nav: 'Portafoglio',
    subtitle: 'Tre clienti su nove fanno due terzi del fatturato: e crescita, ed e dipendenza',
    rows: [
      { visuals: [
        { type: 'trend', span: 2, h: 150, title: 'Fatturato mensile — {y} vs {py}',
          legend: [{ l: '{y}', c: 'var(--c2)' }, { l: '{py}', dash: true }],
          bind: { measure: 'fatturato' } },
        /* IL DONUT DELLA CONCENTRAZIONE: i primi tre piu la coda, e al centro la QUOTA. */
        { type: 'donut', span: 2, h: 150, title: 'Quanto pesano i primi tre clienti',
          subtitle: 'gli altri sei insieme fanno meno di loro', centreLabel: 'dai primi 3',
          bind: { dim: 'cliente', measure: 'fatturato', topN: 3, centre: 'share' } }
      ] },
      /* La chiusura resta la tabella: e uno scorecard, e la sua faccia e quella. La seconda
         pagina non e un ripiego di spazio — porta la domanda successiva, "quanto di questo
         fatturato torna da solo l'anno prossimo". */
      { flex: true, visuals: [{
        type: 'matrix', span: 4, title: 'Clienti — fatturato, margine e crediti · {period}',
        bind: {
          dim: 'cliente', label: 'Cliente', sort: 'fatturato', drill: false, totalsLabel: 'Totale studio',
          columns: [
            { measure: 'fatturato', label: 'Fatturato' },
            { measure: 'fatturato', label: '{basis}', kind: 'var' },
            { measure: 'gm', label: 'Margine %', kind: 'heat', scale: [0.4, 0.6] },
            { measure: 'tariffa', label: 'Tariffa' },
            { measure: 'crediti', label: 'Crediti' }
          ]
        }
      }] }
    ]
  }, {
    id: 'natura',
    title: 'Solidita del fatturato',
    nav: 'Solidita',
    subtitle: 'Quanto del fatturato torna anche l\'anno prossimo, e chi lo porta',
    rows: [
      { visuals: [
        /* IL DONUT A DUE CATEGORIE: la forma piu forte del donut. Rosso sui progetti, che
           sono la parte che non torna da sola — la regola del rosso vale anche qui. */
        { type: 'donut', span: 2, h: 190, title: 'Ricorrente contro progetti',
          subtitle: 'due categorie, il totale al centro', centreLabel: 'Fatturato',
          bind: { dim: 'natura', measure: 'fatturato', alert: 'prog' } },
        { type: 'hbar', span: 2, h: 190, title: 'Margine per cliente — {period}',
          bind: { dim: 'cliente', measure: 'margine' } }
      ] },
      { flex: true, visuals: [{
        type: 'matrix', span: 4, title: 'Natura del fatturato — {period}',
        bind: {
          dim: 'natura', label: 'Natura', sort: 'fatturato', drill: false, totalsLabel: 'Totale studio',
          columns: [
            { measure: 'fatturato', label: 'Fatturato' },
            { measure: 'fatturato', label: '{basis}', kind: 'var' },
            { measure: 'margine', label: 'Margine' },
            { measure: 'gm', label: 'Margine %', kind: 'heat', scale: [0.4, 0.6] },
            { measure: 'ore', label: 'Ore' }
          ]
        }
      }] }
    ]
  }]
};

module.exports = { spec, build: () => builder.build(dataParams), dataParams, name: 'Donut — la concentrazione (tre clienti, due terzi)' };
