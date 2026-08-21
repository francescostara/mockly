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
import { callModel, extractJson, emptyUsage, addUsage, ConfigError, TransientError, resolveModel, type Turn, type Usage } from '@/lib/model';
import { checkAndRender } from '@/lib/validate';
import { buildFallback } from '@/lib/fallback';
import { record } from '@/lib/metering';
import { STUB_RESPONSE, STUB_BROKEN } from '@/lib/stub';
import type { IntakeAnswers } from '@/lib/intake';

export const runtime = 'nodejs';
/* generation runs 20-60s; Vercel Hobby caps at 60, Pro at 300 */
export const maxDuration = 300;

const stubbed = () => process.env.MOCKLY_STUB === '1' || process.env.MOCKLY_STUB === 'broken';

async function ask(turns: Turn[], model: string): Promise<{ text: string; usage: Usage }> {
  if (process.env.MOCKLY_STUB === 'broken') return { text: STUB_BROKEN, usage: emptyUsage() };
  if (process.env.MOCKLY_STUB === '1') return { text: STUB_RESPONSE, usage: emptyUsage() };
  return callModel(turns, model);
}

export async function POST(req: NextRequest) {
  const started = Date.now();
  let body: { brief?: string; intake?: IntakeAnswers; model?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corpo della richiesta non valido.' }, { status: 400 });
  }

  const brief = (body.brief || '').slice(0, 4000);
  const intake = body.intake || {};

  /* the model may be chosen per request (the eval harness drives this); anything outside the
     allowlist is refused rather than forwarded to the API */
  let model: string;
  try {
    model = resolveModel(body.model);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }

  let usage: Usage = emptyUsage();
  let repairs = 0;
  let fallback = false;
  let lastErrors: string[] = [];
  /* Il JSON grezzo di ogni tentativo rifiutato. Nel primo eval a pagamento restava solo il
     messaggio d errore nel log del server: si sapeva CHE una dim era vuota, non come il
     modello l aveva scritta. Esce dalla risposta solo con MOCKLY_TRACE=1 (l harness lo
     accende), cosi in produzione la risposta non porta in giro l output grezzo del modello. */
  const rejected: Array<{ attempt: number; raw: string; errors: string[] }> = [];

  /* PUNTO D INNESTO (non attivo) — riconoscimento nicchia come mini-chiamata separata.
     Oggi la nicchia la riconosce questo stesso passo, leggendo la libreria dal prefisso
     cachato. Per spezzarlo in due: lib/niche.ts, NICHE_CALL_ENABLED, poi passare l etichetta
     a buildUserMessage. Resta spento finche l eval, con le stesse soglie, non dice che
     conviene: il prezzo per token non e una prova. */
  const turns: Turn[] = [{ role: 'user', content: buildUserMessage(brief, intake) }];
  let result: ReturnType<typeof checkAndRender> | null = null;

  /* attempt 1, then ONE targeted repair */
  for (let attempt = 0; attempt < 2; attempt++) {
    let answer: string;
    try {
      const out = await ask(turns, model);
      answer = out.text;
      usage = addUsage(usage, out.usage);
    } catch (err) {
      /* account problems (no key, rejected key, no credit) and upstream hiccups are NOT
         generation failures: say so loudly instead of serving a fallback mockup forever and
         looking like the model is broken */
      if (err instanceof ConfigError) {
        console.error('[mockly:generate] configurazione:', err.message);
        return NextResponse.json({ error: err.message, config: true }, { status: 503 });
      }
      if (err instanceof TransientError) {
        console.warn('[mockly:generate] temporaneo:', err.message);
        return NextResponse.json({ error: err.message, retry: true }, { status: 503 });
      }
      /* a transport/refusal failure is not repairable by the model — go to fallback */
      lastErrors = [err instanceof Error ? err.message : String(err)];
      rejected.push({ attempt: attempt + 1, raw: '', errors: lastErrors });
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
    rejected.push({ attempt: attempt + 1, raw: answer, errors: lastErrors });
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
    model: stubbed() ? `stub:${process.env.MOCKLY_STUB}` : model,
    valid: !fallback,
    repairs,
    fallback,
    errors: fallback ? lastErrors : [],
    latencyMs: Date.now() - started,
    systemPromptTokens: PROMPT_STATS.approxTokens,
    bytes: Buffer.byteLength(result.html),
    advisories: result.advisories,
    tieOut: (result.data as { tieOut?: unknown }).tieOut,
    ...(process.env.MOCKLY_TRACE === '1' ? { rejected } : {}),
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
