#!/usr/bin/env node
/**
 * Copy the bundled pattern catalog from `patterns/` (the source data) into
 * `dist/patterns/` (next to the bundled JS) so the loader can find it at runtime.
 *
 * In dev, the loader walks up from `src/patterns/loader.ts`. In the published
 * package, there's no `src/` — only `dist/cli.js`. This script bridges the two.
 */
import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(__dirname, '..');
const src = resolve(pkgRoot, 'patterns');
const dest = resolve(pkgRoot, 'dist', 'patterns');

await mkdir(dirname(dest), { recursive: true });
await rm(dest, { recursive: true, force: true });
await cp(src, dest, { recursive: true });
process.stderr.write(`copied patterns/ -> ${dest}\n`);
