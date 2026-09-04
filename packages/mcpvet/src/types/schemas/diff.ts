import { z } from 'zod';
import { ServerIdSchema, ToolIdSchema } from './common.js';
import { RiskScoreSchema } from './finding.js';
import { ScanResultSchema } from './scan.js';

/**
 * One change between two scans. The `path` field is dotted JSONPath
 * (e.g. `servers.[0].tools.[2].description`).
 */
export const DiffEntrySchema = z.object({
  kind: z.enum(['added', 'removed', 'modified']),
  serverId: ServerIdSchema,
  serverName: z.string(),
  toolId: ToolIdSchema.optional(),
  toolName: z.string().optional(),
  path: z.string(),
  before: z.unknown().optional(),
  after: z.unknown().optional(),
  /** Human-readable description of the change. */
  summary: z.string(),
});
export type DiffEntry = z.infer<typeof DiffEntrySchema>;

/**
 * Result of comparing two scans. Used by `mcpvet scan --diff` and the
 * GitHub Action to surface "what changed since last scan" in PRs.
 */
export const DiffResultSchema = z.object({
  before: ScanResultSchema.optional(),
  after: ScanResultSchema,
  entries: z.array(DiffEntrySchema),
  /** score.after.value - score.before.value. Positive = riskier than before. */
  riskDelta: z.number(),
  newRiskScore: RiskScoreSchema,
});
export type DiffResult = z.infer<typeof DiffResultSchema>;
