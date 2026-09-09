#!/usr/bin/env node
/* Esporta gli scheletri degli archetipi in skill/assets/canonical-*.json.
 *
 *   npm run templates
 *
 * L'artefatto e uno solo — engine/templates/ — e ha due usi: e l'ESEMPIO CANONICO che il
 * modello copia (il modello impara dagli esempi molto piu che dalla prosa) ed e il TEMPLATE
 * del percorso a menu senza crediti. Questo script fa la seconda copia in modo derivato, cosi
 * l'esempio non puo divergere dal template: se qualcuno tocca lo scheletro e non rilancia il
 * comando, il test se ne accorge.
 *
 * Nel JSON esportato c'e la spec, i dataParams e le note di lettura. NON c'e l'HTML: quello lo
 * produce render(spec, data), e allegarlo raddoppierebbe il peso della skill per niente.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { render, lint } = require('../engine/render.js');
const templates = require('../engine/templates/index.js');

const root = path.join(__dirname, '..');
const assets = path.join(root, 'skill', 'assets');

/* La firma strutturale: la sequenza dei tipi riga per riga. E' la stessa che il gate
   anti-generico confronta fra file diversi — se due report hanno la stessa firma, il modello
   sta copiando un esempio invece di comporre. */
const firma = spec => spec.pages.map(pg =>
  (pg.rows || []).map(r => r.visuals.map(v => v.type + ':' + v.span).join('+')).join(' | ')
).join('  ||  ');

let scritti = 0;
console.log('\nESEMPI CANONICI -> skill/assets/');
Object.keys(templates).forEach(id => {
  const t = templates[id];
  const data = t.build();
  render(t.spec, data);                       /* deve passare i gate, o non e canonico */
  const doc = {
    /* l'intestazione serve al lettore umano e al modello: dice a cosa guardare */
    _leggimi: [
      t.name,
      'Archetipo "' + t.spec.archetype + '" — vedi skill/references/layout-archetypes.md.',
      'Firma strutturale: ' + firma(t.spec),
      'Generato da engine/templates/' + id.replace(/^canonical-/, '') + '.js con `npm run templates`.',
      'NON modificare questo file a mano: la sorgente e lo scheletro, e questo ne e la copia.'
    ],
    spec: t.spec,
    dataParams: t.dataParams
  };
  const file = path.join(assets, id + '.json');
  fs.writeFileSync(file, JSON.stringify(doc, null, 2) + '\n');
  scritti++;
  const note = lint(t.spec, data);
  console.log('  ok  ' + id.padEnd(30) + Math.round(fs.statSync(file).size / 1024) + 'KB   ' + firma(t.spec).slice(0, 60));
  note.forEach(n => console.log('        nota: ' + n));
});
console.log('\n' + scritti + ' esempi esportati. Per guardarli: npm run banco\n');
