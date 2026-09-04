import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Finding } from '../types/index.js';
import { defaultPolicy, evaluate, loadPolicy, shouldFail } from './policy.js';

function finding(serverName: string, severity: Finding['severity'] = 'medium'): Finding {
  return {
    id: 'FND-test' as Finding['id'],
    patternId: 'p' as Finding['patternId'],
    severity,
    serverId: 'SRV' as Finding['serverId'],
    serverName,
    field: 'description',
    snippet: 'x',
    message: 'm',
    references: [],
  };
}

describe('defaultPolicy', () => {
  it('has sensible defaults', () => {
    const p = defaultPolicy();
    expect(p.severityThreshold).toBe('low');
    expect(p.failOnFindings).toBe(true);
  });
});

describe('evaluate', () => {
  it('blocks servers not in allowlist', () => {
    const p = { ...defaultPolicy(), allowedServers: ['fs'] };
    expect(evaluate(finding('unknown-server'), p).kind).toBe('block');
  });

  it('allows servers in allowlist', () => {
    const p = { ...defaultPolicy(), allowedServers: ['fs'] };
    const v = evaluate(finding('fs'), p);
    expect(v.kind === 'allow' || v.kind === 'warn').toBe(true);
  });

  it('blocks via explicit blocklist', () => {
    const p = { ...defaultPolicy(), blockedServers: ['evil'] };
    expect(evaluate(finding('evil'), p).kind).toBe('block');
  });

  it('respects severity threshold', () => {
    const strict = { ...defaultPolicy(), severityThreshold: 'high' as const };
    expect(evaluate(finding('s', 'low'), strict).kind).toBe('allow');
    expect(evaluate(finding('s', 'critical'), strict).kind).toBe('warn');
  });
});

describe('shouldFail', () => {
  it('returns true if any finding is blocked', () => {
    const p = { ...defaultPolicy(), allowedServers: ['fs'] };
    expect(shouldFail([finding('unknown'), finding('fs')], p)).toBe(true);
  });

  it('returns true for a critical finding even without an allowlist', () => {
    const p = defaultPolicy();
    expect(shouldFail([finding('s', 'critical')], p)).toBe(true);
  });

  it('returns false if all findings are below the threshold', () => {
    const p = { ...defaultPolicy(), severityThreshold: 'high' as const };
    expect(shouldFail([finding('s', 'low')], p)).toBe(false);
  });

  it('returns false if failOnFindings is false', () => {
    const p = { ...defaultPolicy(), failOnFindings: false };
    expect(shouldFail([finding('fs', 'critical')], p)).toBe(false);
  });
});

describe('loadPolicy', () => {
  it('returns default when no path is given', async () => {
    const p = await loadPolicy(undefined);
    expect(p.version).toBe(1);
  });

  it('parses a YAML file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mcpvet-policy-'));
    const path = join(dir, '.mcpaudit.yaml');
    await writeFile(path, 'version: 1\nseverityThreshold: high\nallowedServers:\n  - fs\n');
    const p = await loadPolicy(path);
    expect(p.severityThreshold).toBe('high');
    expect(p.allowedServers).toEqual(['fs']);
    await rm(dir, { recursive: true });
  });

  it('throws on invalid YAML', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mcpvet-policy-'));
    const path = join(dir, '.mcpaudit.yaml');
    await writeFile(path, 'this: is: not: valid: yaml: :');
    await expect(loadPolicy(path)).rejects.toThrow();
    await rm(dir, { recursive: true });
  });
});
