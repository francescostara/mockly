/* render(spec, data) -> a single self-contained HTML file.
 *
 * Deterministic: the same (spec, data) yields byte-identical output. No clock, no randomness,
 * no npm dependency reaches the output — only the runtime regions the spec actually uses.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const RUNTIME_PATH = path.join(__dirname, 'runtime.js');

/* ---------- region bundler: core + only the chart helpers this spec uses ---------- */
function regions(src) {
  const out = {};
  const re = /\/\*#region ([a-z:0-9]+)\*\/\r?\n([\s\S]*?)\r?\n\/\*#endregion\*\//g;
  let m;
  while ((m = re.exec(src))) out[m[1]] = m[2];
  return out;
}
function bundle(types, opts) {
  const R = regions(fs.readFileSync(RUNTIME_PATH, 'utf8'));
  const parts = [R.core];
  types.forEach(t => {
    const k = 'chart:' + t;
    if (!R[k]) throw new Error(`render: unknown visual type "${t}"`);
    parts.push(R[k]);
  });
  const src = parts.join('\n');
  return (opts && opts.raw) ? src : strip(src);
}

/* Comment/indent stripper for the inlined engine — the repo keeps the commentary, the shipped
 * file does not (output economy). Line structure is preserved, so no ASI hazard. Falls back to
 * the original source if the result does not compile. */
function strip(src) {
  let out = '', i = 0, prev = '';
  const isRegexPos = () => !prev || '(,=:[!&|?{};+-*%~^<>\n'.includes(prev);
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? src.length : e + 2; continue; }
    if (c === '/' && d === '/') { const e = src.indexOf('\n', i); i = e < 0 ? src.length : e; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c; let j = i + 1;
      while (j < src.length) { if (src[j] === '\\') j += 2; else if (src[j] === q) break; else j++; }
      out += src.slice(i, j + 1); prev = q; i = j + 1; continue;
    }
    if (c === '/' && isRegexPos()) {
      let j = i + 1, cls = false;
      while (j < src.length) {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === '[') cls = true; else if (src[j] === ']') cls = false;
        else if (src[j] === '/' && !cls) break;
        else if (src[j] === '\n') break;
        j++;
      }
      while (j + 1 < src.length && /[gimsuy]/.test(src[j + 1])) j++;
      out += src.slice(i, j + 1); prev = '/'; i = j + 1; continue;
    }
    out += c;
    if (!/\s/.test(c)) prev = c; else if (c === '\n') prev = '\n';
    i++;
  }
  const lean = squeeze(out).split('\n').map(l => l.trim()).filter(Boolean).join('\n');
  try { new Function(lean); } catch (err) { return src; }
  return lean;
}

/* Drop spaces that no parser needs: a space survives only between two word characters.
 * Newlines are never touched, so automatic semicolon insertion behaves exactly as in source.
 * String/template/regex literals are copied verbatim. */
const WORD = /[A-Za-z0-9_$]/;
function squeeze(src) {
  let out = '', i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < src.length) { if (src[j] === '\\') j += 2; else if (src[j] === c) break; else j++; }
      out += src.slice(i, j + 1); i = j + 1; continue;
    }
    if (c === '/' && !WORD.test(prevSig(out)) && prevSig(out) !== ')' && prevSig(out) !== ']') {
      let j = i + 1, cls = false;
      while (j < src.length) {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === '[') cls = true; else if (src[j] === ']') cls = false;
        else if (src[j] === '/' && !cls) break;
        else if (src[j] === '\n') break;
        j++;
      }
      while (j + 1 < src.length && /[gimsuy]/.test(src[j + 1])) j++;
      out += src.slice(i, j + 1); i = j + 1; continue;
    }
    if (c === ' ' || c === '\t') {
      let j = i; while (src[j] === ' ' || src[j] === '\t') j++;
      const a = out[out.length - 1] || '', b = src[j] || '';
      const glue = (a === '+' && b === '+') || (a === '-' && b === '-');
      if ((WORD.test(a) && WORD.test(b)) || glue) out += ' ';
      i = j; continue;
    }
    out += c; i++;
  }
  return out;
}
const prevSig = s => { for (let k = s.length - 1; k >= 0; k--) if (!/\s/.test(s[k])) return s[k]; return ''; };

/* ---------- palettes ---------- */
const AESTHETICS = {
  'corporate-sober': {
    shell: 'rail',
    tokens: {
      canvas: '#EDF0F4', card: '#FFFFFF', line: '#E2E7EE', line2: '#F0F3F7', ink: '#16202E', ink2: '#3A4759',
      muted: '#7A879B', muted2: '#9AA6B8', muted3: '#B7C0CC', flab: '#9AA6B8', rail: '#0E2439', railInk: '#C8D6E4',
      c1: '#12304F', c2: '#1F4E79', c3: '#4A7FA8', c4: '#7FA8C6', c5: '#8FB3CC', c6: '#C6D7E4',
      good: '#2E7D5B', bad: '#B3453B', amber: '#C08A2E', page: '#D8DEE6',
      heatLo: '#FBEDEC', heatMid: '#FDF6E7', heatHi: '#EDF5F1',
      font: '"Segoe UI","Segoe UI Web (West European)",-apple-system,BlinkMacSystemFont,Roboto,"Helvetica Neue",Arial,sans-serif',
      radius: '2px'
    }
  },
  'agency-modern': {
    shell: 'top',
    tokens: {
      canvas: '#111420', card: '#191D2B', line: '#2A3143', line2: '#222839', ink: '#EDF0F7', ink2: '#C3CBDA',
      muted: '#7C879E', muted2: '#6A748A', muted3: '#4C5568', flab: '#9AA3B8', rail: '#151A28', railInk: '#C3CBDA',
      c1: '#3D4A6B', c2: '#4C6FE0', c3: '#2E9BD6', c4: '#22B5A6', c5: '#5C6BC0', c6: '#7A5AF8',
      good: '#35C48A', bad: '#E0576B', amber: '#F0A63C', page: '#0B0D16',
      heatLo: '#2A1E24', heatMid: '#2B2620', heatHi: '#16281F',
      font: '"Segoe UI",-apple-system,BlinkMacSystemFont,Roboto,"Helvetica Neue",Arial,sans-serif',
      radius: '6px'
    }
  },
  'executive-minimal': {
    shell: 'top',
    tokens: {
      canvas: '#FFFFFF', card: '#FFFFFF', line: '#E4E4E0', line2: '#F1F1EE', ink: '#14171A', ink2: '#42484F',
      muted: '#6D747C', muted2: '#9BA1A9', muted3: '#BEC3C9', flab: '#5C6268', rail: '#14171A', railInk: '#E4E4E0',
      c1: '#14171A', c2: '#3E5C86', c3: '#4E555D', c4: '#868D95', c5: '#BEC3C9', c6: '#DDE0E3',
      good: '#1F6B4F', bad: '#A03328', amber: '#8A7433', page: '#F4F4F1',
      heatLo: '#F7EEEC', heatMid: '#F6F3EA', heatHi: '#EDF2EF',
      font: '"Segoe UI",-apple-system,BlinkMacSystemFont,Roboto,"Helvetica Neue",Arial,sans-serif',
      radius: '0px'
    }
  }
};

