import { describe, expect, it } from 'vitest';
import { COVERAGE } from '../../core/coverage.js';
import type { OriginInfo, ScanResult } from '../../types/index.js';
import { formatHuman } from './human.js';
import { formatJson } from './json.js';
import { formatMarkdown } from './markdown.js';

const sampleScan: ScanResult = {
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
};

const sampleOrigins: OriginInfo[] = [];

describe('output formatters include coverage section', () => {
  it('human output mentions every checked and notChecked area', () => {
    const out = formatHuman(sampleScan, sampleOrigins, { threshold: 'low', noColor: true });
    for (const c of COVERAGE.checked) {
      expect(out).toContain(c);
    }
    for (const n of COVERAGE.notChecked) {
      expect(out).toContain(n.area);
    }
  });

  it('json output has a coverage object', () => {
    const json = JSON.parse(formatJson(sampleScan, sampleOrigins));
    expect(json.coverage).toBeDefined();
    expect(json.coverage.checked.length).toBe(COVERAGE.checked.length);
    expect(json.coverage.notChecked.length).toBe(COVERAGE.notChecked.length);
  });

  it('markdown output has a Coverage section with checked and not checked', () => {
    const md = formatMarkdown(sampleScan, sampleOrigins);
    expect(md).toContain('### Coverage');
    expect(md).toContain('**Checked:**');
    expect(md).toContain('**Not checked:**');
    for (const n of COVERAGE.notChecked) {
      expect(md).toContain(n.area);
    }
  });
});
