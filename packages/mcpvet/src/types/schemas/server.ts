import { z } from 'zod';

/**
 * MCP transports. We accept the runtime forms; the JSON Schema discriminator
 * is a string `type` field on the server object.
 */
export const StdioServerSchema = z.object({
  type: z.literal('stdio').optional(), // Many configs omit type and default to stdio
  command: z.string().min(1),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
  cwd: z.string().optional(),
});
export type StdioServer = z.infer<typeof StdioServerSchema>;

export const HttpServerSchema = z.object({
  type: z.literal('http'),
  url: z.string().url(),
  headers: z.record(z.string(), z.string()).optional(),
});
export type HttpServer = z.infer<typeof HttpServerSchema>;

export const SseServerSchema = z.object({
  type: z.literal('sse'),
  url: z.string().url(),
  headers: z.record(z.string(), z.string()).optional(),
});
export type SseServer = z.infer<typeof SseServerSchema>;

/**
 * Normalized server representation. Whatever the IDE's native shape was, we
 * parse it into one of these three forms. The `name` is the key the IDE used
 * to register the server.
 */
export const NormalizedServerSchema = z.discriminatedUnion('transport', [
  z.object({
    name: z.string().min(1),
    transport: z.literal('stdio'),
    command: z.string().min(1),
    args: z.array(z.string()).default([]),
    env: z.record(z.string(), z.string()).default({}),
    cwd: z.string().optional(),
  }),
  z.object({
    name: z.string().min(1),
    transport: z.literal('http'),
    url: z.string().url(),
    headers: z.record(z.string(), z.string()).default({}),
  }),
  z.object({
    name: z.string().min(1),
    transport: z.literal('sse'),
    url: z.string().url(),
    headers: z.record(z.string(), z.string()).default({}),
  }),
]);
export type NormalizedServer = z.infer<typeof NormalizedServerSchema>;

/**
 * Raw, permissive shape. Accepts the various IDE-specific JSON formats
 * (with or without `type`, `mcpServers` vs `servers`, array vs map, etc.).
 * Use this at the parser boundary; convert to NormalizedServer afterwards.
 */
export const RawServerEntrySchema = z
  .object({
    type: z.enum(['stdio', 'http', 'sse']).optional(),
    command: z.string().optional(),
    args: z.union([z.array(z.string()), z.string()]).optional(),
    env: z.record(z.string(), z.string()).optional(),
    cwd: z.string().optional(),
    url: z.string().optional(),
    headers: z.record(z.string(), z.string()).optional(),
    // Some IDEs (Cline, Roo Code) nest additional fields
    disabled: z.boolean().optional(),
    autoApprove: z.array(z.string()).optional(),
  })
  .passthrough();
export type RawServerEntry = z.infer<typeof RawServerEntrySchema>;
