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
  const guastiCapo = [], guastiStima = [], guastiTabelle = [], guastiBarre = [];
  let viste2 = 0, menu = 0;
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
      /* OGNI MENU A TENDINA SI APRE ATTACCATO AL SUO BOTTONE E DENTRO LA FINESTRA. Nella rail il
         pannello si apriva in alto a sinistra largo tutta la pagina (Fra su Bodan, 3 ott 2026). */
      const nDd = await page.evaluate(() => document.querySelectorAll('[data-dd]').length);
      for (let di = 0; di < nDd; di++) {
        await page.evaluate(i => document.querySelectorAll('[data-dd]')[i].click(), di);
        await layout();
        const g = await page.evaluate(i => {
          const bt = document.querySelectorAll('[data-dd]')[i], pn = document.querySelector('.ddp.open');
          if (!pn) return 'il menu ' + bt.getAttribute('data-dd') + ' non si apre';
          const b = bt.getBoundingClientRect(), r = pn.getBoundingClientRect();
          const out = [];
          if (r.top < -1 || r.bottom > innerHeight + 1 || r.left < -1 || r.right > innerWidth + 1) out.push('esce dalla finestra');
          if (r.right < b.left || r.left > b.right) out.push('non sta sotto o sopra il suo bottone in orizzontale');
          const sotto = r.top >= b.bottom - 1 && r.top <= b.bottom + 12, sopra = r.bottom <= b.top + 1 && r.bottom >= b.top - 30;
          if (!sotto && !sopra) out.push('non e attaccato al bottone (bottone ' + Math.round(b.top) + '-' + Math.round(b.bottom) + ', menu ' + Math.round(r.top) + '-' + Math.round(r.bottom) + ')');
          if (r.width > Math.max(420, b.width * 3)) out.push('e largo ' + Math.round(r.width) + 'px');
          return out.length ? 'il menu ' + bt.getAttribute('data-dd') + ': ' + out.join(', ') : '';
        }, di);
        if (g) guastiBarre.push(dove0 + ' · ' + g);
        menu++;
        await page.evaluate(i => { const bt = document.querySelectorAll('[data-dd]')[i]; if (document.querySelector('.ddp.open')) bt.click(); }, di);
      }
      for (const pg of spec.pages) {
        await page.evaluate(id => { const n = document.querySelector('.navbtn[data-page="' + id + '"]'); if (n) n.click(); }, pg.id);
        await layout();
        const tagli = await page.evaluate(() => [...document.querySelectorAll('#page .mx')].filter(c => c.querySelector('table'))
          .map(c => c.scrollHeight - c.clientHeight).filter(x => x > 1));
        tagli.forEach(x => guastiTabelle.push(dove0 + ' · pagina ' + pg.id + ': una tabella e tagliata di ' + x + 'px'));
        /* LE BARRE SI CONFRONTANO E LE SCRITTE SONO INTERE (Fra su Luca, 3 ott 2026: barre sottili,
           sei colori, la scritta fuori dal riquadro). Su ogni hbar: barre alte almeno 8px, la piu
           lunga occupa almeno il 55% della card, un colore solo se non c'e un padre, ogni testo
           dentro il riquadro, valore e dettaglio senza sovrapporsi. */
        const barre = await page.evaluate(() => [...document.querySelectorAll('#page svg')].filter(s => s.querySelector('rect.barra')).map(s => {
          const R = s.getBoundingClientRect(), out = [];
          const bs = [...s.querySelectorAll('rect.barra')];
          const lmax = Math.max(...bs.map(r => r.getBoundingClientRect().width));
          if (bs.some(r => r.getBoundingClientRect().height < 7.9)) out.push('barre piu sottili di 8px');
          if (lmax < R.width * 0.55) out.push('la barra piu lunga occupa ' + Math.round(100 * lmax / R.width) + '% della card');
          const tit = (s.closest('.card') && s.closest('.card').querySelector('h3') || {}).textContent || '';
          const testi = [...s.querySelectorAll('text')].map(t => t.getBoundingClientRect());
          testi.forEach(t => { if (t.left < R.left - 0.5 || t.right > R.right + 0.5) out.push('un testo esce dal riquadro di ' + Math.round(Math.max(R.left - t.left, t.right - R.right)) + 'px'); });
          for (let i = 0; i < testi.length; i++) for (let j = i + 1; j < testi.length; j++) {
            const a = testi[i], b = testi[j];
            if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 2 && b.top < a.bottom - 2) out.push('due testi si sovrappongono');
          }
          return out.map(x => '"' + tit + '": ' + x);
        }).flat());
        barre.forEach(x => guastiBarre.push(dove0 + ' · pagina ' + pg.id + ' · ' + x));
        /* NIENTE ESCE DALLA SUA CARD: le ultime barre di un hbar sotto il fondo (Luca v4) */
        const fuori = await page.evaluate(() => [...document.querySelectorAll('#page .card')].map(k => {
          const R = k.getBoundingClientRect(), sv = k.querySelector('svg');
          if (!sv) return '';
          const S2 = sv.getBoundingClientRect();
          return S2.bottom > R.bottom + 1 || S2.right > R.right + 1 ? '"' + ((k.querySelector('h3') || {}).textContent || '') + '": il grafico esce dalla card di ' + Math.round(Math.max(S2.bottom - R.bottom, S2.right - R.right)) + 'px' : '';
        }).filter(Boolean));
        fuori.forEach(x => guastiBarre.push(dove0 + ' · pagina ' + pg.id + ' · ' + x));
        /* il sottotitolo della pagina sta su una riga sola */
        const sub = await page.evaluate(() => { const e = document.getElementById('hSub'); if (!e) return 0; const lh = parseFloat(getComputedStyle(e).lineHeight) || 14; return e.getBoundingClientRect().height > lh * 1.5 ? Math.round(e.getBoundingClientRect().height) : 0; });
        if (sub) guastiBarre.push(dove0 + ' · pagina ' + pg.id + ' · il sottotitolo va a capo (' + sub + 'px): accorcialo');
        /* LA LINEA DEL COLLINE SI STACCA DALLE COLONNE, e il target ha il suo colore (Fra su Luca,
           3 ott 2026: l'ambra accanto alle colonne oliva del 2025 non aveva contrasto) */
        const linee = await page.evaluate(() => {
          const rgb = c => { const m = /rgba?\((\d+), (\d+), (\d+)/.exec(c); return m ? [+m[1], +m[2], +m[3]] : null; };
          const dist = (a, b) => { const x = rgb(a), y = rgb(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) / 441.7; };
          return [...document.querySelectorAll('#page svg')].filter(s => s.querySelector('path.l2l') || s.querySelector('[data-et]')).map(s => {
            const out = [];
            if (!s.querySelector('path.l2l')) { const R0 = s.getBoundingClientRect(), t0 = [...s.querySelectorAll('text')].map(x => x.getBoundingClientRect()).filter(x => x.width);
              t0.forEach(x => { if (x.left < R0.left - 0.5 || x.right > R0.right + 0.5) out.push('una scritta esce dal riquadro'); });
              for (let i = 0; i < t0.length; i++) for (let j = i + 1; j < t0.length; j++) { const a = t0[i], b = t0[j]; if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 2 && b.top < a.bottom - 2) out.push('due scritte si sovrappongono'); }
              return out; }
            const lc = getComputedStyle(s.querySelector('path.l2l')).stroke;
            const col = [...s.querySelectorAll('rect.hit')].map(r => getComputedStyle(r).fill);
            const cur = col.length ? col[col.length - 1] : null;
            if (cur && dist(lc, cur) < 0.2) out.push('la linea (' + lc + ') non si stacca dalle colonne (' + cur + ')');
            const t = s.querySelector('line.tgt');
            if (t && getComputedStyle(t).stroke !== lc) out.push('il target non ha il colore della linea');
            /* le scritte dentro il riquadro e mai una sopra l'altra: "EBITDA margin" copriva la tacca
               del 22% e il target (Bodan, 3 ott 2026). I veli delle etichette non contano. */
            const R = s.getBoundingClientRect(), tx = [...s.querySelectorAll('text')].map(x => x.getBoundingClientRect()).filter(x => x.width);
            tx.forEach(x => { if (x.left < R.left - 0.5 || x.right > R.right + 0.5) out.push('una scritta esce dal riquadro'); });
            for (let i = 0; i < tx.length; i++) for (let j = i + 1; j < tx.length; j++) {
              const a = tx[i], b = tx[j];
              if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 2 && b.top < a.bottom - 2) out.push('due scritte si sovrappongono');
            }
            return out;
          }).flat();
        });
        linee.forEach(x => guastiBarre.push(dove0 + ' · pagina ' + pg.id + ' · colline: ' + x));
        /* i gradini di un ponte si vedono: con l'asse da zero erano strisce di un pixel (Bodan) */
        const gradini = await page.evaluate(() => [...document.querySelectorAll('#page rect.wfs')].filter(r => r.getBoundingClientRect().height < 4).length);
        if (gradini) guastiBarre.push(dove0 + ' · pagina ' + pg.id + ' · waterfall: ' + gradini + ' gradini piu bassi di 4px');
        viste2 += await page.evaluate(() => [...document.querySelectorAll('#page svg')].filter(s => s.querySelector('rect.barra')).length);
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
  await okAsync('ogni hbar: barre spesse e lunghe abbastanza da confrontarle, scritte intere e separate; la linea del colline contrasta con le colonne; ogni menu a tendina si apre attaccato al suo bottone', async () => {
    assert.ok(viste2 >= 10, 'solo ' + viste2 + ' hbar misurate');
    assert.ok(menu >= 10, 'solo ' + menu + ' menu a tendina aperti');
    assert.deepStrictEqual([...new Set(guastiBarre)].slice(0, 10), [], [...new Set(guastiBarre)].slice(0, 10).join(String.fromCharCode(10) + '       '));
  });
  await okAsync('la stima della barra non e mai sotto la barra vera: gruppi di filtri e bottoni di destra', async () => {
    assert.ok(misure >= 10, 'solo ' + misure + ' gruppi misurati');
    assert.deepStrictEqual(guastiStima, [], guastiStima.join(String.fromCharCode(10) + '       '));
  });

  await browser.close();
  console.log('  ' + n + ' checks');
})().catch(e => { console.error(e); process.exit(1); });
