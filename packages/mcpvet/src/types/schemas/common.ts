import { z } from 'zod';

/**
 * Branded string types — derived from Zod schemas so the runtime validator
 * and the compile-time type stay in sync. The runtime value is still a
 * string; the type system prevents us from passing a `FindingId` where a
 * `PatternId` is expected.
 */
export const FindingIdSchema = z.string().min(1).brand<'FindingId'>();
export const PatternIdSchema = z
  .string()
  .regex(/^[a-z0-9-]+$/, 'pattern id must be kebab-case')
  .brand<'PatternId'>();
export const ServerIdSchema = z.string().min(1).brand<'ServerId'>();
export const ToolIdSchema = z.string().min(1).brand<'ToolId'>();
export const ScanIdSchema = z.string().min(1).brand<'ScanId'>();

export type FindingId = z.infer<typeof FindingIdSchema>;
export type PatternId = z.infer<typeof PatternIdSchema>;
export type ServerId = z.infer<typeof ServerIdSchema>;
export type ToolId = z.infer<typeof ToolIdSchema>;
export type ScanId = z.infer<typeof ScanIdSchema>;

/** Where a piece of data came from. Used to report findings with file:line context. */
export const SourceLocationSchema = z.object({
  path: z.string(),
  global: z.boolean(),
  ide: z.string(),
  line: z.number().int().nonnegative().optional(),
  column: z.number().int().nonnegative().optional(),
});
export type SourceLocation = z.infer<typeof SourceLocationSchema>;

/** IDE identifiers we know how to parse configs for. */
export const IdeSchema = z.enum([
  'cursor',
  'claude-code',
  'gemini-cli',
  'github-copilot',
  'windsurf',
  'continue',
  'cline',
  'roo-code',
  'opencode',
  'unknown',
]);
export type Ide = z.infer<typeof IdeSchema>;

/** Where in a server definition a finding was detected. */
export const FieldSchema = z.enum([
  'description',
  'command',
  'args',
  'env',
  'headers',
  'url',
  'inputSchema',
  'name',
]);
export type Field = z.infer<typeof FieldSchema>;

/**
 * Severity levels. Ordered from most to least severe. Used by Findings,
 * Patterns, Policy, and the risk score.
 */
export const SeveritySchema = z.enum(['critical', 'high', 'medium', 'low', 'info']);
export type Severity = z.infer<typeof SeveritySchema>;

export const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};
