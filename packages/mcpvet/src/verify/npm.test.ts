import { describe, expect, it } from 'vitest';
import type { NormalizedServer } from '../types/index.js';
import { verifyNpm } from './npm.js';

const server: NormalizedServer = {
  name: 's',
  transport: 'stdio',
  command: 'npx',
  args: ['-y', 'foo'],
  env: {},
};

function mockFetch(status: number, body: unknown): typeof globalThis.fetch {
  return () =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
}

describe('verifyNpm', () => {
  it('returns OriginInfo on 200', async () => {
    const fetch = mockFetch(200, {
      name: 'foo',
      'dist-tags': { latest: '1.0.0' },
      versions: { '1.0.0': { publisher: { username: 'alice' } } },
      time: { '1.0.0': new Date().toISOString() },
    });
    const info = await verifyNpm(
      server,
      { source: 'npm', name: 'foo' },
      { fetch, allowlisted: false },
    );
    expect(info.source).toBe('npm');
    expect(info.publisher).toBe('alice');
    expect(info.trustScore).toBeGreaterThan(60);
  });

  it('throws NotFoundError on 404', async () => {
    const fetch = mockFetch(404, {});
    await expect(
      verifyNpm(server, { source: 'npm', name: 'foo' }, { fetch, allowlisted: false }),
    ).rejects.toThrow(/not found/);
  });

  it('returns trustScore 95 for allowlisted packages', async () => {
    const fetch = mockFetch(200, {
      name: 'foo',
      'dist-tags': { latest: '1.0.0' },
      versions: {},
      time: {},
    });
    const info = await verifyNpm(
      server,
      { source: 'npm', name: 'foo' },
      { fetch, allowlisted: true },
    );
    expect(info.trustScore).toBe(95);
  });

  it('pinned version boosts trust', async () => {
    const fetch = mockFetch(200, {
      name: 'foo',
      'dist-tags': { latest: '1.0.0' },
      versions: { '1.0.0': { publisher: { username: 'alice' } } },
      time: { '1.0.0': new Date().toISOString() },
    });
    const info = await verifyNpm(
      server,
      { source: 'npm', name: 'foo', version: '1.0.0' },
      { fetch, allowlisted: false },
    );
    expect(info.trustScore).toBeGreaterThan(70);
  });
});
