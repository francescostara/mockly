#!/usr/bin/env node
/* Ogni nicchia deve avere le sue àncore di grandezza, e devono essere numeriche.
 *
 * Perche esistono: i nove problemi rimasti nel primo giro a pagamento non erano nove bug, era
 * UNO. Scontrino medio €0,24, CAC payback 0 giorni, ricavo per socio €0,89, CPM €0,45 — tutti
 * rapporti il cui denominatore era stato generato con l'ordine di grandezza sbagliato, in
 * cinque nicchie diverse.
 *
 * Un gate intercetta il numero assurdo DOPO, e ogni intercettazione costa un giro di
 * riparazione a ogni generazione, per sempre. L'ancora lo previene: si fissa il rapporto nel
 * suo intervallo e si deriva la conta. Questo test verifica che l'ancora ci sia — non che il
 * modello la rispetti, che si vede solo generando.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'skill', 'references', 'niches.md'), 'utf8');
let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };

console.log('ancore di grandezza (niches.md)');

/* Le voci validate portano il blocco a tabella, le tre starter una riga in elenco: due forme
   per due strutture di voce, la sostanza e la stessa. */
const validate = [...src.matchAll(/^## ÀNCORE DI GRANDEZZA — (.+)$/gm)].map(m => m[1].trim());
const starter = [...src.matchAll(/^### (.+)$/gm)].map(m => m[1].trim())
  .filter(t => !/^\d/.test(t));

ok('tutte le voci validate hanno un blocco di ancore', () => {
  const voci = [...src.matchAll(/^# Nicchia: (.+)$/gm)].map(m => m[1]);
  assert.strictEqual(validate.length, voci.length,
    voci.length + ' nicchie validate ma ' + validate.length + ' blocchi di ancore: ' +
    'una voce senza ancore lascia il modello libero di inventare le conte');
});

ok('ogni blocco dichiara almeno due rapporti con un intervallo numerico', () => {
  const blocchi = src.split(/^## ÀNCORE DI GRANDEZZA — /m).slice(1);
  blocchi.forEach(b => {
    const nome = b.split('\n')[0].trim();
    const righe = b.split('\n').filter(r => /^\|/.test(r) && !/^\|\s*-+/.test(r) && !/rapporto \|/.test(r));
    assert.ok(righe.length >= 2, nome + ': solo ' + righe.length + ' ancore, ne servono almeno due');
    righe.forEach(r => {
      assert.ok(/\d/.test(r), nome + ': ancora senza numeri — "' + r.slice(0, 70) + '"');
      assert.ok(/=|\//.test(r), nome + ': ancora che non dichiara come si deriva la conta');
    });
  });
});

ok('le voci starter portano la riga di ancore', () => {
  ['Palestre', 'E-commerce moda', 'SaaS', 'App consumer'].forEach(voce => {
    const i = src.indexOf('### ' + voce);
    assert.ok(i > 0, 'voce starter "' + voce + '" non trovata');
    /* la voce finisce dove comincia la successiva: una finestra a caratteri fissi andava allargata
       a ogni voce che cresceva, ed e gia successo due volte */
    const fine = src.indexOf(String.fromCharCode(10) + '### ', i + 4);
    const blocco = src.slice(i, fine > 0 ? fine : undefined);
    assert.ok(/ÀNCORE DI GRANDEZZA/.test(blocco), voce + ': manca la riga delle ancore');
  });
});

/* I quattro numeri assurdi del giro vero devono essere coperti da un'ancora che li nomina.
   Non prova che il modello la seguira: prova che l'istruzione esiste dove serve. */
ok('i quattro numeri assurdi del giro Sonnet hanno ora la loro ancora', () => {
  const casi = [
    ['scontrino medio', /AOV = fatturato \/ (scontrini|ordini)|AOV \*\*60|AOV/i],
    ['CAC payback', /CAC payback \*\*12 – 24 MESI\*\*|payback/i],
    ['ricavo per socio', /ricavo per socio = quota mensile/i],
    ['CPM', /CPM = spesa \/ impression/i]
  ];
  casi.forEach(([nome, re]) => assert.ok(re.test(src), 'nessuna ancora copre "' + nome + '"'));
});

ok('la regola generale e scritta: il rapporto prima, la conta derivata', () => {
  assert.ok(/Si fissano PRIMA di generare le conte/.test(src),
    'manca la frase che dice in che ordine si generano rapporto e conta');
});

console.log('  ' + n + ' checks · ' + validate.length + ' voci validate + 3 starter');