/* ---------- fit-to-canvas ----------
 * Il canvas e 1280x720 e #page ha overflow:hidden: se le altezze dichiarate nella spec
 * superano lo spazio disponibile, la riga in fondo viene tagliata in silenzio — il grafico
 * c'e ma non si vede. Non e una cosa da lasciare al giudizio di chi scrive la spec: il
 * layout e responsabilita del motore, quindi le altezze vengono riscalate per stare dentro.
 */
const H_HDR = 58, H_TOPBAR = 46, H_TOOLS = 40;
const hasTopbar = spec => AESTHETICS[spec.aesthetic].shell === "top" && spec.pages.filter(p => p.nav).length >= 2;
const shellPx = spec => AESTHETICS[spec.aesthetic].shell === "rail" ? H_HDR
  : H_HDR + H_TOOLS + (hasTopbar(spec) ? H_TOPBAR : 0);
const PAGE_PAD = 28;        /* padding verticale di #page */
const KPI_H = 90;           /* banda KPI: altezza reale della card */
const CHROME_H = 34;        /* intestazione della card (.ch) */
const LEGEND_H = 18;        /* riga legenda, quando c'e */
const MIN_CHART_H = 110;    /* sotto questa soglia un grafico non si legge piu */
const MIN_FLEX_H = 150;     /* pavimento per una riga flex qualsiasi */
const DENSE_MIN_CHART_H = 100;  /* nella pagina densa si accetta qualche px in meno */
const DENSE_GUTTER = 8;     /* gutter della pagina densa */
const DENSE_PAD = 20;       /* padding verticale della pagina densa */
const TABLE_HEAD_H = 26;    /* intestazione della matrice (misurata nel browser) */
const TABLE_ROW_H = 26;     /* una riga della matrice: padding 5+5, testo 10.5px, bordo */
const TABLE_ROW_H_CMP = 20; /* la stessa riga in modalita compatta */

/* Quanto spazio chiede DAVVERO una riga flex. Per la matrice non e una costante: dipende da
   quanti membri ha la dimensione, cioe dai dati. Riservargliene meno significa tagliare le
   ultime righe della tabella, che e proprio il bug segnalato. */
function flexNeed(row, data, rowH) {
  return Math.max(MIN_FLEX_H, ...row.visuals.map(v => {
    if (v.type !== 'matrix') return MIN_FLEX_H;
    const dim = (v.bind || {}).dim;
    const members = ((data && data.dims && data.dims[dim]) || []).length || 5;
    const totals = (v.bind || {}).totals === false ? 0 : 1;
    return chromeOf(v) + TABLE_HEAD_H + (members + totals) * (rowH || TABLE_ROW_H) + 12;
  }));
}

const chromeOf = v => (v.title ? CHROME_H : 0) + (v.legend ? LEGEND_H : 0);

/** Altezza utile della pagina, al netto di shell, padding e gutter. */
function pageBudget(spec, page, gutter) {
  const shell = shellPx(spec);
  const rows = (page.rows || []).length + (page.kpiBand !== false && spec.kpiBand && spec.kpiBand.length ? 1 : 0)
    + (page.drillHeader ? 1 : 0);
  return 720 - shell - PAGE_PAD - (gutter || spec.grid.gutter) * Math.max(0, rows - 1);
}

/** Quanto chiede una riga cosi com'e scritta nella spec. */
const rowHeight = row => Math.max(...row.visuals.map(v => (v.h || (row.flex ? 0 : 200)) + chromeOf(v)));

/** Riscala le altezze dei grafici finche la pagina ci sta. Ritorna il resoconto. */
/* Un solo tentativo di fit. Non tocca la spec: restituisce il piano (fattore di scala e
   spazio riservato alla riga flex), cosi si puo riprovare con la pagina densa senza che
   la seconda passata scali un'altezza gia scalata. */
