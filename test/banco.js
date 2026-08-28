#!/usr/bin/env node
/* Renderizza il banco di prova in out/banco/ e ne fa un indice cliccabile.
 *
 *   npm run banco
 *
 * Costo zero: le spec sono scritte a mano, il modello non viene mai chiamato. Serve ad avere
 * sempre qualcosa da aprire mentre i visual nuovi vengono costruiti — invece di scoprire come
 * sono venuti solo dopo un giro a pagamento.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { render, lint } = require('../engine/render.js');
const banco = require('../engine/specs/banco/index.js');
const fixtures = require('../engine/specs/index.js');

const out = path.join(__dirname, '..', 'out', 'banco');
fs.mkdirSync(out, { recursive: true });

const voci = [];
const rendi = (id, entry, gruppo) => {
  const data = entry.build();
  let html, errore = null;
  try { html = render(entry.spec, data); }
  catch (e) { errore = e.message.split('\n').slice(0, 3).join(' '); }
  if (html) fs.writeFileSync(path.join(out, id + '.html'), html);
  const note = html ? lint(entry.spec, data) : [];
  voci.push({ id, nome: entry.name || id, gruppo, kb: html ? Math.round(Buffer.byteLength(html) / 1024) : 0, errore, note });
  console.log('  ' + (errore ? 'ERRORE  ' : 'ok      ') + id.padEnd(24) +
    (errore ? errore.slice(0, 90) : voci[voci.length - 1].kb + 'KB'));
  note.forEach(n => console.log('          nota: ' + n));
};

console.log('\nBANCO DI PROVA');
Object.keys(banco).forEach(id => rendi(id, banco[id], 'banco'));
console.log('\nFIXTURE DELL\'EVAL (le stesse di npm run build:mockups, qui per confronto)');
Object.keys(fixtures).forEach(id => rendi(id, fixtures[id], 'fixture'));

/* L'indice: un file solo da aprire, con i mockup in iframe alla loro dimensione vera. Non usa i
   token della web app di proposito — questa e una pagina di servizio, non un pezzo di prodotto. */
const card = v => `
  <section>
    <h2>${v.nome} <small>${v.gruppo}</small></h2>
    ${v.errore
      ? `<p class="err">Il motore rifiuta questa spec:<br>${v.errore.replace(/</g, '&lt;')}</p>`
      : `<p><a href="${v.id}.html" target="_blank">apri a schermo intero</a> · ${v.kb}KB${v.note.length ? ' · ' + v.note.length + ' note' : ''}</p>
         <iframe src="${v.id}.html" width="1280" height="720" loading="lazy"></iframe>`}
  </section>`;

fs.writeFileSync(path.join(out, 'index.html'), `<!DOCTYPE html>
<html lang="it"><head><meta charset="utf-8"><title>Mockly — banco di prova</title>
<style>
  body{margin:0;padding:28px 32px;background:#F7F6F3;color:#1C1B19;
       font:14px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}
  h1{font-size:22px;margin:0 0 4px} .lede{color:#5A5751;margin:0 0 28px;max-width:66ch}
  section{margin:0 0 40px} h2{font-size:15px;margin:0 0 6px}
  h2 small{font-weight:400;color:#6A665F;font-size:12px;margin-left:6px}
  p{margin:0 0 10px;color:#5A5751;font-size:12.5px} a{color:#1C1B19}
  .err{color:#9B3A2E;border:1px solid #D3CFC6;padding:10px 12px;border-radius:6px;background:#FFF}
  iframe{border:1px solid #D3CFC6;border-radius:8px;background:#FFF;display:block}
</style></head><body>
<h1>Banco di prova</h1>
<p class="lede">Spec scritte a mano, nessun modello, nessun credito. I mockup sono interattivi:
si clicca dentro, le fette e le righe filtrano, il tasto destro sulla matrice apre il dettaglio.
Rigenerato con <code>npm run banco</code>.</p>
${voci.map(card).join('')}
</body></html>`);

const rotti = voci.filter(v => v.errore).length;
console.log('\nindice: out/banco/index.html' + (rotti ? '   (' + rotti + ' spec rifiutate)' : ''));
console.log('');
