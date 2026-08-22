/* Rigioca i tentativi rifiutati dell'eval attraverso la pipeline vera, con la rete nuova.
   Costo zero: i payload sono su disco, il modello non viene chiamato. */
import fs from 'node:fs';
import path from 'node:path';
import { extractJson } from '../lib/json-object.js';
import { checkAndRender } from '../lib/validate';

const dir = 'eval-out/sonnet-2';
let primi = 0, primiOk = 0;
for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.json'))) {
  const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const a = j.attempts.find((x: { attempt: number }) => x.attempt === 1);
  if (!a) continue;
  primi++;
  let esito: string;
  try {
    const { spec, dataParams } = extractJson(a.raw) as { spec: unknown; dataParams: unknown };
    const r = checkAndRender(spec, dataParams);
    esito = r.ok ? 'VALIDA (' + Math.round((r.html.length) / 1024) + 'KB)' : 'non valida: ' + r.errors[0].slice(0, 95);
    if (r.ok) primiOk++;
  } catch (e) { esito = 'parse: ' + (e as Error).message.slice(0, 80); }
  console.log('  ' + f.replace('.json', '').padEnd(26) + esito);
}
console.log('\n  primi tentativi validi con la rete: ' + primiOk + '/' + primi);
