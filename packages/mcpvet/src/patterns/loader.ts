import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { PatternError } from '../core/errors.js';
import type { PatternCatalog } from '../types/index.js';
import { PatternCatalogSchema } from '../types/index.js';

const BUNDLED_PATTERNS_DIR = 'patterns';

/**
 * Load the pattern catalog from a directory. Each `.yaml` / `.yml` file in
 * the directory is parsed and validated. The function aggregates them into
 * a single catalog.
 *
 * If `dir` is omitted, loads the catalog bundled with the package
 * (`patterns/` at the package root).
 */
export async function loadPatternCatalog(dir?: string): Promise<PatternCatalog> {
  const patternsDir = dir ?? defaultPatternsDir();
  const files = await readdir(patternsDir);
  const yamlFiles = files.filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));

  if (yamlFiles.length === 0) {
    throw new PatternError(`no pattern files found in ${patternsDir}`, {});
  }

  const patterns = [];
  for (const file of yamlFiles) {
    const path = join(patternsDir, file);
    const text = await readFile(path, 'utf8');
    const raw = parseYaml(text);
    const result = PatternCatalogSchema.safeParse(raw);
    if (!result.success) {
      throw new PatternError(`invalid pattern file: ${file}`, { cause: result.error });
    }
    patterns.push(...result.data.patterns);
  }

  // Sort for deterministic output. Helps with diffs and caching.
  patterns.sort((a, b) => a.id.localeCompare(b.id));

  return { version: 1, patterns };
}

/**
 * Resolve the default patterns directory. Supports three layouts:
 *   - Source:  src/patterns/loader.ts → ../../patterns
 *   - Bundled: dist/patterns/loader.js → ../../patterns (legacy tsc layout)
 *   - Bundled: dist/cli.js, dist/index.js → ../patterns (tsup layout)
 */
function defaultPatternsDir(): string {
  const start = dirname(fileURLToPath(import.meta.url));

  // Source or legacy-bundled layout
  if (start.endsWith(`${'/'}src/patterns`) || start.endsWith(`${'/'}dist/patterns`)) {
    return resolve(start, '..', '..', BUNDLED_PATTERNS_DIR);
  }

  // tsup layout: file is at dist/<name>.js, patterns at dist/patterns/
  if (start.endsWith(`${'/'}dist`)) {
    return resolve(start, BUNDLED_PATTERNS_DIR);
  }

  // Fallback: relative to cwd
  return resolve(process.cwd(), BUNDLED_PATTERNS_DIR);
}
