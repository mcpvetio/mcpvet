import { describe, expect, it } from 'vitest';
import { Allowlist, DEFAULT_ALLOWLIST } from './allowlist.js';

describe('Allowlist', () => {
  it('default allowlist has known entries', () => {
    const a = new Allowlist();
    expect(a.isAllowlisted('@modelcontextprotocol/server-filesystem')).toBe(true);
    expect(a.isAllowlisted('@notionhq/notion-mcp-server')).toBe(true);
  });

  it('rejects unknown packages', () => {
    const a = new Allowlist();
    expect(a.isAllowlisted('@malicious/evil-package')).toBe(false);
  });

  it('accepts custom entries', () => {
    const a = new Allowlist([{ ref: 'my-pkg', displayName: 'My Pkg', note: 'internal' }]);
    expect(a.isAllowlisted('my-pkg')).toBe(true);
  });

  it('size matches input', () => {
    const a = new Allowlist();
    expect(a.size()).toBe(DEFAULT_ALLOWLIST.length);
  });
});
