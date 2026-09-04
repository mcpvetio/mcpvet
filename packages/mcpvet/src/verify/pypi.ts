import { NetworkError, NotFoundError, TimeoutError } from '../core/errors.js';
import { serverId } from '../core/ids.js';
import type { NormalizedServer } from '../types/index.js';
import type { OriginInfo, PackageRef } from './types.js';

const REGISTRY = 'https://pypi.org/pypi';
const TIMEOUT_MS = 5_000;

interface PypiInfo {
  info: {
    name: string;
    version: string;
    summary?: string;
    author?: string;
    author_email?: string;
    home_page?: string;
    project_url?: string;
  };
  releases?: Record<string, Array<{ upload_time?: string }>>;
}

/**
 * Look up a package on the PyPI JSON API. Returns OriginInfo with a trust
 * score derived from publisher, recency, and allowlist status.
 */
export async function verifyPypi(
  server: NormalizedServer,
  ref: Extract<PackageRef, { source: 'pypi' }>,
  ctx: { fetch?: typeof globalThis.fetch; allowlisted: boolean },
): Promise<OriginInfo> {
  const sId = serverId(server.name);
  const url = `${REGISTRY}/${encodeURIComponent(ref.name)}/json`;

  let pkg: PypiInfo;
  try {
    const fetcher = ctx.fetch ?? globalThis.fetch;
    const res = await fetcher(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: 'application/json' },
    });
    if (res.status === 404) {
      throw new NotFoundError(`pypi package not found: ${ref.name}`, {
        resource: 'pypi-package',
        path: ref.name,
      });
    }
    if (!res.ok) {
      throw new NetworkError(`pypi returned ${res.status}`, { url, status: res.status });
    }
    pkg = (await res.json()) as PypiInfo;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      throw new TimeoutError(`pypi lookup timed out: ${ref.name}`, {
        operation: 'pypi-lookup',
        timeoutMs: TIMEOUT_MS,
      });
    }
    throw new NetworkError(`pypi lookup failed: ${ref.name}`, { url, cause: err });
  }

  const latestVersion = pkg.info.version;
  const lastPublished = pkg.releases?.[latestVersion]?.[0]?.upload_time;

  const trust = computeTrust({
    allowlisted: ctx.allowlisted,
    knownPublisher: Boolean(pkg.info.author || pkg.info.author_email),
    recentPublish: lastPublished ? isRecent(lastPublished) : false,
    pinned: Boolean(ref.version),
  });

  return {
    serverId: sId,
    source: 'pypi',
    name: pkg.info.name,
    version: latestVersion,
    publisher: pkg.info.author ?? pkg.info.author_email,
    ...(lastPublished !== undefined ? { lastPublished } : {}),
    trustScore: trust,
    allowlisted: ctx.allowlisted,
    reason: ctx.allowlisted
      ? 'on mcpvet allowlist'
      : pkg.info.author
        ? `published by ${pkg.info.author} on pypi`
        : 'package found on pypi (unknown author)',
  };
}

interface TrustInputs {
  allowlisted: boolean;
  knownPublisher: boolean;
  recentPublish: boolean;
  pinned: boolean;
}

function computeTrust(i: TrustInputs): number {
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
