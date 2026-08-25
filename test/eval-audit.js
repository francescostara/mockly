#!/usr/bin/env node
/* I gate sui numeri, applicati a TUTTI gli output veri di un giro di eval.
 *
 *   node test/eval-audit.js eval-out/sonnet-2
 *
 * Questo e il pezzo che mancava. L'harness girava solo sulle quattro fixture scritte da noi,
 * che passano da sempre; i dieci file veri non li guardava nessun test, e i difetti si sono
 * scoperti aprendo i file a mano DOPO aver pagato. Da qui in poi un giro a pagamento produce
 * un verdetto, non dieci HTML da controllare sperando di accorgersene.
 *
 * Costo zero: legge i file gia generati, non chiama niente.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { render, measurePage } = require('../engine/render.js');
const { firstBalancedObject } = require('../lib/json-object.js');
const G = require('./gates-numbers.js');

const dir = process.argv[2] || 'eval-out/sonnet-2';
const RIRENDERIZZA = !process.argv.includes('--come-generato');

/** SPEC e DATA vivono come literal JSON dentro lo script finale del file. */
function estrai(src, nome) {
  const at = src.indexOf('var ' + nome + '=');
  if (at < 0) return null;
  const obj = firstBalancedObject(src.slice(at));
  return obj ? JSON.parse(obj) : null;
}

/* L'aggregato totale sul periodo di default: serve ai gate che confrontano un valore col suo
   numeratore e denominatore. Si ricava dal DOM gia vivo, chiedendolo al runtime del file. */
function aggregato(win) {
  try {
    const A = win.MK && win.MK.__A;
    if (A) return A.agg(A.slice({}));
  } catch { /* il runtime non espone l'accesso: si resta senza */ }
  return null;
}

const files = fs.readdirSync(dir).filter(f => f.endsWith('.html')).sort();
let totali = 0, conProblemi = 0, legacy = 0;
const perClasse = {};

console.log('\nGATE SUI NUMERI — ' + dir + (RIRENDERIZZA ? '  (ri-renderizzati col motore attuale)' : '  (come generati)'));
console.log('='.repeat(78));

for (const f of files) {
  const src = fs.readFileSync(path.join(dir, f), 'utf8');
  const spec = estrai(src, 'SPEC'), data = estrai(src, 'DATA');
  if (!spec || !data) { console.log('\n' + f + '\n   spec/data non estraibili'); continue; }

  /* I file di un giro precedente non hanno `unit` sulle misure, perche allora non esisteva.
     Il motore oggi la pretende, e giustamente. Ma qui si sta facendo una DIAGNOSI su artefatti
     storici, non una validazione: rifiutarli renderebbe impossibile confrontare prima e dopo.
     L'unita si deduce dal formato, che nel file c'e gia, con la stessa mappa che ha migrato le
     fixture. Se dedurla cambiasse qualcosa lo si direbbe: non cambia, il formato resta quello. */
  const FMT2UNIT = { eur: 'money', eurF: 'money', pc: 'pct', sgp: 'pct', bps: 'pct', pp: 'pp', days: 'days', x: 'x', N: 'count', raw: 'count' };
  let dedotte = 0;
  ((spec.model || {}).measures || []).forEach(m => {
    if (!m.unit) { m.unit = FMT2UNIT[m.format || 'N'] || 'count'; dedotte++; }
  });

  let html = src;
  if (RIRENDERIZZA) {
    try { html = render(spec, data); }
    catch (e) { console.log('\n' + f + '\n   il motore attuale RIFIUTA questa spec: ' + e.message.split('\n')[0]); continue; }
  }

  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true });
  const problemi = G.tutti(dom.window.document, spec, aggregato(dom.window) || totaliDaDati(spec, data));
  dom.window.close();

  /* La geometria: il Gate 3 dell'harness esisteva gia e usa il conto del motore, che e quello
     che decide le altezze emesse. Non aveva mai girato sui file veri — ed e li che la riga di
     chiusura si taglia. Il taglio non si vede in jsdom, che non fa layout: si legge dal conto. */
  (spec.pages || []).forEach(pg => {
    let m; try { m = measurePage(spec, data, pg.id); } catch { return; }
    if (m.over > 0) {
      problemi.push('pagina "' + pg.id + '": ' + m.used + 'px in un budget di ' + m.budget +
        'px — sfora di ' + m.over + 'px anche dopo l adattamento, quindi la riga di chiusura si taglia');
    }
    if (m.lastRowH < 120) {
      problemi.push('pagina "' + pg.id + '": la riga di chiusura ha ' + m.lastRowH +
        'px, sotto i 120 utili — la matrice ci sta ma non si legge');
    }
  });

  totali++;
  if (dedotte) legacy++;
  if (problemi.length) {
    conProblemi++;
    console.log('\n' + f + '   ' + problemi.length + ' problemi');
    problemi.slice(0, 6).forEach(p => console.log('   · ' + p));
    if (problemi.length > 6) console.log('   · … e altri ' + (problemi.length - 6));
    problemi.forEach(p => {
      const c = /deve dare lo stesso valore/.test(p) ? 'stessa misura, valori diversi'
        : /numero rotto|ordine di grandezza/.test(p) ? 'numeri impossibili'
          : /fallback/.test(p) ? 'distribuzione uniforme finta'
            : /serie e piatta/.test(p) ? 'serie piatta'
              : /sfora di|riga di chiusura/.test(p) ? 'geometria: sfora il canvas'
                : 'KPI indistinguibili';
      perClasse[c] = (perClasse[c] || 0) + 1;
    });
  } else {
    console.log('\n' + f + '   pulito');
  }
}

/* Somma le colonne dei fatti quando il runtime non e interrogabile: basta ai gate che
   confrontano un rapporto coi suoi ingredienti. */
function totaliDaDati(spec, data) {
  const a = {}, cols = data.facts.cols, dims = data.dims || {};
  cols.forEach((c, i) => {
    if (c === 'y' || c === 'm' || dims[c]) return;
    a[c] = data.facts.rows.reduce((s, r) => s + (r[i] || 0), 0);
  });
  ((spec.model || {}).measures || []).forEach(m => {
    if (m.agg === 'sum') a[m.id] = a[m.field !== undefined ? m.field : m.id] || 0;
    else if (m.agg === 'diff') a[m.id] = (a[m.a] || 0) - (a[m.b] || 0);
    else if (m.agg === 'ratio') a[m.id] = a[m.den] ? a[m.num] / a[m.den] : 0;
  });
  return a;
}

console.log('\n' + '='.repeat(78));
console.log('RIEPILOGO  ·  ' + conProblemi + '/' + totali + ' file con problemi sui numeri');
if (legacy) console.log('   (' + legacy + ' file di un giro precedente: unita dedotta dal formato per poterli leggere)');
Object.entries(perClasse).sort((a, b) => b[1] - a[1])
  .forEach(([k, v]) => console.log('   ' + String(v).padStart(3) + '  ' + k));
console.log('');
process.exit(conProblemi ? 1 : 0);
