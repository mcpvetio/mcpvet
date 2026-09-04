import { describe, expect, it } from 'vitest';
import type { ScanResult } from '../types/index.js';
import { DiffResultSchema } from '../types/schemas/diff.js';
import { diff } from './diff.js';

function scan(
  servers: Array<{
    name: string;
    transport?: 'stdio' | 'http' | 'sse';
    command?: string;
    url?: string;
  }>,
): ScanResult {
  return {
    id: 'SCN-test' as ScanResult['id'],
    startedAt: '2026-09-03T00:00:00.000Z',
    finishedAt: '2026-09-03T00:00:01.000Z',
    sources: [],
    servers: servers.map((s) => ({
      server: {
        name: s.name,
        transport: s.transport ?? 'stdio',
        ...(s.command !== undefined ? { command: s.command, args: [], env: {} } : {}),
        ...(s.url !== undefined ? { url: s.url, headers: {} } : {}),
      } as ScanResult['servers'][number]['server'],
      tools: [],
    })),
    findings: [],
    origins: [],
    score: {
      value: 0,
      level: 'info',
      findingsByLevel: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    },
    toolVersion: '0.0.0',
  };
}

describe('diff', () => {
  it('reports all servers as added when there is no before', () => {
    const after = scan([{ name: 'a' }, { name: 'b' }]);
    const d = diff(undefined, after);
    expect(d.entries.filter((e) => e.kind === 'added')).toHaveLength(2);
  });

  it('reports removed servers', () => {
    const before = scan([{ name: 'a' }, { name: 'b' }]);
    const after = scan([{ name: 'a' }]);
    const d = diff(before, after);
    expect(d.entries.some((e) => e.kind === 'removed' && e.serverName === 'b')).toBe(true);
  });

  it('reports modified fields', () => {
    const before = scan([{ name: 'a', command: 'old-cmd' }]);
    const after = scan([{ name: 'a', command: 'new-cmd' }]);
    const d = diff(before, after);
    expect(d.entries.some((e) => e.kind === 'modified' && e.summary.includes('command'))).toBe(
      true,
    );
  });

  it('returns riskDelta of 0 when nothing changed', () => {
    const s = scan([{ name: 'a' }]);
    const d = diff(s, s);
    expect(d.riskDelta).toBe(0);
  });

  it('produces entries that pass Zod validation (no empty serverId)', () => {
    const before = scan([{ name: 'a', command: 'old' }]);
    const after = scan([{ name: 'a', command: 'new' }]);
    const d = diff(before, after);
    const result = DiffResultSchema.safeParse(d);
    expect(result.success).toBe(true);
    for (const e of d.entries) {
      expect(e.serverId).not.toBe('');
    }
  });
});
