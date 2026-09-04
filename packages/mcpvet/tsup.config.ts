import { defineConfig } from 'tsup';

/**
 * Build both ESM and CJS outputs. The CLI bin entry uses ESM (Node 20+ default),
 * but CJS support is kept for downstream consumers that haven't migrated yet.
 *
 * External deps: zod, yaml, commander. Bundled deps: node:* (handled by Node).
 */
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli/index.ts',
  },
  format: ['esm', 'cjs'],
  outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.js' }),
  outDir: 'dist',
  dts: { tsconfig: './tsconfig.dts.json' },
  sourcemap: true,
  clean: true,
  shims: false,
  splitting: false,
  target: 'node20',
  external: ['commander', 'yaml', 'zod'],
});
