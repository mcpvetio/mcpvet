import os from 'node:os';
import path from 'node:path';
import type { Ide } from '../types/index.js';

/**
 * A known location where an MCP config might live.
 * `global` = user-level (vs. project-level, handled by the workspace walker).
 */
export interface Location {
  ide: Ide;
  path: string;
  global: true;
}

/**
 * Build the list of known global MCP config paths for the current user.
 * Paths are returned even if the file doesn't exist — the caller decides
 * whether to read them.
 *
 * Multi-platform. `$HOME` and `xdg.ConfigHome` are honoured; the latter
 * defaults to `~/.config` per the XDG Base Directory spec.
 */
export function getGlobalLocations(): Location[] {
  const home = os.homedir();
  const xdg = process.env.XDG_CONFIG_HOME ?? path.join(home, '.config');

  return [
    { ide: 'cursor', path: path.join(home, '.cursor', 'mcp.json'), global: true },
    { ide: 'claude-code', path: path.join(home, '.claude.json'), global: true },
    { ide: 'claude-code', path: path.join(home, '.claude', 'mcp.json'), global: true },
    { ide: 'gemini-cli', path: path.join(home, '.gemini', 'settings.json'), global: true },
    {
      ide: 'windsurf',
      path: path.join(home, '.codeium', 'windsurf', 'mcp_config.json'),
      global: true,
    },
    { ide: 'continue', path: path.join(home, '.continue', 'config.json'), global: true },
    { ide: 'opencode', path: path.join(xdg, 'opencode', 'config.json'), global: true },
    { ide: 'roo-code', path: path.join(xdg, 'Roo-Code', 'mcp.json'), global: true },
    {
      ide: 'cline',
      path: path.join(
        home,
        '.config',
        'Code',
        'User',
        'globalStorage',
        'saoudrizwan.claude-dev',
        'settings',
        'cline_mcp_settings.json',
      ),
      global: true,
    },
  ];
}

/**
 * Workspace-local config file names, one per IDE. The workspace walker looks
 * for these in any directory from the cwd up to the project root.
 */
export const WORKSPACE_CONFIG_FILES: ReadonlyArray<{ ide: Ide; relativePath: string }> = [
  { ide: 'cursor', relativePath: '.cursor/mcp.json' },
  { ide: 'claude-code', relativePath: '.mcp.json' },
  { ide: 'gemini-cli', relativePath: '.gemini/settings.json' },
  { ide: 'github-copilot', relativePath: '.vscode/mcp.json' },
  { ide: 'windsurf', relativePath: '.windsurf/mcp.json' },
  { ide: 'continue', relativePath: '.continue/config.json' },
];
