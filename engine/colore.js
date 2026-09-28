/* LA MATEMATICA DEL COLORE, e le basi da cui NON si improvvisa.
 *
 * Le scale categoriali sicure per i daltonici non si inventano: sono poche, sono state
 * costruite da chi le ha misurate, e il fatto che pochissimi schemi di ColorBrewer passino il
 * filtro "colorblind safe" e il segnale piu chiaro che il problema e difficile. Qui stanno le
 * basi (Okabe-Ito, Tol, ColorBrewer filtrati, Viridis e Cividis per le sequenziali) e gli
 * strumenti per verificarle: contrasto WCAG, differenza percettiva DeltaE76, simulazione delle
 * tre dicromazie e conversione in scala di grigi.
 *
 * Perche il grigio conta quanto le tre CVD: le scale CVD-safe privilegiano la separazione di
 * TINTA, non di luminosita, quindi collassano spesso in bianco e nero — e un report si stampa.
 */
'use strict';

/* ---------------------------------------------------------------- sRGB, lineare, XYZ, Lab */

const hex2rgb = h => {
  const s = String(h).replace('#', '');
  return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16));
};
const rgb2hex = ([r, g, b]) => '#' + [r, g, b]
  .map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();

const aLineare = v => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
const daLineare = v => 255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(Math.max(0, v), 1 / 2.4) - 0.055);

