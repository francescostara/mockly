#!/usr/bin/env node
/* LA ROUTE DEL FLUSSO GUIDATO, senza Next (lib/progetto-api.js, app/api/progetto/route.ts).
 *
 *  1. un report nuovo: storia, anteprima e tutte le scelte delle schermate;
 *  2. un'azione rifiutata restituisce la storia di prima, identica, col motivo;
 *  3. annulla e ripeti passano dalla route come in locale;
 *  4. l'anteprima di ogni template sul report dell'utente, senza toccare la sua storia;
 *  5. il CSV dell'utente si legge senza configurazione; senza anno si rifiuta col motivo;
 *  6. LE AZIONI IN FILA (lib/coda.js): due campi lasciati di seguito non si cancellano a vicenda.
 *     Il difetto e nato nel browser: senza fila la seconda risposta sostituiva la prima.
 */
'use strict';
const assert = require('assert');
const api = require('../lib/progetto-api.js');
const { creaCoda } = require('../lib/coda.js');
const P = require('../engine/progetto.js');
const ST = require('../engine/stili.js');

let n = 0;
const ok = (label, fn) => Promise.resolve(fn()).then(() => { n++; console.log('  ok  ' + label); });
const J = o => JSON.stringify(o);
console.log('route del flusso guidato (lib/progetto-api.js)');

