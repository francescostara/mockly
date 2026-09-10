#!/usr/bin/env node
/* IL CAMPIONARIO DA CURARE — genera, renderizza, e mette tutto in una griglia da guardare.
 *
 *   npm run catalogo            240 combinazioni
 *   npm run catalogo -- 120     quante se ne vogliono
 *
 * Cosa fa e cosa NON fa: sceglie le combinazioni VALIDE — quelle che stanno nel canvas, passano
 * i contrasti e non sforano la toolbar — e le mette una accanto all'altra. Non dice quali sono
 * belle: quello e un giudizio, e lo da una persona. L'indice ha una casella per ogni tessera; le
 * scelte restano nel browser e si copiano negli appunti come JSON, da incollare in
 * engine/catalogo.js accanto a un nome.
 *
 * Le combinazioni scartate si contano e si dicono: un'estetica che non regge nessun archetipo e
 * un'informazione, non un errore da nascondere.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { render } = require('../engine/render.js');
const CAT = require('../engine/catalogo.js');
const templates = require('../engine/templates/index.js');
const banco = require('../engine/specs/banco/index.js');

const QUANTE = parseInt(process.argv[2], 10) || 240;
const out = path.join(__dirname, '..', 'out', 'catalogo');
fs.mkdirSync(out, { recursive: true });
fs.readdirSync(out).filter(f => f.endsWith('.html')).forEach(f => fs.unlinkSync(path.join(out, f)));

/* Le basi di contenuto: un archetipo per ognuna, cosi il catalogo mostra pelli su composizioni
   diverse e non sei volte la stessa pagina ridipinta. */
const BASI = [
  { id: 'executive', archetipo: 'executive-summary', caso: templates['canonical-executive-summary'] },
  { id: 'funnel', archetipo: 'funnel', caso: templates['canonical-funnel'] },
  { id: 'quadranti', archetipo: 'quadrants', caso: templates['canonical-quadrants'] },
  { id: 'operativo', archetipo: 'operational', caso: templates['canonical-operational'] },
  { id: 'scorecard', archetipo: 'scorecard', caso: banco['delta-margine'] },
  { id: 'concentrazione', archetipo: 'scorecard', caso: banco['concentrazione'] }
];

/* i dati si costruiscono UNA volta per base: sono gli stessi sotto ogni pelle, ed e il punto —
   cambia la faccia, non il report */
BASI.forEach(b => { b.data = b.caso.build(); });

const combo = CAT.combinazioni(QUANTE);
const tessere = [];
const scartate = {};

console.log('\nCATALOGO — ' + QUANTE + ' combinazioni su ' + BASI.length + ' archetipi');
console.log('='.repeat(78));

combo.forEach((skin, i) => {
  const base = BASI[i % BASI.length];
  const id = base.id + '-' + String(i).padStart(3, '0');
  let html;
  const scarta = e => {
    const motivo = (e.message.split('\n')[1] || e.message).trim().slice(0, 80);
    scartate[motivo] = (scartate[motivo] || 0) + 1;
  };
  try {
    html = render(CAT.applica(base.caso.spec, skin), base.data);
  } catch (e) {
    /* Il Gate 6 — le chip dei filtri non entrano nella barra — non e un difetto della PELLE: e
       il compromesso vero di una shell piu stretta, e ha gia la sua cura, quella che il motore
       prescrive in produzione. Si riprova con le tendine una volta sola, invece di buttare via
       una combinazione valida per un dettaglio che ha una risposta nota. */
    if (!/Gate 6|toolbar/.test(e.message)) { scarta(e); return; }
    try {
      html = render(CAT.applica(base.caso.spec, skin, { tendine: true }), base.data);
    } catch (e2) { scarta(e2); return; }
  }
  fs.writeFileSync(path.join(out, id + '.html'), html);
  tessere.push({ id, base: base.id, archetipo: base.archetipo, skin, kb: Math.round(html.length / 1024) });
});

const tessera = t => `
    <figure data-id="${t.id}" data-skin='${JSON.stringify(t.skin)}'>
      <div class="tela"><iframe src="${t.id}.html" loading="lazy" scrolling="no"></iframe></div>
      <figcaption>
        <label><input type="checkbox" data-pick="${t.id}"> <b>${t.archetipo}</b></label>
        <span>${CAT.etichetta(t.skin)}</span>
      </figcaption>
    </figure>`;

/* Un indice per archetipo: trecento iframe in una pagina sola sono ingestibili anche pigri. */
const perArchetipo = {};
tessere.forEach(t => { (perArchetipo[t.archetipo] = perArchetipo[t.archetipo] || []).push(t); });

