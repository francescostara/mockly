/* I token del design system della web app — UNICA fonte di verità.
 *
 * Il principio: l'app è una CORNICE monocroma quieta attorno a CONTENUTO vivido. Il mockup nel
 * pannello destro porta i colori del cliente finale; l'interfaccia non deve competerci né
 * sembrare essa stessa una dashboard. Il colore appartiene al contenuto, non alla cornice.
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

export type ColorToken = {
  /** il ruolo, come si usa nel CSS: var(--surface) */
  name: string;
  light: string;
  dark: string;
  /** a cosa serve — la riga che evita l'uso a sentimento */
  role: string;
};

/* Monocromo su un asse neutro leggermente caldo: la carta pura (#FFF su #F5F5F4) resta
   riconoscibile come "alzata" senza bisogno di un'ombra. */
export const COLORS: ColorToken[] = [
  { name: 'surface', light: '#F5F5F4', dark: '#121213',
    role: 'il fondo della pagina — la carta su cui poggia tutto' },
  { name: 'surface-raised', light: '#FFFFFF', dark: '#1B1B1D',
    role: 'pannelli, barre, campi: UNO scalino sopra surface, mai due' },
  { name: 'surface-sunken', light: '#EAEAE7', dark: '#0C0C0D',
    role: 'il palco dietro il mockup: incassato, così il contenuto galleggia senza ombre' },
  { name: 'ink', light: '#16161A', dark: '#F2F2F0',
    role: 'testo primario e icone' },
  { name: 'ink-muted', light: '#5C5C63', dark: '#A8A8A6',
    role: 'testo secondario — credito, prezzo, note. È il MINIMO AA, non il grigio più chiaro che sta bene' },
  { name: 'border-hairline', light: '#DEDEDA', dark: '#2C2C2F',
    role: 'la separazione fra superfici: 1px, mai più' },
  { name: 'border-strong', light: '#86868C', dark: '#6E6E72',
    role: 'il bordo di un controllo (campo, bottone secondario): deve essere visibile, non solo intuibile' },
  { name: 'button-inverted-bg', light: '#16161A', dark: '#F2F2F0',
    role: 'l unico elemento forte dell interfaccia: il fondo dell azione primaria' },
  { name: 'button-inverted-ink', light: '#FAFAF9', dark: '#121213',
    role: 'il testo sopra l azione primaria' },
  { name: 'focus-ring', light: '#16161A', dark: '#F2F2F0',
    role: 'il contorno del focus da tastiera — inchiostro pieno, non un alone' }
];

/* Le coppie che devono reggere. `min` è la soglia WCAG applicabile: 4.5 per il testo normale,
   3 per i bordi dei controlli e il testo grande (1.4.11 / 1.4.3). Non è documentazione: il
   test test/design-tokens.test.js le verifica su ENTRAMBI i temi, e /design le mostra. */
export type ContrastRule = { fg: string; bg: string; min: number; why: string };

export const CONTRACTS: ContrastRule[] = [
  { fg: 'ink', bg: 'surface', min: 4.5, why: 'testo primario sulla pagina' },
  { fg: 'ink', bg: 'surface-raised', min: 4.5, why: 'testo primario su un pannello' },
  { fg: 'ink-muted', bg: 'surface', min: 4.5, why: 'credito e prezzo sulla pagina' },
  { fg: 'ink-muted', bg: 'surface-raised', min: 4.5, why: 'credito e prezzo su un pannello' },
  { fg: 'ink', bg: 'surface-sunken', min: 4.5, why: 'testo sopra il palco del mockup' },
  { fg: 'button-inverted-ink', bg: 'button-inverted-bg', min: 4.5, why: 'l azione primaria' },
  { fg: 'border-strong', bg: 'surface', min: 3, why: 'il bordo di un controllo sulla pagina' },
  { fg: 'border-strong', bg: 'surface-raised', min: 3, why: 'il bordo di un controllo su un pannello' },
  { fg: 'focus-ring', bg: 'surface-raised', min: 3, why: 'il focus da tastiera deve vedersi' }
];

/* ---------- contrasto (WCAG 2.1, relative luminance) ---------- */

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrast(a: string, b: string): number {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

export const valueOf = (name: string, theme: Theme): string => {
  const t = COLORS.find(c => c.name === name);
  if (!t) throw new Error('token "' + name + '" non esiste');
  return theme === 'dark' ? t.dark : t.light;
};

/** Ogni regola misurata su un tema: quello che /design mostra e che il test verifica. */
export function audit(theme: Theme) {
  return CONTRACTS.map(r => {
    const ratio = contrast(valueOf(r.fg, theme), valueOf(r.bg, theme));
    return { ...r, theme, ratio, passes: ratio >= r.min };
  });
}

/* ---------- misure non cromatiche ---------- */

/* Nessuna ombra, nessun gradiente, nessun blur: la profondità è UNO scalino di superficie più
   un hairline. Quindi qui non esiste una scala di elevazione — è assente per scelta. */

/** Passi di 4px. Nomi, non numeri sparsi. */
export const SPACE: Record<string, string> = {
  '1': '4px', '2': '8px', '3': '12px', '4': '16px', '5': '20px', '6': '24px', '8': '32px', '10': '40px'
};

export const RADIUS: Record<string, string> = {
  sm: '4px', md: '8px', lg: '12px', pill: '999px'
};

/** Solo funzionale: dice che qualcosa è cambiato, non intrattiene. L'unica eccezione è
 *  l'animazione di generazione, che vive nel suo componente e non si propaga. */
export const MOTION: Record<string, string> = {
  'instant': '100ms', 'quick': '160ms', 'settle': '240ms'
};

export const FONTS: Record<string, string> = {
  display: 'var(--font-display), Georgia, "Times New Roman", serif',
  text: 'var(--font-text), system-ui, -apple-system, "Segoe UI", sans-serif',
  mono: 'var(--font-mono), ui-monospace, "SFMono-Regular", Consolas, monospace'
};

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
    scale('radius', RADIUS),
    scale('motion', MOTION),
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
