import { McpvetError, isMcpvetError } from '../core/errors.js';
import { serverId } from '../core/ids.js';
import type { NormalizedServer, OriginInfo, ServerId } from '../types/index.js';
import { type PackageRef, extractPackageRef } from './extract.js';
import { parseGithubRef, verifyGithub } from './github.js';
import { verifyNpm } from './npm.js';
import { verifyPypi } from './pypi.js';
import type { VerifyOptions } from './types.js';

const MAX_CONCURRENCY = 5;

/**
 * Top-level entry point. For each server, decide what kind of lookup to
 * attempt, run the lookups in parallel (bounded), and aggregate the
 * results into OriginInfo entries.
 *
 * Network failures don't abort the scan — they produce a degraded
 * OriginInfo with `trustScore: 0` and an `error` field.
 */
export async function verifyAll(
  servers: readonly NormalizedServer[],
  opts: VerifyOptions,
): Promise<OriginInfo[]> {
  const work = servers.map((server) => async (): Promise<OriginInfo> => {
    if (opts.offline) {
      // Offline: check the allowlist from the extracted ref, no network.
      const ref = extractPackageRef(server);
      if (ref && opts.allowlist.isAllowlisted(ref.name)) {
        return offlineAllowlisted(server, ref);
      }
      return localOnly(server);
    }
    const ref = extractPackageRef(server);
    if (ref) {
      return await verifyRef(server, ref, opts);
    }
    // HTTP/SSE servers: try to extract a GitHub ref from the URL
    if (server.transport !== 'stdio') {
      const gh = parseGithubRef(server.url);
      if (gh) {
        return await safeVerify(
          () =>
            verifyGithub(server, gh, {
              allowlisted: opts.allowlist.isAllowlisted(`github:${gh.owner}/${gh.repo}`),
              ...(opts.ghToken !== undefined ? { token: opts.ghToken } : {}),
              ...(opts.fetch !== undefined ? { fetch: opts.fetch } : {}),
            }),
          server,
        );
      }
    }
    return localOnly(server);
  });

  return runBounded(work, MAX_CONCURRENCY);
}

function offlineAllowlisted(server: NormalizedServer, ref: PackageRef): OriginInfo {
  return {
    serverId: serverId(server.name),
    source: ref.source,
    name: ref.name,
    ...(ref.version !== undefined ? { version: ref.version } : {}),
    trustScore: 95,
    allowlisted: true,
    reason: 'on mcpvet allowlist (offline mode)',
  };
}

async function verifyRef(
  server: NormalizedServer,
  ref: PackageRef,
  opts: VerifyOptions,
): Promise<OriginInfo> {
  if (ref.source === 'npm') {
    return safeVerify(
      () =>
        verifyNpm(server, ref, {
          allowlisted: opts.allowlist.isAllowlisted(ref.name),
          ...(opts.fetch !== undefined ? { fetch: opts.fetch } : {}),
        }),
      server,
    );
  }
  return safeVerify(
    () =>
      verifyPypi(server, ref, {
        allowlisted: opts.allowlist.isAllowlisted(ref.name),
        ...(opts.fetch !== undefined ? { fetch: opts.fetch } : {}),
      }),
    server,
  );
}

async function safeVerify(
  fn: () => Promise<OriginInfo>,
  server: NormalizedServer,
): Promise<OriginInfo> {
  try {
    return await fn();
  } catch (err) {
    const sId = serverId(server.name);
    if (isMcpvetError(err)) {
      return {
        serverId: sId,
        source: 'unknown',
        trustScore: 0,
        allowlisted: false,
        reason: 'verification failed',
        error: `${err.code}: ${err.message}`,
      };
    }
    const e =
      err instanceof Error ? err : new McpvetError({ code: 'unknown', message: String(err) });
    return {
      serverId: sId,
      source: 'unknown',
      trustScore: 0,
      allowlisted: false,
      reason: 'verification failed',
      error: e.message,
    };
  }
}

function localOnly(server: NormalizedServer): OriginInfo {
  const sId = serverId(server.name);
  if (server.transport === 'stdio') {
    return {
      serverId: sId,
      source: 'local',
      trustScore: 30,
      allowlisted: false,
      reason: 'local command (no package registry reference)',
    };
  }
  return {
    serverId: sId,
    source: 'unknown',
    trustScore: 20,
    allowlisted: false,
    reason: 'remote URL with no recognizable package reference',
  };
}

/**
 * Run async tasks with bounded concurrency. Preserves the input order
 * in the output.
 */
async function runBounded<T>(tasks: Array<() => Promise<T>>, max: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(max, tasks.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= tasks.length) return;
      const t = tasks[i];
      if (t) results[i] = await t();
    }
  });
  await Promise.all(workers);
  return results;
}
