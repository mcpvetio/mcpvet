import { describe, expect, it } from 'vitest';
import {
  AbortedError,
  BaselineError,
  ConfigError,
  IoError,
  NetworkError,
  NotFoundError,
  ParseError,
  PatternError,
  PolicyError,
  SchemaError,
  TimeoutError,
  isMcpvetError,
} from './errors.js';

describe('ParseError', () => {
  it('attaches path and code', () => {
    const e = new ParseError('bad json', { path: '/tmp/x.json', cause: new SyntaxError('oops') });
    expect(e.code).toBe('parse_error');
    expect(e.context.path).toBe('/tmp/x.json');
    expect(e.cause).toBeInstanceOf(SyntaxError);
  });

  it('toJSON includes cause message', () => {
    const e = new ParseError('bad', { path: '/x', cause: new Error('underlying') });
    const j = e.toJSON();
    expect(j.cause).toBe('underlying');
  });
});

describe('isMcpvetError', () => {
  it('returns true for our errors', () => {
    expect(isMcpvetError(new NetworkError('x', {}))).toBe(true);
    expect(isMcpvetError(new TimeoutError('x', { operation: 'op', timeoutMs: 100 }))).toBe(true);
  });
  it('returns false for generic errors', () => {
    expect(isMcpvetError(new Error('x'))).toBe(false);
    expect(isMcpvetError('plain string')).toBe(false);
  });
});

describe('all error classes', () => {
  it('expose stable codes', () => {
    expect(new NotFoundError('x', { resource: 'baseline' }).code).toBe('not_found');
    expect(new PolicyError('x', {}).code).toBe('policy_error');
    expect(new BaselineError('x', { path: '/b' }).code).toBe('baseline_error');
    expect(new PatternError('x', { patternId: 'p' }).code).toBe('pattern_error');
    expect(new IoError('x', { path: '/i' }).code).toBe('io_error');
    expect(new ConfigError('x', {}).code).toBe('config_error');
    expect(new SchemaError('x', {}).code).toBe('schema_error');
    expect(new AbortedError().code).toBe('aborted');
  });
});
