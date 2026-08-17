# Mockly — repo

/ skill   -> the authoritative specification (SKILL.md + references + assets + evals).
             The engine is built to satisfy these files; the skill is the spec.
/ engine  -> the deterministic rendering engine (to be built): runtime.js, spec schema,
             render(spec,data), data-model.js (rescale + IPF), and a jsdom test harness.

Rule: the skill is the spec, the engine is the implementation. When a rule changes it
changes in /skill first, then /engine. Never the reverse.
