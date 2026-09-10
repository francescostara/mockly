/* IL CATALOGO — dal combinatorio a un elenco CURATO.
 *
 * I cinque assi generano migliaia di combinazioni: ottimo per la varieta, inutile come
 * catalogo. Nessuno sceglie fra diecimila, e soprattutto: non tutte sono BELLE. La macchina sa
 * dire quali sono valide — ci stanno nel canvas, passano i contrasti, non sforano la toolbar —
 * ma "questa la manderei a un cliente" e un giudizio, e lo da una persona.
 *
 * Da qui il flusso in tre tempi:
 *   1. `npm run catalogo` genera e renderizza le combinazioni VALIDE in out/catalogo/;
 *   2. l'autore apre l'indice, guarda e segna quelle buone (la selezione vive nel browser e si
 *      copia negli appunti come JSON);
 *   3. le combinazioni approvate si incollano qui sotto, con un nome, e diventano PRESET.
 *
 * I preset sono la base di entrambe le strade: la scelta automatica per nicchia parte da loro,
 * e l'utente che vuole cambiare faccia sceglie fra questi — non fra diecimila combinazioni ne
 * fra tre estetiche. Cambiare preset e un ri-render della stessa spec: nessun modello, nessun
 * credito.
 */
'use strict';

/**
 * I PRESET APPROVATI. Ognuno e archetipo-indipendente: descrive la PELLE, non la composizione.
 * Il campo `nome` e quello che l'utente legge; `nicchie` e il recinto in cui il preset e
 * proponibile in automatico (vuoto = qualunque nicchia).
 *
 * Questo elenco cresce col lavoro di cura. Parte dalle combinazioni gia in uso negli esempi
 * canonici e nel campionario: sono le uniche su cui un giudizio umano c'e gia stato.
 */
const PRESET_APPROVATI = [
  {
    id: 'corporate-classico', nome: 'Corporate classico',
    skin: { shell: 'rail', palette: 'navy-corporate', tipografia: 'neutro-ui', densita: 'medio', banda: 'box' },
    nicchie: ['retail', 'b2b-sales', 'logistica', 'generica']
  },
  {
    id: 'editoriale-chiaro', nome: 'Editoriale chiaro',
    skin: { shell: 'bare', palette: 'carta-inchiostro', tipografia: 'editoriale', densita: 'arioso', banda: 'box' },
    nicchie: ['finanziario', 'saas', 'immobiliare', 'generica']
  },
  {
    id: 'tecnico-scuro', nome: 'Tecnico scuro',
    skin: { shell: 'top', palette: 'dark-tecnico', tipografia: 'tecnico', densita: 'denso', banda: 'blocco' },
    nicchie: ['energia-manifattura', 'logistica', 'saas']
  },
  {
    id: 'commerciale-slate', nome: 'Commerciale slate',
    skin: { shell: 'rail', palette: 'slate-freddo', tipografia: 'corporate', densita: 'medio', banda: 'box' },
    nicchie: ['b2b-sales', 'finanziario', 'generica']
  },
  {
    id: 'operativo-salvia', nome: 'Operativo salvia',
    skin: { shell: 'rail', palette: 'salvia', tipografia: 'umanista', densita: 'denso', banda: 'box' },
    nicchie: ['palestre', 'ristorazione', 'retail']
  },
  {
    id: 'agenzia-scura', nome: 'Agenzia scura',
    skin: { shell: 'top', palette: 'dark-agency', tipografia: 'grottesco', densita: 'medio', banda: 'blocco' },
    nicchie: ['social', 'creator-economy', 'ecommerce-moda']
  },
  {
    id: 'ristorazione-terrosa', nome: 'Terroso caldo',
    skin: { shell: 'rail-slim', palette: 'terroso', tipografia: 'umanista', densita: 'medio', banda: 'box' },
    nicchie: ['ristorazione', 'retail', 'ecommerce-moda']
  },
  {
    id: 'consiglio-jewel', nome: 'Consiglio, toni gioiello',
    skin: { shell: 'top', palette: 'jewel-desaturati', tipografia: 'editoriale', densita: 'arioso', banda: 'box' },
    nicchie: ['creator-economy', 'saas', 'finanziario']
  }
];

/* Gli assi, nell'ordine in cui il generatore li fa ruotare. Il campionario non e casuale: e uno
   sweep sistematico a passi primi fra loro, cosi ogni valore di ogni asse compare piu o meno lo
   stesso numero di volte invece di lasciare intere zone del combinatorio mai viste. */
const ASSI = {
  shell: ['rail', 'rail-slim', 'top', 'bare'],
  palette: ['navy-corporate', 'slate-freddo', 'warm-taupe', 'carta-inchiostro', 'dark-agency',
    'dark-tecnico', 'terroso', 'salvia', 'jewel-desaturati', 'monocromo-accento',
    'alto-contrasto', 'pastello-sobrio', 'blu-ghiaccio'],
  tipografia: ['neutro-ui', 'tecnico', 'editoriale', 'corporate', 'umanista', 'grottesco',
    'mono-numerico', 'serif-scuro'],
  densita: ['arioso', 'medio', 'denso'],
  banda: ['box', 'blocco']
};

/* La contentWidth discende dalla shell e il gutter dalla densita: il generatore li deve
   riscrivere insieme all'asse, o il motore rifiuta la combinazione per un motivo che non ha
   niente a che vedere con la faccia. */
const LARGHEZZE = { rail: 1044, 'rail-slim': 1116, top: 1248, bare: 1248 };
const GUTTER = { arioso: 16, medio: 12, denso: 8 };

/** Le combinazioni da provare: uno sweep, non un sorteggio. */
function combinazioni(quante) {
  const out = [];
  const n = { shell: ASSI.shell.length, palette: ASSI.palette.length,
    tipografia: ASSI.tipografia.length, densita: ASSI.densita.length, banda: ASSI.banda.length };
  /* passi primi rispetto alla lunghezza di ciascun asse: cosi la rotazione copre tutto */
  for (let i = 0; i < quante; i++) {
    out.push({
      shell: ASSI.shell[(i * 1) % n.shell],
      palette: ASSI.palette[(i * 3) % n.palette],
      tipografia: ASSI.tipografia[(i * 5) % n.tipografia],
      densita: ASSI.densita[(i * 7) % n.densita],
      banda: ASSI.banda[(i * 11) % n.banda]
    });
  }
  return out;
}

/** Applica una pelle a una spec, riscrivendo i due numeri che ne discendono. */
function applica(spec, skin, opz) {
  const copia = JSON.parse(JSON.stringify(spec));
  copia.skin = Object.assign({}, copia.skin, skin);
  copia.grid.contentWidth = LARGHEZZE[skin.shell] || copia.grid.contentWidth;
  copia.grid.gutter = GUTTER[skin.densita] || copia.grid.gutter;
  /* Una shell stretta paga in larghezza della toolbar: le liste lunghe diventano tendine, che
     e la stessa cura che il motore prescrive in produzione quando il Gate 6 sfora. Sulla rail
     stretta serve sempre; altrove solo quando il gate lo chiede davvero (opz.tendine). */
  if (skin.shell === 'rail-slim' || (opz && opz.tendine)) {
    (copia.filters.dims || []).forEach(fd => {
      if ((fd.control || 'list') === 'list') fd.control = 'dropdown';
    });
  }
  return copia;
}

const etichetta = s => [s.shell, s.palette, s.tipografia, s.densita, s.banda].join(' · ');

module.exports = { PRESET_APPROVATI, ASSI, LARGHEZZE, GUTTER, combinazioni, applica, etichetta };
