/**
 * Coverage declaration: what mcpvet does and does NOT check.
 *
 * Surfaced in the scan output so users know the scope of an exit 0
 * (clean within the checked scope) vs an absolute safety claim.
 *
 * Keep this in sync with docs/scope.md.
 */
export interface NotChecked {
  /** Short, human-readable name of the gap. */
  area: string;
  /** Why it's not checked (constraint, scope decision, or threat-model reason). */
  reason: string;
  /** Where in the roadmap this lives, e.g. "v0.2", "won't fix". */
  trackedIn: string;
}

export interface Coverage {
  checked: string[];
  notChecked: NotChecked[];
}

export const COVERAGE: Coverage = {
  checked: [
    'MCP config files (global user + workspace local)',
    'Server fields: command, args, env, url, headers, cwd',
    'Tool fields declared in config (name, description)',
    '34 attack patterns across 7 categories',
    'Origin verification: npm, PyPI, GitHub (allowlist + metadata + recency)',
  ],
  notChecked: [
    {
      area: 'Tool descriptions at runtime',
      reason: "would require connecting to running MCP servers (against the tool's threat model)",
      trackedIn: "won't fix in v0.2",
    },
    {
      area: 'Transitive npm dependencies',
      reason: 'current verify only inspects the package metadata, not its full dep tree',
      trackedIn: 'v0.2',
    },
    {
      area: 'Post-install scripts',
      reason: 'scanner matches the keyword but does not read the actual script content',
      trackedIn: 'v0.2',
    },
    {
      area: 'Runtime server behavior',
      reason: 'mcpvet never executes the server (by design)',
      trackedIn: "won't fix",
    },
  ],
};
