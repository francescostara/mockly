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
  const re = /\/\*#region ([a-z:0-9-]+)\*\/\r?\n([\s\S]*?)\r?\n\/\*#endregion\*\//g;
  let m;
  while ((m = re.exec(src))) out[m[1]] = m[2];
  return out;
}
/* LA FINESTRA LARGA VIAGGIA SOLO DOVE SERVE. Sotto i tre anni di storia non ha niente da fare:
   con dodici mesi non c'e niente da allargare, e con ventiquattro il confronto con l'anno prima
   il trend lo fa gia da solo — allargare a due anni mostrerebbe le stesse due curve chiedendo
   un clic in piu. Dai tre anni in su la domanda diventa vera ("quest'anno va come gli altri?",
   "guardo tre anni dei dieci che ho") e il codice sale a bordo. E' lo stesso criterio con cui
   un grafico non usato non entra nel bundle, applicato a una funzione invece che a un visual. */
const FINESTRA = /\/\*#finestra\*\/[\s\S]*?\/\*#\/finestra\*\//g;
/* Il complementare: cio che vive SOLO nei report a storia corta — le versioni costanti delle
   funzioni della finestra, che stanno in tre righe invece che in trenta. Nel sorgente ci sono
   entrambe le versioni, e vince l'ultima: la completa. Nel file spedito ne viaggia una sola. */
