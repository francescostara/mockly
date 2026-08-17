/* Mockly runtime — the deterministic rendering engine.
 *
 * Extracted from skill/assets/canonical-retail-fullspec.html as close to verbatim as the
 * generalisation allows. This file is BOTH:
 *   - a Node module (require('./runtime.js') -> MK) used by render/tests, and
 *   - the source that render() inlines into the output HTML (self-contained, zero deps).
 *
 * Regions marked /*#region name* / ... /*#endregion* / are the unit of inlining: the bundler
 * emits `core` plus only the chart regions a spec actually uses, so output stays lean and
 * carries no dead code (SKILL.md "Output economy").
 */

/*#region core*/
var MK = (typeof MK !== 'undefined' && MK) ? MK : {};
(function (M) {
  'use strict';

  /* ---------- PRNG (mulberry32) — never Math.random ---------- */
  M.mulberry32 = function (a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };

  /* ---------- formatting helpers ---------- */
  M.esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

  M.fmt = function (o) {
    o = o || {};
    var lang = o.locale || 'it-IT', cur = o.currency || '€';
    var comma = (o.decimal || (lang.slice(0, 2) === 'it' ? ',' : '.')) === ',';
    var d = s => comma ? String(s).replace('.', ',') : String(s);
    var num = v => Math.round(v).toLocaleString(lang);
    var f = {};
    /* compact currency, K/M — canonical eur() */
    f.eur = function (v, k) {
      if (!isFinite(v)) v = 0;
      k = k === undefined ? 0 : k;
      var a = Math.abs(v), s = v < 0 ? '−' : '';
      if (a >= 1e6) return s + cur + d((a / 1e6).toFixed(1)) + 'M';
      if (a >= 1e3) return s + cur + d((a / 1e3).toFixed(k)) + 'K';
      return s + cur + Math.round(a);
    };
    f.eurF = v => (!isFinite(v) ? cur + '0' : (v < 0 ? '−' : '') + cur + num(Math.abs(v)));
    f.pc = function (v, k) { k = k === undefined ? 1 : k; return d((isFinite(v) ? v * 100 : 0).toFixed(k)) + '%'; };
    f.pp = function (v, k) { k = k === undefined ? 1 : k; v = isFinite(v) ? v : 0; return (v >= 0 ? '+' : '−') + d(Math.abs(v * 100).toFixed(k)) + ' pp'; };
    f.sgp = function (v, k) { v = isFinite(v) ? v : 0; return (v > 0 ? '+' : '−') + f.pc(Math.abs(v), k); };
    f.bps = function (v) { v = isFinite(v) ? v : 0; return Math.abs(v) < 5e-5 ? 'flat' : (v > 0 ? '+' : '−') + Math.abs(Math.round(v * 10000)) + 'bps'; };
    f.N = v => (isFinite(v) ? num(v) : '0');
    f.x = function (v, k) { k = k === undefined ? 1 : k; return d((isFinite(v) ? v : 0).toFixed(k)) + '×'; };
    f.days = v => M.fmtNum(v, 0) + (o.locale && o.locale.slice(0, 2) === 'it' ? ' gg' : ' d');
    f.raw = v => String(isFinite(v) ? Math.round(v) : 0);
    f.apply = (id, v) => (f[id] || f.N)(v);
    return f;
  };
  M.fmtNum = (v, k) => (isFinite(v) ? v : 0).toFixed(k);

  /* ---------- shared column grid ---------- */
  M.grid = function (CW, G, NC) {
    var colW = (CW - (NC - 1) * G) / NC;
    return { CW: CW, G: G, NC: NC, colW: colW, span: k => k * colW + (k - 1) * G };
  };

  /* ---------- nice axis ticks ---------- */
  M.ticks = function (max, n) {
    n = n || 4;
    var raw = max / n, mag = Math.pow(10, Math.floor(Math.log10(raw) || 0));
    var st = [1, 2, 2.5, 5, 10].map(x => x * mag).find(x => x >= raw) || 10 * mag;
    var o = [];
    for (var v = 0; v <= st * n + 1e-9; v += st) { o.push(v); if (v >= max) break; }
    return o;
  };

  /* ---------- visual registry — chart regions add themselves here ---------- */
  M.V = {};

  /* ---------- fact table materialisation ----------
     A table is {cols:[...], rows:[[...]]}. Any column whose name is a key of DATA.dims
     holds an integer index into that dimension's member list; it is mapped back to the
     member id so every filter compares plain ids. */
  M.materialize = function (t, dims) {
    var cols = t.cols, out = new Array(t.rows.length), i, k, r, o;
    for (i = 0; i < t.rows.length; i++) {
      r = t.rows[i]; o = {};
      for (k = 0; k < cols.length; k++) {
        var c = cols[k], mb = dims[c] ? dims[c][r[k]] : null;
        o[c] = mb ? mb.id : r[k];
        /* a member may name its parent dimension member — derived, never stored per row */
        if (mb && mb.parent && mb.parentDim) o[mb.parentDim] = mb.parent;
      }
      out[i] = o;
    }
    return out;
  };

  /* integer allocation by largest remainder — the parts always sum to the total exactly */
  M.allocInt = function (ws, total) {
    var s = ws.reduce((a, b) => a + b, 0) || 1, n = ws.length;
    var ideal = ws.map(w => w / s * total), out = ideal.map(v => Math.floor(v));
    var diff = Math.round(total) - out.reduce((a, b) => a + b, 0);
    var ord = ideal.map((v, i) => ({ i: i, f: v - Math.floor(v) })).sort((a, b) => (b.f - a.f) || (a.i - b.i));
    for (var k = 0; diff > 0 && n; k++, diff--) out[ord[k % n].i]++;
    for (var k2 = 0; diff < 0 && n; k2++, diff++) out[ord[n - 1 - (k2 % n)].i] = Math.max(0, out[ord[n - 1 - (k2 % n)].i] - 1);
    return out;
  };

  /* Expand a share model into the detail grain at load: shipping 27 shares instead of ~700
     literal rows is the "smallest sufficient data model" rule, and the children tie out to
     their parent by construction. */
  M.expandDetail = function (F, dims, dm) {
    var kidsOf = {}, out = [];
    dims[dm.dim].forEach(mb => (kidsOf[mb.parent] = kidsOf[mb.parent] || []).push(mb));
    F.forEach(function (r) {
      var kids = kidsOf[r[dm.parentDim]] || [];
      if (!kids.length) return;
      var ws = kids.map(k => dm.shares[k.id] || 0), s = ws.reduce((a, b) => a + b, 0) || 1;
      var counts = dm.counts ? M.allocInt(ws, r[dm.counts.from] || 0) : null;
      kids.forEach(function (k, i) {
        var o = { y: r.y, m: r.m };
        o[dm.dim] = k.id; o[dm.parentDim] = k.parent;
        dm.fields.forEach(fl => o[fl] = (r[fl] || 0) * ws[i] / s);
        if (counts) o[dm.counts.field] = counts[i];
        out.push(o);
      });
    });
    return out;
  };

  /* ================= the app ================= */
  M.app = function (SPEC, DATA, doc) {
    var A = {};
    var dims = DATA.dims || {};
    var F = M.materialize(DATA.facts, dims);
    var DT = DATA.detail ? M.materialize(DATA.detail, dims)
      : DATA.detailModel ? M.expandDetail(F, dims, DATA.detailModel) : null;
    var meta = SPEC.meta || {};
    var f = M.fmt(meta);
    var g = M.grid(SPEC.grid.contentWidth, SPEC.grid.gutter, SPEC.grid.columns);
    var MON = meta.months || ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
    var T = meta.strings || {};
    var model = SPEC.model || {};
    var SUMS = model.sums || [];
    var MEAS = model.measures || [];
    var MEASBY = {}; MEAS.forEach(m => MEASBY[m.id] = m);
    var DIMK = Object.keys(dims);
    var FDIMS = (SPEC.filters && SPEC.filters.dims) || [];      /* filterable dims, in toolbar order */
    var YRS = DATA.years;

    A.SPEC = SPEC; A.DATA = DATA; A.dims = dims; A.f = f; A.g = g; A.MON = MON; A.T = T;
    A.facts = F; A.detail = DT; A.doc = doc; A.esc = M.esc;
    A.member = (dim, id) => (dims[dim] || []).filter(x => x.id === id)[0] || { id: id, n: id, c: '#888' };
    A.dimLabel = (dim, id) => A.member(dim, id).n;
    A.color = (dim, id) => A.member(dim, id).c;

    /* ---------- state — ONE object drives everything ---------- */
    var d0 = (SPEC.filters && SPEC.filters.date && SPEC.filters.date.default) || {};
    var S = A.S = {
      page: SPEC.pages[0].id,
      y: d0.y !== undefined ? d0.y : YRS[YRS.length - 1],
      q: d0.q === undefined ? null : d0.q,
      mo: d0.m === undefined ? null : d0.m,
      f: {},                       /* dim id -> member id | null */
      drill: null,                 /* {dim,id} */
      from: SPEC.pages[0].id,
      slOpen: false
    };
    FDIMS.forEach(d => S.f[d.id] = null);

    /* ---------- date helpers ---------- */
    A.QMON = q => q === null ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] : [q * 3, q * 3 + 1, q * 3 + 2];
    A.inSel = m => { if (S.mo !== null) return m === S.mo; if (S.q !== null) return A.QMON(S.q).includes(m); return true; };
    A.basis = () => S.mo !== null ? 'MoM' : 'YoY';
    A.periodLabel = function () {
      if (S.mo !== null) return MON[S.mo] + ' ' + S.y;
      if (S.q !== null) return 'Q' + (S.q + 1) + ' ' + S.y;
      return S.y + (T.fullYear ? ' · ' + T.fullYear : '');
    };

    /* ---------- THE shared slice layer ----------
       Every visual, KPI card and total goes through here, so a filter cannot be inert
       (qa-checklist Gate 5) and cannot be wired per-visual. Options:
         detail   : slice the detail grain instead of the fact grain
         timeline : ignore quarter/month (the trend exemption)
         y,months : explicit window (used by the previous-period comparison)
         pin      : {dim:id} force a member — implies ignoring the page filter on that dim
         ignore   : [dim] ignore the page filter on these dims (own-breakdown visuals) */
    A.slice = function (o) {
      o = o || {};
      var rows = o.detail ? (DT || []) : F;
      var y = o.y !== undefined ? o.y : S.y;
      var months = o.months || null;
      var pin = Object.assign({}, A.drillPin(), o.pin || {});
      var ignore = o.ignore || [];
      return rows.filter(function (r) {
        if (r.y !== y) return false;
        if (months) { if (!months.includes(r.m)) return false; }
        else if (!o.timeline && !A.inSel(r.m)) return false;
        for (var i = 0; i < DIMK.length; i++) {
          var k = DIMK[i];
          if (r[k] === undefined) continue;
          if (pin[k] !== undefined && pin[k] !== null) { if (r[k] !== pin[k]) return false; continue; }
          if (ignore.includes(k)) continue;
          if (S.f[k] && r[k] !== S.f[k]) return false;
        }
        return true;
      });
    };
    /* the drill-through page pins its entity on every visual of that page */
    A.drillPin = () => (S.drill && S.page === '__drill__') ? { [S.drill.dim]: S.drill.id } : {};

    /* ---------- THE shared aggregation layer ---------- */
    A.agg = function (rows) {
      var a = { n: rows.length }, i, k;
      for (k = 0; k < SUMS.length; k++) a[SUMS[k]] = 0;
      for (i = 0; i < rows.length; i++) for (k = 0; k < SUMS.length; k++) a[SUMS[k]] += rows[i][SUMS[k]] || 0;
      for (k = 0; k < MEAS.length; k++) {
        var m = MEAS[k];
        if (m.agg === 'sum') a[m.id] = a[m.field !== undefined ? m.field : m.id] || 0;
        else if (m.agg === 'diff') a[m.id] = (a[m.a] || 0) - (a[m.b] || 0);
        else if (m.agg === 'ratio') a[m.id] = a[m.den] ? a[m.num] / a[m.den] : 0;
        else if (m.agg === 'last') {
          /* stock / point-in-time metric: never summed ACROSS months, but summed across the
             members present in the latest month of the window (data-realism.md) */
          var best = -1, t;
          for (i = 0; i < rows.length; i++) { t = rows[i].y * 12 + rows[i].m; if (t > best) best = t; }
          var val = 0;
          for (i = 0; i < rows.length; i++) if (rows[i].y * 12 + rows[i].m === best) val += rows[i][m.field] || 0;
          a[m.id] = val;
        }
      }
      return a;
    };
    A.cur = o => A.agg(A.slice(o));
    /* previous comparable window — MoM wraps to December of the prior year, else YoY */
    A.prev = function (o) {
      o = Object.assign({}, o || {});
      if (S.mo !== null) {
        if (S.mo === 0) return A.agg(A.slice(Object.assign(o, { y: S.y - 1, months: [11] })));
        return A.agg(A.slice(Object.assign(o, { months: [S.mo - 1] })));
      }
      return A.agg(A.slice(Object.assign(o, { y: S.y - 1, months: A.QMON(S.q) })));
    };
    A.meas = id => MEASBY[id] || { id: id, format: 'N', label: id };
    A.mv = (id, a) => a[id] || 0;
    A.mfmt = function (id, v) { var m = A.meas(id); return f.apply(m.format || 'N', v); };
    A.delta = (c, p) => (p && isFinite(p) && Math.abs(p) > 1e-9) ? (c - p) / Math.abs(p) : 0;
    /* per-member aggregate of a dimension (own filter ignored, PBI highlight semantics) */
    A.byDim = function (dim, o) {
      o = o || {};
      return (dims[dim] || []).map(function (mb) {
        var s = Object.assign({}, o, { pin: Object.assign({}, o.pin || {}, { [dim]: mb.id }) });
        var p = Object.assign({}, s); delete p.y; delete p.months;
        return { m: mb, a: A.agg(A.slice(s)), b: A.prev(p) };
      });
    };

    /* ---------- KPI card — house signature ---------- */
    A.kpi = function (k) {
      var a = A.kpiState, c = a.cur, p = a.prev;
      var cv = A.mv(k.measure, c), pv = A.mv(k.measure, p);
      var d = A.delta(cv, pv);
      var cls = Math.abs(d) < .002 ? 'fl' : (d > 0 ? (k.inv ? 'dn' : 'up') : (k.inv ? 'up' : 'dn'));
      var ar = Math.abs(d) < .002 ? '—' : (d > 0 ? '▲' : '▼');
      return '<div class="card kpi" style="width:' + g.span(k.span || 1) + 'px">' +
        '<div><div class="k">' + M.esc(k.label) + '</div><div class="vr">' +
        '<div class="v tnum">' + A.mfmt(k.measure, cv) + '</div>' +
        '<div class="d ' + cls + ' tnum">' + ar + ' ' + f.pc(Math.abs(d)) + ' ' + A.basis() + '</div></div></div>' +
        '<div class="det tnum">' + A.detail(k, cv, pv) + '</div></div>';
    };
    /* descriptor line: `PY <x> | CY <y> | Var <z>` (MoM: Prec. | Corr.) */
    A.detail = function (k, cv, pv) {
      var mom = A.basis() === 'MoM';
      var lp = mom ? (T.prevShort || 'Prec.') : (T.pyShort || 'PY');
      var lc = mom ? (T.curShort || 'Corr.') : (T.cyShort || 'CY');
      var varTxt = (A.meas(k.measure).format === 'pc')
        ? f.pp(cv - pv)
        : (T.varShort || 'Var') + ' ' + (cv - pv >= 0 ? '+' : '−') + A.mfmt(k.measure, Math.abs(cv - pv));
      return lp + ' ' + A.mfmt(k.measure, pv) + ' | ' + lc + ' ' + A.mfmt(k.measure, cv) + ' | ' + varTxt;
    };

    /* ---------- page assembly ---------- */
    A.card = function (v, body, opts) {
      opts = opts || {};
      var head = v.title ? '<div class="ch"><h3>' + M.esc(v.title) + '</h3>' +
        (v.subtitle ? '<span class="hs">' + M.esc(A.tpl(v.subtitle)) + '</span>' : '') +
        (v.note ? '<span class="hr">' + M.esc(A.tpl(v.note)) + '</span>' : '') + '</div>' : '';
      return '<div class="card" style="width:' + g.span(v.span) + 'px' + (opts.flex ? ';display:flex;flex-direction:column' : '') + '">' +
        head + (v.legend ? A.legend(v) : '') + body + '</div>';
    };
    A.legend = v => '<div class="lgd">' + v.legend.map(function (l) {
      return '<span>' + (l.dash ? '<span class="ln"></span>' : '<i style="background:' + (l.c || 'var(--c2)') + '"></i>') + M.esc(A.tpl(l.l)) + '</span>';
    }).join('') + '</div>';
    /* tiny token interpolation for labels: {y} {py} {basis} {period} {drill} */
    A.tpl = s => String(s)
      .replace(/\{y\}/g, S.y).replace(/\{py\}/g, S.y - 1)
      .replace(/\{basis\}/g, A.basis()).replace(/\{period\}/g, A.periodLabel())
      .replace(/\{drill\}/g, S.drill ? A.dimLabel(S.drill.dim, S.drill.id) : '');

    A.page = id => SPEC.pages.filter(p => p.id === id)[0];

    A.buildPage = function (pg) {
      var out = '';
      if (pg.drillHeader) {
        var mb = A.member(S.drill.dim, S.drill.id);
        out += '<div class="row"><div class="card" style="width:' + g.CW + 'px;background:transparent;border:0;box-shadow:none;padding:0">' +
          '<div class="dhd"><button class="backb" id="btnBack">‹ ' + M.esc(pg.backLabel || 'Back') + '</button><div>' +
          '<div class="dt"><span class="sw" style="background:' + mb.c + ';width:9px;height:9px"></span>' + M.esc(mb.n) + '</div>' +
          '<div class="dsub">' + M.esc(A.tpl(pg.drillHeader)) + '</div></div></div></div></div>';
      }
      if (pg.kpiBand !== false && SPEC.kpiBand && SPEC.kpiBand.length) {
        A.kpiState = { cur: A.cur(), prev: A.prev() };
        out += '<div class="row">' + SPEC.kpiBand.map(A.kpi).join('') + '</div>';
      }
      (pg.rows || []).forEach(function (row) {
        out += '<div class="row"' + (row.flex ? ' style="flex:1;min-height:0"' : '') + '>' +
          row.visuals.map(v => A.visual(v, row)).join('') + '</div>';
      });
      return out;
    };

    A.visual = function (v, row) {
      var b = M.V[v.type];
      if (!b) return A.card(v, '<div class="mx">?</div>');
      return b(A, v, g.span(v.span), v.h || (row.flex ? 0 : 200));
    };

    /* ---------- render ---------- */
    var $ = s => doc.querySelector(s);
    A.render = function () {
      /* date slicer */
      if ($('#slCur')) {
        $('#slCur').textContent = A.periodLabel();
        $('#slPanel').classList.toggle('open', S.slOpen);
        $('#slYear').innerHTML = YRS.map(y => '<button class="slchip ' + (S.y === y ? 'on' : '') + '" data-y="' + y + '">' + y + '</button>').join('');
        $('#slQtr').innerHTML = '<button class="slchip ' + (S.q === null ? 'on' : '') + '" data-q="all">' + (T.all || 'Tutto') + '</button>' +
          [0, 1, 2, 3].map(q => '<button class="slchip ' + (S.q === q ? 'on' : '') + '" data-q="' + q + '">Q' + (q + 1) + '</button>').join('');
        var allowed = A.QMON(S.q);
        $('#slMon').innerHTML = '<button class="slchip mo ' + (S.mo === null ? 'on' : '') + '" data-m="all">' + (T.allM || 'Tutti') + '</button>' +
          MON.map((mn, i) => '<button class="slchip mo ' + (S.mo === i ? 'on' : '') + ' ' + (allowed.includes(i) ? '' : 'dis') + '" data-m="' + i + '">' + mn + '</button>').join('');
      }
      /* dimension filters */
      FDIMS.forEach(function (fd) {
        var el = $('#fl_' + fd.id); if (!el) return;
        if (fd.control === 'dropdown') {
          el.innerHTML = '<button class="slbtn ddbtn" data-dd="' + fd.id + '"><span class="cur">' +
            M.esc(S.f[fd.id] ? A.dimLabel(fd.id, S.f[fd.id]) : (fd.allLabel || 'Tutti')) + '</span><span class="car">▼</span></button>' +
            '<div class="slpanel ddp ' + (S.dd === fd.id ? 'open' : '') + '">' +
            '<div class="catitem ' + (S.f[fd.id] ? '' : 'on') + '" data-f="' + fd.id + ':">' + M.esc(fd.allLabel || 'Tutti') + '</div>' +
            dims[fd.id].map(m => '<div class="catitem ' + (S.f[fd.id] === m.id ? 'on' : '') + '" data-f="' + fd.id + ':' + m.id + '">' +
              '<span class="dot" style="background:' + m.c + '"></span>' + M.esc(m.n) + '</div>').join('') + '</div>';
        } else {
          el.innerHTML = dims[fd.id].map(m => '<div class="catitem ' + (S.f[fd.id] === m.id ? 'on' : '') + '" data-f="' + fd.id + ':' + m.id + '">' +
            '<span class="dot" style="background:' + m.c + '"></span>' + M.esc(m.n) + '</div>').join('');
        }
      });
      /* header */
      var pg = S.page === '__drill__' ? SPEC.drill.page : A.page(S.page);
      if ($('#hTtl')) $('#hTtl').textContent = A.tpl(S.page === '__drill__' ? A.dimLabel(S.drill.dim, S.drill.id) : pg.title);
      if ($('#hSub')) $('#hSub').textContent = A.tpl(pg.subtitle || '');
      if ($('#hCtx')) {
        var cx = ['<span class="ctxpill">' + (T.compare || 'Confronto') + ' ' + A.basis() + '</span>'];
        if (S.q !== null && S.mo === null) cx.push('<span class="ctxpill">' + (T.qtr || 'Trim.') + ' <b>Q' + (S.q + 1) + '</b></span>');
        if (S.mo !== null) cx.push('<span class="ctxpill">' + (T.month || 'Mese') + ' <b>' + MON[S.mo] + '</b></span>');
        FDIMS.forEach(fd => { if (S.f[fd.id]) cx.push('<span class="ctxpill">' + M.esc(fd.pill || fd.label) + ' <b>' + M.esc(A.dimLabel(fd.id, S.f[fd.id])) + '</b></span>'); });
        $('#hCtx').innerHTML = cx.join('');
      }
      /* page nav */
      A.doc.querySelectorAll('[data-page]').forEach(b => b.classList.toggle('on', b.getAttribute('data-page') === S.page));
      $('#page').innerHTML = A.buildPage(pg);
    };

    /* ---------- interactions ---------- */
    A.mount = function () {
      var tip = $('#tip');
      doc.addEventListener('mouseover', function (e) {
        var t = e.target.closest && e.target.closest('[data-tip]');
        if (!t) { if (tip) tip.style.opacity = 0; return; }
        if (tip) { tip.innerHTML = t.getAttribute('data-tip'); tip.style.opacity = 1; }
      });
      doc.addEventListener('mousemove', function (e) {
        if (!tip || tip.style.opacity !== '1') return;
        var x = e.clientX + 14, y = e.clientY + 16, w = doc.defaultView;
        if (x + tip.offsetWidth > w.innerWidth - 8) x = e.clientX - tip.offsetWidth - 14;
        if (y + tip.offsetHeight > w.innerHeight - 8) y = e.clientY - tip.offsetHeight - 14;
        tip.style.left = x + 'px'; tip.style.top = y + 'px';
      });
      doc.addEventListener('mouseout', function (e) {
        if (tip && (!e.relatedTarget || !(e.relatedTarget.closest && e.relatedTarget.closest('[data-tip]')))) tip.style.opacity = 0;
      });
      doc.addEventListener('click', function (e) {
        var t = e.target, cl = s => t.closest && t.closest(s);
        if (cl('#slBtn')) { S.slOpen = !S.slOpen; S.dd = null; A.render(); return; }
        var dd = cl('[data-dd]'); if (dd) { S.dd = S.dd === dd.getAttribute('data-dd') ? null : dd.getAttribute('data-dd'); S.slOpen = false; A.render(); return; }
        var yy = cl('[data-y]'); if (yy) { S.y = +yy.getAttribute('data-y'); A.render(); return; }
        var qq = cl('[data-q]'); if (qq) {
          var qv = qq.getAttribute('data-q'); S.q = qv === 'all' ? null : +qv;
          if (S.mo !== null && !A.QMON(S.q).includes(S.mo)) S.mo = null;
          A.render(); return;
        }
        var mm = cl('[data-m]');
        if (mm && !mm.classList.contains('dis')) {
          var mv = mm.getAttribute('data-m'); S.mo = mv === 'all' ? null : +mv;
          if (S.mo !== null) S.q = Math.floor(S.mo / 3);
          A.render(); return;
        }
        var pgb = cl('[data-page]'); if (pgb) { S.page = pgb.getAttribute('data-page'); S.drill = null; A.render(); return; }
        if (cl('#btnReset')) { FDIMS.forEach(d => S.f[d.id] = null); S.q = null; S.mo = null; A.render(); return; }
        if (cl('#btnBack')) { S.page = S.from; S.drill = null; A.render(); return; }
        var fe = cl('[data-f]');
        if (fe) {
          var p = fe.getAttribute('data-f').split(':'), k = p[0], v = p[1];
          S.f[k] = (v === '' || S.f[k] === v) ? null : v;      /* toggle off when re-clicked */
          S.dd = null; A.render(); return;
        }
        if (S.slOpen && !cl('#slPanel') && !cl('#slBtn')) { S.slOpen = false; A.render(); return; }
        if (S.dd && !cl('.ddp')) { S.dd = null; A.render(); }
      });
      doc.addEventListener('contextmenu', function (e) {
        var d = e.target.closest && e.target.closest('[data-drill]');
        if (!d) return;
        e.preventDefault();
        var p = d.getAttribute('data-drill').split(':');
        S.from = S.page === '__drill__' ? S.from : S.page;
        S.drill = { dim: p[0], id: p[1] }; S.page = '__drill__';
        if (tip) tip.style.opacity = 0;
        A.render();
      });
      A.fit = function () {
        var st = $('#stage'), cv = $('#canvas');
        if (st && cv) cv.style.transform = 'scale(' + Math.min(st.clientWidth / 1280, st.clientHeight / 720) + ')';
      };
      if (doc.defaultView) doc.defaultView.addEventListener('resize', A.fit);
      A.render(); A.fit();
      return A;
    };
    return A;
  };

  M.boot = function (SPEC, DATA, doc) { return M.app(SPEC, DATA, doc).mount(); };
})(MK);
/*#endregion*/

