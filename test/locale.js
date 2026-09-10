#!/usr/bin/env node
/* IL CICLO LOCALE — renderizza i giri, li giudica, e dice l'esito PRIMA che qualcuno apra i file.
 *
 *   npm run locale
 *
 * Protocollo e regola di progetto: LOCAL-EVAL.md. In breve: nessun credito API, mai. Claude fa
 * da modello seguendo la stessa procedura del system prompt, il motore renderizza, e qui si
 * risponde alla stessa domanda del giro a pagamento — "quanti ne manderei a un cliente?" —
 * gratis.
 *
 * Il verdetto e volutamente severo: un mockup con un numero rotto o una tabella tagliata non e
 * "quasi spedibile", e' da rivedere. Meglio un no netto qui che un cliente che si ferma su una
 * cifra assurda.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { render, lint, measurePage } = require('../engine/render.js');
const GN = require('./gates-numbers.js');
const GG = require('./gates-generic.js');

const dir = path.join(__dirname, '..', 'engine', 'specs', 'locale');
const out = path.join(__dirname, '..', 'out', 'locale');
fs.mkdirSync(out, { recursive: true });

const giri = fs.readdirSync(dir).filter(f => f.endsWith('.js') && f !== 'index.js').sort();
const esiti = [], schede = [];

console.log('\nCICLO LOCALE — ' + giri.length + ' giri  ·  zero crediti API');
console.log('='.repeat(78));

for (const f of giri) {
  const id = f.replace(/\.js$/, '');
  const caso = require(path.join(dir, f));
  const data = caso.build();
  let html, problemi = [], note = [];

  try { html = render(caso.spec, data); }
  catch (e) {
    esiti.push({ id, nome: caso.name, spedibile: false, problemi: [e.message.split('\n').slice(1, 4).join(' ')] });
    console.log('\n' + id + '\n   RIFIUTATO dal motore: ' + e.message.split('\n')[1]);
    continue;
  }
  fs.writeFileSync(path.join(out, id + '.html'), html);
  note = lint(caso.spec, data);

  /* i gate sui numeri, sul DOM vivo: e cio che vede chi apre il file */
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true });
  let agg = null;
  try { const A = dom.window.MK && dom.window.MK.__A; if (A) agg = A.agg(A.slice({})); } catch { /* niente */ }
  problemi = GN.tutti(dom.window.document, caso.spec, agg);
  dom.window.close();

  /* la geometria: la riga di chiusura tagliata non si vede in jsdom, si legge dal conto */
  (caso.spec.pages || []).forEach(pg => {
    let m; try { m = measurePage(caso.spec, data, pg.id); } catch { return; }
    if (m.over > 0) problemi.push(`pagina "${pg.id}": sfora di ${m.over}px`);
    if (m.lastRowH < 120) problemi.push(`pagina "${pg.id}": riga di chiusura a ${m.lastRowH}px`);
  });

  schede.push(GG.scheda(caso.spec, id, caso.nicchia));
  const spedibile = problemi.length === 0;
  esiti.push({ id, nome: caso.name, spedibile, problemi, note, kb: Math.round(html.length / 1024) });

  console.log('\n' + id + '   ' + (spedibile ? 'SPEDIBILE' : 'DA RIVEDERE') + '   ' +
    Math.round(html.length / 1024) + 'KB');
  console.log('   ' + caso.name);
  problemi.forEach(p => console.log('   · ' + p));
  note.forEach(nn => console.log('   nota: ' + nn));
}

/* I gate anti-generico: si giudicano sull'insieme dei giri, non sul singolo. Con due o tre
   file le soglie dicono poco, ma il conto e quello vero e cresce col registro. */
if (schede.length > 1) {
  console.log('\n' + '='.repeat(78));
  console.log('VARIETA DELLA COLLEZIONE');
  GG.insieme(schede).forEach(e => console.log('   ' + (e.passa ? 'ok   ' : 'FAIL ') + e.id.padEnd(22) + e.testo));
}

/* L'indice: un posto solo da aprire dopo aver letto il verdetto qui sopra. */
const card = e => `
  <section>
    <h2>${e.nome} <small>${e.spedibile ? 'spedibile' : 'da rivedere'}</small></h2>
    ${e.problemi && e.problemi.length ? `<p class="err">${e.problemi.join('<br>')}</p>` : ''}
    <p><a href="${e.id}.html" target="_blank">apri a schermo intero</a>${e.kb ? ' · ' + e.kb + 'KB' : ''}</p>
    ${e.kb ? `<iframe src="${e.id}.html" width="1280" height="720" loading="lazy"></iframe>` : ''}
  </section>`;

fs.writeFileSync(path.join(out, 'index.html'), `<!DOCTYPE html>
<html lang="it"><head><meta charset="utf-8"><title>Pruva — ciclo locale</title>
<style>
  body{margin:0;padding:28px 32px;background:#F7F6F3;color:#1C1B19;
       font:14px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}
  h1{font-size:22px;margin:0 0 4px} .lede{color:#5A5751;margin:0 0 28px;max-width:70ch}
  section{margin:0 0 40px} h2{font-size:15px;margin:0 0 6px}
  h2 small{font-weight:400;color:#6A665F;font-size:12px;margin-left:6px}
  p{margin:0 0 10px;color:#5A5751;font-size:12.5px} a{color:#1C1B19}
  .err{color:#9B3A2E;border:1px solid #D3CFC6;padding:10px 12px;border-radius:6px;background:#FFF}
  iframe{border:1px solid #D3CFC6;border-radius:8px;background:#FFF;display:block}
</style></head><body>
<h1>Ciclo locale</h1>
<p class="lede">Brief veri, ragionamento dichiarato nel commento in testa a ogni spec, motore
vero, gate veri. Nessun credito API. Protocollo e registro dei giri in <code>LOCAL-EVAL.md</code>;
si rigenera con <code>npm run locale</code>.</p>
${esiti.map(card).join('')}
</body></html>`);

const rivedere = esiti.filter(e => !e.spedibile).length;
console.log('\n' + '='.repeat(78));
console.log('VERDETTO  ·  ' + (esiti.length - rivedere) + '/' + esiti.length + ' spedibili');
console.log('indice: out/locale/index.html\n');
process.exit(rivedere ? 1 : 0);
