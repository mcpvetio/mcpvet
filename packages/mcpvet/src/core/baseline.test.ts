import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { BaselineSnapshot } from '../types/index.js';
import { LocalBaselineStore, NoopBaselineStore } from './baseline.js';

const sample: BaselineSnapshot = {
  version: 1,
  capturedAt: '2026-09-03T00:00:00.000Z',
  scanResult: {
    id: 'SCN-test' as never,
    startedAt: '2026-09-03T00:00:00.000Z',
    finishedAt: '2026-09-03T00:00:01.000Z',
    sources: [],
    servers: [],
    findings: [],
    origins: [],
    score: {
      value: 0,
      level: 'info',
      findingsByLevel: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    },
    toolVersion: '0.0.0',
  },
};

describe('NoopBaselineStore', () => {
  it('always returns null on read', async () => {
    const s = new NoopBaselineStore();
    expect(await s.read()).toBeNull();
  });
  it('write and clear are no-ops', async () => {
    const s = new NoopBaselineStore();
    // @ts-expect-error — verifying the no-op ignores any argument
    await expect(s.write(sample)).resolves.toBeUndefined();
    await expect(s.clear()).resolves.toBeUndefined();
  });
});

describe('LocalBaselineStore', () => {
  let dir: string;
  let path: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mcpvet-baseline-'));
    path = join(dir, 'baseline.json');
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('returns null when no baseline exists', async () => {
    const s = new LocalBaselineStore(path);
    expect(await s.read()).toBeNull();
  });

  it('writes and reads back a baseline', async () => {
    const s = new LocalBaselineStore(path);
    await s.write(sample);
    const back = await s.read();
    expect(back?.capturedAt).toBe(sample.capturedAt);
  });

  it('writes atomically (no partial file left behind on success)', async () => {
    const s = new LocalBaselineStore(path);
    await s.write(sample);
    const raw = await readFile(path, 'utf8');
    expect(JSON.parse(raw).version).toBe(1);
  });

  it('refuses invalid snapshots', async () => {
    const s = new LocalBaselineStore(path);
    await expect(
      // @ts-expect-error — testing runtime guard
      s.write({ version: 999, capturedAt: 'x', scanResult: null }),
    ).rejects.toThrow();
  });

  it('clear removes the file', async () => {
    const s = new LocalBaselineStore(path);
    await s.write(sample);
    await s.clear();
    expect(await s.read()).toBeNull();
  });

  it('clear is idempotent (ENOENT is not an error)', async () => {
    const s = new LocalBaselineStore(path);
    await expect(s.clear()).resolves.toBeUndefined();
  });
});
