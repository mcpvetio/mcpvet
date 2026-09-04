import { readFile } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';
import type { Finding, Policy, Verdict } from '../types/index.js';
import { PolicySchema } from '../types/index.js';
import { PolicyError } from './errors.js';

const SEVERITY_RANK = { info: 0, low: 1, medium: 2, high: 3, critical: 4 } as const;

/** Built-in default policy. Used when no `.mcpaudit.yaml` is present. */
export function defaultPolicy(): Policy {
  return PolicySchema.parse({ version: 1 });
}

/** Load a policy from a YAML file. Falls back to defaults on any error. */
export async function loadPolicy(path: string | undefined): Promise<Policy> {
  if (!path) return defaultPolicy();
  let text: string;
  try {
    text = await readFile(path, 'utf8');
  } catch (err) {
    throw new PolicyError(`cannot read policy file: ${path}`, { path, cause: err });
  }
  let raw: unknown;
  try {
    raw = parseYaml(text);
  } catch (err) {
    throw new PolicyError(`invalid YAML in policy file: ${path}`, { path, cause: err });
  }
  const result = PolicySchema.safeParse(raw);
  if (!result.success) {
    throw new PolicyError(`policy does not match schema: ${path}`, { path, cause: result.error });
  }
  return result.data;
}

/**
 * Evaluate a single finding against a policy. Used by the CLI to decide
 * whether to exit non-zero, and by the GitHub Action to block PRs.
 */
export function evaluate(finding: Finding, policy: Policy): Verdict {
  // Explicit server allowlist — anything not in it is blocked.
  if (policy.allowedServers && policy.allowedServers.length > 0) {
    if (!policy.allowedServers.includes(finding.serverName)) {
      return {
        kind: 'block',
        reason: `server "${finding.serverName}" is not in the allowlist`,
        severity: finding.severity,
      };
    }
  }
  // Explicit server blocklist — overrides everything else.
  if (policy.blockedServers?.includes(finding.serverName)) {
    return {
      kind: 'block',
      reason: `server "${finding.serverName}" is in the blocklist`,
      severity: finding.severity,
    };
  }
  // Below-threshold findings are warnings, not blockers.
  if (SEVERITY_RANK[finding.severity] < SEVERITY_RANK[policy.severityThreshold]) {
    return { kind: 'allow', reason: 'below severity threshold' };
  }
  return {
    kind: 'warn',
    reason: `severity ${finding.severity} ≥ threshold ${policy.severityThreshold}`,
    severity: finding.severity,
  };
}

/**
 * True if the scan should exit with a non-zero code. A scan fails if:
 *   - any finding is explicitly blocked (blocklist / not in allowlist)
 *   - any finding meets the severity threshold (warn or block)
 */
export function shouldFail(findings: readonly Finding[], policy: Policy): boolean {
  if (!policy.failOnFindings) return false;
  for (const f of findings) {
    const v = evaluate(f, policy);
    if (v.kind !== 'allow') return true;
  }
  return false;
}
