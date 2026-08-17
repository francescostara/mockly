/* The single paid call: one request to the Anthropic API that returns { spec, dataParams }.
 *
 * The system prompt is byte-stable and cached (cache_control on the last system block), so the
 * ~10k-token grammar+judgement prefix bills at ~0.1x from the second call onward. */

import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from './prompt';

/** Sonnet 5 by default, per the brief. Override with MOCKLY_MODEL. */
export const MODEL = process.env.MOCKLY_MODEL || 'claude-sonnet-5';

/* Standard list price per million tokens. Sonnet 5 also has an introductory $2/$10 through
   2026-08-31 — metering with the standard rate keeps the credit estimate conservative. */
const PRICE: Record<string, { in: number; out: number }> = {
  'claude-sonnet-5': { in: 3, out: 15 },
  'claude-opus-5': { in: 5, out: 25 },
  'claude-haiku-4-5': { in: 1, out: 5 }
};

export type Usage = {
  tokensIn: number;
  tokensOut: number;
  cacheRead: number;
  cacheWrite: number;
  costUsd: number;
};

export function priceOf(model: string, u: Omit<Usage, 'costUsd'>): number {
  const p = PRICE[model] || PRICE['claude-sonnet-5'];
  /* cache writes bill at 1.25x input, cache reads at 0.1x */
  return (
    (u.tokensIn * p.in + u.cacheWrite * p.in * 1.25 + u.cacheRead * p.in * 0.1 + u.tokensOut * p.out) / 1e6
  );
}

export const emptyUsage = (): Usage => ({ tokensIn: 0, tokensOut: 0, cacheRead: 0, cacheWrite: 0, costUsd: 0 });

export function addUsage(a: Usage, b: Usage): Usage {
  return {
    tokensIn: a.tokensIn + b.tokensIn,
    tokensOut: a.tokensOut + b.tokensOut,
    cacheRead: a.cacheRead + b.cacheRead,
    cacheWrite: a.cacheWrite + b.cacheWrite,
    costUsd: a.costUsd + b.costUsd
  };
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      'ANTHROPIC_API_KEY non configurata. Mettila in .env.local per lo sviluppo locale ' +
      'e nelle Environment Variables del progetto Vercel per il deploy.'
    );
  }
  if (!client) client = new Anthropic();
  return client;
}

export type Turn = { role: 'user' | 'assistant'; content: string };

/** One call. `turns` carries the brief and, on a repair attempt, the previous answer + errors. */
export async function callModel(turns: Turn[]): Promise<{ text: string; usage: Usage }> {
  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: 16000,
    /* the cached prefix — one breakpoint on the last (only) system block */
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    /* medium keeps latency inside a serverless function's budget; the task is structured
       generation, not deep reasoning */
    output_config: { effort: 'medium' },
    messages: turns.map(t => ({ role: t.role, content: t.content }))
  });

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('');

  const raw = {
    tokensIn: res.usage.input_tokens ?? 0,
    tokensOut: res.usage.output_tokens ?? 0,
    cacheRead: res.usage.cache_read_input_tokens ?? 0,
    cacheWrite: res.usage.cache_creation_input_tokens ?? 0
  };

  if (res.stop_reason === 'refusal') throw new Error('Il modello ha rifiutato la richiesta.');

  return { text, usage: { ...raw, costUsd: priceOf(MODEL, raw) } };
}

/** Tolerant JSON extraction: the model is asked for bare JSON but may fence it. */
export function extractJson(text: string): { spec: unknown; dataParams: unknown } {
  let s = text.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first < 0 || last <= first) throw new Error('La risposta del modello non contiene JSON.');
  const parsed = JSON.parse(s.slice(first, last + 1));
  if (!parsed || typeof parsed !== 'object') throw new Error('Il JSON del modello non è un oggetto.');
  if (!parsed.spec || !parsed.dataParams) {
    throw new Error('Il JSON del modello non contiene entrambe le chiavi "spec" e "dataParams".');
  }
  return parsed as { spec: unknown; dataParams: unknown };
}