function planFit(spec, page, data, dense) {
  const rows = page.rows || [];
  const gutter = dense ? DENSE_GUTTER : spec.grid.gutter;
  const rowH = dense ? TABLE_ROW_H_CMP : TABLE_ROW_H;
  const minChart = dense ? DENSE_MIN_CHART_H : MIN_CHART_H;
  let budget = pageBudget(spec, page, gutter) + (dense ? (PAGE_PAD - DENSE_PAD) : 0);
  if (page.kpiBand !== false && spec.kpiBand && spec.kpiBand.length) budget -= dense ? KPI_H - 6 : KPI_H;
  if (page.drillHeader) budget -= 46;

  const fixed = rows.filter(r => !r.flex);
  const flex = rows.filter(r => r.flex);
  const wanted = flex.reduce((a, r) => a + flexNeed(r, data, rowH), 0);
  const declared = fixed.reduce((a, r) => a + rowHeight(r), 0);

  if (declared <= budget - wanted) return { scaled: false, tight: false, k: 1, declared, room: budget - wanted };

  /* Si scala solo la parte grafico: il chrome (titolo, legenda) occupa quello che occupa.
     Sotto MIN_CHART_H un grafico non si legge piu, quindi li ci si ferma. */
  const chrome = fixed.reduce((a, r) => a + Math.max(...r.visuals.map(chromeOf)), 0);
  const charts = declared - chrome;
  const floorFixed = chrome + fixed.length * minChart;
  const reserved = Math.max(flex.length * MIN_FLEX_H, Math.min(wanted, budget - floorFixed));
  const room = budget - reserved;
  const target = Math.max(room - chrome, fixed.length * minChart);
  const k = charts > 0 ? target / charts : 1;

  /* quanto occuperebbe applicando il piano: se supera ancora il budget, la matrice
     perde delle righe — meglio lei di una fila di grafici tagliata a meta */
  const fittedFixed = fixed.reduce((a, r) =>
    a + Math.max(...r.visuals.map(v => Math.max(minChart, Math.round((v.h || 200) * k)) + chromeOf(v))), 0);
  const over = Math.max(0, fittedFixed + wanted - budget);
  return { scaled: true, tight: over > 0, over, k: Math.round(k * 1000) / 1000, declared, room, reserved, minChart };
}

/** Applica il fit alla pagina. Se anche al minimo leggibile non ci sta, riprova con la
 *  pagina densa (gutter e padding ridotti, matrice compatta) prima di arrendersi. */
function fitPage(spec, page, data) {
  if (!(page.rows || []).length) return null;
  let plan = planFit(spec, page, data, false);
  if (plan.tight) {
    const denser = planFit(spec, page, data, true);
    if (denser.over < plan.over) plan = Object.assign(denser, { dense: true });
  }
  if (plan.scaled) page.rows.filter(r => !r.flex).forEach(r => r.visuals.forEach(v => {
    v.h = Math.max(plan.minChart || MIN_CHART_H, Math.round((v.h || 200) * plan.k));
  }));
  return plan;
}

/** Applica il fit a ogni pagina, su una copia: la spec del chiamante non viene toccata. */
function fitSpec(spec, data) {
  const copy = JSON.parse(JSON.stringify(spec));
  const report = [];
  copy.pages.forEach(p => { const r = fitPage(copy, p, data); if (r && r.scaled) report.push({ page: p.id, ...r }); });
  if (copy.drill && copy.drill.page) {
    const r = fitPage(copy, copy.drill.page, data);
    if (r && r.scaled) report.push({ page: 'drill', ...r });
  }
  return { spec: copy, report };
}

/** Quanto occupa davvero una pagina dopo il fit, e quanto spazio aveva.
 *  L'harness usa questa, non una formula parallela: se il conto del motore e sbagliato,
 *  deve sbagliare in un posto solo e il gate lo vede. */
function measurePage(spec, data, pageId) {
  const fitted = fitSpec(spec, data);
  const page = fitted.spec.pages.find(p => p.id === pageId) || fitted.spec.pages[0];
  const rep = fitted.report.filter(r => r.page === page.id)[0] || {};
  const dense = !!rep.dense;
  const rowH = dense ? TABLE_ROW_H_CMP : TABLE_ROW_H;
  let budget = pageBudget(fitted.spec, page, dense ? DENSE_GUTTER : spec.grid.gutter)
    + (dense ? PAGE_PAD - DENSE_PAD : 0);
  if (spec.kpiBand && spec.kpiBand.length) budget -= dense ? KPI_H - 6 : KPI_H;
  const h = r => r.flex ? flexNeed(r, data, rowH) : rowHeight(r);
  const rows = page.rows.map(h);
  const charts = [].concat(...page.rows.filter(r => !r.flex).map(r => r.visuals.map(v => v.h || 200)));
  return {
    budget, used: rows.reduce((a, b) => a + b, 0), rows, dense,
    over: rows.reduce((a, b) => a + b, 0) - budget,
    lastRowH: rows[rows.length - 1],
    minChartH: charts.length ? Math.min(...charts) : Infinity
  };
}

/* ---------- validation — the hard gates, enforced before a byte is written ---------- */
const MAX_PER_ROW = 3;
const LIST_MAX_MEMBERS = 5;

