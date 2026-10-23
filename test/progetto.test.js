#!/usr/bin/env node
/* IL FLUSSO GUIDATO, FASE A — progetto, mutateSpec, annulla/ripeti (skill/references/flusso.md,
 * docs/pruva-prodotto-editor-PER-CLAUDE-CODE.md).
 *
 *  1. ogni tipo di azione: applica, annulla, ripeti danno esattamente gli stati di prima e di dopo;
 *  2. un'azione non valida e rifiutata, lo stato non cambia, il messaggio nomina il campo;
 *  3. sequenze casuali (seme fisso) su ogni progetto del corpus: dopo ogni azione accettata la spec
 *     compilata passa la validazione del motore;
 *  4. ogni codice del catalogo layout si legge, somma alla griglia, e la pagina compilata passa;
 *  5. determinismo: lo stesso progetto da lo stesso HTML;
 *  6. il progetto sopravvive al JSON;
 *  7. dati forniti: il progetto di Nicola compila sui dati veri, i KPI inseribili sono le sue misure;
 *  8. gli stili con grafico che la misura non regge si rifiutano col motivo;
 *  9. la riga KPI e la griglia per pagina: due pagine con righe diverse in uno stesso report.
 */
'use strict';
const assert = require('assert');
const { JSDOM } = require('jsdom');
const A = require('../engine/azioni.js');
const P = require('../engine/progetto.js');
const C = require('../engine/compila.js');
const LY = require('../engine/layout.js');
const ST = require('../engine/stili.js');
const { render, validate } = require('../engine/render.js');
const PR = require('../engine/specs/progetti/index.js');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };
console.log('flusso guidato, fase A (progetto, mutateSpec, annulla e ripeti)');
const J = o => JSON.stringify(o);

/* un'azione valida per ogni tipo, sul progetto di Teigor */
const ESEMPI = [
  { tipo: 'setBrief', valore: 'Un brief diverso' }, { tipo: 'setTitolo', valore: 'Picking 2' }, { tipo: 'setScopo', valore: 'Scopo' },
  { tipo: 'setNicchia', valore: 'logistica' }, { tipo: 'setLingua', valore: 'en' }, { tipo: 'aggiungiPagina', titolo: 'Nuova' },
  { tipo: 'eliminaPagina', pagina: 'p2' }, { tipo: 'spostaPagina', pagina: 'p2', a: 0 }, { tipo: 'setPagina', pagina: 'p1', campo: 'subtitle', valore: 'Sotto' },
  { tipo: 'scegliTemplate', valore: 'tecnico-scuro' }, { tipo: 'setKpiRow', pagina: 'p1', valore: 'value' }, { tipo: 'setCardStyle', pagina: 'p1', valore: 'ruled' },
  { tipo: 'setKpiCount', pagina: 'p1', valore: 3 }, { tipo: 'setKpi', pagina: 'p1', posizione: 0, valore: 'fpo' }, { tipo: 'setPanelHeader', pagina: 'p1', valore: 'band' },
  { tipo: 'setPanelSubtitle', pagina: 'p1', valore: false }, { tipo: 'setLayout', pagina: 'p1', valore: '2+2/4' }, { tipo: 'setArchetipo', pagina: 'p1', valore: 'operational' },
  { tipo: 'setDati', valore: null }
];

ok('ogni tipo di azione: applica, annulla e ripeti danno gli stati esatti di prima e di dopo', () => {
  const coperti = new Set();
  ESEMPI.forEach(az => {
    const s0 = A.storia(PR['teigor-picking']);
    const r = A.mutateSpec(s0, az);
    assert.ok(r.ok, az.tipo + ': ' + r.errori.join('; '));
    const dopo = r.storia.presente;
    const u = A.annulla(r.storia);
    assert.strictEqual(J(u.presente), J(s0.presente), az.tipo + ': annulla non torna allo stato di prima');
    assert.strictEqual(J(A.ripeti(u).presente), J(dopo), az.tipo + ': ripeti non torna allo stato di dopo');
    coperti.add(az.tipo);
  });
  assert.deepStrictEqual(A.TIPI.filter(t => !coperti.has(t)), [], 'azioni senza un caso');
});

