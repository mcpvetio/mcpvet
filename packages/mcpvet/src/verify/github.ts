import { NetworkError, NotFoundError, TimeoutError } from '../core/errors.js';
import { serverId } from '../core/ids.js';
import type { NormalizedServer } from '../types/index.js';
import type { OriginInfo } from './types.js';

const API = 'https://api.github.com';
const TIMEOUT_MS = 5_000;

interface GithubRepo {
  full_name: string;
  archived: boolean;
  disabled: boolean;
  pushed_at: string;
  stargazers_count: number;
  owner: { login: string };
  html_url: string;
}

export interface GithubLookupInput {
  owner: string;
  repo: string;
}

/**
 * Parse a GitHub URL or "owner/repo" shorthand into a lookup input.
 * Returns null if the input doesn't look like a GitHub reference.
 */
export function parseGithubRef(input: string): GithubLookupInput | null {
  // owner/repo
  if (/^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/.test(input)) {
    const [owner, repo] = input.split('/');
    if (owner && repo) return { owner, repo };
  }
  // https://github.com/owner/repo[.git][/...]
  const m = input.match(
    /^https?:\/\/github\.com\/([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+?)(?:\.git)?\/?$/,
  );
  if (m) {
    return { owner: m[1] ?? '', repo: m[2] ?? '' };
  }
  return null;
}

/**
 * Look up a repo on the GitHub REST API. Optionally uses GITHUB_TOKEN env
 * to bump from 60 to 5000 requests/hour.
 */
export async function verifyGithub(
  server: NormalizedServer,
  input: GithubLookupInput,
  ctx: { fetch?: typeof globalThis.fetch; allowlisted: boolean; token?: string },
): Promise<OriginInfo> {
  const sId = serverId(server.name);
  const url = `${API}/repos/${input.owner}/${input.repo}`;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'mcpvet',
  };
  if (ctx.token) {
    headers.Authorization = `Bearer ${ctx.token}`;
  }

  let repo: GithubRepo;
  try {
    const fetcher = ctx.fetch ?? globalThis.fetch;
    const res = await fetcher(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers });
    if (res.status === 404) {
      throw new NotFoundError(`github repo not found: ${input.owner}/${input.repo}`, {
        resource: 'github-repo',
        path: `${input.owner}/${input.repo}`,
      });
    }
    if (!res.ok) {
      throw new NetworkError(`github returned ${res.status}`, { url, status: res.status });
    }
    repo = (await res.json()) as GithubRepo;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      throw new TimeoutError('github lookup timed out', {
        operation: 'github-lookup',
        timeoutMs: TIMEOUT_MS,
      });
    }
    throw new NetworkError('github lookup failed', { url, cause: err });
  }

  const trust = computeTrust({
    allowlisted: ctx.allowlisted,
    knownPublisher: repo.stargazers_count > 10,
    recentPublish: isRecent(repo.pushed_at),
    pinned: true,
    archived: repo.archived || repo.disabled,
  });

  return {
    serverId: sId,
    source: 'github',
    name: repo.full_name,
    version: repo.pushed_at.slice(0, 10),
    publisher: repo.owner.login,
    lastPublished: repo.pushed_at,
    trustScore: trust,
    allowlisted: ctx.allowlisted,
    reason: ctx.allowlisted
      ? 'on mcpvet allowlist'
      : repo.archived
        ? 'repo is archived (read-only)'
        : `github repo by @${repo.owner.login}`,
  };
}

interface TrustInputs {
  allowlisted: boolean;
  knownPublisher: boolean;
  recentPublish: boolean;
  pinned: boolean;
  archived: boolean;
}

function computeTrust(i: TrustInputs): number {
  if (i.archived) return 10;
  if (i.allowlisted) return 95;
  let score = 50;
  if (i.knownPublisher) score += 20;
  if (i.recentPublish) score += 10;
  if (i.pinned) score += 5;
  return Math.max(0, Math.min(100, score));
}

function isRecent(iso: string): boolean {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  return Date.now() - t < 365 * 24 * 60 * 60 * 1000;
}
