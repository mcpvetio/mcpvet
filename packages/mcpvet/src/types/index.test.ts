import { describe, expect, it } from 'vitest';
import {
  FindingSchema,
  HttpServerSchema,
  NormalizedServerSchema,
  PolicySchema,
  RawConfigSchema,
  ScanResultSchema,
  SeveritySchema,
  StdioServerSchema,
} from './index.js';

describe('SeveritySchema', () => {
  it('accepts all five levels', () => {
    for (const s of ['critical', 'high', 'medium', 'low', 'info']) {
      expect(SeveritySchema.parse(s)).toBe(s);
    }
  });

  it('rejects unknown severities', () => {
    expect(() => SeveritySchema.parse('urgent')).toThrow();
  });
});

describe('StdioServerSchema', () => {
  it('requires a non-empty command', () => {
    expect(() => StdioServerSchema.parse({ command: '' })).toThrow();
    expect(StdioServerSchema.parse({ command: 'node' }).command).toBe('node');
  });

  it('accepts optional args and env', () => {
    const r = StdioServerSchema.parse({
      command: 'npx',
      args: ['-y', 'mcp-server'],
      env: { API_KEY: 'secret' },
    });
    expect(r.args).toEqual(['-y', 'mcp-server']);
    expect(r.env).toEqual({ API_KEY: 'secret' });
  });
});

describe('HttpServerSchema', () => {
  it('requires type=http', () => {
    expect(() => HttpServerSchema.parse({ url: 'https://x.com' })).toThrow();
  });

  it('requires a valid URL', () => {
    expect(() => HttpServerSchema.parse({ type: 'http', url: 'not-a-url' })).toThrow();
  });
});

describe('NormalizedServerSchema', () => {
  it('normalizes stdio args/env to empty when missing', () => {
    const r = NormalizedServerSchema.parse({
      name: 'fs',
      transport: 'stdio',
      command: 'mcp-fs',
    });
    if (r.transport !== 'stdio') throw new Error('expected stdio');
    expect(r.args).toEqual([]);
    expect(r.env).toEqual({});
  });
});

describe('RawConfigSchema', () => {
  it('accepts both mcpServers and servers keys', () => {
    const a = RawConfigSchema.parse({
      mcpServers: { fs: { command: 'mcp-fs' } },
    });
    expect(a.mcpServers).toBeDefined();
    const b = RawConfigSchema.parse({
      servers: { fs: { command: 'mcp-fs' } },
    });
    expect(b.servers).toBeDefined();
  });

  it('accepts array form of servers (Continue/Cline style)', () => {
    const r = RawConfigSchema.parse({
      mcpServers: [{ name: 'fs', command: 'mcp-fs' }],
    });
    expect(r.mcpServers).toBeDefined();
  });

  it('is permissive on unknown fields (forward-compat)', () => {
    const r = RawConfigSchema.parse({
      mcpServers: { fs: { command: 'mcp-fs' } },
      futureField: { experimental: true },
    });
    expect(r).toBeDefined();
  });
});

describe('FindingSchema', () => {
  it('round-trips a valid finding', () => {
    const f = FindingSchema.parse({
      id: 'FND-abc123def4',
      patternId: 'exfil-ssh-key',
      severity: 'high',
      serverId: 'SRV-fs',
      serverName: 'fs',
      field: 'description',
      snippet: 'read ~/.ssh/id_rsa',
      message: 'Tool description requests reading SSH keys',
      references: ['https://owasp.org/example'],
    });
    expect(f.severity).toBe('high');
  });
});

describe('PolicySchema', () => {
  it('applies sensible defaults', () => {
    const p = PolicySchema.parse({ version: 1 });
    expect(p.severityThreshold).toBe('low');
    expect(p.failOnFindings).toBe(true);
    expect(p.disabledPatterns).toEqual([]);
  });
});

describe('ScanResultSchema', () => {
  it('accepts a minimal valid scan', () => {
    const r = ScanResultSchema.parse({
      id: 'SCN-test',
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
    });
    expect(r.toolVersion).toBe('0.0.0');
  });
});