ok('un\'azione non valida e rifiutata: lo stato resta quello di prima e il messaggio nomina il campo', () => {
  const s0 = A.storia(PR['teigor-picking']);
  const casi = [
    [{ tipo: 'setKpiRow', pagina: 'p1', valore: 'meta' }, /kpiRow/],
    [{ tipo: 'setLayout', pagina: 'p1', valore: '3+3/4' }, /layout "3\+3\/4"/],
    [{ tipo: 'setKpiCount', pagina: 'p1', valore: 9 }, /da 0 a 6/],
    [{ tipo: 'setCardStyle', pagina: 'p1', valore: 'sparkle' }, /cardStyle "sparkle"/],
    [{ tipo: 'setTitolo', valore: '' }, /struttura\.title/],
    [{ tipo: 'scegliTemplate', valore: 'nessuno' }, /template "nessuno"/],
    [{ tipo: 'setPagina', pagina: 'p9', campo: 'title', valore: 'x' }, /pagina "p9"/],
    [{ tipo: 'nonEsiste' }, /sconosciuta/]
  ];
  casi.forEach(([az, re]) => {
    const r = A.mutateSpec(s0, az);
    assert.ok(!r.ok, J(az) + ' doveva essere rifiutata');
    assert.strictEqual(r.storia, s0, J(az) + ': lo stato e cambiato');
    assert.ok(r.errori.some(e => re.test(e)), J(az) + ': ' + r.errori.join(' | '));
  });
  /* l'ultima pagina non si elimina */
  const s1 = A.storia(PR['minimo-senza-kpi']);
  assert.ok(!A.mutateSpec(s1, { tipo: 'eliminaPagina', pagina: 'p1' }).ok);
});

ok('sequenze casuali su ogni progetto del corpus: dopo ogni azione accettata la spec passa il motore', () => {
  let seme = 20261023;
  const rnd = k => { seme = (seme * 1103515245 + 12345) & 0x7fffffff; return seme % k; };
  let accettate = 0, rifiutate = 0;
  Object.entries(PR).forEach(([id, p]) => {
    let s = A.storia(p);
    for (let i = 0; i < 60; i++) {
      const pagine = s.presente.struttura.pages.map(x => x.id), pg = pagine[rnd(pagine.length)];
      const b = s.presente.build[pg] || C.buildDi(s.presente, s.presente.struttura.pages.find(x => x.id === pg));
      const nc = b.kpiRow === 'off' || !b.kpis.length ? LY.colonne(b.layout) : b.kpis.length;
      const lay = LY.catalogo(nc);
      const kpi = C.kpiDisponibili(s.presente);
      const scelte = [
        { tipo: 'setKpiRow', pagina: pg, valore: P.KPI_ROW[rnd(3)] },
        { tipo: 'setKpiCount', pagina: pg, valore: rnd(Math.min(6, kpi.length) + 1) },
        { tipo: 'setLayout', pagina: pg, valore: lay.length ? lay[rnd(lay.length)].codice : '4' },
        { tipo: 'setCardStyle', pagina: pg, valore: ST.ID_CARD[rnd(ST.ID_CARD.length)] },
        { tipo: 'setPanelHeader', pagina: pg, valore: ST.ID_HEADER[rnd(4)] },
        { tipo: 'scegliTemplate', valore: P.templates()[rnd(P.templates().length)].id },
        { tipo: 'aggiungiPagina', titolo: 'Page ' + i }, { tipo: 'eliminaPagina', pagina: pg },
        b.kpis.length ? { tipo: 'setKpi', pagina: pg, posizione: rnd(b.kpis.length), valore: kpi[rnd(kpi.length)].id } : { tipo: 'setPanelSubtitle', pagina: pg, valore: !!rnd(2) }
      ];
      const r = A.mutateSpec(s, scelte[rnd(scelte.length)]);
      if (!r.ok) { rifiutate++; assert.strictEqual(r.storia, s); continue; }
      accettate++;
      s = r.storia;
      const { spec, data } = C.compila(s.presente);
      assert.doesNotThrow(() => validate(spec, data), id + ' dopo ' + i + ' azioni');
    }
  });
  assert.ok(accettate >= 120, 'solo ' + accettate + ' azioni accettate (' + rifiutate + ' rifiutate)');
});

