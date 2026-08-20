/* The intake questionnaire from skill/SKILL.md — asked ONCE, all items together, as chat
 * bubbles with tappable options. Entirely client-side: no model call, no credits.
 * The answers become structured context for the single paid call (Genera mockup). */

export type IntakeStep = {
  id: 'audience' | 'branding' | 'domain' | 'size' | 'comparison' | 'scope';
  question: string;
  hint?: string;
  /* 'text' steps take the free-text box instead of buttons */
  kind: 'options' | 'text';
  options?: { value: string; label: string; note?: string }[];
  /* an option that opens the free-text box for extra detail (e.g. brand colours) */
  followUp?: { whenValue: string; question: string };
};

export const INTAKE: IntakeStep[] = [
  {
    id: 'audience',
    kind: 'options',
    question: 'Chi userà il report?',
    hint: "Decide l'estetica e il livello di dettaglio.",
    options: [
      { value: 'board', label: 'Board / direzione', note: 'poche metriche, sintesi' },
      { value: 'manager', label: 'Manager operativo', note: 'dettaglio e filtri' },
      { value: 'analyst', label: 'Analista', note: 'densità alta' },
      { value: 'owner', label: 'Titolare non tecnico', note: 'chiarezza sopra tutto' }
    ]
  },
  {
    id: 'branding',
    kind: 'options',
    question: 'Il cliente ha colori di brand?',
    hint: 'Se non ci sono, scelgo una palette muta diversa dal solito.',
    options: [
      { value: 'none', label: 'No, scegli tu' },
      { value: 'navy', label: 'Blu / navy' },
      { value: 'teal', label: 'Verde / teal' },
      { value: 'bronze', label: 'Neutri caldi / bronzo' },
      { value: 'custom', label: 'Sì, ho dei colori' }
    ],
    followUp: { whenValue: 'custom', question: 'Scrivi i colori (es. #1F4E79 e #C08A2E, o "verde bosco e sabbia")' }
  },
  {
    id: 'domain',
    kind: 'text',
    question: 'Di cosa parla il report? Cosa deve far vedere o decidere?',
    hint: 'Più sei concreto meglio esce: settore, cosa ti chiede il cliente e — se li sai — gli strumenti da cui escono i dati (POS, gestionale, CRM, GA4, Meta, ERP, contabilità).'
  },
  {
    id: 'size',
    kind: 'options',
    question: 'Quanto è grande il cliente?',
    hint: 'Serve a capire quali dati è plausibile che abbia già: un negozio singolo non ha lo stesso storico di una catena.',
    options: [
      { value: 'small', label: 'Piccolo', note: 'una sede, pochi addetti' },
      { value: 'mid', label: 'Strutturato', note: 'più sedi o team dedicato' },
      { value: 'large', label: 'Grande', note: 'gruppo, CRM/ERP, BI già in casa' },
      { value: 'unknown', label: 'Non so', note: 'stima tu dal brief' }
    ]
  },
  {
    id: 'comparison',
    kind: 'options',
    question: 'Confronto temporale principale?',
    hint: 'Va sulle KPI card come YoY o MoM.',
    options: [
      { value: 'YoY', label: 'Anno su anno (YoY)' },
      { value: 'MoM', label: 'Mese su mese (MoM)' },
      { value: 'both', label: 'Entrambi', note: 'segue il livello selezionato' }
    ]
  },
  {
    id: 'scope',
    kind: 'options',
    question: 'Quanto deve essere ampio?',
    hint: 'Il drill-through sul dettaglio c\'è comunque.',
    options: [
      { value: 'single', label: 'Una pagina', note: 'consigliato' },
      { value: 'multi', label: 'Più pagine', note: 'focus analitici distinti' }
    ]
  }
];

export type IntakeAnswers = Partial<Record<IntakeStep['id'], string>> & { brandColors?: string };

export const AUDIENCE_LABEL: Record<string, string> = {
  board: 'board / direzione',
  manager: 'manager operativo',
  analyst: 'analista',
  owner: 'titolare non tecnico'
};

export const SIZE_LABEL: Record<string, string> = {
  small: 'piccolo (una sede, pochi addetti) — resta sul livello floor dei dati',
  mid: 'strutturato (più sedi o team dedicato) — floor + livello probabile',
  large: 'grande (gruppo, CRM/ERP/BI in casa) — anche il livello raro, se il brief lo conferma',
  unknown: 'non dichiarata — stimala dai segnali del brief'
};

export const PALETTE_LABEL: Record<string, string> = {
  none: 'nessun brand — scegli una famiglia muta',
  navy: 'blu / navy',
  teal: 'verde / teal',
  bronze: 'neutri caldi / bronzo',
  custom: 'colori del cliente'
};
