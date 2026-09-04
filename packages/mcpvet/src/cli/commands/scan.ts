import path from 'node:path';
import { audit } from '../../core/auditor.js';
import { LocalBaselineStore, NoopBaselineStore } from '../../core/baseline.js';
import { diff } from '../../core/diff.js';
import { scanId } from '../../core/ids.js';
import { type Location, getGlobalLocations } from '../../core/locations.js';
import { normalizeServer, parseConfigFile } from '../../core/parser.js';
import { loadPolicy, shouldFail } from '../../core/policy.js';
import { computeScore } from '../../core/score.js';
import { findWorkspaceConfigs } from '../../core/workspace-walker.js';
import { loadPatternCatalog } from '../../patterns/loader.js';
import type {
  DiffResult,
  OriginInfo,
  Policy,
  ScanResult,
  ServerWithTools,
  Severity,
} from '../../types/index.js';
import { PolicySchema } from '../../types/index.js';
import { Allowlist, verifyAll } from '../../verify/index.js';
import { setColorEnabled } from '../colors.js';
import { log } from '../logger.js';
import { formatHuman } from '../output/human.js';
import { formatJson } from '../output/json.js';
import { formatMarkdown } from '../output/markdown.js';
import { formatSarif } from '../output/sarif.js';

export interface ScanOptions {
  json?: boolean;
  markdown?: boolean;
  sarif?: boolean;
  diff?: boolean;
  policy?: string;
  severity?: Severity;
  offline?: boolean;
  noColor?: boolean;
  quiet?: boolean;
  verbose?: boolean;
  baseline?: string;
  cwd?: string;
}

export const EXIT = {
  OK: 0,
  FINDINGS: 1,
  RUNTIME_ERROR: 2,
  CONFIG_ERROR: 3,
  NETWORK_FATAL: 4,
} as const;

export async function runScan(opts: ScanOptions): Promise<number> {
  if (opts.noColor) setColorEnabled(false);
  if (!opts.quiet && !opts.json && !opts.markdown && !opts.sarif) {
    if (opts.verbose) log.info('starting scan');
  }

  // 1. Load policy
  let policy: Policy;
  try {
    policy = await loadPolicy(opts.policy);
  } catch (err) {
    log.error(`policy error: ${(err as Error).message}`);
    return EXIT.CONFIG_ERROR;
  }
  if (opts.severity) policy = { ...policy, severityThreshold: opts.severity };
  // Validate the policy shape (severity is one of the enum values)
  const policyResult = PolicySchema.safeParse(policy);
  if (!policyResult.success) {
    log.error(`invalid policy: ${policyResult.error.message}`);
    return EXIT.CONFIG_ERROR;
  }

  // 2. Discover configs
  const cwd = opts.cwd ?? process.cwd();
  const globalLocations = getGlobalLocations();
  const workspacePaths = await findWorkspaceConfigs(cwd);
  const allLocations: Array<Location & { exists?: boolean }> = [...globalLocations];
  for (const p of workspacePaths) {
    allLocations.push({ ide: 'unknown', path: p, global: false as never });
  }

  if (opts.verbose) log.info(`discovered ${allLocations.length} config location(s)`);

  // 3. Parse + normalize
  const serversByName = new Map<string, ServerWithTools>();
  const sourceErrors: string[] = [];
  for (const loc of allLocations) {
    try {
      const parsed = await parseConfigFile(loc.ide, loc.path);
      for (const [name, raw] of parsed.servers) {
        const normalized = normalizeServer(name, raw);
        if (!normalized) continue;
        // Workspace configs (global: false) override global ones with the same name
        const existing = serversByName.get(name);
        if (!existing || !loc.global) {
          serversByName.set(name, { server: normalized, tools: [] });
        }
      }
    } catch (err) {
      const msg = (err as Error).message;
      sourceErrors.push(`${loc.path}: ${msg}`);
      if (opts.verbose) log.debug(`skip ${loc.path}: ${msg}`);
    }
  }
  if (sourceErrors.length > 0 && opts.verbose) {
    log.info(`${sourceErrors.length} config file(s) could not be parsed`);
  }

  // 4. Load patterns
  const catalog = await loadPatternCatalog();
  if (opts.verbose) log.info(`loaded ${catalog.patterns.length} patterns`);

  // 5. Audit
  const findings = audit(Array.from(serversByName.values()), catalog, policyResult.data);

  // 6. Verify
  const allowlist = new Allowlist();
  const origins: OriginInfo[] = await verifyAll(
    Array.from(serversByName.values()).map((s) => s.server),
    {
      offline: Boolean(opts.offline),
      allowlist,
      ...(process.env.GITHUB_TOKEN !== undefined ? { ghToken: process.env.GITHUB_TOKEN } : {}),
    },
  );

  // 7. Score
  const score = computeScore(findings);

  // 8. Build ScanResult
  const startedAt = new Date().toISOString();
  const scanResult: ScanResult = {
    id: scanId(),
    startedAt,
    finishedAt: new Date().toISOString(),
    sources: allLocations.map((l) => ({
      ide: l.ide,
      path: l.path,
      global: Boolean(l.global),
      exists: true,
    })),
    servers: Array.from(serversByName.values()),
    findings,
    origins,
    score,
    toolVersion: '0.0.0',
  };

  // 9. Diff vs baseline
  let diffResult: DiffResult | undefined;
  if (opts.diff) {
    const baselinePath = opts.baseline ?? defaultBaselinePath();
    const store = new LocalBaselineStore(baselinePath);
    const before = await store.read();
    diffResult = diff(before ? before.scanResult : undefined, scanResult);
  }

  // 10. Output
  if (opts.json) {
    process.stdout.write(formatJson(scanResult, origins, diffResult));
  } else if (opts.markdown) {
    process.stdout.write(formatMarkdown(scanResult, origins, diffResult));
  } else if (opts.sarif) {
    process.stdout.write(formatSarif(scanResult));
  } else {
    process.stdout.write(
      formatHuman(scanResult, origins, {
        threshold: policyResult.data.severityThreshold,
        noColor: Boolean(opts.noColor),
        ...(diffResult !== undefined ? { diff: diffResult } : {}),
      }),
    );
    if (!opts.quiet) process.stdout.write('\n');
  }

  // 11. Save baseline (always, on success)
  if (!opts.diff) {
    // Update the baseline after a clean scan so future --diff has something to compare
    // (opt-out via env MCPVET_NO_BASELINE if user wants)
    if (!process.env.MCPVET_NO_BASELINE) {
      const baselinePath = opts.baseline ?? defaultBaselinePath();
      const store = new LocalBaselineStore(baselinePath);
      await store.write({
        version: 1,
        capturedAt: new Date().toISOString(),
        scanResult,
      });
    }
  }

  // 12. Exit code
  if (shouldFail(findings, policyResult.data)) return EXIT.FINDINGS;
  return EXIT.OK;
}

function defaultBaselinePath(): string {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? '/tmp';
  return path.join(home, '.mcpvet', 'baseline.json');
}

// Keep NoopBaselineStore in the public API of the module so tests can stub it.
export { NoopBaselineStore };
