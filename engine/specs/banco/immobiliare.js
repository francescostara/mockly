/* BANCO DI PROVA — agenzia immobiliare, rete nazionale.
 *
 * Brief: 600 compravendite l'anno, 60 immobili a listino oggi, si vuole vedere l'evoluzione del
 * fatturato e come stanno le provvigioni degli agenti. Scritta a mano, nessun modello.
 *
 * Serve a provare tre cose insieme:
 *   · il ribbon su un caso non costruito apposta per lui;
 *   · le ANCORE DI GRANDEZZA applicate davvero: si fissano i rapporti e le conte si derivano;
 *   · la regola "due domande di forma diversa, due pagine".
 *
 * LE ANCORE, fissate PRIMA di scegliere qualunque conta:
 *   provvigione media per rogito   ~6.000 €      (3% circa su un prezzo medio da ~200.000 €)
 *   prezzo medio immobile          ~200.000 €    (media nazionale, con divari forti per area)
 *   take rate = provvigioni / GMV  2,8 – 3,5%
 *   visite per rogito              20 – 30       (il funnel vero di un'agenzia)
 *   quota dell'agente sulla provvigione  45 – 60%
 * Da qui: rogiti = provvigioni / 6.000, GMV = provvigioni / take rate, visite = rogiti x 25.
 * Nessuna di queste conte e stata scelta: sono tutte derivate.
 *
 * LA STORIA NEGATIVA (firma): il Nord-Ovest, l'area storicamente prima per fatturato, perde
 * terreno mentre il Sud cresce e la sorpassa nel corso dell'anno — e nel frattempo la quota
 * trattenuta dagli agenti sale, quindi il fatturato tiene ma il margine dell'agenzia no.
 */
'use strict';
const builder = require('../../data-builder.js');

/* Le due aree che si sorpassano hanno stagionalita opposte: la crescita agisce fra gli anni,
   quindi senza questo il ranking dentro l'anno resterebbe immobile e il ribbon non direbbe
   niente (vedi data-params.md). */
const CALO = [1.30, 1.28, 1.22, 1.14, 1.06, 0.98, 0.88, 0.72, 0.86, 0.84, 0.80, 0.76];
const CRESCITA = [0.66, 0.70, 0.78, 0.88, 0.98, 1.08, 1.14, 0.82, 1.26, 1.34, 1.42, 1.48];

