import { describe, expect, it } from 'vitest';
import type { Finding, Severity } from '../types/index.js';
import { computeScore, meetsThreshold } from './score.js';

function finding(severity: Severity, id = `f-${severity}`): Finding {
  return {
    id: id as Finding['id'],
    patternId: 'p' as Finding['patternId'],
    severity,
    serverId: 's' as Finding['serverId'],
    serverName: 'test',
    field: 'description',
    snippet: 'x',
    message: 'm',
    references: [],
  };
}

describe('computeScore', () => {
  it('returns score 0 for no findings', () => {
    const s = computeScore([]);
    expect(s.value).toBe(0);
    expect(s.level).toBe('info');
  });

  it('elevates to critical for any critical finding', () => {
    const s = computeScore([finding('critical')]);
    expect(s.level).toBe('critical');
    expect(s.value).toBeGreaterThan(40);
  });

  it('elevates to highest severity present', () => {
    const s = computeScore([finding('low'), finding('medium'), finding('high')]);
    expect(s.level).toBe('high');
  });

  it('caps at 100 for many critical findings', () => {
    const s = computeScore(Array.from({ length: 50 }, () => finding('critical')));
    expect(s.value).toBe(100);
  });

  it('is deterministic for the same input', () => {
    const fs = [finding('high', 'a'), finding('medium', 'b'), finding('low', 'c')];
    expect(computeScore(fs).value).toBe(computeScore(fs).value);
  });

  it('counts findings by level', () => {
    const s = computeScore([finding('high', 'a'), finding('high', 'b'), finding('medium', 'c')]);
    expect(s.findingsByLevel.high).toBe(2);
    expect(s.findingsByLevel.medium).toBe(1);
    expect(s.findingsByLevel.low).toBe(0);
  });
});

describe('meetsThreshold', () => {
  it('returns true when level is at or above threshold', () => {
    expect(
      meetsThreshold({ value: 50, level: 'high', findingsByLevel: {} as never }, 'medium'),
    ).toBe(true);
    expect(
      meetsThreshold({ value: 50, level: 'medium', findingsByLevel: {} as never }, 'medium'),
    ).toBe(true);
  });
  it('returns false when level is below threshold', () => {
    expect(meetsThreshold({ value: 5, level: 'low', findingsByLevel: {} as never }, 'medium')).toBe(
      false,
    );
  });
});
