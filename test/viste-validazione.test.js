#!/usr/bin/env node
/* UNA CARD A PIU VISTE SI GIUDICA DALLA SUA PRIMA VISTA — da qualunque parte arrivi la chiamata.
 *
 * Nel giro di Parsa (27 set 2026) l'app ha rifiutato una pagina che apriva con una card a due
 * viste, la prima delle quali era una colline: "scorecard apre con trend o colline… la prima riga
 * e invece [undefined:3, gauge:2]". Il render e il lint appianavano le viste prima di validare;
 * lib/validate.ts — il percorso dell'app — chiamava validate() direttamente, e la card restava
 * un visual senza tipo. Ora validate() appiana da se.
 *
 * Il gate e generale: preso ogni visual di ogni pagina del corpus, avvolto in una card con due
 * viste di se stesso, la spec deve restare valida — chiamando validate() come fa l'app, e
 * render() come fa il file. Qualunque controllo che guardi `v.type` senza appianare cade qui.
 */
'use strict';
const assert = require('assert');
const { casi } = require('./corpus.js');
const { render, validate } = require('../engine/render.js');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };
const clona = o => JSON.parse(JSON.stringify(o));

console.log('card a piu viste (il verdetto non cambia avvolgendo un visual)');

const avvolgi = (v, i) => {
  /* due viste dello stesso visual condividono misura e dimensione — tranne il funnel, che lega
     stadi e non una misura: per lui l'unico motivo onesto e pagina-sprecata (la regola, non il difetto) */
  const b = v.bind || {};
  const base = { span: v.span, h: v.h, id: 'avvolta' + i, motivo: (b.measure || b.dim) ? 'due-lenti' : 'pagina-sprecata' };
  const vista = etichetta => Object.assign(clona(v), { etichetta });
  return Object.assign(base, { viste: [vista('A'), vista('B')] });
};

ok('ogni visual del corpus, avvolto in una card a due viste, lascia la spec valida (validate e render)', () => {
  const guasti = [];
  let prove = 0;
  casi().forEach(c => {
    const data = c.caso.build();
    const pagine = c.caso.spec.pages.map((p, pi) => ({ pi })).concat(c.caso.spec.drill ? [{ drill: true }] : []);
    pagine.forEach(pg => {
      const righe = pg.drill ? c.caso.spec.drill.page.rows : c.caso.spec.pages[pg.pi].rows;
      righe.forEach((riga, ri) => riga.visuals.forEach((v, vi) => {
        if (v.viste) return;                         /* gia una card a viste */
        const s = clona(c.caso.spec);
        const r = pg.drill ? s.drill.page.rows[ri] : s.pages[pg.pi].rows[ri];
        r.visuals[vi] = avvolgi(v, vi);
        prove++;
        const dove = c.id + ' · ' + (pg.drill ? 'drill' : s.pages[pg.pi].id) + ' riga ' + (ri + 1) + ' ' + v.type;
        try { validate(s, data); } catch (e) { guasti.push(dove + ' [validate]: ' + e.message.split('\n').slice(1, 3).join(' ')); return; }
        try { render(s, data); } catch (e) { guasti.push(dove + ' [render]: ' + e.message.split('\n').slice(1, 3).join(' ')); }
      }));
    });
  });
  assert.ok(prove > 60, 'solo ' + prove + ' prove');
  assert.deepStrictEqual(guasti, [], guasti.join('\n       '));
});

ok('il caso reale: una pagina scorecard che apre con una card la cui prima vista e una colline', () => {
  const c = casi().find(x => x.id === 'archetipi/canonical-executive-summary') || casi()[0];
  const s = clona(c.caso.spec);
  const riga = s.pages[0].rows[0];
  const i = riga.visuals.findIndex(v => ['trend', 'colline', 'delta-card'].indexOf(v.type) >= 0 && v.span * 2 >= s.grid.columns);
  assert.ok(i >= 0, 'serve un caso con un trend dominante in apertura');
  riga.visuals[i] = avvolgi(riga.visuals[i], i);
  validate(s, c.caso.build());
});

console.log('  ' + n + ' checks');
