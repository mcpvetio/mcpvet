import { z } from 'zod';

/**
 * An MCP tool exposed by a server. The `description` field is the primary
 * attack surface we audit — it is sent verbatim to the LLM and is unsanitized.
 */
export const MCPToolSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  inputSchema: z.unknown().optional(), // JSON Schema; we don't validate structure
});
export type MCPTool = z.infer<typeof MCPToolSchema>;
