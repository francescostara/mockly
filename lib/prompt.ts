/* The system prompt: the grammar (what the engine accepts) + the judgement (how the author
 * decides). Assembled once at module load from the files on disk, and BYTE-STABLE thereafter —
 * no timestamps, no per-request interpolation — so the whole ~10k-token prefix is served from
 * the prompt cache at ~0.1x after the first call. Everything volatile (the brief, the intake)
 * goes in the user message, after the cache breakpoint. */

import fs from 'node:fs';
import path from 'node:path';
import { AUDIENCE_LABEL, PALETTE_LABEL, type IntakeAnswers } from './intake';

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const GRAMMAR = read('engine/spec.d.ts');
const SCHEMA_DOC = read('engine/spec-schema.md');
const DATA_CONTRACT = read('engine/data-params.md');
const HOUSE_STYLE = read('skill/references/house-style.md');
const CHART_SELECTION = read('skill/references/chart-selection.md');
const DATA_REALISM = read('skill/references/data-realism.md');

const ROLE = `You are the report designer behind Mockly. You do NOT write HTML, CSS or
JavaScript: a deterministic engine renders the report. Your job is the judgement — which
visual answers which question, the aesthetic, the palette, the storyline, the labels, and the
character of the synthetic data.

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
- ONE page unless the brief carries genuinely distinct analytical focuses.
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
  '\n\n===== JUDGEMENT: making the numbers plausible =====\n',
  DATA_REALISM,
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
  lines.push(`- Confronto temporale: ${intake.comparison || 'non indicato — usa YoY'}`);
  lines.push(`- Ampiezza: ${intake.scope === 'multi' ? 'più pagine con focus distinti' : 'una pagina + drill-through'}`);
  lines.push('');
  lines.push('Scegli l\'estetica dall\'utente finale, la palette dal branding, i KPI e i grafici');
  lines.push('dal dominio. Rispondi con il solo oggetto JSON { "spec": ..., "dataParams": ... }.');
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
