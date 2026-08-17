/* POST /api/generate — the only paid action in the app.
 *
 * The API key lives here and never reaches the client. The engine runs here too: the browser
 * only ever receives finished HTML.
 *
 * Flow: model -> parse -> build data -> validate -> render.
 * A failure at any step becomes ONE targeted repair turn (the exact errors, fed back).
 * If that also fails, a deterministic fallback spec is rendered. The route never 500s on a
 * bad generation — the user always gets a working mockup.
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildUserMessage, buildRepairMessage, PROMPT_STATS } from '@/lib/prompt';
import { callModel, extractJson, emptyUsage, addUsage, MODEL, type Turn, type Usage } from '@/lib/model';
import { checkAndRender } from '@/lib/validate';
import { buildFallback } from '@/lib/fallback';
import { record } from '@/lib/metering';
import { STUB_RESPONSE, STUB_BROKEN } from '@/lib/stub';
import type { IntakeAnswers } from '@/lib/intake';

export const runtime = 'nodejs';
/* generation runs 20-60s; Vercel Hobby caps at 60, Pro at 300 */
export const maxDuration = 300;

const stubbed = () => process.env.MOCKLY_STUB === '1' || process.env.MOCKLY_STUB === 'broken';

async function ask(turns: Turn[]): Promise<{ text: string; usage: Usage }> {
  if (process.env.MOCKLY_STUB === 'broken') return { text: STUB_BROKEN, usage: emptyUsage() };
  if (process.env.MOCKLY_STUB === '1') return { text: STUB_RESPONSE, usage: emptyUsage() };
  return callModel(turns);
}

export async function POST(req: NextRequest) {
  const started = Date.now();
  let body: { brief?: string; intake?: IntakeAnswers };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corpo della richiesta non valido.' }, { status: 400 });
  }

  const brief = (body.brief || '').slice(0, 4000);
  const intake = body.intake || {};

  let usage: Usage = emptyUsage();
  let repairs = 0;
  let fallback = false;
  let lastErrors: string[] = [];

  const turns: Turn[] = [{ role: 'user', content: buildUserMessage(brief, intake) }];
  let result: ReturnType<typeof checkAndRender> | null = null;

  /* attempt 1, then ONE targeted repair */
  for (let attempt = 0; attempt < 2; attempt++) {
    let answer: string;
    try {
      const out = await ask(turns);
      answer = out.text;
      usage = addUsage(usage, out.usage);
    } catch (err) {
      /* a transport/auth/refusal failure is not repairable by the model — go to fallback */
      lastErrors = [err instanceof Error ? err.message : String(err)];
      break;
    }

    try {
      const { spec, dataParams } = extractJson(answer);
      result = checkAndRender(spec, dataParams);
    } catch (err) {
      result = { ok: false, errors: [err instanceof Error ? err.message : String(err)] };
    }

    if (result.ok) break;

    lastErrors = result.errors;
    console.warn('[mockly:generate] tentativo', attempt + 1, 'rifiutato:', lastErrors.join(' | '));
    if (attempt === 0) {
      repairs = 1;
      turns.push({ role: 'assistant', content: answer });
      turns.push({ role: 'user', content: buildRepairMessage(lastErrors) });
    }
    result = null;
  }

  /* neither attempt produced a valid spec — never crash, always ship a mockup */
  if (!result || !result.ok) {
    fallback = true;
    const fb = buildFallback(intake);
    result = checkAndRender(fb.spec, fb.dataParams);
    if (!result.ok) {
      /* the fallback itself is broken: that is a bug in our own code, not in the generation */
      console.error('[mockly:generate] FALLBACK NON VALIDO', result.errors.join(' | '));
      return NextResponse.json({ error: 'Errore interno del generatore.', detail: result.errors }, { status: 500 });
    }
  }

  const meta = {
    model: stubbed() ? `stub:${process.env.MOCKLY_STUB}` : MODEL,
    valid: !fallback,
    repairs,
    fallback,
    errors: fallback ? lastErrors : [],
    latencyMs: Date.now() - started,
    systemPromptTokens: PROMPT_STATS.approxTokens,
    bytes: Buffer.byteLength(result.html),
    advisories: result.advisories,
    tieOut: (result.data as { tieOut?: unknown }).tieOut,
    ...usage
  };

  /* metering stub: one structured log line per generation + a per-process aggregate.
     These are the numbers that will set the credit price. */
  const session = record({
    model: meta.model, valid: meta.valid, repairs, fallback,
    tokensIn: usage.tokensIn, tokensOut: usage.tokensOut,
    cacheRead: usage.cacheRead, cacheWrite: usage.cacheWrite,
    costUsd: usage.costUsd, latencyMs: meta.latencyMs, bytes: meta.bytes
  });

  return NextResponse.json({ html: result.html, meta: { ...meta, session } });
}
