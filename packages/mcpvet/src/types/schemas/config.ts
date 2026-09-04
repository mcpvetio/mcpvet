import { z } from 'zod';
import { IdeSchema } from './common.js';
import { RawServerEntrySchema } from './server.js';

/**
 * Permissive raw config shape. The `servers` field accepts both:
 *   - a map: { "name": { ... } }
 *   - an array: [ { "name": "name", ... } ]
 * The parser normalizes both to a map.
 */
const ServersValueSchema = z.union([
  z.record(z.string(), RawServerEntrySchema),
  z.array(
    RawServerEntrySchema.extend({
      name: z.string().min(1),
    }),
  ),
]);

export const RawConfigSchema = z
  .object({
    mcpServers: ServersValueSchema.optional(),
    servers: ServersValueSchema.optional(),
  })
  .passthrough();
export type RawConfig = z.infer<typeof RawConfigSchema>;

/**
 * Metadata about where a config came from. Used to build the scan context
 * and to surface findings with file:line context in the output.
 */
export const ConfigSourceSchema = z.object({
  ide: IdeSchema,
  path: z.string(),
  global: z.boolean(),
  exists: z.boolean(),
  parseError: z.string().optional(),
});
export type ConfigSource = z.infer<typeof ConfigSourceSchema>;
