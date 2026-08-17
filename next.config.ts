import type { NextConfig } from 'next';

const config: NextConfig = {
  /* The engine is plain CommonJS and reads runtime.js off disk at render time, so it must NOT
     be bundled by webpack (__dirname would point at the bundle). lib/engine.ts loads it with
     createRequire at runtime; this tells Vercel's file tracer to ship the files anyway. */
  outputFileTracingIncludes: {
    '/api/generate': ['./engine/**/*', './skill/references/*.md', './skill/SKILL.md']
  }
};

export default config;
