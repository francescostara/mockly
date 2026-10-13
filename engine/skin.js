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

/* IL PERIODO CORRENTE NON SI CONFONDE CON NESSUN MEMBRO (Bodan, 4 ott 2026: "2026 and Netherlands
   share the same color"). Si sceglie, fra alcuni neutri scuri e un ardesia, il primo lontano da ogni
   colore della serie (0,13) e dal grigio dell'anno prima (0,27); se nessuno ci riesce, quello che ci
   va piu vicino. Lo usa lo skin e, quando la spec porta la sua palette, il CSS dopo l'unione.
   Gate: test/interazioni.test.js. */
/* IL TOOLTIP: il primo colore della scala solo se il bianco ci sta sopra a 4,5:1; altrimenti
   l'inchiostro del report con il colore della card sopra. Era sempre var(--c1) con testo bianco:
   nelle famiglie scure il c1 e un giallo chiaro e il tooltip usciva bianco su giallo, circa 1,3:1
   (Fra, 13 ott 2026: "never do again the yellow white for the labels"). */
function scegliTip(t) {
  if (t.c1 && /^#[0-9a-f]{6}$/i.test(t.c1) && contrasto('#FFFFFF', t.c1) >= 4.5) return { tip: t.c1, tipInk: '#FFFFFF' };
  return { tip: t.ink, tipInk: t.card };
}

function scegliCur(t, serie) {
  const d = (x, y) => { const X = hex(x), Y = hex(y); return Math.hypot(X[0] - Y[0], X[1] - Y[1], X[2] - Y[2]) / 441.7; };
  const cand = [mix(t.ink, t.card, 0.18), t.ink, mix(t.ink, t.card, 0.32), mix(mix(t.ink, '#2B3A55', 0.55), t.card, 0.12),
    mix(mix(t.ink, '#3A5A9A', 0.6), t.card, 0.08), mix(mix(t.ink, '#55402B', 0.55), t.card, 0.12),
    mix(mix(t.ink, '#5B2B55', 0.6), t.card, 0.1), mix(t.ink, t.card, 0.42)]
    /* sul fondo chiaro anche tre scuri caldi: le palette tutte blu o tutte grigie non lasciano spazio
       ai neutri freddi */
    .concat(lum(t.card) > 0.5 ? ['#3B3F45', '#5A4A3A', '#6B3A2A', '#1F3A6B'] : []);
  const voto = c => { const sv = serie.filter(Boolean).map(x => d(c, x)); return Math.min(sv.length ? Math.min(...sv) / 0.13 : 9, d(c, t.prior) / 0.27); };
  return cand.find(c => voto(c) >= 1) || cand.reduce((a2, c) => voto(c) > voto(a2) ? c : a2, cand[0]);
}

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

/* Le famiglie dichiarano la CORNICE — superficie, inchiostro, rail, raggio — e la BASE
   categoriale da cui derivano la loro scala. La scala non si scrive a mano: si sceglie da una
   base misurata (Okabe-Ito, Tol, i due qualitativi di ColorBrewer marcati colorblind-safe) e
   poi si verifica. `engine/colore.js` fa la scelta e `test/palette.test.js` la mette alla prova
   su tutte e tredici: 3:1 contro la superficie, DeltaE76 >= 10 fra le voci sotto le tre
   dicromazie, e >= 8 di chiarezza in scala di grigi, perche un report si stampa.
   Il numero di voci non e una quota: e quante ne reggono la verifica, fra tre e sei.

   Cio che DAVVERO distingue una famiglia dall'altra e la cornice, non la scala. E' il prezzo
   dell'accessibilita, ed e onesto pagarlo: i categoriali sicuri sono pochi, e improvvisarne di
   nuovi per avere tredici tavolozze diverse significherebbe avere tredici tavolozze illeggibili. */
const COL = require('./colore.js');

const BASI = {
  okabe: Object.values(COL.OKABE_ITO),
  tolBright: COL.TOL_BRIGHT,
  tolMuted: COL.TOL_MUTED,
  tolLight: COL.TOL_LIGHT,
  dark2: COL.BREWER_DARK2,
  paired: COL.BREWER_PAIRED
};

const FAMIGLIE = {
  'navy-corporate': {
    etichetta: 'navy corporate', scuro: false, radius: '2px', base: 'okabe', sequenziale: 'cividis',
    canvas: '#EDF0F4', card: '#FFFFFF', ink: '#16202E', rail: '#0E2439'
  },
  'slate-freddo': {
    etichetta: 'slate freddo', scuro: false, radius: '3px', base: 'tolMuted', sequenziale: 'cividis',
    canvas: '#EEF1F3', card: '#FFFFFF', ink: '#1B2429', rail: '#243239'
  },
  'warm-taupe': {
    etichetta: 'warm neutral / taupe', scuro: false, radius: '4px', base: 'paired', sequenziale: 'viridis',
    canvas: '#F3F0EB', card: '#FFFDFA', ink: '#241F1A', rail: '#2E2721'
  },
  'carta-inchiostro': {
    etichetta: 'editoriale carta e inchiostro', scuro: false, radius: '0px', base: 'okabe', sequenziale: 'viridis',
    canvas: '#FBFAF7', card: '#FFFFFF', ink: '#14171A', rail: '#14171A'
  },
  'dark-agency': {
    etichetta: 'dark agency', scuro: true, radius: '6px', base: 'tolLight', sequenziale: 'viridis',
    canvas: '#111420', card: '#191D2B', ink: '#EDF0F7', rail: '#151A28'
  },
  'dark-tecnico': {
    etichetta: 'dark tecnico, blu profondo', scuro: true, radius: '3px', base: 'okabe', sequenziale: 'cividis',
    canvas: '#0B1220', card: '#131C2E', ink: '#DCE6F5', rail: '#0A1220'
  },
  terroso: {
    etichetta: 'terroso, ocra e ruggine', scuro: false, radius: '3px', base: 'paired', sequenziale: 'viridis',
    canvas: '#F5EFE6', card: '#FFFCF7', ink: '#2A1F16', rail: '#3A2A1C'
  },
  salvia: {
    /* base tolMuted e non dark2: su una carta quasi bianca dark2 regge solo quattro voci
       verificate, e un report con cinque categorie si ritroverebbe due colori uguali — che e
       peggio di un colore meno "salvia". La cornice resta verde, i dati restano leggibili. */
    etichetta: 'verde salvia', scuro: false, radius: '4px', base: 'tolMuted', sequenziale: 'viridis',
    canvas: '#EFF2ED', card: '#FCFDFB', ink: '#1C241C', rail: '#263324'
  },
  'jewel-desaturati': {
    etichetta: 'jewel tones desaturati', scuro: false, radius: '3px', base: 'tolMuted', sequenziale: 'viridis',
    canvas: '#F1EFF2', card: '#FFFFFF', ink: '#211D26', rail: '#2B2333'
  },
  'monocromo-accento': {
    etichetta: 'monocromo con un accento', scuro: false, radius: '2px', base: 'okabe', sequenziale: 'cividis',
    canvas: '#F4F4F4', card: '#FFFFFF', ink: '#1A1A1A', rail: '#1A1A1A'
  },
  'alto-contrasto': {
    etichetta: 'alto contrasto', scuro: false, radius: '0px', base: 'paired', sequenziale: 'cividis',
    canvas: '#FFFFFF', card: '#FFFFFF', ink: '#000000', rail: '#000000', minimo: 4.5
  },
  'pastello-sobrio': {
    /* Il caso piu a rischio sul 3:1, e per questo NON parte da una base pastello: parte da Tol
       Light e la fa scurire quanto serve dalla verifica. Il pastello resta nella cornice —
       superficie, rail, sfumature — dove non deve reggere nessun dato. */
    etichetta: 'pastello sobrio', scuro: false, radius: '6px', base: 'tolLight', sequenziale: 'viridis',
    canvas: '#F6F4F8', card: '#FFFFFF', ink: '#2A2733', rail: '#3A3547'
  },
  'blu-ghiaccio': {
    etichetta: 'blu ghiaccio, chiaro e freddo', scuro: false, radius: '3px', base: 'tolBright', sequenziale: 'cividis',
    canvas: '#F2F6FA', card: '#FFFFFF', ink: '#152430', rail: '#1B3243'
  }
};

/* UNA PALETTE SI CALCOLA UNA VOLTA. La scala categoriale passa per le simulazioni delle tre
   dicromazie e del grigio: una ventina di millisecondi a famiglia. Il controllo "un colore per
   membro" consulta tutte e tredici le famiglie per dire quali ne hanno sei, e ogni validazione
   costava cosi cinquanta millisecondi — la meta del tempo della suite di test. La palette e una
   funzione pura del nome: si ricorda, e si restituisce una copia, perche chi la riceve possa
   modificarla senza sporcare la memoria. */
const MEMO_PALETTE = {};
function palette(id, opz) {
  if (opz) return calcolaPalette(id, opz);
  if (!MEMO_PALETTE[id]) MEMO_PALETTE[id] = calcolaPalette(id);
  const t = Object.assign({}, MEMO_PALETTE[id]);
  if (t.serie) t.serie = t.serie.slice();
  return t;
}

/** Da otto valori dichiarati alla scala completa dei token. */
function calcolaPalette(id, opz) {
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
    /* IL PERIODO PRECEDENTE E GRIGIO, in ogni grafico e in ogni palette. E' il termine di
       paragone, non un dato: colorarlo gli da un significato che non ha. Il colline lo
       disegnava nel quinto colore della scala, che nel navy-corporate e un verde pieno — e il
       2024 in verde accanto al 2025 in ocra si leggeva come "l'anno buono" (Parsa, 27 set
       2026). Un token solo per il trend tratteggiato e per la colonna del colline; il gate
       test/periodo-precedente.test.js lo vuole neutro in tutte e tredici le famiglie. */
    prior: mix(ink, card, 0.58),
    /* IL PERIODO CORRENTE E ANTRACITE, in ogni grafico nel tempo e in ogni palette (convenzione
       IBCS dei report finance: effettivo scuro pieno, anno prima grigio chiaro). Usava il secondo
       colore della palette, che e anche il colore del secondo membro di ogni dimensione: "2026" e
       "Netherlands" avevano lo stesso colore (Bodan, 4 ott 2026). I colori della palette restano ai
       membri. Gate: test/assi.test.js. */
    cur: mix(ink, card, 0.18),
    /* lo sfondo delle colonne di budget: una velatura fredda leggera, che non si confonde con il
       grigio dell'anno prima ne con i gradini della formattazione condizionale */
    bud: mix(mix(ink, '#2F6FB0', 0.5), card, 0.9),
    /* flab e l'etichetta dei filtri: 8,5px, maiuscoletto, spaziata — la dimensione piu
       piccola dell'intera cornice. Un grigio da "testo secondario" li non basta, e il gate
       dell'harness lo misura: sotto 4,5:1 la riga dei filtri diventa decorazione. */
    flab: mix(ink, card, 0.34),
    rail, railInk: mix(rail, '#FFFFFF', 0.80),
    /* La stessa etichetta minuscola vive in due posti con fondi opposti: sulla riga dei filtri
       (superficie chiara) e dentro la rail (superficie scura). Un token solo non puo servirli
       entrambi — provarci significa sceglierne uno e lasciare l'altro illeggibile. */
    flabRail: mix(rail, '#FFFFFF', 0.66),
    /* L'ACCENTO DELLA CORNICE non viene dai dati. Finche la scala categoriale era scritta a
       mano succedeva di rubarle un colore per la voce di menu attiva, e il risultato era
       accettabile per caso; con le scale verificate quel colore puo essere un magenta pieno, e
       la navigazione si accende come un'insegna. La cornice si tinge di se stessa: un gradino
       piu chiaro della rail, che appartiene alla stessa famiglia e non compete con nessun
       grafico. */
    chrome: mix(rail, '#FFFFFF', 0.30),
    chromeInk: '#FFFFFF',
    radius: f.radius
  };

  /* GLI STATI OPPOSTI NON SONO ROSSO E VERDE. E' la coppia che sparisce per prima, ed e ancora
     la piu diffusa nei report: qui il positivo e blu e il negativo e arancio-rosso, che restano
     separati sotto tutte e tre le dicromazie e anche in stampa. Il rosso pieno resta, ma per
     SEGNALARE UN PROBLEMA — non per fare coppia col verde. */
  const minimo = f.minimo || 3;
  t.good = COL.aggiusta(COL.STATI.positivo, card, 4.5);
  t.bad = COL.aggiusta(COL.STATI.negativo, card, 4.5);
  t.alert = COL.aggiusta(COL.STATI.allarme, card, 4.5);
  /* SOPRA IL TARGET VERDE, SOTTO ROSSO (Luca, 6 ott 2026: "in generale"). Lo stato rispetto a un
     bersaglio e l'unico posto dove la casa usa la coppia verde/rosso: accanto restano sempre la
     freccia o il segno, per chi non distingue i due colori. */
  t.ok = COL.aggiusta('#1E8449', card, 4.5);
  t.ko = COL.aggiusta('#C0392B', card, 4.5);
  t.amber = COL.aggiusta(COL.STATI.attenzione, card, 4.5);

  /* La scala categoriale: scelta da una base misurata e verificata, mai inventata. */
  const serie = COL.serieCVD(BASI[f.base], card, 6, { minimo, senzaRosso: true });
  serie.forEach((c, i) => { t['c' + (i + 1)] = c; });
  /* i visual chiedono fino a sei colori: la coda si ripete invece di inventare tinte nuove che
     nessuno ha verificato */
  for (let k = serie.length; k < 6; k++) t['c' + (k + 1)] = serie[k % serie.length];
  t.serie = serie;
  t.cur = scegliCur(t, serie);
  Object.assign(t, scegliTip(t));

  /* SEQUENZIALE: Viridis o Cividis, percettivamente uniformi. Sostituiscono qualunque rampa
     arcobaleno e valgono per la heatmap e per le celle heat della matrice — dove il messaggio
     e "piu o meno", non "questo o quello". */
  const seq = f.sequenziale === 'cividis' ? COL.CIVIDIS : COL.VIRIDIS;
  t.seq1 = seq[0]; t.seq2 = seq[1]; t.seq3 = seq[2]; t.seq4 = seq[3]; t.seq5 = seq[4];
  /* I GRADINI DELLA HEAT: cinque, non tre. Con tre, una mappa i cui valori stanno vicini
     diventa un muro di due tinte — il difetto trovato dalla revisione sulla ritenzione per
     coorte. Restano velature sulla superficie, perche la cella deve lasciar leggere il numero
     che le sta sopra; e siccome la rampa sale in luminanza in modo monotono, i cinque gradini
     si distinguono anche in stampa. */
  /* Si vela sempre verso UNA tinta sola, a intensita crescente, non verso cinque stop diversi
     della rampa: cinque stop hanno cinque luminanze proprie, e mescolati alla superficie danno
     salti irregolari — fra il terzo e il quarto gradino ne usciva uno da 0,2, cioe due celle
     identiche. Con una tinta sola la scala di chiarezza e monotona per costruzione, che e la
     proprieta per cui una heatmap si legge.
     La direzione la decide la superficie: su carta chiara si scurisce, su fondo scuro si
     schiarisce, e in entrambi i casi ci si ferma prima del punto in cui la cifra sopra la cella
     smette di staccare. */
  const tinta = scuro ? seq[3] : seq[1];
  const veli = scuro ? [0.10, 0.20, 0.30, 0.40, 0.52] : [0.07, 0.16, 0.27, 0.40, 0.56];
  veli.forEach((q, i) => { t['heat' + (i + 1)] = mix(card, tinta, q); });
  /* L'inchiostro delle cifre sui gradini carichi: si sceglie misurando, non per convenzione —
     sul quinto gradino di una famiglia chiara il nero tiene, su una scura tiene il bianco, e su
     qualche famiglia intermedia la risposta non e quella che ci si aspetta. */
  t.heatInk = COL.contrasto('#FFFFFF', t.heat5) > COL.contrasto(ink, t.heat5) ? '#FFFFFF' : ink;
  /* LA FETTA "ALTRI". Non e una categoria: e la somma di tutto cio che non e in testa. Quindi non
     prende un colore dalla scala categoriale — prenderlo vorrebbe dire presentarla come un
     cliente o un canale come gli altri — ma un grigio neutro, impastato da carta e inchiostro
     della pelle, cosi sta bene su ogni famiglia. Deve comunque staccare dalla card (3:1, la
     soglia WCAG per gli elementi grafici), e la cifra sopra si sceglie misurando. */
  t.altri = COL.aggiusta(mix(card, ink, 0.30), card, 3);
  t.altriInk = COL.contrasto('#FFFFFF', t.altri) > COL.contrasto(ink, t.altri) ? '#FFFFFF' : ink;
  /* i tre nomi storici restano: la matrice li usa, e cambiare due visual insieme e il modo
     migliore per non capire quale dei due ha rotto qualcosa */
  t.heatLo = t.heat1; t.heatMid = t.heat3; t.heatHi = t.heat5;

  /* DIVERGENTE: due tinte con punto medio neutro, per varianza e scostamenti dal bersaglio. */
  const div = COL.DIV_BLU_ARANCIO;
  t.div1 = div[0]; t.div2 = div[1]; t.div3 = scuro ? mix(card, '#FFFFFF', 0.10) : div[2];
  t.div4 = div[3]; t.div5 = div[4];
  return t;
}

