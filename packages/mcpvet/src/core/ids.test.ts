import { describe, expect, it } from 'vitest';
import { findingId, scanId, serverId, toolId } from './ids.js';

describe('findingId', () => {
  it('is stable for the same input', () => {
    const a = findingId({
      serverName: 'fs',
      patternId: 'p' as never,
      field: 'description',
      snippet: 'x',
    });
    const b = findingId({
      serverName: 'fs',
      patternId: 'p' as never,
      field: 'description',
      snippet: 'x',
    });
    expect(a).toBe(b);
  });
  it('differs for different inputs', () => {
    const a = findingId({
      serverName: 'fs',
      patternId: 'p' as never,
      field: 'description',
      snippet: 'x',
    });
    const b = findingId({
      serverName: 'fs',
      patternId: 'p' as never,
      field: 'description',
      snippet: 'y',
    });
    expect(a).not.toBe(b);
  });
  it('starts with FND-', () => {
    expect(
      findingId({
        serverName: 's',
        patternId: 'p' as never,
        field: 'description',
        snippet: 'x',
      }).startsWith('FND-'),
    ).toBe(true);
  });
});

describe('serverId / toolId / scanId', () => {
  it('have stable prefixes', () => {
    expect(serverId('x').startsWith('SRV-')).toBe(true);
    expect(toolId('s', 't').startsWith('TOOL-')).toBe(true);
    expect(scanId().startsWith('SCN-')).toBe(true);
  });
});
