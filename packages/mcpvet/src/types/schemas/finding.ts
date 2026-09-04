import { z } from 'zod';
import {
  FieldSchema,
  FindingIdSchema,
  PatternIdSchema,
  SEVERITY_ORDER,
  ServerIdSchema,
  SeveritySchema,
  ToolIdSchema,
} from './common.js';
import type { Severity } from './common.js';

export { SEVERITY_ORDER, SeveritySchema } from './common.js';
export type { Severity } from './common.js';

/**
 * A single audit finding. The `id` is content-derived (stable across runs
 * given the same input), so users can suppress findings by ID in policy.
 */
export const FindingSchema = z.object({
  id: FindingIdSchema,
  patternId: PatternIdSchema,
  severity: SeveritySchema,
  serverId: ServerIdSchema,
  serverName: z.string(),
  toolId: ToolIdSchema.optional(),
  toolName: z.string().optional(),
  field: FieldSchema,
  snippet: z.string(),
  message: z.string(),
  references: z.array(z.string().url()).default([]),
});
export type Finding = z.infer<typeof FindingSchema>;

/**
 * The aggregate risk score for a scan. Value is 0-100 (higher = riskier).
 * Level is the highest severity present in the findings (or 'info' if none).
 */
export const RiskScoreSchema = z.object({
  value: z.number().min(0).max(100),
  level: SeveritySchema,
  findingsByLevel: z.record(SeveritySchema, z.number().int().nonnegative()),
});
export type RiskScore = z.infer<typeof RiskScoreSchema>;