/* ---------------------------------------------------------------- 3. TIPOGRAFIA */

/* Otto abbinamenti, uno per caso d'uso. Le regole che li governano non sono di gusto:
 *
 *   - I NUMERI USANO SEMPRE CIFRE TABULARI E LINING. Le proporzionali fanno ballare le colonne
 *     — un valore che cambia sposta l'etichetta accanto, e il movimento sembra un errore del
 *     report. Le oldstyle, comuni nei serif, hanno cifre che salgono e scendono: illeggibili in
 *     tabella, nei tooltip e sui tick degli assi.
 *   - MASSIMO DUE FAMIGLIE per mockup, piu la mono per i numeri se distinta. Tre famiglie sono
 *     il segnale che si sta risolvendo con la tipografia un problema di gerarchia.
 *   - SANS PER NUMERI ED ETICHETTE, sempre. Il serif e ammesso nei titoli e nel testo di
 *     supporto, mai su una cifra.
 *   - ZERO E O MAIUSCOLA devono restare distinguibili.
 *
 * VIETATI, e il test lo verifica: Montserrat (cifre proporzionali, colonne disallineate),
 * Raleway (cifre oldstyle), i serif display ad alto contrasto (Didot, Bodoni: i tratti sottili
 * spariscono a 9px), i pesi thin e hairline, e i condensati nelle tabelle numeriche.
 *
 * NOTA SULLA CONSEGNA, che e un vincolo di prodotto e non una preferenza: il mockup e UN file
 * solo e non fa nessuna richiesta di rete. Quindi i caratteri non si scaricano — si NOMINANO,
 * e chi li ha installati li vede. Ogni pila finisce con un ripiego di sistema scelto per
 * somigliare al primo nome, cosi il report resta quello che deve essere anche su una macchina
 * spoglia: Inter ripiega su Segoe UI, Merriweather su Georgia, IBM Plex Mono su Consolas.
 * Incorporare i woff2 in base64 costerebbe fra i 30 e i 60KB per famiglia — su un file che ne
 * pesa 60 in tutto e una decisione di prodotto, non una scelta tecnica.
 */
