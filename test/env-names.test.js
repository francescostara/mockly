#!/usr/bin/env node
/* I nomi delle variabili d'ambiente dopo il cambio di nome del prodotto.
 *
 * Il rischio del rinominare non e il codice: e che un .env.local scritto la settimana scorsa,
 * o un comando salvato nella cronologia del terminale, smetta di funzionare senza dire perche.
 * Qui si verifica che il vecchio prefisso continui a valere e che il nuovo vinca — e, cosa
 * altrettanto importante, che il giro a pagamento tolga ENTRAMBI i prefissi dello stub: se ne
 * restasse uno, un giro "vero" potrebbe rispondere con la spec finta e sembrare riuscito.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const leggi = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };

console.log('nomi delle variabili d ambiente (Pruva, con ripiego su Mockly)');

/* lib/env.ts e TypeScript: qui interessa il comportamento, che e tre righe. Si replica la
   stessa regola e si verifica che il file la contenga davvero, invece di trascinare tsx
   dentro la suite per tre righe. */
const envSrc = leggi('lib', 'env.ts');

ok('il lettore cerca prima PRUVA_ e poi MOCKLY_', () => {
  assert.match(envSrc, /process\.env\['PRUVA_' \+ nome\]/, 'manca la lettura del nome nuovo');
  assert.match(envSrc, /process\.env\['MOCKLY_' \+ nome\]/, 'manca il ripiego sul nome vecchio');
  const iNuovo = envSrc.indexOf("'PRUVA_' + nome"), iVecchio = envSrc.indexOf("'MOCKLY_' + nome");
  assert.ok(iNuovo < iVecchio, 'il nome nuovo deve essere cercato per primo, o non vince mai');
});

ok('nessun consumatore legge process.env.MOCKLY_ direttamente', () => {
  ['app/api/generate/route.ts', 'lib/model.ts', 'lib/niche.ts'].forEach(f => {
    const src = leggi(...f.split('/'));
    assert.ok(!/process\.env\.MOCKLY_/.test(src),
      f + ' legge ancora il vecchio nome a mano invece di passare da lib/env.ts');
  });
});

ok('il giro vero dell eval toglie ENTRAMBI i prefissi dello stub', () => {
  const src = leggi('test', 'eval-run.js');
  assert.match(src, /delete env\.PRUVA_STUB/, 'non toglie il nome nuovo');
  assert.match(src, /delete env\.MOCKLY_STUB/,
    'non toglie il nome vecchio: un giro a pagamento potrebbe rispondere con la spec finta');
});

ok('il vecchio nome del prodotto non e rimasto nel codice o nei documenti', () => {
  const ammessi = new Set(['lib\\env.ts', 'lib/env.ts', 'test\\eval-run.js', 'test/eval-run.js',
    'test\\env-names.test.js', 'test/env-names.test.js', 'test\\generate-offline.ts',
    'test/generate-offline.ts']);
  const salta = new Set(['.git', 'node_modules', '.next', 'out', 'eval-out', '.vercel', 'share']);
  const est = new Set(['.ts', '.tsx', '.js', '.mjs', '.json', '.md', '.css']);
  const colpevoli = [];
  (function scendi(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach(e => {
      if (salta.has(e.name)) return;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) return scendi(p);
      if (!est.has(path.extname(e.name)) || e.name === 'package-lock.json') return;
      const rel = path.relative(ROOT, p);
      if (ammessi.has(rel)) return;
      const src = fs.readFileSync(p, 'utf8');
      if (!/mockly/i.test(src)) return;
      /* Un'eccezione sola, e non e una svista: il repo su GitHub e il progetto Vercel portano
         ancora il nome vecchio finche non li rinomina l'autore a mano. Quelli sono URL veri, e
         riscriverli sarebbe scrivere il falso in un documento che serve a ritrovare le cose.
         Sono ammessi solo dove compaiono come indirizzo. */
      const fuoriContesto = src.split(/\r?\n/)
        .filter(l => /mockly/i.test(l) && !/vercel\.app|github\.com/.test(l));
      if (fuoriContesto.length) colpevoli.push(rel + ' (' + fuoriContesto.length + ' righe)');
    });
  })(ROOT);
  assert.deepStrictEqual(colpevoli, [], 'file col vecchio nome: ' + colpevoli.join(', '));
});

console.log('  ' + n + ' checks');
