/* ARCHETIPO 2 — EXECUTIVE SUMMARY. SaaS per il board.
 *
 * Doppio uso, e nasce una volta sola: e l'esempio canonico che il modello copia, ed e il
 * template del percorso a menu senza crediti. Se fossero due file, divergerebbero al primo
 * ritocco e nessuno se ne accorgerebbe.
 *
 * DOMANDA: "qual e la cosa che devo sapere?" — un board legge un numero e un grafico.
 * APERTURA: la delta-card dell'MRR (il numero grande e la VARIAZIONE) + il trend dominante.
 * CHIUSURA: una riga di supporto — mai una matrice densa: chiuderla cosi lo trasformerebbe
 *           nello scorecard, cioe nella formula che stiamo evitando. Il dettaglio sta nella
 *           seconda pagina, dove chi vuole scavare lo trova.
 * DENSITA: bassa. Sette conteggi fra card e visual, non uno di piu.
 *
 * ANCORE (niches.md, voce SaaS):
 *   CAC payback   12 – 24 MESI, mai zero e mai giorni  -> spesaAcq = mrrNuovo x payback
 *   NRR           95 – 120%
 *   churn logo    0,5 – 2% al mese
 *   ARPA          decine o centinaia di euro al mese   -> clienti = mrr / ARPA
 *
 * STORIA NEGATIVA (la firma della nicchia): il secchio bucato — Starter cresce di logo e
 * perde MRR, l'espansione di Enterprise tiene su l'NRR da sola.
 */
'use strict';
const builder = require('../data-builder.js');

const dataParams = {
  seed: 90312,
  years: [2024, 2025],
  seasonality: [0.94, 0.96, 1.02, 1.03, 1.05, 1.01, 0.93, 0.86, 1.04, 1.07, 1.06, 1.03],
  dims: {
    piano: {
      members: [
        { id: 'ent', n: 'Enterprise', c: '#14171A', base: 128000, growth: 0.22,
          attrs: { arpa: 1450, churn: 0.006, esp: [0.026, 0.031], nuovo: 0.038, payback: 19 } },
        { id: 'pro', n: 'Pro', c: '#3E5C86', base: 86000, growth: 0.13,
          attrs: { arpa: 310, churn: 0.012, esp: [0.016, 0.019], nuovo: 0.052, payback: 15 } },
        /* il secchio bucato: Starter fa numeri di logo e perde MRR piu di quanto ne aggiunga */
        { id: 'sta', n: 'Starter', c: '#868D95', base: 41000, growth: -0.08,
          attrs: { arpa: 59, churn: 0.028, esp: 0.004, nuovo: 0.061, payback: 23 } }
      ]
    },
    canale: {
      members: [
        { id: 'dir', n: 'Diretto', c: '#14171A', base: 1, attrs: {} },
        { id: 'part', n: 'Partner', c: '#4E555D', base: 1, attrs: {} },
        { id: 'self', n: 'Self-serve', c: '#BEC3C9', base: 1, attrs: {} }
      ]
    }
  },
  facts: {
    dim: 'piano',
    split: { dim: 'canale', shares: [0.46, 0.29, 0.25] },
    fields: [
      { id: 'mrr', kind: 'seasonal', jitter: [0.97, 1.03] },
      { id: 'clienti', kind: 'divide', of: 'mrr', attr: 'arpa', jitter: [0.96, 1.05], min: 1 },
      { id: 'mrrNuovo', kind: 'share', of: 'mrr', attr: 'nuovo', jitter: [0.88, 1.14] },
      { id: 'mrrEspansione', kind: 'share', of: 'mrr', attr: 'esp', jitter: [0.85, 1.18] },
      { id: 'mrrChurn', kind: 'share', of: 'mrr', attr: 'churn', jitter: [0.86, 1.2] },
      /* l'ancora del payback si applica QUI: la spesa di acquisizione e il nuovo MRR
         moltiplicato per i mesi che ci vogliono a ripagarlo. Scegliere la spesa a caso e
         sperare che il payback torni e il modo in cui esce un payback di zero giorni. */
      { id: 'spesaAcq', kind: 'share', of: 'mrrNuovo', attr: 'payback', jitter: [0.94, 1.07] },
      { id: 'mrrNetto', kind: 'combine', plus: ['mrr', 'mrrEspansione'], minus: ['mrrChurn'] }
    ]
  }
};

