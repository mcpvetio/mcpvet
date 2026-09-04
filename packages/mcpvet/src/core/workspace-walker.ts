import { stat } from 'node:fs/promises';
import path from 'node:path';
import { WORKSPACE_CONFIG_FILES } from './locations.js';

const MAX_DEPTH = 5;

/**
 * Walk up from `start` looking for project-level MCP config files. Stops at:
 *   - the first directory containing `.git`
 *   - the filesystem root
 *   - MAX_DEPTH levels up
 *
 * Returns absolute paths of config files that exist. Order is deepest-first
 * (closest to `start` first) so that project configs override user-global ones.
 */
export async function findWorkspaceConfigs(start: string): Promise<string[]> {
  const found: string[] = [];
  let current = path.resolve(start);
  let depth = 0;

  while (depth <= MAX_DEPTH) {
    for (const { relativePath } of WORKSPACE_CONFIG_FILES) {
      const candidate = path.join(current, relativePath);
      if (await isFile(candidate)) {
        found.push(candidate);
      }
    }

    if (await isDirectory(path.join(current, '.git'))) {
      break;
    }

    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
    depth++;
  }

  return found;
}

async function isFile(p: string): Promise<boolean> {
  try {
    return (await stat(p)).isFile();
  } catch {
    return false;
  }
}

async function isDirectory(p: string): Promise<boolean> {
  try {
    return (await stat(p)).isDirectory();
  } catch {
    return false;
  }
}