const SIST = '"Segoe UI","Segoe UI Web (West European)",-apple-system,BlinkMacSystemFont,Roboto,"Helvetica Neue",Arial,sans-serif';
const SERIF = 'Georgia,"Times New Roman",serif';
const MONO_SIST = 'Consolas,"Cascadia Mono","SF Mono",Menlo,"DejaVu Sans Mono",monospace';

const TIPOGRAFIE = {
  /* 1. il default sicuro: denso e leggibile a 11-13px, dove vive questo prodotto */
  'neutro-ui': {
    etichetta: 'Neutro-UI — Inter', uso: 'il default sicuro, qualunque nicchia',
    display: 'Inter,"Inter var","Segoe UI Variable",' + SIST, ui: 'Inter,' + SIST, num: 'Inter,' + SIST
  },
  /* 2. manifattura, energia, logistica: la mono sui numeri e la firma del tecnico */
  tecnico: {
    etichetta: 'Tecnico — IBM Plex Sans + IBM Plex Mono', uso: 'manifattura, energia, logistica',
    display: '"IBM Plex Sans",' + SIST, ui: '"IBM Plex Sans",' + SIST,
    num: '"IBM Plex Mono",' + MONO_SIST
  },
  /* 3. serif nei titoli, sans nel resto: il sistema del data-journalism, il piu facile da far
     funzionare perche la gerarchia la fa il contrasto fra le due famiglie */
  editoriale: {
    etichetta: 'Editoriale — Merriweather + Source Sans 3', uso: 'immobiliare, racconto, report da leggere',
    display: 'Merriweather,' + SERIF, ui: '"Source Sans 3","Source Sans Pro",' + SIST,
    num: '"Source Sans 3","Source Sans Pro",' + SIST
  },
  /* 4. neutro fino a sparire: e cio che un CFO vuole */
  corporate: {
    etichetta: 'Corporate sobrio — Roboto', uso: 'CFO, board, finanziario',
    display: 'Roboto,' + SIST, ui: 'Roboto,' + SIST, num: 'Roboto,' + SIST
  },
  /* 5. caldo senza essere informale */
  umanista: {
    etichetta: 'Umanista caldo — Lato', uso: 'F&B, retail, palestre, consumo',
    display: 'Lato,' + SIST, ui: 'Lato,' + SIST, num: 'Lato,' + SIST
  },
  /* 6. istituzionale: Public Sans nasce per i documenti pubblici americani */
  grottesco: {
    etichetta: 'Grottesco moderno — Public Sans / Noto Sans', uso: 'istituzionale, social, agenzia',
    display: '"Public Sans","Noto Sans",' + SIST, ui: '"Public Sans","Noto Sans",' + SIST,
    num: '"Public Sans","Noto Sans",' + SIST
  },
  /* 7. massima precisione tabellare: report densi e finanziari */
  'mono-numerico': {
    etichetta: 'Mono-numerico — Source Sans 3 + JetBrains Mono', uso: 'report densi, finanziario',
    display: '"Source Sans 3","Source Sans Pro",' + SIST, ui: '"Source Sans 3","Source Sans Pro",' + SIST,
    num: '"JetBrains Mono",' + MONO_SIST
  },
  /* 8. il serif che regge il fondo scuro: Lora ha tratti piu uniformi di un Didot */
  'serif-scuro': {
    etichetta: 'Serif editoriale scuro — Lora + Open Sans', uso: 'report a tema scuro',
    display: 'Lora,' + SERIF, ui: '"Open Sans",' + SIST, num: '"Open Sans",' + SIST
  }
};

