/* Scrive su disco il system prompt che verra davvero mandato al modello.
 *
 *   npx tsx test/prompt-dump.ts [file]     default: eval-out/system-prompt.txt
 *
 * Serve a guardarlo con gli occhi invece che fidarsi: quali sezioni contiene, in che
 * ordine, quanto pesa. Non chiama nessun modello e non costa niente.
 */
import fs from 'node:fs';
import path from 'node:path';
import { SYSTEM_PROMPT, PROMPT_STATS, buildUserMessage } from '../lib/prompt';

const out = process.argv[2] || path.join('eval-out', 'system-prompt.txt');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, SYSTEM_PROMPT);

const lines = SYSTEM_PROMPT.split('\n');
const marks = lines.map((l, i) => ({ l, i })).filter(x => x.l.startsWith('====='));

console.log('system prompt: ' + PROMPT_STATS.chars.toLocaleString('it-IT') + ' caratteri, ~' +
  PROMPT_STATS.approxTokens.toLocaleString('it-IT') + ' token (tutto in cache dopo la prima chiamata)');
console.log('');
marks.forEach((m, k) => {
  const end = k + 1 < marks.length ? marks[k + 1].i : lines.length;
  const chars = lines.slice(m.i, end).join('\n').length;
  console.log('  ' + String(Math.round(chars / 1024)).padStart(3) + ' KB  ' + m.l.replace(/=====/g, '').trim());
});

/* le nicchie devono essere davvero li dentro, non solo il titolo della sezione */
/* validate ("# Nicchia:") e starter ("### " nella sezione STARTER) */
const rows = SYSTEM_PROMPT.split(String.fromCharCode(10));
const starterAt = rows.findIndex(l => l.startsWith('# STARTER'));
const niches = rows.map((l, i) => ({ l, i }))
  .filter(x => x.l.startsWith('# Nicchia:') || (starterAt >= 0 && x.i > starterAt && x.l.startsWith('### ')))
  .map(x => (starterAt >= 0 && x.i > starterAt ? 'starter   ' : 'validata  ') +
    x.l.replace(/^#+ /, '').replace(/^Nicchia: /, '').split('(')[0].trim());
console.log('');
console.log('  nicchie caricate: ' + niches.length);
niches.forEach(n => console.log('    - ' + n));

const must = [
  ['procedura di riconoscimento', 'Identify the niche'],
  ['stima taglia/dati', 'data-availability.md'],
  ['un solo giro, niente domande', 'ONE SHOT, NO QUESTIONS BACK'],
  ['istruzioni pre-chat', 'Istruzioni pre-chat']
];
console.log('');
must.forEach(([what, needle]) =>
  console.log('  ' + (SYSTEM_PROMPT.includes(needle) ? 'ok ' : 'MANCA ') + what));

console.log('');
console.log('scritto in ' + out);
console.log('');
console.log('--- esempio di messaggio utente (la parte non cachata) ---');
console.log(buildUserMessage('Report per una palestra con tre sedi a Milano.',
  { audience: 'owner', branding: 'none', comparison: 'YoY', scope: 'single' } as never));
