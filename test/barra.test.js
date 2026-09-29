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
const { toolbarBudget, destraBarra } = require('../engine/render.js');
const builder = require('../engine/data-builder.js');
const { disponibile } = require('../lib/video-export.js');

let n = 0;
const okAsync = async (label, fn) => { await fn(); n++; console.log('  ok  ' + label); };
const clona = o => JSON.parse(JSON.stringify(o));

console.log('barra dei filtri (in Chrome: niente va a capo con tutti i filtri attivi)');

const { casi, renderCaso } = require('./corpus.js');

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

  /* UN SOLO GIRO. I due controlli qui sotto caricavano ogni mockup due volte, in due lingue, con
     un'attesa fissa di 120ms dopo ogni passo: mezzo minuto a ogni suite. Ora ogni mockup si
     carica una volta per lingua (dalla cache dei render), si misura la barra ferma, si confronta
     con la stima del motore, si accendono tutti i filtri e si rimisura. L'attesa e quella vera:
     due fotogrammi, cioe il layout fatto — non un numero di millisecondi scelto a occhio. */
  const layout = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  const guastiCapo = [], guastiStima = [], guastiTabelle = [];
  let viste = 0, misure = 0;
  for (const c of casi()) {
    const data = c.caso.build();
    for (const lingua of ['propria', 'en-US']) {
      const spec = clona(c.caso.spec);
      if (lingua !== 'propria') spec.meta.locale = lingua;
      await page.setContent(renderCaso(c, spec), { waitUntil: 'load' });
      await layout();
      const dove0 = c.id + ' (' + (lingua === 'propria' ? (spec.meta.locale || 'it') : lingua) + ')';

      /* IL CONTO DEL MOTORE NON E MAI PIU OTTIMISTA DELLA BARRA VERA. Il motore decide se una
         barra ci sta prima di disegnarla; se la sua stima e sotto la misura reale, approva barre
         che poi escono dal bordo — nel mockup di Nitish (28 set 2026) il bottone di destra
         sforava di 6px con una stima che diceva "ci sta". */
      const tb = toolbarBudget(spec, data);
      if (tb.axis === 'top') {
        const vero = await page.evaluate(() => {
          const gruppi = [...document.querySelectorAll('.fgrp')].map(g => { const f = g.querySelector('[data-f]'); return { id: f ? f.getAttribute('data-f').split(':')[0] : null, w: g.getBoundingClientRect().width }; });
          const r = document.getElementById('btnReset'), h = document.getElementById('btnHow');
          return { gruppi, dx: (r ? r.getBoundingClientRect().width : 0) + (h ? h.getBoundingClientRect().width : 0) };
        });
        vero.gruppi.forEach(g => {
          const it = tb.items.find(x => x.id === g.id);
          if (!it) return;
          misure++;
          if (it.w + 2 < g.w) guastiStima.push(dove0 + ': filtro ' + g.id + ' stimato ' + Math.round(it.w) + 'px, vero ' + Math.round(g.w) + 'px');
        });
        const dx = destraBarra(spec);
        if (dx + 2 < vero.dx) guastiStima.push(dove0 + ': bottoni di destra stimati ' + dx + 'px, veri ' + Math.round(vero.dx) + 'px');
      }

      /* CON TUTTI I FILTRI ATTIVI niente va a capo, i chip restano fermi, niente esce — e
         nemmeno il titolo della pagina cambia forma (il sottotitolo andava a capo quando le
         pillole del contesto crescevano: Fra, 28 set 2026) */
      const titolo = () => page.evaluate(() => ['hTtl', 'hSub'].map(id => { const e = document.getElementById(id); if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.height)]; }));
      const titoloPrima = await titolo();
      const prima = await page.evaluate(misura);
      if (!prima) continue;
      const nDim = await page.evaluate(tuttiIFiltri);
      await layout();
      const dopo = await page.evaluate(misura);
      const titoloDopo = await titolo();
      if (JSON.stringify(titoloPrima) !== JSON.stringify(titoloDopo))
        guastiCapo.push(dove0 + ': il titolo della pagina cambia forma coi filtri attivi (' + JSON.stringify(titoloPrima) + ' → ' + JSON.stringify(titoloDopo) + ')');
      viste++;
      const dove = c.id + ' (' + (lingua === 'propria' ? (spec.meta.locale || 'it') : lingua) + ', ' + nDim + ' filtri + trimestre)';
      /* una pillola nuova deve essere alta come quelle che c'erano gia */
      const pillola = (prima.controlli.find(k => /^ctxpill/.test(k.k)) || {}).h;
      dopo.controlli.forEach(k => {
        const era = prima.controlli.find(p => p.k === k.k);
        if (era && era.h !== k.h) guastiCapo.push(dove + ': ' + k.chi + ' da ' + era.h + 'px a ' + k.h + 'px (va a capo)');
        if (!era && pillola && /^ctxpill/.test(k.k) && k.h !== pillola) guastiCapo.push(dove + ': ' + k.chi + ' alta ' + k.h + 'px invece di ' + pillola + ' (va a capo)');
        if (k.fuori) guastiCapo.push(dove + ': ' + k.chi + ' esce dalla barra');
      });
      if (JSON.stringify(prima.chip) !== JSON.stringify(dopo.chip)) guastiCapo.push(dove + ': i chip dei filtri si spostano (' + prima.chip + ' → ' + dopo.chip + ')');
      if (dopo.trabocca) guastiCapo.push(dove + ': la barra trabocca');

      /* NESSUNA TABELLA TAGLIATA, su ogni pagina: il totale della matrice usciva mozzato di 2-17px
         quando le altezze stimate sbagliavano di qualche pixel (Muttahar e cinque pagine del corpus,
         29 set 2026). Il runtime ora stringe le righe dopo il disegno; qui si misura che basti. */
      await page.evaluate(() => { const r = document.getElementById('btnReset'); if (r) r.click(); });
      for (const pg of spec.pages) {
        await page.evaluate(id => { const n = document.querySelector('.navbtn[data-page="' + id + '"]'); if (n) n.click(); }, pg.id);
        await layout();
        const tagli = await page.evaluate(() => [...document.querySelectorAll('#page .mx')].filter(c => c.querySelector('table'))
          .map(c => c.scrollHeight - c.clientHeight).filter(x => x > 1));
        tagli.forEach(x => guastiTabelle.push(dove0 + ' · pagina ' + pg.id + ': una tabella e tagliata di ' + x + 'px'));
      }
    }
  }

  await okAsync('con tutti i filtri attivi nessun controllo va a capo, i chip restano fermi, niente esce dalla barra', async () => {
    assert.ok(viste >= 20, 'solo ' + viste + ' barre misurate');
    assert.deepStrictEqual([...new Set(guastiCapo)], [], [...new Set(guastiCapo)].join(String.fromCharCode(10) + '       '));
  });
  await okAsync('nessuna tabella e tagliata dal suo riquadro, su ogni pagina di ogni mockup', async () => {
    assert.deepStrictEqual([...new Set(guastiTabelle)], [], [...new Set(guastiTabelle)].join(String.fromCharCode(10) + '       '));
  });
  await okAsync('la stima della barra non e mai sotto la barra vera: gruppi di filtri e bottoni di destra', async () => {
    assert.ok(misure >= 10, 'solo ' + misure + ' gruppi misurati');
    assert.deepStrictEqual(guastiStima, [], guastiStima.join(String.fromCharCode(10) + '       '));
  });

  await browser.close();
  console.log('  ' + n + ' checks');
})().catch(e => { console.error(e); process.exit(1); });