/* I nomi vecchi continuano a risolvere: le spec scritte prima non si rompono per un cambio di
   nomenclatura, e il rinvio a un abbinamento nuovo e sempre quello piu vicino di carattere. */
const ALIAS_TIPO = {
  'sans-sistema': 'neutro-ui', 'serif-display': 'editoriale', condensato: 'grottesco',
  humanist: 'umanista', geometrico: 'grottesco', slab: 'editoriale'
};

/* ---------------------------------------------------------------- 4. DENSITA */

/* Il ritmo: quanto respira la pagina. Tocca le spaziature — che il fit deve conoscere, perche
   il gutter entra nel conto delle altezze — e il peso dell'ombra.
   NON tocca piu il BORDO. La densita "densa" toglieva il riquadro alle card e le appoggiava a
   un fondo continuo: era una faccia in piu, ed era anche un lettore lasciato a indovinare dove
   finisce un grafico e comincia quello accanto. La regola ora e senza eccezioni — ogni card ha
   un confine visibile — quindi il denso stringe le spaziature e perde l'ombra, non il bordo. */
const DENSITA = {
  arioso: { etichetta: 'arioso', gutter: 16, pad: 18, bordo: 1, ombra: true, cardPad: 12 },
  medio: { etichetta: 'medio', gutter: 12, pad: 14, bordo: 1, ombra: true, cardPad: 10 },
  denso: { etichetta: 'denso', gutter: 8, pad: 10, bordo: 1, ombra: false, cardPad: 7 }
};

