/* CICLO LOCALE — giro 2. Scuola online, report per il consiglio.
 *
 * BRIEF:
 *   "Report per il consiglio di una scuola online di design, circa 4.000 iscritti attivi e 6
 *    docenti. Vogliamo capire se la crescita e sana o se perdiamo studenti dopo il primo corso.
 *    Confronto anno su anno."
 *
 * RAGIONAMENTO DICHIARATO
 *   nicchia    creator economy / education — "scuola online", "corsi", "docenti".
 *   taglia     MEDIA. Segnali che alzano: 4.000 iscritti attivi, sei docenti, un consiglio a
 *              cui rendere conto. Nessuno strumento nominato, quindi niente livello raro: si
 *              costruisce su floor (ricavi, prodotto) piu il livello probabile (margine), e la
 *              RITENZIONE per coorte si modella dichiarandolo.
 *   domanda    "la crescita e sana o perdiamo studenti dopo il primo corso" — che NON e "quanto
 *              abbiamo incassato". E' una domanda di ritenzione, e la risposta deve poter
 *              essere "no": senza coorti che si sfaldano il report risponde solo "si".
 *   archetipo  cohorts. La heatmap per coorte e trimestre e l'unico visual che fa vedere se
 *              chi e entrato dopo resta meno di chi e entrato prima.
 *              NOTA: la regola del pubblico direbbe "consiglio -> executive-summary". Vince la
 *              DOMANDA, come prescrive layout-archetypes.md — ma la tensione fra le due regole
 *              e reale ed e annotata in LOCAL-EVAL.md.
 *   pelle      shell top · palette jewel-desaturati · tipografia editoriale · densita arioso.
 *              Dentro la PELLE PLAUSIBILE della nicchia, ruotata dal seme del brief.
 *   ancore     prezzo medio corso 30 - 900 EUR  -> iscrizioni = ricavi / prezzo (qui ~340 EUR)
 *              margine operativo 60 - 70%       -> costi = ricavi x (1 - margine)
 *              ritenzione al secondo corso: modellata fra 34% e 71% per coorte
 */
'use strict';
const builder = require('../../data-builder.js');

/* Sei coorti di ingresso. La ritenzione scende per le piu recenti: e la storia che il consiglio
   deve vedere, e senza di essa la domanda del brief non avrebbe risposta.
 *
 * LE BASI SONO DERIVATE DAL BRIEF, non scelte. Il brief dichiara ~4.000 iscritti attivi e sei
 * docenti: con un prezzo medio di 336 EUR fanno circa 1,3 milioni di ricavi. Al primo tentativo
 * avevo scelto le basi a occhio e ne uscivano 28.000 iscrizioni e 9,5 milioni — internamente
 * coerenti, e assurdi per una scuola con sei insegnanti. E' lo stesso errore dello scontrino da
 * 24 centesimi, visto dall'altro lato: li si sceglieva la conta e si sperava nel rapporto, qui
 * si rispettavano i rapporti e si ignorava la SCALA che il brief aveva gia dichiarato. */
const COORTI = [
  ['c1', 'Entrati 2024 Q1', '#4A2F53', 12200, 0.04, 0.71, 380],
  ['c2', 'Entrati 2024 Q2', '#6B4A78', 13300, 0.06, 0.66, 365],
  ['c3', 'Entrati 2024 Q3', '#3F5E74', 15300, 0.09, 0.58, 350],
  ['c4', 'Entrati 2024 Q4', '#4F7D6C', 18700, 0.12, 0.49, 336],
  ['c5', 'Entrati 2025 Q1', '#8A6A4E', 22100, 0.18, 0.41, 322],
  ['c6', 'Entrati 2025 Q2', '#9A5560', 24200, 0.24, 0.34, 308]
];

