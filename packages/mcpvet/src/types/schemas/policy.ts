import { z } from 'zod';
import { PatternIdSchema, SeveritySchema } from './common.js';
import type { Severity } from './common.js';

/**
 * User-provided policy. Loaded from `.mcpaudit.yaml` at the repo root
 * (or whatever path the user passes via --policy).
 */
export const PolicySchema = z.object({
  version: z.literal(1),
  /** Servers explicitly allowed by name. If set, anything not in the list is flagged. */
  allowedServers: z.array(z.string()).optional(),
  /** Server names that are always rejected, even if they pass pattern matching. */
  blockedServers: z.array(z.string()).optional(),
  /** Pattern IDs to disable entirely. */
  disabledPatterns: z.array(PatternIdSchema).default([]),
  /** Minimum severity to report. Findings below this level are suppressed. */
  severityThreshold: SeveritySchema.default('low'),
  /** If true, exit with non-zero on any finding above threshold. Default true. */
  failOnFindings: z.boolean().default(true),
});
export type Policy = z.infer<typeof PolicySchema>;

/**
 * Verdict returned by Policy.evaluate(). The CLI uses this to decide
 * whether to fail a CI run.
 */
export type Verdict =
  | { kind: 'allow'; reason: string }
  | { kind: 'warn'; reason: string; severity: Severity }
  | { kind: 'block'; reason: string; severity: Severity };
