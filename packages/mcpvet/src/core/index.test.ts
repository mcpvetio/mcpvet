import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseJsonc } from './jsonc.js';
import { WORKSPACE_CONFIG_FILES, getGlobalLocations } from './locations.js';
import { normalizeServer, parseConfigFile } from './parser.js';

describe('parseJsonc', () => {
  it('parses plain JSON', () => {
    expect(parseJsonc('{"a": 1}')).toEqual({ a: 1 });
  });
  it('strips line comments', () => {
    expect(parseJsonc('{"a": 1} // hi\n')).toEqual({ a: 1 });
  });
  it('strips block comments', () => {
    expect(parseJsonc('/* x */ {"a": 1}')).toEqual({ a: 1 });
  });
  it('strips trailing commas', () => {
    expect(parseJsonc('{"a": 1, "b": 2,}')).toEqual({ a: 1, b: 2 });
  });
  it('preserves // inside strings', () => {
    expect(parseJsonc('{"a": "https://x.com"}')).toEqual({ a: 'https://x.com' });
  });
});

describe('parseConfigFile', () => {
  let dir: string;

  it('reads and validates a real config', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mcpvet-test-'));
    const p = join(dir, 'mcp.json');
    await writeFile(
      p,
      JSON.stringify({
        mcpServers: {
          fs: { command: 'mcp-fs', args: ['--read-only'] },
        },
      }),
    );
    const parsed = await parseConfigFile('cursor', p);
    expect(parsed.ide).toBe('cursor');
    expect(parsed.servers.size).toBe(1);
    expect(parsed.servers.get('fs')?.command).toBe('mcp-fs');
  });

  it('handles JSONC (with comments and trailing commas)', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mcpvet-test-'));
    const p = join(dir, 'mcp.json');
    await writeFile(
      p,
      `{
        // a comment
        "mcpServers": {
          "fs": { "command": "mcp-fs", },
        },
      }`,
    );
    const parsed = await parseConfigFile('cursor', p);
    expect(parsed.servers.get('fs')?.command).toBe('mcp-fs');
  });

  it('throws on bad JSON', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mcpvet-test-'));
    const p = join(dir, 'bad.json');
    await writeFile(p, '{ not json');
    await expect(parseConfigFile('cursor', p)).rejects.toThrow(/invalid JSON/);
  });
});

describe('normalizeServer', () => {
  it('normalizes stdio with string args', () => {
    const n = normalizeServer('fs', { command: 'mcp-fs', args: '--read-only --fast' });
    expect(n?.transport).toBe('stdio');
    if (n?.transport === 'stdio') {
      expect(n.args).toEqual(['--read-only', '--fast']);
    }
  });

  it('normalizes http', () => {
    const n = normalizeServer('remote', { url: 'https://mcp.example.com' });
    expect(n?.transport).toBe('http');
  });

  it('normalizes sse when type=sse', () => {
    const n = normalizeServer('s', { type: 'sse', url: 'https://mcp.example.com/sse' });
    expect(n?.transport).toBe('sse');
  });

  it('returns null for unrecognized shape', () => {
    expect(normalizeServer('x', {})).toBeNull();
  });
});

describe('WORKSPACE_CONFIG_FILES', () => {
  it('is non-empty', () => {
    expect(WORKSPACE_CONFIG_FILES.length).toBeGreaterThan(0);
    for (const w of WORKSPACE_CONFIG_FILES) {
      expect(w.relativePath.startsWith('.')).toBe(true);
    }
  });
});
