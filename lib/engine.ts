/* The engine is plain CommonJS and reads engine/runtime.js off disk at render time, so it must
 * stay OUT of the webpack bundle — bundled, __dirname would point at .next/server and the
 * runtime file would not be found.
 *
 * `eval('require')` is opaque to webpack's static analysis, so nothing gets bundled and the
 * real CommonJS loader is used at runtime. Paths are absolute (resolved from process.cwd())
 * because the bundle's own module path is not the repo root. next.config.ts tells Vercel's
 * file tracer to ship engine/ with the function. */

import path from 'node:path';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeRequire: NodeRequire = eval('require');
const fromRoot = (...p: string[]) => nodeRequire(path.join(process.cwd(), ...p));

type EngineModule = {
  render: (spec: unknown, data: unknown) => string;
  validate: (spec: unknown, data: unknown) => { types: string[]; advisories: string[] };
  lint: (spec: unknown, data: unknown) => string[];
  toolbarBudget: (spec: unknown, data: unknown) => { used: number; available: number; overflow: boolean };
};

type DataBuilderModule = { build: (dataParams: unknown) => Record<string, unknown> };

export const engine: EngineModule = fromRoot('engine', 'render.js');
export const dataBuilder: DataBuilderModule = fromRoot('engine', 'data-builder.js');
