/* The engine is plain CommonJS and reads engine/runtime.js off disk at render time.
 * Loading it with createRequire keeps it OUT of the webpack bundle, so __dirname inside
 * render.js still points at the real engine directory. next.config.ts tells Vercel's file
 * tracer to ship those files. */

import { createRequire } from 'node:module';
import path from 'node:path';

const requireCJS = createRequire(path.join(process.cwd(), 'package.json'));

type EngineModule = {
  render: (spec: unknown, data: unknown) => string;
  validate: (spec: unknown, data: unknown) => { types: string[]; advisories: string[] };
  lint: (spec: unknown, data: unknown) => string[];
  toolbarBudget: (spec: unknown, data: unknown) => { used: number; available: number; overflow: boolean };
};

type DataBuilderModule = { build: (dataParams: unknown) => Record<string, unknown> };

export const engine: EngineModule = requireCJS('./engine/render.js');
export const dataBuilder: DataBuilderModule = requireCJS('./engine/data-builder.js');
