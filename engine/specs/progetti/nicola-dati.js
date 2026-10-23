/* PROGETTO CON DATI FORNITI — la v3 di Nicola: Penn World Table 11.0 (GGDC, CC BY 4.0), sei paesi,
 * 1970-2023, PIL, popolazione, capitale e investimenti. Il CSV accanto e un estratto dei dati veri. */
'use strict';
const fs = require('fs');
const path = require('path');
const csv = fs.readFileSync(path.join(__dirname, 'nicola-pwt.csv'), 'utf8');
module.exports = {
  versione: 1, lingua: 'en',
  brief: { testo: 'Economic growth and structural change of six countries since 1970, Penn World Table data.',
    dati: { fonte: 'Penn World Table 11.0', csv, anno: 'anno', campi: ['Ye', 'pop', 'Y', 'K', 'inv'],
      dimensioni: [{ id: 'paese', colonna: 'paese', etichetta: 'Country', membri: [
        { id: 'it', n: 'Italy' }, { id: 'de', n: 'Germany' }, { id: 'fr', n: 'France' }, { id: 'es', n: 'Spain' }, { id: 'us', n: 'United States' }, { id: 'kr', n: 'South Korea' }] }],
      misure: [
        { id: 'pil', label: 'Real GDP', agg: 'sum', field: 'Ye', unit: 'money', format: 'eur' },
        { id: 'pop', label: 'Population', agg: 'sum', field: 'pop', unit: 'count', format: 'N' },
        { id: 'pc', label: 'GDP per capita', agg: 'ratio', num: 'Ye', den: 'pop', unit: 'money', format: 'eurF' },
        { id: 'ky', label: 'Capital / output', agg: 'ratio', num: 'K', den: 'Y', unit: 'x', format: 'x' },
        { id: 'si', label: 'Investment rate', agg: 'ratio', num: 'inv', den: 'Y', unit: 'pct', format: 'pc' }] } },
  struttura: { title: 'Growth and structural change', purpose: 'Six economies since 1970', niche: 'finanziario',
    pages: [{ id: 'p1', title: 'Growth', subtitle: '', content: 'GDP per capita and growth' }, { id: 'p2', title: 'Capital', subtitle: '', content: 'capital/output against the steady state' }] },
  template: { id: 'analisi-editoriale' }, build: {}
};