const dataParams = {
  seed: 63820,
  years: [2024, 2025],
  /* i corsi seguono l'anno accademico: settembre e gennaio sono le due partenze */
  seasonality: [1.28, 1.06, 0.94, 0.88, 0.82, 0.66, 0.52, 0.44, 1.34, 1.22, 1.08, 0.86],
  dims: {
    coorte: {
      members: COORTI.map(([id, n, c, base, growth, rinnovo, prezzo]) => ({
        id, n, c, base, growth, attrs: { rinnovo, prezzo, margine: 0.64 }
      }))
    },
    corso: {
      members: [
        { id: 'base', n: 'Base', c: '#6B4A78', base: 1, attrs: {} },
        { id: 'avanz', n: 'Avanzato', c: '#3F5E74', base: 1, attrs: {} },
        { id: 'master', n: 'Master', c: '#8A6A4E', base: 1, attrs: {} }
      ]
    }
  },
  facts: {
    dim: 'coorte',
    split: { dim: 'corso', shares: [0.52, 0.31, 0.17] },
    fields: [
      { id: 'ricavi', kind: 'seasonal', jitter: [0.9, 1.12] },
      /* iscrizioni = ricavi / prezzo medio: l'ancora e il prezzo, la conta ne discende */
      { id: 'iscrizioni', kind: 'divide', of: 'ricavi', attr: 'prezzo', jitter: [0.94, 1.07], min: 1 },
      /* chi torna per un secondo corso: e la ritenzione, ed e cio che il consiglio ha chiesto */
      { id: 'tornati', kind: 'share', of: 'iscrizioni', attr: 'rinnovo', jitter: [0.92, 1.09] },
      { id: 'costi', kind: 'share', of: 'ricavi', attr: 'margine', complement: true, jitter: [0.97, 1.04] },
      { id: 'margineOp', kind: 'combine', plus: ['ricavi'], minus: ['costi'] }
    ]
  }
};

const M = (id, label, extra) => Object.assign({ id, label }, extra);

