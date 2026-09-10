/* ARCHETIPO 8 — OPERATIVO / CAPACITA. Palestra, riempimento dei corsi.
 *
 * DOMANDA: "stiamo usando bene cio che abbiamo?" — la domanda della capacita, che non e
 * "quanto abbiamo incassato". Un corso mezzo vuoto costa quanto uno pieno.
 * APERTURA: la heatmap corso x fascia oraria, dominante, col gauge del riempimento accanto.
 * CHIUSURA: la tabella operativa densa, che e lo strumento di chi apre il report ogni mattina.
 * DENSITA: ALTA — nove conteggi fra card e visual. Un archetipo operativo con tre riquadri
 *          non e denso: e uno scorecard che si e dato un altro nome, e il motore lo rifiuta.
 *
 * ANCORE (niches.md, voce palestre):
 *   ricavo per socio     20 – 90 €/mese, mai centesimi  -> soci = ricavi / quota
 *   riempimento corsi    50 – 85%                       -> capacita = presenze / riempimento
 *   churn mensile        2 – 6%
 *   rinnovo              60 – 80%
 *
 * STORIA NEGATIVA: la fascia di pranzo tiene aperte le sale a meta capacita tutta la
 * settimana. Nel totale di riempimento non si vede — la media la copre; nella heatmap e una
 * banda fredda che attraversa la griglia.
 */
'use strict';
const builder = require('../data-builder.js');

/* Profili orari per corso: senza una stagionalita PER MEMBRO ogni riga della heatmap avrebbe
   la stessa forma e la mappa diventerebbe un muro di un colore solo. */
const SERA = [0.94, 0.98, 1.06, 1.04, 1.02, 0.96, 0.88, 0.58, 1.14, 1.18, 1.14, 1.08];
const MATTINA = [1.08, 1.10, 1.06, 0.98, 0.94, 0.88, 0.78, 0.52, 1.02, 1.12, 1.16, 1.06];

const dataParams = {
  seed: 27460,
  years: [2024, 2025],
  seasonality: [1.02, 1.06, 1.08, 1.00, 0.96, 0.90, 0.80, 0.54, 1.06, 1.14, 1.12, 1.02],
  dims: {
    corso: {
      members: [
        { id: 'pesi', n: 'Sala pesi', c: '#12304F', base: 58000, growth: 0.09, seasonality: SERA,
          attrs: { quota: 52, riemp: 0.78, churn: 0.031, prezzo: 6.4 } },
        { id: 'spin', n: 'Spinning', c: '#1F4E79', base: 31000, growth: 0.14, seasonality: SERA,
          attrs: { quota: 44, riemp: 0.71, churn: 0.038, prezzo: 8.1 } },
        { id: 'func', n: 'Funzionale', c: '#4A7FA8', base: 24500, growth: 0.21, seasonality: SERA,
          attrs: { quota: 47, riemp: 0.66, churn: 0.042, prezzo: 8.8 } },
        /* i due che il pranzo affossa: aperti, presidiati, mezzi vuoti */
        { id: 'yoga', n: 'Yoga', c: '#7FA8C6', base: 19800, growth: 0.04, seasonality: MATTINA,
          attrs: { quota: 39, riemp: 0.54, churn: 0.052, prezzo: 9.2 } },
        { id: 'nuoto', n: 'Nuoto', c: '#C6D7E4', base: 27200, growth: -0.06, seasonality: MATTINA,
          attrs: { quota: 61, riemp: 0.51, churn: 0.058, prezzo: 7.3 } }
      ]
    },
    fascia: {
      members: [
        { id: 'mat', n: 'Mattina', c: '#8FB3CC', base: 1, attrs: {} },
        { id: 'pra', n: 'Pranzo', c: '#C6D7E4', base: 1, attrs: {} },
        { id: 'pom', n: 'Pomeriggio', c: '#4A7FA8', base: 1, attrs: {} },
        { id: 'ser', n: 'Sera', c: '#12304F', base: 1, attrs: {} }
      ]
    }
  },
  facts: {
    dim: 'corso',
    /* il pranzo e la banda fredda: un decimo delle presenze contro il quaranta per cento
       della sera, sulle stesse sale e con lo stesso personale */
    split: { dim: 'fascia', shares: [0.22, 0.11, 0.27, 0.40] },
    fields: [
      { id: 'ricavi', kind: 'seasonal', jitter: [0.94, 1.06] },
      { id: 'soci', kind: 'divide', of: 'ricavi', attr: 'quota', jitter: [0.95, 1.06], min: 1 },
      { id: 'presenze', kind: 'divide', of: 'ricavi', attr: 'prezzo', jitter: [0.92, 1.09], min: 1 },
      /* capacita = presenze / riempimento: il rapporto e il vincolo, la conta ne discende */
      { id: 'capacita', kind: 'divide', of: 'presenze', attr: 'riemp', jitter: [0.98, 1.02], min: 1 },
      { id: 'abbandoni', kind: 'share', of: 'soci', attr: 'churn', jitter: [0.88, 1.16] }
    ]
  }
};

