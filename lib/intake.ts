/* The intake questionnaire from skill/SKILL.md — asked ONCE, all items together, as chat
 * bubbles with tappable options. Entirely client-side: no model call, no credits.
 * The answers become structured context for the single paid call (Genera mockup). */

export type IntakeStep = {
  id: 'audience' | 'branding' | 'domain' | 'size' | 'comparison' | 'scope';
  /* L'italiano e la lingua d'autore: e quella che finisce nel prompt e quella su cui si
     dimensionano i controlli, perche e quasi sempre la stringa piu lunga. L'inglese e una
     traduzione della sola interfaccia — i valori (`value`) non cambiano mai. */
  question: string;
  questionEn: string;
  hint?: string;
  hintEn?: string;
  /* 'text' steps take the free-text box instead of buttons */
  kind: 'options' | 'text';
  options?: { value: string; label: string; labelEn: string; note?: string; noteEn?: string }[];
  /* an option that opens the free-text box for extra detail (e.g. brand colours) */
  followUp?: { whenValue: string; question: string; questionEn: string };
};

export const INTAKE: IntakeStep[] = [
  {
    id: 'audience',
    kind: 'options',
    question: 'Chi userà il report?',
    questionEn: 'Who will use the report?',
    hint: "Decide l'estetica e il livello di dettaglio.",
    hintEn: 'It decides the aesthetic and the level of detail.',
    options: [
      { value: 'board', label: 'Board / direzione', labelEn: 'Board / leadership', note: 'poche metriche, sintesi', noteEn: 'few metrics, synthesis' },
      { value: 'manager', label: 'Manager operativo', labelEn: 'Operational manager', note: 'dettaglio e filtri', noteEn: 'detail and filters' },
      { value: 'analyst', label: 'Analista', labelEn: 'Analyst', note: 'densità alta', noteEn: 'high density' },
      { value: 'owner', label: 'Titolare non tecnico', labelEn: 'Non-technical owner', note: 'chiarezza sopra tutto', noteEn: 'clarity above all' }
    ]
  },
  {
    id: 'branding',
    kind: 'options',
    question: 'Il cliente ha colori di brand?',
    questionEn: 'Does the client have brand colours?',
    hint: 'Se non ci sono, scelgo una palette muta diversa dal solito.',
    hintEn: 'If there are none, I pick a muted palette that is not the usual one.',
    options: [
      { value: 'none', label: 'No, scegli tu', labelEn: 'No, you choose' },
      { value: 'navy', label: 'Blu / navy', labelEn: 'Blue / navy' },
      { value: 'teal', label: 'Verde / teal', labelEn: 'Green / teal' },
      { value: 'bronze', label: 'Neutri caldi / bronzo', labelEn: 'Warm neutrals / bronze' },
      { value: 'custom', label: 'Sì, ho dei colori', labelEn: 'Yes, I have colours' }
    ],
    followUp: { whenValue: 'custom', question: 'Scrivi i colori (es. #1F4E79 e #C08A2E, o "verde bosco e sabbia")', questionEn: 'Write the colours (e.g. #1F4E79 and #C08A2E, or "forest green and sand")' }
  },
  {
    id: 'domain',
    kind: 'text',
    question: 'Di cosa parla il report? Cosa deve far vedere o decidere?',
    questionEn: 'What is the report about? What should it show, or help decide?',
    hint: 'Più sei concreto meglio esce: settore, cosa ti chiede il cliente e — se li sai — gli strumenti da cui escono i dati (POS, gestionale, CRM, GA4, Meta, ERP, contabilità).',
    hintEn: 'The more concrete, the better: the sector, what the client is asking for, and — if you know them — the tools the data comes from (POS, ERP, CRM, GA4, Meta, accounting).'
  },
  {
    id: 'size',
    kind: 'options',
    question: 'Quanto è grande il cliente?',
    questionEn: 'How big is the client?',
    hint: 'Serve a capire quali dati è plausibile che abbia già: un negozio singolo non ha lo stesso storico di una catena.',
    options: [
      { value: 'small', label: 'Piccolo', labelEn: 'Small', note: 'una sede, pochi addetti', noteEn: 'one location, few staff' },
      { value: 'mid', label: 'Strutturato', labelEn: 'Established', note: 'più sedi o team dedicato', noteEn: 'several sites or a dedicated team' },
      { value: 'large', label: 'Grande', labelEn: 'Large', note: 'gruppo, CRM/ERP, BI già in casa', noteEn: 'group, CRM/ERP, BI already in house' },
      { value: 'unknown', label: 'Non so', labelEn: 'Not sure', note: 'stima tu dal brief', noteEn: 'estimate it from the brief' }
    ]
  },
  {
    id: 'comparison',
    kind: 'options',
    question: 'Confronto temporale principale?',
    questionEn: 'Main time comparison?',
    hint: 'Va sulle KPI card come YoY o MoM.',
    hintEn: 'It goes on the KPI cards as YoY or MoM.',
    options: [
      { value: 'YoY', label: 'Anno su anno (YoY)', labelEn: 'Year over year (YoY)' },
      { value: 'MoM', label: 'Mese su mese (MoM)', labelEn: 'Month over month (MoM)' },
      { value: 'both', label: 'Entrambi', labelEn: 'Both', note: 'segue il livello selezionato', noteEn: 'follows the selected level' }
    ]
  },
  {
    id: 'scope',
    kind: 'options',
    question: 'Quanto deve essere ampio?',
    questionEn: 'How broad should it be?',
    hint: 'Il drill-through sul dettaglio c\'è comunque.',
    options: [
      { value: 'single', label: 'Una pagina', labelEn: 'One page', note: 'consigliato', noteEn: 'recommended' },
      { value: 'multi', label: 'Più pagine', labelEn: 'Several pages', note: 'focus analitici distinti', noteEn: 'distinct analytical focuses' }
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