/*#region chart:trend*/
/* Trend — TIMELINE-EXEMPT: always the full 12 months of the selected year, current vs prior,
   highlighting the selected quarter/month span instead of collapsing to it. */
(function (M) {
  M.V.trend = function (A, v, w, h) {
    var f = A.f, S = A.S, b = v.bind || {}, ms = b.measure || (A.SPEC.model.measures[0] || {}).id;
    h = v.h || h || 206;
    var cur = [], prev = [], m;
    var byM = function (y) {
      var o = new Array(12).fill(0);
      A.slice({ y: y, timeline: true }).forEach(r => o[r.m] += r[ms] !== undefined ? r[ms] : 0);
      return o;
    };
    cur = byM(S.y); prev = byM(S.y - 1);
    var mgn = { t: 14, r: 14, b: 22, l: 46 }, iw = w - mgn.l - mgn.r, ih = h - mgn.t - mgn.b;
    var max = Math.max.apply(null, cur.concat(prev)) * 1.14 || 1, tk = M.ticks(max), top = tk[tk.length - 1] || 1;
    var Y = val => mgn.t + ih - (val / top) * ih, X = i => mgn.l + (iw / 11) * i;
    var s = '<svg width="' + w + '" height="' + h + '">';
    tk.forEach(function (t) {
      s += '<line x1="' + mgn.l + '" y1="' + Y(t).toFixed(1) + '" x2="' + (mgn.l + iw) + '" y2="' + Y(t).toFixed(1) + '" stroke="' + (t ? 'var(--line2)' : 'var(--line)') + '"/>' +
        '<text x="' + (mgn.l - 7) + '" y="' + (Y(t) + 3.5).toFixed(1) + '" text-anchor="end" font-size="8.5" fill="var(--muted2)" class="tnum">' + A.mfmt(ms, t) + '</text>';
    });
    for (m = 0; m < 12; m++) if (A.inSel(m) && (S.q !== null || S.mo !== null))
      s += '<rect x="' + (X(m) - iw / 22).toFixed(1) + '" y="' + mgn.t + '" width="' + (iw / 11).toFixed(1) + '" height="' + ih + '" fill="var(--c2)" opacity=".05"/>';
    var pa = '', pb = '';
    cur.forEach((val, i) => pa += (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(val).toFixed(1));
    prev.forEach((val, i) => pb += (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(val).toFixed(1));
    s += '<path d="' + pa + 'L' + X(11).toFixed(1) + ',' + (mgn.t + ih) + 'L' + mgn.l + ',' + (mgn.t + ih) + 'Z" fill="var(--c2)" opacity=".06"/>';
    s += '<path d="' + pb + '" fill="none" stroke="var(--muted2)" stroke-width="1.5" stroke-dasharray="4 3"/>';
    s += '<path d="' + pa + '" fill="none" stroke="var(--c2)" stroke-width="2"/>';
    cur.forEach(function (val, i) {
      s += '<circle class="hit" cx="' + X(i).toFixed(1) + '" cy="' + Y(val).toFixed(1) + '" r="3" fill="var(--card)" stroke="var(--c2)" stroke-width="1.7" data-tip="<b>' +
        A.MON[i] + ' ' + S.y + '</b><br>' + A.mfmt(ms, val) + '<br>' + (S.y - 1) + ': ' + A.mfmt(ms, prev[i]) + '<br>' +
        (A.T.varShort || 'Var') + ': ' + f.sgp(A.delta(val, prev[i])) + '"/>';
      s += '<text x="' + X(i).toFixed(1) + '" y="' + (h - 7) + '" text-anchor="middle" font-size="8.5" fill="' + (A.inSel(i) ? 'var(--ink2)' : 'var(--muted3)') + '">' + A.MON[i] + '</text>';
    });
    return A.card(v, s + '</svg>');
  };
})(MK);
/*#endregion*/

/*#region chart:donut*/
/* Donut — mix by dimension, centre total, side legend. 2-5 slices ideally (chart-selection). */
(function (M) {
  M.V.donut = function (A, v, w, h) {
    var b = v.bind || {}, dim = b.dim, ms = b.measure, S = A.S, f = A.f;
    h = v.h || h || 238;
    var data = A.byDim(dim, {}).map(r => ({ id: r.m.id, l: r.m.n, c: r.m.c, v: A.mv(ms, r.a) }))
      .filter(d => d.v > 0).sort((x, y) => y.v - x.v);
    var cx = w * .33, cy = h / 2, rO = Math.min(w * .30, h * .42), rI = rO * .6;
    var tot = data.reduce((a, d) => a + d.v, 0) || 1, ang = -Math.PI / 2;
    var s = '<svg width="' + w + '" height="' + h + '">';
    data.forEach(function (d) {
      var a2 = ang + (d.v / tot) * Math.PI * 2, big = (a2 - ang) > Math.PI ? 1 : 0;
      var P = (r, a) => [(cx + r * Math.cos(a)).toFixed(2), (cy + r * Math.sin(a)).toFixed(2)];
      var p1 = P(rO, ang), p2 = P(rO, a2), p3 = P(rI, a2), p4 = P(rI, ang);
      var dim2 = S.f[dim] && S.f[dim] !== d.id;
      s += '<path class="hit ' + (dim2 ? 'dimd' : '') + '" d="M' + p1[0] + ',' + p1[1] + ' A' + rO + ',' + rO + ' 0 ' + big + ' 1 ' + p2[0] + ',' + p2[1] +
        ' L' + p3[0] + ',' + p3[1] + ' A' + rI + ',' + rI + ' 0 ' + big + ' 0 ' + p4[0] + ',' + p4[1] + ' Z" fill="' + d.c +
        '" stroke="var(--card)" stroke-width="1.5" data-f="' + dim + ':' + d.id + '" data-tip="<b>' + M.esc(d.l) + '</b><br>' +
        A.mfmt(ms, d.v) + '<br>' + f.pc(d.v / tot) + '"/>';
      ang = a2;
    });
    s += '<text x="' + cx + '" y="' + (cy - 2) + '" text-anchor="middle" font-size="14" font-weight="600" fill="var(--ink)" class="tnum">' + A.mfmt(ms, tot) + '</text>';
    s += '<text x="' + cx + '" y="' + (cy + 12) + '" text-anchor="middle" font-size="8" fill="var(--muted2)">' + M.esc((v.centreLabel || A.meas(ms).label || '').toUpperCase()) + '</text>';
    var lx = w * .60, ly = cy - (data.length * 15.5) / 2 + 6;
    data.forEach(function (d) {
      s += '<rect x="' + lx + '" y="' + (ly - 7) + '" width="8" height="8" rx="1.5" fill="' + d.c + '"/>' +
        '<text x="' + (lx + 12) + '" y="' + ly + '" font-size="9.5" fill="var(--ink2)">' + M.esc(d.l) + '</text>' +
        '<text x="' + (w - 4) + '" y="' + ly + '" text-anchor="end" font-size="9" fill="var(--muted2)" class="tnum">' + f.pc(d.v / tot, 0) + '</text>';
      ly += 15.5;
    });
    return A.card(v, s + '</svg>');
  };
})(MK);
/*#endregion*/

/*#region chart:hbar*/
/* Ranked horizontal bars — sorted by value, coloured by the parent dimension. */
(function (M) {
  M.V.hbar = function (A, v, w, h) {
    var b = v.bind || {}, S = A.S, dim = b.dim, ms = b.measure;
    h = v.h || h || 190;
    var det = !!b.detail, rows = A.slice({ detail: det });   /* ranked lists respect every filter */
    var acc = {};
    rows.forEach(function (r) {
      var id = r[dim]; if (id === undefined) return;
      var k = acc[id] || (acc[id] = { id: id, v: 0, sub: 0, parent: b.parent ? r[b.parent] : null });
      k.v += r[ms] || 0; if (b.subMeasure) k.sub += r[b.subMeasure] || 0;
    });
    var data = Object.keys(acc).map(function (id) {
      var d = acc[id], mb = A.member(dim, id);
      return {
        id: id, l: mb.n, v: d.v, cat: d.parent,
        c: d.parent ? A.color(b.parent, d.parent) : mb.c,
        sub: (d.parent ? A.dimLabel(b.parent, d.parent) + ' · ' : '') + (b.subMeasure ? A.mfmt(b.subMeasure, d.sub) + (b.subUnit || '') : '')
      };
    }).sort((x, y) => y.v - x.v).slice(0, b.top || 8);
    var lw = Math.min(158, w * .42), m = { t: 5, r: 46, b: 5 }, ih = h - m.t - m.b, iw = w - lw - m.r;
    var max = Math.max.apply(null, data.map(d => d.v)) || 1, rh = ih / (data.length || 1), bh = Math.min(13, rh * .56);
    var s = '<svg width="' + w + '" height="' + h + '">';
    data.forEach(function (d, i) {
      var y = m.t + rh * i + rh / 2, bl = Math.max(1, (d.v / max) * iw);
      var dimd = b.parent && S.f[b.parent] && d.cat && S.f[b.parent] !== d.cat;
      s += '<g class="hit ' + (dimd ? 'dimd' : '') + '" ' + (b.parent && d.cat ? 'data-f="' + b.parent + ':' + d.cat + '"' : '') +
        ' data-tip="<b>' + M.esc(d.l) + '</b><br>' + A.mfmt(ms, d.v) + (d.sub ? '<br>' + M.esc(d.sub) : '') + '">' +
        '<rect x="0" y="' + (y - rh / 2).toFixed(1) + '" width="' + w + '" height="' + rh.toFixed(1) + '" fill="transparent"/>' +
        '<text x="' + (lw - 8) + '" y="' + (y + 3.5).toFixed(1) + '" text-anchor="end" font-size="9.5" fill="var(--ink2)">' + M.esc(d.l) + '</text>' +
        '<rect x="' + lw + '" y="' + (y - bh / 2).toFixed(1) + '" width="' + bl.toFixed(1) + '" height="' + bh + '" rx="1" fill="' + (d.c || 'var(--c2)') + '"/>' +
        '<text x="' + (lw + bl + 7).toFixed(1) + '" y="' + (y + 3.5).toFixed(1) + '" font-size="9" fill="var(--muted)" class="tnum">' + A.mfmt(ms, d.v) + '</text></g>';
    });
    return A.card(v, '<div style="flex:1;display:flex;align-items:center;padding-bottom:6px">' + s + '</svg></div>', { flex: true });
  };
})(MK);
/*#endregion*/

/*#region chart:matrix*/
/* The analytical matrix — the page's centre of gravity. Rows carry data-f (cross-filter) and
   data-drill (drill-through); the totals row recomputes from the visible rows. */
(function (M) {
  M.V.matrix = function (A, v, w, h) {
    var b = v.bind || {}, S = A.S, f = A.f, dim = b.dim, cols = b.columns || [];
    var rows = A.byDim(dim, {}).filter(r => r.a.n > 0);
    var sortM = b.sort || (cols[0] || {}).measure;
    rows.sort((x, y) => A.mv(sortM, y.a) - A.mv(sortM, x.a));
    var tot = A.agg(A.slice({ ignore: [dim] })), totP = A.prev({ ignore: [dim] });
    var head = '<tr><th>' + M.esc(b.label || dim) + '</th>' + cols.map(c => '<th>' + M.esc(A.tpl(c.label || A.meas(c.measure).label || '')) + '</th>').join('') + '</tr>';
    var cell = function (c, a, p, base) {
      var cv = A.mv(c.measure, a), pv = A.mv(c.measure, p);
      if (c.kind === 'var') {
        var d = A.delta(cv, pv), up = c.inv ? d < 0 : d >= 0;
        return '<td class="tnum ' + (up ? 'up' : 'dn') + '">' + (d >= 0 ? '▲ ' : '▼ ') + f.sgp(d) + '</td>';
      }
      if (c.kind === 'share') return '<td class="tnum">' + f.pc(base ? cv / base : 0, 0) + '</td>';
      if (c.kind === 'heat') {                    /* conditional formatting — house signature */
        var lim = c.scale || [0, 1], t = Math.max(0, Math.min(1, (cv - lim[0]) / ((lim[1] - lim[0]) || 1)));
        return '<td class="tnum" style="background:' + (t > .66 ? 'var(--heatHi)' : t > .33 ? 'var(--heatMid)' : 'var(--heatLo)') + '">' + A.mfmt(c.measure, cv) + '</td>';
      }
      return '<td class="tnum">' + A.mfmt(c.measure, cv) + '</td>';
    };
    var body = rows.map(function (r) {
      var cl = S.f[dim] ? (S.f[dim] === r.m.id ? 'sel' : 'dim') : '';
      return '<tr class="r ' + cl + '" data-f="' + dim + ':' + r.m.id + '"' + (b.drill === false ? '' : ' data-drill="' + dim + ':' + r.m.id + '"') + '>' +
        '<td><span class="sw" style="background:' + r.m.c + '"></span>' + M.esc(r.m.n) + '<span class="dg">›</span></td>' +
        cols.map(c => cell(c, r.a, r.b, A.mv(c.measure, tot))).join('') + '</tr>';
    }).join('');
    var totRow = b.totals === false ? '' : '<tr class="tot"><td>' + M.esc(b.totalsLabel || 'Total') + '</td>' +
      cols.map(function (c) {
        if (c.kind === 'share') return '<td class="tnum">100%</td>';
        if (c.kind === 'heat') return '<td class="tnum">' + A.mfmt(c.measure, A.mv(c.measure, tot)) + '</td>';
        return cell(c, tot, totP, A.mv(c.measure, tot));
      }).join('') + '</tr>';
    return A.card(v, '<div class="mx" style="flex:1"><table><thead>' + head + '</thead><tbody>' + body + totRow + '</tbody></table></div>', { flex: true });
  };
})(MK);
/*#endregion*/

/*#region chart:colline*/
/* Clustered column + line on a secondary axis — "actual vs prior with a rate line". */
(function (M) {
  M.V.colline = function (A, v, w, h) {
    var b = v.bind || {}, S = A.S, f = A.f, ms = b.measure, ln = b.line;
    h = v.h || h || 206;
    var cur = new Array(12).fill(0), pri = new Array(12).fill(0), lnum = new Array(12).fill(0), lden = new Array(12).fill(0);
    var lm = ln ? A.meas(ln) : null;
    A.slice({ timeline: true }).forEach(function (r) {
      cur[r.m] += r[ms] || 0;
      if (lm && lm.agg === 'ratio') { lnum[r.m] += r[lm.num] || 0; lden[r.m] += r[lm.den] || 0; }
      else if (lm) lnum[r.m] += r[lm.field || ln] || 0;
    });
    A.slice({ y: S.y - 1, timeline: true }).forEach(r => pri[r.m] += r[ms] || 0);
    var line = lnum.map((n, i) => (lm && lm.agg === 'ratio') ? (lden[i] ? n / lden[i] : 0) : n);
    var mgn = { t: 14, r: 40, b: 22, l: 46 }, iw = w - mgn.l - mgn.r, ih = h - mgn.t - mgn.b;
    var max = Math.max.apply(null, cur.concat(pri)) * 1.14 || 1, tk = M.ticks(max), top = tk[tk.length - 1] || 1;
    var lmax = Math.max.apply(null, line) * 1.25 || 1;
    var Y = val => mgn.t + ih - (val / top) * ih, Y2 = val => mgn.t + ih - (val / lmax) * ih;
    var cw = iw / 12, bw = cw * .34;
    var s = '<svg width="' + w + '" height="' + h + '">';
    tk.forEach(t => s += '<line x1="' + mgn.l + '" y1="' + Y(t).toFixed(1) + '" x2="' + (mgn.l + iw) + '" y2="' + Y(t).toFixed(1) + '" stroke="' + (t ? 'var(--line2)' : 'var(--line)') + '"/>' +
      '<text x="' + (mgn.l - 7) + '" y="' + (Y(t) + 3.5).toFixed(1) + '" text-anchor="end" font-size="8.5" fill="var(--muted2)" class="tnum">' + A.mfmt(ms, t) + '</text>');
    for (var i = 0; i < 12; i++) {
      var x0 = mgn.l + cw * i + cw / 2;
      s += '<rect class="hit" x="' + (x0 - bw - 1).toFixed(1) + '" y="' + Y(pri[i]).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(0, mgn.t + ih - Y(pri[i])).toFixed(1) +
        '" fill="var(--c5)" data-tip="<b>' + A.MON[i] + ' ' + (S.y - 1) + '</b><br>' + A.mfmt(ms, pri[i]) + '"/>';
      s += '<rect class="hit" x="' + (x0 + 1).toFixed(1) + '" y="' + Y(cur[i]).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(0, mgn.t + ih - Y(cur[i])).toFixed(1) +
        '" fill="var(--c2)" data-tip="<b>' + A.MON[i] + ' ' + S.y + '</b><br>' + A.mfmt(ms, cur[i]) + (ln ? '<br>' + A.meas(ln).label + ': ' + A.mfmt(ln, line[i]) : '') + '"/>';
      s += '<text x="' + x0.toFixed(1) + '" y="' + (h - 7) + '" text-anchor="middle" font-size="8.5" fill="' + (A.inSel(i) ? 'var(--ink2)' : 'var(--muted3)') + '">' + A.MON[i] + '</text>';
    }
    if (ln) {
      var p = '';
      line.forEach((val, k) => p += (k ? 'L' : 'M') + (mgn.l + cw * k + cw / 2).toFixed(1) + ',' + Y2(val).toFixed(1));
      s += '<path d="' + p + '" fill="none" stroke="var(--amber)" stroke-width="1.8"/>';
      line.forEach((val, k) => s += '<circle cx="' + (mgn.l + cw * k + cw / 2).toFixed(1) + '" cy="' + Y2(val).toFixed(1) + '" r="2.2" fill="var(--amber)"/>');
      s += '<text x="' + (w - 4) + '" y="' + (mgn.t + 6) + '" text-anchor="end" font-size="8.5" fill="var(--amber)">' + M.esc(A.meas(ln).label || '') + '</text>';
    }
    return A.card(v, s + '</svg>');
  };
})(MK);
/*#endregion*/

/*#region chart:stack100*/
/* 100% stacked bar — composition ("what share", not "how much"). */
(function (M) {
  M.V.stack100 = function (A, v, w, h) {
    var b = v.bind || {}, S = A.S, f = A.f, dim = b.dim, ms = b.measure, by = b.by || 'q';
    h = v.h || h || 190;
    var groups = by === 'q' ? [0, 1, 2, 3].map(q => ({ id: 'q' + q, l: 'Q' + (q + 1), months: A.QMON(q) }))
      : A.dims[by].map(m => ({ id: m.id, l: m.n, pin: { [by]: m.id } }));
    var cats = A.dims[dim];
    var lw = 96, m = { t: 6, r: 10, b: 6 }, rh = (h - m.t - m.b) / groups.length, bh = Math.min(20, rh * .6), iw = w - lw - m.r;
    var s = '<svg width="' + w + '" height="' + h + '">';
    groups.forEach(function (grp, i) {
      var y = m.t + rh * i + rh / 2, vals = {}, tot = 0;
      cats.forEach(function (c) {
        var o = { pin: Object.assign({ [dim]: c.id }, grp.pin || {}) };
        if (grp.months) o.months = grp.months;
        var val = A.mv(ms, A.agg(A.slice(o)));
        vals[c.id] = val; tot += val;
      });
      tot = tot || 1;
      var x = lw;
      s += '<text x="' + (lw - 8) + '" y="' + (y + 3.5).toFixed(1) + '" text-anchor="end" font-size="10" fill="var(--ink2)">' + M.esc(grp.l) + '</text>';
      cats.forEach(function (c) {
        var val = vals[c.id], bl = val / tot * iw;
        var dimd = S.f[dim] && S.f[dim] !== c.id;
        s += '<rect class="hit ' + (dimd ? 'dimd' : '') + '" x="' + x.toFixed(1) + '" y="' + (y - bh / 2).toFixed(1) + '" width="' + Math.max(0, bl - 1).toFixed(1) +
          '" height="' + bh + '" fill="' + c.c + '" data-f="' + dim + ':' + c.id + '" data-tip="<b>' + M.esc(grp.l + ' · ' + c.n) + '</b><br>' +
          A.mfmt(ms, val) + '<br>' + f.pc(val / tot) + '"/>';
        if (bl > 34) s += '<text x="' + (x + bl / 2).toFixed(1) + '" y="' + (y + 3).toFixed(1) + '" text-anchor="middle" font-size="8.5" fill="#fff">' + Math.round(val / tot * 100) + '%</text>';
        x += bl;
      });
    });
    return A.card(v, s + '</svg>');
  };
})(MK);
/*#endregion*/

/*#region chart:ribbon*/
/* Ribbon — rank flow across periods; shows the crossings a grouped bar buries. */
(function (M) {
  M.V.ribbon = function (A, v, w, h) {
    var b = v.bind || {}, dim = b.dim, ms = b.measure;
    h = v.h || h || 200;
    var periods = (b.by === 'm' ? A.MON.map((l, i) => ({ l: l, months: [i] })) : [0, 1, 2, 3].map(q => ({ l: 'Q' + (q + 1), months: A.QMON(q) })));
    var cats = A.dims[dim];
    var val = (cid, pi) => A.mv(ms, A.agg(A.slice({ pin: { [dim]: cid }, months: periods[pi].months })));
    var m = { t: 14, r: 10, b: 20, l: 34 }, iw = w - m.l - m.r, ih = h - m.t - m.b, gap = 6;
    var X = i => m.l + (iw / (periods.length - 1)) * i;
    var cols = periods.map(function (_, pi) {
      var arr = cats.map(c => ({ c: c, v: val(c.id, pi) })).sort((a, z) => z.v - a.v);
      var tot = arr.reduce((a, o) => a + o.v, 0) || 1, y = m.t, pos = {};
      arr.forEach(function (o) { var bh = (o.v / tot) * (ih - gap * (cats.length - 1)); pos[o.c.id] = { y0: y, y1: y + bh, v: o.v }; y += bh + gap; });
      return pos;
    });
    var s = '<svg width="' + w + '" height="' + h + '">';
    cats.forEach(function (c) {
      var dimd = A.S.f[dim] && A.S.f[dim] !== c.id;
      for (var p = 0; p < periods.length - 1; p++) {
        var a = cols[p][c.id], z = cols[p + 1][c.id], x1 = X(p), x2 = X(p + 1), cx = (x1 + x2) / 2;
        s += '<path class="' + (dimd ? 'dimd' : '') + '" d="M' + x1 + ',' + a.y0.toFixed(1) + ' C' + cx + ',' + a.y0.toFixed(1) + ' ' + cx + ',' + z.y0.toFixed(1) + ' ' + x2 + ',' + z.y0.toFixed(1) +
          ' L' + x2 + ',' + z.y1.toFixed(1) + ' C' + cx + ',' + z.y1.toFixed(1) + ' ' + cx + ',' + a.y1.toFixed(1) + ' ' + x1 + ',' + a.y1.toFixed(1) + ' Z" fill="' + c.c + '" opacity=".85"/>';
      }
      periods.forEach(function (pd, p) {
        var o = cols[p][c.id];
        s += '<rect class="hit ' + (dimd ? 'dimd' : '') + '" x="' + (X(p) - 5).toFixed(1) + '" y="' + o.y0.toFixed(1) + '" width="10" height="' + Math.max(1, o.y1 - o.y0).toFixed(1) +
          '" fill="' + c.c + '" data-f="' + dim + ':' + c.id + '" data-tip="<b>' + M.esc(c.n + ' · ' + pd.l) + '</b><br>' + A.mfmt(ms, o.v) + '"/>';
      });
    });
    periods.forEach((pd, p) => s += '<text x="' + X(p).toFixed(1) + '" y="' + (h - 6) + '" text-anchor="middle" font-size="9" fill="var(--muted)">' + M.esc(pd.l) + '</text>');
    return A.card(v, s + '</svg>');
  };
})(MK);
/*#endregion*/

/*#region chart:funnel*/
/* Funnel — stage-by-stage with step conversion. Stages are fact fields, so it filters like
   every other visual (through the shared slice layer). */
(function (M) {
  M.V.funnel = function (A, v, w, h) {
    var b = v.bind || {}, f = A.f, stages = b.stages || [];
    h = v.h || h || 200;
    var a = A.agg(A.slice({}));
    var vals = stages.map(st => A.mv(st.measure, a));
    var m = { t: 10, r: 12, b: 10, l: 12 }, ih = h - m.t - m.b, rh = ih / (stages.length || 1);
    var max = vals[0] || 1;
    var s = '<svg width="' + w + '" height="' + h + '">';
    stages.forEach(function (st, i) {
      var bw = Math.max(2, (vals[i] / max) * (w - m.l - m.r)), x = m.l + ((w - m.l - m.r) - bw) / 2, y = m.t + rh * i + rh * .12, bh = rh * .68;
      var conv = i ? (vals[i - 1] ? vals[i] / vals[i - 1] : 0) : 1;
      s += '<rect class="hit" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="2" fill="' + (st.c || 'var(--c2)') +
        '" data-tip="<b>' + M.esc(st.label) + '</b><br>' + A.mfmt(st.measure, vals[i]) + (i ? '<br>' + f.pc(conv) + ' ' + (A.T.conv || 'conv.') : '') + '"/>';
      s += '<text x="' + (x + 8) + '" y="' + (y + bh / 2 + 3.5).toFixed(1) + '" font-size="10" fill="#fff">' + M.esc(st.label) + '</text>';
      s += '<text x="' + (x + bw - 8) + '" y="' + (y + bh / 2 + 3.5).toFixed(1) + '" text-anchor="end" font-size="10" fill="#fff" class="tnum">' + A.mfmt(st.measure, vals[i]) + '</text>';
      if (i) s += '<text x="' + (w - 4) + '" y="' + (y + bh / 2 + 3.5).toFixed(1) + '" text-anchor="end" font-size="8.5" fill="var(--muted)" class="tnum">' + f.pc(conv, 0) + '</text>';
    });
    return A.card(v, s + '</svg>');
  };
})(MK);
/*#endregion*/

/*#region chart:waterfall*/
/* Waterfall / bridge — prior → current decomposed by a dimension. Totals dark, steps signed. */
(function (M) {
  M.V.waterfall = function (A, v, w, h) {
    var b = v.bind || {}, f = A.f, dim = b.dim, ms = b.measure;
    h = v.h || h || 206;
    var rows = A.byDim(dim, {});
    var start = rows.reduce((a, r) => a + A.mv(ms, r.b), 0), end = rows.reduce((a, r) => a + A.mv(ms, r.a), 0);
    var steps = rows.map(r => ({ l: r.m.n, d: A.mv(ms, r.a) - A.mv(ms, r.b), id: r.m.id })).sort((x, y) => Math.abs(y.d) - Math.abs(x.d));
    var bars = [{ l: A.tpl(b.startLabel || '{py}'), abs: start, kind: 't' }]
      .concat(steps.map(s2 => ({ l: s2.l, d: s2.d, kind: 's', id: s2.id })))
      .concat([{ l: A.tpl(b.endLabel || '{y}'), abs: end, kind: 't' }]);
    var mgn = { t: 14, r: 10, b: 24, l: 46 }, iw = w - mgn.l - mgn.r, ih = h - mgn.t - mgn.b;
    var lo = 0, hi = Math.max(start, end), run = start;
    steps.forEach(function (s2) { run += s2.d; hi = Math.max(hi, run); lo = Math.min(lo, run); });
    var tk = M.ticks(hi * 1.1 || 1), top = tk[tk.length - 1] || 1;
    var Y = val => mgn.t + ih - (val / top) * ih, cw = iw / bars.length, bw = cw * .62;
    var s = '<svg width="' + w + '" height="' + h + '">';
    tk.forEach(t => s += '<line x1="' + mgn.l + '" y1="' + Y(t).toFixed(1) + '" x2="' + (mgn.l + iw) + '" y2="' + Y(t).toFixed(1) + '" stroke="' + (t ? 'var(--line2)' : 'var(--line)') + '"/>' +
      '<text x="' + (mgn.l - 7) + '" y="' + (Y(t) + 3.5).toFixed(1) + '" text-anchor="end" font-size="8.5" fill="var(--muted2)" class="tnum">' + A.mfmt(ms, t) + '</text>');
    var cum = 0;
    bars.forEach(function (bar, i) {
      var x = mgn.l + cw * i + (cw - bw) / 2, y0, y1, fill, tipv;
      if (bar.kind === 't') { y0 = Y(bar.abs); y1 = Y(0); fill = 'var(--c1)'; cum = bar.abs; tipv = A.mfmt(ms, bar.abs); }
      else {
        var from = cum, to = cum + bar.d; cum = to;
        y0 = Y(Math.max(from, to)); y1 = Y(Math.min(from, to));
        fill = bar.d >= 0 ? 'var(--good)' : 'var(--bad)';
        tipv = (bar.d >= 0 ? '+' : '−') + A.mfmt(ms, Math.abs(bar.d));
      }
      s += '<rect class="hit" ' + (bar.id ? 'data-f="' + dim + ':' + bar.id + '"' : '') + ' x="' + x.toFixed(1) + '" y="' + y0.toFixed(1) + '" width="' + bw.toFixed(1) +
        '" height="' + Math.max(1, y1 - y0).toFixed(1) + '" fill="' + fill + '" data-tip="<b>' + M.esc(bar.l) + '</b><br>' + tipv + '"/>';
      s += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (h - 7) + '" text-anchor="middle" font-size="8" fill="var(--muted)">' + M.esc(bar.l.length > 12 ? bar.l.slice(0, 11) + '…' : bar.l) + '</text>';
    });
    return A.card(v, s + '</svg>');
  };
})(MK);
/*#endregion*/

/*#region chart:scatter*/
/* Scatter segmentation with median reference lines — the revenue-vs-margin tension. */
(function (M) {
  M.V.scatter = function (A, v, w, h) {
    var b = v.bind || {}, S = A.S, f = A.f, dim = b.dim;
    h = v.h || h || 206;
    var pts = A.byDim(dim, {}).filter(r => r.a.n > 0).map(r => ({ id: r.m.id, l: r.m.n, c: r.m.c, x: A.mv(b.x, r.a), y: A.mv(b.y, r.a), s: b.size ? A.mv(b.size, r.a) : 0 }));
    var med = function (arr) { var s2 = arr.slice().sort((p, q) => p - q); var n = s2.length; return n ? (n % 2 ? s2[(n - 1) / 2] : (s2[n / 2 - 1] + s2[n / 2]) / 2) : 0; };
    var mgn = { t: 14, r: 14, b: 24, l: 46 }, iw = w - mgn.l - mgn.r, ih = h - mgn.t - mgn.b;
    var xmax = Math.max.apply(null, pts.map(p => p.x)) * 1.15 || 1, ymax = Math.max.apply(null, pts.map(p => p.y)) * 1.15 || 1;
    var X = val => mgn.l + (val / xmax) * iw, Y = val => mgn.t + ih - (val / ymax) * ih;
    var mx = med(pts.map(p => p.x)), my = med(pts.map(p => p.y));
    var smax = Math.max.apply(null, pts.map(p => p.s)) || 1;
    var s = '<svg width="' + w + '" height="' + h + '">';
    M.ticks(ymax).forEach(t => s += '<line x1="' + mgn.l + '" y1="' + Y(t).toFixed(1) + '" x2="' + (mgn.l + iw) + '" y2="' + Y(t).toFixed(1) + '" stroke="var(--line2)"/>' +
      '<text x="' + (mgn.l - 7) + '" y="' + (Y(t) + 3.5).toFixed(1) + '" text-anchor="end" font-size="8.5" fill="var(--muted2)" class="tnum">' + A.mfmt(b.y, t) + '</text>');
    s += '<line x1="' + X(mx).toFixed(1) + '" y1="' + mgn.t + '" x2="' + X(mx).toFixed(1) + '" y2="' + (mgn.t + ih) + '" stroke="var(--muted2)" stroke-dasharray="3 3"/>';
    s += '<line x1="' + mgn.l + '" y1="' + Y(my).toFixed(1) + '" x2="' + (mgn.l + iw) + '" y2="' + Y(my).toFixed(1) + '" stroke="var(--muted2)" stroke-dasharray="3 3"/>';
    pts.forEach(function (p) {
      var r = b.size ? 4 + 7 * Math.sqrt(p.s / smax) : 6, dimd = S.f[dim] && S.f[dim] !== p.id;
      s += '<circle class="hit ' + (dimd ? 'dimd' : '') + '" cx="' + X(p.x).toFixed(1) + '" cy="' + Y(p.y).toFixed(1) + '" r="' + r.toFixed(1) + '" fill="' + p.c +
        '" fill-opacity=".85" stroke="var(--card)" data-f="' + dim + ':' + p.id + '" data-tip="<b>' + M.esc(p.l) + '</b><br>' +
        M.esc(A.meas(b.x).label || b.x) + ': ' + A.mfmt(b.x, p.x) + '<br>' + M.esc(A.meas(b.y).label || b.y) + ': ' + A.mfmt(b.y, p.y) + '"/>';
    });
    s += '<text x="' + (mgn.l + iw) + '" y="' + (h - 7) + '" text-anchor="end" font-size="8.5" fill="var(--muted)">' + M.esc(A.meas(b.x).label || b.x) + ' →</text>';
    return A.card(v, s + '</svg>');
  };
})(MK);
/*#endregion*/

/*#region chart:sparkline*/
/* Sparkline — tiny 12-month trend, used inside matrix rows or KPI footers. */
(function (M) {
  M.spark = function (A, w, h, ms, pin) {
    var vals = new Array(12).fill(0);
    A.slice({ timeline: true, pin: pin || {} }).forEach(r => vals[r.m] += r[ms] || 0);
    var max = Math.max.apply(null, vals) || 1, p = '';
    vals.forEach((v, i) => p += (i ? 'L' : 'M') + (i * (w / 11)).toFixed(1) + ',' + (h - (v / max) * h).toFixed(1));
    return '<svg width="' + w + '" height="' + h + '" style="vertical-align:middle"><path d="' + p + '" fill="none" stroke="var(--c3)" stroke-width="1.2"/></svg>';
  };
  M.V.sparkline = function (A, v, w, h) {
    return A.card(v, '<div class="mx">' + M.spark(A, w - 26, v.h || 40, (v.bind || {}).measure) + '</div>');
  };
})(MK);
/*#endregion*/

/*#region chart:narrative*/
/* Measure-driven narrative — the executive-minimal hero. Never authored prose: every span is
   interpolated from the same aggregates the KPI band reads. */
(function (M) {
  M.V.narrative = function (A, v, w, h) {
    var b = v.bind || {}, f = A.f;
    var cur = A.cur(), prev = A.prev();
    var txt = String(b.template || '').replace(/\{([a-z]+):?([a-zA-Z0-9_]*)\}/g, function (_, kind, arg) {
      var rows, best, worst;
      if (kind === 'm') return A.mfmt(arg, A.mv(arg, cur));
      if (kind === 'p') return A.mfmt(arg, A.mv(arg, prev));
      if (kind === 'var') return '<span class="' + (A.delta(A.mv(arg, cur), A.mv(arg, prev)) >= 0 ? 'up' : 'dn') + '">' + f.sgp(A.delta(A.mv(arg, cur), A.mv(arg, prev))) + '</span>';
      if (kind === 'bps') return f.bps(A.mv(arg, cur) - A.mv(arg, prev));
      if (kind === 'basis') return A.basis();
      if (kind === 'top' || kind === 'drag') {
        rows = A.byDim(b.dim, {}).map(r => ({ n: r.m.n, d: A.delta(A.mv(b.primary, r.a), A.mv(b.primary, r.b)) }))
          .sort((x, y) => y.d - x.d);
        if (!rows.length) return '—';
        best = rows[0]; worst = rows[rows.length - 1];
        var pick = kind === 'top' ? best : worst;
        return arg === 'var' ? '<span class="' + (pick.d >= 0 ? 'up' : 'dn') + '">' + f.sgp(pick.d) + '</span>' : M.esc(pick.n);
      }
      return '';
    });
    return A.card(v, '<div class="narr">' + txt + '</div>');
  };
})(MK);
/*#endregion*/

/*#region node*/
if (typeof module !== 'undefined' && module.exports) module.exports = MK;
/*#endregion*/