function validate(spec, data) {
  const e = [], warn = [];
  const NC = spec.grid.columns;
  if (!spec.kpiBand || !spec.kpiBand.length) e.push('kpiBand is required (full-width top row)');
  else {
    if (NC !== spec.kpiBand.length) e.push(`grid.columns (${NC}) must equal kpiBand.length (${spec.kpiBand.length})`);
    const s = spec.kpiBand.reduce((a, k) => a + (k.span || 1), 0);
    if (s !== NC) e.push(`kpi spans sum to ${s}, expected ${NC}`);
  }
  const measures = new Set((spec.model.measures || []).map(m => m.id));
  const known = new Set([...measures, ...(spec.model.sums || [])]);
  spec.kpiBand.forEach(k => { if (!measures.has(k.measure)) e.push(`kpi "${k.id}": unknown measure "${k.measure}"`); });
  (spec.model.measures || []).forEach((m, i) => {
    const deps = m.agg === 'diff' ? [m.a, m.b] : m.agg === 'ratio' ? [m.num, m.den] : [];
    const before = new Set([...(spec.model.sums || []), ...spec.model.measures.slice(0, i).map(x => x.id)]);
    deps.forEach(d => { if (!before.has(d)) e.push(`measure "${m.id}" references "${d}" before it is declared`); });
  });

  (spec.filters.dims || []).forEach(fd => {
    const mem = (data.dims || {})[fd.id];
    if (!mem) { e.push(`filter dim "${fd.id}" has no members in data.dims`); return; }
    if (mem.length > LIST_MAX_MEMBERS && fd.control !== 'dropdown')
      e.push(`filter "${fd.id}" has ${mem.length} members: must be control:"dropdown" (QA Gate 6)`);

    /* Un filtro deve poter muovere qualcosa nella banda KPI, altrimenti e un controllo
       morto in cima alla pagina: o la dimensione sta nel grano dei fatti, o il grano di
       dettaglio che la contiene porta almeno una misura usata dalle KPI (data-params.md). */
    const factCols = new Set((data.facts && data.facts.cols) || []);
    if (!factCols.has(fd.id)) {
      const dm = data.detailModel;
      const detailFields = new Set(dm && dm.dim === fd.id ? (dm.fields || []) : []);
      const reaches = (spec.kpiBand || []).some(k => {
        const m = (spec.model.measures || []).filter(x => x.id === k.measure)[0];
        if (!m) return false;
        return [m.field, m.num, m.den, m.a, m.b].filter(Boolean).some(x => detailFields.has(x));
      });
      if (!reaches) e.push(`filter dim "${fd.id}" non raggiunge nessuna KPI: non e una colonna dei fatti e il grano di dettaglio non porta misure della banda KPI — il filtro sarebbe inerte (QA Gate 5)`);
    }
  });

  const pages = spec.pages.concat(spec.drill ? [spec.drill.page] : []);
  const types = new Set();
  pages.forEach(pg => {
    (pg.rows || []).forEach((row, ri) => {
      if (row.visuals.length > MAX_PER_ROW) e.push(`page "${pg.id}" row ${ri}: ${row.visuals.length} visuals (max ${MAX_PER_ROW})`);
      const sum = row.visuals.reduce((a, v) => a + v.span, 0);
      if (sum !== NC) e.push(`page "${pg.id}" row ${ri}: spans sum to ${sum}, expected ${NC} (shared grid)`);
      row.visuals.forEach(v => {
        if (!Number.isInteger(v.span)) e.push(`page "${pg.id}": non-integer span ${v.span} (off-grid width)`);
        types.add(v.type);
        const b = v.bind || {};
        if (b.measure && !known.has(b.measure)) e.push(`page "${pg.id}" ${v.type}: unknown measure "${b.measure}"`);
        if (b.dim && !(data.dims || {})[b.dim]) e.push(`page "${pg.id}" ${v.type}: unknown dim "${b.dim}"`);
        /* advisory, not a gate: chart-selection.md wants 2-5 slices, but the canonical ships a
           6-category donut. Judgement belongs to the spec author; the engine reports it. */
        if (v.type === 'donut' && b.dim && data.dims[b.dim].length > 5)
          warn.push(`page "${pg.id}": donut on "${b.dim}" has ${data.dims[b.dim].length} slices (chart-selection.md: 2-5; consider hbar/stack100)`);
        /* Una composizione che spezza una dimensione PER SE STESSA non e una distribuzione:
           ogni barra ha un solo segmento, o n segmenti identici da 100/n. Nel primo giro a
           pagamento e uscito cosi un "Nuovi clienti vs clienti di ritorno per canale" con
           cinque segmenti da 20% esatti — il modello voleva una dimensione che nei dati non
           esisteva e ha ripiegato sul canale contro se stesso. */
        if (b.by && b.dim && b.by === b.dim) {
          e.push(`page "${pg.id}" ${v.type}: bind.by e bind.dim sono la stessa dimensione ` +
            `("${b.dim}"): spezzare una dimensione per se stessa non produce una composizione, ` +
            `produce segmenti tutti uguali. Usa una seconda dimensione (facts.split) o cambia visual.`);
        }
        (b.columns || []).forEach(c => { if (!known.has(c.measure)) e.push(`page "${pg.id}" matrix: unknown measure "${c.measure}"`); });
        (b.stages || []).forEach(c => { if (!known.has(c.measure)) e.push(`page "${pg.id}" funnel: unknown measure "${c.measure}"`); });
      });
    });
  });
  /* L'unita dice COSA si misura; il formato e come si scrive. Tenerli separati e permettere
     ogni combinazione ha prodotto reach e impression - due conte - scritte "€6,8M". Qui il
     formato deve appartenere all'unita dichiarata, e una conta col simbolo di valuta non e
     piu esprimibile. */
  const UNITA_FORMATI = {
    money: ['eur', 'eurF'],
    count: ['N', 'raw'],
    pct: ['pc', 'sgp', 'bps'],
    pp: ['pp'],
    days: ['days'],
    x: ['x']
  };
  ((spec.model || {}).measures || []).forEach(m => {
    if (!m.unit) {
      e.push(`measure "${m.id}": manca "unit". Dichiara cosa misura — money, count, pct, pp, ` +
        `days o x — e il formato ne discende. Senza unita niente impedisce di scrivere una ` +
        `conta col simbolo di valuta.`);
      return;
    }
    const ammessi = UNITA_FORMATI[m.unit];
    if (!ammessi) {
      e.push(`measure "${m.id}": unit "${m.unit}" sconosciuta (money, count, pct, pp, days, x).`);
      return;
    }
    if (m.format && ammessi.indexOf(m.format) < 0) {
      e.push(`measure "${m.id}": unit "${m.unit}" e format "${m.format}" non vanno insieme. ` +
        `Per "${m.unit}" i formati ammessi sono ${ammessi.join(' o ')}` +
        (m.unit === 'count' ? ' — una conta non porta mai il simbolo di valuta.' : '.'));
    }
  });

  if (!spec.meta || !spec.meta.watermark) e.push('meta.watermark is required (synthetic-data watermark)');

  const tb = toolbarBudget(spec, data);
  if (tb.overflow) e.push(`toolbar controls sum to ${tb.used}px > content width ${tb.available}px (QA Gate 6)`);

  if (e.length) throw new Error('spec validation failed:\n  - ' + e.join('\n  - '));
  return { types: [...types], advisories: warn };
}
const lint = (spec, data) => {
  const a = validate(spec, data).advisories;
  fitSpec(spec, data).report.forEach(r => {
    if (r.tight) a.push("pagina \"" + r.page + "\": troppe righe per il canvas — grafici al minimo leggibile e la matrice perde " + r.over + "px. Togli una riga, oppure usa una estetica con shell piu bassa.");
    else a.push("pagina \"" + r.page + "\": altezze riscalate a " + r.k + "x per stare nel canvas 720px" + (r.dense ? ", pagina densa" : "") + ".");
  });
  return a;
};