const M = (id, label, extra) => Object.assign({ id, label }, extra);

const spec = {
  meta: {
    title: 'Club Aurora — capacita e riempimento',
    subtitle: 'Dove le sale lavorano e dove restano aperte per niente · {y}',
    locale: 'it-IT', currency: '€',
    months: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'],
    updated: 'aggiornato il 2 set 2026',
    watermark: 'Mockup dimostrativo · dati sintetici'
  },
  aesthetic: 'corporate-sober',
  /* Palestra: salvia e humanist, ritmo denso — le card perdono il riquadro e la pagina
     operativa guadagna lo spazio che le serve. */
  skin: { palette: 'salvia', tipografia: 'humanist', densita: 'denso' },
  archetype: 'operational',
  grid: { contentWidth: 1044, gutter: 8, columns: 4 },
  model: {
    sums: ['ricavi', 'soci', 'presenze', 'capacita', 'abbandoni'],
    measures: [
      M('ricavi', 'Ricavi', { agg: 'sum', field: 'ricavi', unit: 'money', format: 'eur' }),
      /* `soci` SOMMA i soci di ogni mese: e la conta giusta come denominatore del ricavo per
         socio (anche il numeratore e annuale), ed e sbagliata da scrivere in una card — dodici
         mesi di soci sommati fanno quarantamila iscritti in un club che ne ha tremila.
         `sociAttivi` prende l'ultimo mese: quello e il numero che si dice a voce. */
      M('soci', 'Soci-mese', { agg: 'sum', field: 'soci', unit: 'count', format: 'N' }),
      M('sociAttivi', 'Soci attivi', { agg: 'last', field: 'soci', unit: 'count', format: 'N' }),
      M('presenze', 'Presenze', { agg: 'sum', field: 'presenze', unit: 'count', format: 'N' }),
      M('capacita', 'Posti disponibili', { agg: 'sum', field: 'capacita', unit: 'count', format: 'N' }),
      M('abbandoni', 'Abbandoni', { agg: 'sum', field: 'abbandoni', unit: 'count', format: 'N', inv: true }),
      M('riempimento', 'Riempimento', { agg: 'ratio', num: 'presenze', den: 'capacita', unit: 'pct', format: 'pc' }),
      M('churnPc', 'Churn mensile', { agg: 'ratio', num: 'abbandoni', den: 'soci', unit: 'pct', format: 'pc', inv: true }),
      M('ricavoSocio', 'Ricavo per socio (mese)', { agg: 'ratio', num: 'ricavi', den: 'soci', unit: 'money', format: 'eurF' })
    ]
  },
  filters: {
    date: { levels: ['year', 'quarter', 'month'], default: { y: 2025, q: null, m: null } },
    dims: [
      { id: 'corso', label: 'Corso', control: 'list', allLabel: 'Tutti', pill: 'Corso' },
      { id: 'fascia', label: 'Fascia', control: 'list', allLabel: 'Tutte', pill: 'Fascia' }
    ]
  },
  kpiBand: [
    { id: 'soci', label: 'Soci attivi', measure: 'sociAttivi', span: 1 },
    { id: 'riempimento', label: 'Riempimento', measure: 'riempimento', span: 1 },
    { id: 'churnPc', label: 'Churn mensile', measure: 'churnPc', span: 1, inv: true },
    { id: 'ricavoSocio', label: 'Ricavo per socio / mese', measure: 'ricavoSocio', span: 1 }
  ],
  pages: [{
    id: 'main',
    title: 'Capacita e riempimento',
    subtitle: 'La banda fredda del pranzo attraversa tutta la settimana e nessun totale la mostra',
    rows: [
      /* Una riga sola di contenuto, non due: la chiusura operativa e una tabella di cinque
         corsi piu i totali, e in 720px due righe di grafici la taglierebbero. La densita non
         si ottiene impilando righe finche il motore protesta — si ottiene mettendo tre cose
         che rispondono a tre domande diverse sulla stessa riga. */
      { visuals: [
        /* L'APERTURA operativa: la mappa della capacita; accanto il riempimento per corso e
           il metro — quanto siamo lontani dalla soglia sotto cui una sala non ripaga il
           personale che la presidia. */
        { type: 'heatmap', span: 2, h: 176, title: 'Presenze per corso e fascia — {y}',
          subtitle: 'piu scuro = piu presenze; clicca una cella per filtrare il corso',
          bind: { dim: 'corso', measure: 'presenze', by: 'fascia' } },
        { type: 'hbar', span: 1, h: 176, title: 'Riempimento per corso',
          subtitle: 'Nuoto e Yoga a meta sala',
          bind: { dim: 'corso', measure: 'riempimento' } },
        { type: 'gauge', span: 1, h: 176, title: 'Riempimento',
          subtitle: 'soglia di sostenibilita 70%',
          bind: { measure: 'riempimento', target: 0.70, targetLabel: 'soglia', max: 1 } }
      ] },
      /* LA CHIUSURA: la tabella operativa, quella che si guarda ogni mattina. */
      { flex: true, visuals: [{
        type: 'matrix', span: 4, title: 'Corsi — presenze, capacita e abbandoni · {period}',
        bind: {
          dim: 'corso', label: 'Corso', sort: 'presenze', drill: true, totalsLabel: 'Totale club',
          columns: [
            { measure: 'presenze', label: 'Presenze' },
            { measure: 'capacita', label: 'Posti' },
            { measure: 'riempimento', label: 'Riempimento', kind: 'heat', scale: [0.45, 0.85] },
            { measure: 'sociAttivi', label: 'Soci' },
            { measure: 'churnPc', label: 'Churn', kind: 'heat', scale: [0.025, 0.06], inv: true },
            { measure: 'ricavoSocio', label: 'Ricavo/socio' }
          ]
        }
      }] }
    ]
  }],
  drill: {
    dim: 'corso',
    page: {
      id: '__drill__',
      title: '{drill}',
      drillHeader: 'Dettaglio del corso — {period}',
      backLabel: 'Torna alla capacita',
      rows: [
        { visuals: [
          { type: 'trend', span: 2, h: 190, title: 'Presenze mensili — {drill}', bind: { measure: 'presenze' } },
          { type: 'hbar', span: 2, h: 190, title: 'Presenze per fascia', bind: { dim: 'fascia', measure: 'presenze' } }
        ] }
      ]
    }
  }
};

module.exports = {
  spec, dataParams, build: () => builder.build(dataParams),
  name: 'Archetipo 8 — operativo (capacita di una palestra)'
};
