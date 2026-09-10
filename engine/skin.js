/* LA PELLE — i cinque assi che decidono come un report GUARDA, indipendenti fra loro.
 *
 * Il problema che chiude: gli archetipi hanno reso diverse le COMPOSIZIONI, ma i mockup si
 * somigliavano ancora, perche la pelle era sempre la stessa — tre estetiche in tutto, e ognuna
 * legava insieme shell, colori, caratteri e ritmo. Cambiarne una significava cambiarle tutte.
 *
 * Qui gli assi si separano e si moltiplicano:
 *
 *   archetipo   8   (engine/render.js — la composizione della pagina)
 *   shell       4   dove stanno navigazione e filtri
 *   palette    13   la famiglia di colore
 *   tipografia  8   la coppia display + interfaccia (i numeri sono SEMPRE mono tabellari)
 *   densita     3   spaziature, raggi, bordi, card riquadrate o fondo continuo
 *
 * 8 x 4 x 13 x 8 x 3 = 9.984 combinazioni. Il "cassetto da cento" esiste per costruzione,
 * senza mantenere cento file che invecchiano.
 *
 * NON si sceglie a caso: nicchia e pubblico restringono, il brand del cliente vince su tutto,
 * e dentro i vincoli la scelta RUOTA con un seme derivato dal brief — deterministica, ma
 * diversa da un brief all'altro. Vedi `scegliPelle`.
 *
 * Le tre estetiche storiche restano, come PRESET: sono combinazioni con un nome, non piu
 * bundle chiusi. Una spec che dichiara solo `aesthetic` continua a renderizzare identica.
 */
'use strict';

/* ---------------------------------------------------------------- colore, aritmetica minima */