/* La banda KPI ammette DUE forme, e sono l'asse che il denso non porta piu: quattro riquadri
   separati, oppure una superficie sola divisa da separatori interni. Entrambe legittime; la
   scelta vale per l'intera pagina — mai meta e meta, che e l'unico modo di sbagliarla. */
const BANDE = {
  box: { etichetta: 'riquadri separati' },
  blocco: { etichetta: 'blocco unico con separatori' }
};

/* ---------------------------------------------------------------- i preset storici */

/* Le tre estetiche di prima, espresse come combinazioni. Restano il modo piu breve di dire
   "quella faccia li", e una spec che dichiara solo `aesthetic` renderizza come sempre. */
const PRESET = {
  'corporate-sober': { shell: 'rail', palette: 'navy-corporate', tipografia: 'neutro-ui', densita: 'medio', banda: 'box' },
  'agency-modern': { shell: 'top', palette: 'dark-agency', tipografia: 'neutro-ui', densita: 'medio', banda: 'box' },
  'executive-minimal': { shell: 'top', palette: 'carta-inchiostro', tipografia: 'neutro-ui', densita: 'medio', banda: 'box' }
};

/**
 * LA FAMIGLIA BRAND-DRIVEN: i colori del cliente, validati prima di essere usati.
 *
 * "Manipolare cio che esiste e gratis": incollare i propri esadecimali e deterministico, non
 * chiama nessun modello, non costa crediti. Ma non puo nemmeno essere preso per buono — i
 * colori di un marchio sono scelti per un logo, non per una barra da dodici pixel su carta
 * bianca, e un rosa di brand su fondo chiaro sta spesso a 2:1.
 *
 * Quindi: si accettano, si CORREGGONO dove non reggono, e la correzione si DICHIARA. Un mockup
 * illeggibile consegnato "perche i colori li ha dati il cliente" resta un mockup illeggibile,
 * e chi lo riceve non pensa "che bel rispetto del brand".
 *
 * @param {string[]} colori  gli esadecimali del cliente, dal piu importante
 * @param {object}   opz     { scuro: bool, base: id di una base CVD-safe per completare la scala }
 * @returns {{ tokens: object, correzioni: Array<{da,a,contrastoPrima,contrastoDopo}> }}
 */
