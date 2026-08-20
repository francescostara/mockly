/* Il contratto dati, sui casi che l'hanno rotto davvero.
 *
 * Il primo eval a pagamento (eval-out/sonnet.csv) ha dato 4 fallback su 10, e 3 avevano lo
 * STESSO errore: dataParams.dims["platform" | "segment" | "cat"] (facts.dim) has no members.
 * Altri 2 tentativi erano morti su "Unexpected non-whitespace character after JSON".
 *
 * I JSON grezzi di quei giri NON sono stati salvati: eval-run.js scrive l'HTML e il CSV, il
 * server logga il messaggio d'errore e non il payload. Le forme qui sotto sono quindi
 * RICOSTRUITE dai messaggi — i nomi delle dimensioni sono quelli veri, presi dal log — non
 * ripescate. E una differenza che conta: si dimostra che la causa e chiusa sulla FORMA che
 * l'ha prodotta, non che quei tre file specifici oggi passerebbero.
 *
 * Chiuso vuol dire tre cose, una per riga di difesa:
 *   1. lo strumento non accetta piu quella forma (schema di emit_report);
 *   2. se arrivasse comunque, l'errore dice esattamente dove intervenire;
 *   3. applicando ALLA LETTERA cio che l'errore dice, la build passa.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const builder = require('../engine/data-builder.js');
const { extractJson } = require('../lib/json-object.js');

const ROOT = path.join(__dirname, '..');
let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };

console.log('contratto dati (cause reali dei fallback)');

/* ---- 1. lo schema dello strumento non ammette la dimensione vuota ---- */

/** L'input_schema vive dentro lib/model.ts: si legge dal sorgente, come fa app-fallback. */
function emitSchema() {
  const src = fs.readFileSync(path.join(ROOT, 'lib', 'model.ts'), 'utf8');
  const start = src.indexOf('input_schema: {');
  assert.ok(start >= 0, 'input_schema non trovato in lib/model.ts');
  const open = src.indexOf('{', start);
  let depth = 0, end = open;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  return eval('(' + src.slice(open, end) + ')');
}

ok('lo schema di emit_report richiede members, con almeno un elemento', () => {
  const dim = emitSchema().properties.dataParams.properties.dims.additionalProperties;
  assert.deepStrictEqual(dim.required, ['members'], 'members deve essere required su ogni dimensione');
  assert.strictEqual(dim.properties.members.minItems, 1, 'members deve avere minItems 1');
  assert.deepStrictEqual(dim.properties.members.items.required, ['id', 'n', 'base']);
});

ok('lo schema richiede years, dims e facts dentro dataParams', () => {
  const dp = emitSchema().properties.dataParams;
  ['years', 'dims', 'facts'].forEach(k => assert.ok(dp.required.includes(k), k + ' deve essere required'));
});

/* ---- 2 + 3. i tre casi veri ---- */

/* Le tre dimensioni sono quelle dei log, nelle due forme possibili: annunciata e lasciata
   vuota, oppure mai dichiarata. */
const CASI = [
  { id: 'social', dim: 'platform', misura: 'reach', dims: { platform: {} } },
  { id: 'saas', dim: 'segment', misura: 'mrr', dims: {} },
  { id: 'retail', dim: 'cat', misura: 'rev', dims: { cat: { members: [] } } }
];

const paramsDi = c => ({
  seed: 4711,
  years: [2024, 2025],
  seasonality: [0.9, 0.88, 1.0, 1.02, 0.98, 0.92, 0.8, 0.85, 1.1, 1.12, 1.2, 1.23],
  dims: JSON.parse(JSON.stringify(c.dims)),
  facts: { dim: c.dim, fields: [{ id: c.misura, kind: 'seasonal' }] }
});

/** L'esempio dentro il messaggio d'errore deve essere incollabile: si estrae il primo oggetto
 *  bilanciato che segue il nome della dimensione e lo si usa come cura, senza aggiungere
 *  niente di nostro. Se il messaggio non bastasse, questo passo fallirebbe. */
