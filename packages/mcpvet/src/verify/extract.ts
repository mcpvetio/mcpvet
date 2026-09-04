import type { NormalizedServer } from '../types/index.js';
import type { PackageRef } from './types.js';

export type { PackageRef };

const NPM_RUNNERS = new Set(['npx', 'npm', 'pnpm', 'bunx']);
const PYPI_RUNNERS = new Set(['uvx', 'uv', 'pipx', 'pip', 'python3', 'python']);

/**
 * Try to extract a package reference from a stdio server's command + args.
 * Returns null when the server doesn't look like a registry-installed
 * package (e.g. local node script, custom binary).
 */
export function extractPackageRef(server: NormalizedServer): PackageRef | null {
  if (server.transport !== 'stdio') return null;

  const command = pathBasename(server.command);
  const args = server.args;

  if (NPM_RUNNERS.has(command)) {
    return extractNpmRef(args);
  }
  if (PYPI_RUNNERS.has(command)) {
    return extractPypiRef(args);
  }
  return null;
}

function pathBasename(p: string): string {
  const i = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'));
  return i >= 0 ? p.slice(i + 1) : p;
}

function extractNpmRef(args: readonly string[]): PackageRef | null {
  let i = 0;
  // `pnpm dlx <pkg>` and similar — the runner subcommand is not a flag
  if (args[0] === 'dlx' || args[0] === 'exec') i = 1;
  // Skip flags like -y, --yes, -p, --package, -q
  while (i < args.length && args[i]?.startsWith('-')) {
    const a = args[i];
    if (a === '-p' || a === '--package') {
      i += 2; // skip flag and its value
      continue;
    }
    i++;
  }
  const pkg = args[i];
  if (!pkg || pkg.startsWith('-')) return null;
  return splitNameVersion('npm', pkg);
}

function extractPypiRef(args: readonly string[]): PackageRef | null {
  // `uv tool run <pkg>`: skip "tool" and "run"
  const filtered = args.filter((a) => a !== 'tool' && a !== 'run');
  let i = 0;
  if (filtered[0] === 'install') i = 1;
  const pkg = filtered[i];
  if (!pkg || pkg.startsWith('-')) return null;
  return splitNameVersion('pypi', pkg);
}

function splitNameVersion(source: 'npm' | 'pypi', raw: string): PackageRef {
  if (source === 'pypi') {
    // PEP 508 version separators take precedence
    for (const sep of ['==', '>=', '<=', '~=', '!=']) {
      const idx = raw.indexOf(sep);
      if (idx > 0) {
        return { source, name: raw.slice(0, idx), version: raw.slice(idx + sep.length) };
      }
    }
    // Fall back to @ (some PyPI tooling uses it)
    const atIdx = raw.lastIndexOf('@');
    if (atIdx > 0) {
      return { source, name: raw.slice(0, atIdx), version: raw.slice(atIdx + 1) };
    }
    return { source, name: raw };
  }

  // npm
  const atIdx = raw.lastIndexOf('@');
  if (atIdx <= 0) {
    return { source, name: raw };
  }
  if (raw.startsWith('@')) {
    // @scope/pkg[@version] — atIdx is the version separator (or the @ in @scope if no version)
    // We can detect "scoped with version" by checking there's text after the slash before atIdx
    const slash = raw.indexOf('/');
    if (slash > 0 && slash < atIdx) {
      return { source, name: raw.slice(0, atIdx), version: raw.slice(atIdx + 1) };
    }
    return { source, name: raw };
  }
  return { source, name: raw.slice(0, atIdx), version: raw.slice(atIdx + 1) };
}