function famigliaBrand(colori, opz) {
  opz = opz || {};
  const scuro = !!opz.scuro;
  const card = scuro ? '#191D2B' : '#FFFFFF';
  const canvas = scuro ? '#111420' : '#F4F5F7';
  const ink = scuro ? '#EDF0F7' : '#16202E';
  const primo = (colori && colori[0]) || (scuro ? '#4C6FE0' : '#12304F');

  /* La cornice nasce dal colore principale, ma sfumata: una rail nella tinta piena del marchio
     e una parete di colore, e tutto cio che le sta sopra deve combatterci. */
  const rail = scuro ? mix(primo, '#000000', 0.72) : mix(primo, '#101418', 0.55);

  const correzioni = [];
  const validati = (colori || []).map(c => {
    const prima = COL.contrasto(c, card);
    const corretto = COL.aggiusta(c, card, 3);
    if (corretto !== c) {
      correzioni.push({
        da: c, a: corretto,
        contrastoPrima: Number(prima.toFixed(2)),
        contrastoDopo: Number(COL.contrasto(corretto, card).toFixed(2))
      });
    }
    return corretto;
  });

  /* La scala si completa da una base misurata: due colori di marca non fanno una scala
     categoriale, e inventare le voci mancanti attorno alla tinta del cliente e il modo piu
     rapido di ritrovarsi due categorie indistinguibili. */
  const serie = validati.slice(0, 3);
  /* si completa da piu basi sicure, finche la scala arriva a sei: con una sola base un marchio
     scuro lasciava cinque colori, e un report con sei valute veniva rifiutato (Luca, 6 ott 2026) */
  [opz.base || 'okabe', 'tolBright', 'tolMuted', 'dark2', 'paired', 'tolLight'].filter((b, i, a) => BASI[b] && a.indexOf(b) === i).forEach(b => {
    COL.serieCVD(BASI[b], card, 6, { minimo: 3 }).forEach(c => {
      if (serie.length >= 6) return;
      /* si aggiunge solo cio che resta distinguibile da tutto il resto */
      if (serie.every(s => COL.separati(s, c).ok)) serie.push(c);
    });
  });

  const f = { etichetta: 'brand del cliente', scuro, radius: '3px', base: 'okabe',
    sequenziale: 'viridis', canvas, card, ink, rail };
  FAMIGLIE.__brand = f;
  const tokens = calcolaPalette('__brand');   /* mai dalla memoria: due marchi avrebbero gli stessi token */
  delete FAMIGLIE.__brand;
  serie.forEach((c, i) => { tokens['c' + (i + 1)] = c; });
  for (let k = serie.length; k < 6; k++) tokens['c' + (k + 1)] = serie[k % serie.length];
  tokens.serie = serie;
  return { tokens, correzioni, serie };
}

