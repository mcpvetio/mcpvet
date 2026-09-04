import { describe, expect, it } from 'vitest';
import { buildArgs, formatCommentBody, readInputs } from '../src/index.js';
import type { ScanJson } from '../src/index.js';

describe('buildArgs', () => {
  it('builds the standard scan command', () => {
    const { cmd, baseArgs } = buildArgs({
      configPath: '.',
      severityThreshold: 'low',
      failOnFindings: true,
      commentPr: true,
      baselinePath: '.mcpvet/baseline.json',
      offline: false,
      mcpvetCommand: 'npx mcpvet',
      githubToken: '',
    });
    expect(cmd).toBe('npx');
    expect(baseArgs).toContain('scan');
    expect(baseArgs).toContain('--json');
    expect(baseArgs).toContain('--severity');
    expect(baseArgs).toContain('low');
    expect(baseArgs).toContain('--cwd');
    expect(baseArgs).toContain('.');
  });

  it('adds --offline when offline is true', () => {
    const { baseArgs } = buildArgs({
      configPath: '.',
      severityThreshold: 'low',
      failOnFindings: true,
      commentPr: true,
      baselinePath: '.mcpvet/baseline.json',
      offline: true,
      mcpvetCommand: 'npx mcpvet',
      githubToken: '',
    });
    expect(baseArgs).toContain('--offline');
  });

  it('respects a custom mcpvet command', () => {
    const { cmd, baseArgs } = buildArgs({
      configPath: '.',
      severityThreshold: 'high',
      failOnFindings: true,
      commentPr: true,
      baselinePath: '',
      offline: false,
      mcpvetCommand: 'pnpm exec mcpvet',
      githubToken: '',
    });
    expect(cmd).toBe('pnpm');
    expect(baseArgs[0]).toBe('exec');
    expect(baseArgs[1]).toBe('mcpvet');
  });
});

describe('formatCommentBody', () => {
  const sample: ScanJson = {
    scan: {
      findings: [
        {
          id: 'FND-test',
          patternId: 'cred-ssh-private-key',
          severity: 'critical',
          serverName: 'evil-tool',
          field: 'env',
          snippet: '~/.ssh/id_rsa',
          references: ['https://cwe.mitre.org/data/definitions/522.html'],
        },
      ],
      score: { value: 51, level: 'critical' },
      servers: [{}],
      toolVersion: '0.0.0',
    },
  };

  it('contains a header with risk score', () => {
    const body = formatCommentBody(sample);
    expect(body).toContain('mcpvet');
    expect(body).toContain('51/100');
    expect(body).toContain('critical');
  });

  it('contains a table of findings', () => {
    const body = formatCommentBody(sample);
    expect(body).toContain('| Severity | Server | Pattern | Match |');
    expect(body).toContain('evil-tool');
    expect(body).toContain('cred-ssh-private-key');
  });

  it('uses critical emoji when score is critical', () => {
    const body = formatCommentBody(sample);
    expect(body).toContain('🚨');
  });

  it('uses success emoji when no findings', () => {
    const clean: ScanJson = {
      scan: {
        findings: [],
        score: { value: 0, level: 'info' },
        servers: [{}, {}],
        toolVersion: '0.0.0',
      },
    };
    const body = formatCommentBody(clean);
    expect(body).toContain('No issues found');
    expect(body).toContain('✅');
  });
});

describe('readInputs', () => {
  it('returns defaults when env is empty', () => {
    // Save and clear relevant env
    const saved = { ...process.env };
    for (const k of Object.keys(process.env)) {
      if (k.startsWith('INPUT_')) delete process.env[k];
    }
    process.env.GITHUB_TOKEN = 'test-token';
    const inputs = readInputs();
    expect(inputs.configPath).toBe('.');
    expect(inputs.severityThreshold).toBe('low');
    expect(inputs.failOnFindings).toBe(true);
    expect(inputs.commentPr).toBe(true);
    expect(inputs.offline).toBe(false);
    expect(inputs.githubToken).toBe('test-token');
    process.env = saved;
  });
});