/* ---------- Gate 6: toolbar width budget (jsdom computes no layout, so budget it here) ---------- */
const W_DATE = 190, W_DROPDOWN = 168, W_CHIP = 92, W_GAP = 8, W_RESET = 96;
function toolbarBudget(spec, data) {
  const onTop = AESTHETICS[spec.aesthetic].shell === 'top';
  const available = onTop ? spec.grid.contentWidth - W_RESET : 200 - 32;   /* rail: 200px minus padding */
  let used = onTop ? W_DATE : 0;
  const items = [];
  (spec.filters.dims || []).forEach(fd => {
    const n = (data.dims[fd.id] || []).length;
    /* sulla toolbar ogni gruppo porta anche la sua etichetta (8.5px maiuscolo) */
    const lab = onTop ? 14 + String(fd.label || '').length * 6.2 : 0;
    const w = (fd.control === 'dropdown' ? W_DROPDOWN : n * (W_CHIP + W_GAP)) + lab;
    if (onTop) used += w + W_GAP;
    else used = Math.max(used, fd.control === 'dropdown' ? W_DROPDOWN : W_CHIP);   /* rail stacks vertically */
    items.push({ id: fd.id, control: fd.control || 'list', members: n, w });
  });
  return { used: Math.round(used), available, overflow: used > available, items, axis: onTop ? 'top' : 'rail' };
}