/** La pelle effettiva di una spec: il preset, piu gli assi che la spec sovrascrive. */
function pelleDi(spec) {
  const base = PRESET[spec.aesthetic];
  if (!base) throw new Error('aesthetic sconosciuta: "' + spec.aesthetic + '"');
  const s = Object.assign({}, base, spec.skin || {});
  if (ALIAS_TIPO[s.tipografia]) s.tipografia = ALIAS_TIPO[s.tipografia];
  if (!SHELLS[s.shell]) throw new Error('shell sconosciuta: "' + s.shell + '"');
  if (!FAMIGLIE[s.palette]) throw new Error('palette sconosciuta: "' + s.palette + '"');
  if (!TIPOGRAFIE[s.tipografia]) throw new Error('tipografia sconosciuta: "' + s.tipografia + '"');
  if (!DENSITA[s.densita]) throw new Error('densita sconosciuta: "' + s.densita + '"');
  if (!BANDE[s.banda || 'box']) throw new Error('banda KPI sconosciuta: "' + s.banda + '"');
  return {
    id: s,
    shell: Object.assign({ id: s.shell }, SHELLS[s.shell]),
    /* I COLORI UFFICIALI DEL CLIENTE (Luca, 6 ott 2026: "il layout andrebbe adattato ai colori
       ufficiali della banca"). `skin.brand` e l'elenco degli esadecimali del marchio, dal piu
       importante: la cornice nasce dal primo, la scala dei membri parte dai loro e si completa con
       colori sicuri; quelli che non reggono il contrasto si correggono (famigliaBrand). */
    tokens: Array.isArray(s.brand) && s.brand.length ? (() => {
      /* IL LAYOUT PRENDE I COLORI DEL CLIENTE, I DATI NO. Con i vincoli di distinguibilita (anche per
         chi non vede bene i colori) un marchio lascia quattro o cinque tinte, non sei: forzare la
         scala dei membri sul marchio rendeva illeggibile un report con sei valute. Quindi la
         cornice — rail, intestazione attiva, etichette della rail — nasce dal marchio, la scala dei
         dati resta quella verificata della palette. */
      const tk = palette(s.palette), br = famigliaBrand(s.brand, { scuro: !!FAMIGLIE[s.palette].scuro }).tokens;
      ['rail', 'railInk', 'flabRail', 'chrome', 'chromeInk'].forEach(k => { if (br[k]) tk[k] = br[k]; });
      tk.brand = s.brand[0];
      return tk;
    })() : palette(s.palette),
    tipo: Object.assign({ id: s.tipografia }, TIPOGRAFIE[s.tipografia]),
    densita: Object.assign({ id: s.densita }, DENSITA[s.densita]),
    banda: Object.assign({ id: s.banda || 'box' }, BANDE[s.banda || 'box'])
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
    densita: scegli(dens, 19),
    banda: scegli(v.banda && v.banda.length ? v.banda : Object.keys(BANDE), 23)
  };
}

module.exports = { scegliCur, scegliTip,
  SHELLS, FAMIGLIE, TIPOGRAFIE, DENSITA, BANDE, PRESET, ALIAS_TIPO, famigliaBrand,
  palette, pelleDi, scegliPelle, seme,
  mix, contrasto
};
