/* Headless QA harness — references/qa-checklist.md, run over every eval brief.
 *
 * Gate 1  state sweep: no NaN/undefined/Infinity in ANY page x date x filter x drill state
 * Gate 2  tie-out: the generator reconciles, and the matrix total equals the KPI card
 * Gate 3  fit: the page's declared heights fit inside 720px
 * Gate 5  every filter is LIVE: a KPI card's TEXT changes, not just a CSS class
 * Gate 6  toolbar width budget + "more than ~5 members means a dropdown"
 * plus the objective structural assertions from skill/evals/evals.json.
 */
'use strict';
const { JSDOM } = require('jsdom');
const { render, toolbarBudget, lint } = require('../engine/render.js');

const BAD = /NaN|undefined|Infinity/;

function open(html) {
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true });
  const w = dom.window, d = w.document;
  const q = s => d.querySelector(s);
  const qa = s => [...d.querySelectorAll(s)];
  const fire = (el, type) => el && el.dispatchEvent(new w.MouseEvent(type, { bubbles: true, cancelable: true }));
  return {
    dom, w, d, q, qa, fire,
    clk: s => fire(typeof s === 'string' ? q(s) : s, 'click'),
    rmb: s => fire(typeof s === 'string' ? q(s) : s, 'contextmenu'),
    page: () => q('#page').innerHTML,
    kpi: () => qa('#page .kpi .v').map(e => e.textContent).join('|'),
    close: () => dom.window.close()
  };
}

