#!/usr/bin/env node
/* IL CLIC DEL VIDEO COLPISCE CIO CHE MIRA — in un Chrome vero, perche jsdom non ha geometria.
 *
 * Nato da un video del sito: sulla ciambella di filtro-organico il registratore cliccava il centro
 * del riquadro della fetta, cioe il foro, e il video mostrava un clic senza effetto. Il test prova
 * che il caso e reale (il centro del riquadro della fetta NON la colpisce), che il punto scelto
 * ora la colpisce, e che su ogni mockup del repo ogni visual che la scheda dichiara cliccabile ha
 * un punto che lo colpisce davvero.
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { render } = require('../engine/render.js');
const SCHEDA = require('../engine/scheda.js');
const B = require('../scripts/bersaglio.js');
const { disponibile } = require('../lib/video-export.js');

let n = 0;
const okAsync = async (label, fn) => { await fn(); n++; console.log('  ok  ' + label); };

console.log('bersaglio del clic (in Chrome: il punto colpisce davvero la forma)');

const { casi, renderCaso } = require('./corpus.js');

(async () => {
  if (!disponibile().ok) { console.log('  --  saltato: qui non c e un Chrome da guidare'); console.log('  0 checks'); return; }
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  const apri = async html => { await page.setContent(html, { waitUntil: 'load' }); await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))); };   /* layout fatto: due fotogrammi, non un'attesa fissa */

  const fo = require('../engine/specs/banco/filtro-organico.js');
  await apri(render(fo.spec, fo.build()));
  const donut = SCHEDA.piano(fo.spec, fo.build()).cross.find(c => c.tipo === 'donut');

  await okAsync('il caso e reale: il centro del riquadro della fetta cade nel foro', async () => {
    const vuoto = await page.evaluate(({ sel, tit }) => {
      const card = [...document.querySelectorAll('#page .card')].find(c => ((c.querySelector('.ch h3') || {}).textContent || '').indexOf(tit) === 0);
      const fette = [...card.querySelectorAll(sel)].sort((a, b) => { const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(); return rb.width * rb.height - ra.width * ra.height; });
      const r = fette[0].getBoundingClientRect(), h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !(h === fette[0] || fette[0].contains(h));
    }, { sel: donut.sel, tit: donut.titolo });
    assert.ok(vuoto, 'la fetta piu grande ora contiene il suo centro: il caso di prova non prova piu niente');
  });

  await okAsync('il punto scelto colpisce la fetta, e resta marcato per il controllo prima del clic', async () => {
    const r = await page.evaluate(B.trova, { sel: donut.sel, dentro: donut.titolo, quale: 'grande' });
    assert.ok(r && !r.errore, JSON.stringify(r));
    assert.strictEqual(r.spostato, true, 'il punto doveva essere spostato fuori dal foro');
    assert.ok(await page.evaluate(B.ancoraLui, { x: r.x, y: r.y }), 'sotto il punto deve esserci la fetta');
    assert.strictEqual(await page.evaluate(B.ancoraLui, { x: 5, y: 715 }), false, 'e fuori dalla fetta il controllo deve dire di no');
  });

  await okAsync('su ogni mockup, ogni visual cliccabile della prima pagina ha un punto che lo colpisce', async () => {
    const guasti = [];
    for (const c of casi()) {
      const data = c.caso.build();
      await apri(renderCaso(c));
      const prima = c.caso.spec.pages[0].id;
      for (const x of SCHEDA.piano(c.caso.spec, data).cross.filter(k => k.page === prima)) {
        const r = await page.evaluate(B.trova, { sel: x.sel, dentro: x.titolo, quale: x.tipo === 'matrix' ? 'primo' : 'grande' });
        if (!r) continue;                        /* nessun elemento: lo copre test/video.test.js */
        if (r.errore) guasti.push(c.id + ' · ' + x.tipo + ' "' + x.titolo + '": ' + r.errore);
      }
    }
    assert.deepStrictEqual(guasti, [], guasti.join(String.fromCharCode(10) + '       '));
  });

  await browser.close();
  console.log('  ' + n + ' checks');
})().catch(e => { console.error(e); process.exit(1); });
