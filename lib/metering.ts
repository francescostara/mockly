/* Metering — STUB, no billing.
 *
 * Purpose: collect the numbers that will set the credit price per generation (tokens in/out,
 * cache hit rate, cost, latency, how often the spec needed repair or fell back).
 *
 * It aggregates in process memory only. A serverless instance is ephemeral and there are many
 * of them, so these totals are a development aid, not accounting — the structured log line is
 * the durable record (Vercel ships stdout to its log drains, where it can be queried or
 * forwarded to a real store when billing arrives).
 */

export type GenerationRecord = {
  model: string;
  valid: boolean;
  repairs: number;
  fallback: boolean;
  tokensIn: number;
  tokensOut: number;
  cacheRead: number;
  cacheWrite: number;
  costUsd: number;
  latencyMs: number;
  bytes: number;
};

type Totals = {
  runs: number;
  fallbacks: number;
  repairs: number;
  costUsd: number;
  tokensIn: number;
  tokensOut: number;
  cacheRead: number;
  latencyMs: number;
};

const totals: Totals = {
  runs: 0, fallbacks: 0, repairs: 0, costUsd: 0,
  tokensIn: 0, tokensOut: 0, cacheRead: 0, latencyMs: 0
};

/** Log one generation and return the running aggregate for this process. */
export function record(r: GenerationRecord) {
  totals.runs += 1;
  totals.fallbacks += r.fallback ? 1 : 0;
  totals.repairs += r.repairs;
  totals.costUsd += r.costUsd;
  totals.tokensIn += r.tokensIn;
  totals.tokensOut += r.tokensOut;
  totals.cacheRead += r.cacheRead;
  totals.latencyMs += r.latencyMs;

  /* one structured line per generation — this is what a log drain would ingest */
  console.log('[mockly:meter] ' + JSON.stringify({
    ...r,
    costUsd: round(r.costUsd, 6),
    cacheHitRate: r.tokensIn + r.cacheRead > 0 ? round(r.cacheRead / (r.tokensIn + r.cacheRead), 3) : 0,
    run: totals.runs,
    cumulativeCostUsd: round(totals.costUsd, 6),
    avgCostUsd: round(totals.costUsd / totals.runs, 6),
    avgLatencyMs: Math.round(totals.latencyMs / totals.runs),
    fallbackRate: round(totals.fallbacks / totals.runs, 3)
  }));

  return {
    run: totals.runs,
    cumulativeCostUsd: round(totals.costUsd, 6),
    avgCostUsd: round(totals.costUsd / totals.runs, 6)
  };
}

const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;