const BREVE = /\/\*#breve\*\/[\s\S]*?\/\*#\/breve\*\//g;
function bundle(types, opts) {
  const R = regions(fs.readFileSync(RUNTIME_PATH, 'utf8'));
  const parts = [R.core];
  types.forEach(t => {
    const k = 'chart:' + t;
    if (!R[k]) throw new Error(`render: unknown visual type "${t}"`);
    parts.push(R[k]);
  });
  let src = parts.join('\n');
  src = (opts && opts.finestra === false) ? src.replace(FINESTRA, '') : src.replace(BREVE, '');
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

/* ---------- la pelle: cinque assi, non tre bundle ---------- */
/* Le tre estetiche storiche restano come PRESET (engine/skin.js), e una spec che dichiara solo
   `aesthetic` renderizza come sempre. Chi vuole di piu sovrascrive un asse alla volta con
   `spec.skin`: shell, palette, tipografia, densita. */
const SKIN = require('./skin.js');
const SCHEDA = require('./scheda.js');
const VISTE = require('./viste.js');
const { tassiPiatti } = require('./tassi.js');

/** La pelle risolta di una spec: shell + token + caratteri + ritmo. */
const pelle = spec => SKIN.pelleDi(spec);

/* Vista di compatibilita per chi importava AESTHETICS (test e strumenti): i preset, espansi. */
const AESTHETICS = {};
Object.keys(SKIN.PRESET).forEach(k => {
  const s = SKIN.PRESET[k];
  AESTHETICS[k] = { shell: s.shell, palette: s.palette, tokens: SKIN.palette(s.palette) };
});

/* ---------- fit-to-canvas ----------
 * Il canvas e 1280x720 e #page ha overflow:hidden: se le altezze dichiarate nella spec
 * superano lo spazio disponibile, la riga in fondo viene tagliata in silenzio — il grafico
 * c'e ma non si vede. Non e una cosa da lasciare al giudizio di chi scrive la spec: il
 * layout e responsabilita del motore, quindi le altezze vengono riscalate per stare dentro.
 */
const H_HDR = 58, H_TOPBAR = 46, H_TOOLS = 40;
const hasTopbar = spec => pelle(spec).shell.topbar && spec.pages.filter(p => p.nav).length >= 2;
/* Quanto mangia la cornice in verticale: l'intestazione sempre, la riga filtri se la shell ce
   l'ha, la barra del marchio solo quando ci sono davvero piu pagine da navigare. */
const shellPx = spec => H_HDR + (pelle(spec).shell.tools ? H_TOOLS : 0) + (hasTopbar(spec) ? H_TOPBAR : 0);
const PAGE_PAD_DEF = 28;    /* padding verticale di #page, valore di riferimento */
/* Il padding verticale vero lo decide la densita: e uno dei tre assi del ritmo, e il fit deve
   conoscerlo o calcola il budget di una pagina che non e quella che disegna. */
const padDi = spec => pelle(spec).densita.pad * 2;
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
function flexNeed(row, data, rowH, drillDim) {
  return Math.max(MIN_FLEX_H, ...row.visuals.map(v => {
    if (v.type !== 'matrix') return MIN_FLEX_H;
    const dim = (v.bind || {}).dim;
    let members = ((data && data.dims && data.dims[dim]) || []).length || 5;
    /* Nella pagina di drill su un genitore, la matrice dei suoi figli mostra solo QUEI figli:
       gli agenti di un'area, non tutti. Contarli tutti sovrastimava lo spazio della tabella, e la
       pagina di drill di immobiliare stava nel canvas per caso — bastava la riga della legenda
       per farla sforare di sedici pixel. */
    const dm = data && data.detailModel;
    if (drillDim && dm && dm.dim === dim && dm.parentDim === drillDim) {
      const perGenitore = {};
      (data.dims[dim] || []).forEach(m => { perGenitore[m.parent] = (perGenitore[m.parent] || 0) + 1; });
      members = Math.max(1, ...Object.values(perGenitore));
    }
    const totals = (v.bind || {}).totals === false ? 0 : 1;
    return chromeOf(v) + TABLE_HEAD_H + (members + totals) * (rowH || TABLE_ROW_H) + 12;
  }));
}

/* I grafici nel tempo portano SEMPRE la loro legenda, e la disegna il runtime (A.legendaAuto):
   l'anno prima e una linea tratteggiata nel trend e una seconda colonna nel colline, e una
   legenda scritta a mano doveva indovinare quale — ha sbagliato tre volte. */
const LEGENDA_AUTO = { trend: true, colline: true };
const chromeOf = v => (v.title ? CHROME_H : 0) + (LEGENDA_AUTO[v.type] ? LEGEND_H : 0);

/** Altezza utile della pagina, al netto di shell, padding e gutter. */
function pageBudget(spec, page, gutter) {
  const shell = shellPx(spec);
  const rows = (page.rows || []).length + (page.kpiBand !== false && spec.kpiBand && spec.kpiBand.length ? 1 : 0)
    + (page.drillHeader ? 1 : 0);
  return 720 - shell - padDi(spec) - (gutter || spec.grid.gutter) * Math.max(0, rows - 1);
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
  let budget = pageBudget(spec, page, gutter) + (dense ? (padDi(spec) - DENSE_PAD) : 0);
  if (page.kpiBand !== false && spec.kpiBand && spec.kpiBand.length) budget -= dense ? KPI_H - 6 : KPI_H;
  if (page.drillHeader) budget -= 46;

  const fixed = rows.filter(r => !r.flex);
  const flex = rows.filter(r => r.flex);
  const drillDim = spec.drill && page === spec.drill.page ? spec.drill.dim : null;
  const wanted = flex.reduce((a, r) => a + flexNeed(r, data, rowH, drillDim), 0);
  const declared = fixed.reduce((a, r) => a + rowHeight(r), 0);

  if (declared <= budget - wanted) {
    /* LO SPAZIO CHE AVANZA NON RESTA BIANCO. Se i grafici dichiarati e la tabella stanno
       comodi, il resto della pagina sarebbe un rettangolo vuoto in fondo: succedeva su quattro
       mockup, e la revisione l'ha segnalato ogni volta. Il surplus va ai grafici, che con
       qualche pixel in piu mostrano davvero di piu — la tabella invece resta alta quanto le sue
       righe, perche allungarle non aggiunge niente.
       Il tetto e un quarto in piu del dichiarato: oltre, un grafico pensato per centocinquanta
       pixel diventa un'altra cosa, e la spec smetterebbe di dire quello che dice. */
    const avanza = budget - wanted - declared;
    const chromeF = fixed.reduce((a, r) => a + Math.max(...r.visuals.map(chromeOf)), 0);
    const chartsF = declared - chromeF;
    if (avanza > 8 && chartsF > 0 && fixed.length) {
      const su = Math.min(1.25, (chartsF + avanza) / chartsF);
      return { scaled: true, cresciuto: true, tight: false, over: 0,
        k: Math.round(su * 1000) / 1000, declared, room: budget - wanted };
    }
    return { scaled: false, tight: false, k: 1, declared, room: budget - wanted };
  }

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
  /* La modalita densa e una decisione del fit, non una proprieta della spec d'autore: senza
     registrarla, chi rilegge il file emesso misura la pagina con il budget sbagliato e la vede
     sforare quando invece ci sta. L'artefatto deve portarsi dietro cio che serve per rileggerlo. */
  if (plan.dense) page.__dense = true;
  return plan;
}

/** Applica il fit a ogni pagina, su una copia: la spec del chiamante non viene toccata. */
/**
 * LE CARD A PIU VISTE, appianate per tutto cio che non e il clic.
 *
 * Un contenitore con `viste` non ha un tipo suo: ne ha due o tre, uno per vista. Ma il fit deve
 * sapere quanto e alto, la validazione quale archetipo apre la pagina, il bundler quali pezzi
 * di runtime servono — e nessuno di loro puo ragionare su un visual senza tipo.
 * Qui il contenitore prende addosso la sua PRIMA vista, che e quella che il lettore vede
 * aprendo il file, e si tiene le altre per il runtime. Cosi ogni controllo a valle vede un
 * visual normale, e il bundler riceve i tipi di tutte le viste — perche una qualunque puo
 * finire a schermo con un clic.
 */
function espandiViste(spec) {
  const pagine = (spec.pages || []).concat(spec.drill && spec.drill.page ? [spec.drill.page] : []);
  pagine.forEach(pg => (pg.rows || []).forEach(row => {
    (row.visuals || []).forEach((v, i) => {
      if (!v.viste || !v.viste.length) return;
      /* `motivo` viaggia con il contenitore: la dottrina delle viste si applica anche alla
         spec appianata, che e quella che validate() guarda */
      const base = { span: v.span, h: v.h, id: v.id, viste: v.viste, motivo: v.motivo };
      row.visuals[i] = Object.assign({}, v.viste[0], base);
    });
  }));
}

function fitSpec(spec, data) {
  /* Il file emesso porta dentro la spec GIA adattata, perche il runtime ha bisogno delle
     altezze che sono state davvero disegnate. Ri-renderizzare quel file la adatterebbe una
     seconda volta, con un budget diverso e un verdetto diverso: il round-trip non sarebbe
     idempotente, e uno strumento che rilegge un mockup gia generato vedrebbe difetti che non
     esistono. Il marchio rende il secondo passaggio un'operazione nulla. */
  if (spec.__fit) return { spec, report: [] };
  const copy = JSON.parse(JSON.stringify(spec));
  const report = [];
  copy.__fit = true;
  espandiViste(copy);
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
  const dense = !!rep.dense || !!page.__dense;
  const rowH = dense ? TABLE_ROW_H_CMP : TABLE_ROW_H;
  let budget = pageBudget(fitted.spec, page, dense ? DENSE_GUTTER : spec.grid.gutter)
    + (dense ? padDi(spec) - DENSE_PAD : 0);
  if (spec.kpiBand && spec.kpiBand.length) budget -= dense ? KPI_H - 6 : KPI_H;
  const drillDim = fitted.spec.drill && page === fitted.spec.drill.page ? fitted.spec.drill.dim : null;
  const h = r => r.flex ? flexNeed(r, data, rowH, drillDim) : rowHeight(r);
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

/* ---------- l'archetipo dichiarato deve corrispondere alla composizione ----------
 * Perche esiste: ogni report apriva con banda KPI -> trend -> donut e chiudeva con la matrice
 * a piena larghezza. E' la formula per principianti di Power BI, e un consulente BI la
 * riconosce a colpo d'occhio come template. La cura non e altra prosa — il modello copia gli
 * esempi piu di quanto legga le regole — ma sono gli esempi canonici PIU un gate che impedisca
 * di dichiarare un archetipo e comporne un altro. Definizioni in layout-archetypes.md. */
const ARCHETIPI = {
  /* Lo scorecard e l'archetipo generico, quindi la sua apertura e permissiva: cio che lo
     definisce e la forma stratificata e la chiusura tabellare, non quale hero sceglie. La
     forza del gate sta negli altri, che pretendono il LORO visual in apertura — e nel divieto
     della formula da principiante, che vale ovunque tranne qui. */
  'scorecard': { apre: ['trend', 'colline', 'delta-card', 'ribbon', 'hbar', 'stack100'], chiudeMatrice: true },
  'executive-summary': { apre: ['trend', 'waterfall', 'scatter', 'delta-card', 'ribbon'], chiudeMatrice: false, max: 7 },
  'funnel': { apre: ['funnel'], chiudeMatrice: true },
  /* la heatmap MoM e una chiusura legittima quanto la matrice per l'archetipo a quadranti:
     entrambe rispondono a "e adesso chi guardo", una per entita e una per periodo */
  'quadrants': { apre: ['scatter'], chiudeMatrice: true, chiudeAnche: ['heatmap'] },
  'bridge': { apre: ['waterfall'], chiudeMatrice: false },
  'cohorts': { apre: ['heatmap'], chiudeMatrice: true },
  'operational': { apre: ['heatmap'], chiudeMatrice: true, min: 8 }
};

function gateArchetipo(spec, e) {
  const a = spec.archetype;
  if (!a) {
    e.push('spec.archetype mancante: dichiara l\'archetipo di layout (layout-archetypes.md). ' +
      'Senza dichiarazione l\'unica composizione che esce e la formula da principiante ' +
      'KPI -> trend -> donut -> tabella, che un consulente BI riconosce come template.');
    return;
  }
  if (a === 'geo') {
    e.push('archetype "geo": il motore non ha un visual mappa, quindi l\'archetipo geografico ' +
      'non e componibile. Usa "quadrants", oppure "scorecard" con la localita come dimensione ' +
      'primaria della matrice.');
    return;
  }
  const A0 = ARCHETIPI[a];
  if (!A0) { e.push(`archetype "${a}" sconosciuto (vedi layout-archetypes.md)`); return; }
  const NC = spec.grid.columns;

  /* Si verifica la pagina che porta l'archetipo: la PRIMA — e la faccia del report, quella su
     cui si giudica "e l'ennesimo template?" — piu ogni pagina che ne dichiari uno suo. Le
     pagine di approfondimento non devono forzare un archetipo che non hanno: la regola "una
     pagina per archetipo" e un'opzione, non un obbligo. */
  const daVerificare = spec.pages.filter((pg, i) => i === 0 || pg.archetype);
  daVerificare.forEach(pg => {
    const A = ARCHETIPI[pg.archetype || a] || A0;
    const rows = pg.rows || [];
    if (!rows.length) return;
    /* Una riga di sola narrativa a piena larghezza e una fascia d'intestazione, non l'apertura:
       come la banda KPI, dice il contesto e lascia il mestiere al visual che viene dopo. */
    const iApre = rows.findIndex(r => !(r.visuals.length === 1 && r.visuals[0].type === 'narrative' && r.visuals[0].span === NC));
    const prima = rows[iApre < 0 ? 0 : iApre].visuals || [];
    const ultima = rows[rows.length - 1].visuals || [];

    /* L'APERTURA. Il visual dell'archetipo deve esserci E deve essere dominante — meta griglia
       o piu. Un funnel in un riquadro da una colonna non e un'apertura, e una decorazione. */
    if (!prima.some(v => A.apre.includes(v.type) && v.span * 2 >= NC)) {
      e.push(`page "${pg.id}": archetype "${a}" apre con ${A.apre.map(x => `"${x}"`).join(' o ')} ` +
        `in posizione dominante (span >= meta della griglia). La prima riga e invece ` +
        `[${prima.map(v => `${v.type}:${v.span}`).join(', ')}]. L'apertura e cio che distingue ` +
        `un archetipo dall'altro: se e sempre la stessa, il report resta un template.`);
    }

    /* LA CHIUSURA. */
    const chiudeMatrice = ultima.some(v => v.type === 'matrix' || (A.chiudeAnche || []).includes(v.type));
    if (A.chiudeMatrice && !chiudeMatrice) {
      e.push(`page "${pg.id}": archetype "${pg.archetype || a}" chiude con la matrice, con ` +
        `totali e drill-through. L'ultima riga e [${ultima.map(v => v.type).join(', ')}].`);
    }
    if (!A.chiudeMatrice && chiudeMatrice) {
      e.push(`page "${pg.id}": archetype "${a}" NON chiude con una matrice densa: chiuderla ` +
        `cosi lo trasforma in uno scorecard, cioe nella formula che stiamo evitando. Il ` +
        `dettaglio tabellare va nella pagina di drill-through o in una seconda pagina.`);
    }

    /* LA FORMULA DA PRINCIPIANTE, vietata fuori dallo scorecard. */
    const tipi = prima.map(v => v.type);
    if ((pg.archetype || a) !== 'scorecard' && tipi.includes('trend') && tipi.includes('donut')) {
      e.push(`page "${pg.id}": la prima riga e trend + donut sotto la banda KPI. E' la formula ` +
        `da principiante (KPI -> trend -> donut -> tabella): ammessa solo in "scorecard", e ` +
        `solo quando il brief chiede davvero una panoramica generale.`);
    }

    /* LA DENSITA. Il conteggio include la banda KPI, che occupa una riga intera. */
    const conta = spec.kpiBand.length + rows.reduce((n, r) => n + r.visuals.length, 0);
    if (A.max && conta > A.max) {
      e.push(`page "${pg.id}": archetype "${a}" e a densita BASSA (al massimo ${A.max} fra card ` +
        `e visual), la pagina ne conta ${conta}. Un board legge un numero e un grafico, non ` +
        `dodici riquadri.`);
    }
    if (A.min && conta < A.min) {
      e.push(`page "${pg.id}": archetype "${a}" e a densita ALTA (almeno ${A.min} fra card e ` +
        `visual), la pagina ne conta ${conta}. Con meno, la domanda "stiamo usando bene cio che ` +
        `abbiamo" non trova risposta e l'archetipo giusto e un altro.`);
    }
  });

  /* La formula da principiante e vietata ovunque, non solo nella pagina che porta
     l'archetipo: e proprio nelle pagine secondarie che rispuntava. */
  if (a !== 'scorecard') {
    spec.pages.forEach(pg => {
      if (pg.archetype === 'scorecard') return;
      const r0 = (pg.rows || [])[0];
      if (!r0) return;
      const t = r0.visuals.map(v => v.type);
      if (t.includes('trend') && t.includes('donut')) {
        e.push(`page "${pg.id}": prima riga trend + donut sotto la banda KPI — la formula da ` +
          `principiante, ammessa solo nell'archetipo "scorecard".`);
      }
    });
  }

  /* Il dettaglio tabellare deve esistere DA QUALCHE PARTE anche quando la pagina chiude
     diversamente: e la regola storica, applicata al report invece che alla singola pagina. */
  if (!A0.chiudeMatrice) {
    const pagine = spec.pages.concat(spec.drill ? [spec.drill.page] : []);
    const trovata = pagine.some(pg => (pg.rows || []).some(r => r.visuals.some(v => v.type === 'matrix')));
    if (!trovata) {
      e.push(`archetype "${a}": in tutto il report non c'e una matrice. La pagina puo chiudere ` +
        `diversamente, ma il dettaglio deve stare da qualche parte — una seconda pagina, o la ` +
        `pagina di drill-through.`);
    }
  }
}

function validate(specIn, data) {
  /* Si valida SEMPRE la spec appianata, qualunque sia il chiamante. Prima l'appianamento lo
     faceva chi chiamava — render e lint si, lib/validate.ts (cioe l'app) no — e l'app leggeva
     una card a piu viste come un visual "undefined": "scorecard apre con trend o colline… la
     prima riga e [undefined:3, gauge:2]" su una colline messa come prima vista (Parsa, 27 set
     2026). Il gate test/viste-validazione.test.js avvolge ogni visual del corpus in una card a
     viste e pretende lo stesso verdetto. */
  const spec = JSON.parse(JSON.stringify(specIn));
  espandiViste(spec);
  const e = [], warn = [];
  /* Il bookmark ha una dottrina, e sta in engine/viste.js: i suoi rifiuti entrano qui dentro
     insieme agli altri, perche una card che nasconde meta del suo contenuto senza dire perche
     e un difetto di composizione come un gauge su una misura assoluta. */
  VISTE.valida(spec).forEach(m => e.push(m));
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

  /* UN FLUSSO DIVISO UNO STOCK E UN NUMERO SBAGLIATO DODICI VOLTE.
     Una misura `last` legge l'ultimo mese (gli abbonati di dicembre); una somma legge tutti i
     mesi del periodo (gli abbonati-mese dell'anno). Un rapporto che mette l'una sopra l'altra
     su un anno intero vale dodici volte il vero: e cosi che una "conversione a pagamento" e
     uscita al 68,9% invece del 6%, in un mockup valido, riconciliato e completamente falso.
     Il tranello piu comune e il nome: una misura `last` con lo STESSO id di un campo sommato
     (MAU, abbonati) oscura quel campo, e ogni rapporto che lo cita legge lo stock senza che
     nessuno l'abbia chiesto. Qui si rifiuta la combinazione e si dice come uscirne. */
  const stock = new Set((spec.model.measures || []).filter(m => m.agg === 'last').map(m => m.id));
  (spec.model.measures || []).forEach(m => {
    if (m.agg !== 'ratio' && m.agg !== 'diff') return;
    const [x, y] = m.agg === 'ratio' ? [m.num, m.den] : [m.a, m.b];
    if (stock.has(x) !== stock.has(y)) {
      const s = stock.has(x) ? x : y, f = stock.has(x) ? y : x;
      e.push(`measure "${m.id}" mixes a point-in-time value ("${s}", agg:"last") with a summed one ("${f}"): ` +
        `over a year the result is ~12x off. Reference the summed FIELD on both sides ` +
        `(num/den must be names in model.sums), and give the "last" measure a different id ` +
        `(e.g. "${s}Last") so it no longer shadows the field.`);
    }
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

  /* IL NOME DELL'ENTITA NEL DRILL LO SCRIVE IL MOTORE, accanto al tasto indietro, col suo
     colore. `{drill}` dentro drillHeader lo ripeteva una riga sotto: "Furniture" nel titolo,
     "■ Furniture" e poi "Furniture · 2025 · vs YoY" (Parsa, 27 set 2026). drillHeader dice il
     contesto — periodo, confronto — non chi. */
  if (spec.drill && spec.drill.page && /\{drill\}/.test(spec.drill.page.drillHeader || '')) {
    e.push(`drill.page.drillHeader "${spec.drill.page.drillHeader}" contiene {drill}: il nome dell'entita lo scrive gia il motore sopra la riga, accanto al tasto indietro. drillHeader dice il contesto (es. "{period} · vs {basis}"), non chi.`);
  }
  /* UN COLORE, UNA CATEGORIA. I colori dei membri vengono dalla scala verificata della palette,
     per indice; quando i membri sono piu dei colori, la scala ricominciava da capo e due
     categorie diverse uscivano dello stesso colore. Nel ribbon di Nitish (28 set 2026) Water
     Sports era dello stesso colore di Footwear: in un visual dove il colore e l'unico modo di
     riconoscere la categoria, e un'informazione falsa. Dove il colore identifica il membro, i
     membri a schermo non possono superare i colori distinti. */
  const coloriDistinti = (() => { try { return new Set(pelle(spec).tokens.serie || []).size; } catch (x) { return 0; } })();
  if (coloriDistinti && !(spec.meta || {}).brandColors) {
    const conPiuColori = Object.keys(SKIN.FAMIGLIE).filter(f => { try { return new Set(SKIN.palette(f).serie).size >= 6; } catch (x) { return false; } });
    spec.pages.concat(spec.drill ? [spec.drill.page] : []).forEach(pg => (pg.rows || []).forEach(row => row.visuals.forEach(v => {
      (v.viste || [v]).forEach(vv => {
        const b = vv.bind || {}, n = ((data.dims || {})[b.dim] || []).length;
        if (!n || (data.dims[b.dim] || []).some(m => m.brand)) return;
        const aSchermo = vv.type === 'ribbon' || vv.type === 'stack100' ? n
          : vv.type === 'donut' ? (b.topN && n > b.topN + 1 ? b.topN + 1 : n)
            : vv.type === 'hbar' && !b.parent && !b.detail ? Math.min(n, b.top || 8) : 0;
        if (aSchermo > coloriDistinti) {
          e.push(`page "${pg.id}" ${vv.type} su "${b.dim}": ${aSchermo} membri a schermo e la palette ha ${coloriDistinti} colori distinti — due categorie uscirebbero dello stesso colore, in un visual dove il colore e cio che le distingue. ` +
            `Scegli una palette con piu colori (${conPiuColori.join(', ')}), oppure accorpa i membri minori (${aSchermo - coloriDistinti} in meno)` +
            (vv.type === 'donut' ? ', oppure abbassa topN' : vv.type === 'hbar' ? ', oppure abbassa top' : '') + '.');
        }
      });
    })));
  }
  const pages = spec.pages.concat(spec.drill ? [spec.drill.page] : []);
  const types = new Set();
  pages.forEach(pg => {
    (pg.rows || []).forEach((row, ri) => {
      if (row.visuals.length > MAX_PER_ROW) e.push(`page "${pg.id}" row ${ri}: ${row.visuals.length} visuals (max ${MAX_PER_ROW})`);
      const sum = row.visuals.reduce((a, v) => a + v.span, 0);
      if (sum !== NC) e.push(`page "${pg.id}" row ${ri}: spans sum to ${sum}, expected ${NC} (shared grid)`);
      /* Una riga `flex` e pensata per la MATRICE, che si allunga con le sue righe: il motore
         le riserva lo spazio residuo e la matrice lo occupa. Senza matrice, la riga vale il
         pavimento (150px) mentre i visual dentro disegnano alla loro altezza di default —
         190, 200 — e il fondo pagina si sfonda. Il conto del fit torna lo stesso, perche il
         fit ha misurato il pavimento: il taglio non lo vede nessun test strutturale, si vede
         solo aprendo il file. E' successo al primo scheletro executive-summary. */
      if (row.flex && !row.visuals.some(v => v.type === 'matrix')) {
        row.visuals.filter(v => !v.h).forEach(v => {
          /* una card a piu viste non ha un `type` suo: nominarla per id, o il messaggio dice
             "undefined" — ed e successo, nella riparazione della v3 dell'app di lingue */
          const chi = v.type ? '"' + v.type + '"' : 'la card a viste "' + (v.id || '?') + '"';
          e.push(`page "${pg.id}" riga ${ri}: ${chi} sta in una riga flex senza "h". La ` +
            `riga flex riserva lo spazio residuo alla matrice; un altro visual li dentro ` +
            `disegna alla sua altezza di default e sfora il fondo pagina senza che nessun ` +
            `conto se ne accorga. Dichiara "h", oppure togli "flex" alla riga` +
            (v.type ? '.' : ' (vale anche se le sue viste sono matrici: e la card che occupa la riga).'));
        });
      }
      row.visuals.forEach(v => {
        if (!Number.isInteger(v.span)) e.push(`page "${pg.id}": non-integer span ${v.span} (off-grid width)`);
        types.add(v.type);
        /* anche i tipi delle viste alternative: una di loro finira a schermo al primo clic, e
           il suo pezzo di runtime deve essere nel file */
        (v.viste || []).forEach(vi => { if (vi.type) types.add(vi.type); });
        const b = v.bind || {};
        if (b.measure && !known.has(b.measure)) e.push(`page "${pg.id}" ${v.type}: unknown measure "${b.measure}"`);
        if (b.dim && !(data.dims || {})[b.dim]) e.push(`page "${pg.id}" ${v.type}: unknown dim "${b.dim}"`);
        if (b.per !== undefined && (v.type !== 'heatmap' || b.per !== 'colonna'))
          e.push(`page "${pg.id}" ${v.type}: per "${b.per}" non ammesso — solo sulla heatmap, e solo "colonna" (i gradini si calcolano dentro ogni colonna)`);
        if (b.order !== undefined && (v.type !== 'hbar' || ['asc', 'desc'].indexOf(b.order) < 0))
          e.push(`page "${pg.id}" ${v.type}: order "${b.order}" non ammesso — solo sull'hbar, "desc" (i migliori, default) o "asc" (i peggiori)`);
        /* advisory, not a gate: chart-selection.md wants 2-5 slices, but the canonical ships a
           6-category donut. Judgement belongs to the spec author; the engine reports it. */
        if (v.type === 'donut' && b.dim && data.dims[b.dim].length > 5 && !b.topN)
          warn.push(`page "${pg.id}": donut on "${b.dim}" has ${data.dims[b.dim].length} slices (chart-selection.md: 2-5; consider hbar/stack100)`);
        /* Oltre sei spicchi il donut smette di far vedere le proporzioni e diventa una ruota
           colorata con una legenda da leggere: e il caso in cui il visual non fa piu il suo
           mestiere, non una questione di gusto. La via d'uscita e dichiarata, non lasciata
           all'intuito: `topN` aggrega la coda in "Altri" — che e anche cio che rende visibile
           la concentrazione — oppure si passa a barre ordinate. */
        if (v.type === 'donut' && b.dim && (data.dims[b.dim] || []).length > 6 && !b.topN) {
          e.push(`page "${pg.id}" donut: "${b.dim}" ha ${data.dims[b.dim].length} membri. Sopra i ` +
            `sei spicchi le proporzioni non si leggono piu. Dichiara "topN": 3 (o 4, o 5) per ` +
            `aggregare la coda in "Altri" — che e anche il modo di far vedere la concentrazione ` +
            `— oppure usa un hbar ordinato.`);
        }
        if (v.type === 'donut' && b.alert && b.dim && !(data.dims[b.dim] || []).some(m => m.id === b.alert)) {
          e.push(`page "${pg.id}" donut: alert "${b.alert}" non e un membro di "${b.dim}".`);
        }
        /* Una composizione che spezza una dimensione PER SE STESSA non e una distribuzione:
           ogni barra ha un solo segmento, o n segmenti identici da 100/n. Nel primo giro a
           pagamento e uscito cosi un "Nuovi clienti vs clienti di ritorno per canale" con
           cinque segmenti da 20% esatti — il modello voleva una dimensione che nei dati non
           esisteva e ha ripiegato sul canale contro se stesso. */
        /* Il gauge accetta SOLO misure di tipo tasso. Con una misura assoluta il valore si
           affetta coi filtri e il bersaglio no: "fatturato contro target 2M" filtrato su una
           regione mostra la quota della regione contro il target dell'azienda, cioe un 12% che
           sembra un disastro ed e un errore di lettura. E' la stessa forma del ratio che si
           sommava e funzionava finche l'id coincideva col campo: corretto per caso.
           Affettare anche il bersaglio si potrebbe fare, ma un gauge dice "quanto sei arrivato
           rispetto a dove dovevi" — e per natura un rapporto. Vietarlo rende l'errore
           inesprimibile invece di lasciarlo passare validato. */
        /* Oltre sette entita i nastri diventano fettucce e i sorpassi spariscono nel groviglio:
           il ribbon smette di fare la cosa per cui esiste. La cura non e stringere il disegno,
           e ridurre le entita — accorpare la coda in "Altri" o passare a barre ordinate, che a
           quel punto rispondono meglio alla stessa domanda. */
        if (v.type === 'ribbon' && b.dim && (data.dims[b.dim] || []).length > 7) {
          e.push(`page "${pg.id}" ribbon: "${b.dim}" ha ${data.dims[b.dim].length} membri, oltre i ` +
            `sette leggibili. I nastri diventano fettucce e il sorpasso — l'unica ragione per cui ` +
            `si usa un ribbon — non si vede piu. Accorpa la coda in un membro "Altri", oppure usa ` +
            `un hbar ordinato se la domanda e solo "chi e primo".`);
        }

        /* La delta-card ha una sola misura e una sola cosa da dire. Con una dimensione nel
           bind si sta chiedendo un confronto fra membri: quello e un hbar o una matrice, e
           un numero grande solo non puo rappresentarlo. */
        if (v.type === 'delta-card') {
          if (b.dim) {
            e.push(`page "${pg.id}" delta-card: ha "dim": "${b.dim}", ma la delta-card mostra la ` +
              `variazione di UNA misura sul totale filtrato. Per la variazione membro per membro ` +
              `usa una matrix con una colonna kind:"var", o un hbar sulla misura di scarto.`);
          }
          if (!b.measure) e.push(`page "${pg.id}" delta-card: manca bind.measure`);
          if (v.span > 2) {
            e.push(`page "${pg.id}" delta-card: span ${v.span}. E' una card, non un grafico: oltre ` +
              `due colonne il numero grande resta grande e il resto e vuoto. Usa span 1 o 2 e metti ` +
              `accanto il visual che spiega la variazione.`);
          }
          if (v.h && v.h < 100) {
            e.push(`page "${pg.id}" delta-card: h ${v.h}. Sotto i 100px l'area in fondo si schiaccia ` +
              `a una striscia e la card perde la traiettoria, che e meta di cio che dice.`);
          }
        }

        /* La legenda non si dichiara: quella dei grafici nel tempo la costruisce il motore dalle
           serie che disegna. Scritta a mano sbagliava lo stile dell'anno prima (la linea
           tratteggiata del trend copiata in un colline, dove l'anno prima e una colonna). */
        if (v.legend !== undefined) {
          e.push(`page "${pg.id}" ${v.type}: "legend" non si dichiara. La legenda di trend e colline ` +
            `la disegna il motore dalle serie che traccia davvero (anno corrente, anno prima, e con che ` +
            `segno); una scritta a mano deve indovinare lo stile e sbaglia. Togli il campo.`);
        }
        /* anche le viste nascoste di una card: un gauge finisce a schermo al primo clic */
        (v.viste && v.viste.length ? v.viste : [v]).filter(vv => vv.type === 'gauge').forEach(vv => {
          const b = vv.bind || {};
          /* UN GAUGE NON RIEMPIE UNA CARD GRANDE DA SOLO. Dice un numero contro un bersaglio: in una
             card larga meta pagina occupa lo spazio di un grafico per l'informazione di una KPI
             (Fra, 29 set 2026, due mockup di fila). Un gauge singolo sta in una card stretta; per
             una card larga ne servono due o tre (bind.misure), ognuno col suo bersaglio. */
          const colW = (spec.grid.contentWidth - spec.grid.gutter * (NC - 1)) / NC;
          const cardW = colW * v.span + spec.grid.gutter * (v.span - 1);
          const quanti = Array.isArray(b.misure) ? b.misure.length : 1;
          const maxSpan = Math.max(1, Math.floor((300 + spec.grid.gutter) / (colW + spec.grid.gutter)));
          if (Array.isArray(b.misure) && (quanti < 2 || quanti > 3))
            e.push(`page "${pg.id}" gauge: "misure" ne affianca due o tre (qui ${quanti}). Uno solo si scrive con "measure".`);
          /* una colonna sola e sempre una card stretta, anche dove la colonna supera di poco i 300px */
          if (!Array.isArray(b.misure) && v.span > 1 && cardW > 300)
            e.push(`page "${pg.id}" gauge: un gauge da solo in una card di ${Math.round(cardW)}px occupa lo spazio di un grafico per dare un numero solo. ` +
              `Tre vie: affiancane due o tre nella stessa card con "misure": [{ "measure": …, "target": …, "targetLabel": … }, …] (ognuno un tasso col suo bersaglio); ` +
              `oppure dagli una colonna sola (span ${maxSpan}) e usa lo spazio liberato per un altro visual; ` +
              `oppure metti la sua misura come KPI card, dove un numero contro il target sta meglio.`);
          if (Array.isArray(b.misure) && (cardW / quanti > 300 || cardW / quanti < 130))
            e.push(`page "${pg.id}" gauge: ${quanti} gauge in ${Math.round(cardW)}px fanno ${Math.round(cardW / quanti)}px ciascuno — servono fra 130 e 300px per gauge: cambia lo span o il numero di misure.`);
          /* NIENTE DOPPIONI DELLA BANDA KPI. Un gauge su una misura che ha gia la sua card in alto
             ripete lo stesso numero con piu inchiostro (Fra, 29 set 2026: "se un gauge mostra gia
             qualcosa che c'e nelle card KPI, non metterlo"). Il gauge sta dove il numero non e in
             banda; se lo e, lo spazio va a un visual che aggiunge informazione. */
          const inBanda = new Set((spec.kpiBand || []).map(k => k.measure));
          const doppi = (Array.isArray(b.misure) ? b.misure : [b]).map(g => g.measure).filter(m => inBanda.has(m));
          if (doppi.length)
            e.push(`page "${pg.id}" gauge: ${doppi.map(m => '"' + m + '"').join(', ')} ${doppi.length > 1 ? 'hanno' : 'ha'} gia una card nella banda KPI: il gauge ripeterebbe lo stesso numero. ` +
              `Usa lo spazio per un visual che aggiunge informazione — DOVE si perde (funnel o waterfall dei passaggi), CHI e sotto il bersaglio (hbar per entita con order:"asc"), QUANDO (trend) — oppure togli la misura dalla banda e tieni il gauge.`);
          const daControllare = Array.isArray(b.misure) ? b.misure : [b];
          daControllare.forEach(g => {
          if (Array.isArray(b.misure) && !known.has(g.measure)) e.push(`page "${pg.id}" gauge: unknown measure "${g.measure}"`);
          const mis = (spec.model.measures || []).find(m => m.id === g.measure);
          const u = mis && mis.unit;
          if (mis && u !== 'pct' && u !== 'x') {
            e.push(`page "${pg.id}" gauge: la misura "${g.measure}" ha unit "${u}", ma il gauge ` +
              `accetta solo tassi (pct o x). Con una misura assoluta il valore si affetta coi ` +
              `filtri e il bersaglio no, quindi filtrando su un membro il gauge mostra la sua ` +
              `quota contro il target di tutti. Usa il rapporto: non "fatturato contro target" ` +
              `ma "quota raggiunta", cioe fatturato / target.`);
          }
          });
          if (b.targets) {
            e.push(`page "${pg.id}" gauge: "targets" (bersagli per membro) e dichiarato nella ` +
              `grammatica ma il motore non lo legge ancora. Toglilo, o usa un target unico.`);
          }
        });

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
    /* eur2 e per le misure di denaro che vivono SOTTO l'euro — un CPM, un costo per clic, un
       prezzo unitario: arrotondate all'intero diventano zero, che e il modo peggiore di
       sbagliare un numero perche sembra un dato e non lo e. */
    money: ['eur', 'eurF', 'eur2'],
    count: ['N', 'raw'],
    pct: ['pc', 'sgp', 'bps'],
    pp: ['pp'],
    days: ['days'],
    x: ['x'],
    months: ['months']
  };
  ((spec.model || {}).measures || []).forEach(m => {
    if (!m.unit) {
      e.push(`measure "${m.id}": manca "unit". Dichiara cosa misura — money, count, pct, pp, ` +
        `days, months o x — e il formato ne discende. Senza unita niente impedisce di scrivere una ` +
        `conta col simbolo di valuta.`);
      return;
    }
    const ammessi = UNITA_FORMATI[m.unit];
    if (!ammessi) {
      e.push(`measure "${m.id}": unit "${m.unit}" sconosciuta (money, count, pct, pp, days, months, x).`);
      return;
    }
    if (m.format && ammessi.indexOf(m.format) < 0) {
      e.push(`measure "${m.id}": unit "${m.unit}" e format "${m.format}" non vanno insieme. ` +
        `Per "${m.unit}" i formati ammessi sono ${ammessi.join(' o ')}` +
        (m.unit === 'count' ? ' — una conta non porta mai il simbolo di valuta.' : '.'));
    }
  });

  /* grid.contentWidth deve combaciare con la SHELL. Con un rail da 200px l'area utile e 1044,
     con la rail stretta 1116, senza rail 1248: scriverne un'altra rende ogni card piu larga
     dello spazio che ha, e ogni grafico esce dal proprio riquadro.
     Non e un difetto che si vede in jsdom, che non fa layout, ne nel conto delle altezze: e
     puramente dichiarativo, e finora nessun gate lo guardava. La grammatica documenta
     entrambi i numeri, quindi sceglierne uno a caso e un testa o croce. */
  {
    const sh = pelle(spec).shell;
    const atteso = sh.contentWidth;
    const dichiarato = (spec.grid || {}).contentWidth;
    if (dichiarato !== atteso) {
      e.push(`grid.contentWidth e ${dichiarato} ma la shell "${sh.id}" (${sh.nome}) lascia ` +
        `${atteso}px di area utile: 1280 meno la rail, meno il padding della pagina. Con il ` +
        `valore sbagliato la flexbox strizza le card mentre gli SVG restano larghi quanto la ` +
        `spec crede, e il disegno esce dal riquadro di ` +
        `${Math.abs(dichiarato - atteso)}px senza che nessun conto se ne accorga.`);
    }
  }

  /* Il gutter non e una preferenza piu di quanto lo sia la contentWidth: lo decide la
     DENSITA, ed e un numero che il fit usa per calcolare quanto spazio resta alle righe. Una
     spec che ne dichiara un altro fa fare al motore un conto su una pagina diversa da quella
     che disegna. */
  {
    const D = pelle(spec).densita;
    if ((spec.grid || {}).gutter !== D.gutter) {
      e.push(`grid.gutter e ${(spec.grid || {}).gutter} ma la densita "${D.id}" vuole ` +
        `${D.gutter}px. Il gutter entra nel conto delle altezze: dichiararne un altro fa ` +
        `pianificare il fit su una pagina che non e quella che viene disegnata.`);
    }
  }

  /* UNA PAGINA CHE NESSUN CLIC APRE NON ESISTE. Il caso vero: un report a due pagine su una
     shell senza barra del marchio, dove la navigazione non aveva un posto dove stare — la
     seconda pagina era scritta nella spec, renderizzata, e irraggiungibile. Il motore ora
     rifiuta invece di consegnare meta report. */
  if ((spec.pages || []).length > 1) {
    const senzaNav = spec.pages.filter(p => !p.nav);
    if (senzaNav.length) {
      e.push(`il report ha ${spec.pages.length} pagine ma ${senzaNav.length} ${senzaNav.length === 1 ? "non ha" : "non hanno"} "nav": ` +
        `${senzaNav.map(p => '"' + p.id + '"').join(', ')}. Senza etichetta di navigazione la ` +
        `pagina esiste nel file e non si puo aprire con un clic.`);
    }
  }

  /* IL CONFINE. Ogni card ha un bordo, e il bordo deve essere PERCEPIBILE: un hairline dello
     stesso colore della superficie non separa niente, e il lettore resta a indovinare dove
     finisce un grafico e comincia quello accanto. La soglia e bassa di proposito — il bordo
     non porta significato, quindi non gli si chiede il 3:1 — ma sotto 1,2:1 semplicemente non
     si vede. Il caso vero che questo gate intercetta e una palette scritta male, o un
     `spec.palette` che sovrascrive `line` col colore della card. */
  {
    const P = pelle(spec), t = Object.assign({}, P.tokens, spec.palette || {});
    const r = SKIN.contrasto(t.line, t.card);
    if (P.densita.bordo < 1) {
      e.push(`la densita "${P.densita.id}" ha un bordo di ${P.densita.bordo}px: ogni card deve ` +
        `avere un confine visibile, mai zero.`);
    }
    if (r < 1.2) {
      e.push(`il bordo delle card (--line ${t.line}) non si distingue dalla superficie ` +
        `(--card ${t.card}): ${r.toFixed(2)}:1, sotto il minimo di 1,2:1. Senza un confine ` +
        `percepibile i visual galleggiano sul fondo e il lettore non vede dove finisce uno e ` +
        `comincia l'altro.`);
    }
  }

  /* meta.currency e il SIMBOLO che finisce davanti a ogni cifra, non il codice ISO: con "EUR"
     il report scrive "EUR2,1M" invece di "€2,1M". E' il genere di dettaglio che nessun test
     strutturale vede e che chi riceve il mockup nota subito. */
  if (spec.meta && spec.meta.currency && /^[A-Z]{3}$/.test(spec.meta.currency)) {
    e.push(`meta.currency e "${spec.meta.currency}", che e il codice ISO: qui va il SIMBOLO ` +
      `(€, $, £). Con il codice ogni importo esce come "${spec.meta.currency}2,1M".`);
  }

  if (!spec.meta || !spec.meta.watermark) e.push('meta.watermark is required (synthetic-data watermark)');

  gateArchetipo(spec, e);

  const tb = toolbarBudget(spec, data);
  if (tb.overflow) e.push(toolbarErrore(spec, tb));

  /* i tassi devono differire fra i membri della dimensione che li mostra e muoversi negli anni:
     le regioni di Muttahar tutte al 90,2% (engine/tassi.js) */
  tassiPiatti(spec, data).forEach(m => e.push(m));

  if (e.length) throw new Error('spec validation failed:\n  - ' + e.join('\n  - '));
  return { types: [...types], advisories: warn };
}
const lint = (spec, data) => {
  /* Si valida la spec APPIANATA, come fa il render: un contenitore a piu viste non ha un tipo
     suo, e chi lo guarda senza espanderlo vede un visual senza tipo e si ferma. La copia serve
     a non toccare la spec dell'autore, che e sua. */
  const piatta = JSON.parse(JSON.stringify(spec));
  espandiViste(piatta);
  const a = validate(piatta, data).advisories;
  /* dove un bookmark ci starebbe: due lenti che stanno occupando due riquadri */
  VISTE.consiglia(spec).forEach(m => a.push(m));
  fitSpec(spec, data).report.forEach(r => {
    if (r.tight) a.push("pagina \"" + r.page + "\": troppe righe per il canvas — grafici al minimo leggibile e la matrice perde " + r.over + "px. Togli una riga, oppure usa una estetica con shell piu bassa.");
    else a.push("pagina \"" + r.page + "\": altezze riscalate a " + r.k + "x per stare nel canvas 720px" + (r.dense ? ", pagina densa" : "") + ".");
  });
  return a;
};

/* ---------- Gate 6: toolbar width budget (jsdom computes no layout, so budget it here) ---------- */
const W_DATE = 190, W_DROPDOWN = 168, W_CHIP = 92, W_GAP = 8;   /* W_CHIP: tetto di un chip nel CSS e nella rail, non piu stima della barra */
const RT = require('./runtime.js');
/* LA BARRA SI MISURA SUI SUOI TESTI. Il conto usava 92px per ogni chip e 96px per tutto cio
   che sta a destra: sbagliava in tutte e due le direzioni. Un chip "West" e largo 62px, uno
   "Southwest" 89; e a destra, dopo "Azzera filtri", e arrivato "Come si usa questo mockup",
   che nessuno aveva messo nel conto. Nel mockup di Nitish (28 set 2026) il motore diceva che la
   barra ci stava, e il bottone di destra usciva dal bordo di 6px. Ora ogni chip vale il suo
   nome e i bottoni di destra il loro testo, con la stessa misura (largh) che usa il runtime; il
   gate che guarda la barra vera in Chrome e test/barra.test.js. */
const chipLargo = n => Math.min(W_CHIP, RT.largh(n, 11) + 35);   /* come il CSS: 11px, padding, tetto W_CHIP */
function destraBarra(spec) {
  const it = /^it/i.test((spec.meta || {}).locale || 'it');
  const T = Object.assign({}, it ? {} : INGLESE, (spec.meta || {}).strings || {});
  const reset = T.reset || 'Azzera filtri';
  const aiuto = SCHEDA.titoloAiuto(spec);
  return Math.round(RT.largh(reset, 10) + 20 + RT.largh(aiuto, 10) + 20 + 3 * W_GAP);
}
function toolbarBudget(spec, data) {
  const sh = pelle(spec).shell;
  const onTop = sh.tools;                      /* i filtri stanno sulla riga, non nella rail */
  const available = onTop ? spec.grid.contentWidth - destraBarra(spec) : sh.rail - 32;
  let used = onTop ? W_DATE : 0;
  const items = [];
  (spec.filters.dims || []).forEach(fd => {
    const mem = data.dims[fd.id] || [], n = mem.length;
    /* sulla toolbar ogni gruppo porta anche la sua etichetta (8.5px maiuscolo) */
    const lab = onTop ? 14 + String(fd.label || '').length * 6.2 : 0;
    const w = (fd.control === 'dropdown' ? W_DROPDOWN : mem.reduce((a, m) => a + chipLargo(m.n), 0) + (n - 1) * W_GAP) + lab;
    if (onTop) used += w + W_GAP;
    else used = Math.max(used, fd.control === 'dropdown' ? W_DROPDOWN : W_CHIP);   /* rail stacks vertically */
    items.push({ id: fd.id, control: fd.control || 'list', members: n, w });
  });
  return { used: Math.round(used), available, overflow: used > available, items, axis: onTop ? 'top' : 'rail' };
}

/* UN ERRORE DI SPAZIO DICE QUANTO COSTA OGNI COSA. Il messaggio diceva solo il totale ("1254px
   > 1020px"), e il modello riparava alla cieca: nel giro di Parsa (27 set 2026) ha messo una
   dimensione a tendina, e' sceso a 1022px — due pixel oltre — e il secondo rifiuto ha mandato
   l'utente sul mockup di ripiego. Qui ogni controllo ha il suo costo, e ogni via d'uscita quanto
   libera: la riparazione diventa un conto, non un tentativo. */
function toolbarErrore(spec, tb) {
  const over = tb.used - tb.available;
  const costi = ['data ' + W_DATE + 'px'].concat(tb.items.map(it =>
    it.id + ' (' + it.control + (it.control === 'list' ? ', ' + it.members + ' voci' : '') + ') ' + Math.round(it.w) + 'px'));
  const uscite = tb.items.filter(it => it.control === 'list').map(it => {
    const fd = spec.filters.dims.find(d => d.id === it.id) || {};
    const lab = 14 + String(fd.label || '').length * 6.2;
    return { testo: '"' + it.id + '" a control:"dropdown" libera ' + Math.round(it.w - (W_DROPDOWN + lab)) + 'px', px: it.w - (W_DROPDOWN + lab) };
  }).filter(u => u.px > 0).sort((a, b) => b.px - a.px).map(u => u.testo);
  uscite.push('etichette dei filtri piu corte (6px per lettera)');
  const destra = destraBarra(spec);
  const larghe = Object.keys(SKIN.SHELLS).filter(k => SKIN.SHELLS[k].tools && SKIN.SHELLS[k].contentWidth - destra > tb.available)
    .map(k => 'shell "' + k + '" (' + (SKIN.SHELLS[k].contentWidth - destra) + 'px disponibili, grid.contentWidth ' + SKIN.SHELLS[k].contentWidth + ')');
  const inRail = Object.keys(SKIN.SHELLS).filter(k => !SKIN.SHELLS[k].tools && SKIN.SHELLS[k].rail > 0).map(k => '"' + k + '"');
  if (larghe.length) uscite.push(larghe.join(' o '));
  if (inRail.length) uscite.push('shell ' + inRail.join(' o ') + ': i filtri stanno in colonna nella rail e la riga non ha piu un limite');
  return `toolbar controls sum to ${tb.used}px > content width ${tb.available}px (QA Gate 6): sfora di ${over}px, ` +
    `e ogni riparazione deve liberarne almeno tanti. Costi: ${costi.join(' · ')}. Per rientrare: ${uscite.join('; oppure ')}.`;
}

/* ---------- CSS ---------- */
function css(spec, compact) {
  const P = pelle(spec);
  const t = Object.assign({}, P.tokens, spec.palette || {});
  const ser = (spec.palette && spec.palette.series) || null;
  if (ser) ser.slice(0, 6).forEach((c, i) => t['c' + (i + 1)] = c);
  /* La tipografia entra come token, non come stringa sparsa nel foglio: `font` e l'interfaccia,
     `fontDisp` i titoli, `fontNum` le cifre — che sono SEMPRE mono e tabellari, in ogni
     abbinamento, perche una colonna di importi con cifre proporzionali balla. */
  t.font = P.tipo.ui; t.fontDisp = P.tipo.display; t.fontNum = P.tipo.num;
  /* `serie` e `series` sono elenchi, non token: finirebbero nel CSS come "--serie:#A,#B,#C" e
     nessuno li userebbe mai. I singoli colori viaggiano gia come --c1..--c6. */
  const vars = Object.keys(t).filter(k => k !== 'series' && k !== 'serie')
    .map(k => `--${k}:${t[k]}`).join(';');
  const sh = P.shell, D = P.densita;
  const rail = sh.rail > 0;              /* c'e una colonna scura a sinistra */
  const tools = sh.tools;                /* i filtri stanno su una riga sopra la pagina */
  const gut = D.gutter;
  /* IL CONFINE C'E' SEMPRE. Un grafico che galleggia sul fondo senza separazione lascia il
     lettore a indovinare dove finisce e dove comincia quello accanto; il bordo puo essere
     tenue, mai assente. */
  const bordo = D.bordo + 'px';
  const banda = P.banda.id;
  /* Sul fondo scuro lo stesso peso appare piu leggero: e un effetto ottico noto, e la cura e
     salire di un gradino sul testo corrente. Non sui titoli, che sono gia in grassetto: li un
     gradino in piu diventa pesantezza. */
  const scuroTema = SKIN.contrasto(P.tokens.ink, '#000000') > SKIN.contrasto(P.tokens.ink, '#FFFFFF');
  return `:root{${vars}}
*{box-sizing:border-box}
html,body{margin:0;padding:0;height:100%;background:var(--page);font-family:var(--font);
  font-weight:${P.tokens.canvas && SKIN.contrasto(P.tokens.ink, P.tokens.card) > 0 && scuroTema ? 500 : 400};
  -webkit-font-smoothing:antialiased}
#stage{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;overflow:hidden}
#canvas{width:1280px;height:720px;transform-origin:center center;background:var(--canvas);display:flex;${rail ? '' : 'flex-direction:column;'}
  box-shadow:0 8px 40px rgba(12,25,45,.28);position:relative}
.tnum{font-family:var(--fontNum);font-variant-numeric:tabular-nums lining-nums;
  font-feature-settings:"tnum","lnum";letter-spacing:-.2px}
text.tnum{letter-spacing:0}
${rail ? `#rail{width:${sh.rail}px;flex:0 0 ${sh.rail}px;background:var(--rail);color:var(--railInk);display:flex;flex-direction:column;padding:16px 0}
.brand{padding:0 16px 14px;border-bottom:1px solid rgba(255,255,255,.09)}
.brand .mk{display:flex;align-items:center;gap:9px}
.brand .sq{width:22px;height:22px;background:var(--chrome);position:relative;flex:0 0 22px;border-radius:2px}
.brand .sq:before,.brand .sq:after{content:"";position:absolute;background:var(--rail)}
.brand .sq:before{left:5px;right:5px;top:9px;height:2px}.brand .sq:after{top:5px;bottom:5px;left:9px;width:2px}
.brand .nm{font-family:var(--fontDisp);font-size:${sh.rail < 160 ? '10.5' : '13'}px;font-weight:600;letter-spacing:.4px;color:#fff;
  line-height:1.25;overflow-wrap:anywhere}
.brand .sub{font-size:9px;color:var(--muted);letter-spacing:.5px;text-transform:uppercase;margin-top:4px}
.navgrp{padding:14px 10px 4px}
.navbtn{display:flex;align-items:center;gap:9px;width:100%;padding:8px 9px;border:0;background:transparent;color:var(--railInk);
  font-family:var(--font);font-size:12px;font-weight:600;text-align:left;border-radius:2px;cursor:pointer}
.navbtn.on{background:var(--chrome);color:var(--chromeInk)}
.navbtn .ic{width:14px;height:14px;flex:0 0 14px}
/* Queste due regole valgono DENTRO la rail, e vanno dette esplicitamente: sulla shell con la
   rail stretta la barra dei filtri esiste insieme alla rail, quindi entrambi i blocchi di CSS
   vengono emessi — e il padding pensato per la colonna verticale finiva addosso al selettore
   del periodo che ormai vive sulla barra, rendendolo alto 48px dentro una banda da 40 e
   disallineandolo rispetto agli altri filtri. */
#rail .slgrp{padding:14px 16px 0;position:relative}
#rail .catgrp{padding:16px 16px 0}
.railfoot{margin-top:auto;padding:0 16px;font-size:8.5px;color:var(--muted2);line-height:1.5}
#main{flex:1;display:flex;flex-direction:column;min-width:0;min-height:0}` : ``}
${sh.topbar ? `#topbar{height:46px;flex:0 0 46px;background:var(--rail);display:flex;align-items:center;gap:10px;padding:0 16px}
#topbar .nm{font-size:13px;font-weight:600;color:#fff;letter-spacing:.4px}
#topbar .spacer{flex:1}` : ``}
${!rail ? `.navbtn{border:0;background:transparent;color:${sh.topbar ? 'var(--railInk)' : 'var(--ink2)'};font-family:var(--font);font-size:11.5px;font-weight:600;
  padding:7px 11px;border-radius:var(--radius);cursor:pointer}
.navbtn.on{background:${sh.topbar ? 'rgba(255,255,255,.14)' : 'var(--line2)'};color:${sh.topbar ? '#fff' : 'var(--ink)'}}` : ``}
${tools ? `#tools{height:40px;flex:0 0 40px;background:var(--card);border-bottom:1px solid var(--line);display:flex;align-items:center;gap:8px;padding:0 16px;position:relative}
.slgrp{position:relative;width:${W_DATE}px}
.fgrp{display:flex;align-items:center;gap:7px}
.fgrp .flab{font-size:8.5px;letter-spacing:1.1px;text-transform:uppercase;color:var(--flab);white-space:nowrap}
.fgrp .fitems{position:relative}
.fgrp.dd .fitems{width:${W_DROPDOWN}px}
/* una lista sulla toolbar orizzontale: chip in riga, altrimenti impila righe da rail dentro 40px */
.fgrp.chips .fitems{display:flex;align-items:center;gap:${W_GAP}px}
.fgrp.chips .fitems>.catitem{border:1px solid var(--line);border-radius:${t.radius === "0px" ? "0" : "999px"};
  padding:4px 10px;font-size:11px;max-width:${W_CHIP}px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* niente grassetto sul chip acceso della barra: il grassetto lo allarga e sposta tutto quello che
   viene dopo — lo dice gia il fondo pieno */
.fgrp.chips .fitems>.catitem.on{background:var(--c2);border-color:var(--c2);color:#fff;font-weight:inherit}
.fgrp.chips .fitems>.catitem.on .dot{background:#fff!important}
` : ``}
${!rail ? `#main{flex:1;display:flex;flex-direction:column;min-width:0;min-height:0}` : ``}
.rlbl{font-size:8.5px;letter-spacing:1.1px;text-transform:uppercase;color:var(--flabRail);padding:0 0 7px}
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
.slsec{font-size:8px;letter-spacing:1px;text-transform:uppercase;color:${rail ? 'var(--flabRail)' : 'var(--flab)'};margin:2px 0 6px}
.slrow{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:9px}
.slchip{flex:1 0 auto;min-width:26px;padding:5px 6px;text-align:center;font-size:10.5px;border:1px solid ${rail ? 'rgba(255,255,255,.16)' : 'var(--line)'};
  background:transparent;color:${rail ? 'var(--railInk)' : 'var(--ink2)'};cursor:pointer;font-family:var(--font);border-radius:2px}
.slchip:hover{background:rgba(127,127,127,.12)}
.slchip.on{background:${rail ? '#fff' : 'var(--c2)'};color:${rail ? 'var(--rail)' : '#fff'};border-color:${rail ? '#fff' : 'var(--c2)'};font-weight:600}
.slchip.mo{flex:1 0 27%;font-size:9.5px;padding:4px 2px}
/* un anno COMPRESO nella finestra ma non l'estremo: acceso a meta, perche e selezionato ma
   non e quello che il clic sposta */
.slchip.in{background:${rail ? 'rgba(255,255,255,.22)' : 'var(--c6, rgba(127,127,127,.18))'};
  border-color:${rail ? 'rgba(255,255,255,.4)' : 'var(--c4)'};font-weight:600}
.catitem{display:flex;align-items:center;gap:8px;padding:5px 6px;font-size:11px;color:${rail ? 'var(--railInk)' : 'var(--ink2)'};cursor:pointer;border-radius:2px}
.catitem:hover{background:rgba(127,127,127,.12)}
.catitem .dot{width:8px;height:8px;flex:0 0 8px;border-radius:2px}
.catitem.on{color:${rail ? '#fff' : 'var(--ink)'};font-weight:600;background:rgba(127,127,127,.14)}
.hbrand{font-size:11px;font-weight:700;letter-spacing:1.4px;color:var(--ink);padding-right:14px;border-right:1px solid var(--line);white-space:nowrap}
#hdr{height:58px;flex:0 0 58px;background:var(--card);border-bottom:1px solid var(--line);display:flex;align-items:center;padding:0 18px;gap:14px}
#hdr .ttl{font-family:var(--fontDisp);font-size:16px;font-weight:600;color:var(--ink);letter-spacing:-.2px}
#hdr .sub{font-size:10.5px;color:var(--muted);margin-top:2px}
/* il titolo non cede spazio: le pillole del contesto crescono quando si filtra, e un blocco che si
   stringe anche di mezzo pixel mandava a capo il sottotitolo — l'intestazione cambiava forma sotto
   la mano (Fra, 28 set 2026). Larghezza propria, con un tetto fisso: la sua forma non dipende dai filtri. */
#hdr .htit{flex:0 0 auto;max-width:56%;min-width:0}
#hdr .spacer{flex:1}
.hnav{display:flex;gap:4px;margin-left:14px}
/* LA BARRA NON SI MUOVE QUANDO SI FILTRA. Con un filtro attivo compaiono le pillole del contesto
   nella stessa riga: se la riga non basta, i bottoni andavano a capo (da 26 a 40px) e i chip dei
   filtri scivolavano sotto il cursore di chi stava cliccando. Ora nessun controllo va a capo e
   nessuno si stringe, tranne il gruppo delle pillole: sono l'unica cosa che ripete un'informazione
   gia visibile (il chip acceso dice gia il filtro, il selettore dice gia il trimestre), quindi sono
   loro a cedere spazio. Cedono INTERE: quella che non ci sta va a una seconda riga nascosta, invece
   di restare mozzata a "C..." — una pillola troncata non dice niente e sembra un errore. */
.ctxwrap{display:flex;flex-wrap:wrap;gap:6px;min-width:0;max-height:26px;overflow:hidden;flex:0 1000 auto;align-items:center}
.ctxpill{font-size:10px;color:var(--ink2);background:var(--line2);border:1px solid var(--line);padding:4px 8px;border-radius:2px;white-space:nowrap;flex:0 0 auto}
.resetb{white-space:nowrap;flex:0 0 auto}
#tools>.slgrp,#tools>.fgrp,#hdr>.updated,#hdr>.hnav,#hdr>.hbrand{flex:0 0 auto}
.ctxpill b{font-weight:600;color:var(--c2)}
.resetb{font-size:10px;color:var(--muted);background:transparent;border:1px solid var(--line);padding:5px 9px;border-radius:2px;cursor:pointer;font-family:var(--font)}
.resetb:hover{color:var(--bad);border-color:var(--bad)}
.howb{border-color:var(--c2);color:var(--c2)}
.howb:hover{color:var(--c2);border-color:var(--c2);background:var(--line2)}
#howp{position:absolute;inset:0;background:rgba(10,18,32,.55);display:none;align-items:center;justify-content:center;z-index:60}
#howp.open{display:flex}
.howin{width:640px;max-height:600px;overflow:auto;background:var(--card);border:1px solid var(--line);
  border-radius:var(--radius);padding:20px 24px;box-shadow:0 18px 50px rgba(0,0,0,.3)}
.howin h3{margin:0 0 4px;font-family:var(--fontDisp);font-size:15px;color:var(--ink)}
.howin h4{margin:14px 0 4px;font-size:9.5px;letter-spacing:1.1px;text-transform:uppercase;color:var(--flab)}
.howin p{margin:0 0 5px;font-size:11.5px;line-height:1.5;color:var(--ink2)}
.howin p.in{color:var(--muted);margin-bottom:10px}
.howin b{color:var(--ink)}
.howin .resetb{margin-top:16px}
.updated{font-size:9.5px;color:var(--muted2);text-align:right;line-height:1.5}
#page{flex:1;min-height:0;padding:${D.pad}px 16px;overflow:hidden;display:flex;flex-direction:column;gap:${gut}px}
.row{display:flex;flex:0 0 auto;gap:${gut}px}
.card{background:var(--card);border:${bordo} solid var(--line);border-radius:var(--radius);position:relative;
  box-shadow:${D.ombra ? '0 1px 1px rgba(20,35,60,.04)' : 'none'}}
${banda === 'blocco' ? `/* la banda KPI come superficie unica: i riquadri spariscono, restano i separatori */
.row.kb{gap:0;background:var(--card);border:${bordo} solid var(--line);border-radius:var(--radius);overflow:hidden}
.row.kb>.card{border:0;border-right:${bordo} solid var(--line);border-radius:0;box-shadow:none;background:transparent}
.row.kb>.card:last-child{border-right:0}` : ``}
.card>.ch{padding:${D.cardPad}px 13px 5px;display:flex;align-items:baseline;gap:8px}
.card .ch h3{margin:0;font-family:var(--fontDisp);font-size:12px;font-weight:600;color:var(--ink);letter-spacing:-.1px}
.card .ch .hs{font-size:9.5px;color:var(--muted)}
.card .ch .hr{margin-left:auto;font-size:9px;color:var(--muted2)}
/* le linguette di una card a piu viste: piccole, in fondo all'intestazione, e si vede quale
   comanda — sono un interruttore, non una decorazione */
.vsw{display:inline-block;margin-left:5px;padding:2px 8px;border:1px solid var(--line);
  border-radius:999px;font-size:9px;color:var(--muted);cursor:pointer;white-space:nowrap}
.vsw:hover{color:var(--ink2);border-color:var(--muted2)}
.vsw.on{background:var(--c2);border-color:var(--c2);color:#fff;font-weight:600}
.kpi{padding:11px 14px 10px;display:flex;flex-direction:column;justify-content:space-between}
.kpi .k{font-size:9px;letter-spacing:.7px;text-transform:uppercase;color:var(--muted);font-weight:600}
.kpi .vr{display:flex;align-items:flex-end;gap:7px;margin-top:6px}
.kpi .v{font-size:25px;font-weight:600;color:var(--ink);line-height:1;letter-spacing:-1px}
.kpi .d{font-size:10px;font-weight:600;padding-bottom:2px;white-space:nowrap}
.kpi .det{font-size:9px;color:var(--muted);margin-top:7px}
.up{color:var(--good)}.dn{color:var(--bad)}.fl{color:var(--muted)}
.dcv{font-size:31px;font-weight:600;line-height:1;letter-spacing:-1.2px}
.dcd{font-size:9px;color:var(--muted);margin-top:7px;line-height:1.45}
.narr{padding:12px 14px;font-family:Georgia,"Times New Roman",serif;font-size:15px;line-height:1.55;color:var(--ink)}
.mx{padding:2px 8px 8px;overflow:hidden}
/* LA TABELLA RESTA ALTA QUANTO LE SUE RIGHE.
   Al primo giro avevo fatto il contrario — righe allungate a riempire la card — e la revisione
   ha chiarito che la richiesta era l'opposto: "molte tabelle sono grandi senza motivo con righe
   alte, lo spazio potrebbe essere occupato dalle visuals". Giusto: una tabella di quattro righe
   alta trecento pixel non da nessuna informazione in piu, la da solo piu lentamente.
   Lo spazio che avanza lo prendono i GRAFICI (vedi planFit), che con altezza in piu mostrano
   davvero di piu. */
.mx>table td,.mx>table th{vertical-align:middle}
.mx.mxs td,.mx.mxs th{padding-top:3px;padding-bottom:3px}.mx.mxss td,.mx.mxss th{padding-top:1px;padding-bottom:1px;font-size:10px}
${compact ? String.raw`th,td{padding:2px 6px}.card>.ch{padding:7px 13px 3px}#page{padding:10px 16px;gap:8px}.row{gap:8px}.kpi{padding:8px 14px 7px}` : ``}
table{width:100%;border-collapse:collapse;font-size:10.5px}
th{text-align:right;font-weight:600;color:var(--muted);font-size:8.5px;letter-spacing:.4px;text-transform:uppercase;padding:5px 6px;border-bottom:1px solid var(--line);white-space:nowrap}
th:first-child{text-align:left}
th.ord{cursor:pointer;user-select:none}
th.ord:hover{color:var(--ink)}
th.ord .so{opacity:.35;font-size:8px}
th.ord .so.on{opacity:1;color:var(--c2)}
td{padding:5px 6px;text-align:right;color:var(--ink2);border-bottom:1px solid var(--line2);white-space:nowrap}
td:first-child{text-align:left;color:var(--ink);font-weight:500}
tr.r{cursor:pointer}
tr.r:hover td{background:var(--line2)}
tr.r.dim td{opacity:.36}
tr.r.sel td{background:var(--line2)}
tr.tot td{font-weight:600;color:var(--ink);border-bottom:0;border-top:1px solid var(--line);background:var(--line2)}
.dg{width:13px;display:inline-block;text-align:center;color:var(--muted);opacity:0;font-size:11px}
tr.r:hover .dg{opacity:1}
.sw{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:7px;vertical-align:middle}
.lgd{display:flex;gap:12px;padding:0 13px 8px;font-size:9.5px;color:var(--muted)}
.lgd i{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:5px;vertical-align:-1px}
.lgd .ln{display:inline-block;width:11px;height:0;border-top:2px dashed var(--prior);margin-right:5px;vertical-align:3px}
svg{display:block}svg .hit{cursor:pointer}svg .dimd{opacity:.3}.gnote{font-size:10.5px;color:var(--muted);text-align:center;padding:0 10px 8px;line-height:1.4}
#tip{position:fixed;pointer-events:none;background:var(--c1);color:#fff;font-size:10.5px;padding:6px 9px;border-radius:2px;opacity:0;transition:opacity .1s;z-index:60;line-height:1.55;white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,.3)}
#tip b{font-weight:600}
.backb{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--ink2);background:transparent;border:1px solid var(--line);padding:6px 10px;border-radius:2px;cursor:pointer;font-family:var(--font)}
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

function dateSlicer(spec, larga) {
  const T = spec.meta.strings || {};
  const dentroRail = pelle(spec).shell.rail > 0 && !pelle(spec).shell.tools;
  return `<div class="slgrp">${dentroRail ? `<div class="rlbl">${esc(T.period || 'Periodo')}</div>` : ''}
      <button class="slbtn" id="slBtn">${CAL_ICON}<span class="cur" id="slCur"></span><span class="car">▼</span></button>
      <div class="slpanel" id="slPanel">
        ${larga ? `<div id="slSpanG"><div class="slsec">${esc(T.spanLong || 'Quanti anni')}</div><div class="slrow" id="slSpan"></div></div>` : ''}
        <div class="slsec">${esc(T.year || 'Anno')}</div><div class="slrow" id="slYear"></div>
        <div id="slQtrG"><div class="slsec">${esc(T.qtrLong || 'Trimestre')}</div><div class="slrow" id="slQtr"></div></div>
        <div id="slMonG"><div class="slsec">${esc(T.monthLong || 'Mese')}</div><div class="slrow" id="slMon"></div></div>
      </div></div>`;
}
function navButtons(spec) {
  const sh = pelle(spec).shell, pages = spec.pages.filter(p => p.nav);
  /* Una sola pagina non ha navigazione da mostrare, e senza rail non c'e nemmeno un posto dove
     metterla: il bottone unico sarebbe un ornamento che occupa la riga piu preziosa. */
  if (pages.length < 2 && sh.rail === 0) return '';
  return pages.map(p => `<button class="navbtn" data-page="${esc(p.id)}">${sh.rail > 0 ? BAR_ICON : ''}${esc(p.nav)}</button>`).join('');
}
function dimFilters(spec, rail) {
  return (spec.filters.dims || []).map(fd => rail
    ? `<div class="catgrp"><div class="rlbl">${esc(fd.label)}</div><div id="fl_${esc(fd.id)}"></div></div>`
    : `<div class="fgrp ${fd.control === 'dropdown' ? 'dd' : 'chips'}"><span class="flab">${esc(fd.label)}</span><div class="fitems" id="fl_${esc(fd.id)}"></div></div>`).join('');
}
/* @param ctxQui   le pill del contesto e il tasto azzera stanno qui, quando non c'e la riga filtri
   @param marchioQui  il nome del cliente non ha altro posto dove stare: niente rail, niente barra */
function header(spec, ctxQui, marchioQui, aiuto, navQui) {
  const m = spec.meta, T = m.strings || {}, b = m.brand || {};
  const inlineBrand = marchioQui;
  const rail = ctxQui;
  /* La shell "bare" non ha ne rail ne barra del marchio: senza questa riga un report a piu
     pagine perderebbe del tutto la navigazione, e la seconda pagina resterebbe scritta nella
     spec e irraggiungibile con un clic. */
  const nav = navQui ? navButtons(spec) : '';
  return `<div id="hdr">
      ${inlineBrand ? `<div class="hbrand">${esc((b.name || m.title).toUpperCase())}</div>` : ''}
      <div class="htit"><div class="ttl" id="hTtl"></div><div class="sub" id="hSub"></div></div>
      ${nav ? `<div class="hnav">${nav}</div>` : ''}
      <div class="spacer"></div>
      ${rail ? `<div class="ctxwrap" id="hCtx"></div>
      <button class="resetb" id="btnReset">${esc(T.reset || 'Azzera filtri')}</button>
      ${aiuto.bottone}` : ''}
      ${m.updated ? `<div class="updated">${esc(T.updatedLabel || 'Ultimo aggiornamento')}<br><b>${esc(m.updated)}</b></div>` : ''}
    </div>`;
}
/* Le quattro shell. Non sono quattro fogli di stile diversi: sono le stesse tre zone —
   marchio+navigazione, filtri, contenuto — sistemate in posti diversi. La rail piena tiene
   tutto a sinistra; la rail stretta tiene solo la navigazione e manda i filtri sulla riga; la
   barra superiore mette il marchio sopra; "bare" toglie del tutto la cornice scura e lascia
   una pagina che sembra un documento invece di un'applicazione. */
function shell(spec, data) {
  const P = pelle(spec), sh = P.shell, m = spec.meta, b = m.brand || {}, T2 = m.strings || {};
  /* La scheda di interazione, generata dalla spec: il cliente riceve un file solo, quindi se
     non e dentro il file non gli arriva. */
  const aiuto = SCHEDA.pannello(spec, data, esc);
  const marchio = esc((b.name || m.title).toUpperCase());
  const filtriInRail = sh.rail > 0 && !sh.tools;

  /* la riga "quanti anni" esiste solo se gli anni ci sono: sotto i tre e un controllo che
     propone una scelta sola */
  const storiaLarga = ((data && data.years) || []).length > 2;
  const barraFiltri = sh.tools ? `<div id="tools">${dateSlicer(spec, storiaLarga)}${dimFilters(spec, false)}<div class="spacer"></div>
    <div class="ctxwrap" id="hCtx"></div>
    <button class="resetb" id="btnReset">${esc(T2.reset || 'Azzera filtri')}</button>${aiuto.bottone}</div>` : '';

  const corpo = `<div id="main">
    ${barraFiltri}
    ${header(spec, !sh.tools, sh.rail === 0 && !sh.topbar, aiuto, sh.rail === 0 && !sh.topbar)}
    <div id="page"></div>
    <div class="wm">${esc(m.watermark)}</div>
  </div>`;

  if (sh.rail > 0) {
    return `<div id="rail">
    <div class="brand"><div class="mk"><div class="sq"></div><div class="nm">${marchio}</div></div>
      ${b.tagline && !sh.tools ? `<div class="sub">${esc(b.tagline)}</div>` : ''}</div>
    ${navButtons(spec) ? `<div class="navgrp"><div class="rlbl">${esc(T2.report || 'Report')}</div>${navButtons(spec)}</div>` : ''}
    ${filtriInRail ? dateSlicer(spec, storiaLarga) + dimFilters(spec, true) : ''}
    ${m.source && !sh.tools ? `<div class="railfoot">${esc(m.source)}</div>` : ''}
  </div>
  ${corpo}
  ${aiuto.pannello}`;
  }

  return `${hasTopbar(spec) ? `<div id="topbar"><div class="nm">${marchio}</div>${navButtons(spec)}<div class="spacer"></div>
    ${b.tagline ? `<div class="updated">${esc(b.tagline)}</div>` : ''}</div>` : ''}
  ${corpo}
  ${aiuto.pannello}`;
}

/* ---------- deterministic, compact JSON ---------- */
/* L'ANNO VIAGGIA COME SCARTO DAL PRIMO: "2024," ripetuto in ogni riga dei fatti erano cinque byte
   a riga, un chilo e mezzo in un mockup medio, dentro un file col tetto di 75KB. Il runtime
   (M.materialize) lo riporta all'anno vero leggendo y0. */
function tableJSON(t) {
  const iy = t.cols.indexOf('y');
  const y0 = iy < 0 ? null : Math.min.apply(null, t.rows.map(r => r[iy]));
  const rows = iy < 0 || !isFinite(y0) ? t.rows : t.rows.map(r => { const c = r.slice(); c[iy] = r[iy] - y0; return c; });
  return '{"cols":' + JSON.stringify(t.cols) + (iy < 0 || !isFinite(y0) ? '' : ',"y0":' + y0) + ',"rows":[' + rows.map(r => JSON.stringify(r)).join(',') + ']}';
}
function dataJSON(data) {
  const parts = ['"dims":' + JSON.stringify(data.dims), '"years":' + JSON.stringify(data.years),
  '"facts":' + tableJSON(data.facts)];
  /* solo quando dice qualcosa: se ogni anno e mensile — ed e il caso normale — la riga sarebbe
     una ripetizione di `years` */
  if (data.mensili && data.mensili.length < data.years.length) parts.push('"mensili":' + JSON.stringify(data.mensili));
  if (data.detail) parts.push('"detail":' + tableJSON(data.detail));
  if (data.detailModel) parts.push('"detailModel":' + JSON.stringify(data.detailModel));
  if (data.tieOut) parts.push('"tieOut":' + JSON.stringify(data.tieOut));
  return '{' + parts.join(',\n') + '}';
}

/* ---------- render ---------- */
/* LE PAROLE DEL MOTORE SEGUONO LA LINGUA DEL REPORT.
   Titoli e sottotitoli li scrive il modello; la CORNICE la scrive il motore — il selettore del
   periodo, le pillole di contesto, "Ultimo aggiornamento", l'azzeramento, la fetta "Altri", la
   nota del gauge. Ogni voce arriva da meta.strings, e la mancanza ripiega sull'italiano: in un
   report inglese senza quella chiave esce una parola italiana, ed e successo davvero — il primo
   tester esterno ha ricevuto un mockup con "Ultimo aggiornamento" in testa e "6,1 pp sopra goal"
   sotto un gauge. Qui le chiavi mancanti si riempiono con l'inglese quando il locale non e
   italiano. Non e un permesso per lasciarle fuori dalla spec: e la rete sotto. */
const INGLESE = {
  period: 'Period', spanLong: 'How many years', year: 'Year', qtrLong: 'Quarter', monthLong: 'Month',
  reset: 'Reset filters', updatedLabel: 'Last updated', report: 'Report',
  all: 'All', allM: 'All', compare: 'Compare', qtr: 'Qtr', month: 'Month', varShort: 'Var',
  spanUno: '1 year', spanTutti: 'All', anni: 'years', others: 'Others', target: 'target',
  conv: 'conv.', noPrev: 'no comparable previous period', trajectory: 'monthly trajectory',
  sopra: 'above', sotto: 'below', inLinea: 'in line with', nuova: 'new'
};

/** Riempie le voci mancanti nella lingua del report. L'italiano non si tocca: le sue parole
 *  sono gia il ripiego scritto nel runtime, e riscriverle cambierebbe i byte di ogni file. */
function lingua(spec) {
  if (/^it/i.test((spec.meta || {}).locale || 'it')) return;
  const T = spec.meta.strings = Object.assign({}, spec.meta.strings);
  Object.keys(INGLESE).forEach(k => { if (T[k] === undefined) T[k] = INGLESE[k]; });
}

function render(specIn, data) {
  /* il fit avviene qui, prima della validazione: la spec emessa nel file e quella
     effettivamente renderizzata, cosi cio che si vede e cio che si e validato */
  const { spec, report } = fitSpec(specIn, data);
  /* La pelle risolta viaggia dentro la spec emessa: il runtime deve sapere se la banda KPI e
     un blocco unico o quattro riquadri, e non puo ricalcolarla — skin.js sta nel motore, non
     nel file. Sono tre stringhe, ed evitano di duplicare la tabella dei preset nel runtime. */
  spec.__pelle = { banda: pelle(spec).banda.id, densita: pelle(spec).densita.id, shell: pelle(spec).shell.id };

  /* la cornice parla la lingua del report: vedi INGLESE piu sopra */
  lingua(spec);

  /* I COLORI DEI MEMBRI VENGONO DALLA PALETTE, non dalla spec.
     Fino a qui il lavoro sull'accessibilita non toccava i grafici: le fette, le barre e i
     nastri prendono il colore dal MEMBRO (`data.dims[dim][i].c`), che finora era un esadecimale
     scritto a mano in dataParams e verificato da nessuno. Una scala categoriale misurata che
     non arriva ai dati e un esercizio.
     Ora la assegna il motore, per indice, dalla serie verificata della famiglia: costante per
     categoria su tutti i visual, e distinguibile sotto le tre dicromazie e in stampa.
     L'eccezione e dichiarata dal dato, non dedotta: `brand: true` su un membro tiene il suo
     colore — Instagram e rosa e TikTok e nero, e li la tinta E' l'identita. */
  const tk = pelle(spec).tokens;
  const serieOk = tk.serie || [];
  data = Object.assign({}, data, { dims: Object.assign({}, data.dims) });
  Object.keys(data.dims).forEach(d => {
    data.dims[d] = data.dims[d].map((m, i) => (m.brand || (spec.meta || {}).brandColors)
      ? m : Object.assign({}, m, { c: serieOk[i % serieOk.length] || m.c }));
  });
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

  /* IL GUTTER DELLA PAGINA DENSA VALE ANCHE PER LE LARGHEZZE.
     La pagina densa stringe le spaziature nel foglio di stile — .row{gap:8px} — ma le larghezze
     delle card le calcola il runtime dal gutter della spec, che era rimasto a 12. Le due cose
     non tornavano, e il risultato non era un pixel: una riga da cinque card finiva sedici pixel
     prima di una riga da una sola, quindi il bordo destro del report era A SCALINI, diverso per
     ogni riga. E' il difetto che la revisione ha chiamato "errore grave", ed era invisibile a
     ogni conto perche ogni singola riga tornava — con il gutter sbagliato.
     Si scrive DOPO la validazione: il gate vuole il gutter della densita dichiarata, ed e
     giusto cosi — la pagina densa e una decisione del motore, non della spec. */
  if (compact) spec.grid = Object.assign({}, spec.grid, { gutter: DENSE_GUTTER });
  const lang = (spec.meta.locale || 'it-IT').slice(0, 2);
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(spec.meta.brand && spec.meta.brand.name ? spec.meta.brand.name + ' — ' + spec.meta.title : spec.meta.title)}</title>
<style>
${css(spec, compact).replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map(l => l.trim()).filter(Boolean).join('\n')}
</style>
</head>
<body>
<div id="stage"><div id="canvas">
  ${shell(spec, data)}
</div></div>
<div id="tip"></div>
<script>
${bundle(types, { finestra: ((data && data.years) || []).length > 2 })}
var SPEC=${JSON.stringify(spec)};
var DATA=${dataJSON(data)};
MK.__A=MK.boot(SPEC,DATA,document);
</script>
</body>
</html>
`;
}

module.exports = { render, validate, lint, toolbarBudget, destraBarra, bundle, css, AESTHETICS, fitSpec, measurePage, pageBudget, rowHeight, INGLESE };
