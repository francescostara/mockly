/* The single paid call: one request to the Anthropic API that returns { spec, dataParams }.
 *
 * The system prompt is byte-stable and cached (cache_control on the last system block), so the
 * ~10k-token grammar+judgement prefix bills at ~0.1x from the second call onward. */

import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from './prompt';

/** Sonnet 5 by default, per the brief. Override with MOCKLY_MODEL. */
export const MODEL = process.env.MOCKLY_MODEL || 'claude-sonnet-5';

/** Short names a caller may ask for. Anything outside this list is refused: the model id
 *  reaches the API and bills the account, so it is never taken from the request verbatim. */
export const MODEL_ALIASES: Record<string, string> = {
  sonnet: 'claude-sonnet-5',
  haiku: 'claude-haiku-4-5',
  opus: 'claude-opus-5'
};

/** Resolve a caller-supplied model name (alias or full id) against the allowlist. */
export function resolveModel(requested?: string): string {
  if (!requested) return MODEL;
  const id = MODEL_ALIASES[requested] || requested;
  if (!Object.values(MODEL_ALIASES).includes(id)) {
    throw new ConfigError(
      `Modello "${requested}" non ammesso. Valori validi: ${Object.keys(MODEL_ALIASES).join(', ')}.`
    );
  }
  return id;
}

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

/** An account or deployment problem (missing/rejected key, no credit), not a generation
 *  problem: it must NOT be papered over with the fallback mockup, or the app looks like it
 *  works while quietly serving the same generic report forever. */
export class ConfigError extends Error {}

/** A temporary upstream problem (rate limit, overload). Retrying later works; a fallback
 *  mockup would hide the fact that nothing is actually wrong with the request. */
export class TransientError extends Error {}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new ConfigError(
      'ANTHROPIC_API_KEY non configurata. In locale mettila in .env.local; su Vercel in ' +
      'Settings → Environment Variables, poi rilancia il deploy.'
    );
  }
  if (!client) client = new Anthropic();
  return client;
}

export type Turn = { role: 'user' | 'assistant'; content: string };

/** One call. `turns` carries the brief and, on a repair attempt, the previous answer + errors. */
export async function callModel(turns: Turn[], model: string = MODEL): Promise<{ text: string; usage: Usage }> {
  try {
    return await request(turns, model);
  } catch (err) {
    throw classify(err);
  }
}

/* Everything the API can reject us for, sorted into "you must fix something" vs "try again
   later" vs "the model wrote something bad". Only the last one deserves the fallback mockup. */
function classify(err: unknown): unknown {
  if (err instanceof Anthropic.AuthenticationError) {
    return new ConfigError(
      'La chiave ANTHROPIC_API_KEY è stata rifiutata (401). Controlla di aver incollato una ' +
      'chiave API di console.anthropic.com — inizia con "sk-ant-" — senza spazi o virgolette, ' +
      'poi rilancia il deploy.'
    );
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return new ConfigError(
      'La chiave ANTHROPIC_API_KEY non ha i permessi necessari (403) per questo modello. ' +
      'Controlla il workspace su console.anthropic.com.'
    );
  }
  /* no credit arrives as a 400, not a 402 — it is an account problem, not a bad request */
  if (err instanceof Anthropic.BadRequestError && /credit balance/i.test(err.message || '')) {
    return new ConfigError(
      'Il workspace Anthropic non ha credito. L\'API è prepagata e separata dall\'abbonamento a ' +
      'Claude: aggiungi credito su console.anthropic.com/settings/billing e riprova. ' +
      'Non serve rilanciare il deploy.'
    );
  }
  if (err instanceof Anthropic.RateLimitError) {
    return new TransientError('Troppe richieste verso l\'API in questo momento. Riprova tra qualche minuto.');
  }
  if (err instanceof Anthropic.InternalServerError) {
    return new TransientError('L\'API di Anthropic è momentaneamente sovraccarica. Riprova tra qualche minuto.');
  }
  return err;
}

const EMIT_TOOL = 'emit_report';

async function request(turns: Turn[], model: string): Promise<{ text: string; usage: Usage }> {
  /* In streaming, non con create(): con un max_tokens alto l'SDK rifiuta le richieste non
     streaming (stima che possano superare i 10 minuti) e lancia un errore prima ancora di
     chiamare l'API. Lo streaming toglie anche il rischio di timeout HTTP sulle generazioni
     lunghe; la risposta la consumiamo comunque tutta con finalMessage(). */
  const stream = getClient().messages.stream({
    model,
    /* Misurato sul primo giro vero: ~11.900 token in uscita per chiamata, di cui il JSON e
       ~2.000. Il resto era ragionamento, che sfondava il tetto di 16.000 e troncava la spec a
       meta (da cui i "JSON non valido" e il costo triplo). Piu spazio e gratis: si paga solo
       quello che viene davvero generato. */
    max_tokens: 24000,
    /* the cached prefix — one breakpoint on the last (only) system block */
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    /* Scrivere una spec e generazione strutturata, non ragionamento profondo: il giudizio
       (quale visual, quale palette, quale storyline) sta nel prompt, non va riscoperto ogni
       volta. A 'low' il modello pensa meno e scrive di piu. */
    output_config: { effort: 'low' },
    /* La spec NON si chiede "rispondi solo con JSON": si chiede come chiamata a strumento con
       schema. E la differenza fra sperare che il modello non aggiunga una frase e non lasciargli
       il posto dove scriverla — nell'eval due giri su dieci erano morti proprio cosi
       ("Unexpected non-whitespace character after JSON"). Lo schema resta volutamente largo:
       la grammatica vera la controlla il motore, qui serve solo la garanzia sintattica. */
    tools: [{
      name: EMIT_TOOL,
      description: "Consegna il report finito. E l unico modo di rispondere: spec descrive il report, dataParams il generatore dei numeri.",
      input_schema: {
        type: 'object',
        properties: {
          spec: { type: 'object', description: 'La spec del report, secondo la grammatica.' },
          dataParams: { type: 'object', description: 'I parametri del generatore dei dati.' }
        },
        required: ['spec', 'dataParams']
      }
    }],
    tool_choice: { type: 'tool', name: EMIT_TOOL },
    messages: turns.map(t => ({ role: t.role, content: t.content }))
  });
  const res = await stream.finalMessage();

  /* la risposta arriva come input dello strumento: gia oggetto, niente da estrarre dal testo.
     Il ramo testuale resta come rete di sicurezza se un modello ignorasse il tool_choice. */
  const call = res.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === EMIT_TOOL);
  const text = call
    ? JSON.stringify(call.input)
    : res.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map(b => b.text).join('');

  const raw = {
    tokensIn: res.usage.input_tokens ?? 0,
    tokensOut: res.usage.output_tokens ?? 0,
    cacheRead: res.usage.cache_read_input_tokens ?? 0,
    cacheWrite: res.usage.cache_creation_input_tokens ?? 0
  };

  if (res.stop_reason === 'refusal') throw new Error('Il modello ha rifiutato la richiesta.');
  /* Il tetto di token raggiunto significa spec tagliata a meta: senza questo controllo
     arrivava a valle come un incomprensibile "Expected ',' after array element". */
  if (res.stop_reason === 'max_tokens') {
    throw new Error('Risposta troncata: raggiunto il tetto di ' + 24000 + ' token in uscita, la spec e incompleta.');
  }

  return { text, usage: { ...raw, costUsd: priceOf(model, raw) } };
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