ok('ogni codice del catalogo layout si legge, somma alla griglia, e la pagina compilata passa il motore', () => {
  let provati = 0;
  [1, 2, 3, 4, 5, 6].forEach(nc => {
    LY.catalogo(nc).forEach(l => {
      assert.deepStrictEqual(LY.valida(l.codice, nc), [], l.codice);
      assert.strictEqual(LY.scrivi(LY.leggi(l.codice)), l.codice);
      const s = A.storia(PR['teigor-picking']);
      const r1 = A.mutateSpec(s, { tipo: 'setKpiCount', pagina: 'p1', valore: nc });
      assert.ok(r1.ok, 'kpi ' + nc + ': ' + r1.errori.join('; '));
      const r2 = A.mutateSpec(r1.storia, { tipo: 'setLayout', pagina: 'p1', valore: l.codice });
      assert.ok(r2.ok, nc + ' colonne, layout ' + l.codice + ': ' + r2.errori.join('; '));
      provati++;
    });
  });
  assert.ok(provati >= 60, 'solo ' + provati + ' layout provati');
  assert.ok(LY.valida('3+2/4', 5).length && LY.valida('x', 5).length && LY.valida('1+1+1+1/4', 4).length, 'codici sbagliati accettati');
});

ok('determinismo e JSON: lo stesso progetto da lo stesso HTML, e sopravvive al passaggio in JSON', () => {
  Object.values(PR).forEach(p => {
    const a = C.compila(p), b = C.compila(JSON.parse(JSON.stringify(p)));
    assert.strictEqual(render(a.spec, a.data), render(b.spec, b.data));
  });
  let s = A.storia(PR['teigor-picking']);
  s = A.mutateSpec(s, { tipo: 'setKpiRow', pagina: 'p2', valore: 'off' }).storia;
  assert.strictEqual(J(JSON.parse(J(s.presente))), J(s.presente));
});

ok('dati forniti: il progetto di Nicola compila sui dati veri, e i KPI inseribili sono le sue misure', () => {
  const p = PR['nicola-dati'], { spec, data } = C.compila(p);
  assert.strictEqual(data.years[0], 1970);
  assert.deepStrictEqual(data.mensili, []);
  assert.deepStrictEqual(C.kpiDisponibili(p).map(k => k.id), ['pil', 'pop', 'pc', 'ky', 'si']);
  const dom = new JSDOM(render(spec, data), { runScripts: 'dangerously', pretendToBeVisual: true });
  const v = dom.window.document.querySelector('.kpi .v').textContent;
  assert.ok(/\$/.test(v), 'la prima card e il PIL: ' + v);
  dom.window.close();
});

ok('gli stili con grafico che la misura non regge si rifiutano col motivo', () => {
  const p = PR['nicola-dati'], { spec, data } = C.compila(p);
  const m = id => spec.model.measures.find(x => x.id === id);
  assert.ok(ST.supporta('ring', m('si'), data).ok, 'una quota regge l\'anello');
  assert.ok(!ST.supporta('ring', m('pil'), data).ok, 'un importo non regge l\'anello');
  assert.ok(!ST.supporta('stack', m('pc'), data).ok, 'un rapporto non si scompone in parti');
  const r = A.mutateSpec(A.storia(p), { tipo: 'setCardStyle', pagina: 'p1', valore: 'ring' });
  assert.ok(!r.ok && /needs a share/.test(r.errori.join(' ')), r.errori.join(' | '));
});

ok('riga KPI e griglia per pagina: due pagine con righe diverse nello stesso report, ognuna allineata alla sua', () => {
  let s = A.storia(PR['teigor-picking']);
  s = A.mutateSpec(s, { tipo: 'setKpiCount', pagina: 'p1', valore: 5 }).storia;
  const r = A.mutateSpec(s, { tipo: 'setKpiRow', pagina: 'p2', valore: 'off' });
  assert.ok(r.ok, r.errori.join('; '));
  const { spec, data } = C.compila(r.storia.presente);
  const dom = new JSDOM(render(spec, data), { runScripts: 'dangerously', pretendToBeVisual: true });
  const doc = dom.window.document;
  assert.strictEqual(doc.querySelectorAll('#page .kpi').length, 5, 'pagina 1: cinque card');
  doc.querySelector('.navbtn[data-page="p2"]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  assert.strictEqual(doc.querySelectorAll('#page .kpi').length, 0, 'pagina 2: nessuna riga KPI');
  dom.window.close();
  /* la riga "value" nasconde le variazioni */
  const rv = A.mutateSpec(A.storia(PR['teigor-picking']), { tipo: 'setKpiRow', pagina: 'p1', valore: 'value' });
  const cv = C.compila(rv.storia.presente);
  const dv = new JSDOM(render(cv.spec, cv.data), { runScripts: 'dangerously', pretendToBeVisual: true });
  assert.ok(dv.window.document.querySelector('#page .row.kv .kpi'), 'la riga value ha la classe che nasconde le variazioni');
  dv.window.close();
});

console.log('  ' + n + ' checks');
