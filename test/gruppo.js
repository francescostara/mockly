/* UN GRUPPO DI TEST IN UN PROCESSO SOLO. Avviare node e caricare jsdom e il motore costa quasi un
   secondo; con un processo per file la suite ne spendeva una quarantina solo in avvii. Qui un
   processo esegue una lista di test sincroni uno dopo l'altro: jsdom e il motore si caricano una
   volta. Ogni test ha il suo output catturato, e un'eccezione fa fallire quel test, non il gruppo.
   Riceve la lista in JSON sull'argomento; per ogni lavoro stampa una riga @@ col risultato. */
'use strict';
const path = require('path');
const lavori = JSON.parse(process.argv[2]);
const scriviVero = process.stdout.write.bind(process.stdout);

for (const j of lavori) {
  const t = Date.now();
  let out = '', ok = true, riepilogo = null;
  const cattura = (...a) => { out += a.map(x => typeof x === 'string' ? x : require('util').inspect(x)).join(' ') + '\n'; };
  const log0 = console.log, err0 = console.error, warn0 = console.warn;
  console.log = cattura; console.error = cattura; console.warn = cattura;
  const exit0 = process.exit, sw0 = process.stdout.write, ew0 = process.stderr.write;
  process.stdout.write = s => { out += s; return true; };
  process.stderr.write = s => { out += s; return true; };
  process.exit = code => { throw Object.assign(new Error('process.exit(' + code + ')'), { __exit: code }); };
  try {
    if (j.harness) {
      const r = require('./harness-caso.js').eseguiCaso(j.id);
      out += r.testo; riepilogo = r.riepilogo; ok = !r.riepilogo.fail;
    } else {
      require(path.join(__dirname, j.nome));
    }
  } catch (e) {
    if (!(e && e.__exit === 0)) { ok = false; out += (e && e.stack ? e.stack : String(e)) + '\n'; }
  } finally {
    console.log = log0; console.error = err0; console.warn = warn0; process.exit = exit0;
    process.stdout.write = sw0; process.stderr.write = ew0;
  }
  scriviVero('@@' + JSON.stringify({ nome: j.nome, ok, ms: Date.now() - t, out, riepilogo }) + '\n');
}
