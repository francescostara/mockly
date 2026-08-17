# Evals

Test briefs for the skill. Each is a fresh domain not covered by the gold-standard examples,
so passing means the skill generalises rather than parroting the three assets.

## What "passing" means

Three tiers of assertion per case (see `evals.json`):

- **objective** — machine-checkable: canvas size, single page + drill-through, full-width KPI
  band, ≤3 visuals per row, interactions wired, self-contained file, watermark, and a clean
  QA sweep (no NaN/undefined/Infinity in any state). Verify with the harness in
  `../references/qa-checklist.md`.
- **realism** — judgement + harness: a negative storyline is present, numbers are
  domain-plausible, totals reconcile, muted palette when no brand is given.
- **aesthetic** — human review: frames aligned, harmonic proportion, right aesthetic for the
  audience, correct language.

## How to run it properly (clean-context test)

The only honest test runs **without the authoring conversation in context** — otherwise the
model "passes" using decisions that live in the chat, not in the skill.

1. Upload the skill to your workspace; note the `skill_id`.
2. For each case, call the Messages API from an empty context with the code execution tool and
   the skill attached, passing the `brief` as the user message.
3. Save the returned HTML, open it, and run the QA harness over it.
4. Check the assertions tier by tier. Record token usage in and out — that is your
   **cost per generation**, the number that sets the credit allowance in the pricing.

## Iterating

When you change the skill, re-run the set. If a previously-passing assertion now fails, the
edit regressed something — fix before shipping. Add a new case whenever you find a brief the
skill handles badly; the failing brief becomes the next test.
