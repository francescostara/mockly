/* I token del design system della web app — UNICA fonte di verità.
 *
 * Il principio: l'app è una CORNICE quieta attorno a CONTENUTO vivido. Il mockup nel pannello
 * destro porta i colori del cliente finale; l'interfaccia non deve competerci né sembrare essa
 * stessa una dashboard. Il colore appartiene al contenuto, non alla cornice.
 *
 * La carta è calda, non neutra: l'asse è tarato sul prototipo. Un grigio neutro accanto a un
 * mockup con la sua palette legge come "spento"; una carta calda legge come carta.
 *
 * Perché i valori stanno qui e non in un .css: la route /design misura il contrasto di ogni
 * coppia e il test lo verifica. Se i valori vivessero in un foglio di stile e una copia qui,
 * la misura potrebbe restare verde mentre la pagina mostra altri colori. Il CSS lo genera
 * `tokensCss()` da questo file, quindi le due cose non possono divergere.
 *
 * I nomi sono RUOLI, non colori: "surface-raised", non "bianco". Un componente che scrive un
 * hex sta dichiarando che quel valore non cambia col tema — e quasi sempre si sbaglia.
 */

export type Theme = 'light' | 'dark';

/** A cosa serve la famiglia, non come è fatta. Il test ne ha bisogno: la soglia cromatica vale
 *  per la cornice e NON per gli stati, che sono cromatici per definizione. */
export type TokenKind = 'surface' | 'ink' | 'line' | 'focus' | 'state';

export type ColorToken = {
  /** il ruolo, come si usa nel CSS: var(--surface) */
  name: string;
  kind: TokenKind;
  light: string;
  dark: string;
  /** a cosa serve — la riga che evita l'uso a sentimento */
  role: string;
};

export const COLORS: ColorToken[] = [
  /* ---- superfici ---- */
  { name: 'surface', kind: 'surface', light: '#F7F6F3', dark: '#171614',
    role: 'il fondo della pagina — la carta su cui poggia tutto' },
  { name: 'surface-raised', kind: 'surface', light: '#FDFCFA', dark: '#1F1E1B',
    role: 'pannelli, barre, campi: UNO scalino sopra surface, mai due' },
  { name: 'surface-sunken', kind: 'surface', light: '#EDEBE6', dark: '#100F0E',
    role: 'il pozzo del mockup: rientra sempre rispetto a surface, in entrambi i temi' },
  { name: 'button-inverted-bg', kind: 'surface', light: '#232220', dark: '#F2F0EB',
    role: 'l unico elemento forte dell interfaccia: il fondo dell azione primaria' },
  { name: 'button-inverted-ink', kind: 'ink', light: '#F7F6F3', dark: '#171614',
    role: 'il testo sopra l azione primaria' },

  /* ---- inchiostro: tre livelli, tutti sopra AA nel PROPRIO tema ---- */
  { name: 'ink', kind: 'ink', light: '#1C1B19', dark: '#F2F0EB',
    role: 'testo primario e icone' },
  { name: 'ink-secondary', kind: 'ink', light: '#5A5751', dark: '#A8A399',
    role: 'valori, etichette, il costo in crediti di un chip — il registro intermedio che restituisce quiete senza scendere sotto AA' },
  { name: 'ink-muted', kind: 'ink', light: '#6A665F', dark: '#8F8A81',
    role: 'note e suggerimenti. È il MINIMO AA, non il grigio più chiaro che sta bene' },

  /* ---- linee: due ruoli, deliberatamente diversi ---- */
  { name: 'border-hairline', kind: 'line', light: '#E4E1DA', dark: '#2E2C28',
    role: 'divisori, bordi di pannello e di card, cornice del mockup — separa, non identifica' },
  { name: 'border-strong', kind: 'line', light: '#948E83', dark: '#6E6860',
    role: 'SOLO il perimetro dei controlli interattivi (campi, bottoni opzione, traccia del segmented, chip): lì il bordo È il controllo, quindi deve reggere 3:1' },

  { name: 'focus-ring', kind: 'focus', light: '#1C1B19', dark: '#F2F0EB',
    role: 'il contorno del focus da tastiera — inchiostro pieno, non un alone' },

  /* ---- stati semantici: definiti, riservati, oggi senza consumatori ---- */
  { name: 'state-success', kind: 'state', light: '#3F6B4A', dark: '#6FA37C',
    role: 'evento informativo riuscito — mai decorazione, mai enfasi' },
  { name: 'state-warning', kind: 'state', light: '#8A6A1F', dark: '#C9A24A',
    role: 'avviso che richiede attenzione — mai decorazione, mai enfasi' },
  { name: 'state-danger', kind: 'state', light: '#9B3A2E', dark: '#D4705E',
    role: 'errore o azione distruttiva — mai il solo segnale, al massimo il quarto' }
];

