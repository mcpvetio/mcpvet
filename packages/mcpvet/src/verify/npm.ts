import { NetworkError, NotFoundError, TimeoutError } from '../core/errors.js';
import { serverId } from '../core/ids.js';
import type { NormalizedServer } from '../types/index.js';
import type { OriginInfo, PackageRef } from './types.js';

const REGISTRY = 'https://registry.npmjs.org';
const TIMEOUT_MS = 5_000;

interface NpmPackage {
  name: string;
  description?: string;
  'dist-tags'?: { latest?: string };
  time?: Record<string, string>;
  maintainers?: Array<{ name: string; email?: string }>;
  versions?: Record<string, { publisher?: { username?: string; email?: string } }>;
  repository?: { url?: string };
}

/**
 * Look up a package on the npm registry. Returns OriginInfo with a trust
 * score derived from publisher, recency, and allowlist status.
 */
export async function verifyNpm(
  server: NormalizedServer,
  ref: Extract<PackageRef, { source: 'npm' }>,
  ctx: { fetch?: typeof globalThis.fetch; allowlisted: boolean },
): Promise<OriginInfo> {
  const sId = serverId(server.name);
  const url = `${REGISTRY}/${encodeURIComponent(ref.name).replace('%40', '@')}`;

  let pkg: NpmPackage;
  try {
    const fetcher = ctx.fetch ?? globalThis.fetch;
    const res = await fetcher(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: 'application/json' },
    });
    if (res.status === 404) {
      throw new NotFoundError(`npm package not found: ${ref.name}`, {
        resource: 'npm-package',
        path: ref.name,
      });
    }
    if (!res.ok) {
      throw new NetworkError(`npm registry returned ${res.status}`, { url, status: res.status });
    }
    pkg = (await res.json()) as NpmPackage;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new TimeoutError(`npm lookup timed out: ${ref.name}`, {
        operation: 'npm-lookup',
        timeoutMs: TIMEOUT_MS,
      });
    }
    if (err instanceof Error && err.name === 'AbortError') {
      throw new TimeoutError(`npm lookup aborted: ${ref.name}`, {
        operation: 'npm-lookup',
        timeoutMs: TIMEOUT_MS,
      });
    }
    throw new NetworkError(`npm lookup failed: ${ref.name}`, { url, cause: err });
  }

  const latestVersion = pkg['dist-tags']?.latest ?? Object.keys(pkg.versions ?? {}).pop();
  const lastPublished = latestVersion ? pkg.time?.[latestVersion] : undefined;
  const publisher = latestVersion ? pkg.versions?.[latestVersion]?.publisher?.username : undefined;
  const maintainer = pkg.maintainers?.[0]?.name;

  const trust = computeTrust({
    allowlisted: ctx.allowlisted,
    knownPublisher: Boolean(publisher || maintainer),
    recentPublish: lastPublished ? isRecent(lastPublished) : false,
    pinned: Boolean(ref.version),
  });

  return {
    serverId: sId,
    source: 'npm',
    name: pkg.name,
    version: latestVersion,
    publisher: publisher ?? maintainer,
    ...(lastPublished !== undefined ? { lastPublished } : {}),
    trustScore: trust,
    allowlisted: ctx.allowlisted,
    reason: ctx.allowlisted
      ? 'on mcpvet allowlist'
      : publisher
        ? `published by ${publisher} on npm`
        : maintainer
          ? `maintained by ${maintainer} on npm`
          : 'package found on npm (unknown publisher)',
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
