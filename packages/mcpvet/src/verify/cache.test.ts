import { beforeEach, describe, expect, it } from 'vitest';
import { TtlCache } from './cache.js';

describe('TtlCache', () => {
  let cache: TtlCache<string>;
  beforeEach(() => {
    cache = new TtlCache<string>(60_000);
  });

  it('returns undefined for missing keys', () => {
    expect(cache.get('nope')).toBeUndefined();
  });

  it('round-trips values', () => {
    cache.set('k', 'v');
    expect(cache.get('k')).toBe('v');
  });

  it('expires after ttl', async () => {
    const c = new TtlCache<string>(1);
    c.set('k', 'v');
    await new Promise((r) => setTimeout(r, 5));
    expect(c.get('k')).toBeUndefined();
  });

  it('clear removes everything', () => {
    cache.set('a', '1');
    cache.set('b', '2');
    cache.clear();
    expect(cache.get('a')).toBeUndefined();
    expect(cache.size()).toBe(0);
  });
});
