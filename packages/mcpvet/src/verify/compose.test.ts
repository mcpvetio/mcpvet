import { beforeEach, describe, expect, it } from 'vitest';
import type { NormalizedServer } from '../types/index.js';
import { Allowlist } from './allowlist.js';
import { verifyAll } from './compose.js';

function stdio(command: string, args: string[]): NormalizedServer {
  return { name: 's', transport: 'stdio', command, args, env: {} };
}

describe('verifyAll', () => {
  let allowlist: Allowlist;
  beforeEach(() => {
    allowlist = new Allowlist();
  });

  it('returns local origin for local command', async () => {
    const results = await verifyAll([stdio('node', ['/usr/local/bin/mcp'])], {
      offline: true,
      allowlist,
    });
    expect(results).toHaveLength(1);
    expect(results[0]?.source).toBe('local');
    expect(results[0]?.trustScore).toBeGreaterThanOrEqual(20);
  });

  it('returns unknown origin for http URL with no github ref', async () => {
    const s: NormalizedServer = {
      name: 's',
      transport: 'http',
      url: 'https://example.com/mcp',
      headers: {},
    };
    const results = await verifyAll([s], { offline: true, allowlist });
    expect(results[0]?.source).toBe('unknown');
  });

  it('returns allowlisted origin in offline mode when ref is known', async () => {
    const results = await verifyAll(
      [stdio('npx', ['-y', '@modelcontextprotocol/server-filesystem'])],
      { offline: true, allowlist },
    );
    expect(results[0]?.allowlisted).toBe(true);
    expect(results[0]?.trustScore).toBe(95);
  });

  it('returns degraded origin on network error (does not throw)', async () => {
    const failingFetch: typeof globalThis.fetch = () => Promise.reject(new Error('network down'));
    const results = await verifyAll([stdio('npx', ['-y', 'unknown-pkg-on-npm'])], {
      offline: false,
      allowlist,
      fetch: failingFetch,
    });
    expect(results[0]?.source).toBe('unknown');
    expect(results[0]?.error).toBeDefined();
  });

  it('processes servers in parallel with bounded concurrency', async () => {
    const start = Date.now();
    const slowFetch: typeof globalThis.fetch = (url) => {
      void url;
      return new Promise((resolve) =>
        setTimeout(() => resolve(new Response('{}', { status: 200 })), 50),
      );
    };
    const servers = Array.from({ length: 10 }, (_, i) => stdio('npx', ['-y', `pkg-${i}`]));
    await verifyAll(servers, { offline: false, allowlist, fetch: slowFetch });
    const elapsed = Date.now() - start;
    // 10 servers * 50ms / max-concurrency 5 = ~100ms, generous bound
    expect(elapsed).toBeLessThan(500);
  });
});