(async () => {
  const r0 = api.gestisci({ op: 'nuovo', testo: 'picking', niche: 'logistica', pagine: ['Where time is lost', 'Re-slotting'] });

  await ok('un report nuovo: storia, anteprima e tutte le scelte delle schermate', () => {
    assert.ok(r0.ok, r0.errori.join('; '));
    assert.ok(/^<!DOCTYPE html>/.test(r0.html));
    const s = r0.scelte;
    assert.strictEqual(s.templates.length, P.templates().length);
    assert.ok(s.templates.filter(t => t.consigliato).length >= 1 && s.templates.filter(t => t.consigliato).length <= 2, 'da uno a due template consigliati');
    assert.ok(s.templates.every(t => t.nome && t.nome === P.template(t.id).name), 'i template portano il nome inglese');
    assert.deepStrictEqual(s.card.map(c => c.id), ST.ID_CARD);
    assert.ok(s.card.every(c => c.ok || c.motivo), 'uno stile spento dice perche');
    assert.strictEqual(s.header.length, 4);
    assert.strictEqual(s.layout.filter(l => l.consigliato).length, 1, 'un layout consigliato');
    assert.ok(s.layout.every(l => l.codice.split('/').every(r => r.split('+').reduce((a, b) => a + +b, 0) === s.colonne)), 'ogni layout riempie la griglia della pagina');
  });

  await ok('un\'azione rifiutata restituisce la storia di prima, identica, col motivo', () => {
    const r = api.gestisci({ op: 'azione', storia: r0.storia, pagina: 'p1', azione: { tipo: 'setLayout', pagina: 'p1', valore: '3+3/4' } });
    assert.ok(!r.ok);
    assert.strictEqual(J(r.storia), J(r0.storia));
    assert.ok(/3\+3\/4/.test(r.errori.join(' ')), r.errori.join(' | '));
    assert.ok(r.html && r.scelte, 'anche il rifiuto riporta anteprima e scelte, per ridisegnare lo stato di prima');
  });

  await ok('annulla e ripeti passano dalla route come in locale', () => {
    const a = api.gestisci({ op: 'azione', storia: r0.storia, pagina: 'p1', azione: { tipo: 'setCardStyle', pagina: 'p1', valore: 'wash' } });
    assert.ok(a.ok && a.scelte.puoAnnullare && !a.scelte.puoRipetere);
    const u = api.gestisci({ op: 'annulla', storia: a.storia, pagina: 'p1' });
    assert.strictEqual(J(u.storia.presente), J(r0.storia.presente));
    assert.ok(u.scelte.puoRipetere);
    const rr = api.gestisci({ op: 'ripeti', storia: u.storia, pagina: 'p1' });
    assert.strictEqual(J(rr.storia.presente), J(a.storia.presente));
    /* la pagina aggiunta diventa la pagina corrente */
    const ag = api.gestisci({ op: 'azione', storia: r0.storia, pagina: 'p1', azione: { tipo: 'aggiungiPagina', titolo: 'More' } });
    assert.strictEqual(ag.scelte.pagina, 'p3');
  });

  await ok('l\'anteprima di ogni template sul report dell\'utente, senza toccare la sua storia', () => {
    const prima = J(r0.storia);
    P.templates().forEach(t => {
      const r = api.gestisci({ op: 'anteprimaTemplate', storia: r0.storia, template: t.id });
      assert.ok(r.ok && /^<!DOCTYPE html>/.test(r.html), t.id + ': ' + (r.errori || []).join('; '));
    });
    assert.strictEqual(J(r0.storia), prima);
  });

  await ok('il CSV dell\'utente si legge senza configurazione; senza anno si rifiuta col motivo', () => {
    const csv = 'year,region,sales,orders\n2023,North,100,10\n2023,South,80,9\n2024,North,120,12\n2024,South,90,8\n2025,North,130,13\n2025,South,95,9';
    const d = api.datiDaCsv(csv);
    assert.strictEqual(d.anno, 'year');
    assert.deepStrictEqual(d.campi, ['sales', 'orders']);
    assert.deepStrictEqual(d.dimensioni.map(x => x.id + ':' + x.membri.length), ['region:2']);
    const r = api.gestisci({ op: 'nuovo', testo: 'x', niche: 'retail', csv });
    assert.ok(r.ok, (r.errori || []).join('; '));
    assert.deepStrictEqual(r.scelte.kpi.map(k => k.id), ['sales', 'orders']);
    const no = api.gestisci({ op: 'nuovo', testo: 'x', niche: 'retail', csv: 'region,sales\nNorth,1\nSouth,2' });
    assert.ok(!no.ok && /year column/.test(no.errori[0]), (no.errori || []).join('; '));
  });

  await ok('le azioni in fila: due campi lasciati di seguito non si cancellano a vicenda', async () => {
    /* il server finto risponde dopo un tempo diverso a ogni richiesta, come la rete */
    const lento = (body, ms) => new Promise(res => setTimeout(() => res(api.gestisci(body)), ms));
    const due = [{ tipo: 'setPagina', pagina: 'p2', campo: 'title', valore: 'Re-slotting plan' }, { tipo: 'setPagina', pagina: 'p2', campo: 'content', valore: 'locations to move' }];
    /* senza fila, com'era: entrambe costruite sulla storia del clic, vince l'ultima a tornare */
    let st = r0.storia;
    const presa = st;
    const esiti = await Promise.all(due.map((a, i) => lento({ op: 'azione', storia: presa, azione: a, pagina: 'p2' }, i ? 5 : 30)));
    st = esiti[0].storia;   /* la prima azione torna per ultima */
    const p2 = st.presente.struttura.pages.find(p => p.id === 'p2');
    assert.ok(!(p2.title === 'Re-slotting plan' && p2.content === 'locations to move'), 'il caso di controllo deve perdere un campo');
    /* con la fila: ogni richiesta legge la storia piu recente quando parte */
    const metti = creaCoda();
    let cur = r0.storia;
    await Promise.all(due.map((a, i) => metti(async () => { const r = await lento({ op: 'azione', storia: cur, azione: a, pagina: 'p2' }, i ? 5 : 30); cur = r.storia; return r.ok; })));
    const q = cur.presente.struttura.pages.find(p => p.id === 'p2');
    assert.strictEqual(q.title, 'Re-slotting plan');
    assert.strictEqual(q.content, 'locations to move');
    assert.strictEqual(cur.passato.length, 2, 'due passi nella storia, uno per campo');
  });

  await ok('l\'anteprima segue la pagina scelta anche quando il report non cambia (app/progetto/page.tsx)', () => {
    /* Difetto visto nel video della fase B: clic sulla linguetta "Overview", pannello di sinistra
       sulla pagina 1, anteprima ferma sulla 2 — stesso HTML, l'iframe non si ricarica, onLoad non
       scatta. La cura e un effetto che riapre la pagina a ogni cambio; qui si controlla che ci sia.
       La prova nel browser sta nello script del video della fase, che confronta i titoli. */
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'app', 'progetto', 'page.tsx'), 'utf8');
    const corpo = src.slice(src.indexOf('function Anteprima'), src.indexOf('/* ---------- 3. Template'));
    assert.ok(/useCallback\(\(\) => \{[\s\S]*navbtn\[data-page[\s\S]*\}, \[pagina\]\)/.test(corpo), 'la funzione che apre la pagina non dipende da `pagina`');
    assert.ok(/useEffect\(\(\) => \{ apri\(\); \}, \[apri\]\)/.test(corpo), 'nessun effetto riapre la pagina quando cambia');
  });

  console.log('  ' + n + ' checks');
})().catch(e => { console.error(e); process.exit(1); });