const M = (id, label, extra) => Object.assign({ id, label }, extra);

const spec = {
  meta: {
    title: 'Northwind Cloud — sintesi per il consiglio',
    subtitle: 'Una cosa da sapere, e dove guardare se serve il dettaglio · {y}',
    locale: 'it-IT', currency: '€',
    months: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'],
    updated: 'aggiornato il 2 set 2026',
    watermark: 'Mockup dimostrativo · dati sintetici'
  },
  aesthetic: 'executive-minimal',
  /* SaaS per il board: carta e inchiostro, serif editoriale, nessuna cornice scura. La pagina
     deve sembrare un documento del consiglio, non un'applicazione. */
  skin: { shell: 'bare', tipografia: 'editoriale' },
  archetype: 'executive-summary',
  grid: { contentWidth: 1248, gutter: 12, columns: 3 },
  model: {
    sums: ['mrr', 'clienti', 'mrrNuovo', 'mrrEspansione', 'mrrChurn', 'spesaAcq', 'mrrNetto'],
    measures: [
      /* Due misure sullo stesso campo, e non e una ridondanza.
         `mrr` SOMMA: per mese la somma e l'MRR di quel mese, ed e cio che serve al trend e a
         ogni rapporto (ARPA, NRR, churn%) dove anche il denominatore e sommato.
         `mrrFine` prende l'ULTIMO mese della finestra: e cio che va scritto quando si dice
         "MRR" da solo. Sommare dodici mesi di ricorrente e chiamarlo MRR e il difetto di
         realismo piu comune del SaaS — il numero e dodici volte quello vero e nessun gate
         strutturale se ne accorge, perche tutto riconcilia. */
      M('mrr', 'Ricorrente cumulato', { agg: 'sum', field: 'mrr', unit: 'money', format: 'eur' }),
      M('mrrFine', 'MRR', { agg: 'last', field: 'mrr', unit: 'money', format: 'eur' }),
      M('clienti', 'Clienti-mese', { agg: 'sum', field: 'clienti', unit: 'count', format: 'N' }),
      M('clientiFine', 'Clienti', { agg: 'last', field: 'clienti', unit: 'count', format: 'N' }),
      M('mrrNuovo', 'MRR nuovo', { agg: 'sum', field: 'mrrNuovo', unit: 'money', format: 'eur' }),
      M('mrrEspansione', 'MRR espansione', { agg: 'sum', field: 'mrrEspansione', unit: 'money', format: 'eur' }),
      M('mrrChurn', 'MRR perso', { agg: 'sum', field: 'mrrChurn', unit: 'money', format: 'eur', inv: true }),
      M('spesaAcq', 'Spesa di acquisizione', { agg: 'sum', field: 'spesaAcq', unit: 'money', format: 'eur' }),
      M('nrr', 'NRR', { agg: 'ratio', num: 'mrrNetto', den: 'mrr', unit: 'pct', format: 'pc' }),
      M('churnPc', 'Churn MRR', { agg: 'ratio', num: 'mrrChurn', den: 'mrr', unit: 'pct', format: 'pc', inv: true }),
      /* payback = spesa di acquisizione / MRR nuovo: quanti MESI di nuovo ricorrente ci
         vogliono per ripagare l'acquisizione. L'unita e "months" e non "x" perche "18,3x" si
         legge come un moltiplicatore, e l'ancora della nicchia parla di mesi. */
      M('payback', 'CAC payback', { agg: 'ratio', num: 'spesaAcq', den: 'mrrNuovo', unit: 'months', format: 'months', inv: true }),
      M('arpa', 'ARPA', { agg: 'ratio', num: 'mrr', den: 'clienti', unit: 'money', format: 'eurF' })
    ]
  },
  filters: {
    date: { levels: ['year', 'quarter', 'month'], default: { y: 2025, q: null, m: null } },
    dims: [
      { id: 'piano', label: 'Piano', control: 'list', allLabel: 'Tutti', pill: 'Piano' },
      { id: 'canale', label: 'Canale', control: 'list', allLabel: 'Tutti', pill: 'Canale' }
    ]
  },
  kpiBand: [
    { id: 'mrr', label: 'MRR', measure: 'mrrFine', span: 1 },
    { id: 'nrr', label: 'NRR', measure: 'nrr', span: 1 },
    { id: 'payback', label: 'CAC payback', measure: 'payback', span: 1, inv: true }
  ],
  pages: [{
    id: 'sintesi',
    title: 'Sintesi',
    nav: 'Sintesi',
    subtitle: 'L\'MRR cresce; a tenerlo su e l\'espansione di Enterprise, non i nuovi logo',
    rows: [
      { visuals: [
        /* L'APERTURA. La delta-card porta la variazione come numero grande: la domanda di un
           board non e "quanto vale l'MRR" — quello e scritto nella banda sopra — ma "di quanto
           si e mosso". Accanto, il trend dominante: la forma che ha prodotto quel numero. */
        { type: 'delta-card', span: 1, h: 210, title: 'MRR', bind: { measure: 'mrrFine' } },
        { type: 'trend', span: 2, h: 210, title: 'MRR mensile — {y} vs {py}',
          subtitle: 'la linea tratteggiata e l\'anno precedente',
          bind: { measure: 'mrr' } }
      ] },
      /* LA CHIUSURA: supporto, non dettaglio. Due riquadri che spiegano il numero grande —
         dove sta l'MRR e se la ritenzione netta regge il suo metro. */
      /* Niente `flex` qui: una riga flex e pensata per la matrice, che si allunga con le
         righe. Un hbar e un gauge dentro una riga flex prendono la loro altezza di default e
         sfondano il fondo della pagina — il conto del motore torna, il disegno no. */
      { visuals: [
        { type: 'hbar', span: 2, h: 168, title: 'MRR per piano — {period}',
          subtitle: 'Starter perde piu di quanto aggiunga',
          bind: { dim: 'piano', measure: 'mrrFine' } },
        /* due gauge nella stessa card: uno da solo in 408px occupava lo spazio di un grafico per
           dare un numero solo (la regola del gauge, 29 set 2026) */
        /* il churn contro il suo tetto: l'NRR e gia una card della banda KPI, e un gauge sullo
           stesso numero lo ripeterebbe e basta (regola del doppione, 29 set 2026) */
        { type: 'gauge', span: 1, h: 168, title: 'Churn MRR contro il tetto',
          subtitle: 'sopra l\'1,5% al mese la base si svuota',
          bind: { measure: 'churnPc', target: 0.015, targetLabel: 'tetto', max: 0.05 } }
      ] }
    ]
  }, {
    /* Il dettaglio esiste, ma non e la faccia del report: sta nella seconda pagina. E' cio
       che la regola "chiudi sempre con la matrice" impediva di fare. */
    id: 'dettaglio',
    title: 'Dettaglio per piano',
    nav: 'Dettaglio',
    subtitle: 'Il movimento dell\'MRR e i numeri per piano',
    rows: [
      { visuals: [
        { type: 'colline', span: 3, h: 176, title: 'MRR nuovo per mese, con il churn come linea',
          bind: { measure: 'mrrNuovo', line: 'churnPc' } }
      ] },
      { flex: true, visuals: [{
        type: 'matrix', span: 3, title: 'Dettaglio per piano — {period}',
        bind: {
          dim: 'piano', label: 'Piano', sort: 'mrr', drill: true, totalsLabel: 'Totale',
          columns: [
            { measure: 'mrrFine', label: 'MRR' },
            { measure: 'mrrFine', label: '{basis}', kind: 'var' },
            { measure: 'clientiFine', label: 'Clienti' },
            { measure: 'arpa', label: 'ARPA' },
            { measure: 'churnPc', label: 'Churn', kind: 'heat', scale: [0.004, 0.03], inv: true },
            { measure: 'payback', label: 'Payback' }
          ]
        }
      }] }
    ]
  }],
  drill: {
    dim: 'piano',
    page: {
      id: '__drill__',
      title: '{drill}',
      drillHeader: 'Dettaglio del piano — {period}',
      backLabel: 'Torna al dettaglio',
      rows: [
        { visuals: [
          { type: 'trend', span: 2, h: 200, title: 'MRR mensile — {drill}', bind: { measure: 'mrr' } },
          { type: 'hbar', span: 1, h: 200, title: 'MRR per canale', bind: { dim: 'canale', measure: 'mrr' } }
        ] }
      ]
    }
  }
};

module.exports = {
  spec, dataParams, build: () => builder.build(dataParams),
  name: 'Archetipo 2 — executive summary (SaaS per il board)'
};