const NAMES = COLORS.map(c => c.name);
export type TokenName = string;

/* ---------- contrasto: sempre dentro un tema, mai fra due ---------- */

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/* privata di proposito: prende due hex e non sa da quale tema vengano. È la firma che ha
   prodotto l'errore di misura — un token del tema scuro confrontato con la carta chiara, con
   un numero che sembrava una bocciatura e non voleva dire niente. Fuori da qui non esce. */
function ratio(a: string, b: string): number {
  const lum = (hex: string) => {
    const h = hex.replace('#', '');
    return 0.2126 * channel(parseInt(h.slice(0, 2), 16)) +
           0.7152 * channel(parseInt(h.slice(2, 4), 16)) +
           0.0722 * channel(parseInt(h.slice(4, 6), 16));
  };
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

export function luminance(hex: string): number {
  const h = hex.replace('#', '');
  return 0.2126 * channel(parseInt(h.slice(0, 2), 16)) +
         0.7152 * channel(parseInt(h.slice(2, 4), 16)) +
         0.0722 * channel(parseInt(h.slice(4, 6), 16));
}

/** Un tema risolto per intero. Una volta che si ha questo, i due colori di un confronto
 *  vengono per costruzione dallo stesso tema: non c'è la strada per sbagliare. */
export type Palette = Readonly<Record<string, string>> & { readonly theme: Theme };

export function paletteFor(theme: Theme): Palette {
  const out: Record<string, string> = { theme };
  COLORS.forEach(c => { out[c.name] = theme === 'dark' ? c.dark : c.light; });
  return Object.freeze(out) as Palette;
}

/** L'UNICO modo pubblico di misurare due ruoli: entrambi risolti dalla stessa tavolozza.
 *  Il confronto fra temi non è "da evitare", è inesprimibile. */
export function contrastIn(theme: Theme, fg: string, bg: string): number {
  const p = paletteFor(theme);
  const a = p[fg], b = p[bg];
  if (!a) throw new Error('token "' + fg + '" non esiste');
  if (!b) throw new Error('token "' + bg + '" non esiste');
  return ratio(a, b);
}

export const valueOf = (name: string, theme: Theme): string => {
  const v = paletteFor(theme)[name];
  if (!v) throw new Error('token "' + name + '" non esiste');
  return v;
};

/* ---------- i contratti che devono reggere ---------- */

/** `min` è la soglia WCAG applicabile: 4.5 per il testo normale, 3 per il perimetro di un
 *  controllo (1.4.11). Non è documentazione: il test le verifica su ENTRAMBI i temi, ciascuno
 *  contro le proprie superfici, e /design le mostra. */
export type ContrastRule = { fg: string; bg: string; min: number; why: string };

const INKS = ['ink', 'ink-secondary', 'ink-muted'];
const SURFACES = ['surface', 'surface-raised', 'surface-sunken'];

/* Il pavimento: OGNI livello di inchiostro su OGNI superficie. Generato invece che elencato,
   così un quarto livello di grigio aggiunto domani è coperto dal giorno zero. */
const INK_FLOOR: ContrastRule[] = INKS.flatMap(fg =>
  SURFACES.map(bg => ({ fg, bg, min: 4.5, why: 'testo su superficie — pavimento AA' }))
);

export const CONTRACTS: ContrastRule[] = [
  ...INK_FLOOR,
  { fg: 'button-inverted-ink', bg: 'button-inverted-bg', min: 4.5, why: 'l azione primaria' },
  /* border-strong NON compare contro surface-sunken: nel pozzo non vivono controlli, e lì
     misurerebbe 2.73:1 nel tema chiaro. Vedi la regola in DESIGN.md. */
  { fg: 'border-strong', bg: 'surface', min: 3, why: 'perimetro di un controllo sulla pagina' },
  { fg: 'border-strong', bg: 'surface-raised', min: 3, why: 'perimetro di un controllo su un pannello' },
  { fg: 'focus-ring', bg: 'surface-raised', min: 3, why: 'il focus da tastiera deve vedersi' }
];

/** Ogni regola misurata su un tema: quello che /design mostra e che il test verifica. */
export function audit(theme: Theme) {
  return CONTRACTS.map(r => {
    const value = contrastIn(theme, r.fg, r.bg);
    return { ...r, theme, ratio: value, passes: value >= r.min };
  });
}

/** Il pozzo deve rientrare rispetto alla pagina in ENTRAMBI i temi: è la regola della cornice,
 *  e in scuro "rientrare" vuol dire più scuro, non più chiaro. */
export function sunkenRecedes(theme: Theme): boolean {
  const p = paletteFor(theme);
  return luminance(p['surface-sunken']) < luminance(p['surface']);
}

/* ---------- misure non cromatiche ---------- */

/* Nessuna ombra, nessun gradiente, nessun blur: la profondità è UNO scalino di superficie più
   un hairline. Quindi qui non esiste una scala di elevazione — è assente per scelta. */

/** Passi di 4px. Nomi, non numeri sparsi. */
export const SPACE: Record<string, string> = {
  '1': '4px', '2': '8px', '3': '12px', '4': '16px', '5': '20px', '6': '24px', '8': '32px', '10': '40px', '12': '48px'
};

/* ATTENZIONE — queste NON sono spaziature e non appartengono alla scala di 4.
   Sono dimensioni strutturali: l'altezza della barra e la larghezza del pannello sono decisioni
   di composizione, non passi di ritmo. Stanno in un gruppo separato apposta, perché prima o poi
   qualcuno prova a "correggere" 400px portandolo sulla scala — e romperebbe il layout invece di
   allinearlo. */
export const LAYOUT: Record<string, string> = {
  header: '48px',
  panel: '400px'
};

export const RADIUS: Record<string, string> = {
  sm: '4px', md: '8px', lg: '12px', pill: '999px'
};

/** Solo funzionale: dice che qualcosa è cambiato, non intrattiene. L'unica eccezione è la
 *  sequenza di generazione (`build`), che vive nel suo componente e non si propaga. */
export const MOTION: Record<string, string> = {
  'instant': '100ms', 'quick': '160ms', 'settle': '240ms', 'build': '750ms'
};

export const EASING: Record<string, string> = {
  out: 'ease-out',
  settle: 'cubic-bezier(.2,0,0,1)'
};

export const FONTS: Record<string, string> = {
  display: 'var(--font-display), Georgia, "Times New Roman", serif',
  text: 'var(--font-text), system-ui, -apple-system, "Segoe UI", sans-serif',
  mono: 'var(--font-mono), ui-monospace, "SFMono-Regular", Consolas, monospace'
};

/* ---------- pattern composti: ruoli, non hex nuovi ---------- */

/* Tre pattern che il layout richiede e che nessun singolo ruolo esprime. Stanno qui come
   composizioni dichiarate, così un componente li applica invece di reinventarli. */
export const PATTERNS: Array<{ name: string; parts: Array<[string, string]>; note: string }> = [
  {
    name: 'segmented control',
    parts: [
      ['traccia', 'surface-sunken, perimetro border-strong, radius-pill'],
      ['segmento selezionato', 'surface-raised, testo ink'],
      ['segmento non selezionato', 'trasparente, testo ink-muted']
    ],
    note: 'il selezionato NON usa button-inverted: la barra ne porterebbe tre, e l elemento forte deve restare uno per schermata'
  },
  {
    name: 'chip di raffinamento',
    parts: [
      ['perimetro', 'border-strong (è un controllo, non un divisore)'],
      ['etichetta', 'ink'],
      ['costo in crediti', 'ink-secondary, cifre mono tabellari']
    ],
    note: 'il costo NON usa ink-muted: credito e prezzo restano molto leggibili — è un difetto gia visto in revisione'
  },
  {
    name: 'pozzo del mockup',
    parts: [
      ['fondo', 'surface-sunken'],
      ['cornice', 'border-hairline (separa, non identifica: non è un controllo)']
    ],
    note: 'dentro c è l iframe del cliente, che il tema dell app non tocca mai'
  }
];

/* ---------- generazione del CSS ---------- */

const decl = (theme: Theme) => COLORS.map(c => '  --' + c.name + ': ' + (theme === 'dark' ? c.dark : c.light) + ';').join('\n');

/** Il foglio di variabili, generato da quanto sopra e iniettato dal layout. */
export function tokensCss(): string {
  const scale = (prefix: string, map: Record<string, string>) =>
    Object.entries(map).map(([k, v]) => '  --' + prefix + '-' + k + ': ' + v + ';').join('\n');

  return [
    ':root {',
    decl('light'),
    scale('space', SPACE),
    scale('layout', LAYOUT),
    scale('radius', RADIUS),
    scale('motion', MOTION),
    scale('easing', EASING),
    '  --font-display-stack: ' + FONTS.display + ';',
    '  --font-text-stack: ' + FONTS.text + ';',
    '  --font-mono-stack: ' + FONTS.mono + ';',
    '  color-scheme: light;',
    '}',
    '',
    '[data-theme="dark"] {',
    decl('dark'),
    '  color-scheme: dark;',
    '}'
  ].join('\n');
}

export { NAMES as TOKEN_NAMES };
