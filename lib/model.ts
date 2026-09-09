/* The single paid call: one request to the Anthropic API that returns { spec, dataParams }.
 *
 * The system prompt is byte-stable and cached (cache_control on the last system block), so the
 * ~10k-token grammar+judgement prefix bills at ~0.1x from the second call onward. */

import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from './prompt';

/** Short names a caller may ask for, resolved before MODEL so MOCKLY_MODEL=haiku works too. */
const MODEL_ALIASES_RAW: Record<string, string> = {
  sonnet: 'claude-sonnet-5',
  haiku: 'claude-haiku-4-5',
  opus: 'claude-opus-5'
};

/* Il passo generativo legge un brief e scrive un JSON piccolo secondo uno schema: e
   categorizzazione + composizione guidata, non ragionamento profondo, e il giudizio di merito
   sta gia scritto nel prompt cachato. Quindi il default e il modello piu economico, e Sonnet
   resta a un cambio di variabile per il confronto nell eval. Le soglie dell eval NON cambiano:
   qualunque modello si usi deve passare lo stesso test. */
/** Haiku by default. Override with MOCKLY_MODEL (alias o id completo). */
export const MODEL = process.env.MOCKLY_MODEL
  ? (MODEL_ALIASES_RAW[process.env.MOCKLY_MODEL] || process.env.MOCKLY_MODEL)
  : 'claude-haiku-4-5';

/** Anything outside this list is refused: the model id reaches the API and bills the account,
 *  so it is never taken from the request verbatim. */
export const MODEL_ALIASES: Record<string, string> = MODEL_ALIASES_RAW;

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

/** Deroghe al percorso principale. Servono a un solo caso oggi: una mini-chiamata di
 *  classificazione, che non vuole ne il prefisso da 24k token ne lo strumento di consegna. */
export type CallOptions = {
  /** sostituisce SYSTEM_PROMPT; niente cache_control, e troppo corto per valerne la pena */
  system?: string;
  maxTokens?: number;
  /** false = risposta libera in testo, senza emit_report */
  structured?: boolean;
};