function curaDalMessaggio(msg, dim) {
  const at = msg.indexOf('"' + dim + '": {');
  assert.ok(at >= 0, 'il messaggio non contiene un esempio incollabile per "' + dim + '"');
  const open = msg.indexOf('{', at);
  let depth = 0, end = open;
  for (let i = open; i < msg.length; i++) {
    if (msg[i] === '{') depth++;
    else if (msg[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  return JSON.parse(msg.slice(open, end));
}

CASI.forEach(c => {
  let msg = '';
  ok(c.id + ': dims["' + c.dim + '"] senza membri resta rifiutata', () => {
    assert.throws(() => builder.build(paramsDi(c)), err => { msg = err.message; return err.dataParams === true; });
  });

  ok(c.id + ': il messaggio nomina la dim, dice dove va l array e mostra i membri', () => {
    assert.ok(msg.includes('"' + c.dim + '"'), 'deve nominare la dimensione');
    assert.ok(/DENTRO questa dimensione|co-locati/.test(msg), 'deve dire dove va l array');
    assert.ok(!/has no members/.test(msg), 'il vecchio messaggio non insegnava dove intervenire');
    const esempio = curaDalMessaggio(msg, c.dim);
    assert.ok(esempio.members.length >= 2, 'l esempio deve mostrare piu di un membro');
    assert.ok(esempio.members.some(m => m.growth < 0), 'l esempio deve portare una storia negativa');
    esempio.members.forEach(m => ['id', 'n', 'base'].forEach(k => assert.ok(m[k] !== undefined, 'membro senza ' + k)));
  });

  ok(c.id + ': applicando alla lettera cio che l errore dice, la build passa', () => {
    const dp = paramsDi(c);
    dp.dims[c.dim] = curaDalMessaggio(msg, c.dim);
    const data = builder.build(dp);
    assert.strictEqual(data.dims[c.dim].length, 2, 'i due membri dell esempio devono esserci');
    assert.strictEqual(data.facts.rows.length, 2 * 2 * 12, 'due anni x due membri x dodici mesi');
    assert.ok(data.facts.cols.includes(c.misura), 'la misura primaria deve essere una colonna');
    assert.ok(data.facts.rows.every(r => r.every(v => Number.isFinite(v))), 'nessun NaN nei fatti');
  });
});

ok('un membro senza "base" viene fermato invece di produrre NaN', () => {
  const dp = paramsDi(CASI[0]);
  dp.dims.platform = { members: [{ id: 'ig', n: 'Instagram', growth: 0.1 }] };
  assert.throws(() => builder.build(dp), /manca "base"/);
});

/* ---- l'altra causa: testo attorno al JSON ---- */

ok('una frase dopo il JSON non rompe piu il parse', () => {
  const payload = JSON.stringify({ spec: { meta: { title: 'x' } }, dataParams: { seed: 1 } });
  const casi = [
    payload + '\n\nEcco il report: ho scelto un donut perche {le categorie sono poche}.',
    'Certo! Ecco la spec richiesta:\n' + payload,
    '```json\n' + payload + '\n```\nSe vuoi cambio la palette.'
  ];
  casi.forEach((testo, i) => {
    const out = extractJson(testo);
    assert.ok(out.spec && out.dataParams, 'caso ' + (i + 1) + ': servono entrambe le chiavi');
  });
});

ok('il taglio prima-graffa/ultima-graffa fallirebbe sullo stesso testo', () => {
  const payload = JSON.stringify({ spec: {}, dataParams: {} });
  const testo = payload + ' Nota: {vedi sopra}';
  const ingenuo = testo.slice(testo.indexOf('{'), testo.lastIndexOf('}') + 1);
  assert.throws(() => JSON.parse(ingenuo), 'il vecchio taglio doveva rompersi proprio qui');
});

console.log('  ' + n + ' checks');
