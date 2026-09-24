#!/usr/bin/env node
/* LA BARRA IN ALTO NON SI MUOVE QUANDO SI FILTRA — in un Chrome vero, perche jsdom non ha layout.
 *
 * Segnalato registrando il video del sito (filtro-organico in inglese, shell "top"): senza filtri
 * la barra ci stava; con un filtro attivo comparivano le pillole del contesto ("Platf. Instagram",
 * "Qtr Q3") nella stessa riga, la riga non bastava piu, e "How to use this mockup", "Compare YoY"
 * e "Reset filters" andavano a capo — da 26 a 40 pixel — mentre i chip dei filtri scivolavano a
 * sinistra sotto il cursore. Chi clicca vede l'interfaccia che si rompe proprio mentre la usa.
 *
 * Il gate: con TUTTI i filtri attivi insieme (un membro per ogni dimensione, piu il trimestre),
 * nessun controllo della barra cambia altezza, i chip dei filtri non si spostano, e niente esce
 * dalla barra. Su ogni mockup del repo, nella sua lingua e in inglese — le etichette inglesi sono
 * piu lunghe, ed e li che il caso e nato.
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { render } = require('../engine/render.js');
const { disponibile } = require('../lib/video-export.js');

let n = 0;
const okAsync = async (label, fn) => { await fn(); n++; console.log('  ok  ' + label); };
const clona = o => JSON.parse(JSON.stringify(o));

console.log('barra dei filtri (in Chrome: niente va a capo con tutti i filtri attivi)');

function casi() {
  const out = [];
  const agg = (fonte, m) => Object.keys(m).filter(k => k[0] !== '_').forEach(k => out.push({ id: fonte + '/' + k, caso: m[k] }));
  agg('archetipi', require('../engine/templates/index.js'));
  agg('banco', require('../engine/specs/banco/index.js'));
  agg('eval', require('../engine/specs/index.js'));
  const dir = path.join(__dirname, '..', 'engine', 'specs', 'locale');
  fs.readdirSync(dir).filter(f => f.endsWith('.js') && f !== 'index.js').forEach(f => out.push({ id: 'locale/' + f.replace(/\.js$/, ''), caso: require(path.join(dir, f)) }));
  return out;
}

/* Gira nella pagina: la fotografia della barra che contiene "Azzera filtri" (la riga dei filtri
   nella shell top, l'intestazione nelle altre) — altezza di ogni controllo, posizione dei chip. */
function misura() {
  const reset = document.getElementById('btnReset');
  if (!reset) return null;
  const barra = reset.parentElement;
  const rb = barra.getBoundingClientRect();
  /* un controllo si riconosce dall'id, o dalla classe e dal posto fra i suoi simili: non dal
     testo, che cambia proprio col filtro ("2025" diventa "Q3 2025") */
  const conta = {};
  /* una pillola che non ci sta cede il posto intera, su una riga nascosta: non e un difetto,
     e il comportamento voluto — non si misura */
  const nascosta = e => { const w = e.closest('.ctxwrap'); return !!w && e.getBoundingClientRect().top >= w.getBoundingClientRect().bottom - 1; };
  const controlli = [...barra.querySelectorAll('button, .ctxpill')].filter(e => !nascosta(e)).map(e => {
    const r = e.getBoundingClientRect();
    const base = e.id || (e.className || e.tagName);
    const k = e.id ? base : base + '#' + (conta[base] = (conta[base] || 0) + 1);
    return { chi: k + ' "' + e.textContent.trim().slice(0, 24) + '"', k, h: Math.round(r.height), fuori: r.right > rb.right + 1 || r.bottom > rb.bottom + 1 };
  });
  const chip = [...barra.querySelectorAll('.fgrp')].map(e => Math.round(e.getBoundingClientRect().left));
  return { controlli, chip, trabocca: barra.scrollWidth > barra.clientWidth + 1 };
}

/* Gira nella pagina: tutti i filtri attivi insieme — il primo membro di ogni dimensione e il
   terzo trimestre. I click passano dal runtime come quelli veri (delega sugli eventi). */
function tuttiIFiltri() {
  const clic = el => el && el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  const dims = new Set();
  [...document.querySelectorAll('[id^="fl_"] [data-f]')].forEach(e => {
    const d = e.getAttribute('data-f').split(':')[0];
    if (!dims.has(d)) { dims.add(d); clic(e); }
  });
  clic(document.querySelector('#slQtr [data-q="2"]'));
  return dims.size;
}

(async () => {
  if (!disponibile().ok) { console.log('  --  saltato: qui non c e un Chrome da guidare'); console.log('  0 checks'); return; }
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();

  await okAsync('con tutti i filtri attivi nessun controllo va a capo, i chip restano fermi, niente esce dalla barra', async () => {
    const guasti = [];
    let viste = 0;
    for (const c of casi()) {
      for (const lingua of ['propria', 'en-US']) {
        const spec = clona(c.caso.spec);
        if (lingua !== 'propria') spec.meta.locale = lingua;
        await page.setContent(render(spec, c.caso.build()), { waitUntil: 'load' });
        await page.waitForTimeout(120);
        const prima = await page.evaluate(misura);
        if (!prima) continue;
        const nDim = await page.evaluate(tuttiIFiltri);
        await page.waitForTimeout(120);
        const dopo = await page.evaluate(misura);
        viste++;
        const dove = c.id + ' (' + (lingua === 'propria' ? (spec.meta.locale || 'it') : lingua) + ', ' + nDim + ' filtri + trimestre)';
        /* una pillola nuova deve essere alta come quelle che c'erano gia */
        const pillola = (prima.controlli.find(k => /^ctxpill/.test(k.k)) || {}).h;
        dopo.controlli.forEach(k => {
          const era = prima.controlli.find(p => p.k === k.k);
          if (era && era.h !== k.h) guasti.push(dove + ': ' + k.chi + ' da ' + era.h + 'px a ' + k.h + 'px (va a capo)');
          if (!era && pillola && /^ctxpill/.test(k.k) && k.h !== pillola) guasti.push(dove + ': ' + k.chi + ' alta ' + k.h + 'px invece di ' + pillola + ' (va a capo)');
          if (k.fuori) guasti.push(dove + ': ' + k.chi + ' esce dalla barra');
        });
        if (JSON.stringify(prima.chip) !== JSON.stringify(dopo.chip)) guasti.push(dove + ': i chip dei filtri si spostano (' + prima.chip + ' → ' + dopo.chip + ')');
        if (dopo.trabocca) guasti.push(dove + ': la barra trabocca');
      }
    }
    assert.ok(viste >= 20, 'solo ' + viste + ' barre misurate');
    assert.deepStrictEqual([...new Set(guasti)], [], [...new Set(guasti)].join(String.fromCharCode(10) + '       '));
  });

  await browser.close();
  console.log('  ' + n + ' checks');
})().catch(e => { console.error(e); process.exit(1); });