/* ---------- CSS ---------- */
function css(spec, compact) {
  const A = AESTHETICS[spec.aesthetic];
  const t = Object.assign({}, A.tokens, spec.palette || {});
  const ser = (spec.palette && spec.palette.series) || null;
  if (ser) ser.slice(0, 6).forEach((c, i) => t['c' + (i + 1)] = c);
  const vars = Object.keys(t).filter(k => k !== 'series').map(k => `--${k}:${t[k]}`).join(';');
  const rail = A.shell === 'rail';
  return `:root{${vars}}
*{box-sizing:border-box}
html,body{margin:0;padding:0;height:100%;background:var(--page);font-family:var(--font);-webkit-font-smoothing:antialiased}
#stage{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;overflow:hidden}
#canvas{width:1280px;height:720px;transform-origin:center center;background:var(--canvas);display:flex;${rail ? '' : 'flex-direction:column;'}
  box-shadow:0 8px 40px rgba(12,25,45,.28);position:relative}
.tnum{font-variant-numeric:tabular-nums;font-feature-settings:"tnum"}
${rail ? `#rail{width:200px;flex:0 0 200px;background:var(--rail);color:var(--railInk);display:flex;flex-direction:column;padding:16px 0}
.brand{padding:0 16px 14px;border-bottom:1px solid rgba(255,255,255,.09)}
.brand .mk{display:flex;align-items:center;gap:9px}
.brand .sq{width:22px;height:22px;background:var(--c3);position:relative;flex:0 0 22px;border-radius:2px}
.brand .sq:before,.brand .sq:after{content:"";position:absolute;background:var(--rail)}
.brand .sq:before{left:5px;right:5px;top:9px;height:2px}.brand .sq:after{top:5px;bottom:5px;left:9px;width:2px}
.brand .nm{font-size:13px;font-weight:600;letter-spacing:.4px;color:#fff}
.brand .sub{font-size:9px;color:var(--muted);letter-spacing:.5px;text-transform:uppercase;margin-top:4px}
.navgrp{padding:14px 10px 4px}
.navbtn{display:flex;align-items:center;gap:9px;width:100%;padding:8px 9px;border:0;background:transparent;color:var(--railInk);
  font-family:var(--font);font-size:12px;font-weight:600;text-align:left;border-radius:2px;cursor:pointer}
.navbtn.on{background:var(--c3);color:#fff}
.navbtn .ic{width:14px;height:14px;flex:0 0 14px}
.slgrp{padding:14px 16px 0;position:relative}
.catgrp{padding:16px 16px 0}
.railfoot{margin-top:auto;padding:0 16px;font-size:8.5px;color:var(--muted2);line-height:1.5}
#main{flex:1;display:flex;flex-direction:column;min-width:0;min-height:0}`
      : `#topbar{height:46px;flex:0 0 46px;background:var(--rail);display:flex;align-items:center;gap:10px;padding:0 16px}
#topbar .nm{font-size:13px;font-weight:600;color:#fff;letter-spacing:.4px}
#topbar .spacer{flex:1}
.navbtn{border:0;background:transparent;color:var(--railInk);font-family:var(--font);font-size:11.5px;font-weight:600;
  padding:7px 11px;border-radius:var(--radius);cursor:pointer}
.navbtn.on{background:rgba(255,255,255,.14);color:#fff}
#tools{height:40px;flex:0 0 40px;background:var(--card);border-bottom:1px solid var(--line);display:flex;align-items:center;gap:8px;padding:0 16px;position:relative}
.slgrp{position:relative;width:${W_DATE}px}
.fgrp{display:flex;align-items:center;gap:7px}
.fgrp .flab{font-size:8.5px;letter-spacing:1.1px;text-transform:uppercase;color:var(--flab);white-space:nowrap}
.fgrp .fitems{position:relative}
.fgrp.dd .fitems{width:${W_DROPDOWN}px}
/* una lista sulla toolbar orizzontale: chip in riga, altrimenti impila righe da rail dentro 40px */
.fgrp.chips .fitems{display:flex;align-items:center;gap:${W_GAP}px}
.fgrp.chips .fitems>.catitem{border:1px solid var(--line);border-radius:${AESTHETICS[spec.aesthetic].tokens.radius === "0px" ? "0" : "999px"};
  padding:4px 10px;font-size:11px;max-width:${W_CHIP}px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fgrp.chips .fitems>.catitem.on{background:var(--c2);border-color:var(--c2);color:#fff}
.fgrp.chips .fitems>.catitem.on .dot{background:#fff!important}
#main{flex:1;display:flex;flex-direction:column;min-width:0;min-height:0}`}
.rlbl{font-size:8.5px;letter-spacing:1.1px;text-transform:uppercase;color:var(--flab);padding:0 0 7px}
.slbtn{width:100%;display:flex;align-items:center;gap:8px;padding:8px 10px;background:${rail ? 'rgba(255,255,255,.05)' : 'transparent'};
  border:1px solid ${rail ? 'rgba(255,255,255,.16)' : 'var(--line)'};border-radius:3px;color:${rail ? 'var(--railInk)' : 'var(--ink2)'};
  font-family:var(--font);font-size:11.5px;cursor:pointer}
.slbtn .cal{width:12px;height:12px;flex:0 0 12px;opacity:.8}
.slbtn .cur{flex:1;text-align:left;font-weight:600;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.slbtn .car{font-size:8px;opacity:.7}
.slpanel{position:absolute;left:${rail ? '16px' : '0'};right:${rail ? '16px' : 'auto'};${rail ? '' : 'min-width:100%;'}top:${rail ? '64px' : '36px'};
  background:${rail ? '#12283F' : 'var(--card)'};border:1px solid ${rail ? 'rgba(255,255,255,.18)' : 'var(--line)'};
  border-radius:4px;padding:11px;z-index:30;box-shadow:0 12px 30px rgba(0,0,0,.35);display:none;color:${rail ? 'var(--railInk)' : 'var(--ink2)'}}
.slpanel.open{display:block}
.slsec{font-size:8px;letter-spacing:1px;text-transform:uppercase;color:var(--flab);margin:2px 0 6px}
.slrow{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:9px}
.slchip{flex:1 0 auto;min-width:26px;padding:5px 6px;text-align:center;font-size:10.5px;border:1px solid ${rail ? 'rgba(255,255,255,.16)' : 'var(--line)'};
  background:transparent;color:${rail ? 'var(--railInk)' : 'var(--ink2)'};cursor:pointer;font-family:var(--font);border-radius:2px}
.slchip:hover{background:rgba(127,127,127,.12)}
.slchip.on{background:${rail ? '#fff' : 'var(--c2)'};color:${rail ? 'var(--rail)' : '#fff'};border-color:${rail ? '#fff' : 'var(--c2)'};font-weight:600}
.slchip.mo{flex:1 0 27%;font-size:9.5px;padding:4px 2px}
.catitem{display:flex;align-items:center;gap:8px;padding:5px 6px;font-size:11px;color:${rail ? 'var(--railInk)' : 'var(--ink2)'};cursor:pointer;border-radius:2px}
.catitem:hover{background:rgba(127,127,127,.12)}
.catitem .dot{width:8px;height:8px;flex:0 0 8px;border-radius:2px}
.catitem.on{color:${rail ? '#fff' : 'var(--ink)'};font-weight:600;background:rgba(127,127,127,.14)}
.hbrand{font-size:11px;font-weight:700;letter-spacing:1.4px;color:var(--ink);padding-right:14px;border-right:1px solid var(--line);white-space:nowrap}
#hdr{height:58px;flex:0 0 58px;background:var(--card);border-bottom:1px solid var(--line);display:flex;align-items:center;padding:0 18px;gap:14px}
#hdr .ttl{font-size:16px;font-weight:600;color:var(--ink);letter-spacing:-.2px}
#hdr .sub{font-size:10.5px;color:var(--muted);margin-top:2px}
#hdr .spacer{flex:1}
.ctxwrap{display:flex;gap:6px}
.ctxpill{font-size:10px;color:var(--ink2);background:var(--line2);border:1px solid var(--line);padding:4px 8px;border-radius:2px}
.ctxpill b{font-weight:600;color:var(--c2)}
.resetb{font-size:10px;color:var(--muted);background:transparent;border:1px solid var(--line);padding:5px 9px;border-radius:2px;cursor:pointer;font-family:var(--font)}
.resetb:hover{color:var(--bad);border-color:var(--bad)}
.updated{font-size:9.5px;color:var(--muted2);text-align:right;line-height:1.5}
#page{flex:1;min-height:0;padding:14px 16px;overflow:hidden;display:flex;flex-direction:column;gap:${spec.grid.gutter}px}
.row{display:flex;flex:0 0 auto;gap:${spec.grid.gutter}px}
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);position:relative;box-shadow:0 1px 1px rgba(20,35,60,.04)}
.card>.ch{padding:10px 13px 5px;display:flex;align-items:baseline;gap:8px}
.card .ch h3{margin:0;font-size:12px;font-weight:600;color:var(--ink);letter-spacing:-.1px}
.card .ch .hs{font-size:9.5px;color:var(--muted)}
.card .ch .hr{margin-left:auto;font-size:9px;color:var(--muted2)}
.kpi{padding:11px 14px 10px;display:flex;flex-direction:column;justify-content:space-between}
.kpi .k{font-size:9px;letter-spacing:.7px;text-transform:uppercase;color:var(--muted);font-weight:600}
.kpi .vr{display:flex;align-items:flex-end;gap:7px;margin-top:6px}
.kpi .v{font-size:25px;font-weight:600;color:var(--ink);line-height:1;letter-spacing:-1px}
.kpi .d{font-size:10px;font-weight:600;padding-bottom:2px;white-space:nowrap}
.kpi .det{font-size:9px;color:var(--muted);margin-top:7px}
.up{color:var(--good)}.dn{color:var(--bad)}.fl{color:var(--muted)}
.narr{padding:12px 14px;font-family:Georgia,"Times New Roman",serif;font-size:15px;line-height:1.55;color:var(--ink)}
.mx{padding:2px 8px 8px;overflow:hidden}
${compact ? String.raw`th,td{padding:2px 6px}.card>.ch{padding:7px 13px 3px}#page{padding:10px 16px;gap:8px}.row{gap:8px}.kpi{padding:8px 14px 7px}` : ``}
table{width:100%;border-collapse:collapse;font-size:10.5px}
th{text-align:right;font-weight:600;color:var(--muted);font-size:8.5px;letter-spacing:.4px;text-transform:uppercase;padding:5px 6px;border-bottom:1px solid var(--line);white-space:nowrap}
th:first-child{text-align:left}
td{padding:5px 6px;text-align:right;color:var(--ink2);border-bottom:1px solid var(--line2);white-space:nowrap}
td:first-child{text-align:left;color:var(--ink);font-weight:500}
tr.r{cursor:pointer}
tr.r:hover td{background:var(--line2)}
tr.r.dim td{opacity:.36}
tr.r.sel td{background:var(--line2)}
tr.tot td{font-weight:600;color:var(--ink);border-bottom:0;border-top:1px solid var(--line);background:var(--line2)}
.dg{width:13px;display:inline-block;text-align:center;color:var(--c3);opacity:0;font-size:11px}
tr.r:hover .dg{opacity:1}
.sw{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:7px;vertical-align:middle}
.lgd{display:flex;gap:12px;padding:0 13px 8px;font-size:9.5px;color:var(--muted)}
.lgd i{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:5px;vertical-align:-1px}
.lgd .ln{display:inline-block;width:11px;height:0;border-top:2px dashed var(--muted2);margin-right:5px;vertical-align:3px}
svg{display:block}svg .hit{cursor:pointer}svg .dimd{opacity:.3}
#tip{position:fixed;pointer-events:none;background:var(--c1);color:#fff;font-size:10.5px;padding:6px 9px;border-radius:2px;opacity:0;transition:opacity .1s;z-index:60;line-height:1.55;white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,.3)}
#tip b{font-weight:600}
.backb{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--c3);background:transparent;border:1px solid var(--line);padding:6px 10px;border-radius:2px;cursor:pointer;font-family:var(--font)}
.dhd{display:flex;align-items:center;gap:12px}
.dhd .dt{font-size:15px;font-weight:600;color:var(--ink)}
.dhd .dsub{font-size:10.5px;color:var(--muted);margin-top:2px}
.wm{position:absolute;left:${rail ? '210px' : '16px'};bottom:4px;font-size:8px;color:var(--muted3);letter-spacing:.4px}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}`;
}

/* ---------- shell markup ---------- */
const CAL_ICON = '<svg class="cal" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="2" y="3" width="12" height="11" rx="1"/><path d="M2 6h12M5 1.5v3M11 1.5v3"/></svg>';
const BAR_ICON = '<svg class="ic" viewBox="0 0 16 16" fill="currentColor"><path d="M2 13h12v1H2zM3 7h2v5H3zM6.5 4h2v8h-2zM10 8.5h2V12h-2z"/></svg>';
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

function dateSlicer(spec) {
  const T = spec.meta.strings || {};
  return `<div class="slgrp">${AESTHETICS[spec.aesthetic].shell === 'rail' ? `<div class="rlbl">${esc(T.period || 'Periodo')}</div>` : ''}
      <button class="slbtn" id="slBtn">${CAL_ICON}<span class="cur" id="slCur"></span><span class="car">▼</span></button>
      <div class="slpanel" id="slPanel">
        <div class="slsec">${esc(T.year || 'Anno')}</div><div class="slrow" id="slYear"></div>
        <div class="slsec">${esc(T.qtrLong || 'Trimestre')}</div><div class="slrow" id="slQtr"></div>
        <div class="slsec">${esc(T.monthLong || 'Mese')}</div><div class="slrow" id="slMon"></div>
      </div></div>`;
}
function navButtons(spec) {
  const pages = spec.pages.filter(p => p.nav);
  if (pages.length < 2 && AESTHETICS[spec.aesthetic].shell === 'top') return '';
  return pages.map(p => `<button class="navbtn" data-page="${esc(p.id)}">${AESTHETICS[spec.aesthetic].shell === 'rail' ? BAR_ICON : ''}${esc(p.nav)}</button>`).join('');
}
function dimFilters(spec, rail) {
  return (spec.filters.dims || []).map(fd => rail
    ? `<div class="catgrp"><div class="rlbl">${esc(fd.label)}</div><div id="fl_${esc(fd.id)}"></div></div>`
    : `<div class="fgrp ${fd.control === 'dropdown' ? 'dd' : 'chips'}"><span class="flab">${esc(fd.label)}</span><div class="fitems" id="fl_${esc(fd.id)}"></div></div>`).join('');
}
function header(spec, rail) {
  const m = spec.meta, T = m.strings || {}, b = m.brand || {};
  const inlineBrand = !rail && !hasTopbar(spec);
  return `<div id="hdr">
      ${inlineBrand ? `<div class="hbrand">${esc((b.name || m.title).toUpperCase())}</div>` : ''}
      <div><div class="ttl" id="hTtl"></div><div class="sub" id="hSub"></div></div>
      <div class="spacer"></div>
      ${rail ? `<div class="ctxwrap" id="hCtx"></div>
      <button class="resetb" id="btnReset">${esc(T.reset || 'Azzera filtri')}</button>` : ''}
      ${m.updated ? `<div class="updated">${esc(T.updatedLabel || 'Ultimo aggiornamento')}<br><b>${esc(m.updated)}</b></div>` : ''}
    </div>`;
}
function shell(spec) {
  const A = AESTHETICS[spec.aesthetic], m = spec.meta, b = m.brand || {}, T2 = m.strings || {};
  if (A.shell === 'rail') {
    return `<div id="rail">
    <div class="brand"><div class="mk"><div class="sq"></div><div class="nm">${esc((b.name || m.title).toUpperCase())}</div></div>
      ${b.tagline ? `<div class="sub">${esc(b.tagline)}</div>` : ''}</div>
    <div class="navgrp"><div class="rlbl">Report</div>${navButtons(spec)}</div>
    ${dateSlicer(spec)}
    ${dimFilters(spec, true)}
    ${m.source ? `<div class="railfoot">${esc(m.source)}</div>` : ''}
  </div>
  <div id="main">
    ${header(spec, true)}
    <div id="page"></div>
    <div class="wm">${esc(m.watermark)}</div>
  </div>`;
  }
  return `${hasTopbar(spec) ? `<div id="topbar"><div class="nm">${esc((b.name || m.title).toUpperCase())}</div>${navButtons(spec)}<div class="spacer"></div>
    ${b.tagline ? `<div class="updated">${esc(b.tagline)}</div>` : ''}</div>` : ''}
  <div id="tools">${dateSlicer(spec)}${dimFilters(spec, false)}<div class="spacer"></div>
    <div class="ctxwrap" id="hCtx"></div>
    <button class="resetb" id="btnReset">${esc(T2.reset || 'Azzera filtri')}</button></div>
  <div id="main">
    ${header(spec, false)}
    <div id="page"></div>
    <div class="wm">${esc(m.watermark)}</div>
  </div>`;
}

/* ---------- deterministic, compact JSON ---------- */
function tableJSON(t) {
  return '{"cols":' + JSON.stringify(t.cols) + ',"rows":[' + t.rows.map(r => JSON.stringify(r)).join(',') + ']}';
}
function dataJSON(data) {
  const parts = ['"dims":' + JSON.stringify(data.dims), '"years":' + JSON.stringify(data.years),
  '"facts":' + tableJSON(data.facts)];
  if (data.detail) parts.push('"detail":' + tableJSON(data.detail));
  if (data.detailModel) parts.push('"detailModel":' + JSON.stringify(data.detailModel));
  if (data.tieOut) parts.push('"tieOut":' + JSON.stringify(data.tieOut));
  return '{' + parts.join(',\n') + '}';
}

/* ---------- render ---------- */
function render(specIn, data) {
  /* il fit avviene qui, prima della validazione: la spec emessa nel file e quella
     effettivamente renderizzata, cosi cio che si vede e cio che si e validato */
  const { spec, report } = fitSpec(specIn, data);
  const compact = report.some(r => r.dense);   /* pagina sovraccarica: si stringe tutto il possibile */

  /* La pagina che non ci sta nemmeno cosi. Il piano scala le altezze, ma sotto la soglia di
     leggibilita si ferma: da li in poi il motore emetteva comunque, e la riga di chiusura
     usciva tagliata. Nel primo giro a pagamento e successo su tre pagine su nove.
     Un report con la matrice mozzata non vale niente, quindi si rifiuta con un'istruzione
     invece di consegnarlo. La cura e quella che il prodotto gia prescrive: non dare per
     scontata una pagina sola.
     Il conto e quello del fit APPENA fatto: rifarlo su una spec gia adattata darebbe un
     budget diverso e un verdetto falso. */
  const sfora = report.filter(r => r.over > 0);
  if (sfora.length) {
    const righe = sfora.map(r =>
      `page "${r.page}": non ci sta nel canvas — sfora di ${r.over}px anche dopo l'adattamento, ` +
      `e la riga di chiusura verrebbe tagliata. Togli un visual da questa pagina o spostane una ` +
      `parte su una SECONDA pagina (pages[]): non dare per scontata una pagina sola.`);
    throw new Error('spec validation failed:' + String.fromCharCode(10) + '  - ' + righe.join(String.fromCharCode(10) + '  - '));
  }
  const { types } = validate(spec, data);
  const lang = (spec.meta.locale || 'it-IT').slice(0, 2);
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(spec.meta.brand && spec.meta.brand.name ? spec.meta.brand.name + ' — ' + spec.meta.title : spec.meta.title)}</title>
<style>
${css(spec, compact).split('\n').map(l => l.trim()).filter(Boolean).join('\n')}
</style>
</head>
<body>
<div id="stage"><div id="canvas">
  ${shell(spec)}
</div></div>
<div id="tip"></div>
<script>
${bundle(types)}
var SPEC=${JSON.stringify(spec)};
var DATA=${dataJSON(data)};
MK.boot(SPEC,DATA,document);
</script>
</body>
</html>
`;
}

module.exports = { render, validate, lint, toolbarBudget, bundle, css, AESTHETICS, fitSpec, measurePage, pageBudget, rowHeight };
