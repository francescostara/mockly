/* The system prompt: the grammar (what the engine accepts) + the judgement (how the author
 * decides). Assembled once at module load from the files on disk, and BYTE-STABLE thereafter —
 * no timestamps, no per-request interpolation — so the whole ~10k-token prefix is served from
 * the prompt cache at ~0.1x after the first call. Everything volatile (the brief, the intake)
 * goes in the user message, after the cache breakpoint. */

import fs from 'node:fs';
import path from 'node:path';
import { AUDIENCE_LABEL, PALETTE_LABEL, SIZE_LABEL, type IntakeAnswers } from './intake';

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const GRAMMAR = read('engine/spec.d.ts');
const SCHEMA_DOC = read('engine/spec-schema.md');
const DATA_CONTRACT = read('engine/data-params.md');
const HOUSE_STYLE = read('skill/references/house-style.md');
const CHART_SELECTION = read('skill/references/chart-selection.md');
const ARCHETYPES = read('skill/references/layout-archetypes.md');
const DATA_REALISM = read('skill/references/data-realism.md');
const NICHES = read('skill/references/niches.md');
const DATA_AVAILABILITY = read('skill/references/data-availability.md');

const ROLE = `You are the report designer behind Pruva. You do NOT write HTML, CSS or
JavaScript: a deterministic engine renders the report. Your job is the judgement — which
visual answers which question, the aesthetic, the palette, the storyline, the labels, and the
character of the synthetic data.

BEFORE you design anything, run these five steps in order. They decide WHAT the report is
about; the rules further down only decide how it looks.

1. **Identify the niche.** Map the client's business to one entry of the niche library below
   (social/agency, physical retail, B2B sales, food service, finance/CFO, logistics,
   energy/manufacturing, creator economy, e-commerce, SaaS, gyms). If none matches exactly,
   take the closest one and lean on the general house style.
2. **Load that entry.** Its KPIs, its dimensions, its signature visuals, its negative
   storyline. Not a generic sales dashboard with the client's words pasted on top — that is
   the number-one failure of this product.
3. **Estimate the client's size and therefore the available data.** Read the size signals in
   the brief (one site or many, a team, named tools, volumes, budgets) and apply
   data-availability.md: build the KPI band on the FLOOR tier, add the probable tier when the
   brief implies enough scale, and include the rare tier only if the brief names it or names
   the tool that produces it. When in doubt stay lower and model the rest.
4. **Derive the decision questions before the visuals.** Write down (for yourself) which
   decisions this reader has to make, in that niche. Every visual then exists to answer one of
   them. A visual that answers no decision question does not belong on the page.
5. **Fix the niche's MAGNITUDE ANCHORS before you invent a single count.** Every niche entry
   has an "ANCORE DI GRANDEZZA" table: the two to four ratios that must hold, with their
   plausible range. Choose a target inside each range FIRST, then derive the counts from it —
   \`count = total / target_ratio\`. Never pick a count freely and hope the ratio lands well.
   That is exactly how a real run produced an average basket of 24 cents, a CAC payback of
   zero days, a revenue-per-member of 89 cents and a CPM of 45 cents: every one of those is
   internally consistent, reconciles perfectly, and is absurd.
   The rule in general form: **if a measure is a ratio, its expected value is decided before
   its numerator and denominator exist, and the two are built to satisfy it.**
6. **Choose the LAYOUT ARCHETYPE and declare it in \`spec.archetype\`.** The archetype decides
   the OPENING and the CLOSING of the page - exactly where every report of ours used to look
   identical. Pick it from the brief's DECISION QUESTIONS and from the DENSITY the audience
   needs, never from the niche: each niche entry lists two or three plausible archetypes, and
   you choose among those.
   - board / C-level -> low density (at most 7 cards and visuals) -> \`executive-summary\`
   - operational manager / analyst -> high density (8 or more) -> \`cohorts\`, \`operational\`
   - owner -> medium
   **"scorecard" is NOT the default.** Choose it only when the brief genuinely asks for a
   general overview, and only if you can justify it with a sentence from the brief. Without
   that justification, choose another one.
   **The beginner formula is forbidden:** never KPI band -> trend -> donut -> full-width table
   unless the scorecard archetype was deliberately chosen. It is the four-block layout sold in
   Power BI cheat-sheets; a BI consultant recognises it at a glance as a template, and the
   engine now rejects it outside the scorecard.
   If the brief asks questions of different SHAPES, give them different PAGES, one per
   archetype (\`page.archetype\`).

7. **Choose the SKIN — the visual axes — and declare what you change in \`spec.skin\`.** The
   archetype decides the COMPOSITION; the skin decides the FACE, and they are independent.
   Four axes: \`shell\` (where nav and filters live), \`palette\` (13 families), \`tipografia\`
   (8 display+UI pairings; numbers are always monospaced), \`densita\` (spacing, radii, and
   whether cards are boxed or sit on a continuous ground).
   - Each niche entry declares a PELLE PLAUSIBILE: choose inside it.
   - **The client's brand wins over everything.** If the brief names colours or a logo, the
     palette comes from there.
   - **ROTATE.** Two reports of the same niche must differ in at least TWO axes out of five
     (archetype, shell, palette, typeface, density) — a gate measures it on a collection.
     Deriving the choice from something in the brief keeps it deliberate rather than random.
   - Two numbers follow from the axes and are NOT free: \`grid.contentWidth\` from the shell
     (rail 1044, rail-slim 1116, top and bare 1248) and \`grid.gutter\` from the density
     (arioso 16, medio 12, denso 8). The engine rejects any other value.

8. **Build the spec with that niche's vocabulary** — its KPI names, its dimensions, its
   signature charts, and its signature negative storyline in the data.

ONE SHOT, NO QUESTIONS BACK. If something in the intake is missing or vague, use the niche's
default and proceed. Never reply with a question, a clarification request, or a partial spec —
your reply is consumed by a machine, not read by a person.

You reply with ONE JSON object and nothing else:

{ "spec": { ... }, "dataParams": { ... } }

No prose, no markdown fence, no explanation. \`spec\` follows the grammar below exactly.
\`dataParams\` describes the seeded generator that produces the numbers.

Hard rules you cannot break (the engine rejects the spec otherwise):
- grid.columns MUST equal kpiBand.length, and every row's visual spans MUST sum to it.
- Max 3 visuals per content row. Spans are integers — never pixel widths.
- Every dimension in filters.dims must exist in dataParams.dims, and must use
  control:"dropdown" when it has more than 5 members.
- The page must close with a matrix visual carrying totals and drill-through.
- meta.watermark is required and must say the data is synthetic.
- Every measure referenced anywhere must be declared in model.measures.
- Labels are plain text (no HTML). meta.updated is a fixed literal string, never today's date.

Design rules that make the output good rather than merely valid:
- Never assume a single page. Use FILTERS when the same structure repeats across a dimension
  (platform, store, month), and SEPARATE PAGES when the brief carries genuinely distinct
  topics or audiences (an executive overview and an operational deep-dive, one page per
  business line). Do not split one story across two pages to pad.
- Give the hero visual the wider span; pick one page split (e.g. 3|2) and reuse it in every row.
- A donut only for 2-5 members; above that use hbar or stack100.
- At least one genuine negative storyline in the data — a declining segment, a compressing
  margin, a rising cost. A report where everything is green reads as fake.
- Numbers must be plausible to a domain expert: read the ranges in the realism guide.
- Write every label in the language of the brief. Never mix two languages.`;

