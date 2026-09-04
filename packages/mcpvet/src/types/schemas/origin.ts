import { z } from 'zod';
import { ServerIdSchema } from './common.js';

/**
 * Where a server's package came from. `unknown` means we couldn't verify
 * the origin (e.g. local command, private repo, --offline mode).
 */
export const OriginSourceSchema = z.enum(['npm', 'pypi', 'github', 'local', 'unknown']);
export type OriginSource = z.infer<typeof OriginSourceSchema>;

/**
 * Result of origin verification for a single server.
 */
export const OriginInfoSchema = z.object({
  serverId: ServerIdSchema,
  source: OriginSourceSchema,
  name: z.string().optional(),
  version: z.string().optional(),
  publisher: z.string().optional(),
  lastPublished: z.string().datetime().optional(),
  /** 0-100. Higher = more trustworthy. Heuristic combining known publisher, recent publish, allowlist hit. */
  trustScore: z.number().min(0).max(100),
  /** True if the server is on our curated allowlist. */
  allowlisted: z.boolean(),
  /** Human-readable reason for the trust score, e.g. "allowlisted by mcpvet", "unknown publisher", "published >2y ago" */
  reason: z.string(),
  /** Error message if the lookup failed. */
  error: z.string().optional(),
});
export type OriginInfo = z.infer<typeof OriginInfoSchema>;
