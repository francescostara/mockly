/* Le stringhe della cornice, nelle due lingue.
 *
 * L'app si costruisce in inglese e si verifica in italiano: l'italiano è quasi sempre la
 * stringa più lunga ("Genera il mockup" contro "Generate"), quindi è quello che decide se un
 * controllo va a capo. Ogni misura di un controllo si guarda con la lingua italiana attiva.
 *
 * Qui c'è solo la cornice. Le domande dell'intake vivono in lib/intake.ts, che è contenuto di
 * prodotto e non interfaccia.
 */

export type Lang = 'it' | 'en';

export const LANG_KEY = 'pruva-lang';

export type Strings = {
  tagline: string;
  credits: string;
  creditsNote: string;
  themeLight: string;
  themeDark: string;
  briefTitle: string;
  briefStep: (n: number, of: number) => string;
  emptyHead: string;
  emptyLead: string;
  startGuided: string;
  startGuidedNote: string;
  startFree: string;
  startFreeNote: string;
  edit: string;
  send: string;
  skip: string;
  generate: string;
  generating: string;
  restart: string;
  download: string;
  share: string;
  regenerate: string;
  freeText: string;
  freeTextExtra: string;
  ready: string;
  readyLead: string;
  refine: string;
  refineMoreCorporate: string;
  refineAddMargin: string;
  refineDenser: string;
  refinePlaceholder: string;
  sendRefinement: string;
  oneCredit: string;
  stageEmpty: string;
  stageEmptyNote: string;
  localNote: string;
  fallbackNote: string;
  doneNote: string;
  generated: string;
  free: string;
  size: string;
};

const it: Strings = {
  tagline: 'mockup di dashboard BI',
  credits: 'crediti',
  creditsNote: 'la chat non costa nulla',
  themeLight: 'Chiaro',
  themeDark: 'Scuro',
  briefTitle: 'Brief guidato',
  briefStep: (n, of) => n + ' di ' + of,
  emptyHead: 'Il cliente non riesce ancora a immaginare il report.',
  emptyLead: 'Scegli da dove partire.',
  startGuided: 'Brief guidato',
  startGuidedNote: 'gratis, senza limiti',
  startFree: 'Scrivilo a parole tue',
  startFreeNote: 'una frase basta',
  edit: 'Modifica',
  send: 'Invia',
  skip: 'Salta, decidi tu',
  generate: 'Genera il mockup',
  generating: 'Genero…',
  restart: 'Ricomincia',
  download: 'Scarica',
  share: 'Condividi',
  regenerate: 'Rigenera',
  freeText: 'Descrivi il report…',
  freeTextExtra: 'Vuoi aggiungere qualcosa al brief?',
  ready: 'Mockup pronto.',
  readyLead: 'Guardalo qui accanto, oppure scaricalo e mandalo al cliente.',
  refine: 'Raffina',
  refineMoreCorporate: 'Più corporate',
  refineAddMargin: 'Aggiungi il margine',
  refineDenser: 'Più denso',
  refinePlaceholder: 'Cosa cambieresti?',
  sendRefinement: 'Invia la modifica',
  oneCredit: '1 cr',
  stageEmpty: 'Il mockup appare qui',
  stageEmptyNote: 'interattivo, e si scarica come file singolo',
  localNote: 'Le domande non consumano crediti: si paga solo la generazione.',
  fallbackNote: 'Il modello non ha prodotto una spec valida: questo è un mockup di riserva.',
  doneNote: 'Clicca dentro il mockup: le fette e le righe filtrano, il tasto destro sulla matrice apre il dettaglio.',
  generated: 'GENERATO',
  free: 'GRATIS',
  size: '1280 × 720'
};

const en: Strings = {
  tagline: 'BI dashboard mockups',
  credits: 'credits',
  creditsNote: 'the chat is free',
  themeLight: 'Light',
  themeDark: 'Dark',
  briefTitle: 'Guided brief',
  briefStep: (n, of) => n + ' of ' + of,
  emptyHead: 'Your client cannot picture the report yet.',
  emptyLead: 'Choose how to start.',
  startGuided: 'Guided brief',
  startGuidedNote: 'free, unlimited',
  startFree: 'Write it in your own words',
  startFreeNote: 'one sentence is enough',
  edit: 'Edit',
  send: 'Send',
  skip: 'Skip, you decide',
  generate: 'Generate the mockup',
  generating: 'Generating…',
  restart: 'Start over',
  download: 'Download',
  share: 'Share',
  regenerate: 'Regenerate',
  freeText: 'Describe the report…',
  freeTextExtra: 'Anything to add to the brief?',
  ready: 'Mockup ready.',
  readyLead: 'Review it beside, or download it and send it to the client.',
  refine: 'Refine',
  refineMoreCorporate: 'More corporate',
  refineAddMargin: 'Add a margin view',
  refineDenser: 'Denser',
  refinePlaceholder: 'What would you change?',
  sendRefinement: 'Send refinement',
  oneCredit: '1 cr',
  stageEmpty: 'Your mockup appears here',
  stageEmptyNote: 'interactive, and it downloads as a single file',
  localNote: 'The questions cost no credits: you only pay for the generation.',
  fallbackNote: 'The model did not produce a valid spec: this is a fallback mockup.',
  doneNote: 'Click inside the mockup: slices and rows filter, right-click a matrix row for the detail.',
  generated: 'GENERATED',
  free: 'FREE',
  size: '1280 × 720'
};

export const STRINGS: Record<Lang, Strings> = { it, en };