const dataParams = {
  seed: 60421,
  /* CINQUE ANNI DI STORIA, non due: e la richiesta arrivata in revisione ("un date range piu
     lungo applicato dinamicamente"). Gli ultimi tre restano mensili, i due piu vecchi arrivano
     gia sommati per anno — il selettore "Quanti anni" li rende guardabili, il file resta leggero.
     Vedi engine/data-builder.js, passo 4.5. */
  years: [2021, 2022, 2023, 2024, 2025],
  /* Il grano di questo caso e largo (venticinque combinazioni per mese): con tre anni mensili
     il file passerebbe di un pezzo il tetto. Due bastano — il confronto con l'anno prima resta
     intero, e gli altri tre anni si guardano per anno. */
  dettaglioMesi: 2,
  /* il mercato immobiliare italiano: primavera e autunno forti, agosto fermo, dicembre lento */
  seasonality: [0.88, 0.94, 1.12, 1.18, 1.14, 1.02, 0.90, 0.52, 1.06, 1.22, 1.16, 0.86],
  dims: {
    area: {
      members: [
        { id: 'no', n: 'Nord-Ovest', c: '#12304F', base: 92000, growth: -0.14,
          seasonality: CALO, attrs: { take: 0.030, fee: 7400, visite: 22, split: 0.58 } },
        { id: 'sud', n: 'Sud', c: '#A8926E', base: 58000, growth: 0.31,
          seasonality: CRESCITA, attrs: { take: 0.034, fee: 4600, visite: 29, split: 0.47 } },
        { id: 'ne', n: 'Nord-Est', c: '#4A7FA8', base: 61000, growth: 0.12,
          attrs: { take: 0.031, fee: 6300, visite: 24, split: 0.52 } },
        { id: 'ce', n: 'Centro', c: '#7FA8C6', base: 74000, growth: 0.04,
          attrs: { take: 0.029, fee: 6900, visite: 26, split: 0.55 } },
        { id: 'is', n: 'Isole', c: '#C6D7E4', base: 26000, growth: 0.09,
          attrs: { take: 0.035, fee: 3900, visite: 31, split: 0.45 } }
      ]
    },
    tipo: {
      members: [
        { id: 'app', n: 'Appartamento', c: '#1F4E79', base: 1, attrs: {} },
        { id: 'vil', n: 'Villa singola', c: '#4A7FA8', base: 1, attrs: {} },
        { id: 'att', n: 'Attico', c: '#A8926E', base: 1, attrs: {} },
        { id: 'rus', n: 'Rustico', c: '#8FB3CC', base: 1, attrs: {} },
        { id: 'com', n: 'Commerciale', c: '#D8C7A6', base: 1, attrs: {} }
      ]
    }
  },
  facts: {
    dim: 'area',
    split: { dim: 'tipo', shares: [0.46, 0.18, 0.11, 0.14, 0.11] },
    fields: [
      /* la misura primaria e cio che l'agenzia incassa davvero: le provvigioni */
      { id: 'prov', kind: 'seasonal', jitter: [0.94, 1.06] },
      /* GMV = provvigioni / take rate — il valore degli immobili passati di mano */
      { id: 'gmv', kind: 'divide', of: 'prov', attr: 'take', jitter: [0.97, 1.03], min: 1 },
      /* rogiti = provvigioni / provvigione media: la conta si DERIVA dall'ancora */
      { id: 'rogiti', kind: 'divide', of: 'prov', attr: 'fee', jitter: [0.9, 1.12], min: 1 },
      /* visite = rogiti x visite per rogito */
      { id: 'visite', kind: 'share', of: 'rogiti', attr: 'visite', jitter: [0.85, 1.15] },
      /* la quota che resta all'agente, e che nel Nord-Ovest cresce: e la seconda storia */
      { id: 'quotaAg', kind: 'share', of: 'prov', attr: 'split', jitter: [0.96, 1.06], growthFactor: 1.12 },
      /* il portafoglio: 1,2 immobili a listino per rogito del mese -> ~60 in tutta Italia */
      { id: 'listino', kind: 'share', of: 'rogiti', attr: 'listino', jitter: [0.9, 1.1] }
    ]
  },
  detail: {
    dim: 'agente', parentDim: 'area',
    members: {
      no: ['Bianchi', 'Ferrari', 'Colombo'],
      sud: ['Esposito', 'Russo', 'De Luca'],
      ne: ['Zanetti', 'Moretti'],
      ce: ['Ricci', 'Gentile', 'Marchetti'],
      is: ['Vitale', 'Randazzo']
    },
    fields: ['prov', 'quotaAg'],
    counts: { field: 'rogiti', from: 'rogiti' }
  }
};

/* l'attributo del portafoglio vive sui membri: 1,2 immobili a listino per rogito */
dataParams.dims.area.members.forEach(m => { m.attrs.listino = 1.2; });

const M = (id, label, extra) => Object.assign({ id, label }, extra);

