/* Pruva runtime — the deterministic rendering engine.
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

  /* Quanto e larga una stringa, piu o meno. Serve a dimensionare le colonne delle etichette
     invece di riservare loro una frazione fissa della card: con etichette corte — "Ads",
     "Q1" — la frazione fissa lasciava un terzo del grafico vuoto a sinistra, e il disegno
     sembrava sbilanciato pur essendo corretto.
     Non e una misura vera (in SVG servirebbe il browser e qui si renderizza prima), ma una
     stima per eccesso sul carattere medio: meglio due pixel di troppo che un'etichetta
     tagliata. Le maiuscole e le cifre pesano di piu, gli spazi e la punteggiatura di meno. */
  M.largh = function (testo, px) {
    var s = String(testo == null ? '' : testo), w = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (/[A-ZÀÈÉÌÒÙ0-9%€]/.test(c)) w += 0.66;
      else if (/[ .,:;'·|!ilIJ]/.test(c)) w += 0.30;
      else if (/[mwMW]/.test(c)) w += 0.82;
      else w += 0.54;
    }
    return w * (px || 9.5);
  };
  /* IL CUSCINETTO. Ogni grafico tiene questa distanza dai bordi della sua card, a destra e a
     sinistra. Non e una raffinatezza: un disegno che tocca il bordo sembra tagliato anche
     quando e intero, e la revisione l'ha segnalato su sei mockup prima che diventasse una
     regola invece di un numero ripetuto a mano in ogni visual. */
  M.PAD = 12;

  /**
   * UN TESTO SU FONDO INCERTO. Un valore bianco scritto dentro una forma colorata funziona
   * finche resta dentro la forma: appena sporge — un nastro sottile ai bordi, un'etichetta
   * accanto a un arco — finisce sul fondo chiaro della card e sparisce. E' il difetto che la
   * revisione ha segnalato tre volte, su ribbon e gauge, con lo stesso rimedio: un velo sotto
   * il testo.
   * Il velo prende il colore che si vuole con l'opacita che si vuole, e le sue dimensioni si
   * ricavano dal testo — non ci sono numeri magici da tenere allineati a mano.
   */
  M.testoVelato = function (testo, x, y, o) {
    o = o || {};
    var px = o.px || 8.5, anc = o.anc || 'middle';
    var w = M.largh(testo, px) + (o.padX === undefined ? 7 : o.padX) * 2;
    var h = px + (o.padY === undefined ? 3 : o.padY) * 2;
    var rx = anc === 'end' ? x - w + 3 : anc === 'start' ? x - 3 : x - w / 2;
    return '<rect x="' + rx.toFixed(1) + '" y="' + (y - px + 1).toFixed(1) + '" width="' + w.toFixed(1) +
      '" height="' + h.toFixed(1) + '" rx="' + (h / 2).toFixed(1) + '" fill="' + (o.velo || 'var(--ink)') +
      '" opacity="' + (o.opacita === undefined ? 0.55 : o.opacita) + '" style="pointer-events:none"/>' +
      '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" text-anchor="' + anc +
      '" font-size="' + px + '" font-weight="' + (o.peso || 600) + '" fill="' + (o.ink || '#fff') +
      '" class="tnum" style="pointer-events:none">' + M.esc(testo) + '</text>';
  };

  /** La colonna delle etichette: quanto basta a contenerle, entro un tetto. */
  M.colonnaEtichette = function (etichette, px, tetto, pad) {
    var max = 0;
    (etichette || []).forEach(function (e) { max = Math.max(max, M.largh(e, px)); });
    return Math.min(tetto, Math.ceil(max) + (pad === undefined ? 10 : pad));
  };

  M.fmt = function (o) {
    o = o || {};
    var lang = o.locale || 'it-IT', cur = o.currency || '€';
    var comma = (o.decimal || (lang.slice(0, 2) === 'it' ? ',' : '.')) === ',';
    var d = s => comma ? String(s).replace('.', ',') : String(s);
    /* useGrouping esplicito: la regola "auto" dell'ICU omette il separatore sotto le cinquemila,
       quindi in una colonna di importi "9.870" finisce accanto a "3351" e la colonna si legge
       male. In un report il raggruppamento e sempre desiderato. */
    var num = v => Math.round(v).toLocaleString(lang, { useGrouping: true });
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
    /* Con DUE DECIMALI, per le misure che vivono sotto l'euro: un CPM, un costo per clic, un
       prezzo unitario. Arrotondato all'intero un CPM da 5,42 diventa 5 e un costo per clic da
       0,38 diventa zero — un numero vero e inutile, che e il modo peggiore di sbagliare. */
    f.eur2 = v => (!isFinite(v) ? cur + '0,00'
      : (v < 0 ? '−' : '') + cur + d(Math.abs(v).toFixed(2)));
    f.pc = function (v, k) { k = k === undefined ? 1 : k; return d((isFinite(v) ? v * 100 : 0).toFixed(k)) + '%'; };
    f.pp = function (v, k) { k = k === undefined ? 1 : k; v = isFinite(v) ? v : 0; return (v >= 0 ? '+' : '−') + d(Math.abs(v * 100).toFixed(k)) + ' pp'; };
    f.sgp = function (v, k) { v = isFinite(v) ? v : 0; return (v > 0 ? '+' : '−') + f.pc(Math.abs(v), k); };
    f.bps = function (v) { v = isFinite(v) ? v : 0; return Math.abs(v) < 5e-5 ? 'flat' : (v > 0 ? '+' : '−') + Math.abs(Math.round(v * 10000)) + 'bps'; };
    f.N = v => (isFinite(v) ? num(v) : '0');
    f.x = function (v, k) { k = k === undefined ? 1 : k; return d((isFinite(v) ? v : 0).toFixed(k)) + '×'; };
    f.days = v => M.fmtNum(v, 0) + (o.locale && o.locale.slice(0, 2) === 'it' ? ' gg' : ' d');
    /* I mesi hanno un formato loro perche il payback di un SaaS si dice in mesi e in nient'altro:
       con 'x' usciva "18,3x", che si legge come un moltiplicatore, e con 'days' "18 gg", che e
       il difetto opposto — il CAC payback di zero giorni che l'ancora della nicchia vieta. */
    f.months = function (v) {
      v = isFinite(v) ? v : 0;
      return d(v.toFixed(1)) + (o.locale && o.locale.slice(0, 2) === 'it' ? ' mesi' : ' mo');
    };
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
    /* Una dimensione e FILTRABILE se il report ha un controllo per lei. Serve ai visual per
       sapere se un clic dentro il disegno puo portare un filtro: cliccare su una dimensione di
       dettaglio che nessun controllo governa non filtrerebbe niente, e la barra si accenderebbe
       per finta. */
    A.filtrabile = id => FDIMS.some(f => f.id === id);

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
      var y = o.y !== undefined ? o.y : S.y;
      var months = o.months || null;
      var pin = Object.assign({}, A.drillPin(), o.pin || {});
      var ignore = o.ignore || [];
      var rows = o.detail ? (DT || []) : F;
      /* Una dimensione che vive solo nel grano di dettaglio (i corsi dentro una sede, i
         prodotti dentro una categoria) non compare nelle righe dei fatti: filtrarci sopra
         non cambierebbe nulla e il filtro sembrerebbe rotto. In quel caso si aggrega dal
         dettaglio, che quelle colonne ce le ha. */
      var detailOnly = !o.detail && DT && DT.length && A.detailOnly(pin, ignore);
      var keep = function (r) {
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
      };
      var out = (detailOnly ? DT : rows).filter(keep);
      if (detailOnly) out.fallback = F.filter(keep);   /* le misure che il dettaglio non ha */
      return out;
    };
    /* c'e un filtro attivo su una dimensione che i fatti non hanno ma il dettaglio si?
       (e il dettaglio porta tutte le misure sommabili, altrimenti si peggiorerebbe) */
    A.detailOnly = function (pin, ignore) {
      if (!F.length || !DT.length) return false;
      var some = SUMS.some(function (s) { return DT[0][s] !== undefined; });
      if (!some) return false;
      return DIMK.some(function (d) {
        if (ignore.includes(d)) return false;
        var active = (pin[d] !== undefined && pin[d] !== null) || S.f[d];
        return active && F[0][d] === undefined && DT[0][d] !== undefined;
      });
    };
    /* the drill-through page pins its entity on every visual of that page */
    A.drillPin = () => (S.drill && S.page === '__drill__') ? { [S.drill.dim]: S.drill.id } : {};

    /* ---------- THE shared aggregation layer ---------- */
    A.agg = function (rows) {
      /* Quando il filtro attivo vive solo nel dettaglio, rows sono le righe di dettaglio e
         rows.fallback quelle dei fatti: le misure che il dettaglio porta si aggregano da li,
         le altre restano sui fatti — esattamente come una dimensione che non e collegata a
         quella tabella dei fatti. Meglio un KPI che si muove su cio che puo, che un filtro
         che non fa niente. */
      var fb = rows.fallback, a = { n: rows.length }, i, k;
      var src = function (field) {
        return (fb && rows.length && rows[0][field] === undefined) ? fb : rows;
      };
      for (k = 0; k < SUMS.length; k++) {
        var fld = SUMS[k], rs = src(fld), t = 0;
        for (i = 0; i < rs.length; i++) t += rs[i][fld] || 0;
        a[fld] = t;
      }
      for (k = 0; k < MEAS.length; k++) {
        var m = MEAS[k];
        if (m.agg === 'sum') a[m.id] = a[m.field !== undefined ? m.field : m.id] || 0;
        else if (m.agg === 'diff') a[m.id] = (a[m.a] || 0) - (a[m.b] || 0);
        else if (m.agg === 'ratio') a[m.id] = a[m.den] ? a[m.num] / a[m.den] : 0;
        else if (m.agg === 'last') {
          /* stock / point-in-time metric: never summed ACROSS months, but summed across the
             members present in the latest month of the window (data-realism.md) */
          var rl = src(m.field), best = -1, t2;
          for (i = 0; i < rl.length; i++) { t2 = rl[i].y * 12 + rl[i].m; if (t2 > best) best = t2; }
          var val = 0;
          for (i = 0; i < rl.length; i++) if (rl[i].y * 12 + rl[i].m === best) val += rl[i][m.field] || 0;
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

    /* Aggrega per secchio PASSANDO dal layer condiviso, e l'unico modo lecito di ottenere il
       valore di una misura su un sottoinsieme di righe.
       Sommare la colonna grezza (r[ms]) sembra equivalente e non lo e: funziona per caso
       quando la misura e una somma il cui id coincide col nome del campo, e restituisce ZERO
       per ogni ratio, diff o last — perche r['er'] non esiste. E il motivo per cui lo stesso
       Engagement Rate valeva 0,9% nella matrice e 0,0% nelle barre accanto. */
    A.byKey = function (rows, keyOf) {
      var buckets = {}, order = [], i, k;
      for (i = 0; i < rows.length; i++) {
        k = keyOf(rows[i]);
        if (k === undefined || k === null) continue;
        if (!buckets[k]) { buckets[k] = []; order.push(k); }
        buckets[k].push(rows[i]);
      }
      var out = { keys: order, agg: {}, rows: buckets };
      for (i = 0; i < order.length; i++) {
        var b = buckets[order[i]];
        b.fallback = rows.fallback;      /* il ramo dettaglio resta disponibile al secchio */
        out.agg[order[i]] = A.agg(b);
      }
      return out;
    };
    /** Il valore di una misura, per secchio. Restituisce una funzione chiave -> valore. */
    A.byKeyValue = function (rows, keyOf, ms) {
      var g = A.byKey(rows, keyOf);
      return function (k) { return g.agg[k] ? A.mv(ms, g.agg[k]) : 0; };
    };

    /* ---------- KPI card — house signature ---------- */
    A.kpi = function (k) {
      var a = A.kpiState, c = a.cur, p = a.prev;
      var cv = A.mv(k.measure, c), pv = A.mv(k.measure, p);
      var m = A.meas(k.measure);
      var d = A.delta(cv, pv);
      /* Una percentuale non varia "del 10%": varia di punti. Un margine sceso dal 35,9% al
         32,3% e sceso di 3,6 punti; dire "▼ 10,0%" e aritmeticamente vero e si legge come
         un calo del dieci per cento del fatturato. La riga di dettaglio sotto lo diceva gia
         in punti, quindi la card contraddiceva se stessa a due centimetri di distanza. */
      var punti = m.unit === 'pct' || m.unit === 'pp' || m.format === 'pc';
      var dif = cv - pv;
      var piatto = punti ? Math.abs(dif) < 5e-4 : Math.abs(d) < .002;
      var su = punti ? dif > 0 : d > 0;
      var cls = piatto ? 'fl' : (su ? (k.inv ? 'dn' : 'up') : (k.inv ? 'up' : 'dn'));
      var ar = piatto ? '—' : (su ? '▲' : '▼');
      var ent = punti ? f.pp(Math.abs(dif)).slice(1) : f.pc(Math.abs(d));
      /* Nel blocco unico le card non hanno una larghezza propria: crescono in proporzione
         allo span dentro l'unica superficie, cosi i separatori cadono dove cade la griglia. */
      var kb = (SPEC.__pelle || {}).banda === 'blocco';
      var geo = kb ? 'flex:' + (k.span || 1) + ' 1 0;min-width:0' : 'width:' + g.span(k.span || 1) + 'px';
      return '<div class="card kpi" style="' + geo + '">' +
        '<div><div class="k">' + M.esc(k.label) + '</div><div class="vr">' +
        '<div class="v tnum">' + A.mfmt(k.measure, cv) + '</div>' +
        '<div class="d ' + cls + ' tnum">' + ar + ' ' + ent + ' ' + A.basis() + '</div></div></div>' +
        '<div class="det tnum">' + A.detail(k, cv, pv) + '</div></div>';
    };
    /* Riga descrittore: nomina i due periodi confrontati invece di abbreviarli.
       "AP"/"AC" (o "PY"/"CY") li capisce chi ha scritto il report, non il cliente che lo
       guarda per dieci secondi — e le etichette cosi restano nella lingua del report
       senza vocabolario da mantenere (pattern-library, KPI card). */
    A.periodPair = function () {
      if (S.mo !== null) {
        var pm = S.mo === 0 ? MON[11] + ' ' + (S.y - 1) : MON[S.mo - 1] + ' ' + S.y;
        return { prev: pm, cur: MON[S.mo] + ' ' + S.y };
      }
      var q = S.q !== null ? 'Q' + (S.q + 1) + ' ' : '';
      return { prev: q + (S.y - 1), cur: q + S.y };
    };
    A.detail = function (k, cv, pv) {
      var p = A.periodPair();
      var varTxt = (A.meas(k.measure).format === 'pc')
        ? f.pp(cv - pv)
        : (T.varShort || 'Var') + ' ' + (cv - pv >= 0 ? '+' : '−') + A.mfmt(k.measure, Math.abs(cv - pv));
      return p.prev + ' ' + A.mfmt(k.measure, pv) + ' | ' + p.cur + ' ' + A.mfmt(k.measure, cv) + ' | ' + varTxt;
    };

    /* ---------- page assembly ---------- */
    /* Una misura che vale zero su TUTTO il periodo filtrato non e un grafico piatto: e una
       misura che sotto questo filtro non esiste. La spesa paid con "Organico" selezionato ne e
       il caso tipico. Disegnare un grafico vuoto lascia il lettore a chiedersi se sia un dato
       o un difetto; dirlo lo toglie dal dubbio. Vale per ogni visual perche sta in A.card:
       nessun tipo di grafico puo dimenticarsene. */
    A.vuoto = function (v) {
      /* Solo i visual con UNA misura. Una matrice va lasciata stare: azzerare la sua prima
         colonna non la rende inapplicabile, e far sparire la tabella nasconderebbe tutte le
         altre colonne, che restano vere. Una tabella di zeri informa; una tabella assente no. */
      var b = v.bind || {}, ms = b.measure;
      if (!ms || v.type === 'narrative') return null;
      var m = A.meas(ms);
      if (m.agg === 'ratio' || m.agg === 'diff') return null;   /* zero puo essere un valore vero */
      /* l'aggregato del periodo filtrato e gia stato calcolato per la banda KPI */
      if (A.mv(ms, (A.kpiState || {}).cur || A.agg(A.slice({}))) !== 0) return null;
      /* zero adesso ma non sempre: e il filtro a spegnerla, non il dato che non c'e mai */
      var tutto = A.agg(A.slice({ ignore: Object.keys(A.S.f || {}) }));
      if (A.mv(ms, tutto) === 0) return null;
      return (m.label || ms) + ': non applicabile con i filtri attivi';
    };

    A.card = function (v, body, opts) {
      opts = opts || {};
      var na = A.vuoto(v);
      /* Lo stile sta nell'attributo e non in una regola CSS: la regola pesava su ogni mockup
         anche quando nessun visual si azzera mai, mentre cosi il costo lo paga solo il caso
         raro che lo usa davvero. */
      if (na) body = '<div style="flex:1;display:flex;align-items:center;justify-content:center;' +
        'text-align:center;padding:14px;font-size:11px;color:var(--muted)">' + M.esc(na) + '</div>';
      var head = v.title ? '<div class="ch"><h3>' + M.esc(A.tpl(v.title)) + '</h3>' +
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
        var kb = (SPEC.__pelle || {}).banda === 'blocco';
        out += '<div class="row' + (kb ? ' kb' : '') + '">' + SPEC.kpiBand.map(A.kpi).join('') + '</div>';
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
        $('#slMon').innerHTML = '<button class="slchip mo ' + (S.mo === null ? 'on' : '') + '" data-m="all">' + (T.allM || 'Tutti') + '</button>' +
          MON.map((mn, i) => '<button class="slchip mo ' + (S.mo === i ? 'on' : '')+ '" data-m="' + i + '">' + mn + '</button>').join('');
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
        if (mm) {
          var mv = mm.getAttribute('data-m'); S.mo = mv === 'all' ? null : +mv;
          if (S.mo !== null) S.q = Math.floor(S.mo / 3);
          A.render(); return;
        }
        var pgb = cl('[data-page]'); if (pgb) { S.page = pgb.getAttribute('data-page'); S.drill = null; A.render(); return; }
        if (cl('#btnReset')) { FDIMS.forEach(d => S.f[d.id] = null); S.q = null; S.mo = null; S.ord = {}; A.render(); return; }
        /* La scheda di interazione. Non passa da A.render(): e sopra il report, non dentro —
           aprirla non deve toccare lo stato dei filtri ne ridisegnare la pagina. */
        var hp = doc.getElementById('howp');
        if (hp && cl('#btnHow')) { hp.classList.add('open'); return; }
        if (hp && (cl('#btnHowX') || e.target === hp)) { hp.classList.remove('open'); return; }
        if (cl('#btnBack')) { S.page = S.from; S.drill = null; A.render(); return; }
        /* l'intestazione ordina, e non filtra: il clic si ferma qui prima di arrivare a
           [data-f], che sulla stessa riga non c'e ma su altre tabelle potrebbe esserci */
        var oe = cl('[data-ord]');
        if (oe) {
          var raw2 = oe.getAttribute('data-ord'), ix2 = raw2.indexOf(':');
          var dimO = raw2.slice(0, ix2), colO = raw2.slice(ix2 + 1);
          if (colO !== '__nome') colO = +colO;
          S.ord = S.ord || {};
          var cur = S.ord[dimO];
          /* stesso clic: si inverte. Colonna nuova: si parte dal piu alto per i numeri e dalla
             A per i nomi, che e cio che ci si aspetta in entrambi i casi. */
          S.ord[dimO] = (cur && String(cur.i) === String(colO))
            ? { i: colO, d: cur.d === 'asc' ? 'desc' : 'asc' }
            : { i: colO, d: colO === '__nome' ? 'asc' : 'desc' };
          A.render(); return;
        }
        var fe = cl('[data-f]');
        if (fe) {
          var raw = fe.getAttribute('data-f'), ix = raw.indexOf(':'), k = raw.slice(0, ix), v = raw.slice(ix + 1);
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
        var dr = d.getAttribute('data-drill'), dx = dr.indexOf(':'), p = [dr.slice(0, dx), dr.slice(dx + 1)];
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

/*#region chart:delta-card*/
/* DELTA-CARD — l'apertura di un report la cui domanda e "come sta cambiando".
   Anatomia, nell'ordine in cui si legge:
     1. il titolo, che dice cosa si sta misurando            (intestazione della card)
     2. LA VARIAZIONE come numero grande — mai il valore assoluto: se la domanda e il
        cambiamento, il cambiamento e il protagonista, e il livello e contesto
     3. la riga di dettaglio che NOMINA i due periodi e porta la variazione assoluta,
        perche "+18%" senza sapere +18% su cosa non e un'informazione
     4. un'area monocromatica ancorata al fondo della card: la traiettoria che ha prodotto
        quel numero, senza assi, senza griglia, senza secondo colore.
   Non e un'alternativa alla banda KPI: la banda dice DOVE SIAMO su quattro fronti, la
   delta-card dice DI QUANTO E CAMBIATO l'unico fronte che apre il discorso. Per questo e
   ammessa come apertura in ogni archetipo la cui domanda sia il cambiamento, non solo
   nell'executive summary. */
(function (M) {
  M.V['delta-card'] = function (A, v, w, h) {
    var f = A.f, S = A.S, b = v.bind || {}, ms = b.measure;
    h = v.h || h || 132;
    var m = A.meas(ms);
    var st = A.kpiState || { cur: A.cur(), prev: A.prev() };
    var cv = A.mv(ms, st.cur), pv = A.mv(ms, st.prev);
    var per = A.periodPair();
    /* Una percentuale non varia "del 18%": varia di punti. Il numero grande cambia natura
       con l'unita della misura, o si finisce col dire che un margine del 12% cresciuto al
       14% e cresciuto "del 16,7%" — vero e illeggibile. */
    var punti = m.unit === 'pct' || m.unit === 'pp' || m.format === 'pc';
    var conf = isFinite(pv) && Math.abs(pv) > 1e-9;
    var dif = cv - pv, rel = A.delta(cv, pv);
    var piatto = punti ? Math.abs(dif) < 5e-4 : Math.abs(rel) < .002;
    var cls = (!conf || piatto) ? 'fl' : ((dif > 0) === !v.inv ? 'up' : 'dn');
    var grande = !conf ? '—' : punti ? f.pp(dif) : f.sgp(rel);
    /* Senza un periodo precedente confrontabile la variazione non esiste. Stampare "+0,0%"
       sarebbe un numero inventato: si dice che il confronto manca e si mostra il livello. */
    var det = conf
      ? per.prev + ' ' + A.mfmt(ms, pv) + ' → ' + per.cur + ' ' + A.mfmt(ms, cv) +
        (punti ? '' : ' · ' + (dif >= 0 ? '+' : '−') + A.mfmt(ms, Math.abs(dif)))
      : per.cur + ' ' + A.mfmt(ms, cv) + ' · ' + (A.T.noPrev || 'nessun periodo precedente confrontabile');

    /* La traiettoria: i mesi dell'anno precedente e di quello corrente, quando ci sono
       entrambi. Passa dal layer condiviso, quindi una ratio qui vale quello che vale nella
       banda KPI e non una linea piatta a zero. */
    var anni = (A.DATA.years || [S.y]).filter(function (y) { return y === S.y || y === S.y - 1; }).sort();
    var vals = [], i, y, k;
    for (i = 0; i < anni.length; i++) {
      y = anni[i];
      var val = A.byKeyValue(A.slice({ y: y, timeline: true }), function (r) { return r.m; }, ms);
      for (k = 0; k < 12; k++) vals.push(val(k));
    }
    var ah = Math.max(26, h - 56), hi = Math.max.apply(null, vals), lo = Math.min.apply(null, vals);
    if (!isFinite(hi)) { hi = 1; lo = 0; }
    /* Base a zero per le misure che si sommano — una quantita disegnata da una base
       arbitraria esagera la sua stessa variazione. Per un tasso lo zero appiattisce tutto,
       quindi li si respira attorno al minimo osservato: e una traiettoria, non un asse. */
    var base = punti ? lo - (hi - lo || 1) * .35 : 0;
    var top = hi + (hi - base || 1) * .12, sp = (top - base) || 1;
    var step = w / Math.max(1, vals.length - 1);
    var X = function (i) { return i * step; };
    var Y = function (val) { return ah - ((val - base) / sp) * ah; };
    var s = '<svg width="' + w + '" height="' + ah + '" style="display:block">';
    /* il periodo selezionato, evidenziato come nel trend: il numero grande viene da li */
    if (S.q !== null || S.mo !== null) {
      var off = (anni.length - 1) * 12;
      for (i = 0; i < 12; i++) if (A.inSel(i))
        s += '<rect x="' + Math.max(0, X(off + i) - step / 2).toFixed(1) + '" y="0" width="' +
          step.toFixed(1) + '" height="' + ah + '" fill="var(--c2)" opacity=".06"/>';
    }
    var p = '';
    for (i = 0; i < vals.length; i++) p += (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(vals[i]).toFixed(1);
    /* L'area porta il suo tooltip: e l'unica parte della delta-card che rappresenta dei valori
       senza scriverli, e senza il tooltip resta un disegno di cui non si puo chiedere conto. */
    s += '<path class="hit" d="' + p + 'L' + X(vals.length - 1).toFixed(1) + ',' + ah + 'L0,' + ah +
      'Z" fill="var(--c2)" opacity=".13" data-tip="<b>' + M.esc(A.meas(ms).label || ms) +
      '</b><br>' + M.esc(A.T.trajectory || 'traiettoria mensile') + ': ' +
      A.mfmt(ms, Math.min.apply(null, vals)) + ' – ' + A.mfmt(ms, Math.max.apply(null, vals)) + '"/>';
    s += '<path d="' + p + '" fill="none" stroke="var(--c2)" stroke-width="1.6"/>';
    if (anni.length > 1)
      s += '<line x1="' + X(11.5).toFixed(1) + '" y1="0" x2="' + X(11.5).toFixed(1) + '" y2="' + ah +
        '" stroke="var(--line)" stroke-dasharray="3 3"/>';
    /* Il punto finale sta sul bordo destro dell'area, e un cerchio ha un raggio: senza questo
       rientro meta pallino finiva fuori dall'SVG e usciva tagliato a filo card. Tre pixel, ed
       e il genere di cosa che si vede solo quando qualcuno guarda il file. */
    var rP = 2.6;
    s += '<circle cx="' + Math.min(X(vals.length - 1), w - rP - 0.5).toFixed(1) + '" cy="' +
      Y(vals[vals.length - 1]).toFixed(1) + '" r="' + rP + '" fill="var(--c2)"/></svg>';

    /* La card si allunga fino all'altezza della riga — se accanto c'e un grafico con la
       legenda, la riga e piu alta di h. Con un'altezza fissa l'area restava a mezz'aria a
       venti pixel dal bordo, che e esattamente il difetto che "ancorata al fondo" evita:
       la colonna elastica la tiene incollata al bordo qualunque cosa ci sia accanto. */
    return A.card(v, '<div style="flex:1;min-height:0;display:flex;flex-direction:column;' +
      'overflow:hidden;border-radius:0 0 var(--radius) var(--radius)">' +
      '<div style="padding:1px 14px 0"><div class="dcv ' + cls + ' tnum">' + grande + '</div>' +
      '<div class="dcd tnum">' + M.esc(det) + '</div></div>' +
      '<div style="margin-top:auto">' + s + '</div></div>', { flex: true });
  };
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
    /* per mese, attraverso il layer condiviso: una misura ratio qui sommava la colonna grezza
       e usciva zero su tutti e dodici i mesi */
    var byM = function (y) {
      var val = A.byKeyValue(A.slice({ y: y, timeline: true }), r => r.m, ms);
      var o = new Array(12), i;
      for (i = 0; i < 12; i++) o[i] = val(i);
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
/* Donut — il visual della CONCENTRAZIONE, non la torta decorativa.
 *
 * A cosa serve davvero: in quasi ogni impresa vale una versione della legge di Pareto — pochi
 * clienti fanno il grosso del fatturato, pochi prodotti il grosso del margine, poche
 * piattaforme il grosso della spesa. E la concentrazione e FRAGILITA: "il 68% del fatturato
 * viene da tre clienti" non e una statistica, e un rischio di dipendenza, ed e il gancio di
 * pre-vendita piu forte che un mockup possa avere.
 *
 * Percio il donut dice due cose in un colpo: al centro il numero che riassume (il totale, o
 * LA QUOTA quando il messaggio e proprio la concentrazione), nell'anello come quel totale si
 * spacca fra poche categorie.
 *
 * `topN` aggrega la coda in "Altri": e cio che rende leggibile un donut su una dimensione con
 * dodici membri senza trasformarlo in una ruota di spicchi.
 */
(function (M) {
  M.V.donut = function (A, v, w, h) {
    var b = v.bind || {}, dim = b.dim, ms = b.measure, S = A.S, f = A.f;
    h = v.h || h || 238;
    var data = A.byDim(dim, {}).map(r => ({ id: r.m.id, l: r.m.n, c: r.m.c, v: A.mv(ms, r.a) }))
      .filter(d => d.v > 0).sort((x, y) => y.v - x.v);
    /* La coda: sommata in un solo spicchio grigio. Non e una semplificazione grafica — e cio
       che l'occhio deve vedere, "questi pochi contro tutto il resto". */
    var testa = data.length, quotaTesta = 0;
    if (b.topN && data.length > b.topN + 1) {
      var coda = data.slice(b.topN).reduce((a, d) => a + d.v, 0);
      data = data.slice(0, b.topN);
      testa = b.topN;
      data.push({ id: '__altri', l: b.altriLabel || (A.T.others || 'Altri'), c: 'var(--muted3)', v: coda, coda: true });
    }
    /* IL CUSCINETTO E' COSTANTE DA TUTTE E DUE LE PARTI. Prima l'anello stava al 30% della
       larghezza con un margine sinistro del 4%, e la legenda arrivava a quattro pixel dal
       bordo destro: il disegno appariva spinto a destra e senza aria, ed e il difetto che la
       revisione ha segnalato su quattro donut diversi. Ora si fissa il margine e l'anello si
       CENTRA nello spazio che gli resta, invece di stare a una frazione fissa. */
    var PAD = 12, lx = Math.max(w * .56, w - 190);
    var zona0 = PAD, zona1 = lx - 12;
    var cx = (zona0 + zona1) / 2, cy = h / 2;
    var rO = Math.max(18, Math.min((zona1 - zona0) / 2, h * .44)), rI = rO * .6;
    var tot = data.reduce((a, d) => a + d.v, 0) || 1, ang = -Math.PI / 2;
    for (var _t = 0; _t < Math.min(testa, data.length); _t++) quotaTesta += data[_t].v;
    var s = '<svg width="' + w + '" height="' + h + '">';
    data.forEach(function (d) {
      var a2 = ang + (d.v / tot) * Math.PI * 2, big = (a2 - ang) > Math.PI ? 1 : 0;
      var P = (r, a) => [(cx + r * Math.cos(a)).toFixed(2), (cy + r * Math.sin(a)).toFixed(2)];
      var p1 = P(rO, ang), p2 = P(rO, a2), p3 = P(rI, a2), p4 = P(rI, ang);
      var dim2 = S.f[dim] && S.f[dim] !== d.id;
      /* Rosso solo al problema: lo spicchio segnalato dalla spec, mai una tinta a caso. */
      var col = (b.alert && b.alert === d.id) ? 'var(--bad)' : d.c;
      s += '<path class="hit ' + (dim2 ? 'dimd' : '') + '" d="M' + p1[0] + ',' + p1[1] + ' A' + rO + ',' + rO + ' 0 ' + big + ' 1 ' + p2[0] + ',' + p2[1] +
        ' L' + p3[0] + ',' + p3[1] + ' A' + rI + ',' + rI + ' 0 ' + big + ' 0 ' + p4[0] + ',' + p4[1] + ' Z" fill="' + col +
        '" stroke="var(--card)" stroke-width="1.5" data-f="' + dim + ':' + (d.coda ? '' : d.id) + '" data-tip="<b>' + M.esc(d.l) + '</b><br>' +
        A.mfmt(ms, d.v) + '<br>' + f.pc(d.v / tot) + '"/>';
      /* La QUOTA sullo spicchio, non il valore: la domanda del donut e "quanta parte", e il
         valore sta gia nella legenda e nel tooltip. Sotto il 9% non ci sta e si omette. */
      if (d.v / tot >= 0.09 && !dim2) {
        var am = (ang + a2) / 2, rm = (rO + rI) / 2;
        s += '<text x="' + (cx + rm * Math.cos(am)).toFixed(1) + '" y="' + (cy + rm * Math.sin(am) + 3).toFixed(1) +
          '" text-anchor="middle" font-size="9" font-weight="600" fill="#fff" class="tnum" ' +
          'style="pointer-events:none">' + f.pc(d.v / tot, 0) + '</text>';
      }
      ang = a2;
    });
    /* Il numero al centro e SEMPRE calcolato: il totale, oppure la quota della testa quando il
       messaggio e la concentrazione. Mai un testo fisso scritto nella spec. */
    var centro = b.centre === 'share' ? f.pc(quotaTesta / tot, 0) : A.mfmt(ms, tot);
    s += '<text x="' + cx + '" y="' + (cy - 2) + '" text-anchor="middle" font-size="' +
      (b.centre === 'share' ? 19 : 14) + '" font-weight="600" fill="var(--ink)" class="tnum">' + centro + '</text>';
    s += '<text x="' + cx + '" y="' + (cy + 12) + '" text-anchor="middle" font-size="8" fill="var(--muted2)">' + M.esc((v.centreLabel || A.meas(ms).label || '').toUpperCase()) + '</text>';
    /* Legenda: sta accanto alla ciambella, e ogni voce filtra come la fetta.
       Il passo si adatta all'altezza della card, cosi non deborda quando il fit
       stringe il grafico (pattern-library, legende). */
    var wide = w > 300;
    var step = Math.max(11, Math.min(15.5, (h - 16) / Math.max(1, data.length)));
    var ly = cy - (data.length * step) / 2 + step * .7;
    data.forEach(function (d) {
      var dimd = S.f[dim] && S.f[dim] !== d.id;
      s += '<g class="hit ' + (dimd ? 'dimd' : '') + '" data-f="' + dim + ':' + d.id +
        '" data-tip="<b>' + M.esc(d.l) + '</b><br>' + A.mfmt(ms, d.v) + '<br>' + f.pc(d.v / tot) + '">' +
        '<rect x="' + lx + '" y="' + (ly - 7.5) + '" width="' + (w - lx - PAD) + '" height="' + Math.min(step, 15) + '" fill="transparent"/>' +
        '<rect x="' + lx + '" y="' + (ly - 6.5) + '" width="8" height="8" rx="1.5" fill="' + d.c + '"/>' +
        '<text x="' + (lx + 12) + '" y="' + ly + '" font-size="9.5" fill="var(--ink2)">' + M.esc(d.l) + '</text>' +
        (wide ? '<text x="' + (w - PAD - 30) + '" y="' + ly + '" text-anchor="end" font-size="9" fill="var(--muted)" class="tnum">' + A.mfmt(ms, d.v) + '</text>' : '') +
        '<text x="' + (w - PAD) + '" y="' + ly + '" text-anchor="end" font-size="9" fill="var(--muted2)" class="tnum">' + f.pc(d.v / tot, 0) + '</text></g>';
      ly += step;
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
    /* per membro, attraverso il layer condiviso: qui si sommava la colonna grezza, e una misura
       ratio (Engagement Rate, Unfollow/Nuovi) usciva 0,0% su ogni barra mentre la matrice
       accanto mostrava il valore giusto */
    var grp = A.byKey(rows, r => r[dim]);
    var parentOf = {};
    if (b.parent) grp.keys.forEach(function (id) { parentOf[id] = (grp.rows[id][0] || {})[b.parent]; });
    var data = grp.keys.map(function (id) {
      var a = grp.agg[id], mb = A.member(dim, id), par = b.parent ? parentOf[id] : null;
      return {
        id: id, l: mb.n, v: A.mv(ms, a), cat: par,
        c: par ? A.color(b.parent, par) : mb.c,
        sub: (par ? A.dimLabel(b.parent, par) + ' · ' : '') + (b.subMeasure ? A.mfmt(b.subMeasure, A.mv(b.subMeasure, a)) + (b.subUnit || '') : '')
      };
    }).sort((x, y) => y.v - x.v).slice(0, b.top || 8);
    /* La colonna delle etichette vale quanto le etichette, non una frazione della card: con
       nomi corti — "Ads", "Fiere" — il 42% fisso lasciava un terzo del grafico vuoto a
       sinistra, e le barre partivano da meta riquadro senza motivo. Il tetto resta, perche un
       nome lunghissimo non deve mangiarsi il grafico. */
    var lw = M.colonnaEtichette(data.map(d => d.l), 9.5, Math.min(158, w * .42), 10);
    var m = { t: 5, r: 46, b: 5 }, ih = h - m.t - m.b, iw = w - lw - m.r - M.PAD;
    var max = Math.max.apply(null, data.map(d => d.v)) || 1, rh = ih / (data.length || 1), bh = Math.min(13, rh * .56);
    var s = '<svg width="' + w + '" height="' + h + '">';
    data.forEach(function (d, i) {
      var y = m.t + rh * i + rh / 2, bl = Math.max(1, (d.v / max) * iw);
      var dimd = b.parent && S.f[b.parent] && d.cat && S.f[b.parent] !== d.cat;
      /* Il clic filtra: la dimensione padre quando la barra e una voce di dettaglio, altrimenti
         la dimensione della barra stessa — purche il report abbia un controllo per governarla.
         Prima il data-f usciva SOLO col padre: una hbar su una dimensione filtrabile aveva la
         classe "hit" e il tooltip, sembrava cliccabile, e non filtrava niente. */
      var df = (b.parent && d.cat) ? b.parent + ':' + d.cat
        : (A.filtrabile(dim) ? dim + ':' + d.id : '');
      s += '<g class="hit ' + (dimd ? 'dimd' : '') + '" ' + (df ? 'data-f="' + df + '"' : '') +
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
    /* L'ORDINE LO DECIDE ANCHE IL LETTORE. La spec dice da cosa partire, ma chi guarda una
       tabella prova a cliccare l'intestazione: e il gesto piu automatico che ci sia davanti a
       delle colonne di numeri, e finora non succedeva niente. Lo stato vive per tabella (la
       chiave e la dimensione), cosi due matrici sulla stessa pagina si ordinano ognuna per
       conto suo, e si azzera col resto dei filtri. */
    var ord = (S.ord || {})[dim];
    /* La chiave e l'INDICE della colonna, non la misura: due colonne possono legare la stessa
       misura — il valore e la sua variazione — e ordinare "per ricavi" sarebbe ambiguo, oltre
       ad accendere la freccia su tutte e due. */
    var valOrd = function (r, i) {
      if (i === '__nome') return null;
      var c = cols[i];
      if (!c) return 0;
      if (c.kind === 'var') return A.delta(A.mv(c.measure, r.a), A.mv(c.measure, r.b));
      return A.mv(c.measure, r.a);
    };
    if (ord) {
      var verso = ord.d === 'asc' ? 1 : -1;
      if (ord.i === '__nome') {
        rows.sort(function (x, y) { return verso * String(x.m.n).localeCompare(String(y.m.n)); });
      } else {
        rows.sort(function (x, y) { return verso * (valOrd(x, ord.i) - valOrd(y, ord.i)); });
      }
    } else {
      var sortM = b.sort || (cols[0] || {}).measure;
      rows.sort(function (x, y) { return A.mv(sortM, y.a) - A.mv(sortM, x.a); });
    }
    var tot = A.agg(A.slice({ ignore: [dim] })), totP = A.prev({ ignore: [dim] });
    var frec = function (chiave) {
      if (!ord || String(ord.i) !== String(chiave)) return '<span class="so"> ⇅</span>';
      return '<span class="so on"> ' + (ord.d === 'asc' ? '▲' : '▼') + '</span>';
    };
    var head = '<tr><th class="ord" data-ord="' + dim + ':__nome">' +
      M.esc(A.tpl(b.label || dim)) + frec('__nome') + '</th>' +
      cols.map(function (c, i) {
        return '<th class="ord" data-ord="' + dim + ':' + i + '">' +
          M.esc(A.tpl(c.label || A.meas(c.measure).label || '')) + frec(i) + '</th>';
      }).join('') + '</tr>';
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
    /* colonne, linea e anno precedente: tutti dal layer condiviso. Prima la linea aveva un
       caso speciale scritto a mano per le ratio — che copriva le ratio e sbagliava diff e last,
       mentre le colonne sommavano comunque la colonna grezza. */
    var lm = ln ? A.meas(ln) : null;
    var gCur = A.byKey(A.slice({ timeline: true }), r => r.m);
    var gPri = A.byKey(A.slice({ y: S.y - 1, timeline: true }), r => r.m);
    var cur = new Array(12), pri = new Array(12), line = new Array(12), _i;
    for (_i = 0; _i < 12; _i++) {
      cur[_i] = gCur.agg[_i] ? A.mv(ms, gCur.agg[_i]) : 0;
      pri[_i] = gPri.agg[_i] ? A.mv(ms, gPri.agg[_i]) : 0;
      line[_i] = (lm && gCur.agg[_i]) ? A.mv(ln, gCur.agg[_i]) : 0;
    }
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
      s += '<text x="' + (w - M.PAD) + '" y="' + (mgn.t + 6) + '" text-anchor="end" font-size="8.5" fill="var(--amber)">' + M.esc(A.meas(ln).label || '') + '</text>';
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
    /* stessa regola dell'hbar: "Q1" non ha bisogno di novantasei pixel */
    var lw = M.colonnaEtichette(groups.map(g => g.l), 10, 96, 10);
    var m = { t: 6, r: M.PAD, b: 6 }, rh = (h - m.t - m.b) / groups.length, bh = Math.min(20, rh * .6), iw = w - lw - m.r;
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

/*#region chart:gauge*/
/* Gauge — un valore contro il suo bersaglio. Firma dell'autore in B2B sales (quota attainment,
   win rate) e creator-economy (target achievement).
   Tre parti, e nessuna e decorativa:
     · l'arco, che dice quanto si e fatto rispetto al massimo;
     · il MARCATORE del bersaglio, una tacca sull'arco: senza, il numero non ha un metro;
     · l'ANNOTAZIONE, una frase costruita dalle misure, non un testo fisso.
   Niente ombre e niente gradienti: la profondita di un report Power BI sta nelle superfici,
   non negli effetti. Il colore segue la regola di casa — rosso solo quando c'e un problema,
   cioe solo quando si sta sotto il bersaglio. */
(function (M) {
  M.V.gauge = function (A, v, w, h) {
    var b = v.bind || {}, ms = b.measure, tg = b.target;
    h = v.h || h || 180;
    var a = A.agg(A.slice({}));
    var val = A.mv(ms, a);
    /* il bersaglio puo essere un'altra misura (budget, quota) o un numero fisso nella spec */
    var target = (typeof tg === 'number') ? tg : (tg ? A.mv(tg, a) : 0);
    /* il fondo scala: per una percentuale si ferma a 1, altrimenti al piu grande fra valore e
       bersaglio con un margine, cosi la lancetta non tocca mai il bordo */
    var pct = (A.meas(ms).unit === 'pct');
    var max = b.max !== undefined ? b.max : (pct ? 1 : Math.max(val, target) * 1.15 || 1);
    var q = max ? Math.min(1, Math.max(0, val / max)) : 0;
    var qt = max ? Math.min(1, Math.max(0, target / max)) : 0;

    /* LA GEOMETRIA NASCE DALLO SPAZIO, non da due frazioni scelte a occhio.
       Il raggio non e l'unica cosa che occupa posto: l'arco ha uno SPESSORE (sw ~ 0,16 r) che
       sporge di meta da entrambe le parti, e sopra ci va l'etichetta del bersaglio. Con
       `r = min(w*0.40, h*0.78)` il bordo superiore dell'arco finiva sette pixel SOPRA il
       riquadro — tagliato — ed e il difetto segnalato dalla revisione.
       Qui il raggio si ricava dai vincoli: sta dentro in orizzontale (r + sw/2 <= meta
       larghezza) e in verticale (cy - r - sw/2 >= spazio per l'etichetta). Siccome sw dipende
       da r, i due vincoli si risolvono in una divisione per 1,08 invece che a tentativi. */
    var cx = w / 2;
    var mTop = tg !== undefined ? 15 : 6;   /* la tacca del bersaglio scrive li sopra */
    var mBot = 34;                          /* il valore grande e l'annotazione sotto l'arco */
    var cy = h - mBot;
    var rMax = Math.min((w / 2 - 6) / 1.08, (cy - mTop) / 1.08);
    var r = Math.max(24, rMax);
    var sw = Math.max(9, r * .16);
    /* semicerchio da sinistra a destra: 180 gradi e la forma che si legge senza istruzioni */
    var P = function (t) { var an = Math.PI * (1 - t); return [cx + r * Math.cos(an), cy - r * Math.sin(an)]; };
    var arc = function (t0, t1) {
      var s0 = P(t0), s1 = P(t1);
      return 'M' + s0[0].toFixed(1) + ',' + s0[1].toFixed(1) + ' A' + r + ',' + r + ' 0 0 1 ' + s1[0].toFixed(1) + ',' + s1[1].toFixed(1);
    };
    var sotto = target > 0 && val < target;
    var colore = target > 0 ? (sotto ? 'var(--bad)' : 'var(--good)') : 'var(--c2)';

    var s = '<svg width="' + w + '" height="' + h + '">';
    s += '<path d="' + arc(0, 1) + '" fill="none" stroke="var(--line)" stroke-width="' + sw + '" stroke-linecap="round"/>';
    /* L'arco porta il suo tooltip come ogni altro elemento di dato: il gauge mostra il valore
       grande al centro, ma il BERSAGLIO e lo scarto vivevano solo nell'annotazione sotto, e chi
       passa sopra l'arco si aspetta di leggerli li. */
    if (q > 0) s += '<path class="hit" d="' + arc(0, q) + '" fill="none" stroke="' + colore +
      '" stroke-width="' + sw + '" stroke-linecap="round" data-tip="<b>' +
      M.esc(A.meas(ms).label || ms) + '</b><br>' + A.mfmt(ms, val) +
      (tg !== undefined ? '<br>' + M.esc(b.targetLabel || (A.T.target || 'obiettivo')) + ': ' +
        A.mfmt(ms, target) : '') + '"/>';

    /* il marcatore del bersaglio: una tacca che attraversa l'arco, non una seconda lancetta */
    if (target > 0) {
      var an = Math.PI * (1 - qt), c = Math.cos(an), sn = Math.sin(an);
      var r0 = r - sw * .8, r1 = r + sw * .8;
      /* IL BERSAGLIO DEVE STACCARE. Una tacca sottile in inchiostro su un arco colorato si
         perde: la revisione l'ha segnalata due volte, "il target non e chiaro visivamente".
         Sotto la tacca corre una seconda linea del colore della superficie, piu spessa: fa da
         alone e stacca la tacca sia dall'arco sia dal fondo, qualunque palette ci sia sotto. */
      s += '<line x1="' + (cx + (r0 - 1) * c).toFixed(1) + '" y1="' + (cy - (r0 - 1) * sn).toFixed(1) +
        '" x2="' + (cx + (r1 + 1) * c).toFixed(1) + '" y2="' + (cy - (r1 + 1) * sn).toFixed(1) +
        '" stroke="var(--card)" stroke-width="5" stroke-linecap="round"/>' +
        '<line x1="' + (cx + r0 * c).toFixed(1) + '" y1="' + (cy - r0 * sn).toFixed(1) +
        '" x2="' + (cx + r1 * c).toFixed(1) + '" y2="' + (cy - r1 * sn).toFixed(1) +
        '" stroke="var(--ink)" stroke-width="2.5" stroke-linecap="round"/>';
      /* L'etichetta del bersaglio segue la tacca, e la tacca puo stare in cima all'arco: li il
         testo finiva mezzo fuori dal riquadro — "si vede a meta il testo". La riga di base non
         puo salire sopra l'altezza del carattere, e l'ancora si sceglie da dove sta la tacca,
         non a meta strada. */
      var lblX = cx + (r1 + 4) * c, lblY = cy - (r1 + 4) * sn - 2;
      var anc = qt > .62 ? 'end' : (qt < .38 ? 'start' : 'middle');
      var wLbl = M.largh(A.tpl(b.targetLabel || 'target') + ' ' + A.mfmt(ms, target), 8.5);
      if (anc === 'end') lblX = Math.min(lblX, w - 2); else if (anc === 'start') lblX = Math.max(lblX, 2);
      else lblX = Math.min(Math.max(lblX, wLbl / 2 + 2), w - wLbl / 2 - 2);
      /* Il velo qui e del colore della SUPERFICIE, non dell'inchiostro: l'etichetta cade
         sull'arco colorato o sul fondo a seconda di dov'e il bersaglio, e un velo chiaro con
         inchiostro scuro sopra e leggibile in tutti e due i casi. */
      s += M.testoVelato(A.tpl(b.targetLabel || 'target') + ' ' + A.mfmt(ms, target),
        lblX, Math.max(10, lblY), { px: 8.5, anc: anc, velo: 'var(--card)', opacita: 0.88,
          ink: 'var(--ink)', padX: 4, padY: 2 });
    }

    s += '<text x="' + cx + '" y="' + (cy - 6) + '" text-anchor="middle" font-size="' +
      Math.round(r * .38) + '" font-weight="600" fill="var(--ink)" class="tnum">' + A.mfmt(ms, val) + '</text>';
    s += '</svg>';

    /* L'annotazione e costruita dalle misure: dice di quanto si e sopra o sotto, non "buono".
       E' la regola degli insight measure-driven applicata a un visual singolo. */
    var nota = '';
    if (target > 0) {
      /* Lo scarto si scrive UNA volta e in valore assoluto: il segno lo porta gia la parola
         "sopra" o "sotto", e i formati percentuali ne mettono uno per conto loro. Sommarli
         produceva "−−22,6 pp sotto". E niente articolo davanti all'etichetta: "il quota" e
         sbagliato, e l'articolo giusto dipende da un'etichetta che sceglie la spec. */
      var scarto = val - target, ass = Math.abs(scarto);
      var testo = pct ? A.f.pp(ass).replace(/^[+−-]\s*/, '') : A.mfmt(ms, ass);
      nota = '<div class="gnote">' + M.esc(A.meas(ms).label || ms) + ' ' + A.mfmt(ms, val) + ', ' +
        testo + ' ' + (scarto >= 0 ? 'sopra' : 'sotto') + ' ' +
        M.esc(A.tpl(b.targetLabel || 'target')) + '</div>';
    }
    return A.card(v, s + nota);
  };
})(MK);
/*#endregion*/

/*#region chart:heatmap*/
/* Heatmap — densita su DUE dimensioni. Righe = membri di `dim`, colonne = membri di `by`
   oppure i dodici mesi (`by: "m"`) o i quattro trimestri (`by: "q"`).
   E' il visual che mancava: la matrice ha le misure sulle colonne, quindi non puo ruotare una
   seconda dimensione. Fascia oraria x giorno, cliente x SKU, coorte x mese dall'ingresso sono
   tutte la stessa forma, e nessuna era esprimibile.
   Ogni cella passa dal layer condiviso (A.byKey + A.mv), non dalla somma della colonna grezza:
   una misura ratio qui deve valere quello che vale nella matrice. */
(function (M) {
  M.V.heatmap = function (A, v, w, h) {
    var b = v.bind || {}, dim = b.dim, ms = b.measure, S = A.S;
    h = v.h || h || 200;
    var righe = A.dims[dim] || [];
    /* le colonne: una seconda dimensione, i mesi o i trimestri */
    var cols = b.by === 'm' ? A.MON.map(function (l, i) { return { id: 'm' + i, n: l, months: [i] }; })
      : b.by === 'q' ? [0, 1, 2, 3].map(function (q) { return { id: 'q' + q, n: 'Q' + (q + 1), months: A.QMON(q) }; })
        : (A.dims[b.by] || []).map(function (m) { return { id: m.id, n: m.n, pin: m.id }; });

    /* il valore di una cella: sempre attraverso l'aggregatore, mai r[ms] */
    var val = function (r, c) {
      var o = { pin: {} };
      o.pin[dim] = r.id;
      if (c.pin !== undefined) o.pin[b.by] = c.pin;
      if (c.months) { o.months = c.months; o.timeline = true; }
      return A.mv(ms, A.agg(A.slice(o)));
    };

    var celle = [], min = Infinity, max = -Infinity;
    righe.forEach(function (r) {
      var fila = cols.map(function (c) { var x = val(r, c); if (x < min) min = x; if (x > max) max = x; return x; });
      celle.push(fila);
    });
    if (!isFinite(min)) { min = 0; max = 1; }
    /* I gradini: con una `scale` dichiarata sono i terzi di quell'intervallo — l'autore ha
        detto lui dove passa il confine e va rispettato. Senza, sono i TERZILI dei valori
        osservati, non i terzi fra minimo e massimo: una distribuzione storta (una fascia oraria
        che vale il quadruplo delle altre) schiaccia tutte le altre celle nel gradino piu basso
        e la mappa diventa un muro di un colore solo — che e esattamente cio che una heatmap non
        deve essere. Coi terzili un terzo delle celle sta in ogni gradino e la struttura si
        vede, che e la ragione per cui si disegna una mappa invece di una tabella. */
    /* CINQUE GRADINI, non tre. Con tre, una mappa dove i valori stanno vicini diventa un muro
       di due tinte e non si legge piu niente: e il difetto segnalato sulla ritenzione per
       coorte, dove tutte le celle finivano nello stesso secchio. Cinque e il massimo che
       l'occhio distingue su una superficie velata, e sono i quintili dei valori osservati —
       quindi la mappa si adatta ai dati invece di sperare che i dati si distribuiscano bene. */
    var soglie;
    if (b.scale) {
      var sp0 = (b.scale[1] - b.scale[0]) || 1;
      soglie = [1, 2, 3, 4].map(function (k) { return b.scale[0] + sp0 * k / 5; });
    } else {
      var ord = [];
      for (var _q = 0; _q < celle.length; _q++) ord = ord.concat(celle[_q]);
      ord.sort(function (p, q) { return p - q; });
      soglie = ord.length
        ? [1, 2, 3, 4].map(function (k) { return ord[Math.floor(ord.length * k / 5)]; })
        : [0, 0.25, 0.5, 0.75];
    }

    var lw = M.colonnaEtichette(righe.map(r => r.n), 9, Math.min(96, w * .22), 8);
    var m = { t: 16, r: M.PAD, b: 4 };
    var iw = w - lw - m.r, ih = h - m.t - m.b;
    var cw = iw / (cols.length || 1), ch = ih / (righe.length || 1), gap = 1.5;
    var s = '<svg width="' + w + '" height="' + h + '">';

    cols.forEach(function (c, ci) {
      s += '<text x="' + (lw + cw * ci + cw / 2).toFixed(1) + '" y="10" text-anchor="middle" ' +
        'font-size="8.5" fill="var(--muted)">' + M.esc(c.n).slice(0, 6) + '</text>';
    });

    righe.forEach(function (r, ri) {
      var y = m.t + ch * ri;
      s += '<text x="' + (lw - 6) + '" y="' + (y + ch / 2 + 3).toFixed(1) + '" text-anchor="end" ' +
        'font-size="9" fill="var(--ink2)">' + M.esc(r.n) + '</text>';
      celle[ri].forEach(function (x, ci) {
        /* Il gradino della cella, dal piu freddo al piu caldo. Sono velature della rampa
           sequenziale (Viridis o Cividis), quindi la scala sale in luminanza in modo monotono e
           resta leggibile anche in stampa e sotto le tre dicromazie. */
        var liv = 0;
        while (liv < soglie.length && x >= soglie[liv]) liv++;
        var col = ['var(--heat1)', 'var(--heat2)', 'var(--heat3)', 'var(--heat4)', 'var(--heat5)'][liv];
        var dimd = S.f[dim] && S.f[dim] !== r.id;
        s += '<rect class="hit ' + (dimd ? 'dimd' : '') + '" x="' + (lw + cw * ci + gap / 2).toFixed(1) +
          '" y="' + (y + gap / 2).toFixed(1) + '" width="' + Math.max(1, cw - gap).toFixed(1) +
          '" height="' + Math.max(1, ch - gap).toFixed(1) + '" rx="1" fill="' + col +
          '" data-f="' + dim + ':' + r.id + '" data-tip="<b>' + M.esc(r.n + ' · ' + cols[ci].n) +
          '</b><br>' + A.mfmt(ms, x) + '"/>';
        /* IL NUMERO DENTRO LA CELLA. Il colore dice "piu o meno", il numero dice quanto: una
           mappa senza cifre costringe a passare il mouse su ogni cella per leggere il report,
           e su una slide stampata non si legge affatto. Si scrive solo dove ci sta davvero —
           l'etichetta troppo stretta si omette, come nel ribbon. */
        var testo = A.mfmt(ms, x);
        if (!dimd && ch >= 17 && cw - gap >= M.largh(testo, 8.5) + 8) {
          /* sui due gradini piu caldi il fondo e piu carico: l'inchiostro chiaro si stacca meglio */
          s += '<text x="' + (lw + cw * ci + cw / 2).toFixed(1) + '" y="' + (y + ch / 2 + 3).toFixed(1) +
            '" text-anchor="middle" font-size="8.5" class="tnum" fill="' +
            (liv >= 3 ? 'var(--heatInk)' : 'var(--ink2)') + '" style="pointer-events:none">' +
            M.esc(testo) + '</text>';
        }
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
    /* Il ribbon e fatto solo di colore: senza legenda restano cinque bande anonime.
       Sta su una riga sola sopra il grafico, e ogni voce filtra (pattern-library, legende). */
    /* I margini laterali devono contenere META ETICHETTA: i valori sono centrati sul nodo, e
       sul primo e sull'ultimo periodo la meta esterna finiva fuori dal riquadro — "i valori non
       si leggono bene, specialmente a sinistra e destra". Si misura l'etichetta piu larga e si
       riserva quanto serve, con un minimo che tiene il grafico staccato dal bordo. */
    var wEtich = 0;
    periods.forEach(function (pd, p) {
      cats.forEach(function (c) {
        /* si misura dal DATO, non dalla geometria: qui i nastri non sono ancora disposti, e
           servono i margini per disporli */
        wEtich = Math.max(wEtich, M.largh(A.mfmt(ms, val(c.id, p)), 8.5));
      });
    });
    var lato = Math.max(34, Math.ceil(wEtich / 2) + 8);
    var legH = 15, m = { t: 14 + legH, r: lato, b: 20, l: lato };
    var iw = w - m.l - m.r, ih = h - m.t - m.b, gap = 6;
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
        var pd0 = periods[p], pd1 = periods[p + 1];
        /* IL NASTRO E' CLICCABILE, non solo il nodo. Prima il filtro stava su una fascetta di
           dieci pixel a ogni periodo: su un grafico largo cinquecento pixel, il novanta per
           cento della superficie non rispondeva al clic — e chi prova a cliccare il nastro,
           che e la cosa grande e colorata, conclude che i filtri non funzionano. La conclusione
           era giusta: quello che non funzionava era il bersaglio, non il filtro. */
        s += '<path class="hit ' + (dimd ? 'dimd' : '') + '" data-f="' + dim + ':' + c.id +
          '" data-tip="<b>' + M.esc(c.n) + '</b><br>' + M.esc(pd0.l + ' ' + A.mfmt(ms, a.v)) +
          ' → ' + M.esc(pd1.l + ' ' + A.mfmt(ms, z.v)) + '" d="M' + x1 + ',' + a.y0.toFixed(1) + ' C' + cx + ',' + a.y0.toFixed(1) + ' ' + cx + ',' + z.y0.toFixed(1) + ' ' + x2 + ',' + z.y0.toFixed(1) +
          ' L' + x2 + ',' + z.y1.toFixed(1) + ' C' + cx + ',' + z.y1.toFixed(1) + ' ' + cx + ',' + a.y1.toFixed(1) + ' ' + x1 + ',' + a.y1.toFixed(1) + ' Z" fill="' + c.c + '" opacity=".85"/>';
      }
      periods.forEach(function (pd, p) {
        var o = cols[p][c.id], alt = o.y1 - o.y0;
        s += '<rect class="hit ' + (dimd ? 'dimd' : '') + '" x="' + (X(p) - 5).toFixed(1) + '" y="' + o.y0.toFixed(1) + '" width="10" height="' + Math.max(1, alt).toFixed(1) +
          '" fill="' + c.c + '" data-f="' + dim + ':' + c.id + '" data-tip="<b>' + M.esc(c.n + ' · ' + pd.l) + '</b><br>' + A.mfmt(ms, o.v) + '"/>';
        /* Il valore DENTRO il nastro, non solo nel tooltip: un ribbon si legge stampato, e un
           numero che esiste solo al passaggio del mouse non esiste su una slide. Se la banda e
           troppo bassa per contenerlo si omette quel segmento — meglio un'etichetta in meno che
           una che deborda sul nastro accanto. */
        if (alt >= 13 && !dimd) {
          /* Sul velo, non sul nastro: ai due estremi il numero sporge sul fondo chiaro della
             card, e in bianco non si legge piu. Il velo lo accompagna ovunque vada. */
          s += M.testoVelato(A.mfmt(ms, o.v), X(p), o.y0 + alt / 2 + 3, { px: 8.5, opacita: 0.55 });
        }
      });
    });
    var lgx = m.l;
    cats.forEach(function (c) {
      var dimd = A.S.f[dim] && A.S.f[dim] !== c.id;
      var tw = 13 + M.esc(c.n).length * 5.1;
      if (lgx + tw > w - m.r) return;                 /* niente legenda che deborda */
      s += '<g class="hit ' + (dimd ? 'dimd' : '') + '" data-f="' + dim + ':' + c.id + '" data-tip="<b>' + M.esc(c.n) + '</b>">' +
        '<rect x="' + lgx + '" y="2" width="' + tw + '" height="13" fill="transparent"/>' +
        '<rect x="' + lgx + '" y="5" width="8" height="8" rx="1.5" fill="' + c.c + '"/>' +
        '<text x="' + (lgx + 12) + '" y="12.5" font-size="9" fill="var(--ink2)">' + M.esc(c.n) + '</text></g>';
      lgx += tw + 10;
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
    var m = { t: 10, r: M.PAD, b: 10, l: M.PAD }, ih = h - m.t - m.b, rh = ih / (stages.length || 1);
    var max = vals[0] || 1;
    var s = '<svg width="' + w + '" height="' + h + '">';
    stages.forEach(function (st, i) {
      var bw = Math.max(2, (vals[i] / max) * (w - m.l - m.r)), x = m.l + ((w - m.l - m.r) - bw) / 2, y = m.t + rh * i + rh * .12, bh = rh * .68;
      var conv = i ? (vals[i - 1] ? vals[i] / vals[i - 1] : 0) : 1;
      s += '<rect class="hit" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="2" fill="' + (st.c || 'var(--c2)') +
        '" data-tip="<b>' + M.esc(st.label) + '</b><br>' + A.mfmt(st.measure, vals[i]) + (i ? '<br>' + f.pc(conv) + ' ' + (A.T.conv || 'conv.') : '') + '"/>';
      /* L'etichetta e il valore stanno DENTRO la barra finche ci stanno. Un funnel si stringe
         verso il basso per costruzione, e gli ultimi stadi sono i piu stretti: e proprio li che
         il nome e il numero finivano uno sopra l'altro, cioe dove il lettore cerca la risposta
         — "quanti ne restano alla fine". Quando non ci stanno, escono a destra della barra, in
         inchiostro invece che in bianco. */
      var yt = (y + bh / 2 + 3.5).toFixed(1);
      var wNome = M.largh(st.label, 10), wVal = M.largh(A.mfmt(st.measure, vals[i]), 10);
      if (bw >= wNome + wVal + 26) {
        s += '<text x="' + (x + 8) + '" y="' + yt + '" font-size="10" fill="#fff">' + M.esc(st.label) + '</text>';
        s += '<text x="' + (x + bw - 8) + '" y="' + yt + '" text-anchor="end" font-size="10" fill="#fff" class="tnum">' + A.mfmt(st.measure, vals[i]) + '</text>';
      } else {
        s += '<text x="' + (x + bw + 7).toFixed(1) + '" y="' + yt + '" font-size="10" fill="var(--ink2)">' +
          M.esc(st.label) + ' <tspan class="tnum" fill="var(--ink)">' + A.mfmt(st.measure, vals[i]) + '</tspan></text>';
      }
      if (i) s += '<text x="' + (w - M.PAD) + '" y="' + yt + '" text-anchor="end" font-size="8.5" fill="var(--muted)" class="tnum">' + f.pc(conv, 0) + '</text>';
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
    var mgn = { t: 14, r: M.PAD, b: 24, l: 46 }, iw = w - mgn.l - mgn.r, ih = h - mgn.t - mgn.b;
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
    /* La scala verticale arriva fino all'ULTIMA TACCA, non fino al dato piu alto. Le tacche si
       arrotondano verso l'alto — con un massimo al 74% la piu alta e 80% — e scalando sul dato
       quella tacca finiva sopra il bordo: la riga si vedeva, il suo numero no, perche era
       disegnato a y negativa. E' lo stesso accorgimento che il trend ha da sempre e che qui
       mancava. */
    var tkY = M.ticks(ymax), top = tkY[tkY.length - 1] || ymax;
    var X = val => mgn.l + (val / xmax) * iw, Y = val => mgn.t + ih - (val / top) * ih;
    var mx = med(pts.map(p => p.x)), my = med(pts.map(p => p.y));
    var smax = Math.max.apply(null, pts.map(p => p.s)) || 1;
    var s = '<svg width="' + w + '" height="' + h + '">';
    tkY.forEach(t => s += '<line x1="' + mgn.l + '" y1="' + Y(t).toFixed(1) + '" x2="' + (mgn.l + iw) + '" y2="' + Y(t).toFixed(1) + '" stroke="var(--line2)"/>' +
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
    /* anche qui: dal layer condiviso, o una ratio disegna una linea piatta a zero */
    var val = A.byKeyValue(A.slice({ timeline: true, pin: pin || {} }), r => r.m, ms);
    var vals = new Array(12), _s;
    for (_s = 0; _s < 12; _s++) vals[_s] = val(_s);
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
