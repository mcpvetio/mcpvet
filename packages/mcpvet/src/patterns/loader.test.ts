import { describe, expect, it } from 'vitest';
import { loadPatternCatalog } from './loader.js';

describe('loadPatternCatalog (bundled)', () => {
  it('loads the bundled catalog', async () => {
    const catalog = await loadPatternCatalog();
    expect(catalog.version).toBe(1);
    expect(catalog.patterns.length).toBeGreaterThanOrEqual(30);
  });

  it('every pattern has a unique id', async () => {
    const catalog = await loadPatternCatalog();
    const ids = new Set(catalog.patterns.map((p) => p.id));
    expect(ids.size).toBe(catalog.patterns.length);
  });

  it('every pattern has at least one reference', async () => {
    const catalog = await loadPatternCatalog();
    for (const p of catalog.patterns) {
      expect(p.references.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('patterns are sorted alphabetically by id', async () => {
    const catalog = await loadPatternCatalog();
    const ids = catalog.patterns.map((p) => p.id);
    const sorted = [...ids].sort();
    expect(ids).toEqual(sorted);
  });

  it('covers the main attack categories', async () => {
    const catalog = await loadPatternCatalog();
    const categories = new Set(catalog.patterns.map((p) => p.category));
    expect(categories.has('exfiltration')).toBe(true);
    expect(categories.has('credential-access')).toBe(true);
    expect(categories.has('command-execution')).toBe(true);
    expect(categories.has('prompt-injection')).toBe(true);
    expect(categories.has('covert-channels')).toBe(true);
    expect(categories.has('persistence')).toBe(true);
    expect(categories.has('supply-chain')).toBe(true);
  });
});
