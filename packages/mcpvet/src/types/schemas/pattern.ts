import { z } from 'zod';
import { PatternIdSchema, SeveritySchema } from './common.js';

/**
 * A pattern match condition. Patterns are data — they live in YAML files
 * under `patterns/` and can be added/updated by the community without
 * touching the engine code.
 */
const MatcherSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('regex'),
    pattern: z.string(),
    flags: z.string().default('i'),
  }),
  z.object({
    kind: z.literal('keyword'),
    pattern: z.string(),
    caseSensitive: z.boolean().default(false),
  }),
  z.object({
    kind: z.literal('glob'),
    pattern: z.string(),
  }),
]);

/**
 * A single security pattern. One pattern = one rule = one finding type.
 * References MUST point to public sources (CSA, OWASP, CVE, incident writeup).
 */
export const PatternSchema = z.object({
  id: PatternIdSchema,
  name: z.string().min(1),
  description: z.string().min(1),
  category: z.enum([
    'exfiltration',
    'credential-access',
    'command-execution',
    'prompt-injection',
    'covert-channels',
    'persistence',
    'supply-chain',
  ]),
  severity: SeveritySchema,
  fields: z.array(z.enum(['description', 'command', 'args', 'env', 'headers', 'url', 'name'])),
  matchers: z.array(MatcherSchema).min(1),
  references: z.array(z.string().url()).min(1),
  enabled: z.boolean().default(true),
});
export type Pattern = z.infer<typeof PatternSchema>;

/**
 * The full pattern catalog as loaded from YAML.
 */
export const PatternCatalogSchema = z.object({
  version: z.literal(1),
  patterns: z.array(PatternSchema),
});
export type PatternCatalog = z.infer<typeof PatternCatalogSchema>;