const STILE = `
  body{margin:0;padding:24px 28px;background:#F7F6F3;color:#1C1B19;
       font:13px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
  h1{font-size:20px;margin:0 0 4px} h2{font-size:14px;margin:26px 0 10px}
  .lede{color:#5A5751;margin:0 0 18px;max-width:78ch}
  .barra{position:sticky;top:0;background:#F7F6F3;padding:10px 0;border-bottom:1px solid #D3CFC6;
         display:flex;gap:10px;align-items:center;z-index:5;margin-bottom:14px}
  button{font:inherit;padding:6px 12px;border:1px solid #1C1B19;background:#1C1B19;color:#F7F6F3;
         border-radius:4px;cursor:pointer}
  button.ghost{background:transparent;color:#1C1B19}
  .conto{color:#5A5751}
  .griglia{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}
  figure{margin:0}
  .tela{width:100%;aspect-ratio:16/9;overflow:hidden;border:1px solid #D3CFC6;border-radius:6px;background:#FFF}
  .tela iframe{width:1280px;height:720px;border:0;transform:scale(.25);transform-origin:0 0}
  figure.scelta .tela{outline:3px solid #1C1B19;outline-offset:1px}
  figcaption{font-size:11px;color:#5A5751;padding:6px 2px;display:flex;flex-direction:column;gap:2px}
  figcaption b{color:#1C1B19}
  a{color:#1C1B19}`;

const SCRIPT = `
  const CHIAVE = 'pruva-catalogo';
  const scelte = new Set(JSON.parse(localStorage.getItem(CHIAVE) || '[]'));
  const salva = () => localStorage.setItem(CHIAVE, JSON.stringify([...scelte]));
  const dipingi = () => {
    document.querySelectorAll('figure').forEach(f => {
      const on = scelte.has(f.dataset.id);
      f.classList.toggle('scelta', on);
      const c = f.querySelector('input'); if (c) c.checked = on;
    });
    const n = document.getElementById('conto'); if (n) n.textContent = scelte.size + ' scelte';
  };
  document.addEventListener('change', e => {
    const id = e.target.dataset && e.target.dataset.pick; if (!id) return;
    if (e.target.checked) scelte.add(id); else scelte.delete(id);
    salva(); dipingi();
  });
  document.getElementById('copia').addEventListener('click', () => {
    const scelti = [...document.querySelectorAll('figure')].filter(f => scelte.has(f.dataset.id))
      .map(f => ({ id: f.dataset.id, skin: JSON.parse(f.dataset.skin) }));
    const testo = JSON.stringify(scelti, null, 2);
    navigator.clipboard.writeText(testo).then(
      () => { document.getElementById('conto').textContent = scelti.length + ' copiate negli appunti'; },
      () => { const t = document.createElement('textarea'); t.value = testo; document.body.appendChild(t); t.select(); }
    );
  });
  document.getElementById('pulisci').addEventListener('click', () => { scelte.clear(); salva(); dipingi(); });
  dipingi();`;

function pagina(titolo, corpo, lede) {
  return `<!DOCTYPE html>
<html lang="it"><head><meta charset="utf-8"><title>Pruva — catalogo · ${titolo}</title>
<style>${STILE}</style></head><body>
<h1>Catalogo delle pelli — ${titolo}</h1>
<p class="lede">${lede}</p>
<div class="barra">
  <button id="copia">Copia le scelte come JSON</button>
  <button class="ghost" id="pulisci">Azzera</button>
  <span class="conto" id="conto"></span>
</div>
${corpo}
<script>${SCRIPT}</script>
</body></html>`;
}

Object.keys(perArchetipo).forEach(a => {
  const corpo = '<div class="griglia">' + perArchetipo[a].map(tessera).join('') + '</div>';
  fs.writeFileSync(path.join(out, 'archetipo-' + a + '.html'),
    pagina(a, corpo, 'Stessa composizione, pelli diverse. Segna quelle che manderesti a un ' +
      'cliente: la selezione resta nel browser, e il tasto in alto la copia come JSON da ' +
      'incollare in <code>engine/catalogo.js</code>.'));
});

const indice = `<!DOCTYPE html>
<html lang="it"><head><meta charset="utf-8"><title>Pruva — catalogo</title>
<style>${STILE}</style></head><body>
<h1>Catalogo delle pelli</h1>
<p class="lede">${tessere.length} combinazioni valide su ${QUANTE} provate, distribuite su
${Object.keys(perArchetipo).length} archetipi. Sono <b>tutte renderizzate dal motore vero</b>:
cio che si vede qui e cio che riceverebbe un cliente. Il catalogo serve a CURARE — aprire,
guardare, segnare quelle buone — e le scelte diventano preset con un nome in
<code>engine/catalogo.js</code>.</p>
<h2>Per archetipo</h2>
<ul>${Object.keys(perArchetipo).map(a =>
  `<li><a href="archetipo-${a}.html">${a}</a> — ${perArchetipo[a].length} combinazioni</li>`).join('')}</ul>
<h2>Preset gia approvati</h2>
<ul>${CAT.PRESET_APPROVATI.map(p =>
  `<li><b>${p.nome}</b> — ${CAT.etichetta(p.skin)}</li>`).join('')}</ul>
</body></html>`;
fs.writeFileSync(path.join(out, 'index.html'), indice);

console.log('valide    ' + tessere.length + '/' + QUANTE);
Object.keys(scartate).sort((a, b) => scartate[b] - scartate[a]).forEach(m =>
  console.log('scartate  ' + String(scartate[m]).padStart(3) + '  ' + m));
console.log('\nindice: out/catalogo/index.html');
console.log('preset approvati finora: ' + CAT.PRESET_APPROVATI.length + '\n');