function runCase(id, fixture, evalCase) {
  const R = { id, checks: [], states: 0, fail: 0, notes: [] };
  const ok = (label, cond, detail) => {
    R.checks.push({ label, pass: !!cond, detail: cond ? '' : (detail || '') });
    if (!cond) R.fail++;
  };

  const spec = fixture.spec, data = fixture.build();
  const html = render(spec, data);
  const B = open(html);
  R.bytes = Buffer.byteLength(html);
  R.lines = html.split('\n').length;

  /* ---------- the brief's own expectations ---------- */
  if (evalCase) {
    ok('language matches the brief', (spec.meta.locale || '').slice(0, 2) === evalCase.expected_language,
      `${spec.meta.locale} vs ${evalCase.expected_language}`);
    ok('aesthetic matches the brief', (evalCase.expected_aesthetic || '').includes(spec.aesthetic),
      `${spec.aesthetic} vs "${evalCase.expected_aesthetic}"`);
  }

  /* ---------- objective structure ---------- */
  ok('canvas is exactly 1280x720', /#canvas\{width:1280px;height:720px/.test(html.replace(/\s*\n\s*/g, '')));
  ok('single self-contained file (no external requests)',
    !/<script[^>]+src=|<link[^>]+href=|https?:\/\//i.test(html));
  ok('synthetic-data watermark present', B.q('.wm') && B.q('.wm').textContent.length > 10);
  ok('Year>Quarter>Month dropdown slicer present',
    !!B.q('#slBtn') && !!B.q('#slYear [data-y]') && B.qa('#slQtr [data-q]').length === 5 && B.qa('#slMon [data-m]').length === 13);
  ok('render produced a page', B.page().length > 500, String(B.page().length));

  const rows = B.qa('#page > .row');
  const kpiCards = B.qa('#page > .row:first-child .kpi');
  ok('KPI band is the full-width top row', kpiCards.length === spec.kpiBand.length &&
    Math.round(kpiCards.reduce((a, c) => a + parseFloat(c.style.width), 0) + spec.grid.gutter * (kpiCards.length - 1)) === spec.grid.contentWidth,
    `${kpiCards.length} cards`);
  ok('KPI cards label the variance basis (YoY/MoM)',
    B.qa('#page .kpi .d').length > 0 && B.qa('#page .kpi .d').every(e => /YoY|MoM/.test(e.textContent)));
  ok('no content row holds more than 3 visuals',
    rows.slice(1).every(r => r.children.length <= 3), rows.slice(1).map(r => r.children.length).join(','));
  ok('every row is on the shared column grid (edges align top to bottom)',
    rows.every(r => Math.round([...r.children].reduce((a, c) => a + (parseFloat(c.style.width) || 0), 0)
      + spec.grid.gutter * (r.children.length - 1)) === spec.grid.contentWidth),
    rows.map(r => Math.round([...r.children].reduce((a, c) => a + (parseFloat(c.style.width) || 0), 0))).join(','));

  const last = rows[rows.length - 1];
  const closingTable = last && last.querySelector('table');
  ok('page closes with the performance matrix (totals row + drill-through)',
    !!closingTable && !!last.querySelector('tr.tot') && !!last.querySelector('[data-drill]'));
  if (closingTable && Math.round(parseFloat(last.children[0].style.width)) !== spec.grid.contentWidth)
    R.notes.push('closing matrix is not full-width (mirrors the canonical example, not the SKILL.md rule)');

  ok('tooltips on every data element', B.qa('#page [data-tip]').length > 15 &&
    B.qa('#page .hit').every(e => e.hasAttribute('data-tip') || e.closest('[data-tip]')),
    `${B.qa('#page [data-tip]').length} tips`);

  /* ---------- Gate 3: height budget ---------- */
  const shellH = 58 + (spec.aesthetic === 'corporate-sober' ? 0 : 46 + 40);
  const declared = spec.pages[0].rows.reduce((a, r) => a + Math.max(...r.visuals.map(v => (v.h || 0) + 34)), 0);
  const budget = 720 - shellH - 28 - spec.grid.gutter * spec.pages[0].rows.length;
  ok('page fits the 720px canvas', declared + 90 <= budget, `${declared + 90}px of ${budget}px`);

  /* ---------- Gate 6: toolbar budget ---------- */
  const tb = toolbarBudget(spec, data);
  ok('toolbar fits the content width', !tb.overflow, `${tb.used}px / ${tb.available}px`);
  ok('dimensions with more than 5 members use a dropdown, not chips',
    (spec.filters.dims || []).every(f => (data.dims[f.id] || []).length <= 5 || f.control === 'dropdown'));

  /* ---------- Gate 5: every filter is live ---------- */
  const base = B.kpi();
  (spec.filters.dims || []).forEach(fd => {
    data.dims[fd.id].slice(0, 3).forEach(mb => {
      const before = B.kpi();
      B.clk(`#page [data-f="${fd.id}:${mb.id}"]`) || B.clk(`[data-f="${fd.id}:${mb.id}"]`);
      const after = B.kpi();
      ok(`filter ${fd.id}:${mb.id} is live (KPI text changes)`, before !== after, `${before} -> ${after}`);
      B.clk('#btnReset');
    });
  });
  ['[data-q="1"]', '[data-q="3"]', '[data-m="2"]', '[data-y]'].forEach(sel => {
    const before = B.kpi();
    B.clk(sel);
    ok(`date control ${sel} is live`, before !== B.kpi(), `${before} -> ${B.kpi()}`);
    B.clk('#btnReset');
  });
  B.clk('[data-y="' + spec.filters.date.default.y + '"]');
  B.clk('#btnReset');

  /* ---------- the timeline exemption ---------- */
  const monthLabels = () => {
    const svg = B.qa('#page .card svg')[0];
    return svg ? svg.querySelectorAll('text').length : 0;
  };
  const fullSeries = monthLabels();
  B.clk('[data-m="7"]');
  ok('trend keeps its full series under a month filter (timeline exemption)', monthLabels() === fullSeries,
    `${fullSeries} -> ${monthLabels()}`);
  ok('a month selection switches the basis to MoM', /MoM/.test(B.q('#page .kpi .d').textContent));
  B.clk('#btnReset');

  /* ---------- Gate 2: tie-out ---------- */
  Object.keys(data.tieOut || {}).filter(k => /_delta$/.test(k)).forEach(k =>
    ok(`tie-out ${k.replace('_delta', '')} reconciles`, Math.abs(data.tieOut[k]) < 1, String(data.tieOut[k])));
  const matrixSpec = [].concat(...spec.pages.map(p => [].concat(...p.rows.map(r => r.visuals))))
    .filter(v => v.type === 'matrix')[0];
  if (matrixSpec) {
    const col = matrixSpec.bind.columns.findIndex(c => !c.kind && spec.kpiBand.some(k => k.measure === c.measure));
    if (col >= 0) {
      const measure = matrixSpec.bind.columns[col].measure;
      const kpiIdx = spec.kpiBand.findIndex(k => k.measure === measure);
      const totalCell = B.qa('#page tr.tot td')[col + 1];
      const kpiVal = B.qa('#page .kpi .v')[kpiIdx];
      ok(`matrix total for "${measure}" equals the KPI card`, totalCell && kpiVal && totalCell.textContent === kpiVal.textContent,
        `${totalCell && totalCell.textContent} vs ${kpiVal && kpiVal.textContent}`);
    }
  }

  /* ---------- Gate 1: the state sweep ---------- */
  const badStates = [];
  const scan = tag => {
    R.states++;
    const h = B.page();
    if (BAD.test(h)) badStates.push(tag);
  };
  const dims = spec.filters.dims || [];
  const pages = spec.pages.map(p => p.id);
  pages.forEach(pid => {
    B.clk(`[data-page="${pid}"]`);
    data.years.forEach(y => {
      B.clk(`[data-y="${y}"]`);
      [null, 0, 1, 2, 3].forEach(qv => {
        B.clk(qv === null ? '[data-q="all"]' : `[data-q="${qv}"]`);
        scan(`${pid}/${y}/q${qv}`);
        [null, qv === null ? 7 : qv * 3 + 1].forEach(mv => {
          B.clk(mv === null ? '[data-m="all"]' : `[data-m="${mv}"]`);
          scan(`${pid}/${y}/q${qv}/m${mv}`);
          dims.forEach(fd => data.dims[fd.id].forEach(mb => {
            B.clk(`[data-f="${fd.id}:${mb.id}"]`);
            scan(`${pid}/${y}/q${qv}/m${mv}/${fd.id}:${mb.id}`);
            /* drill through from this very state, then come back */
            const target = B.q('#page [data-drill]');
            if (target) {
              B.rmb(target);
              scan(`${pid}/${y}/q${qv}/m${mv}/${fd.id}:${mb.id}/drill`);
              B.clk('#btnBack');
            }
            B.clk(`[data-f="${fd.id}:${mb.id}"]`);   /* toggle off */
          }));
        });
      });
    });
    B.clk('#btnReset');
  });
  ok(`state sweep clean (${R.states} states)`, badStates.length === 0, badStates.slice(0, 4).join(' · '));

  /* ---------- drill-through mechanics ---------- */
  B.clk('#btnReset');
  const beforeTitle = B.q('#hTtl').textContent;
  B.rmb('#page [data-drill]');
  const drilled = { back: !!B.q('#btnBack'), title: B.q('#hTtl').textContent, kpis: B.qa('#page .kpi').length };
  ok('right-click a matrix row opens a drill page with a back button',
    drilled.back && drilled.title !== beforeTitle && drilled.kpis === spec.kpiBand.length, JSON.stringify(drilled));
  B.clk('#btnBack');
  ok('the back button returns to the origin page', B.q('#hTtl').textContent === beforeTitle && !B.q('#btnBack'));

  /* ---------- determinism ---------- */
  ok('render is deterministic (same spec+data -> identical bytes)', render(spec, fixture.build()) === html);

  /* ---------- output economy (SKILL.md: well under 60KB for a single page) ---------- */
  ok('output stays under 60KB', R.bytes < 60 * 1024, `${(R.bytes / 1024).toFixed(1)}KB`);

  R.advisories = lint(spec, data).concat(R.notes);
  B.close();
  return R;
}

module.exports = { runCase, open };
