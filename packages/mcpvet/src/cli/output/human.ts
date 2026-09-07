import { COVERAGE } from '../../core/coverage.js';
import type { DiffResult, OriginInfo, ScanResult, Severity } from '../../types/index.js';
import { SEVERITY_ORDER } from '../../types/index.js';
import { c } from '../colors.js';

const SEVERITY_BADGE: Record<Severity, (s: string) => string> = {
  critical: (s) => c.red(c.bold(s)),
  high: (s) => c.yellow(c.bold(s)),
  medium: (s) => c.blue(s),
  low: (s) => c.gray(s),
  info: (s) => c.dim(s),
};

const SEVERITY_RANK = { info: 0, low: 1, medium: 2, high: 3, critical: 4 } as const;

export interface HumanOptions {
  threshold: Severity;
  noColor: boolean;
  diff?: DiffResult;
}

export function formatHuman(scan: ScanResult, origins: OriginInfo[], opts: HumanOptions): string {
  const lines: string[] = [];
  const visibleFindings = scan.findings.filter(
    (f) => SEVERITY_RANK[f.severity] >= SEVERITY_RANK[opts.threshold],
  );
  const visibleOrigins = origins;

  // Header
  lines.push(
    c.bold(`mcpvet scan — ${scan.servers.length} server(s), ${visibleFindings.length} finding(s)`),
  );
  lines.push(
    `risk score: ${formatScore(scan.score.value)} ${SEVERITY_BADGE[scan.score.level](`(${scan.score.level})`)}`,
  );
  lines.push('');

  // Findings
  if (visibleFindings.length === 0) {
    lines.push(c.green('✓ No findings at the configured threshold.'));
  } else {
    lines.push(c.bold('Findings'));
    lines.push('');
    // Sort: critical first, then by server name
    const sorted = [...visibleFindings].sort((a, b) => {
      const sev = SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity];
      if (sev !== 0) return sev;
      return a.serverName.localeCompare(b.serverName);
    });
    for (const f of sorted) {
      const badge = SEVERITY_BADGE[f.severity](f.severity.toUpperCase().padEnd(8));
      const where = f.toolName ? `${f.serverName} (${f.toolName})` : f.serverName;
      lines.push(`${badge} ${c.bold(where)}`);
      lines.push(`  ${c.dim('pattern:')}  ${f.patternId}`);
      lines.push(`  ${c.dim('field:   ')} ${f.field}`);
      lines.push(`  ${c.dim('match:   ')} ${truncate(f.snippet, 100)}`);
      if (f.references.length > 0) {
        lines.push(`  ${c.dim('refs:    ')} ${f.references.join(', ')}`);
      }
      lines.push('');
    }
  }

  // Origins
  if (visibleOrigins.length > 0) {
    lines.push(c.bold('Origin verification'));
    lines.push('');
    for (const o of visibleOrigins) {
      const mark = o.error
        ? c.red('✗')
        : o.allowlisted
          ? c.green('✓')
          : o.trustScore >= 70
            ? c.cyan('✓')
            : c.yellow('?');
      const name = o.name ? `${o.source}:${o.name}` : o.source;
      const version = o.version ? `@${o.version}` : '';
      const trust = o.error ? '—' : `trust ${o.trustScore}`;
      lines.push(`  ${mark} ${c.bold(name)}${c.dim(version)}  ${c.dim(trust)}  ${c.dim(o.reason)}`);
    }
    lines.push('');
  }

  // Diff summary
  if (opts.diff && opts.diff.entries.length > 0) {
    lines.push(c.bold('Changes since baseline'));
    lines.push('');
    for (const e of opts.diff.entries) {
      const kind =
        e.kind === 'added'
          ? c.green('+ added')
          : e.kind === 'removed'
            ? c.red('- removed')
            : c.yellow('~ modified');
      lines.push(`  ${kind}  ${e.summary}`);
    }
    lines.push('');
    if (opts.diff.riskDelta > 0) {
      lines.push(c.red(`risk delta: +${opts.diff.riskDelta}`));
    } else if (opts.diff.riskDelta < 0) {
      lines.push(c.green(`risk delta: ${opts.diff.riskDelta}`));
    }
  }

  // Coverage (always shown — honest about what we don't check)
  lines.push(
    c.bold(
      `Coverage  ${c.dim(`(${COVERAGE.checked.length} checked, ${COVERAGE.notChecked.length} not checked)`)}`,
    ),
  );
  lines.push('');
  for (const c1 of COVERAGE.checked) {
    lines.push(`  ${c.green('✓')} ${c1}`);
  }
  for (const n of COVERAGE.notChecked) {
    const tracked = n.trackedIn ? c.dim(` — ${n.trackedIn}`) : '';
    lines.push(`  ${c.yellow('✗')} ${c.bold(n.area)}${c.dim(` — ${n.reason}`)}${tracked}`);
  }
  lines.push('');

  return lines.join('\n');
}

function formatScore(v: number): string {
  if (v >= 80) return c.red(`${v}/100`);
  if (v >= 50) return c.yellow(`${v}/100`);
  if (v >= 20) return c.blue(`${v}/100`);
  return c.green(`${v}/100`);
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`;
}
