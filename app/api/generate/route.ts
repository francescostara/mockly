/* POST /api/generate — the only paid action in the app.
 *
 * The API key lives here and never reaches the client. The engine runs here too: the browser
 * only ever receives finished HTML. */

import { NextRequest, NextResponse } from 'next/server';
import { buildUserMessage, PROMPT_STATS } from '@/lib/prompt';
import { callModel, extractJson, emptyUsage, addUsage, MODEL, type Turn, type Usage } from '@/lib/model';
import { STUB_RESPONSE } from '@/lib/stub';
import { engine, dataBuilder } from '@/lib/engine';
import type { IntakeAnswers } from '@/lib/intake';

export const runtime = 'nodejs';
/* generation runs 20-60s; Vercel Hobby caps at 60, Pro at 300 */
export const maxDuration = 300;

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

  try {
    const turns: Turn[] = [{ role: 'user', content: buildUserMessage(brief, intake) }];

    let text: string;
    if (process.env.MOCKLY_STUB === '1') {
      text = STUB_RESPONSE;                       /* dev: no API key, no credits */
    } else {
      const out = await callModel(turns);
      text = out.text;
      usage = addUsage(usage, out.usage);
    }

    const { spec, dataParams } = extractJson(text);

    /* expand the declared generator, then render — both server-side, both deterministic */
    const data = dataBuilder.build(dataParams);
    const html = engine.render(spec, data);
    const advisories = engine.lint(spec, data);

    const meta = {
      model: process.env.MOCKLY_STUB === '1' ? 'stub' : MODEL,
      valid: true,
      repairs: 0,
      fallback: false,
      latencyMs: Date.now() - started,
      systemPromptTokens: PROMPT_STATS.approxTokens,
      bytes: Buffer.byteLength(html),
      advisories,
      tieOut: (data as { tieOut?: unknown }).tieOut,
      ...usage
    };
    console.log('[mockly:generate]', JSON.stringify(meta));

    return NextResponse.json({ html, meta });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[mockly:generate] failed', message);
    return NextResponse.json({ error: message, meta: { ...usage, latencyMs: Date.now() - started } }, { status: 500 });
  }
}
