import { describe, expect, it } from 'vitest';
import type { NormalizedServer } from '../types/index.js';
import { extractPackageRef } from './extract.js';

function stdio(command: string, args: string[]): NormalizedServer {
  return { name: 's', transport: 'stdio', command, args, env: {} };
}

describe('extractPackageRef', () => {
  it('detects npx -y <pkg>', () => {
    const r = extractPackageRef(stdio('npx', ['-y', '@modelcontextprotocol/server-filesystem']));
    expect(r).toEqual({ source: 'npm', name: '@modelcontextprotocol/server-filesystem' });
  });

  it('detects pnpm dlx', () => {
    const r = extractPackageRef(stdio('pnpm', ['dlx', 'mcp-server-git']));
    expect(r).toEqual({ source: 'npm', name: 'mcp-server-git' });
  });

  it('detects uvx with version', () => {
    const r = extractPackageRef(stdio('uvx', ['mcp-server-git@1.2.3']));
    expect(r).toEqual({ source: 'pypi', name: 'mcp-server-git', version: '1.2.3' });
  });

  it('detects pipx run', () => {
    const r = extractPackageRef(stdio('pipx', ['run', 'mcp-server-git']));
    expect(r).toEqual({ source: 'pypi', name: 'mcp-server-git' });
  });

  it('detects uv tool run', () => {
    const r = extractPackageRef(stdio('uv', ['tool', 'run', 'mcp-server-git']));
    expect(r).toEqual({ source: 'pypi', name: 'mcp-server-git' });
  });

  it('returns null for local node script', () => {
    expect(extractPackageRef(stdio('node', ['/usr/local/bin/my-mcp']))).toBeNull();
  });

  it('returns null for http servers', () => {
    const s: NormalizedServer = {
      name: 's',
      transport: 'http',
      url: 'https://example.com/mcp',
      headers: {},
    };
    expect(extractPackageRef(s)).toBeNull();
  });

  it('handles scoped npm packages with version', () => {
    const r = extractPackageRef(stdio('npx', ['-y', '@scope/pkg@1.0.0']));
    expect(r).toEqual({ source: 'npm', name: '@scope/pkg', version: '1.0.0' });
  });

  it('handles pypi == syntax', () => {
    const r = extractPackageRef(stdio('uvx', ['mcp-foo==2.1']));
    expect(r).toEqual({ source: 'pypi', name: 'mcp-foo', version: '2.1' });
  });
});