const spec = {
  meta: {
    title: 'Scuola Ferrante — coorti e ritenzione',
    subtitle: 'La crescita e sana, o entra gente che poi non torna? · {y}',
    locale: 'it-IT', currency: '€',
    months: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'],
    updated: 'aggiornato il 2 set 2026',
    watermark: 'Mockup dimostrativo · dati sintetici'
  },
  aesthetic: 'executive-minimal',
  skin: { shell: 'top', palette: 'jewel-desaturati', tipografia: 'editoriale', densita: 'arioso' },
  archetype: 'cohorts',
  grid: { contentWidth: 1248, gutter: 16, columns: 4 },
  model: {
    sums: ['ricavi', 'iscrizioni', 'tornati', 'costi', 'margineOp'],
    measures: [
      M('ricavi', 'Ricavi', { agg: 'sum', field: 'ricavi', unit: 'money', format: 'eur' }),
      M('iscrizioni', 'Iscrizioni', { agg: 'sum', field: 'iscrizioni', unit: 'count', format: 'N' }),
      M('tornati', 'Tornati per un secondo corso', { agg: 'sum', field: 'tornati', unit: 'count', format: 'N' }),
      M('costi', 'Costi', { agg: 'sum', field: 'costi', unit: 'money', format: 'eur', inv: true }),
      M('margineOp', 'Margine operativo', { agg: 'sum', field: 'margineOp', unit: 'money', format: 'eur' }),
      M('ritenzione', 'Ritenzione', { agg: 'ratio', num: 'tornati', den: 'iscrizioni', unit: 'pct', format: 'pc' }),
      M('marginePc', 'Margine operativo %', { agg: 'ratio', num: 'margineOp', den: 'ricavi', unit: 'pct', format: 'pc' }),
      M('prezzo', 'Prezzo medio', { agg: 'ratio', num: 'ricavi', den: 'iscrizioni', unit: 'money', format: 'eurF' })
    ]
  },
  filters: {
    date: { levels: ['year', 'quarter', 'month'], default: { y: 2025, q: null, m: null } },
    dims: [
      { id: 'coorte', label: 'Coorte', control: 'dropdown', allLabel: 'Tutte', pill: 'Coorte' },
      { id: 'corso', label: 'Corso', control: 'list', allLabel: 'Tutti', pill: 'Corso' }
    ]
  },
  kpiBand: [
    { id: 'iscrizioni', label: 'Iscrizioni', measure: 'iscrizioni', span: 1 },
    { id: 'ritenzione', label: 'Ritenzione', measure: 'ritenzione', span: 1 },
    { id: 'ricavi', label: 'Ricavi', measure: 'ricavi', span: 1 },
    { id: 'marginePc', label: 'Margine operativo %', measure: 'marginePc', span: 1 }
  ],
  pages: [{
    id: 'main',
    title: 'Coorti',
    subtitle: 'Le coorti recenti crescono di iscrizioni e tornano meno: la crescita compra studenti che non restano',
    rows: [
      { visuals: [
        /* L'APERTURA dell'archetipo a coorti: righe = chi e entrato quando, colonne = i
           trimestri. Le righe in basso — gli entrati di recente — sono piu fredde, ed e la
           risposta alla domanda del consiglio. */
        /* DUE DOMANDE, UNA POSIZIONE. La mappa risponde a "chi e entrato quando resta di
           piu"; il trend stagionale a "in che mesi si iscrive la gente". Sono due domande vere
           e nessuna delle due merita di uscire dalla pagina, quindi condividono il riquadro e
           si sceglie con una linguetta. E' il bookmark chiesto dalla revisione: al posto di
           una seconda pagina, la stessa card che mostra un'altra cosa. */
        /* Il motivo e obbligatorio: engine/viste.js rifiuta un bookmark che non dichiara perche
           nasconde qualcosa. Qui e "pagina-sprecata", e non "altro-taglio": le due viste non
           guardano la stessa misura — una parla di ritenzione per coorte, l'altra di iscrizioni
           nel tempo. La ragione onesta e che la stagionalita serviva, la pagina era piena, e una
           pagina con dentro un grafico solo sarebbe stata peggio. */
        { span: 3, h: 168, id: 'coorti-vista', motivo: 'pagina-sprecata', viste: [
          { etichetta: 'Per coorte', type: 'heatmap',
            title: 'Ritenzione per coorte e trimestre — {y}',
            subtitle: 'piu chiaro = meno studenti tornano; clicca una cella per filtrare la coorte',
            bind: { dim: 'coorte', measure: 'ritenzione', by: 'q' } },
          { etichetta: 'Stagionalita', type: 'colline',
            title: 'Iscrizioni per mese, con la ritenzione come linea — {y} vs {py}',
            subtitle: 'settembre e gennaio sono le due partenze: il resto dell anno vive di code',
            bind: { measure: 'iscrizioni', line: 'ritenzione' } }
        ] },
        { type: 'delta-card', span: 1, h: 168, title: 'Ritenzione', bind: { measure: 'ritenzione' } }
      ] },
      /* LA CHIUSURA dell'archetipo: la tabella per coorte. */
      { flex: true, visuals: [{
        type: 'matrix', span: 4, title: 'Coorti — iscrizioni, ritenzione e margine · {period}',
        bind: {
          dim: 'coorte', label: 'Coorte', sort: 'iscrizioni', drill: true, totalsLabel: 'Totale scuola',
          columns: [
            { measure: 'iscrizioni', label: 'Iscrizioni' },
            { measure: 'tornati', label: 'Tornati' },
            { measure: 'ritenzione', label: 'Ritenzione', kind: 'heat', scale: [0.3, 0.75] },
            { measure: 'ricavi', label: 'Ricavi' },
            { measure: 'prezzo', label: 'Prezzo medio' }
          ]
        }
      }] }
    ]
  }],
  drill: {
    dim: 'coorte',
    page: {
      id: '__drill__',
      title: '{drill}',
      drillHeader: 'Dettaglio della coorte — {period}',
      backLabel: 'Torna alle coorti',
      rows: [
        { visuals: [
          { type: 'colline', span: 2, h: 190, title: 'Iscrizioni per mese, con la ritenzione come linea',
            bind: { measure: 'iscrizioni', line: 'ritenzione' } },
          { type: 'donut', span: 2, h: 190, title: 'Ricavi per corso',
            subtitle: 'tre categorie, il totale al centro', centreLabel: 'Ricavi',
            bind: { dim: 'corso', measure: 'ricavi' } }
        ] }
      ]
    }
  }
};

module.exports = {
  spec, dataParams, build: () => builder.build(dataParams),
  name: 'Ciclo locale 2 — scuola online (le coorti recenti non tornano)'
};
