# Mockly — repo

/ skill   -> the authoritative specification (SKILL.md + references + assets + evals).
             The engine is built to satisfy these files; the skill is the spec.
/ engine  -> the deterministic rendering engine: runtime.js, spec schema,
             render(spec,data), data-model.js (rescale + IPF), fixtures per eval brief.
/ test    -> unit tests + the headless jsdom harness over every eval brief.

Rule: the skill is the spec, the engine is the implementation. When a rule changes it
changes in /skill first, then /engine. Never the reverse.

## The split

An LLM used to generate the whole HTML file every time: data model, rendering engine and
layout. The engine is the deterministic part, so it moved into code:

| | who | what |
|---|---|---|
| **judgement** | the LLM | the SPEC: aesthetic, palette, which visual answers which question, the storyline, the labels — plus the data parameters (segment character, growth, seasonality) |
| **determinism** | this engine | grid, formatting, aggregation, filtering, charts, slicer, cross-filter, drill-through, tooltips, fit-to-viewport, reconciliation |

```js
const { render } = require('./engine/render.js');
const html = render(spec, data);        // one self-contained HTML file, byte-deterministic
```

- `engine/spec-schema.md` + `engine/spec.d.ts` — the SPEC grammar.
- `engine/runtime.js` — the engine, in `/*#region*/` blocks. `render()` inlines `core` plus
  only the chart helpers the spec uses, comment-stripped, so no dead code ships.
- `engine/data-model.js` — reconciled synthetic data: `rescaleTo`/`rescaleInt` on one axis,
  `ipf`/`jointRows` on two (a joint matrix instead of two tables with one inert filter).
- `engine/specs/*.js` — one fixture per eval brief, each an example of what an LLM writes.

## Commands

```bash
npm install          # jsdom, for the harness only — nothing reaches the output file
npm test             # unit tests + canonical equivalence + the harness over every eval brief
node engine/build-all.js     # render every fixture into out/
```

## Where it stands

`npm test` — 159 checks, 1040 rendered states, all green.

| brief | aesthetic | size | states |
|---|---|---|---|
| messy-retail-human (Nodo & Trama) | corporate-sober | 44.9KB | 270 |
| social-monthly | agency-modern | 47.2KB | 230 |
| ecommerce-retail | corporate-sober | 57.4KB | 350 |
| saas-metrics | executive-minimal | 43.9KB | 190 |

`test/canonical-equivalence.test.js` renders the Nodo & Trama spec and compares its structural
signature against `skill/assets/canonical-retail-fullspec.html`: same canvas, shell, slicer,
KPI band, grid composition (3+2 / 3+2), visual kinds, closing matrix and 12-point trend.

Two places where the fixtures follow the canonical example rather than a written rule (the
harness reports both as notes rather than failures):

- the canonical's donut has 6 slices; `chart-selection.md` says 2-5;
- the canonical's closing matrix spans 3 of 5 columns, not the full width SKILL.md asks for.

The engine enforces the rule where it is unambiguous (integer spans, ≤3 visuals per row,
dropdown above 5 members, no decorative filters, no authored prose) and reports the judgement
calls instead of overriding the spec author.
