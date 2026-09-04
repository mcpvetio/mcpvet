import type { Finding, RiskScore, Severity } from '../types/index.js';
import { SEVERITY_ORDER } from '../types/index.js';

/**
 * Severity weights used to compute the numeric risk score. Tuned so that
 * a single critical finding already produces a high score, but a cluster
 * of medium findings is also surfaced.
 */
const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 40,
  high: 20,
  medium: 8,
  low: 3,
  info: 1,
};

/**
 * Pure function. Given a list of findings, returns a deterministic RiskScore.
 *
 * Scoring model:
 *   - Each finding contributes its severity weight.
 *   - Diminishing returns via log-ish saturation: 1 critical ≈ 40, 2 criticals ≈ 56, etc.
 *   - Capped at 100.
 *   - `level` is the highest severity present (or 'info' if no findings).
 */
export function computeScore(findings: readonly Finding[]): RiskScore {
  const findingsByLevel: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  for (const f of findings) {
    findingsByLevel[f.severity]++;
  }

  const raw =
    SEVERITY_WEIGHT.critical * findingsByLevel.critical +
    SEVERITY_WEIGHT.high * findingsByLevel.high +
    SEVERITY_WEIGHT.medium * findingsByLevel.medium +
    SEVERITY_WEIGHT.low * findingsByLevel.low +
    SEVERITY_WEIGHT.info * findingsByLevel.info;

  // Saturating curve: sqrt-scaled so a single critical already scores 50,
  // a cluster of 5 criticals saturates at 100, and 50 criticals still = 100.
  // Tunable via the constant; do not change without re-running the snapshot tests.
  const value = Math.min(100, Math.round(Math.sqrt(raw) * 8));

  const level = highestSeverity(findingsByLevel);

  return { value, level, findingsByLevel };
}

function highestSeverity(counts: Record<Severity, number>): Severity {
  for (const s of ['critical', 'high', 'medium', 'low', 'info'] as const) {
    if (counts[s] > 0) return s;
  }
  return 'info';
}

/**
 * Returns true if the score meets or exceeds the given threshold.
 * Used by the CLI to decide exit code and by the GitHub Action to decide
 * whether to fail the workflow.
 */
export function meetsThreshold(score: RiskScore, threshold: Severity): boolean {
  return SEVERITY_ORDER[score.level] >= SEVERITY_ORDER[threshold];
}
