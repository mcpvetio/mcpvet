import { describe, expect, it } from 'vitest';
import { COVERAGE } from './coverage.js';

describe('COVERAGE', () => {
  it('has both checked and notChecked sections', () => {
    expect(COVERAGE.checked.length).toBeGreaterThan(0);
    expect(COVERAGE.notChecked.length).toBeGreaterThan(0);
  });

  it('every notChecked entry has area, reason, and trackedIn', () => {
    for (const n of COVERAGE.notChecked) {
      expect(n.area.length).toBeGreaterThan(0);
      expect(n.reason.length).toBeGreaterThan(0);
      expect(n.trackedIn.length).toBeGreaterThan(0);
    }
  });

  it('checked entries are non-empty strings', () => {
    for (const c of COVERAGE.checked) {
      expect(typeof c).toBe('string');
      expect(c.length).toBeGreaterThan(0);
    }
  });
});
