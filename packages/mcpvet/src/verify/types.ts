import type { OriginInfo, ServerId } from '../types/index.js';

export type { OriginInfo };

/**
 * A reference to a package we want to verify. We extract these from server
 * commands/URLs so we can ask the right registry.
 */
export type PackageRef =
  | { source: 'npm'; name: string; version?: string }
  | { source: 'pypi'; name: string; version?: string };

/** A GitHub repo reference, separate from registry packages. */
export interface GithubRef {
  source: 'github';
  owner: string;
  repo: string;
}

/** Common options for all verifiers. */
export interface VerifyOptions {
  /** When true, skip all network calls and use cache + allowlist only. */
  offline: boolean;
  /** GitHub token to bypass anonymous rate limits. */
  ghToken?: string;
  /** Allowlist to check against. */
  allowlist: { isAllowlisted(ref: string): boolean };
  /** Injectable fetch for tests. */
  fetch?: typeof globalThis.fetch;
}

/** Per-server context used to deduplicate origin entries. */
export interface OriginContext {
  serverId: ServerId;
}