/** One call. `turns` carries the brief and, on a repair attempt, the previous answer + errors. */
export async function callModel(
  turns: Turn[],
  model: string = MODEL,
  opts: CallOptions = {}
): Promise<{ text: string; usage: Usage }> {
  try {
    return await request(turns, model, opts);
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

async function request(turns: Turn[], model: string, opts: CallOptions = {}): Promise<{ text: string; usage: Usage }> {
  const structured = opts.structured !== false;
  const maxTokens = opts.maxTokens ?? 24000;
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
    max_tokens: maxTokens,
    /* the cached prefix — one breakpoint on the last (only) system block. Un system prompt
       passato da chi chiama e corto per definizione: metterci un breakpoint costerebbe una
       cache write senza mai ripagarla. */
    system: opts.system
      ? [{ type: 'text' as const, text: opts.system }]
      : [{ type: 'text' as const, text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' as const } }],
    /* Scrivere una spec e generazione strutturata, non ragionamento profondo: il giudizio
       (quale visual, quale palette, quale storyline) sta nel prompt, non va riscoperto ogni
       volta. A 'low' il modello pensa meno e scrive di piu. */
    output_config: { effort: 'low' },
    /* La spec NON si chiede "rispondi solo con JSON": si chiede come chiamata a strumento con
       schema. E la differenza fra sperare che il modello non aggiunga una frase e non lasciargli
       il posto dove scriverla — nell'eval due giri su dieci erano morti proprio cosi
       ("Unexpected non-whitespace character after JSON"). */
    ...(structured ? { tool_choice: { type: 'tool' as const, name: EMIT_TOOL } } : {}),
    tools: !structured ? [] : [{
      name: EMIT_TOOL,
      description: "Consegna il report finito. E l unico modo di rispondere: spec descrive il report, dataParams il generatore dei numeri.",
      input_schema: {
        type: 'object',
        properties: {
          /* spec NON puo restare un oggetto opaco. Dichiarato come `{type:'object'}` senza
             properties, nel primo eval con tool-use il modello ha risposto 8 volte su 8
             scrivendoci dentro una STRINGA con tutta la risposta — spec e dataParams di fila
             dentro lo stesso campo. Un oggetto senza forma dichiarata invita a trattarlo come
             testo. Le proprieta qui sotto sono i soli nomi di primo livello: il dettaglio
             resta nella grammatica, ma la FORMA e dichiarata. */
          spec: {
            type: 'object',
            description: 'La spec del report, secondo la grammatica di engine/spec.d.ts. Oggetto, non una stringa.',
            properties: {
              meta: { type: 'object', description: 'titolo, lingua, mesi, watermark' },
              aesthetic: { type: 'string', enum: ['corporate-sober', 'agency-modern', 'executive-minimal'] },
              palette: { type: 'object' },
              grid: { type: 'object', description: 'contentWidth, gutter, columns' },
              model: {
                type: 'object',
                description: 'sums e measures',
                properties: {
                  sums: { type: 'array', items: { type: 'string' } },
                  measures: {
                    type: 'array', minItems: 1,
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        label: { type: 'string' },
                        agg: { type: 'string', enum: ['sum', 'diff', 'ratio', 'last'] },
                        /* L'unita e obbligatoria e il formato ne discende. Lasciata implicita,
                           un modello reale ha scritto format:"eur" su reach e impression - due
                           conte - pur avendo N nella grammatica e usandolo correttamente due
                           righe piu sotto. Con l'unita dichiarata la combinazione non passa. */
                        unit: { type: 'string', enum: ['money', 'count', 'pct', 'pp', 'days', 'months', 'x'],
                          description: 'cosa misura: money -> eur/eurF, count -> N/raw, pct -> pc/sgp/bps, pp -> pp, days -> days, x -> x' },
                        format: { type: 'string', enum: ['eur', 'eurF', 'pc', 'pp', 'sgp', 'bps', 'N', 'x', 'days', 'months', 'raw'] }
                      },
                      required: ['id', 'agg', 'unit']
                    }
                  }
                },
                required: ['sums', 'measures']
              },
              filters: { type: 'object', description: 'date e dims' },
              kpiBand: { type: 'array', items: { type: 'object' } },
              pages: { type: 'array', minItems: 1, items: { type: 'object' } },
              drill: { type: 'object' }
            },
            required: ['meta', 'aesthetic', 'grid', 'model', 'filters', 'kpiBand', 'pages']
          },
          /* Lo schema resta largo OVUNQUE tranne che su dims: la grammatica vera la controlla il
             motore. Su dims no, perche li si concentrava l intera classe di fallimento dell eval
             (3 fallback su 4, sempre "dims[X] has no members"). Qui members e obbligatorio con
             minItems 1, quindi la dimensione vuota non e nemmeno una forma che lo strumento
             accetta: non e piu una regola da ricordare, e la firma della chiamata. */
          dataParams: {
            type: 'object',
            description: 'Il generatore dei numeri, secondo engine/data-params.md.',
            properties: {
              dims: {
                type: 'object',
                description:
                  'Ogni dimensione con i suoi membri DENTRO di se. Una dimensione dichiarata e ' +
                  'lasciata vuota non e ammessa: dichiararla significa popolarla.',
                additionalProperties: {
                  type: 'object',
                  properties: {
                    members: {
                      type: 'array',
                      minItems: 1,
                      description: 'I membri della dimensione. Almeno uno con growth negativo.',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', description: 'slug breve, es. "ig"' },
                          n: { type: 'string', description: 'etichetta che il lettore vede' },
                          c: { type: 'string', description: 'colore del membro, riusato in ogni visual' },
                          base: { type: 'number', description: 'valore mensile della misura primaria nel primo anno' },
                          growth: { type: 'number', description: 'crescita composta annua' },
                          attrs: { type: 'object', description: 'attributi numerici letti dalle formule' }
                        },
                        required: ['id', 'n', 'base']
                      }
                    }
                  },
                  required: ['members']
                }
              },
              facts: {
                type: 'object',
                description: 'La tabella fatti mensile: dim e la dimensione del ciclo, fields[0] e kind:"seasonal".',
                properties: {
                  dim: { type: 'string', description: 'chiave di dims su cui gira il ciclo mensile' },
                  fields: { type: 'array', minItems: 1, items: { type: 'object' } }
                },
                required: ['dim', 'fields']
              }
            },
            required: ['years', 'dims', 'facts']
          }
        },
        required: ['spec', 'dataParams']
      }
    }],
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
    throw new Error('Risposta troncata: raggiunto il tetto di ' + maxTokens + ' token in uscita, la spec e incompleta.');
  }

  return { text, usage: { ...raw, costUsd: priceOf(model, raw) } };
}

/* L estrazione tollerante vive in lib/json-object.js, CommonJS puro: e lavoro su stringhe
   senza dipendenze, e cosi la suite in node la prova direttamente invece di reimplementarla. */
export { extractJson } from './json-object.js';