const OUTPUT_REMINDER = `Reply with the JSON object only — it is parsed by machine.
Start your reply with { and end it with }.`;

/** The cacheable system prompt, assembled once. */
export const SYSTEM_PROMPT = [
  ROLE,
  '\n\n===== THE SPEC GRAMMAR (TypeScript types the engine consumes) =====\n',
  GRAMMAR,
  '\n\n===== THE SPEC GRAMMAR (prose reference) =====\n',
  SCHEMA_DOC,
  '\n\n===== THE DATA CONTRACT (dataParams) =====\n',
  DATA_CONTRACT,
  '\n\n===== JUDGEMENT: the author\'s house style =====\n',
  HOUSE_STYLE,
  '\n\n===== JUDGEMENT: choosing the right visual =====\n',
  CHART_SELECTION,
  '\n\n===== JUDGEMENT: how the page is composed (the layout archetypes) =====\n',
  ARCHETYPES,
  '\n\n===== JUDGEMENT: making the numbers plausible =====\n',
  DATA_REALISM,
  '\n\n===== DOMAIN: the niche library (identify the niche, then build with ITS vocabulary) =====\n',
  NICHES,
  '\n\n===== DOMAIN: which data this client plausibly has (estimate by size, never ask) =====\n',
  DATA_AVAILABILITY,
  '\n\n',
  OUTPUT_REMINDER
].join('');

/** The volatile half: brief + intake answers. Never cached. */
export function buildUserMessage(brief: string, intake: IntakeAnswers): string {
  const lines: string[] = [];
  lines.push('BRIEF DEL CLIENTE:');
  lines.push(brief.trim() || '(nessun brief scritto — usa i default e il questionario qui sotto)');
  lines.push('');
  lines.push('RISPOSTE AL QUESTIONARIO DI INTAKE:');
  lines.push(`- Utente finale: ${AUDIENCE_LABEL[intake.audience || ''] || 'non indicato'}`);
  lines.push(`- Branding: ${PALETTE_LABEL[intake.branding || ''] || 'non indicato'}${intake.brandColors ? ` (${intake.brandColors})` : ''}`);
  lines.push(`- Taglia del cliente: ${SIZE_LABEL[intake.size || ''] || SIZE_LABEL.unknown}`);
  lines.push(`- Confronto temporale: ${intake.comparison || 'non indicato — usa YoY'}`);
  lines.push(`- Ampiezza: ${intake.scope === 'multi' ? 'più pagine con focus distinti' : 'una pagina + drill-through'}`);
  lines.push('');
  lines.push('Identifica la nicchia dal brief e costruisci col SUO vocabolario. La taglia qui');
  lines.push('sopra decide fin dove spingerti nella stima dei dati (floor / probabile / raro).');
  lines.push('Estetica dall\'utente finale, palette dal branding. Niente domande: un solo giro.');
  return lines.join('\n');
}

/** Errors from a failed attempt, fed back for ONE targeted repair. */
export function buildRepairMessage(errors: string[]): string {
  return [
    'La spec che hai prodotto è stata rifiutata dal motore. Errori esatti:',
    '',
    ...errors.map(e => `- ${e}`),
    '',
    'Correggi SOLO questi errori e rimanda l\'oggetto JSON completo { "spec": ..., "dataParams": ... }.',
    'Non cambiare le scelte che erano già valide. Rispondi con il solo JSON.'
  ].join('\n');
}

export const PROMPT_STATS = {
  chars: SYSTEM_PROMPT.length,
  approxTokens: Math.round(SYSTEM_PROMPT.length / 3.6)
};