const hex = h => {
  const s = h.replace('#', '');
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
};
const str = ([r, g, b]) => '#' + [r, g, b].map(v =>
  Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();

/** Miscela due colori. `t` e quanto del secondo entra nel primo. */
const mix = (a, b, t) => {
  const A = hex(a), B = hex(b);
  return str([0, 1, 2].map(i => A[i] + (B[i] - A[i]) * t));
};

/* Luminanza relativa e rapporto di contrasto, come li definisce la WCAG. Servono al test:
   una palette che non si legge non e una palette, e con tredici famiglie scritte a mano il
   controllo non puo essere l'occhio di chi le scrive. */
const lum = c => {
  const [r, g, b] = hex(c).map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrasto = (a, b) => {
  const l1 = lum(a), l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

/* ---------------------------------------------------------------- 1. SHELL */

/* La shell decide DUE cose insieme, e la seconda si dimentica sempre: dove stanno navigazione e
   filtri, e quanta larghezza resta al contenuto. `contentWidth` non e una preferenza: e
   1280 meno la rail, meno il padding di #page. Dichiararne una diversa fa strizzare le card
   dalla flexbox mentre gli SVG restano larghi quanto la spec crede — il disegno esce dal
   riquadro e nessun conto se ne accorge.
   Il valore per la shell "top" era 1254 quando lo spazio vero e 1248: sei pixel, che la
   flexbox toglieva alle card della banda KPI, due per card. */
const SHELLS = {
  /** Rail scura a sinistra: navigazione E filtri dentro la rail. La faccia storica. */
  rail: { rail: 200, tools: false, topbar: false, contentWidth: 1044, nome: 'rail a sinistra' },
  /** Barra superiore col marchio, riga di filtri sotto. Piu larga, piu "applicazione". */
  top: { rail: 0, tools: true, topbar: true, contentWidth: 1248, nome: 'barra superiore' },
  /** Rail stretta di sola navigazione + riga filtri: piu contenuto della rail piena,
   *  ma con la navigazione sempre visibile di lato. */
  'rail-slim': { rail: 132, tools: true, topbar: false, contentWidth: 1116, nome: 'rail stretta + filtri sopra' },
  /** Nessuna cornice scura: solo intestazione e filtri sul fondo della pagina. E' la piu
   *  editoriale — il report sembra un documento, non un'applicazione. */
  bare: { rail: 0, tools: true, topbar: false, contentWidth: 1248, nome: 'senza cornice' }
};

/* ---------------------------------------------------------------- 2. PALETTE */

/* Ogni famiglia dichiara otto valori; il resto della scala si DERIVA mescolando. Scrivere a
   mano ventisei token per tredici famiglie significa scriverne trecentotrentotto e sbagliarne
   qualcuno: le sfumature intermedie sono esattamente il genere di cosa che una funzione fa
   meglio di una persona, e restano coerenti dentro la famiglia per costruzione.
   `serie` e la scala categoriale: 6 colori che devono restare distinguibili fra loro e leggibili
   sulla superficie. Sono l'unica parte davvero autoriale. */
const FAMIGLIE = {
  'navy-corporate': {
    etichetta: 'navy corporate', scuro: false, radius: '2px',
    canvas: '#EDF0F4', card: '#FFFFFF', ink: '#16202E', rail: '#0E2439',
    serie: ['#12304F', '#1F4E79', '#4A7FA8', '#7FA8C6', '#8FB3CC', '#C6D7E4'],
    good: '#2E7D5B', bad: '#B3453B', amber: '#C08A2E'
  },
  'slate-freddo': {
    etichetta: 'slate freddo', scuro: false, radius: '3px',
    canvas: '#EEF1F3', card: '#FFFFFF', ink: '#1B2429', rail: '#243239',
    serie: ['#27414C', '#38606F', '#4F8194', '#74A3B4', '#9CC0CC', '#C8DCE3'],
    good: '#2F7360', bad: '#A9483E', amber: '#B3862F'
  },
  'warm-taupe': {
    etichetta: 'warm neutral / taupe', scuro: false, radius: '4px',
    canvas: '#F3F0EB', card: '#FFFDFA', ink: '#241F1A', rail: '#2E2721',
    serie: ['#4A3F35', '#6E5C4A', '#947E64', '#B49C80', '#CDBAA1', '#E2D6C4'],
    good: '#4F6B45', bad: '#9E4A38', amber: '#B5872F'
  },
  'carta-inchiostro': {
    etichetta: 'editoriale carta e inchiostro', scuro: false, radius: '0px',
    canvas: '#FBFAF7', card: '#FFFFFF', ink: '#14171A', rail: '#14171A',
    serie: ['#14171A', '#3E5C86', '#4E555D', '#868D95', '#BEC3C9', '#DDE0E3'],
    good: '#1F6B4F', bad: '#A03328', amber: '#8A7433'
  },
  'dark-agency': {
    etichetta: 'dark agency', scuro: true, radius: '6px',
    canvas: '#111420', card: '#191D2B', ink: '#EDF0F7', rail: '#151A28',
    /* il primo della scala era #3D4A6B: 1,91 di contrasto sulla card scura, cioe una forma
       che si intuisce piu che vedersi. Schiarito quanto basta a superare il 2, che e la
       soglia sotto la quale un riempimento non si distingue dal fondo. */
    serie: ['#4A5A82', '#4C6FE0', '#2E9BD6', '#22B5A6', '#5C6BC0', '#7A5AF8'],
    good: '#35C48A', bad: '#E0576B', amber: '#F0A63C'
  },
  'dark-tecnico': {
    etichetta: 'dark tecnico, blu profondo', scuro: true, radius: '3px',
    canvas: '#0B1220', card: '#131C2E', ink: '#DCE6F5', rail: '#0A1220',
    serie: ['#4E8CC4', '#3E86C4', '#5FA8D8', '#7FC4E4', '#A6D6EC', '#CDE8F5'],
    good: '#3BA97F', bad: '#D2564F', amber: '#D69A3A'
  },
  terroso: {
    etichetta: 'terroso, ocra e ruggine', scuro: false, radius: '3px',
    canvas: '#F5EFE6', card: '#FFFCF7', ink: '#2A1F16', rail: '#3A2A1C',
    serie: ['#6B3A22', '#93542C', '#B87A3C', '#CE9C5E', '#DFBB8A', '#EDD6B4'],
    good: '#5A6E3A', bad: '#9C3B27', amber: '#C08A2E'
  },
  salvia: {
    etichetta: 'verde salvia', scuro: false, radius: '4px',
    canvas: '#EFF2ED', card: '#FCFDFB', ink: '#1C241C', rail: '#263324',
    serie: ['#2F4A34', '#456B4A', '#5F8B63', '#87AC88', '#AFC9AE', '#D3E1D2'],
    good: '#3C7A4E', bad: '#A34438', amber: '#B0862D'
  },
  'jewel-desaturati': {
    etichetta: 'jewel tones desaturati', scuro: false, radius: '3px',
    canvas: '#F1EFF2', card: '#FFFFFF', ink: '#211D26', rail: '#2B2333',
    serie: ['#4A2F53', '#6B4A78', '#3F5E74', '#4F7D6C', '#8A6A4E', '#9A5560'],
    good: '#3F7A5E', bad: '#A2454B', amber: '#B08334'
  },
  'monocromo-accento': {
    etichetta: 'monocromo con un accento', scuro: false, radius: '2px',
    canvas: '#F4F4F4', card: '#FFFFFF', ink: '#1A1A1A', rail: '#1A1A1A',
    serie: ['#1A1A1A', '#B4552D', '#4A4A4A', '#767676', '#A3A3A3', '#CFCFCF'],
    good: '#2F6B4F', bad: '#A63A2A', amber: '#9A7A2C'
  },
  'alto-contrasto': {
    etichetta: 'alto contrasto', scuro: false, radius: '0px',
    canvas: '#FFFFFF', card: '#FFFFFF', ink: '#000000', rail: '#000000',
    serie: ['#000000', '#1F4EB0', '#B02A1F', '#0F6E4C', '#7A3FA8', '#8A6A00'],
    good: '#0F6E4C', bad: '#B02A1F', amber: '#8A6A00'
  },
  'pastello-sobrio': {
    etichetta: 'pastello sobrio', scuro: false, radius: '6px',
    canvas: '#F6F4F8', card: '#FFFFFF', ink: '#2A2733', rail: '#3A3547',
    serie: ['#5C6485', '#7C8AAF', '#9C8AA8', '#8FA9A0', '#B7A38C', '#A9B4C6'],
    good: '#4A7A61', bad: '#A8544F', amber: '#B08A45'
  },
  'blu-ghiaccio': {
    etichetta: 'blu ghiaccio, chiaro e freddo', scuro: false, radius: '3px',
    canvas: '#F2F6FA', card: '#FFFFFF', ink: '#152430', rail: '#1B3243',
    serie: ['#1B3243', '#2F5F7D', '#4A88A8', '#77AEC6', '#A6CDDD', '#D2E6EF'],
    good: '#2C7460', bad: '#AA463C', amber: '#B3872E'
  }
};

/** Da otto valori dichiarati alla scala completa dei token. */
function palette(id) {
  const f = FAMIGLIE[id];
  if (!f) throw new Error('palette sconosciuta: "' + id + '"');
  const { card, ink, canvas, rail, scuro } = f;
  const t = {
    canvas, card, ink,
    page: scuro ? mix(canvas, '#000000', 0.45) : mix(canvas, ink, 0.10),
    line: mix(card, ink, scuro ? 0.16 : 0.13),
    line2: mix(card, ink, scuro ? 0.08 : 0.06),
    ink2: mix(ink, card, 0.22),
    /* Le tre gradazioni di grigio non sono decorative: muted e testo secondario e deve
        restare leggibile, muted2 sono le etichette degli assi, muted3 e cio che si vede solo
        se lo si cerca. I coefficienti sono calibrati sui rapporti che la palette storica
        aveva gia — non scelti a occhio — e il test li verifica su tutte e tredici. */
    muted: mix(ink, card, 0.46),
    muted2: mix(ink, card, 0.56),
    muted3: mix(ink, card, 0.68),
    /* flab e l'etichetta dei filtri: 8,5px, maiuscoletto, spaziata — la dimensione piu
        piccola dell'intera cornice. Un grigio da "testo secondario" li non basta, e il gate
        dell'harness lo misura: sotto 4,5:1 la riga dei filtri diventa decorazione. */
    flab: mix(ink, card, 0.34),
    rail, railInk: mix(rail, '#FFFFFF', 0.80),
    /* La stessa etichetta minuscola vive in due posti con fondi opposti: sulla riga dei filtri
       (superficie chiara) e dentro la rail (superficie scura). Un token solo non puo servirli
       entrambi — provarci significa sceglierne uno e lasciare l'altro illeggibile, che e
       esattamente il difetto che il gate ha trovato. */
    flabRail: mix(rail, '#FFFFFF', 0.66),
    good: f.good, bad: f.bad, amber: f.amber,
    /* i tre gradini della heat: la stessa idea in tutte le famiglie — un velo del colore
       semantico sulla superficie, mai una tinta piena che copra il numero sopra */
    heatLo: mix(card, f.bad, scuro ? 0.22 : 0.12),
    heatMid: mix(card, f.amber, scuro ? 0.20 : 0.11),
    heatHi: mix(card, f.good, scuro ? 0.20 : 0.11),
    radius: f.radius
  };
  f.serie.forEach((c, i) => { t['c' + (i + 1)] = c; });
  return t;
}

/* ---------------------------------------------------------------- 3. TIPOGRAFIA */

/* Solo caratteri di sistema: il file e autonomo e non fa una sola richiesta di rete, quindi
   un font da scaricare sarebbe un buco nel requisito piu importante del prodotto.
   REGOLA CHE NON CAMBIA MAI: i numeri sono mono con cifre tabellari, in ogni abbinamento. Una
   colonna di importi con cifre proporzionali balla, e un valore che cambia sposta l'etichetta
   accanto: il movimento sembra un errore del report. */
const MONO = '"Cascadia Mono",Consolas,"SF Mono",Menlo,"DejaVu Sans Mono",monospace';
const SANS = '"Segoe UI","Segoe UI Web (West European)",-apple-system,BlinkMacSystemFont,Roboto,"Helvetica Neue",Arial,sans-serif';

const TIPOGRAFIE = {
  'sans-sistema': { etichetta: 'tutto sans', display: SANS, ui: SANS, num: MONO },
  'serif-display': { etichetta: 'serif display + sans UI', display: 'Georgia,"Times New Roman",serif', ui: SANS, num: MONO },
  condensato: { etichetta: 'grotesque condensato', display: '"Arial Narrow","Roboto Condensed","Liberation Sans Narrow",' + SANS, ui: SANS, num: MONO },
  humanist: { etichetta: 'humanist', display: 'Tahoma,Verdana,Geneva,' + SANS, ui: 'Tahoma,Verdana,Geneva,' + SANS, num: MONO },
  geometrico: { etichetta: 'geometrico', display: '"Century Gothic","Avenir Next",Futura,"Trebuchet MS",' + SANS, ui: '"Trebuchet MS",' + SANS, num: MONO },
  slab: { etichetta: 'slab per i titoli', display: 'Rockwell,"Bookman Old Style","Roboto Slab",Georgia,serif', ui: SANS, num: MONO },
  editoriale: { etichetta: 'editoriale, serif ad alto contrasto', display: '"Palatino Linotype","Book Antiqua",Palatino,Georgia,serif', ui: SANS, num: MONO },
  tecnico: { etichetta: 'tecnico', display: MONO, ui: SANS, num: MONO }
};

/* ---------------------------------------------------------------- 4. DENSITA */

/* Il ritmo: quanto respira la pagina. Tocca le spaziature — che il fit deve conoscere, perche
   il gutter entra nel conto delle altezze — e la natura della card: riquadrata su fondo, o
   appoggiata a un fondo continuo senza bordo, che e un'altra faccia ancora. */
const DENSITA = {
  arioso: { etichetta: 'arioso', gutter: 16, pad: 18, bordo: 1, piatto: false, cardPad: 12 },
  medio: { etichetta: 'medio', gutter: 12, pad: 14, bordo: 1, piatto: false, cardPad: 10 },
  denso: { etichetta: 'denso', gutter: 8, pad: 10, bordo: 1, piatto: true, cardPad: 7 }
};

/* ---------------------------------------------------------------- i preset storici */

/* Le tre estetiche di prima, espresse come combinazioni. Restano il modo piu breve di dire
   "quella faccia li", e una spec che dichiara solo `aesthetic` renderizza come sempre. */
const PRESET = {
  'corporate-sober': { shell: 'rail', palette: 'navy-corporate', tipografia: 'sans-sistema', densita: 'medio' },
  'agency-modern': { shell: 'top', palette: 'dark-agency', tipografia: 'sans-sistema', densita: 'medio' },
  'executive-minimal': { shell: 'top', palette: 'carta-inchiostro', tipografia: 'sans-sistema', densita: 'medio' }
};

/** La pelle effettiva di una spec: il preset, piu gli assi che la spec sovrascrive. */
function pelleDi(spec) {
  const base = PRESET[spec.aesthetic];
  if (!base) throw new Error('aesthetic sconosciuta: "' + spec.aesthetic + '"');
  const s = Object.assign({}, base, spec.skin || {});
  if (!SHELLS[s.shell]) throw new Error('shell sconosciuta: "' + s.shell + '"');
  if (!FAMIGLIE[s.palette]) throw new Error('palette sconosciuta: "' + s.palette + '"');
  if (!TIPOGRAFIE[s.tipografia]) throw new Error('tipografia sconosciuta: "' + s.tipografia + '"');
  if (!DENSITA[s.densita]) throw new Error('densita sconosciuta: "' + s.densita + '"');
  return {
    id: s,
    shell: Object.assign({ id: s.shell }, SHELLS[s.shell]),
    tokens: palette(s.palette),
    tipo: Object.assign({ id: s.tipografia }, TIPOGRAFIE[s.tipografia]),
    densita: Object.assign({ id: s.densita }, DENSITA[s.densita])
  };
}

/* ---------------------------------------------------------------- la scelta, non a caso */

/** Seme stabile da una stringa: stesso brief, stessa pelle; brief diverso, pelle diversa. */
function seme(testo) {
  let h = 2166136261;
  const s = String(testo || '');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0);
}

/**
 * Sceglie una pelle dentro i vincoli della nicchia e del pubblico, ruotando col brief.
 *
 * Non e un generatore casuale: e una ROTAZIONE deterministica dentro un insieme gia ristretto.
 * Due brief diversi della stessa nicchia prendono combinazioni diverse; lo stesso brief prende
 * sempre la stessa. Il brand del cliente, quando c'e, vince su tutto e la scelta si limita al
 * resto degli assi.
 *
 * @param {object} v vincoli: { palette:[], tipografie:[], shell:[], densita:[], brief, brandPalette }
 */
function scegliPelle(v) {
  v = v || {};
  const s = seme(v.brief || '');
  const scegli = (lista, sale) => lista[(s >>> sale) % lista.length];
  const palettes = v.brandPalette ? [v.brandPalette] : (v.palette && v.palette.length ? v.palette : Object.keys(FAMIGLIE));
  const tipi = v.tipografie && v.tipografie.length ? v.tipografie : Object.keys(TIPOGRAFIE);
  const shells = v.shell && v.shell.length ? v.shell : Object.keys(SHELLS);
  const dens = v.densita && v.densita.length ? v.densita : Object.keys(DENSITA);
  return {
    palette: scegli(palettes, 0),
    tipografia: scegli(tipi, 7),
    shell: scegli(shells, 13),
    densita: scegli(dens, 19)
  };
}

module.exports = {
  SHELLS, FAMIGLIE, TIPOGRAFIE, DENSITA, PRESET,
  palette, pelleDi, scegliPelle, seme,
  mix, contrasto
};
