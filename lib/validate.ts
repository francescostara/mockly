/* Validation: build the data, run the engine's own guards, and add the cross-checks that only
 * make sense once spec and dataParams are seen together.
 *
 * Every message is written for the model to act on: it names the field and what is wrong, so
 * the repair turn is targeted rather than a re-roll. */

import { engine, dataBuilder } from './engine';

export type Checked =
  | { ok: true; data: Record<string, unknown>; html: string; advisories: string[] }
  | { ok: false; errors: string[] };

/** The engine throws one Error holding a bulleted list; split it back into items. */
function explode(err: unknown): string[] {
  const msg = err instanceof Error ? err.message : String(err);
  const lines = msg.split('\n').map(l => l.replace(/^\s*-\s*/, '').trim()).filter(Boolean);
  if (lines.length > 1 && /validation failed/i.test(lines[0])) return lines.slice(1);
  return [msg];
}

type SpecShape = {
  model?: { sums?: string[]; measures?: { id: string }[] };
  filters?: { dims?: { id: string }[] };
  kpiBand?: unknown[];
  grid?: { columns?: number };
  pages?: { rows?: { visuals?: { type: string; bind?: Record<string, unknown> }[] }[] }[];
  drill?: { dim?: string; page?: { rows?: { visuals?: { type: string; bind?: Record<string, unknown> }[] }[] } };
};

/** Cross-checks between the spec and the data the generator actually produced. */
function crossCheck(spec: SpecShape, data: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const facts = data.facts as { cols: string[] } | undefined;
  const dims = (data.dims || {}) as Record<string, unknown[]>;
  const detail = data.detailModel as { dim?: string; fields?: string[] } | undefined;
  if (!facts) return ['dataParams non ha prodotto una tabella fatti'];

  const factCols = new Set(facts.cols);
  const detailFields = new Set(detail?.fields || []);

  /* a measure summing a field the generator never emitted reads 0 everywhere — a whole
     class of silently-dead visuals */
  (spec.model?.sums || []).forEach(f => {
    if (!factCols.has(f)) {
      errors.push(
        `model.sums contiene "${f}" ma dataParams.facts.fields non genera un campo "${f}". ` +
        `Campi disponibili: ${facts.cols.filter(c => !['y', 'm'].includes(c) && !dims[c]).join(', ')}.`
      );
    }
  });

  /* every visual bound to a dimension needs that dimension to exist */
  const visuals: { type: string; bind?: Record<string, unknown> }[] = [];
  (spec.pages || []).forEach(p => (p.rows || []).forEach(r => visuals.push(...(r.visuals || []))));
  if (spec.drill?.page) (spec.drill.page.rows || []).forEach(r => visuals.push(...(r.visuals || [])));

  visuals.forEach(v => {
    const b = v.bind || {};
    const dim = b.dim as string | undefined;
    if (dim && !dims[dim]) {
      errors.push(`il visual "${v.type}" usa bind.dim "${dim}" che non esiste in dataParams.dims (presenti: ${Object.keys(dims).join(', ')}).`);
    }
    /* a detail-grain visual needs a detail model that carries its measure */
    if (b.detail === true) {
      if (!detail) errors.push(`il visual "${v.type}" ha bind.detail:true ma dataParams non dichiara un blocco "detail".`);
      else {
        if (dim && dim !== detail.dim) errors.push(`il visual "${v.type}" legge il dettaglio su "${dim}" ma dataParams.detail.dim è "${detail.dim}".`);
        const ms = b.measure as string | undefined;
        if (ms && !detailFields.has(ms)) errors.push(`il visual "${v.type}" mostra "${ms}" al grano di dettaglio: aggiungi "${ms}" a dataParams.detail.fields.`);
        /* subMeasure is usually the integer count field, which detail.counts covers — the
           runtime falls back to 0 rather than breaking, so it is not an error */
      }
    }
  });

  if (spec.drill?.dim && !dims[spec.drill.dim]) {
    errors.push(`drill.dim "${spec.drill.dim}" non esiste in dataParams.dims.`);
  }
  return errors;
}

/** Build + validate + render. Returns either the finished HTML or actionable errors. */
export function checkAndRender(spec: unknown, dataParams: unknown): Checked {
  let data: Record<string, unknown>;
  try {
    data = dataBuilder.build(dataParams);
  } catch (err) {
    return { ok: false, errors: explode(err).map(e => `dataParams: ${e}`) };
  }

  /* collect BOTH sets before returning: there is only one repair turn, so the model must see
     every problem at once rather than fixing them one release at a time */
  const errors = crossCheck((spec || {}) as SpecShape, data);
  try {
    engine.validate(spec, data);
  } catch (err) {
    errors.push(...explode(err).map(e => `spec: ${e}`));
  }
  if (errors.length) return { ok: false, errors };

  try {
    const html = engine.render(spec, data);
    return { ok: true, data, html, advisories: engine.lint(spec, data) };
  } catch (err) {
    return { ok: false, errors: explode(err).map(e => `render: ${e}`) };
  }
}
