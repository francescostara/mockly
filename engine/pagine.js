/* LA RIGA KPI E LA GRIGLIA, PAGINA PER PAGINA (Fra, 23 ott 2026: il flusso guidato sceglie riga KPI e
 * numero di KPI pagina per pagina; skill/references/flusso.md).
 *
 * Prima c'era una banda KPI sola per tutto il report e la griglia aveva tante colonne quante le sue
 * card. Una pagina puo ora dichiarare la sua riga: `page.kpi = { mode, cards }` (mode full · value ·
 * off) e, quando non ha card, le sue colonne: `page.columns`. Una pagina senza `kpi` si comporta come
 * sempre: la banda del report, o nessuna banda con `kpiBand: false`, e la griglia del report.
 *
 * Tutto il motore chiede a queste funzioni, non a spec.kpiBand e spec.grid.columns direttamente:
 * cosi la regola vive in un posto solo. Il runtime ne ha una copia identica (stesso nome, stesse
 * regole), provata dallo stesso gate.
 */
'use strict';

const MODI = ['full', 'value', 'off'];

/** Le card KPI che la pagina mostra (vuoto se la riga e spenta). */
function kpiDi(spec, pg) {
  if (pg && pg.kpi) return pg.kpi.mode === 'off' ? [] : (pg.kpi.cards || []);
  if (pg && pg.kpiBand === false) return [];
  return spec.kpiBand || [];
}
/** full · value · off */
function modoKpi(spec, pg) { return pg && pg.kpi ? (pg.kpi.mode || 'full') : (kpiDi(spec, pg).length ? 'full' : 'off'); }
/** Le colonne della griglia della pagina. */
function colonneDi(spec, pg) {
  if (pg && pg.columns) return pg.columns;
  if (pg && pg.kpi) {
    const k = kpiDi(spec, pg);
    if (k.length) return k.reduce((a, c) => a + (c.span || 1), 0);
  }
  return (spec.grid && spec.grid.columns) || 1;
}
/** Tutte le card KPI del report, banda del report e righe delle pagine, senza doppioni di id. */
function tutteKpi(spec) {
  const out = [], visti = new Set();
  const pagine = (spec.pages || []).concat(spec.drill && spec.drill.page ? [spec.drill.page] : []);
  (spec.kpiBand || []).concat(...pagine.map(p => (p.kpi && p.kpi.cards) || [])).forEach(k => {
    const chiave = (k.id || '') + '|' + k.measure;
    if (!visti.has(chiave)) { visti.add(chiave); out.push(k); }
  });
  return out;
}
/** Ogni pagina usa la banda del report? (serve a decidere se kpiBand e obbligatoria) */
function servonoBanda(spec) {
  const pagine = (spec.pages || []).concat(spec.drill && spec.drill.page ? [spec.drill.page] : []);
  return pagine.some(p => !p.kpi && p.kpiBand !== false);
}

/** I rifiuti delle righe KPI per pagina. */
function valida(spec) {
  const e = [];
  const pagine = (spec.pages || []).concat(spec.drill && spec.drill.page ? [spec.drill.page] : []);
  pagine.forEach(pg => {
    if (pg.columns !== undefined && (!Number.isInteger(pg.columns) || pg.columns < 1 || pg.columns > 12))
      e.push(`page "${pg.id}": columns e un intero fra 1 e 12 (le colonne della griglia della pagina)`);
    if (pg.panels !== undefined) {
      const ST = require('./stili.js');
      if (pg.panels.header !== undefined && ST.ID_HEADER.indexOf(pg.panels.header) < 0) e.push(`page "${pg.id}": panels.header e ${ST.ID_HEADER.join(' · ')}, non "${pg.panels.header}"`);
      if (pg.panels.subtitle !== undefined && typeof pg.panels.subtitle !== 'boolean') e.push(`page "${pg.id}": panels.subtitle e true o false`);
    }
    if (!pg.kpi) return;
    const k = pg.kpi;
    if (k.style !== undefined && require('./stili.js').ID_CARD.indexOf(k.style) < 0) e.push(`page "${pg.id}": kpi.style e uno degli stili delle card (${require('./stili.js').ID_CARD.join(' · ')}), non "${k.style}"`);
    if (MODI.indexOf(k.mode || 'full') < 0) e.push(`page "${pg.id}": kpi.mode e ${MODI.join(' · ')}, non "${k.mode}"`);
    if (k.cards !== undefined && !Array.isArray(k.cards)) e.push(`page "${pg.id}": kpi.cards e un elenco di card KPI`);
    const cards = Array.isArray(k.cards) ? k.cards : [];
    if (cards.length > 6) e.push(`page "${pg.id}": al massimo 6 card KPI per pagina (qui ${cards.length})`);
    if ((k.mode === 'off' || !cards.length) && !pg.columns)
      e.push(`page "${pg.id}": senza card KPI la pagina dichiara le sue colonne (page.columns): e il layout a deciderle`);
    if (cards.length && k.mode !== 'off' && pg.columns) {
      const s = cards.reduce((a, c) => a + (c.span || 1), 0);
      if (s !== pg.columns) e.push(`page "${pg.id}": le card KPI occupano ${s} colonne e la pagina ne dichiara ${pg.columns}: la griglia e quella delle card`);
    }
  });
  return e;
}

module.exports = { MODI, kpiDi, modoKpi, colonneDi, tutteKpi, servonoBanda, valida };
