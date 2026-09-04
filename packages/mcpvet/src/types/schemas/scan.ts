import { z } from 'zod';
import { ScanIdSchema } from './common.js';
import { ConfigSourceSchema } from './config.js';
import { FindingSchema, RiskScoreSchema } from './finding.js';
import { OriginInfoSchema } from './origin.js';
import { NormalizedServerSchema } from './server.js';
import { MCPToolSchema } from './tool.js';

/**
 * A server plus the tools it declares. We pair them so findings can reference
 * both the server and a specific tool.
 */
export const ServerWithToolsSchema = z.object({
  server: NormalizedServerSchema,
  tools: z.array(MCPToolSchema).default([]),
});
export type ServerWithTools = z.infer<typeof ServerWithToolsSchema>;

/**
 * The complete output of a single scan.
 */
export const ScanResultSchema = z.object({
  id: ScanIdSchema,
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime(),
  /** Where the configs came from (which IDE, which file). */
  sources: z.array(ConfigSourceSchema),
  /** All servers discovered across all sources, deduplicated by name. */
  servers: z.array(ServerWithToolsSchema),
  /** Audit findings from pattern matching. */
  findings: z.array(FindingSchema),
  /** Origin verification results, keyed by serverId. */
  origins: z.array(OriginInfoSchema).default([]),
  /** Aggregate risk score. */
  score: RiskScoreSchema,
  /** Tool version that produced this result. */
  toolVersion: z.string(),
});
export type ScanResult = z.infer<typeof ScanResultSchema>;