/** Luminanza relativa WCAG. */
const lum = c => {
  const [r, g, b] = hex2rgb(c).map(aLineare);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** Rapporto di contrasto WCAG fra due colori. */
const contrasto = (a, b) => {
  const l1 = lum(a), l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

/** CIE Lab (D65), che serve solo per il DeltaE. */
function lab(c) {
  const [r, g, b] = hex2rgb(c).map(aLineare);
  const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const Y = (0.2126 * r + 0.7152 * g + 0.0722 * b);
  const Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = t => t > 0.008856 ? Math.cbrt(t) : (7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f(X), f(Y), f(Z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** DeltaE76: sotto ~10 due colori sono indistinguibili per molte persone. */
function deltaE(a, b) {
  const A = lab(a), B = lab(b);
  return Math.sqrt((A[0] - B[0]) ** 2 + (A[1] - B[1]) ** 2 + (A[2] - B[2]) ** 2);
}

/* ---------------------------------------------------------------- le tre dicromazie */

/* Matrici di simulazione in spazio LMS (Brettel/Vienot, i coefficienti usati da tutti gli
   strumenti di verifica). Non servono a "vedere come vede un daltonico" — nessuna matrice lo
   fa davvero — ma a rispondere a una domanda piu modesta e piu utile: dopo il collasso, questi
   due colori restano diversi? */
const LMS = [[0.31399022, 0.63951294, 0.04649755],
             [0.15537241, 0.75789446, 0.08670142],
             [0.01775239, 0.10944209, 0.87256922]];
const LMS_INV = [[5.47221206, -4.6419601, 0.16963708],
                 [-1.1252419, 2.29317094, -0.1678952],
                 [0.02980165, -0.19318073, 1.16364789]];
const DICROMAZIE = {
  protanopia: [[0, 1.05118294, -0.05116099], [0, 1, 0], [0, 0, 1]],
  deuteranopia: [[1, 0, 0], [0.9513092, 0, 0.04866992], [0, 0, 1]],
  tritanopia: [[1, 0, 0], [0, 1, 0], [-0.86744736, 1.86727089, 0]]
};

const perMat = (M, v) => M.map(r => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);

/** Il colore come lo vede chi ha quella dicromazia. */
function simula(c, tipo) {
  const lin = hex2rgb(c).map(aLineare);
  const lms = perMat(LMS, lin);
  const dif = perMat(DICROMAZIE[tipo], lms);
  return rgb2hex(perMat(LMS_INV, dif).map(daLineare));
}

/** Il colore in scala di grigi, come esce da una stampante in bianco e nero. */
const grigio = c => {
  const v = daLineare(lum(c));
  return rgb2hex([v, v, v]);
};

/* ---------------------------------------------------------------- le basi, non inventate */

/* OKABE-ITO — otto colori pensati per il color-universal design. E' il default sicuro: se non
   si sa quale scala usare, si usa questa. Il nero apre la serie e non e un caso, e la voce
   che deve restare leggibile ovunque. */
const OKABE_ITO = {
  nero: '#000000', arancioChiaro: '#E69F00', celeste: '#56B4E9', verde: '#009E73',
  giallo: '#F0E442', blu: '#0072B2', vermiglio: '#D55E00', rosaViola: '#CC79A7'
};

/* TOL — tre scale, pensate per restare distinguibili anche in stampa. */
const TOL_BRIGHT = ['#4477AA', '#EE6677', '#228833', '#CCBB44', '#66CCEE', '#AA3377', '#BBBBBB'];
const TOL_MUTED = ['#332288', '#88CCEE', '#44AA99', '#117733', '#DDCC77', '#CC6677', '#AA4499', '#882255'];
const TOL_LIGHT = ['#77AADD', '#EE8866', '#EEDD88', '#FFAABB', '#99DDFF', '#44BB99', '#BBCC33'];

/* COLORBREWER, i due qualitativi marcati "colorblind safe". Sono pochi, ed e il punto: i
   categoriali sicuri sono difficili, e improvvisarne uno nuovo e il modo piu rapido di
   sbagliare. */
const BREWER_DARK2 = ['#1B9E77', '#D95F02', '#7570B3', '#E7298A', '#66A61E', '#E6AB02'];
const BREWER_PAIRED = ['#1F78B4', '#33A02C', '#E31A1C', '#FF7F00', '#6A3D9A', '#B15928'];

/* VIRIDIS e CIVIDIS — sequenziali percettivamente uniformi. Sostituiscono qualunque rampa
   arcobaleno: sono leggibili sotto tutte le dicromazie E in scala di grigi, perche la
   luminanza sale in modo monotono lungo tutta la scala. Cividis nasce proprio per questo.
   Campionate a cinque stop: piu di cosi, in una cella di tabella, non si distingue. */
const VIRIDIS = ['#440154', '#3B528B', '#21918C', '#5EC962', '#FDE725'];
const CIVIDIS = ['#00204D', '#31446B', '#666970', '#A69D75', '#FFEA46'];

/* DIVERGENTI — due tinte con un punto medio neutro, mai rosso-verde. Blu/arancio e la coppia
   collaudata: resta separata sotto tutte e tre le dicromazie e anche in grigio, perche i due
   estremi differiscono in luminanza oltre che in tinta. */
const DIV_BLU_ARANCIO = ['#2166AC', '#67A9CF', '#F0F0F0', '#EF8A62', '#B2182B'];
const DIV_VIOLA_VERDE = ['#5E3C99', '#B2ABD2', '#F7F7F7', '#FDB863', '#E66101'];

/* Gli stati opposti. La coppia rosso/verde e la prima cosa che sparisce per un daltonico su
   dodici uomini, ed e ancora la piu diffusa nei report: qui non esiste. Blu contro arancio e
   la sostituta documentata — il rosso resta, ma solo per SEGNALARE UN PROBLEMA, non per fare
   coppia col verde. */
const STATI = { positivo: '#1F77B4', negativo: '#D55E00', allarme: '#B2182B', attenzione: '#E69F00' };

/** Le due voci sono distinguibili sotto tutte e tre le dicromazie e in grigio? */
function separati(a, b, sogliaE, sogliaGrigio) {
  sogliaE = sogliaE === undefined ? 10 : sogliaE;
  sogliaGrigio = sogliaGrigio === undefined ? 8 : sogliaGrigio;
  const esiti = { normale: deltaE(a, b) };
  Object.keys(DICROMAZIE).forEach(t => { esiti[t] = deltaE(simula(a, t), simula(b, t)); });
  esiti.grigio = Math.abs(lab(grigio(a))[0] - lab(grigio(b))[0]);
  const rotti = Object.keys(esiti).filter(k =>
    esiti[k] < (k === 'grigio' ? sogliaGrigio : sogliaE));
  return { ok: rotti.length === 0, rotti, esiti };
}

/* ---------------------------------------------------------------- costruire una serie */

/** Sposta un colore verso il nero o verso il bianco finche non stacca dalla superficie. */
function aggiusta(c, superficie, minimo) {
  if (contrasto(c, superficie) >= minimo) return c;
  /* si va nella direzione opposta al fondo: su una carta chiara si scurisce, su un fondo
     scuro si schiarisce. E' la cura che la pratica indica per i categoriali pallidi, che sono
     i colpevoli abituali del 3:1 mancato — un rosa chiaro su bianco sporco sta a 2:1. */
  const verso = lum(superficie) > 0.5 ? [0, 0, 0] : [255, 255, 255];
  const rgb = hex2rgb(c);
  let migliore = c;
  for (let t = 0.05; t <= 0.95; t += 0.05) {
    const p = rgb2hex(rgb.map((v, i) => v + (verso[i] - v) * t));
    migliore = p;
    if (contrasto(p, superficie) >= minimo) return p;
  }
  return migliore;
}

/**
 * La scala categoriale di una famiglia: si SCEGLIE da una base CVD-safe, non si inventa.
 *
 * Due vincoli insieme, ed e la parte che l'occhio non sa fare:
 *   - ogni colore stacca dalla superficie di almeno `minimo` (3:1, elementi non testuali);
 *   - ogni coppia resta distinguibile sotto le tre dicromazie E in scala di grigi.
 *
 * Il secondo e quello che frega: le scale sicure per i daltonici separano per TINTA, e in
 * bianco e nero due tinte diversissime possono avere la stessa luminanza. Un report si stampa,
 * quindi la separazione in grigio vale quanto le altre — qui si sceglie in modo GOLOSO il
 * colore che massimizza la distanza minima da quelli gia presi, contando anche il grigio.
 */
/* IL ROSSO APPARTIENE AL PROBLEMA. Una scala categoriale che lo contiene lo spende su una
   categoria qualunque: nel mockup di Nitish (28 set 2026) "Water Sports" era rosso pieno mentre
   la categoria in calo, Fitness, era blu — il lettore guarda il rosso e trova la voce sbagliata.
   Succedeva in due famiglie, warm-taupe e terroso: il vermiglione della base, scurito per il
   contrasto, diventava un rosso vero. Qui si riconosce la famiglia del rosso (tinta vicina allo
   zero, satura, di luminosita media) e la scala non la prende mai. */
function rosso(hex) {
  const x = String(hex).replace('#', '');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(x.slice(i, i + 2), 16) / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return false;
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60; if (h < 0) h += 360;
  const sat = d / (1 - Math.abs(2 * l - 1));
  return (h >= 345 || h <= 15) && sat > 0.45 && l > 0.2 && l < 0.72;
}

function serieCVD(base, superficie, n, opz) {
  opz = opz || {};
  const minimo = opz.minimo || 3;
  const cand = base.map(c => aggiusta(c, superficie, minimo))
    .filter(c => contrasto(c, superficie) >= minimo)
    .filter(c => !opz.senzaRosso || !rosso(c));
  if (!cand.length) return [];
  const dist = (a, b) => {
    const s = separati(a, b);
    return Math.min(s.esiti.normale, s.esiti.protanopia, s.esiti.deuteranopia,
      s.esiti.tritanopia, s.esiti.grigio * 1.25);
  };
  /* si parte dal piu marcato: e quello che portera la serie principale, la prima categoria */
  const scelti = [cand.slice().sort((a, b) => contrasto(b, superficie) - contrasto(a, superficie))[0]];
  while (scelti.length < n) {
    let meglio = null, punteggio = -1;
    cand.forEach(c => {
      if (scelti.indexOf(c) >= 0) return;
      const d = Math.min.apply(null, scelti.map(s => dist(c, s)));
      if (d > punteggio) { punteggio = d; meglio = c; }
    });
    if (!meglio) break;
    scelti.push(meglio);
  }
  if (opz.piatto) return scelti;

  /* Quante voci REGGONO davvero. Sei e il massimo che si prova, non una quota da riempire: con
     una base da sei colori il sesto e obbligato e di solito e quello che rompe la separazione
     sotto protanopia. Si scende finche l'insieme non passa — cinque colori distinguibili
     valgono piu di sei di cui due si confondono, e "massimo 5-7 categoriali" e un tetto, non
     un obiettivo. */
  for (let k = scelti.length; k >= 3; k--) {
    const s = separaPerLuminanza(scelti.slice(0, k), superficie, minimo);
    let peggioCVD = Infinity, peggioGrigio = Infinity;
    for (let i = 0; i < s.length; i++) {
      for (let j = i + 1; j < s.length; j++) {
        const r = separati(s[i], s[j]).esiti;
        peggioCVD = Math.min(peggioCVD, r.normale, r.protanopia, r.deuteranopia, r.tritanopia);
        peggioGrigio = Math.min(peggioGrigio, r.grigio);
      }
    }
    if (peggioCVD >= (opz.sogliaCVD || 10) && peggioGrigio >= (opz.sogliaGrigio || 8)) return s;
  }
  return separaPerLuminanza(scelti.slice(0, 3), superficie, minimo);
}

/** Porta un colore a una data chiarezza L* mescolandolo con nero o bianco. */
function versoL(c, obiettivo) {
  const attuale = lab(c)[0];
  if (Math.abs(attuale - obiettivo) < 0.5) return c;
  const verso = obiettivo < attuale ? [0, 0, 0] : [255, 255, 255];
  const rgb = hex2rgb(c);
  let lo = 0, hi = 1;
  for (let i = 0; i < 18; i++) {
    const t = (lo + hi) / 2;
    const p = rgb2hex(rgb.map((v, k) => v + (verso[k] - v) * t));
    const L = lab(p)[0];
    if ((obiettivo < attuale && L > obiettivo) || (obiettivo > attuale && L < obiettivo)) lo = t;
    else hi = t;
  }
  return rgb2hex(rgb.map((v, k) => v + (verso[k] - v) * (lo + hi) / 2));
}

/**
 * SEPARA PER LUMINOSITA. E' il passo che la ricerca prescrive e che nessuna scala CVD-safe fa
 * da sola: quelle scale separano per TINTA, quindi due voci diversissime a colori possono
 * avere la stessa identica luminanza e diventare la stessa cosa in bianco e nero. Un report si
 * stampa, e una legenda che in stampa ha due voci identiche non e una legenda.
 *
 * Le chiarezze si distribuiscono a scalini regolari dentro l'intervallo che la superficie
 * concede — quello in cui il contrasto minimo tiene — mantenendo l'ordine originale, cosi la
 * prima categoria resta la piu marcata.
 */
function separaPerLuminanza(serie, superficie, minimo, passo) {
  passo = passo || 9;
  minimo = minimo || 3;
  const chiara = lum(superficie) > 0.5;
  /* l'estremo concesso dal contrasto: su carta chiara si puo scendere fino al nero, ma non
     salire oltre il punto in cui la barra si confonde col foglio */
  let limite = null;
  for (let L = 0; L <= 100; L += 1) {
    const prova = versoL(serie[0], L);
    if (contrasto(prova, superficie) >= minimo) limite = L;
    else if (limite !== null && chiara) break;
  }
  const n = serie.length;
  const spanNecessario = passo * (n - 1);
  const alto = chiara ? Math.min(limite === null ? 60 : limite, 62) : 92;
  const basso = chiara ? Math.max(12, alto - Math.max(spanNecessario, 40))
    : Math.max(38, alto - Math.max(spanNecessario, 44));
  const ordinati = serie.slice().sort((a, b) => lab(a)[0] - lab(b)[0]);
  const step = (alto - basso) / Math.max(1, n - 1);
  const mappa = {};
  /* L'ultima parola resta al contrasto: spingere la chiarezza verso l'alto per separare in
     stampa puo far scivolare l'ultima voce sotto il 3:1 sulla carta. Meglio due colori un po'
     piu vicini in grigio che una barra che non si vede a schermo, dove il report vive. */
  ordinati.forEach((c, i) => { mappa[c] = aggiusta(versoL(c, basso + step * i), superficie, minimo); });
  return serie.map(c => mappa[c]);
}

module.exports = {
  rosso,
  aggiusta, serieCVD, separaPerLuminanza, versoL,
  hex2rgb, rgb2hex, lum, contrasto, lab, deltaE, simula, grigio, separati,
  OKABE_ITO, TOL_BRIGHT, TOL_MUTED, TOL_LIGHT, BREWER_DARK2, BREWER_PAIRED,
  VIRIDIS, CIVIDIS, DIV_BLU_ARANCIO, DIV_VIOLA_VERDE, STATI, DICROMAZIE
};
