/* IL CAMPIONARIO — la stessa spec, sei pelli diverse.
 *
 * Serve a rispondere a una domanda che nessun test puo rispondere: "si somigliano ancora?".
 * Gli assi sono indipendenti per costruzione, ma la prova che funzionino e visiva, e senza un
 * posto dove metterli affiancati si finisce per crederci sulla parola.
 *
 * La spec e sempre quella — stesso archetipo, stessi dati, stessi numeri. Cambia solo la
 * pelle: dove stanno navigazione e filtri, la famiglia di colore, i caratteri, il ritmo.
 * Se due card qui sotto si somigliano, l'asse che dovrebbe distinguerle non funziona.
 */
'use strict';
const base = require('./delta-margine.js');
const { SHELLS } = require('../../skin.js');

/* Sei combinazioni scelte per essere lontane fra loro, non a caso: due chiare e due scure, due
   con la rail e due senza, un editoriale e un tecnico, dal denso all'arioso. */
const PELLI = [
  { id: 'rail-navy', skin: { shell: 'rail', palette: 'navy-corporate', tipografia: 'neutro-ui', densita: 'medio' },
    nome: 'rail · navy corporate · sans · medio' },
  { id: 'bare-carta', skin: { shell: 'bare', palette: 'carta-inchiostro', tipografia: 'editoriale', densita: 'arioso' },
    nome: 'senza cornice · carta e inchiostro · editoriale · arioso' },
  { id: 'slim-terroso', skin: { shell: 'rail-slim', palette: 'terroso', tipografia: 'editoriale', densita: 'medio' },
    nome: 'rail stretta · terroso · slab · medio' },
  { id: 'top-tecnico', skin: { shell: 'top', palette: 'dark-tecnico', tipografia: 'tecnico', densita: 'denso', banda: 'blocco' },
    nome: 'barra superiore · dark tecnico · mono · denso · banda a blocco unico' },
  { id: 'slim-salvia', skin: { shell: 'rail-slim', palette: 'salvia', tipografia: 'umanista', densita: 'arioso' },
    nome: 'rail stretta · salvia · humanist · arioso' },
  { id: 'bare-mono', skin: { shell: 'bare', palette: 'monocromo-accento', tipografia: 'grottesco', densita: 'denso', banda: 'blocco' },
    nome: 'senza cornice · monocromo con accento · condensato · denso · banda a blocco' }
];

/* La contentWidth e il gutter non si scrivono a mano: discendono da shell e densita, ed e
   esattamente il motivo per cui il motore li verifica invece di fidarsi. */
const GUTTER = { arioso: 16, medio: 12, denso: 8 };

const variante = v => {
  const spec = JSON.parse(JSON.stringify(base.spec));
  spec.skin = v.skin;
  spec.grid.contentWidth = SHELLS[v.skin.shell].contentWidth;
  spec.grid.gutter = GUTTER[v.skin.densita];
  /* La rail stretta compra larghezza al contenuto e la paga sulla riga dei filtri: 1116px
     invece di 1248, e le stesse chip non ci stanno piu. Non e un difetto del campionario, e il
     compromesso vero della shell — il motore lo rifiuta col Gate 6 invece di lasciar clippare
     la barra — e la cura e la stessa che vale in produzione: liste lunghe a tendina. */
  if (v.skin.shell === 'rail-slim') {
    spec.filters.dims.forEach(fd => { if (fd.control === 'list') fd.control = 'dropdown'; });
  }
  spec.meta.title = 'Controllo di gestione — ' + v.nome;
  spec.meta.subtitle = 'La stessa spec, un altra pelle · {y}';
  return { spec, build: base.build, dataParams: base.dataParams, name: 'Pelle — ' + v.nome };
};

module.exports = {};
PELLI.forEach(v => { module.exports['pelle-' + v.id] = variante(v); });
module.exports.__lista = PELLI;
