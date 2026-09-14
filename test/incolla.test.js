#!/usr/bin/env node
/* LA MODALITA INCOLLA, sotto test.
 *
 * E' il ponte con cui un brief in linguaggio naturale si prova a costo zero: l'app mostra il
 * messaggio, una persona lo porta in una chat, la risposta torna nell'app. Se il ponte si rompe
 * nessun altro test se ne accorge — l'app in produzione non lo usa — e la prova del linguaggio
 * naturale torna a costare crediti senza che nessuno lo decida.
 *
 * Si difendono quattro cose:
 *   1. il primo messaggio porta DAVVERO le istruzioni e la richiesta, separate;
 *   2. la risposta si prende "cosi com'e": con i blocchi di codice e una frase di cortesia
 *      intorno, come una chat la restituisce davvero;
 *   3. le risposte si consumano in ordine — prima il primo tentativo, poi la riparazione;
 *   4. lo scambio si salva, e un disco in sola lettura non fa fallire la generazione.
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { render } = require('../engine/render.js');
const { extractJson } = require('../lib/json-object.js');
const P = require('../lib/incolla.js');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };

console.log('modalita incolla (il linguaggio naturale senza crediti API)');

ok('il primo messaggio porta istruzioni e richiesta, separate e in quest ordine', () => {
  const m = P.messaggioIniziale('REGOLE DEL MOTORE', 'BRIEF DEL CLIENTE: una catena di palestre');
  const i = m.indexOf('<<<<< ISTRUZIONI >>>>>'), r = m.indexOf('<<<<< RICHIESTA >>>>>');
  assert.ok(i >= 0 && r > i, 'le istruzioni vengono prima della richiesta');
  assert.ok(m.indexOf('REGOLE DEL MOTORE') > i && m.indexOf('REGOLE DEL MOTORE') < r);
  assert.ok(m.indexOf('una catena di palestre') > r);
  assert.ok(/SOLO l.oggetto JSON/.test(m), 'deve dire che la risposta la legge un programma');
});

ok('il messaggio vero contiene il prompt di sistema intero, non un riassunto', () => {
  /* il prompt e TypeScript: si verifica che la route passi SYSTEM_PROMPT e non una copia */
  const route = fs.readFileSync(path.join(__dirname, '..', 'app', 'api', 'generate', 'route.ts'), 'utf8');
  assert.ok(/messaggioIniziale\(SYSTEM_PROMPT,/.test(route),
    'la modalita incolla deve mandare lo STESSO prompt della produzione, o prova un altro prodotto');
});

ok('la risposta si prende cosi com e, con i blocchi di codice e le frasi intorno', () => {
  const caso = require('../engine/specs/banco/delta-margine.js');
  const json = JSON.stringify({ spec: caso.spec, dataParams: caso.dataParams }, null, 2);
  const chat = 'Ecco il JSON richiesto:\n\n```json\n' + json + '\n```\n\nFammi sapere se serve altro {ok}.';
  const { spec, dataParams } = extractJson(chat);
  const html = render(spec, require('../engine/data-builder.js').build(dataParams));
  assert.ok(html.length > 10000, 'dalla risposta di una chat deve uscire un mockup vero');
});

ok('le risposte si consumano in ordine: primo tentativo, poi riparazione', () => {
  assert.strictEqual(P.rispostaPer([], 0), null, 'senza risposte si aspetta la prima');
  assert.strictEqual(P.rispostaPer(['{"a":1}'], 0), '{"a":1}');
  assert.strictEqual(P.rispostaPer(['{"a":1}'], 1), null, 'la riparazione non riusa la prima risposta');
  assert.strictEqual(P.rispostaPer(['{"a":1}', '   '], 1), null, 'una risposta vuota non e una risposta');
  assert.strictEqual(P.rispostaPer('non un array', 0), null);
});

ok('lo scambio si salva con un nome leggibile', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pruva-incolla-'));
  const file = P.salvaScambio(dir, { brief: 'Catena di palestre: più sedi, abbonamenti', esito: 'valida al primo colpo' });
  assert.ok(file && fs.existsSync(file));
  assert.ok(/__catena-di-palestre-piu-sedi/.test(path.basename(file)), path.basename(file));
  assert.strictEqual(JSON.parse(fs.readFileSync(file, 'utf8')).esito, 'valida al primo colpo');
  fs.rmSync(dir, { recursive: true, force: true });
});

ok('un disco che non si puo scrivere non fa fallire la generazione', () => {
  const vietato = path.join(__dirname, 'incolla.test.js', 'dentro-un-file');   /* non puo essere una cartella */
  assert.strictEqual(P.salvaScambio(vietato, { brief: 'x' }), null);
});

ok('la produzione non puo finire in modalita incolla per sbaglio', () => {
  /* si attiva solo con PRUVA_STUB=incolla, una variabile del server: il browser non la sceglie */
  const route = fs.readFileSync(path.join(__dirname, '..', 'app', 'api', 'generate', 'route.ts'), 'utf8');
  assert.ok(/const incolla = \(\) => env\('STUB'\) === MODO_INCOLLA/.test(route));
  assert.ok(!/body\.(incolla|modo)/.test(route), 'il corpo della richiesta non deve poter accendere la modalita');
});

console.log('  ' + n + ' checks');
