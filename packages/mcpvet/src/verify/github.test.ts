import { describe, expect, it } from 'vitest';
import { parseGithubRef } from './github.js';

describe('parseGithubRef', () => {
  it('parses owner/repo', () => {
    expect(parseGithubRef('foo/bar')).toEqual({ owner: 'foo', repo: 'bar' });
  });

  it('parses https URL', () => {
    expect(parseGithubRef('https://github.com/foo/bar')).toEqual({ owner: 'foo', repo: 'bar' });
  });

  it('parses URL with .git suffix', () => {
    expect(parseGithubRef('https://github.com/foo/bar.git')).toEqual({ owner: 'foo', repo: 'bar' });
  });

  it('rejects unrelated URLs', () => {
    expect(parseGithubRef('https://gitlab.com/foo/bar')).toBeNull();
  });

  it('rejects bare names', () => {
    expect(parseGithubRef('not-a-ref')).toBeNull();
  });
});
