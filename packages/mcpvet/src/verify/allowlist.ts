/**
 * Curated allowlist of well-known MCP servers. Each entry is something
 * we've personally vetted — known publisher, reasonable install volume,
 * no known history of supply-chain incidents.
 *
 * Format: name (with optional scope/version) → human-readable note.
 * Version pins are deliberate; the user can override their policy to
 * accept a wider range.
 */
export interface AllowlistEntry {
  /** npm package name (with scope if scoped), pypi name, or "github:owner/repo". */
  ref: string;
  /** Display name in CLI output. */
  displayName: string;
  /** Short note for the user. */
  note: string;
}

export const DEFAULT_ALLOWLIST: readonly AllowlistEntry[] = [
  // Anthropic / official
  {
    ref: '@modelcontextprotocol/server-filesystem',
    displayName: 'Filesystem',
    note: 'Anthropic reference implementation',
  },
  {
    ref: '@modelcontextprotocol/server-git',
    displayName: 'Git',
    note: 'Anthropic reference implementation',
  },
  {
    ref: '@modelcontextprotocol/server-github',
    displayName: 'GitHub',
    note: 'Anthropic reference implementation',
  },
  {
    ref: '@modelcontextprotocol/server-gitlab',
    displayName: 'GitLab',
    note: 'Anthropic reference implementation',
  },
  {
    ref: '@modelcontextprotocol/server-slack',
    displayName: 'Slack',
    note: 'Anthropic reference implementation',
  },
  {
    ref: '@modelcontextprotocol/server-google-drive',
    displayName: 'Google Drive',
    note: 'Anthropic reference implementation',
  },
  {
    ref: '@modelcontextprotocol/server-postgres',
    displayName: 'Postgres',
    note: 'Anthropic reference implementation',
  },
  {
    ref: '@modelcontextprotocol/server-sqlite',
    displayName: 'SQLite',
    note: 'Anthropic reference implementation',
  },
  {
    ref: '@modelcontextprotocol/server-puppeteer',
    displayName: 'Puppeteer',
    note: 'Anthropic reference implementation',
  },
  {
    ref: '@modelcontextprotocol/server-brave-search',
    displayName: 'Brave Search',
    note: 'Anthropic reference implementation',
  },
  {
    ref: '@modelcontextprotocol/server-fetch',
    displayName: 'Fetch',
    note: 'Anthropic reference implementation',
  },
  {
    ref: '@modelcontextprotocol/server-everything',
    displayName: 'Everything (test)',
    note: 'Anthropic test server',
  },
  // Community-maintained, vetted
  { ref: 'mcp-server-git', displayName: 'Git (Python)', note: 'Community, well-known' },
  { ref: '@upstash/mcp-server', displayName: 'Upstash', note: 'Upstash official' },
  { ref: '@notionhq/notion-mcp-server', displayName: 'Notion', note: 'Notion official' },
  { ref: '@slack/mcp-server', displayName: 'Slack (official)', note: 'Slack official' },
];

export class Allowlist {
  private readonly byRef: Map<string, AllowlistEntry>;

  constructor(entries: readonly AllowlistEntry[] = DEFAULT_ALLOWLIST) {
    this.byRef = new Map(entries.map((e) => [e.ref, e]));
  }

  /** Returns the entry if `ref` is allowlisted, else undefined. */
  lookup(ref: string): AllowlistEntry | undefined {
    return this.byRef.get(ref);
  }

  isAllowlisted(ref: string): boolean {
    return this.byRef.has(ref);
  }

  /** Returns the allowlist size. */
  size(): number {
    return this.byRef.size;
  }
}