const spec = {
  meta: {
    title: 'Rete immobiliare — performance nazionale',
    subtitle: 'Provvigioni, compravendite e margine per area · {y} vs {py}',
    brand: { name: 'Rete Immobiliare' },
    locale: 'it-IT', currency: '€',
    months: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'],
    updated: 'aggiornato il 2 set 2026',
    source: 'gestionale interno · rogiti notarili',
    watermark: 'Mockup dimostrativo · dati sintetici · non rappresenta vendite reali'
  },
  aesthetic: 'corporate-sober',
  archetype: 'scorecard',
  grid: { contentWidth: 1044, gutter: 12, columns: 5 },
  model: {
    sums: ['prov', 'gmv', 'rogiti', 'visite', 'quotaAg', 'listino'],
    measures: [
      M('prov', 'Provvigioni', { agg: 'sum', field: 'prov', unit: 'money', format: 'eur' }),
      M('gmv', 'Valore transato', { agg: 'sum', field: 'gmv', unit: 'money', format: 'eur' }),
      M('rogiti', 'Compravendite', { agg: 'sum', field: 'rogiti', unit: 'count', format: 'N' }),
      M('visite', 'Visite', { agg: 'sum', field: 'visite', unit: 'count', format: 'N' }),
      M('quotaAg', 'Provvigioni agenti', { agg: 'sum', field: 'quotaAg', unit: 'money', format: 'eur' }),
      /* il portafoglio e uno stock: non si somma nei mesi, si legge l'ultimo */
      M('listino', 'Immobili a listino', { agg: 'last', field: 'listino', unit: 'count', format: 'N' }),
      M('feeMedia', 'Provvigione media', { agg: 'ratio', num: 'prov', den: 'rogiti', unit: 'money', format: 'eurF' }),
      M('prezzoMedio', 'Prezzo medio', { agg: 'ratio', num: 'gmv', den: 'rogiti', unit: 'money', format: 'eurF' }),
      M('takeRate', 'Take rate', { agg: 'ratio', num: 'prov', den: 'gmv', unit: 'pct', format: 'pc' }),
      M('conversione', 'Visite per rogito', { agg: 'ratio', num: 'visite', den: 'rogiti', unit: 'x', format: 'x', inv: true }),
      /* la storia negativa numero due: piu sale, meno resta all'agenzia */
      M('quotaAgPc', 'Quota agenti', { agg: 'ratio', num: 'quotaAg', den: 'prov', unit: 'pct', format: 'pc', inv: true }),
      M('margine', 'Margine agenzia', { agg: 'diff', a: 'prov', b: 'quotaAg', unit: 'money', format: 'eur' })
    ]
  },
  filters: {
    date: { levels: ['year', 'quarter', 'month'], default: { y: 2025, q: null, m: null } },
    dims: [
      { id: 'area', label: 'Area', control: 'list', allLabel: 'Tutte', pill: 'Area' },
      { id: 'tipo', label: 'Tipologia', control: 'list', allLabel: 'Tutte', pill: 'Tipo' }
    ]
  },
  kpiBand: [
    { id: 'prov', label: 'Provvigioni', measure: 'prov', span: 1 },
    { id: 'rogiti', label: 'Compravendite', measure: 'rogiti', span: 1 },
    { id: 'feeMedia', label: 'Provvigione media', measure: 'feeMedia', span: 1 },
    { id: 'listino', label: 'Immobili a listino', measure: 'listino', span: 1 },
    { id: 'quotaAgPc', label: 'Quota agenti', measure: 'quotaAgPc', span: 1, inv: true }
  ],
  pages: [
    {
      id: 'mercato', title: 'Andamento del mercato', nav: 'Mercato',
      subtitle: 'Chi sta guadagnando terreno e chi lo sta perdendo · {y} vs {py}',
      rows: [
        { visuals: [{
          type: 'ribbon', span: 5, h: 168,
          title: 'Evoluzione del ranking per area — {y}',
          subtitle: 'La larghezza e la quota di provvigioni del trimestre; gli incroci sono i sorpassi',
          bind: { dim: 'area', measure: 'prov', by: 'q' }
        }] },
        { visuals: [
          { type: 'colline', span: 3, h: 150, title: 'Provvigioni mensili e take rate — {y} vs {py}',
            note: 'La linea e il take rate, sul suo asse',
            bind: { measure: 'prov', line: 'takeRate' } },
          { type: 'hbar', span: 2, h: 150, title: 'Provvigioni per tipologia', subtitle: 'ordinate per valore',
            bind: { dim: 'tipo', measure: 'prov', top: 5 } }
        ] },
        { flex: true, visuals: [{
          type: 'matrix', span: 5, title: 'Dettaglio per area — {period}',
          subtitle: 'tasto destro su una riga per il dettaglio agenti',
          bind: {
            dim: 'area', label: 'Area', sort: 'prov', drill: true, totalsLabel: 'Totale rete',
            columns: [
              { measure: 'prov', label: 'Provvigioni' },
              { measure: 'prov', label: '{basis}', kind: 'var' },
              { measure: 'rogiti', label: 'Compravendite' },
              { measure: 'prezzoMedio', label: 'Prezzo medio' },
              { measure: 'takeRate', label: 'Take rate', kind: 'heat', scale: [0.028, 0.036] },
              { measure: 'prov', label: 'Quota', kind: 'share' }
            ]
          }
        }] }
      ]
    },
    {
      id: 'agenti', title: 'Provvigioni degli agenti', nav: 'Agenti',
      subtitle: 'Quanto resta alla rete e quanto va a chi vende · {y}',
      rows: [
        { visuals: [
          { type: 'hbar', span: 3, h: 176, title: 'Provvigioni per agente', subtitle: 'primi dieci per valore',
            bind: { dim: 'agente', measure: 'prov', detail: true, top: 10, parent: 'area',
              subMeasure: 'rogiti', subUnit: ' rogiti' } },
          { type: 'scatter', span: 2, h: 176, title: 'Volume contro quota trattenuta',
            subtitle: 'in alto a destra: area che vende molto e lascia molto',
            bind: { dim: 'area', x: 'prov', y: 'quotaAgPc', size: 'rogiti' } }
        ] },
        { flex: true, visuals: [{
          type: 'matrix', span: 5, title: 'Margine per area — {period}',
          bind: {
            dim: 'area', label: 'Area', sort: 'margine', drill: false, totalsLabel: 'Totale rete',
            columns: [
              { measure: 'prov', label: 'Provvigioni' },
              { measure: 'quotaAg', label: 'Agli agenti' },
              { measure: 'margine', label: 'Margine rete' },
              { measure: 'quotaAgPc', label: 'Quota agenti', kind: 'heat', scale: [0.44, 0.62], inv: true },
              { measure: 'conversione', label: 'Visite/rogito' }
            ]
          }
        }] }
      ]
    }
  ],
  drill: {
    dim: 'area',
    page: {
      id: '__drill__', title: '{drill}', drillHeader: 'Area {drill} · {period}',
      backLabel: 'Torna a tutte le aree', subtitle: 'Agenti e tipologie dell area selezionata',
      rows: [
        { visuals: [
          { type: 'trend', span: 3, h: 168, title: 'Provvigioni — {drill}', bind: { measure: 'prov' } },
          { type: 'donut', span: 2, h: 168, title: 'Mix tipologie — {drill}', centreLabel: 'Provvigioni',
            bind: { dim: 'tipo', measure: 'prov' } }
        ] },
        { flex: true, visuals: [{
          type: 'matrix', span: 5, title: 'Agenti — {drill}',
          bind: {
            dim: 'agente', label: 'Agente', sort: 'prov', drill: false, totalsLabel: 'Totale area',
            columns: [
              { measure: 'prov', label: 'Provvigioni' },
              { measure: 'quotaAg', label: 'Sua quota' },
              { measure: 'quotaAgPc', label: '% trattenuta', kind: 'heat', scale: [0.44, 0.62], inv: true }
            ]
          }
        }] }
      ]
    }
  }
};

module.exports = { spec, build: () => builder.build(dataParams), dataParams, name: 'Immobiliare — rete nazionale' };
