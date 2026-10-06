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
  /* LE CIFRE SONO MONOSPAZIATE (classe tnum, in ogni tipografia): ogni carattere vale lo stesso,
     spazi e punti compresi. Misurate con M.largh, che stima un font proporzionale, uscivano piu
     corte del vero: "CHF 19.2M · 131 at risk" sforava il bordo della card nel mockup di Luca
     (3 ott 2026). Chi misura un testo tnum usa questa. */
  /* un colore come [r,g,b] (0-255), esadecimale o token var(--x); null se non si sa leggere */
  M.rgb = function (col) {
    try {
      var vv = /^var\((--[\w-]+)\)$/.exec(col || '');
      var c = vv ? getComputedStyle(document.documentElement).getPropertyValue(vv[1]).trim() : String(col || ''), mm = /^#?([0-9a-f]{6})$/i.exec(c);
      if (!mm) return null;
      var n = parseInt(mm[1], 16);
      return [n >> 16, (n >> 8) & 255, n & 255];
    } catch (e) { return null; }
  };
  M.lum = function (col) { var c = M.rgb(col); return c ? (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255 : null; };
  /* quanto due colori si distinguono (0-1): distanza nello spazio rgb, che conta tinta e luce —
     l'ambra accanto al blu si legge anche a pari luminosita, l'ambra accanto all'oliva no */
  M.distanza = function (a, b) { var x = M.rgb(a), y = M.rgb(b); return x && y ? Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) / 441.7 : null; };
  /* LE CIFRE SONO MONOSPAZIATE (classe tnum, in ogni tipografia): ogni carattere vale lo stesso,
     spazi e punti compresi. Misurate con M.largh uscivano piu corte del vero e sforavano il bordo
     (Luca, 3 ott 2026). Chi misura un testo tnum usa questa. */
  M.larghN = (t, px) => String(t).length * .62 * px;
  /* MINIMO, MASSIMO E ULTIMO PUNTO DI UNA LINEA (le guideline delle label di Fra, 3 ott 2026: si
     etichetta quello che il lettore cerca, non ogni punto). Con almeno sei punti il motore scrive il
     valore del punto piu alto (sopra), del piu basso (sotto) e dell'ultimo, e li evidenzia; un punto
     che e sia l'ultimo sia un estremo si scrive una volta. Ogni scritta resta dentro l'area del
     grafico e salta se toccherebbe una scritta gia messa (`evita`: i riquadri occupati).
     p: [{x, y, v}] (v null = mese senza dato) · o: {fmt, col, l, r, t, b, ultimoGiu, evita} */
  M.etichettePunti = function (p, o) {
    var pts = p.filter(q => q.v !== null && isFinite(q.v));
    if (pts.length < 6) return '';
    var mx = pts.reduce((a, q) => q.v > a.v ? q : a, pts[0]), mn = pts.reduce((a, q) => q.v < a.v ? q : a, pts[0]), ul = pts[pts.length - 1];
    if (mx.v === mn.v) return '';
    var voci = [{ q: mx, dove: mx === ul && o.ultimoGiu ? 'giu' : 'su' }, { q: mn, dove: 'giu' }];
    if (ul !== mx && ul !== mn) voci.push({ q: ul, dove: o.ultimoGiu ? 'giu' : 'su' });
    var occ = (o.evita || []).slice(), out = '';
    voci.forEach(function (e) {
      var t = o.fmt(e.q.v), w = M.larghN(t, 8), x = Math.min(Math.max(e.q.x, o.l + w / 2), o.r - w / 2);
      /* il lato preferito, poi l'altro: un'etichetta si salta solo se non sta da nessuna parte */
      var lati = e.dove === 'su' ? [e.q.y - 7, e.q.y + 14] : [e.q.y + 14, e.q.y - 7], y = null, box;
      lati.some(function (yy) {
        if (yy - 8 < o.t || yy > o.b) return false;
        var bx = { l: x - w / 2 - 2, r: x + w / 2 + 2, t: yy - 9, b: yy + 2 };
        if (occ.some(z => z.l < bx.r && bx.l < z.r && z.t < bx.b && bx.t < z.b)) return false;
        y = yy; box = bx; return true;
      });
      if (y === null) return;
      occ.push(box);
      out += '<circle cx="' + e.q.x.toFixed(1) + '" cy="' + e.q.y.toFixed(1) + '" r="3.2" fill="' + o.col + '" style="pointer-events:none"/>' +
        M.testoVelato(t, x, y, { px: 8, anc: 'middle', velo: 'var(--card)', opacita: .85, ink: o.col, padX: 2, padY: 1 }).replace('<text', '<text data-et="1"');
    });
    return out;
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
    /* UN FORMATTATORE SOLO. toLocaleString con le opzioni ne costruisce uno nuovo a ogni numero:
       era la funzione piu cara dell'intero runtime (un sesto del tempo della suite di test) e
       rallentava anche il mockup, a ogni filtro, per ogni cifra ridisegnata. Stesso risultato. */
    var nf = new Intl.NumberFormat(lang, { useGrouping: true, maximumFractionDigits: 0 });
    var num = v => nf.format(Math.round(v));
    var f = {};
    /* compact currency, K/M — canonical eur() */
    /* MIGLIAIA CON UN DECIMALE, la convenzione dei report finance ("numbers in thousands with
       one decimal", Bodan 3 ott 2026): con meta.numberFormat "k1" ogni importo e €52,134.5K,
       card e tooltip compresi. */
    /*#fin*/
    var nf1 = new Intl.NumberFormat(lang, { useGrouping: true, minimumFractionDigits: 1, maximumFractionDigits: 1 });
    /*#/fin*/
    f.eur = function (v, k) {
      if (!isFinite(v)) v = 0;
      k = k === undefined ? 0 : k;
      var a = Math.abs(v), s = v < 0 ? '−' : '';
      /*#fin*/
      if (o.numberFormat === 'k1') return s + cur + nf1.format(a / 1e3) + 'K';
      /*#/fin*/
      /* I MILIARDI HANNO LA LORO SIGLA: "CHF 1183.9M" nel totale di una tabella di Luca (3 ott
         2026) si legge solo contando le cifre. E il confine e quello dell'arrotondamento:
         999.960 fa "1.0M", non "1000K". */
      if (a >= 999.95e6) return s + cur + d((a / 1e9).toFixed(1)) + (o.locale && o.locale.slice(0, 2) === 'it' ? ' Mld' : 'B');
      if (a >= 1e6 - 500 * Math.pow(10, -k)) return s + cur + d((a / 1e6).toFixed(1)) + 'M';
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
  /* un asse che non parte da zero: dal minimo al massimo, allargato a tacche tonde (Power BI fa
     cosi sull'asse secondario). Quattro-sei tacche; un intervallo nullo si apre di poco. */
  M.asseStretto = function (lo, hi) {
    if (hi - lo < Math.abs(hi) * 1e-3) { lo -= Math.abs(hi) * .02 || 1; hi += Math.abs(hi) * .02 || 1; }
    /* un margine sotto il minimo: un valore (o un target) sul fondo coinciderebbe con la base del
       grafico; quattro-sei tacche, non tre */
    lo -= (hi - lo) * .2;
    var st = M.ticks((hi - lo) * 1.1, 5)[1], a = Math.floor(lo / st) * st, tk = [];
    for (var x = a; x <= hi + st * .999; x += st) tk.push(+x.toFixed(10));
    return { lo: a, hi: tk[tk.length - 1], tk: tk };
  };

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
        o[c] = mb ? mb.id : (c === 'y' && t.y0 ? r[k] + t.y0 : r[k]);   /* l'anno arriva come scarto da y0 */
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
      /* un figlio piu difficile dei fratelli porta un moltiplicatore sul campo (mult): la quota
         si rinormalizza dentro il genitore, cosi i figli sommano ancora esattamente alla riga */
      var perCampo = {};
      dm.fields.forEach(function (fl) {
        var mm = dm.mult && dm.mult[fl];
        if (!mm) return;
        var w2 = kids.map((k, i) => ws[i] * (mm[k.id] || 1)), s2 = w2.reduce((a, b) => a + b, 0) || 1;
        perCampo[fl] = w2.map(w => w / s2);
      });
      kids.forEach(function (k, i) {
        var o = { y: r.y, m: r.m };
        o[dm.dim] = k.id; o[dm.parentDim] = k.parent;
        /* IL FIGLIO EREDITA TUTTE LE DIMENSIONI DELLA SUA RIGA, non solo il genitore. Senza, un
           filtro sulla regione o sul segmento passava accanto ai prodotti: nel mockup di Parsa
           (27 set 2026) "Corporate" muoveva KPI e matrice, e la lista dei prodotti peggiori
           restava identica al dollaro. C'era gia con due dimensioni. Gate:
           test/filtri-visual.test.js. */
        for (var dk in dims) if (r[dk] !== undefined && o[dk] === undefined) o[dk] = r[dk];
        dm.fields.forEach(fl => o[fl] = (r[fl] || 0) * (perCampo[fl] ? perCampo[fl][i] : ws[i] / s));
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
    /* Gli anni che hanno ancora i dodici mesi. Quando la storia e lunga i piu vecchi arrivano
       gia sommati per anno (data-builder, passo 4.5): il report non deve fingere di avere un
       dettaglio che non c'e — offrire il filtro del mese su un anno che vale una riga sola
       sarebbe un controllo che azzera la pagina. */
    var MENS = DATA.mensili || DATA.years;

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
      /* LA FINESTRA TEMPORALE. `y` e l'anno finale, `y0` quello iniziale: quando coincidono —
         ed e cosi che si apre sempre — il report si comporta esattamente come prima, un anno
         alla volta. Chi ha dieci anni di storia e ne vuole guardare tre allarga la finestra
         invece di aprire tre report: la selezione resta UNA, contigua, e ogni visual la legge
         dal layer condiviso senza saperne niente.
         Perche l'estremo finale e `y` e non un array: il confronto col periodo precedente, le
         etichette {y}/{py} e la traiettoria hanno bisogno di un ORDINE, e un insieme di anni
         sparsi non ce l'ha. Una finestra contigua si sposta indietro di se stessa e il
         confronto resta onesto. */
      y0: d0.y0 !== undefined ? d0.y0 : (d0.y !== undefined ? d0.y : YRS[YRS.length - 1]),
      q: d0.q === undefined ? null : d0.q,
      mo: d0.m === undefined ? null : d0.m,
      f: {},                       /* dim id -> member id | null */
      drill: null,                 /* {dim,id} */
      from: SPEC.pages[0].id,
      slOpen: false
    };
    FDIMS.forEach(d => S.f[d.id] = null);
    /* il periodo di partenza, per poterci tornare: "azzera filtri" che lascia selezionato il
       2018 di dieci anni fa non ha azzerato il filtro piu importante della pagina */
    var YDEF = S.y;

    /* ---------- date helpers ---------- */
    /*#breve*/
    /* Sotto i tre anni di storia la finestra non ha niente da fare: queste sono le stesse
       risposte, date senza calcolarle. Nel sorgente le sovrascrivono le versioni vere qui
       sotto; nel file spedito a un report di dodici o ventiquattro mesi ci sono solo queste. */
    A.ampiezza = function () { return 1; };
    A.anniSel = function () { return [S.y]; };
    A.grossa = function () { return false; };
    A.annoLabel = function (fine) { return String(fine === undefined ? S.y : fine); };
    A.finestra = function (fine) { if (fine !== undefined) { S.y = fine; S.y0 = fine; } };
    /*#/breve*/
    /*#finestra*/
    /* quanti anni sono selezionati adesso (1 = comportamento storico) */
    A.ampiezza = function () { return Math.max(1, S.y - S.y0 + 1); };
    A.anniSel = function () { var o = [], y; for (y = S.y0; y <= S.y; y++) o.push(y); return o; };
    /* Le ampiezze proponibili: mai piu di quanti anni il dato ha davvero, perche un chip
       "5 anni" su tre anni di storia promette qualcosa che non c'e. */
    A.ampiezze = function () {
      var n = YRS.length, out = [];
      [1, 2, 3, 5, n].forEach(function (k) { if (k <= n && out.indexOf(k) < 0) out.push(k); });
      return out.sort(function (a, b) { return a - b; });
    };
    /* Sposta la finestra tenendo l'ampiezza, e la tiene dentro gli anni disponibili. */
    A.finestra = function (fine, amp) {
      var n = YRS.length ? YRS.length : 1, primo = YRS[0], ultimo = YRS[YRS.length - 1];
      amp = Math.min(Math.max(1, amp || A.ampiezza()), n);
      fine = Math.min(Math.max(fine === undefined ? S.y : fine, primo + amp - 1), ultimo);
      S.y = fine; S.y0 = fine - amp + 1;
      /* Una selezione che il dato non puo piu esprimere si mette DA PARTE, non si butta:
         allargando la finestra alla storia lontana il trimestre scelto sparisce (li i mesi non
         ci sono), e tornando indietro deve ritrovarsi dov'era. Buttarlo sarebbe una perdita
         silenziosa — il lettore torna a un anno e il suo Q4 non c'e piu, senza che nessuno
         glielo abbia detto. */
      if (A.grossa()) {
        if (S.q !== null || S.mo !== null) S.sosp = { q: S.q, mo: S.mo };
        S.q = null; S.mo = null;
      } else if (S.sosp) {
        S.q = S.sosp.q; S.mo = S.sosp.mo; S.sosp = null;
      }
    };
    /* la finestra pesca in un anno senza mesi? */
    A.grossa = function () {
      for (var y = S.y0; y <= S.y; y++) if (MENS.indexOf(y) < 0) return true;
      return false;
    };
    /*#/finestra*/
    A.QMON = q => q === null ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] : [q * 3, q * 3 + 1, q * 3 + 2];
    A.inSel = function (m) {
      if (A.grossa()) return true;      /* niente mesi da scegliere: il dato non li ha piu */
      if (S.mo !== null) return m === S.mo;
      if (S.q !== null) return A.QMON(S.q).includes(m);
      return true;
    };
    /* Con una finestra di piu anni "YoY" e falso: si confrontano tre anni con i tre
       precedenti, non un anno con l'anno prima. Dirlo per quello che e costa una stringa. */
    A.basis = function () {
      if (S.mo !== null) return 'MoM';
      var n = A.ampiezza();
      return n > 1 ? (T.pop || (n + 'A vs ' + n + 'A')) : 'YoY';
    };
    /* L'etichetta dell'anno: "2025" quando la finestra e di uno, "2023–2025" quando e larga.
       Ci passano il pulsante del periodo, i titoli con {y} e le pillole di contesto, cosi il
       report non puo dire "2025" mentre mostra tre anni. */
    /*#finestra*/
    A.annoLabel = function (fine, inizio) {
      fine = fine === undefined ? S.y : fine;
      inizio = inizio === undefined ? S.y0 : inizio;
      return inizio < fine ? inizio + '–' + fine : String(fine);
    };
    /*#/finestra*/
    A.periodLabel = function () {
      if (S.mo !== null) return MON[S.mo] + ' ' + A.annoLabel();
      if (S.q !== null) return 'Q' + (S.q + 1) + ' ' + A.annoLabel();
      return A.annoLabel() + (T.fullYear && A.ampiezza() === 1 ? ' · ' + T.fullYear : '');
    };

    /* ---------- THE shared slice layer ----------
       Every visual, KPI card and total goes through here, so a filter cannot be inert
       (qa-checklist Gate 5) and cannot be wired per-visual. Options:
         detail   : slice the detail grain instead of the fact grain
         timeline : ignore quarter/month (the trend exemption)
         y,months : explicit window (used by the previous-period comparison)
         finestra : [primo, ultimo] anno — la finestra spostata indietro del confronto
         pin      : {dim:id} force a member — implies ignoring the page filter on that dim
         ignore   : [dim] ignore the page filter on these dims (own-breakdown visuals) */
    A.slice = function (o) {
      o = o || {};
      /* Un anno esplicito vince su tutto (lo usano le traiettorie, che disegnano un anno per
         volta); poi una finestra esplicita; in mancanza di entrambi, la finestra selezionata. */
      var yEsp = o.y !== undefined ? o.y : null;
      var fin = o.finestra || null;
      var months = o.months || null;
      var pin = Object.assign({}, A.drillPin(), o.pin || {});
      var ignore = (o.ignore || []).concat(A.ign);
      var rows = o.detail ? (DT || []) : F;
      /* Una dimensione che vive solo nel grano di dettaglio (i corsi dentro una sede, i
         prodotti dentro una categoria) non compare nelle righe dei fatti: filtrarci sopra
         non cambierebbe nulla e il filtro sembrerebbe rotto. In quel caso si aggrega dal
         dettaglio, che quelle colonne ce le ha. */
      var detailOnly = !o.detail && DT && DT.length && A.detailOnly(pin, ignore);
      var keep = function (r) {
        if (yEsp !== null) { if (r.y !== yEsp) return false; }
        else if (fin) { if (r.y < fin[0] || r.y > fin[1]) return false; }
        else if (r.y < S.y0 || r.y > S.y) return false;
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
    /* FILTRARE O EVIDENZIARE: LA REGOLA DI POWER BI (Bodan, 4 ott 2026: "selecting a segment
       highlights the bars, while selecting an entity filters the chart… one behaviour would be
       cleaner"). Un filtro della barra — lo slicer — FILTRA ogni visual, anche quello che ha la
       sua dimensione: la classifica per segmento mostra il segmento scelto. Il clic dentro un
       grafico invece EVIDENZIA quel grafico (gli altri membri restano, attenuati) e filtra gli
       altri visual, come il cross-highlight. S.fonte[dim] ricorda da quale visual e partito il
       filtro. Un visual puo anche staccarsi da un filtro (`ignoreFilters`), come "Edit
       interactions → None" di Power BI: tiene sempre tutti i membri. */
    A.vk = null; A.ign = [];
    /* LE MISURE DI BUDGET: ogni misura che la spec usa come `budget` di qualcosa. Le loro colonne
       hanno uno sfondo proprio, cosi effettivo e budget si distinguono a colpo d'occhio (Bodan, 4
       ott 2026: "a different color for budget than for actual"). */
    A.bud = {};
    /*#fin*/
    JSON.stringify(SPEC, function (k, val) { if (k === 'budget' && typeof val === 'string') A.bud[val] = 1; return val; });
    /*#/fin*/
    A.ignorato = d => A.ign.indexOf(d) >= 0;
    A.evid = d => !!(S.f[d] && S.fonte && S.fonte[d] && S.fonte[d] === A.vk);
    /* il membro da evidenziare in questo visual, o null */
    A.hl = d => (A.evid(d) && !A.ignorato(d)) ? S.f[d] : null;
    /* i membri che questo visual mostra di una dimensione */
    A.membri = function (d) {
      var tutti = dims[d] || [];
      if (S.f[d] && !A.evid(d) && !A.ignorato(d)) return tutti.filter(m => m.id === S.f[d]);
      return tutti;
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
      var n = A.ampiezza();
      /* Il periodo precedente di una finestra larga e la finestra stessa spostata indietro
         della sua ampiezza: tre anni si confrontano coi tre di prima. Se quegli anni nel dato
         non ci sono, l'aggregato esce vuoto e la card dice che il confronto manca — che e la
         verita, invece di confrontare tre anni con uno. */
      if (n > 1) return A.agg(A.slice(Object.assign(o, { finestra: [S.y0 - n, S.y - n], months: A.QMON(S.q) })));
      return A.agg(A.slice(Object.assign(o, { y: S.y - 1, months: A.QMON(S.q) })));
    };
    A.meas = id => MEASBY[id] || { id: id, format: 'N', label: id };
    A.statoT = () => '';   /* senza target nella spec: nessuno stato (il codice vero sta in #tgt) */
    /*#tgt*/
    /* lo stato di un valore rispetto al target della sua misura: 'tok' sopra (o sotto, per una
       misura dove meno e meglio), 'tko' dall'altra parte, '' senza target */
    A.statoT = function (ms, v) {
      var m = A.meas(ms);
      if (typeof m.target !== 'number' || !isFinite(v)) return '';
      /* si giudica il numero che il lettore vede: 97,96% si legge "98,0%", e in rosso accanto a un
         target del 98% sembrava un errore (gate test/lettura.test.js) */
      if (m.format === 'pc') v = Math.round(v * 1000) / 1000;
      return (m.inv ? v <= m.target : v >= m.target) ? 'tok' : 'tko';
    };
    /*#/tgt*/
    A.mv = (id, a) => a[id] || 0;
    A.mfmt = function (id, v) { var m = A.meas(id); return f.apply(m.format || 'N', v); };
    A.delta = (c, p) => (p && isFinite(p) && Math.abs(p) > 1e-9) ? (c - p) / Math.abs(p) : 0;
    /* UNA VARIAZIONE SI SCRIVE IN UN POSTO SOLO. Una percentuale non varia "del 9%": varia di
       punti. La card KPI e la delta-card lo sapevano, ciascuna con la sua copia della regola;
       la colonna "var" della matrice no, e il margine del West sceso dal 33,8% al 30,6% usciva
       "▼ −9,4%" accanto a una card che diceva "−0,8 pp" (Parsa, 27 set 2026). Da qui in poi
       ogni variazione a schermo passa da A.varia, e un test vieta A.delta fuori da qui. */
    A.punti = ms => { var m = A.meas(ms); return m.unit === 'pct' || m.unit === 'pp' || m.format === 'pc'; };
    /* UN TASSO SENZA BASE NON E UN NUMERO. Un rapporto il cui denominatore e zero o negativo — l'uplift
       di "Fuori promozione", che non ha vendite in promozione — usciva "0,0%" o "−100,0%" e si leggeva
       come una campagna andata male (Fra, 28 set 2026). Si scrive "—", non applicabile. */
    A.definita = function (ms, a) {
      var m = A.meas(ms);
      if (m.agg !== 'ratio') return true;
      /* il denominatore puo essere una somma (sta nell'aggregato) o un'altra misura */
      var d = a[m.den] !== undefined ? a[m.den] : A.mv(m.den, a);
      return (d || 0) > 0;
    };
    /* UNA VOCE NUOVA NON VARIA: e nuova. Vale anche per le percentuali: il margine della campagna
       fatta per la prima volta usciva "+17,2 pp" contro un anno in cui non esisteva. Si guarda la
       base: il denominatore di un rapporto, la misura stessa per una somma. */
    A.nuova = function (ms, ac, ap) {
      var m = A.meas(ms), k = m.agg === 'ratio' ? m.den : ms;
      return !(ap[k] || 0) && !!(ac[k] || 0);
    };
    A.varia = function (ms, c, p) {
      if (A.punti(ms)) { var dif = c - p; return { d: dif, t: f.pp(dif), piatto: Math.abs(dif) < 5e-4, punti: true }; }
      var rel = A.delta(c, p);
      return { d: rel, t: f.sgp(rel), piatto: Math.abs(rel) < .002, punti: false };
    };
    /* per-member aggregate of a dimension (own filter ignored, PBI highlight semantics) */
    A.byDim = function (dim, o) {
      o = o || {};
      return A.membri(dim).map(function (mb) {
        var s = Object.assign({}, o, { pin: Object.assign({}, o.pin || {}, { [dim]: mb.id }) });
        var p = Object.assign({}, s); delete p.y; delete p.months; delete p.finestra;
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
    /*#fin*/
    /* UNO SCOSTAMENTO DA UN RIFERIMENTO (budget o anno prima): una percentuale in punti, un importo
       in percentuale; favorevole se va nel verso giusto per la misura (un costo sopra il budget
       e sfavorevole). Lo usano la card finance, la matrice e il conto economico. */
    A.scost = function (ms, act, ref, inv) {
      var m = A.meas(ms), d = act - ref, inv2 = inv === undefined ? !!m.inv : inv;
      if (!isFinite(d) || (!ref && !A.punti(ms))) return { t: '—', cls: 'fl', d: 0 };
      var piatto = A.punti(ms) ? Math.abs(d) < 5e-4 : Math.abs(d / ref) < .0005;
      var cls = piatto ? 'fl' : ((d > 0) !== inv2 ? 'up' : 'dn');
      var t = A.punti(ms) ? f.pp(d) : (d >= 0 ? '+' : '−') + f.pc(Math.abs(d / Math.abs(ref)));
      return { t: (piatto ? '' : (d > 0 ? '▲ ' : '▼ ')) + t, cls: cls, d: d };
    };
    /* i mesi dell'anno fino alla fine del periodo selezionato: il YTD segue il mese scelto */
    A.ytdMesi = function () { var e = S.mo !== null ? S.mo : (S.q !== null ? S.q * 3 + 2 : 11), o = []; for (var i = 0; i <= e; i++) o.push(i); return o; };
    /* LA CARD FINANCE (Bodan, 3 ott 2026: "each for the month and YTD, against budget and prior
       year"): il valore del periodo con lo scostamento dal budget e dall'anno prima; sotto, il
       YTD fino al mese scelto con gli stessi due scostamenti. Con l'anno intero il YTD sarebbe
       lo stesso numero: la riga dice allora budget e anno prima in assoluto. */
    A.kpiFin = function (k) {
      var c = A.kpiState.cur, ms = k.measure, inv = k.inv;
      var cv = A.mv(ms, c), pyA = A.agg(A.slice({ y: S.y - 1, months: S.mo !== null ? [S.mo] : A.QMON(S.q) })), pv = A.mv(ms, pyA);
      var riga = function (act, bud, py) {
        var s1 = k.budget ? A.scost(ms, act, bud, inv) : null, s2 = A.scost(ms, act, py, inv);
        return (s1 ? '<span>' + (T.vsBud || 'vs budget') + ' <b class="' + s1.cls + '">' + s1.t + '</b></span>' : '') +
          '<span>' + (T.vsPY || 'vs AP') + ' <b class="' + s2.cls + '">' + s2.t + '</b></span>';
      };
      var html = '<div class="kf tnum">' + riga(cv, k.budget ? A.mv(k.budget, c) : 0, pv) + '</div>';
      if (k.ytd !== false) {
        var mesi = A.ytdMesi(), yc = A.agg(A.slice({ y: S.y, months: mesi })), yp = A.agg(A.slice({ y: S.y - 1, months: mesi }));
        if (S.mo === null && S.q === null) html += '<div class="ky tnum">' + (k.budget ? (T.bud || 'Budget') + ' ' + A.mfmt(ms, A.mv(k.budget, c)) + ' · ' : '') + (T.py || 'AP') + ' ' + A.mfmt(ms, pv) + '</div>';
        else html += '<div class="ky tnum">YTD ' + MON[mesi[mesi.length - 1]] + ' ' + A.mfmt(ms, A.mv(ms, yc)) + '</div><div class="kf tnum" style="margin-top:2px">' +
          riga(A.mv(ms, yc), k.budget ? A.mv(k.budget, yc) : 0, A.mv(ms, yp)) + '</div>';
      }
      var kb = (SPEC.__pelle || {}).banda === 'blocco';
      var geo = kb ? 'flex:' + (k.span || 1) + ' 1 0;min-width:0' : 'width:' + g.span(k.span || 1) + 'px';
      return '<div class="card kpi" style="' + geo + '"><div><div class="k">' + M.esc(k.label) + '</div><div class="vr"><div class="v tnum ' + A.statoT(ms, cv) + '">' +
        (A.definita(ms, c) ? A.mfmt(ms, cv) : '—') + '</div></div></div>' + html + '</div>';
    };
    /*#/fin*/
    A.kpi = function (k) {
      if ((k.budget || k.ytd) && A.kpiFin) return A.kpiFin(k);
      var a = A.kpiState, c = a.cur, p = a.prev;
      var cv = A.mv(k.measure, c), pv = A.mv(k.measure, p);
      var m = A.meas(k.measure);
      /* Una percentuale non varia "del 10%": varia di punti. Un margine sceso dal 35,9% al
         32,3% e sceso di 3,6 punti; dire "▼ 10,0%" e aritmeticamente vero e si legge come
         un calo del dieci per cento del fatturato. La regola sta in A.varia. */
      var va = A.varia(k.measure, cv, pv), d = va.d, punti = va.punti;
      var dif = cv - pv;
      var piatto = va.piatto;
      var su = d > 0;
      var cls = piatto ? 'fl' : (su ? (k.inv ? 'dn' : 'up') : (k.inv ? 'up' : 'dn'));
      var ar = piatto ? '—' : (su ? '▲' : '▼');
      var ent = punti ? f.pp(Math.abs(dif)).slice(1) : f.pc(Math.abs(d));
      var defin = A.definita(k.measure, c), nuova = A.nuova(k.measure, c, p);
      if (nuova || !defin || !A.definita(k.measure, p)) { cls = 'fl'; ar = ''; ent = nuova ? (A.T.nuova || 'nuova') : '—'; }
      /* Nel blocco unico le card non hanno una larghezza propria: crescono in proporzione
         allo span dentro l'unica superficie, cosi i separatori cadono dove cade la griglia. */
      var kb = (SPEC.__pelle || {}).banda === 'blocco';
      var geo = kb ? 'flex:' + (k.span || 1) + ' 1 0;min-width:0' : 'width:' + g.span(k.span || 1) + 'px';
      return '<div class="card kpi" style="' + geo + '">' +
        '<div><div class="k">' + M.esc(k.label) + '</div><div class="vr">' +
        '<div class="v tnum ' + A.statoT(k.measure, cv) + '">' + (defin ? A.mfmt(k.measure, cv) : '—') + '</div>' +
        '<div class="d ' + cls + ' tnum">' + (ar ? ar + ' ' : '') + ent + (ent === '—' || nuova ? '' : ' ' + A.basis()) + '</div></div></div>' +
        '<div class="det tnum">' + (k.of ? A.base(k, c, p) : A.detail(k, cv, pv)) + A.tgt(k.measure, cv) + '</div></div>';
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
      var q = S.q !== null ? 'Q' + (S.q + 1) + ' ' : '', n = A.ampiezza();
      return { prev: q + A.annoLabel(S.y - n, S.y0 - n), cur: q + A.annoLabel() };
    };
    A.tgt = () => '';
    /*#tgt*/
    /* UN CONTEGGIO NON SI LEGGE DA SOLO (Luca, 6 ott 2026: "late payments da solo non ha senso, devi
       sempre confrontare a quanti non sono late"): con `of` la card dice su quanti e che quota, e la
       quota dell'anno prima */
    A.base = function (k, c, p) {
      var b = A.mv(k.of, c), q = b ? A.mv(k.measure, c) / b : 0, bp = A.mv(k.of, p), qp = bp ? A.mv(k.measure, p) / bp : null;
      return (T.of || 'su') + ' ' + A.mfmt(k.of, b) + ' ' + M.esc((A.meas(k.of).label || '').toLowerCase()) + ' · <b>' + f.pc(q) + '</b>' +
        (qp !== null ? ' · ' + A.periodPair().prev + ' ' + f.pc(qp) : '');
    };
    /* il target accanto al valore, col verso */
    A.tgt = function (ms, v) {
      var m = A.meas(ms), st = A.statoT(ms, v);
      if (!st) return '';
      return ' · <span class="' + st + '">' + (st === 'tok' ? '▲ ' : '▼ ') + (T.target || 'target') + ' ' + A.mfmt(ms, m.target) + '</span>';
    };
    /*#/tgt*/
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
        (v.note ? '<span class="hr">' + (v.__noteHtml ? v.note : M.esc(A.tpl(v.note))) + '</span>' : '') + '</div>' : '';
      return '<div class="card"' + (A.vk ? ' data-vk="' + M.esc(A.vk) + '"' : '') + ' style="width:' + g.span(v.span) + 'px' + (opts.flex ? ';display:flex;flex-direction:column' : '') + '">' +
        head + (A.legendaAuto(v) ? A.legend(A.legendaAuto(v)) : '') + body + '</div>';
    };
    /* LA LEGENDA LA DISEGNA CHI DISEGNA IL GRAFICO. Nel trend l'anno prima e una linea grigia
       tratteggiata; nel colline e una seconda colonna grigia (--prior). Quando la scriveva la
       spec, il modello copiava quella del trend dentro un colline: "2024 = tratteggio" sopra due
       serie di barre colorate, in tre mockup, due gia approvati. */
    A.legendaAuto = function (v) {
      if (v.type === 'trend') return [{ l: '{y}', c: 'var(--cur)' }, { l: '{py}', dash: true }];
      if (v.type === 'colline') return [{ l: '{y}', c: 'var(--cur)' }, { l: '{py}', c: 'var(--prior)' }];
      return null;
    };
    A.legend = voci => '<div class="lgd">' + voci.map(function (l) {
      return '<span>' + (l.dash ? '<span class="ln"></span>' : '<i style="background:' + (l.c || 'var(--c2)') + '"></i>') + M.esc(A.tpl(l.l)) + '</span>';
    }).join('') + '</div>';
    /* tiny token interpolation for labels: {y} {py} {basis} {period} {drill} */
    A.tpl = s => String(s)
      .replace(/\{y\}/g, A.annoLabel())
      .replace(/\{py\}/g, A.annoLabel(S.y - A.ampiezza(), S.y0 - A.ampiezza()))
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

    /* IL BOOKMARK — una posizione, piu visual, uno per volta.
       Nasce da una richiesta precisa: "non aver paura di aggiungere una pagina, o meglio ancora
       un bookmark che sostituisce una visual o due con una nuova". E' il modo in cui Power BI
       fa stare in una pagina piu di quanto la pagina contenga, senza mandare il lettore su una
       seconda schermata: la card resta dov'e, cambia cosa mostra.
       Costa poco e rende molto: due domande diverse — "com'e distribuito" e "come va nel tempo"
       — occupano lo stesso riquadro, e il lettore sceglie. Lo stato vive con i filtri, quindi
       si azzera insieme a loro. */
    A.visual = function (v, row) {
      var viste = v.viste;
      if (viste && viste.length) {
        var chiave = v.id || (v.type + ':' + (v.bind && v.bind.measure) + ':' + (v.span || 1));
        var i = (S.vista || {})[chiave] || 0;
        if (i >= viste.length) i = 0;
        /* la vista scelta eredita posizione e altezza dal contenitore: cambia il contenuto,
           non il posto che occupa — altrimenti la pagina ballerebbe a ogni clic */
        var scelta = Object.assign({}, viste[i], { span: v.span, h: v.h });
        scelta.note = viste.map(function (vi, k) {
          return '<span class="vsw' + (k === i ? ' on' : '') + '" data-vista="' + chiave + ':' + k + '">' +
            M.esc(vi.etichetta || vi.title || ('vista ' + (k + 1))) + '</span>';
        }).join('');
        scelta.__noteHtml = true;
        return A.visual(scelta, row);
      }
      var b = M.V[v.type];
      if (!b) return A.card(v, '<div class="mx">?</div>');
      A.vk = v.id || (v.type + ':' + (v.title || '') + ':' + (v.bind && (v.bind.dim || v.bind.measure)));
      A.ign = (v.bind && v.bind.ignoreFilters) || [];
      var html = b(A, v, g.span(v.span), v.h || (row.flex ? 0 : 200));
      /* `crossFilter: false`: i clic dentro il visual non filtrano niente (Power BI: Edit interactions
         → None dal visual verso gli altri); il visual continua a seguire gli slicer */
      if (v.bind && v.bind.crossFilter === false) html = html.replace(/ data-f="[^"]*"/g, '');
      A.vk = null; A.ign = [];
      return html;
    };

    /* ---------- render ---------- */
    /* le ricerche sono tutte per id: getElementById fa lo stesso lavoro senza passare dal motore dei
       selettori, che a ogni ridisegno costava un quinto del tempo del render (misurato nei test) */
    var $ = s => /^#[\w-]+$/.test(s) ? doc.getElementById(s.slice(1)) : doc.querySelector(s);
    A.render = function () {
      /* date slicer */
      if ($('#slCur')) {
        $('#slCur').textContent = A.periodLabel();
        $('#slPanel').classList.toggle('open', S.slOpen);
        /* L'AMPIEZZA prima degli anni, perche e la domanda che viene prima: "quanti anni
           guardo" e poi "quali". Con un anno solo di storia la riga non compare — un controllo
           che ha una sola scelta e rumore. */
        var amp = A.ampiezza();
        /*#finestra*/
        if ($('#slSpanG')) {
          $('#slSpanG').style.display = YRS.length > 1 ? '' : 'none';
          $('#slSpan').innerHTML = A.ampiezze().map(function (n) {
            var et = n === 1 ? (T.spanUno || '1 anno')
              : (n >= YRS.length ? (T.spanTutti || 'Tutti') : n + ' ' + (T.anni || 'anni'));
            return '<button class="slchip ' + (amp === n ? 'on' : '') + '" data-span="' + n + '">' + et + '</button>';
          }).join('');
        }
        /*#/finestra*/
        /* Gli anni dentro la finestra si vedono: `on` e l'estremo che si sposta cliccando,
           `in` sono gli altri compresi. Senza, con l'ampiezza a tre si vedrebbe acceso un anno
           solo e la finestra sembrerebbe non essersi allargata. */
        $('#slYear').innerHTML = YRS.map(y => '<button class="slchip ' +
          (S.y === y ? 'on' : (y >= S.y0 && y < S.y ? 'in' : '')) + '" data-y="' + y + '">' + y + '</button>').join('');
        $('#slQtr').innerHTML = '<button class="slchip ' + (S.q === null ? 'on' : '') + '" data-q="all">' + (T.all || 'Tutto') + '</button>' +
          [0, 1, 2, 3].map(q => '<button class="slchip ' + (S.q === q ? 'on' : '') + '" data-q="' + q + '">Q' + (q + 1) + '</button>').join('');
        var grossa = A.grossa();
        if ($('#slQtrG')) $('#slQtrG').style.display = grossa ? 'none' : '';
        if ($('#slMonG')) $('#slMonG').style.display = grossa ? 'none' : '';
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
      /* IL MENU SI APRE SOTTO IL SUO BOTTONE, e sopra se sotto non c'e posto. Nella rail il pannello
         non aveva un contenitore di riferimento: si apriva in alto a sinistra largo tutta la pagina
         (Fra su Bodan, 3 ott 2026). Ora e agganciato al suo gruppo; qui si controlla solo il fondo. */
      var dop = document.querySelector('.ddp.open');
      if (dop && dop.getBoundingClientRect && window.innerHeight) {
        var rb = dop.getBoundingClientRect();
        if (rb.bottom > window.innerHeight - 6 && rb.height) dop.classList.add('su');
      }
      /* header */
      var pg = S.page === '__drill__' ? SPEC.drill.page : A.page(S.page);
      if ($('#hTtl')) $('#hTtl').textContent = A.tpl(S.page === '__drill__' ? A.dimLabel(S.drill.dim, S.drill.id) : pg.title);
      if ($('#hSub')) $('#hSub').textContent = A.tpl(pg.subtitle || '');
      if ($('#hCtx')) {
        var cx = ['<span class="ctxpill">' + (T.compare || 'Confronto') + ' ' + A.basis() + '</span>'];
        if (A.ampiezza() > 1) cx.push('<span class="ctxpill">' + (T.period || 'Periodo') + ' <b>' + A.annoLabel() + '</b></span>');
        if (S.q !== null && S.mo === null) cx.push('<span class="ctxpill">' + (T.qtr || 'Trim.') + ' <b>Q' + (S.q + 1) + '</b></span>');
        if (S.mo !== null) cx.push('<span class="ctxpill">' + (T.month || 'Mese') + ' <b>' + MON[S.mo] + '</b></span>');
        FDIMS.forEach(fd => { if (S.f[fd.id]) cx.push('<span class="ctxpill">' + M.esc(fd.pill || fd.label) + ' <b>' + M.esc(A.dimLabel(fd.id, S.f[fd.id])) + '</b></span>'); });
        $('#hCtx').innerHTML = cx.join('');
      }
      /* page nav */
      A.doc.querySelectorAll('[data-page]').forEach(b => b.classList.toggle('on', b.getAttribute('data-page') === S.page));
      $('#page').innerHTML = A.buildPage(pg);
      A.stringiTabelle();
    };
    /* UNA TABELLA NON SI TAGLIA. Il conto dello spazio si fa prima del disegno, con altezze
       stimate: giuste per le righe, sbagliate di qualche pixel su intestazioni e titoli che
       cambiano col carattere — e l'ultima riga, il totale, usciva mozzata di 2-17px (cinque pagine
       del corpus e il mockup di Muttahar, 29 set 2026). Dopo il disegno si misura: una tabella che
       non entra nel suo riquadro stringe le righe, in due gradini, finche entra. Dove non c'e
       layout (i test in jsdom) le misure sono zero e non cambia niente. */
    A.stringiTabelle = function () {
      [].forEach.call(A.doc.querySelectorAll('#page .mx'), function (c) {
        if (!c.querySelector('table')) return;
        ['mxs', 'mxss'].forEach(function (cls) { if (c.scrollHeight > c.clientHeight + 1) c.classList.add(cls); });
      });
    };

    /* ---------- interactions ---------- */
    A.mount = function () {
      var tip = $('#tip');
      /* IL TOOLTIP NASCE GIA AL SUO POSTO. Prendeva il contenuto al mouseover e la posizione solo
         al mousemove: quando un grafico si ridisegna sotto un cursore fermo (il drill, un filtro)
         il mousemove non arriva, e il tooltip compariva nell'angolo in alto a sinistra, sopra il
         marchio — visto nei mockup di Parsa e di Nitish (28 set 2026), e dentro un video
         registrato sarebbe stato peggio. Ora si posiziona nello stesso istante in cui compare. */
      var colloca = function (e) {
        var x = e.clientX + 14, y = e.clientY + 16, w = doc.defaultView;
        if (x + tip.offsetWidth > w.innerWidth - 8) x = e.clientX - tip.offsetWidth - 14;
        if (y + tip.offsetHeight > w.innerHeight - 8) y = e.clientY - tip.offsetHeight - 14;
        tip.style.left = x + 'px'; tip.style.top = y + 'px';
      };
      doc.addEventListener('mouseover', function (e) {
        var t = e.target.closest && e.target.closest('[data-tip]');
        if (!t) { if (tip) tip.style.opacity = 0; return; }
        if (tip) { tip.innerHTML = t.getAttribute('data-tip'); colloca(e); tip.style.opacity = 1; }
      });
      doc.addEventListener('mousemove', function (e) {
        if (!tip || tip.style.opacity !== '1') return;
        colloca(e);
      });
      doc.addEventListener('mouseout', function (e) {
        if (tip && (!e.relatedTarget || !(e.relatedTarget.closest && e.relatedTarget.closest('[data-tip]')))) tip.style.opacity = 0;
      });
      doc.addEventListener('click', function (e) {
        var t = e.target, cl = s => t.closest && t.closest(s);
        if (cl('#slBtn')) { S.slOpen = !S.slOpen; S.dd = null; A.render(); return; }
        var dd = cl('[data-dd]'); if (dd) { S.dd = S.dd === dd.getAttribute('data-dd') ? null : dd.getAttribute('data-dd'); S.slOpen = false; A.render(); return; }
        /* l'ampiezza tiene fermo l'anno finale e allarga all'indietro: si continua a guardare
           l'ultimo periodo, con piu storia dietro */
        /*#finestra*/
        var sp = cl('[data-span]');
        if (sp) { A.finestra(S.y, +sp.getAttribute('data-span')); A.render(); return; }
        /*#/finestra*/
        var yy = cl('[data-y]'); if (yy) { A.finestra(+yy.getAttribute('data-y')); A.render(); return; }
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
        if (cl('#btnReset')) { FDIMS.forEach(d => S.f[d.id] = null); S.q = null; S.mo = null; S.ord = {}; S.vista = {};
          /* l'azzeramento riporta anche il periodo a com'era all'apertura: un anno solo,
             quello di partenza */
          S.y = YDEF; S.y0 = YDEF; S.sosp = null; A.render(); return; }
        /* La scheda di interazione. Non passa da A.render(): e sopra il report, non dentro —
           aprirla non deve toccare lo stato dei filtri ne ridisegnare la pagina. */
        var hp = doc.getElementById('howp');
        if (hp && cl('#btnHow')) { hp.classList.add('open'); return; }
        if (hp && (cl('#btnHowX') || e.target === hp)) { hp.classList.remove('open'); return; }
        if (cl('#btnBack')) { S.page = S.from; S.drill = null; A.render(); return; }
        /* l'intestazione ordina, e non filtra: il clic si ferma qui prima di arrivare a
           [data-f], che sulla stessa riga non c'e ma su altre tabelle potrebbe esserci */
        /* la linguetta di una vista: cambia cosa mostra la card, niente altro */
        var ve = cl('[data-vista]');
        if (ve) {
          var rawV = ve.getAttribute('data-vista'), ixV = rawV.lastIndexOf(':');
          S.vista = S.vista || {};
          S.vista[rawV.slice(0, ixV)] = +rawV.slice(ixV + 1);
          A.render(); return;
        }
        /* una voce del conto economico si apre nei suoi conti, e si richiude */
        var xe = cl('[data-exp]');
        if (xe) { S.exp = S.exp || {}; var kx = xe.getAttribute('data-exp'); S.exp[kx] = !S.exp[kx]; A.render(); return; }
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
          /* dentro un grafico: il filtro nasce li ed e un'evidenziazione per quel grafico;
             dalla barra dei filtri: filtra tutto */
          var cardF = fe.closest && fe.closest('#page .card[data-vk]');
          S.fonte = S.fonte || {};
          S.fonte[k] = S.f[k] && cardF ? cardF.getAttribute('data-vk') : null;
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
    var va = A.varia(ms, cv, pv), punti = va.punti;
    var conf = isFinite(pv) && Math.abs(pv) > 1e-9;
    var dif = cv - pv, rel = va.d;
    var piatto = va.piatto;
    var cls = (!conf || piatto) ? 'fl' : ((dif > 0) === !v.inv ? 'up' : 'dn');
    var grande = !conf ? '—' : va.t;
    /* Senza un periodo precedente confrontabile la variazione non esiste. Stampare "+0,0%"
       sarebbe un numero inventato: si dice che il confronto manca e si mostra il livello. */
    var det = conf
      ? per.prev + ' ' + A.mfmt(ms, pv) + ' → ' + per.cur + ' ' + A.mfmt(ms, cv) +
        (punti ? '' : ' · ' + (dif >= 0 ? '+' : '−') + A.mfmt(ms, Math.abs(dif)))
      : per.cur + ' ' + A.mfmt(ms, cv) + ' · ' + (A.T.noPrev || 'nessun periodo precedente confrontabile');

    /* La traiettoria: i mesi dell'anno precedente e di quello corrente, quando ci sono
       entrambi. Passa dal layer condiviso, quindi una ratio qui vale quello che vale nella
       banda KPI e non una linea piatta a zero. */
    /* Con la finestra larga la traiettoria e la finestra: tre anni di mesi in fila. Con un
       anno solo resta il confronto con l'anno prima, che e il suo mestiere. */
    var disp = A.DATA.years || [S.y];
    var anni = A.ampiezza() > 1
      ? A.anniSel().filter(function (y) { return disp.indexOf(y) >= 0; })
      : disp.filter(function (y) { return y === S.y || y === S.y - 1; }).sort();
    if (!anni.length) anni = [S.y];
    var vals = [], i, y, k;
    /* Se la finestra pesca nella storia lontana i mesi non ci sono: la traiettoria diventa un
       punto per anno su tutta la storia, che e la scala a cui quella domanda si fa. */
    var perAnno = A.grossa();
    if (perAnno) anni = (A.DATA.years || anni).slice();
    for (i = 0; i < anni.length; i++) {
      y = anni[i];
      if (perAnno) { vals.push(A.mv(ms, A.agg(A.slice({ y: y, timeline: true })))); continue; }
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
          step.toFixed(1) + '" height="' + ah + '" fill="var(--cur)" opacity=".06"/>';
    }
    var p = '';
    for (i = 0; i < vals.length; i++) p += (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(vals[i]).toFixed(1);
    /* L'area porta il suo tooltip: e l'unica parte della delta-card che rappresenta dei valori
       senza scriverli, e senza il tooltip resta un disegno di cui non si puo chiedere conto. */
    s += '<path class="hit" d="' + p + 'L' + X(vals.length - 1).toFixed(1) + ',' + ah + 'L0,' + ah +
      'Z" fill="var(--cur)" opacity=".13" data-tip="<b>' + M.esc(A.meas(ms).label || ms) +
      '</b><br>' + M.esc(A.T.trajectory || 'traiettoria mensile') + ': ' +
      A.mfmt(ms, Math.min.apply(null, vals)) + ' – ' + A.mfmt(ms, Math.max.apply(null, vals)) + '"/>';
    s += '<path d="' + p + '" fill="none" stroke="var(--cur)" stroke-width="1.6"/>';
    /* una riga fra un anno e l'altro: senza, trentasei mesi in fila sono una linea sola e non
       si capisce dove finisce il 2023 */
    for (i = 1; i < anni.length && !perAnno; i++)
      s += '<line x1="' + X(i * 12 - 0.5).toFixed(1) + '" y1="0" x2="' + X(i * 12 - 0.5).toFixed(1) + '" y2="' + ah +
        '" stroke="var(--line)" stroke-dasharray="3 3"/>';
    /* Il punto finale sta sul bordo destro dell'area, e un cerchio ha un raggio: senza questo
       rientro meta pallino finiva fuori dall'SVG e usciva tagliato a filo card. Tre pixel, ed
       e il genere di cosa che si vede solo quando qualcuno guarda il file. */
    var rP = 2.6;
    s += '<circle cx="' + Math.min(X(vals.length - 1), w - rP - 0.5).toFixed(1) + '" cy="' +
      Y(vals[vals.length - 1]).toFixed(1) + '" r="' + rP + '" fill="var(--cur)"/></svg>';

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

    /* LA FINESTRA LARGA CAMBIA IL DISEGNO, non solo i numeri.
       Tre anni schiacciati in trentasei punti su cinquecento pixel sono una linea seghettata
       che non si legge; e undici linee sovrapposte su un asse Gen-Dic sono un gomitolo. Quindi
       il disegno segue l'ampiezza, come farebbe un analista a mano:
         2-5 anni  -> una linea per anno sullo stesso asse Gen-Dic: e il confronto stagionale,
                      la domanda vera di chi allarga la finestra ("quest'anno va come gli altri?");
         6 anni e oltre -> un punto per anno: e la storia lunga, e i mesi non servono piu. */
    /*#finestra*/
    var nA = A.ampiezza();
    if (nA > 1 || A.grossa()) {
      var anniW = A.anniSel().filter(function (y) { return (A.DATA.years || []).indexOf(y) >= 0; });
      if (!anniW.length) anniW = [S.y];
      /* "lungo" e il disegno per anni. Ci si arriva in due modi: perche gli anni scelti sono
         tanti, o perche fra loro c'e un anno della storia lontana, che i mesi non li ha piu.
         In quel caso l'asse porta TUTTA la storia e la finestra scelta si vede evidenziata —
         lo stesso mestiere che il trend fa gia col trimestre dentro l'anno. */
      var lungo = anniW.length >= 6 || A.grossa();
      if (lungo) anniW = (A.DATA.years || anniW).slice();
      var COLORI = ['var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)', 'var(--c1)'];
      var serie = lungo
        ? [{ etichetta: A.annoLabel(), vals: anniW.map(function (y) {
              return A.mv(ms, A.agg(A.slice({ y: y, timeline: true })));
            }), colore: 'var(--cur)', forte: true }]
        : anniW.map(function (y, k) {
            return { etichetta: String(y), vals: byM(y),
              /* l'ultimo anno e il protagonista: pieno e piu spesso. Gli altri sono lo sfondo
                 su cui si legge, e devono restare distinguibili senza rubare l'occhio. */
              colore: k === anniW.length - 1 ? 'var(--cur)' : COLORI[k % COLORI.length],
              forte: k === anniW.length - 1 };
          });
      var etichette = lungo ? anniW.map(String) : A.MON;
      var nPunti = lungo ? anniW.length : 12;
      /* a destra ci sta il nome della serie, attaccato all'ultimo punto: una legenda separata
         allontanerebbe di nuovo il nome dalla linea che nomina */
      var rEt = lungo ? 14 : Math.max(30, M.largh('0000', 8.5) + 12);
      var mgnW = { t: 14, r: rEt, b: 22, l: 46 };
      var iwW = w - mgnW.l - mgnW.r, ihW = h - mgnW.t - mgnW.b;
      var tutti = serie.reduce(function (a, s2) { return a.concat(s2.vals); }, []);
      var maxW = Math.max.apply(null, tutti) * 1.14 || 1, tkW = M.ticks(maxW), topW = tkW[tkW.length - 1] || 1;
      var YW = function (val) { return mgnW.t + ihW - (val / topW) * ihW; };
      var XW = function (i) { return mgnW.l + (iwW / Math.max(1, nPunti - 1)) * i; };
      var sw = '<svg width="' + w + '" height="' + h + '">';
      tkW.forEach(function (t) {
        sw += '<line x1="' + mgnW.l + '" y1="' + YW(t).toFixed(1) + '" x2="' + (mgnW.l + iwW) + '" y2="' + YW(t).toFixed(1) +
          '" stroke="' + (t ? 'var(--line2)' : 'var(--line)') + '"/>' +
          '<text x="' + (mgnW.l - 7) + '" y="' + (YW(t) + 3.5).toFixed(1) + '" text-anchor="end" font-size="8.5" fill="var(--muted2)" class="tnum">' +
          A.mfmt(ms, t) + '</text>';
      });
      serie.forEach(function (s2) {
        var p2 = '';
        s2.vals.forEach(function (val, i) { p2 += (i ? 'L' : 'M') + XW(i).toFixed(1) + ',' + YW(val).toFixed(1); });
        if (s2.forte)
          sw += '<path d="' + p2 + 'L' + XW(nPunti - 1).toFixed(1) + ',' + (mgnW.t + ihW) + 'L' + mgnW.l + ',' + (mgnW.t + ihW) +
            'Z" fill="var(--cur)" opacity=".06"/>';
        sw += '<path d="' + p2 + '" fill="none" stroke="' + s2.colore + '" stroke-width="' + (s2.forte ? 2 : 1.4) + '"/>';
      });
      /* i pallini con il tooltip stanno sulla serie in primo piano, e il tooltip porta TUTTI
         gli anni di quel mese: e li che si legge il confronto, non passando su tre linee */
      var avanti = serie[serie.length - 1];
      avanti.vals.forEach(function (val, i) {
        var tip = '<b>' + M.esc(etichette[i]) + (lungo ? '' : ' ' + A.annoLabel()) + '</b><br>' + A.mfmt(ms, val);
        if (!lungo) serie.slice(0, -1).forEach(function (s2) {
          tip += '<br>' + s2.etichetta + ': ' + A.mfmt(ms, s2.vals[i]);
        });
        sw += '<circle class="hit" cx="' + XW(i).toFixed(1) + '" cy="' + YW(val).toFixed(1) +
          '" r="3" fill="var(--card)" stroke="var(--cur)" stroke-width="1.7" data-tip="' + tip + '"/>';
      });
      /* la finestra scelta, evidenziata sull'asse della storia */
      if (lungo && (S.y0 > anniW[0] || S.y < anniW[anniW.length - 1])) {
        var i0 = anniW.indexOf(S.y0), i1 = anniW.indexOf(S.y), passoX = iwW / Math.max(1, nPunti - 1);
        if (i0 >= 0 && i1 >= 0)
          sw += '<rect x="' + Math.max(mgnW.l, XW(i0) - passoX / 2).toFixed(1) + '" y="' + mgnW.t +
            '" width="' + Math.min(iwW, (i1 - i0 + 1) * passoX).toFixed(1) + '" height="' + ihW +
            '" fill="var(--cur)" opacity=".06"/>';
      }
      /* le etichette dell'asse: con dieci anni si stampano una sì e una no, altrimenti si
         toccano e diventano una striscia grigia */
      var passo = Math.ceil(nPunti / 12);
      etichette.forEach(function (et, i) {
        if (i % passo) return;
        sw += '<text x="' + XW(i).toFixed(1) + '" y="' + (h - 7) + '" text-anchor="middle" font-size="8.5" fill="' +
          ((!lungo && A.inSel(i)) || lungo ? 'var(--ink2)' : 'var(--muted3)') + '">' + M.esc(et) + '</text>';
      });
      /* il nome dell'anno accanto alla sua linea, non in un angolo */
      if (!lungo) {
        var ordinate = serie.map(function (s2, k) { return { k: k, y: YW(s2.vals[nPunti - 1]), s: s2 }; })
          .sort(function (a, b2) { return a.y - b2.y; });
        var ultimaY = -99;
        ordinate.forEach(function (o2) {
          var yy2 = Math.max(mgnW.t + 4, Math.max(o2.y, ultimaY + 10));
          ultimaY = yy2;
          sw += '<text x="' + (XW(nPunti - 1) + 5).toFixed(1) + '" y="' + (yy2 + 3).toFixed(1) +
            '" font-size="8.5" font-weight="' + (o2.s.forte ? 700 : 500) + '" fill="' + o2.s.colore +
            '" class="tnum">' + M.esc(o2.s.etichetta) + '</text>';
        });
      }
      return A.card(v, sw + '</svg>');
    }
    /*#/finestra*/
    var mgn = { t: 14, r: 14, b: 22, l: 46 }, iw = w - mgn.l - mgn.r, ih = h - mgn.t - mgn.b;
    var max = Math.max.apply(null, cur.concat(prev)) * 1.14 || 1, tk = M.ticks(max), top = tk[tk.length - 1] || 1;
    var Y = val => mgn.t + ih - (val / top) * ih, X = i => mgn.l + (iw / 11) * i;
    var s = '<svg width="' + w + '" height="' + h + '">';
    tk.forEach(function (t) {
      s += '<line x1="' + mgn.l + '" y1="' + Y(t).toFixed(1) + '" x2="' + (mgn.l + iw) + '" y2="' + Y(t).toFixed(1) + '" stroke="' + (t ? 'var(--line2)' : 'var(--line)') + '"/>' +
        '<text x="' + (mgn.l - 7) + '" y="' + (Y(t) + 3.5).toFixed(1) + '" text-anchor="end" font-size="8.5" fill="var(--muted2)" class="tnum">' + A.mfmt(ms, t) + '</text>';
    });
    for (m = 0; m < 12; m++) if (A.inSel(m) && (S.q !== null || S.mo !== null))
      s += '<rect x="' + (X(m) - iw / 22).toFixed(1) + '" y="' + mgn.t + '" width="' + (iw / 11).toFixed(1) + '" height="' + ih + '" fill="var(--cur)" opacity=".05"/>';
    var pa = '', pb = '';
    cur.forEach((val, i) => pa += (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(val).toFixed(1));
    prev.forEach((val, i) => pb += (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(val).toFixed(1));
    s += '<path d="' + pa + 'L' + X(11).toFixed(1) + ',' + (mgn.t + ih) + 'L' + mgn.l + ',' + (mgn.t + ih) + 'Z" fill="var(--cur)" opacity=".06"/>';
    s += '<path d="' + pb + '" fill="none" stroke="var(--prior)" stroke-width="1.5" stroke-dasharray="4 3"/>';
    s += '<path d="' + pa + '" fill="none" stroke="var(--cur)" stroke-width="2"/>';
    cur.forEach(function (val, i) {
      s += '<circle class="hit" cx="' + X(i).toFixed(1) + '" cy="' + Y(val).toFixed(1) + '" r="3" fill="var(--card)" stroke="var(--cur)" stroke-width="1.7" data-tip="<b>' +
        A.MON[i] + ' ' + S.y + '</b><br>' + A.mfmt(ms, val) + '<br>' + (S.y - 1) + ': ' + A.mfmt(ms, prev[i]) + '<br>' +
        (A.T.varShort || 'Var') + ': ' + A.varia(ms, val, prev[i]).t + '"/>';
      s += '<text x="' + X(i).toFixed(1) + '" y="' + (h - 7) + '" text-anchor="middle" font-size="8.5" fill="' + (A.inSel(i) ? 'var(--ink2)' : 'var(--muted3)') + '">' + A.MON[i] + '</text>';
    });
    if (b.labels !== false) s += M.etichettePunti(cur.map((val, i) => ({ x: X(i), y: Y(val), v: val })),
      { fmt: x => A.mfmt(ms, x), col: 'var(--cur)', l: mgn.l, r: mgn.l + iw, t: mgn.t, b: mgn.t + ih });
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
      data.push({ id: '__altri', l: b.altriLabel || (A.T.others || 'Altri'), c: 'var(--altri)', v: coda, coda: true });
    }
    /* IL CUSCINETTO E' COSTANTE DA TUTTE E DUE LE PARTI. Prima l'anello stava al 30% della
       larghezza con un margine sinistro del 4%, e la legenda arrivava a quattro pixel dal
       bordo destro: il disegno appariva spinto a destra e senza aria, ed e il difetto che la
       revisione ha segnalato su quattro donut diversi. Ora si fissa il margine e l'anello si
       CENTRA nello spazio che gli resta, invece di stare a una frazione fissa. */
    /* ANELLO E LEGENDA SONO UN BLOCCO SOLO, CENTRATO INSIEME.
       Il cuscinetto ai bordi non bastava, ed e il difetto che la revisione ha ripetuto tre
       volte dicendo "non e cambiato nulla": il vuoto non era ai lati, era IN MEZZO. L'anello
       stava al centro della sua meta e la legenda cominciava a una frazione fissa della
       larghezza, e fra i due restavano centoquaranta pixel di niente mentre a sinistra ce
       n'erano quaranta.
       Ora si misurano le due parti — il diametro che l'altezza concede, e la legenda che serve
       alle etichette vere — si sommano con una distanza fissa in mezzo, e il blocco si centra
       nella card. Se avanza spazio, avanza in parti uguali ai due lati. */
    var PAD = 12, GAP = 22;
    var dia = Math.min(h * .88, (w - PAD * 2) * .5);
    var wLeg = 0;
    data.forEach(function (d) { wLeg = Math.max(wLeg, M.largh(d.l, 9.5)); });
    /* la legenda porta anche valore e quota quando la card e larga */
    var largaAbb = w > 300;
    wLeg = Math.min(w - PAD * 2 - dia - GAP, wLeg + 12 + (largaAbb ? 78 : 34));
    var blocco = dia + GAP + wLeg;
    var x0 = Math.max(PAD, (w - blocco) / 2);
    var cx = x0 + dia / 2, cy = h / 2;
    /* LO STACCO DI "ALTRI": tre pixel, non di piu. Deve bastare a dire "questa fetta e diversa
       dalle altre" senza chiamare l'occhio: il donut esiste per mostrare quanto pesa la TESTA,
       e una coda esplosa in fuori diventerebbe la cosa piu vistosa della card. Il raggio cede
       quei tre pixel, cosi la fetta staccata resta dentro il riquadro. */
    var STACCO = data.some(d => d.coda) ? 3 : 0;
    var rO = Math.max(18, dia / 2 - STACCO), rI = rO * .6;
    var lx = x0 + dia + GAP;
    var tot = data.reduce((a, d) => a + d.v, 0) || 1, ang = -Math.PI / 2;
    for (var _t = 0; _t < Math.min(testa, data.length); _t++) quotaTesta += data[_t].v;
    var s = '<svg width="' + w + '" height="' + h + '">';
    data.forEach(function (d) {
      var a2 = ang + (d.v / tot) * Math.PI * 2, big = (a2 - ang) > Math.PI ? 1 : 0;
      var P = (r, a) => [(cx + r * Math.cos(a)).toFixed(2), (cy + r * Math.sin(a)).toFixed(2)];
      var p1 = P(rO, ang), p2 = P(rO, a2), p3 = P(rI, a2), p4 = P(rI, ang);
      var dim2 = A.hl(dim) && A.hl(dim) !== d.id;
      /* Rosso solo al problema: lo spicchio segnalato dalla spec, mai una tinta a caso. */
      var col = (b.alert && b.alert === d.id) ? 'var(--bad)' : d.c;
      var sp = d.coda ? STACCO : 0, amS = (ang + a2) / 2;
      var tr = sp ? ' transform="translate(' + (sp * Math.cos(amS)).toFixed(2) + ',' + (sp * Math.sin(amS)).toFixed(2) + ')"' : '';
      s += '<path class="hit ' + (dim2 ? 'dimd' : '') + (d.coda ? ' altri' : '') + '"' + tr + ' d="M' + p1[0] + ',' + p1[1] + ' A' + rO + ',' + rO + ' 0 ' + big + ' 1 ' + p2[0] + ',' + p2[1] +
        ' L' + p3[0] + ',' + p3[1] + ' A' + rI + ',' + rI + ' 0 ' + big + ' 0 ' + p4[0] + ',' + p4[1] + ' Z" fill="' + col +
        '" stroke="var(--card)" stroke-width="1.5" data-f="' + dim + ':' + (d.coda ? '' : d.id) + '" data-tip="<b>' + M.esc(d.l) + '</b><br>' +
        A.mfmt(ms, d.v) + '<br>' + f.pc(d.v / tot) + '"/>';
      /* La QUOTA sullo spicchio, non il valore: la domanda del donut e "quanta parte", e il
         valore sta gia nella legenda e nel tooltip. Sotto il 9% non ci sta e si omette. */
      if (d.v / tot >= 0.09 && !dim2) {
        var am = (ang + a2) / 2, rm = (rO + rI) / 2;
        s += '<text' + tr + ' x="' + (cx + rm * Math.cos(am)).toFixed(1) + '" y="' + (cy + rm * Math.sin(am) + 3).toFixed(1) +
          '" text-anchor="middle" font-size="9" font-weight="600" fill="' + (d.coda ? 'var(--altriInk)' : '#fff') + '" class="tnum" ' +
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
    var wide = largaAbb;
    var step = Math.max(11, Math.min(15.5, (h - 16) / Math.max(1, data.length)));
    var ly = cy - (data.length * step) / 2 + step * .7;
    data.forEach(function (d) {
      var dimd = A.hl(dim) && A.hl(dim) !== d.id;
      s += '<g class="hit ' + (dimd ? 'dimd' : '') + '" data-f="' + dim + ':' + d.id +
        '" data-tip="<b>' + M.esc(d.l) + '</b><br>' + A.mfmt(ms, d.v) + '<br>' + f.pc(d.v / tot) + '">' +
        '<rect x="' + lx + '" y="' + (ly - 7.5) + '" width="' + wLeg + '" height="' + Math.min(step, 15) + '" fill="transparent"/>' +
        '<rect x="' + lx + '" y="' + (ly - 6.5) + '" width="8" height="8" rx="1.5" fill="' + d.c + '"/>' +
        '<text x="' + (lx + 12) + '" y="' + ly + '" font-size="9.5" fill="var(--ink2)">' + M.esc(d.l) + '</text>' +
        (wide ? '<text x="' + (lx + wLeg - 32) + '" y="' + ly + '" text-anchor="end" font-size="9" fill="var(--muted)" class="tnum">' + A.mfmt(ms, d.v) + '</text>' : '') +
        '<text x="' + (lx + wLeg) + '" y="' + ly + '" text-anchor="end" font-size="9" fill="var(--muted2)" class="tnum">' + f.pc(d.v / tot, 0) + '</text></g>';
      ly += step;
    });
    return A.card(v, s + '</svg>');
  };
})(MK);
/*#endregion*/

/*#region chart:hbar*/
/* Ranked horizontal bars — "space-saving": il nome sopra la barra, la barra su tutta la larghezza,
   valore e dettaglio attaccati alla sua fine (o dentro, se fuori non ci stanno). */
(function (M) {
  /* l'inchiostro leggibile SOPRA un colore della palette: chiaro sui fondi scuri, scuro sui chiari.
     Un valore dentro una barra col colore fisso del tema era scuro su scuro (Luca, 3 ott 2026). */
  M.inkSu = function (col) { var l = M.lum(col); return l !== null && l >= 0.6 ? 'var(--ink)' : '#fff'; };
  M.V.hbar = function (A, v, w, h) {
    var b = v.bind || {}, S = A.S, dim = b.dim, ms = b.measure;
    h = v.h || h || 190;
    var det = !!b.detail, rows = A.slice({ detail: det, ignore: [dim, b.parent].filter(x => x && A.evid(x)) });   /* da slicer filtra, dal clic qui evidenzia */
    /* per membro, attraverso il layer condiviso: una misura ratio sommata dalla colonna grezza
       usciva 0,0% su ogni barra mentre la matrice accanto mostrava il valore giusto */
    var grp = A.byKey(rows, r => r[dim]);
    var parentOf = {};
    if (b.parent) grp.keys.forEach(function (id) { parentOf[id] = (grp.rows[id][0] || {})[b.parent]; });
    var data = grp.keys.map(function (id) {
      var a = grp.agg[id], mb = A.member(dim, id), par = b.parent ? parentOf[id] : null;
      /* una differenza ha sempre il segno: "€97.4K vs budget" si leggeva come un valore, non come +97,4K */
      var sv = b.subMeasure ? A.mv(b.subMeasure, a) : 0, sd = b.subMeasure && A.meas(b.subMeasure).agg === 'diff' && sv > 0 ? '+' : '';
      var subv = b.subMeasure ? sd + A.mfmt(b.subMeasure, sv) + (b.subUnit || '') : '';
      /* IL COLORE DEL MEMBRO E LO STESSO DELLA TABELLA: il quadratino di USD nella matrice e la
         barra di USD qui (Fra su Luca, 3 ott 2026). Col padre colora il padre. */
      return { id: id, l: mb.n, v: A.mv(ms, a), cat: par, c: par ? A.color(b.parent, par) : (mb.c || null),
        sub: (par ? A.dimLabel(b.parent, par) + ' · ' : '') + subv, subv: subv };
    /* `order: "asc"` e la lista dei PEGGIORI: stessa misura, verso opposto (Parsa) */
    }).sort((x, y) => b.order === 'asc' ? x.v - y.v : y.v - x.v).slice(0, b.top || 8);
    /* LE BARRE SI DEVONO POTER CONFRONTARE (Fra su Luca, 3 ott 2026: "sono cosi piccoli i colori
       che non si capisce quale sia di piu degli altri… se metti qualcosa fuori cosi i grafici non
       sono chiari"). Prima: nome a sinistra in una colonna fino al 42% della card, barra fra il
       nome e un valore con la misura secondaria, alta al massimo 13px, e un colore per membro —
       barre corte e sottili, sei colori da decifrare, e la scritta che sforava il bordo.
       Ora, come il bar chart "space-saving" di Power BI:
        - il nome sta SOPRA la barra, allineato a sinistra: la barra parte dal cuscinetto e ha
          tutta la larghezza della card per mostrare le differenze;
        - il colore del membro, lo stesso della sua riga nelle tabelle, su barre abbastanza
          spesse da leggerlo; col padre colora il padre;
        - la barra e spessa quanto la riga permette (fra 8 e 18px);
        - il valore in grassetto alla fine della barra; dove fuori non ci sta entra DENTRO (i
          "details" di Power BI), con l'inchiostro che contrasta col colore della barra;
        - il dettaglio (subMeasure) sulla riga del nome, a destra, attenuato.
       Niente esce mai dal riquadro (gate: test/barre.test.js). */
    /* COLORATE PER IL PADRE, LE BARRE DICONO QUALE PADRE: la legenda dei padri presenti. Senza,
       i Top 10 clienti di Bodan avevano tre colori che nessuno spiegava (3 ott 2026). */
    var lgd = '';
    if (b.parent) {
      var visti = [];
      data.forEach(d => { if (d.cat && visti.indexOf(d.cat) < 0) visti.push(d.cat); });
      lgd = A.legend(visti.map(id => ({ l: A.dimLabel(b.parent, id), c: A.color(b.parent, id) })));
      h -= 20;
    }
    var px = 9, lblH = 12, n = data.length || 1;
    var x0 = M.PAD, full = w - 2 * M.PAD;
    /* il valore sta alla fine della barra; il dettaglio sulla riga del nome, a destra: cosi la
       barra piu lunga ha quasi tutta la card */
    var valW = Math.max.apply(null, data.map(d => M.larghN(A.mfmt(ms, d.v), px))) + 8;
    var maxBar = Math.max(full * .7, full - valW);
    var m = { t: 4, b: 4 }, rh = (h - m.t - m.b) / n;
    var bh = Math.max(8, Math.min(18, rh - lblH - 6));
    var max = Math.max.apply(null, data.map(d => d.v)) || 1;
    var mm = A.meas(ms), quota = (b.share !== false && mm.agg === 'sum' && data.every(d => d.v >= 0))
      ? grp.keys.reduce((t, id) => t + Math.max(0, A.mv(ms, grp.agg[id])), 0) : 0;
    /* con la quota la scritta fuori dalla barra e piu lunga: la barra piu lunga lascia il suo spazio */
    if (quota) maxBar = Math.max(full * .7, full - (Math.max.apply(null, data.map(d => M.larghN(A.mfmt(ms, d.v) + ' ' + Math.round(d.v / quota * 100) + '%', px))) + 8));
    var s = '<svg width="' + w + '" height="' + h + '">';
    data.forEach(function (d, i) {
      var top = m.t + rh * i, yb = top + lblH + 2, bl = Math.max(2, (d.v / max) * maxBar);
      var dimd = (b.parent && A.hl(b.parent) && d.cat && A.hl(b.parent) !== d.cat) ||
        (!b.parent && A.hl(dim) && A.hl(dim) !== d.id);
      /* UN CLIC FILTRA CIO SU CUI SI CLICCA (Fra, 4 ott 2026): in una lista di dettaglio — i clienti
         colorati per segmento — il clic filtrava il segmento del cliente, ed evidenziava tutto il
         Mid-market mentre lo slicer filtrava: due comportamenti. Se l'elemento cliccato non e un
         filtro del report, la barra non e cliccabile e la lista risponde solo agli slicer. */
      var df = A.filtrabile(dim) ? dim + ':' + d.id : '';
      /* LA QUOTA SUL TOTALE accanto al valore, per una misura che si somma (le guideline di Fra: "6,282
         49%"): il totale e quello di tutti i membri, non solo dei primi mostrati. Una percentuale, un
         rapporto o uno stock non hanno quota; `share: false` la spegne. */
      var qt = quota ? ' ' + Math.round(d.v / quota * 100) + '%' : '';
      var val = A.mfmt(ms, d.v), twV = M.larghN(val + qt, px), ty = (yb + bh / 2 + 3.2).toFixed(1);
      var fuori = x0 + bl + 6 + twV <= w - M.PAD;
      var et = fuori
        ? '<text x="' + (x0 + bl + 6).toFixed(1) + '" y="' + ty + '" font-size="' + px + '" class="tnum" fill="var(--ink)" font-weight="600">' + M.esc(val) + (qt ? '<tspan font-weight="400" font-style="italic" fill="var(--muted2)">' + qt + '</tspan>' : '') + '</text>'
        : '<text x="' + (x0 + bl - 5).toFixed(1) + '" y="' + ty + '" text-anchor="end" font-size="' + px + '" class="tnum" fill="' + M.inkSu(d.c || 'var(--c1)') + '" font-weight="600">' + M.esc(val) +
          (qt && twV + 10 <= bl ? '<tspan font-weight="400" font-style="italic" opacity=".8">' + qt + '</tspan>' : '') + '</text>';
      var subW = d.subv ? M.larghN(d.subv, 8.5) + 10 : 0;
      if (d.subv) et += '<text x="' + (w - M.PAD) + '" y="' + (top + lblH - 2).toFixed(1) + '" text-anchor="end" font-size="8.5" class="tnum" fill="var(--muted2)">' + M.esc(d.subv) + '</text>';
      /* il nome si accorcia solo se tocca il dettaglio sulla sua riga, e lo dice coi puntini */
      var nm = d.l, spazioNm = full - subW;
      if (M.largh(nm, 9.5) > spazioNm) { while (nm.length > 3 && M.largh(nm + '…', 9.5) > spazioNm) nm = nm.slice(0, -1); nm += '…'; }
      s += '<g class="hit ' + (dimd ? 'dimd' : '') + '" ' + (df ? 'data-f="' + df + '"' : '') +
        ' data-tip="<b>' + M.esc(d.l) + '</b><br>' + val + (d.sub ? '<br>' + M.esc(d.sub) : '') + '">' +
        '<rect x="0" y="' + top.toFixed(1) + '" width="' + w + '" height="' + rh.toFixed(1) + '" fill="transparent"/>' +
        '<text x="' + x0 + '" y="' + (top + lblH - 2).toFixed(1) + '" font-size="9.5" fill="var(--ink2)">' + M.esc(nm) + '</text>' +
        '<rect class="barra" x="' + x0 + '" y="' + yb.toFixed(1) + '" width="' + bl.toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="1.5" fill="' + (A.statoT(ms, d.v) ? 'var(--' + A.statoT(ms, d.v).slice(1) + ')' : (d.c || 'var(--c1)')) + '"/>' +
        et + '</g>';
    });
    return A.card(v, lgd + '<div style="flex:1;display:flex;align-items:center;padding-bottom:6px">' + s + '</svg></div>', { flex: true });
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
      if (c.kind === 'var') return A.varia(c.measure, A.mv(c.measure, r.a), A.mv(c.measure, r.b)).d;
      if (c.kind === 'bud') return A.mv(c.measure, r.a) - A.mv(c.budget, r.a);
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
    var ig = A.evid(dim) ? [dim] : [], tot = A.agg(A.slice({ ignore: ig })), totP = A.prev({ ignore: ig });
    var frec = function (chiave) {
      if (!ord || String(ord.i) !== String(chiave)) return '<span class="so"> ⇅</span>';
      return '<span class="so on"> ' + (ord.d === 'asc' ? '▲' : '▼') + '</span>';
    };
    var head = '<tr><th class="ord" data-ord="' + dim + ':__nome">' +
      M.esc(A.tpl(b.label || dim)) + frec('__nome') + '</th>' +
      cols.map(function (c, i) {
        return '<th class="ord' + (A.bud[c.measure] && !c.kind ? ' bdg' : '') + '" data-ord="' + dim + ':' + i + '">' +
          M.esc(A.tpl(c.label || A.meas(c.measure).label || '')) + frec(i) + '</th>';
      }).join('') + '</tr>';
    var cell = function (c, a, p, base) {
      var cv = A.mv(c.measure, a), pv = A.mv(c.measure, p);
      /* SCOSTAMENTO DAL BUDGET con la logica finance: `budget` e la misura di riferimento,
         `show` "abs" (importo) o "pct" (percentuale, punti per un tasso). Rosso e verde seguono il
         verso della misura: un costo sopra il budget e sfavorevole (Bodan, 3 ott 2026). */
      if (c.kind === 'bud') {
        var bv = A.mv(c.budget, a), sc = A.scost(c.measure, cv, bv, c.inv);
        if (c.show === 'abs' && !A.punti(c.measure)) sc.t = (sc.d > 0 ? '+' : sc.d < 0 ? '−' : '') + A.mfmt(c.measure, Math.abs(sc.d));
        return '<td class="tnum ' + sc.cls + '">' + sc.t + '</td>';
      }
      if (c.kind === 'var') {
        /* una voce che l'anno prima non c'era non "cresce dello zero per cento": e nuova. Senza,
           la campagna fatta per la prima volta usciva "— 0,0%" accanto alle altre (Fra, 28 set 2026) */
        if (A.nuova(c.measure, a, p)) return '<td class="tnum fl">' + M.esc(A.T.nuova || 'nuova') + '</td>';
        if (!A.definita(c.measure, a) || !A.definita(c.measure, p)) return '<td class="tnum fl">—</td>';
        var va = A.varia(c.measure, cv, pv), d = va.d, up = c.inv ? d < 0 : d >= 0;
        /* una variazione nulla e piatta: "▼ −0,0 pp" in rosso dice un calo che non c'e */
        if (va.piatto) return '<td class="tnum fl">— ' + A.varia(c.measure, 0, 0).t.replace(/^[+−-]/, '') + '</td>';
        return '<td class="tnum ' + (up ? 'up' : 'dn') + '">' + (d >= 0 ? '▲ ' : '▼ ') + va.t + '</td>';
      }
      if (!A.definita(c.measure, a)) return '<td class="tnum fl">—</td>';
      if (c.kind === 'share') return '<td class="tnum">' + f.pc(base ? cv / base : 0, 0) + '</td>';
      if (c.kind === 'heat') {                    /* conditional formatting — house signature */
        var lim = c.scale || [0, 1], t = Math.max(0, Math.min(1, (cv - lim[0]) / ((lim[1] - lim[0]) || 1)));
        return '<td class="tnum ' + A.statoT(c.measure, cv) + '" style="background:' + (t > .66 ? 'var(--heatHi)' : t > .33 ? 'var(--heatMid)' : 'var(--heatLo)') + '">' + A.mfmt(c.measure, cv) + '</td>';
      }
      return '<td class="tnum' + (A.bud[c.measure] && !c.kind ? ' bdg' : '') + ' ' + A.statoT(c.measure, cv) + '">' + A.mfmt(c.measure, cv) + '</td>';
    };
    var body = rows.map(function (r) {
      var cl = A.hl(dim) ? (A.hl(dim) === r.m.id ? 'sel' : 'dim') : '';
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
    /* il termine di paragone si sposta con la finestra: tre anni si confrontano coi tre
       precedenti, non con l'anno prima dell'ultimo */
    var nAmp = A.ampiezza();
    var gPri = A.byKey(A.slice(nAmp > 1
      ? { finestra: [S.y0 - nAmp, S.y - nAmp], timeline: true }
      : { y: S.y - 1, timeline: true }), r => r.m);
    var cur = new Array(12), pri = new Array(12), line = new Array(12), _i;
    for (_i = 0; _i < 12; _i++) {
      cur[_i] = gCur.agg[_i] ? A.mv(ms, gCur.agg[_i]) : 0;
      pri[_i] = gPri.agg[_i] ? A.mv(ms, gPri.agg[_i]) : 0;
      /* un mese senza dati non e uno zero: la linea lo salta */
      line[_i] = (lm && gCur.agg[_i]) ? A.mv(ln, gCur.agg[_i]) : null;
    }
    /* L'ASSE DELLA LINEA SI ADATTA AI DATI, come in Power BI. Partiva da zero fino a 1,25 volte il
       massimo: un OTIF fra l'86% e il 91% occupava il dieci per cento dell'altezza e la linea
       usciva dritta, senza un'etichetta che dicesse la scala (Fra su Muttahar, 2 ott 2026: "non si
       capisce bene l'asse e la riga e dritta"). Ora l'asse secondario va dal minimo al massimo dei
       mesi visibili, con tacche tonde scritte a destra nel colore della linea, e si ricalcola a
       ogni filtro. La linea occupa la meta alta del grafico, sopra le colonne quando puo. */
    /* il target entra nella scala: una linea fissa fuori dall'asse non si vedrebbe */
    var lv = line.filter(x => x !== null), aL = null, tg = typeof b.target === 'number' ? b.target : (ln && typeof A.meas(ln).target === 'number' ? A.meas(ln).target : null);
    var lvT = tg === null ? lv : lv.concat([tg]);
    if (ln && lv.length) aL = M.asseStretto(Math.min.apply(null, lvT), Math.max.apply(null, lvT));
    var max = Math.max.apply(null, cur.concat(pri)) * 1.14 || 1, tk = M.ticks(max), top = tk[tk.length - 1] || 1;
    /* i margini valgono quanto le tacche piu larghe dei due assi (in migliaia con un decimale
       "€8,000.0K" non stava nei 46px fissi) */
    var tw = a => Math.ceil(Math.max.apply(null, a)) + 12;
    var mgn = { t: 14, b: 22, l: Math.max(46, tw(tk.map(t => M.larghN(A.mfmt(ms, t), 8.5)))),
      r: aL ? Math.max(44, tw(aL.tk.map(t => M.larghN(A.mfmt(ln, t), 8))) - 4) : 40 };
    var iw = w - mgn.l - mgn.r, ih = h - mgn.t - mgn.b;
    var Y = val => mgn.t + ih - (val / top) * ih;
    /* L'ASSE DELLA LINEA OCCUPA TUTTA L'ALTEZZA, come in Power BI: stava nella meta alta del
       grafico, con le tacche solo in cima (Fra, 3 ott 2026: "mai visto in Power BI"). */
    var Y2 = val => aL ? mgn.t + ih - ((val - aL.lo) / (aL.hi - aL.lo || 1)) * ih : mgn.t;
    var cw = iw / 12, bw = cw * .34;
    var s = '<svg width="' + w + '" height="' + h + '">';
    tk.forEach(t => s += '<line x1="' + mgn.l + '" y1="' + Y(t).toFixed(1) + '" x2="' + (mgn.l + iw) + '" y2="' + Y(t).toFixed(1) + '" stroke="' + (t ? 'var(--line2)' : 'var(--line)') + '"/>' +
      '<text x="' + (mgn.l - 7) + '" y="' + (Y(t) + 3.5).toFixed(1) + '" text-anchor="end" font-size="8.5" fill="var(--muted2)" class="tnum">' + A.mfmt(ms, t) + '</text>');
    for (var i = 0; i < 12; i++) {
      var x0 = mgn.l + cw * i + cw / 2;
      s += '<rect class="hit" x="' + (x0 - bw - 1).toFixed(1) + '" y="' + Y(pri[i]).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(0, mgn.t + ih - Y(pri[i])).toFixed(1) +
        '" fill="var(--prior)" data-tip="<b>' + A.MON[i] + ' ' + A.annoLabel(S.y - nAmp, S.y0 - nAmp) + '</b><br>' + A.mfmt(ms, pri[i]) + '"/>';
      s += '<rect class="hit" x="' + (x0 + 1).toFixed(1) + '" y="' + Y(cur[i]).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(0, mgn.t + ih - Y(cur[i])).toFixed(1) +
        '" fill="var(--cur)" data-tip="<b>' + A.MON[i] + ' ' + A.annoLabel() + '</b><br>' + A.mfmt(ms, cur[i]) + '' + '"/>';
      s += '<text x="' + x0.toFixed(1) + '" y="' + (h - 7) + '" text-anchor="middle" font-size="8.5" fill="' + (A.inSel(i) ? 'var(--ink2)' : 'var(--muted3)') + '">' + A.MON[i] + '</text>';
    }
    /* IL COLORE DELLA LINEA CONTRASTA CON LE COLONNE. Era l'ambra fissa del tema, quasi uguale
       alle colonne dell'anno corrente su piu di una palette (oliva accanto ad ambra nel mockup di
       Luca, Fra 3 ott 2026). Si sceglie il primo colore che si stacca in luminosita sia dalle
       colonne correnti sia da quelle dell'anno prima; il target usa lo stesso, tratteggiato. */
    /* abbastanza scuro da leggersi sulla card (luminosita <= .75); vince il primo che dista
       abbastanza dalle due serie di colonne, altrimenti quello che dista di piu */
    var lc = 'var(--amber)', best = -1;
    ['var(--c1)', 'var(--c3)', 'var(--amber)', 'var(--c4)', 'var(--c5)', 'var(--c6)', 'var(--ink)'].some(function (c) {
      var l = M.lum(c), dC = M.distanza(c, 'var(--cur)'), dP = M.distanza(c, 'var(--prior)');
      if (l === null || dC === null || l > .75) return false;
      var sc = Math.min(dC, dP === null ? 1 : dP);
      if (sc > best) { best = sc; lc = c; }
      return sc >= .3;
    });
    if (ln && aL) {
      /* l'asse secondario: tacche a destra, nel colore della linea */
      aL.tk.forEach(t => s += '<text x="' + (mgn.l + iw + 6) + '" y="' + (Y2(t) + 3).toFixed(1) + '" font-size="8" fill="' + lc + '" class="tnum l2">' + A.mfmt(ln, t) + '</text>');
      /* LA LINEA DEL TARGET, fissa e tratteggiata, con la sua etichetta a sinistra sopra la linea */
      if (tg !== null) {
        var yT = Y2(tg).toFixed(1), tl = (b.targetLabel || 'Target') + ' ' + A.mfmt(ln, tg);
        s += '<line class="tgt" x1="' + mgn.l + '" y1="' + yT + '" x2="' + (mgn.l + iw) + '" y2="' + yT + '" stroke="' + lc + '" stroke-width="1.4" stroke-dasharray="5 3" opacity=".8"/>' +
          M.testoVelato(tl, mgn.l + 4, +yT - 4, { px: 8.5, anc: 'start', velo: 'var(--card)', opacita: 0.9, ink: lc, padX: 3, padY: 1 });
      }
      var p = '', su = false;
      line.forEach((val, k) => { if (val === null) { su = false; return; } p += (su ? 'L' : 'M') + (mgn.l + cw * k + cw / 2).toFixed(1) + ',' + Y2(val).toFixed(1); su = true; });
      s += '<path class="l2l" d="' + p + '" fill="none" stroke="' + lc + '" stroke-width="2"/>';
      /* ogni punto ha il suo tooltip, con un bersaglio piu largo del pallino: prima il valore
         della linea si leggeva solo passando sulle colonne, e chi puntava la linea non vedeva
         niente */
      line.forEach((val, k) => {
        if (val === null) return;
        var cx = (mgn.l + cw * k + cw / 2).toFixed(1), cy = Y2(val).toFixed(1);
        var tip = '<b>' + A.MON[k] + ' ' + A.annoLabel() + '</b><br>' + M.esc(lm.label) + ': ' + A.mfmt(ln, val) +
          (k && line[k - 1] !== null ? ' (' + A.varia(ln, val, line[k - 1]).t + ' ' + M.esc(A.MON[k - 1]) + ')' : '') +
          '<br>' + M.esc(A.meas(ms).label) + ': ' + A.mfmt(ms, cur[k]);
        /* il bordo trasparente largo e il bersaglio del mouse: il pallino resta piccolo */
        var vR = A.meas(ln).format === 'pc' ? Math.round(val * 1000) / 1000 : val;
        var stP = tg !== null ? ((A.meas(ln).inv ? vR <= tg : vR >= tg) ? 'var(--ok)' : 'var(--ko)') : lc;
        s += '<circle class="hit l2p" cx="' + cx + '" cy="' + cy + '" r="' + (tg !== null ? 3.2 : 2.6) + '" fill="' + stP + '" stroke="transparent" stroke-width="11" data-tip="' + tip.replace(/"/g, '&quot;') + '"/>';
      });
      /* L'ETICHETTA STA SOPRA L'ULTIMO PUNTO, non nell'angolo: li era a mezza card dalla curva
         che nomina ("non si capisce subito a cosa fa riferimento", due volte). A destra ci sono
         le tacche dell'asse secondario. Il velo la tiene leggibile sopra una colonna. */
      var k = 11; while (line[k] === null) k--;
      var wLbl = M.largh(lm.label || '', 8.5), xU = mgn.l + cw * k + cw / 2;
      /* dentro l'area del grafico, mai sopra le tacche dell'asse a destra; e se cade sulla scritta
         del target, sotto il punto invece che sopra ("EBITDA margin" copriva il 22,0% e il budget
         nel mockup di Bodan, 3 ott 2026) */
      var yL = Math.max(mgn.t + 8, Y2(line[k]) - 10);
      if (tg !== null && Math.abs(yL - (Y2(tg) - 4)) < 11) yL = Y2(line[k]) + 16;
      s += M.testoVelato(lm.label || '', Math.min(Math.max(xU, mgn.l + wLbl / 2), mgn.l + iw - wLbl / 2),
        yL,
        { px: 8.5, anc: 'middle', velo: 'var(--card)', opacita: 0.9, ink: lc, padX: 4, padY: 2 });
      /* minimo, massimo e ultimo valore della linea; l'ultimo sta sotto il punto, perche sopra c'e
         il nome della serie, e nessuno tocca il nome o la scritta del target */
      var xN = Math.min(Math.max(xU, mgn.l + wLbl / 2), mgn.l + iw - wLbl / 2), evita = [{ l: xN - wLbl / 2 - 4, r: xN + wLbl / 2 + 4, t: yL - 10, b: yL + 3 }];
      if (tg !== null) evita.push({ l: mgn.l, r: mgn.l + 8 + M.larghN((b.targetLabel || 'Target') + ' ' + A.mfmt(ln, tg), 8.5), t: Y2(tg) - 14, b: Y2(tg) });
      if (b.labels !== false) s += M.etichettePunti(line.map((val, k2) => ({ x: mgn.l + cw * k2 + cw / 2, y: val === null ? 0 : Y2(val), v: val })),
        { fmt: x => A.mfmt(ln, x), col: lc, l: mgn.l, r: mgn.l + iw, t: mgn.t, b: mgn.t + ih, ultimoGiu: true, evita: evita });
    }
    return A.card(v, s + '</svg>');
  };
})(MK);
/*#endregion*/

/*#region chart:statement*/
/* IL CONTO ECONOMICO (Bodan, 3 ott 2026: "the full income statement in proper account order …
   with Actual, Budget, Variance and Variance % columns. Drill from statement lines down to
   individual accounts"). Le righe sono le voci nell'ordine dichiarato; un subtotale e la sua
   MISURA (Gross profit = ricavi − costo del venduto), mai la somma delle righe sopra. Colonne:
   periodo e, con un mese o un trimestre scelto, il YTD fino a li. Una voce con `accounts` si apre
   in riga nei suoi conti: i conti si ripartiscono la voce coi loro pesi — il budget esattamente,
   l'effettivo con uno scarto per conto e per periodo, sempre rinormalizzato perche la somma dei
   conti sia la voce. */
(function (M) {
  var scarto = function (t) { var h = 2166136261; for (var i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return .86 + ((h >>> 0) % 1000) / 1000 * .28; };
  M.V.statement = function (A, v, w, h) {
    var b = v.bind || {}, S = A.S, f = A.f, lines = b.lines || [], idv = v.id || v.title || 'pl';
    var gruppi = [{ l: A.periodLabel(), a: A.agg(A.slice({})) }];
    if (b.ytd !== false && (S.mo !== null || S.q !== null)) {
      var mesi = A.ytdMesi();
      gruppi.push({ l: 'YTD ' + A.MON[mesi[mesi.length - 1]], a: A.agg(A.slice({ y: S.y, months: mesi })) });
    }
    var T = A.T, cn = [T.actual || 'Effettivo', T.bud || 'Budget', T.varShort || 'Var', (T.varShort || 'Var') + ' %'];
    var head = '<tr><th rowspan="2" style="text-align:left">' + M.esc(A.tpl(b.label || '')) + '</th>' +
      gruppi.map(g => '<th colspan="4" class="grp">' + M.esc(g.l) + '</th>').join('') + '</tr><tr>' +
      gruppi.map(() => cn.map((c, ci) => '<th' + (ci === 1 ? ' class="bdg"' : '') + '>' + M.esc(c) + '</th>').join('')).join('') + '</tr>';
    var celle = function (ms, bud, inv, a, chiave, quota, quotaB) {
      var act = A.mv(ms, a) * (quota === undefined ? 1 : quota), bv = bud ? A.mv(bud, a) * (quotaB === undefined ? 1 : quotaB) : null;
      var out = '<td class="tnum">' + A.mfmt(ms, act) + '</td><td class="tnum bdg">' + (bv === null ? '' : A.mfmt(ms, bv)) + '</td>';
      if (bv === null) return out + '<td></td><td></td>';
      var sc = A.scost(ms, act, bv, inv), d = act - bv;
      var abs = A.punti(ms) ? sc.t : (d > 0 ? '+' : d < 0 ? '−' : '') + A.mfmt(ms, Math.abs(d));
      var pc = A.punti(ms) ? '' : sc.t;
      return out + '<td class="tnum ' + sc.cls + '">' + abs + '</td><td class="tnum ' + sc.cls + '">' + pc + '</td>';
    };
    var body = '';
    lines.forEach(function (ln, li) {
      var k = idv + ':' + li, aperta = S.exp && S.exp[k], acc = ln.accounts || [];
      var cls = ln.kind === 'sub' ? 'sub' : ln.kind === 'total' ? 'tot' : ln.kind === 'pct' ? 'pct' : '';
      body += '<tr class="pl ' + cls + '"' + (acc.length ? ' data-exp="' + M.esc(k) + '" style="cursor:pointer"' : '') + '><td>' +
        (acc.length ? '<span class="tg">' + (aperta ? '▾' : '▸') + '</span> ' : '') + M.esc(ln.label) + '</td>' +
        gruppi.map(g => celle(ln.measure, ln.budget, ln.inv, g.a)).join('') + '</tr>';
      if (aperta && acc.length) {
        var tw = acc.reduce((s, x) => s + (x.w || 1), 0);
        gruppi.forEach(function (g, gi) {
          var raw = acc.map(x => (x.w || 1) / tw * scarto(x.label + '|' + S.y + '|' + (gi ? 'ytd' : A.periodLabel()) + '|' + JSON.stringify(S.f)));
          var rs = raw.reduce((s, x) => s + x, 0);
          g.q = raw.map(x => x / rs);
        });
        acc.forEach(function (x, xi) {
          body += '<tr class="pl acc"><td>' + M.esc(x.label) + '</td>' +
            gruppi.map(g => celle(ln.measure, ln.budget, ln.inv, g.a, null, g.q[xi], (x.w || 1) / tw)).join('') + '</tr>';
        });
      }
    });
    return A.card(v, '<div class="mx st" style="flex:1"><table><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>', { flex: true });
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
      : A.membri(by).map(m => ({ id: m.id, l: m.n, pin: { [by]: m.id } }));
    var cats = A.membri(dim);
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
        /* il filtro sulla dimensione dei GRUPPI attenua gli altri gruppi, come quello sulle categorie
           attenua le altre categorie: prima il mix per segmento restava fermo col filtro "SMB" (Bodan) */
        var dimd = (A.hl(dim) && A.hl(dim) !== c.id) || (by !== 'q' && A.hl(by) && A.hl(by) !== grp.id);
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
  /* PIU GAUGE IN UNA CARD. Un gauge dice un numero contro un bersaglio: da solo in una card larga
     meta pagina occupa lo spazio di un grafico per dare l'informazione di una KPI (Fra, 29 set
     2026, su due mockup di fila). Con `misure` la card affianca due o tre gauge — OTIF, puntualita,
     fill rate, ognuno col suo bersaglio — e lo spazio torna a valere quello che mostra. */
  M.V.gauge = function (A, v, w, h) {
    var b = v.bind || {};
    h = v.h || h || 180;
    if (!b.misure || !b.misure.length) return A.card(v, disegna(A, v, b, w, h));
    var n = b.misure.length, gap = 10, wi = Math.floor((w - gap * (n - 1)) / n);
    /* i pannelli si centrano nell'altezza della card: l'arco di un pannello stretto e piccolo, e
       ancorato al fondo lasciava un vuoto grande quanto la card sopra di se */
    return A.card(v, '<div style="display:flex;gap:' + gap + 'px;align-items:center;flex:1">' + b.misure.map(function (g) {
      return '<div style="flex:1 1 0;min-width:0">' + disegna(A, v, g, wi, h - 22, true) + '</div>';
    }).join('') + '</div>');
  };
  function disegna(A, v, b, w, h, piccolo) {
    var tocca = false;   /* l'etichetta del bersaglio toccherebbe il valore */
    var ms = b.measure, tg = b.target;
    /* un pannello stretto prende solo l'altezza che il suo arco usa (raggio dalla larghezza) */
    if (piccolo) h = Math.min(h, Math.round((w / 2 - 6) + 15 + 34 + 6));
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
    /* IN LINEA E' IN LINEA. Uno scarto che il formato non riesce a scrivere non e "sotto": il
       gauge di Parsa diceva "100.0%, 0.0 pp below Target" con l'arco rosso (27 set 2026). E su
       una misura dove meno e meglio (inv: il costo del personale sul fatturato) stare sotto il
       bersaglio e il risultato buono: il colore lo leggeva al contrario — il gauge Prime cost,
       rosso sul numero giusto, difetto aperto dalla storia del gauge. */
    var inv = !!(A.meas(ms).inv || v.inv);
    var inLinea = target > 0 && (pct ? Math.abs(val - target) < 5e-4 : Math.abs(val - target) < Math.abs(target) * 0.002);
    var male = target > 0 && !inLinea && (inv ? val > target : val < target);
    var colore = target > 0 ? (male ? 'var(--bad)' : 'var(--good)') : 'var(--c2)';

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
      /* nel pannello stretto la scritta del bersaglio copriva il valore: resta la tacca, e il
         bersaglio va nella nota sotto l'arco */
      /* SE L'ETICHETTA DEL BERSAGLIO TOCCA IL VALORE, resta la tacca e il bersaglio va nella nota:
         con un valore vicino al target (100% contro 100%) "Target 100.0%" copriva "100.0%" (Parsa,
         visto dal gate in Chrome esteso a tutti i grafici, 6 ott 2026) */
      var fsV = Math.round(r * .38), wV = M.larghN(A.mfmt(ms, val), fsV);
      var lx0 = anc === 'end' ? lblX - wLbl : anc === 'start' ? lblX : lblX - wLbl / 2, ly = Math.max(10, lblY);
      if (lx0 < cx + wV / 2 + 2 && lx0 + wLbl > cx - wV / 2 - 2 && ly - 10 < cy - 6 && ly + 2 > cy - 6 - fsV) tocca = true;
      if (!piccolo && !tocca) s += M.testoVelato(A.tpl(b.targetLabel || 'target') + ' ' + A.mfmt(ms, target),
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
      nota = '<div class="gnote">' + (piccolo ? '' : M.esc(A.meas(ms).label || ms) + ' ' + A.mfmt(ms, val) + ', ') +
        (inLinea ? (A.T.inLinea || 'in linea con') : testo + ' ' + (scarto >= 0 ? (A.T.sopra || 'sopra') : (A.T.sotto || 'sotto'))) + ' ' +
        M.esc(A.tpl(b.targetLabel || 'target')) + (piccolo || tocca ? ' ' + A.mfmt(ms, target) : '') + '</div>';
    }
    /* nel gauge multiplo ogni pannello porta il nome della sua misura sopra l'arco */
    var nome = piccolo ? '<div class="gnote" style="font-weight:600;color:var(--ink2)">' + M.esc(b.label || A.meas(ms).label || ms) + '</div>' : '';
    return nome + s + nota;
  }
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
    var righe = A.membri(dim);
    /* le colonne: una seconda dimensione, i mesi o i trimestri */
    var cols = b.by === 'm' ? A.MON.map(function (l, i) { return { id: 'm' + i, n: l, months: [i] }; })
      : b.by === 'q' ? [0, 1, 2, 3].map(function (q) { return { id: 'q' + q, n: 'Q' + (q + 1), months: A.QMON(q) }; })
        : A.membri(b.by).map(function (m) { return { id: m.id, n: m.n, pin: m.id }; });

    /* il valore di una cella: sempre attraverso l'aggregatore, mai r[ms] */
    var val = function (r, c) {
      var o = { pin: {} };
      o.pin[dim] = r.id;
      if (c.pin !== undefined) o.pin[b.by] = c.pin;
      if (c.months) { o.months = c.months; o.timeline = true; }
      /* UNA CELLA SENZA BASE E VUOTA, non zero. Un magazzino che non serve una regione non ha un
         OTIF dello 0%: la mappa di Muttahar coloriva di "0.0%" le corsie che non esistono, e il
         gradino piu freddo diceva "pessimo" dove la verita e "niente" (2 ott 2026). */
      var a = A.agg(A.slice(o));
      return A.definita(ms, a) ? A.mv(ms, a) : null;
    };

    var celle = [], min = Infinity, max = -Infinity;
    righe.forEach(function (r) {
      var fila = cols.map(function (c) { var x = val(r, c); if (x === null) return null; if (x < min) min = x; if (x > max) max = x; return x; });
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
    var soglie, soglieCol = null;
    /* PER COLONNA: i gradini si calcolano dentro ogni colonna. Quando una colonna vale dieci volte
       le altre (le vendite fuori promozione accanto alle campagne) i quintili di tutta la mappa la
       colorano scura e lasciano tutte le altre sullo stesso gradino chiaro: la domanda "quale sede
       risponde meglio a questa campagna" non si legge piu (Fra, 28 set 2026). */
    if (b.per === 'colonna') {
      soglieCol = cols.map(function (_c, ci) {
        var col = celle.map(function (f) { return f[ci]; }).filter(function (x) { return x !== null; }).sort(function (p, q) { return p - q; });
        return col.length ? [1, 2, 3, 4].map(function (k) { return col[Math.floor(col.length * k / 5)]; }) : [0, 0.25, 0.5, 0.75];
      });
    }
    if (b.scale) {
      var sp0 = (b.scale[1] - b.scale[0]) || 1;
      soglie = [1, 2, 3, 4].map(function (k) { return b.scale[0] + sp0 * k / 5; });
    } else {
      var ord = [];
      for (var _q = 0; _q < celle.length; _q++) ord = ord.concat(celle[_q].filter(function (x) { return x !== null; }));
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

    /* L'intestazione di colonna si accorcia solo se non ci sta, e lo dice coi puntini. Era
       tagliata a sei lettere comunque — pensata per "Gen" e "Lun" — e su tre colonne larghe
       centottanta pixel "Vocabulary & idioms" diventava "Vocabu". */
    cols.forEach(function (c, ci) {
      var et = String(c.n), spazio = cw - 4;
      if (M.largh(et, 8.5) > spazio) {
        while (et.length > 3 && M.largh(et + '…', 8.5) > spazio) et = et.slice(0, -1);
        et = et.replace(/[\s&·,;:-]+$/, '') + '…';
      }
      s += '<text x="' + (lw + cw * ci + cw / 2).toFixed(1) + '" y="10" text-anchor="middle" ' +
        'font-size="8.5" fill="var(--muted)">' + M.esc(et) + '</text>';
    });

    righe.forEach(function (r, ri) {
      var y = m.t + ch * ri;
      /* un nome piu largo della colonna si accorcia coi puntini: usciva a sinistra del riquadro
         ("JPY · HKD · SGD" tagliato, Luca v4) */
      var nmH = r.n;
      if (M.largh(nmH, 9) > lw - 8) { while (nmH.length > 3 && M.largh(nmH + '…', 9) > lw - 8) nmH = nmH.slice(0, -1); nmH = nmH.replace(/[\s·,-]+$/, '') + '…'; }
      s += '<text x="' + (lw - 6) + '" y="' + (y + ch / 2 + 3).toFixed(1) + '" text-anchor="end" ' +
        'font-size="9" fill="var(--ink2)"><title>' + M.esc(r.n) + '</title>' + M.esc(nmH) + '</text>';
      celle[ri].forEach(function (x, ci) {
        if (x === null) {
          s += '<rect class="vuota" x="' + (lw + cw * ci + gap / 2).toFixed(1) + '" y="' + (y + gap / 2).toFixed(1) +
            '" width="' + Math.max(1, cw - gap).toFixed(1) + '" height="' + Math.max(1, ch - gap).toFixed(1) +
            '" rx="1" fill="var(--card)" stroke="var(--line2)"/>' +
            (ch >= 17 ? '<text x="' + (lw + cw * ci + cw / 2).toFixed(1) + '" y="' + (y + ch / 2 + 3).toFixed(1) +
              '" text-anchor="middle" font-size="8.5" fill="var(--muted3)" style="pointer-events:none">—</text>' : '');
          return;
        }
        /* Il gradino della cella, dal piu freddo al piu caldo. Sono velature della rampa
           sequenziale (Viridis o Cividis), quindi la scala sale in luminanza in modo monotono e
           resta leggibile anche in stampa e sotto le tre dicromazie. */
        var liv = 0, sg = soglieCol ? soglieCol[ci] : soglie;
        while (liv < sg.length && x >= sg[liv]) liv++;
        var col = ['var(--heat1)', 'var(--heat2)', 'var(--heat3)', 'var(--heat4)', 'var(--heat5)'][liv];
        /* un filtro sulla dimensione delle COLONNE segna la sua colonna come quello sulle righe
           segna la sua riga: prima la heatmap restava identica davanti al filtro "Corporate" */
        var dimd = (A.hl(dim) && A.hl(dim) !== r.id) ||
          (cols[ci].pin !== undefined && A.hl(b.by) && A.hl(b.by) !== cols[ci].pin);
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
            (A.statoT(ms, x) ? 'var(--' + A.statoT(ms, x).slice(1) + ')' : (liv >= 3 ? 'var(--heatInk)' : 'var(--ink2)')) + '"' +
            (A.statoT(ms, x) ? ' font-weight="700"' : '') + ' style="pointer-events:none">' +
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
    /*#finestra*/
    /* IL RIBBON SEGUE LA FINESTRA. Il commento che l'ha chiesto diceva esattamente questo: "il
       ribbon chart deve adeguarsi di conseguenza e diventare piu lungo o piu corto".
       Il grano si sceglie da solo, come lo sceglierebbe una persona: dentro un anno i mesi (o i
       trimestri); su due o tre anni i TRIMESTRI di ciascun anno, che sono otto o dodici colonne
       — abbastanza per vedere i sorpassi, poche per non impastarle; da quattro anni in su un
       anno per colonna. Il ribbon esiste per far vedere chi supera chi: con quaranta colonne
       non lo si vedrebbe piu. */
    if (A.ampiezza() > 1) {
      var anniR = A.anniSel().filter(function (y) { return (A.DATA.years || []).indexOf(y) >= 0; });
      if (anniR.length > 3 || A.grossa()) {
        periods = anniR.map(function (y) { return { l: String(y), y: y, months: null }; });
      } else {
        periods = [];
        anniR.forEach(function (y) {
          [0, 1, 2, 3].forEach(function (q) {
            periods.push({ l: 'Q' + (q + 1) + ' ' + String(y).slice(2), y: y, months: A.QMON(q) });
          });
        });
      }
    }
    /*#/finestra*/
    var cats = A.dims[dim];
    /* Il periodo porta con se il suo anno quando la finestra e larga; quando la colonna e un
       anno intero, la selezione di trimestre o mese resta valida e si applica dentro l'anno. */
    var val = function (cid, pi) {
      var pd = periods[pi], o = { pin: { [dim]: cid } };
      if (pd.y !== undefined) o.y = pd.y;
      o.months = pd.months || (A.S.mo !== null ? [A.S.mo] : A.QMON(A.S.q));
      return A.mv(ms, A.agg(A.slice(o)));
    };
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
      var dimd = A.S.f[dim] && A.S.f[dim] !== c.id;   /* una classifica evidenzia sempre: filtrata a un membro, quello sarebbe sempre primo */
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
    /* a destra c'e la percentuale di passaggio: le barre si fermano prima, o con passaggi vicini
       al 100% (93%, 96% nel funnel dell'OTIF di Muttahar, 29 set 2026) la scritta finiva sulla barra */
    var m = { t: 10, r: M.PAD + (stages.length > 1 ? M.largh('100%', 8.5) + 10 : 0), b: 10, l: M.PAD }, ih = h - m.t - m.b, rh = ih / (stages.length || 1);
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
    var start, end, steps, bars;
    if (b.steps) {
      /* IL PONTE DA UNO STOCK AL SUO STOCK, per tipo di flusso (Bodan, 3 ott 2026: "a monthly
         bridge from opening to closing cash"): la chiusura e lo stock a fine periodo, ogni passo
         e un flusso col suo segno, l'apertura e la chiusura meno i flussi — che, con uno stock
         cumulativo nei dati, e esattamente lo stock alla fine del periodo prima. */
      ms = b.stock;
      var a0 = A.agg(A.slice({}));
      end = A.mv(b.stock, a0);
      steps = b.steps.map(st => ({ l: st.label || A.meas(st.measure).label, d: (st.sign === -1 ? -1 : 1) * A.mv(st.measure, a0) }));
      start = end - steps.reduce((x, st) => x + st.d, 0);
      bars = [{ l: A.tpl(b.startLabel || (A.T.opening || 'Apertura')), abs: start, kind: 't' }]
        .concat(steps.map(s2 => ({ l: s2.l, d: s2.d, kind: 's' })))
        .concat([{ l: A.tpl(b.endLabel || (A.T.closing || 'Chiusura')), abs: end, kind: 't' }]);
    } else {
      var rows = A.byDim(dim, {});
      start = rows.reduce((a, r) => a + A.mv(ms, r.b), 0); end = rows.reduce((a, r) => a + A.mv(ms, r.a), 0);
      steps = rows.map(r => ({ l: r.m.n, d: A.mv(ms, r.a) - A.mv(ms, r.b), id: r.m.id })).sort((x, y) => Math.abs(y.d) - Math.abs(x.d));
      bars = [{ l: A.tpl(b.startLabel || '{py}'), abs: start, kind: 't' }]
        .concat(steps.map(s2 => ({ l: s2.l, d: s2.d, kind: 's', id: s2.id })))
        .concat([{ l: A.tpl(b.endLabel || '{y}'), abs: end, kind: 't' }]);
    }
    var mgn = { t: 16, r: M.PAD, b: 24, l: 46 };
    var lo = 0, hi = Math.max(start, end), run = start;
    steps.forEach(function (s2) { run += s2.d; hi = Math.max(hi, run); lo = Math.min(lo, run); });
    var tk = M.ticks(hi * 1.1 || 1), top = tk[tk.length - 1] || 1, base = 0;
    /* PASSI PICCOLI SU TOTALI GRANDI: l'asse non parte da zero. Un ponte di cassa da 14,5M a 15,2M
       con passi da 0,2M disegnava due colonne alte e tre strisce di un pixel, e i passi non si
       confrontavano (Bodan, 3 ott 2026; la regola delle barre confrontabili di Fra). Quando
       l'escursione e meno di un terzo del massimo, l'asse va dal minimo al massimo del percorso,
       e le tacche dicono da dove parte. */
    var minRun = Math.min(start, end), runX = start;
    steps.forEach(function (s2) { runX += s2.d; minRun = Math.min(minRun, runX); });
    if (lo >= 0 && hi - minRun < hi / 3) { var aw = M.asseStretto(minRun, hi); base = aw.lo; top = aw.hi; tk = aw.tk; }
    /* il margine dell'asse vale quanto la tacca piu larga: in migliaia con un decimale una tacca e
       "€8,000.0K" e in 46px usciva tagliata */
    mgn.l = Math.max(46, Math.ceil(Math.max.apply(null, tk.map(t => M.larghN(A.mfmt(ms, t), 8.5)))) + 12);
    var iw = w - mgn.l - mgn.r, ih = h - mgn.t - mgn.b;
    var Y = val => mgn.t + ih - ((val - base) / ((top - base) || 1)) * ih, cw = iw / bars.length, bw = cw * .62;
    var s = '<svg width="' + w + '" height="' + h + '">';
    tk.forEach(t => s += '<line x1="' + mgn.l + '" y1="' + Y(t).toFixed(1) + '" x2="' + (mgn.l + iw) + '" y2="' + Y(t).toFixed(1) + '" stroke="' + (t ? 'var(--line2)' : 'var(--line)') + '"/>' +
      '<text x="' + (mgn.l - 7) + '" y="' + (Y(t) + 3.5).toFixed(1) + '" text-anchor="end" font-size="8.5" fill="var(--muted2)" class="tnum">' + A.mfmt(ms, t) + '</text>');
    var cum = 0;
    bars.forEach(function (bar, i) {
      var x = mgn.l + cw * i + (cw - bw) / 2, y0, y1, fill, tipv;
      if (bar.kind === 't') { y0 = Y(bar.abs); y1 = Y(base); fill = 'var(--c1)'; cum = bar.abs; tipv = A.mfmt(ms, bar.abs); }
      else {
        var from = cum, to = cum + bar.d; cum = to;
        y0 = Y(Math.max(from, to)); y1 = Y(Math.min(from, to));
        /* un gradino piccolo resta visibile (4px): il valore scritto sopra dice quanto vale davvero */
        if (y1 - y0 < 4) { var mz = (y0 + y1) / 2; y0 = mz - 2; y1 = mz + 2; }
        fill = bar.d >= 0 ? 'var(--good)' : 'var(--bad)';
        tipv = (bar.d >= 0 ? '+' : '−') + A.mfmt(ms, Math.abs(bar.d));
      }
      /* il membro filtrato resta pieno, gli altri si attenuano — come in ogni altro visual per
         dimensione: prima il bridge restava identico davanti al filtro sul suo segmento */
      var dimd = bar.id && A.hl(dim) && A.hl(dim) !== bar.id;
      s += '<rect class="hit' + (bar.kind === 's' ? ' wfs' : '') + (dimd ? ' dimd' : '') + '" ' + (bar.id ? 'data-f="' + dim + ':' + bar.id + '"' : '') + ' x="' + x.toFixed(1) + '" y="' + y0.toFixed(1) + '" width="' + bw.toFixed(1) +
        '" height="' + Math.max(1, y1 - y0).toFixed(1) + '" fill="' + fill + '" data-tip="<b>' + M.esc(bar.l) + '</b><br>' + tipv + '"/>';
      s += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (h - 7) + '" text-anchor="middle" font-size="8" fill="var(--muted)">' + M.esc(bar.l.length > 14 ? bar.l.slice(0, 13) + '…' : bar.l) + '</text>';
      /* il valore sopra la barra, se ci sta nella colonna: un ponte senza cifre si legge solo
         passando col mouse su ogni gradino */
      if (M.larghN(tipv, 8) <= cw - 2) s += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (y0 - 4).toFixed(1) + '" text-anchor="middle" font-size="8" class="tnum" fill="var(--ink2)">' + tipv + '</text>';
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
    /* il margine vale quanto la tacca piu larga: "CHF 30.0M" in 46px usciva tagliato (Luca, v4) */
    mgn.l = Math.max(46, Math.ceil(Math.max.apply(null, tkY.map(t => M.larghN(A.mfmt(b.y, t), 8.5)))) + 12);
    iw = w - mgn.l - mgn.r;
    var X = val => mgn.l + (val / xmax) * iw, Y = val => mgn.t + ih - (val / top) * ih;
    var mx = med(pts.map(p => p.x)), my = med(pts.map(p => p.y));
    var smax = Math.max.apply(null, pts.map(p => p.s)) || 1;
    var s = '<svg width="' + w + '" height="' + h + '">';
    tkY.forEach(t => s += '<line x1="' + mgn.l + '" y1="' + Y(t).toFixed(1) + '" x2="' + (mgn.l + iw) + '" y2="' + Y(t).toFixed(1) + '" stroke="var(--line2)"/>' +
      '<text x="' + (mgn.l - 7) + '" y="' + (Y(t) + 3.5).toFixed(1) + '" text-anchor="end" font-size="8.5" fill="var(--muted2)" class="tnum">' + A.mfmt(b.y, t) + '</text>');
    s += '<line x1="' + X(mx).toFixed(1) + '" y1="' + mgn.t + '" x2="' + X(mx).toFixed(1) + '" y2="' + (mgn.t + ih) + '" stroke="var(--muted2)" stroke-dasharray="3 3"/>';
    s += '<line x1="' + mgn.l + '" y1="' + Y(my).toFixed(1) + '" x2="' + (mgn.l + iw) + '" y2="' + Y(my).toFixed(1) + '" stroke="var(--muted2)" stroke-dasharray="3 3"/>';
    pts.forEach(function (p) {
      var r = b.size ? 4 + 7 * Math.sqrt(p.s / smax) : 6, dimd = A.hl(dim) && A.hl(dim) !== p.id;
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
      if (kind === 'var') { var va = A.varia(arg, A.mv(arg, cur), A.mv(arg, prev)); return '<span class="' + (va.d >= 0 ? 'up' : 'dn') + '">' + va.t + '</span>'; }
      if (kind === 'bps') return f.bps(A.mv(arg, cur) - A.mv(arg, prev));
      if (kind === 'basis') return A.basis();
      if (kind === 'top' || kind === 'drag') {
        rows = A.byDim(b.dim, {}).map(r => { var va = A.varia(b.primary, A.mv(b.primary, r.a), A.mv(b.primary, r.b)); return { n: r.m.n, d: va.d, t: va.t }; })
          .sort((x, y) => y.d - x.d);
        if (!rows.length) return '—';
        best = rows[0]; worst = rows[rows.length - 1];
        var pick = kind === 'top' ? best : worst;
        return arg === 'var' ? '<span class="' + (pick.d >= 0 ? 'up' : 'dn') + '">' + pick.t + '</span>' : M.esc(pick.n);
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
