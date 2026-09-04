import { createHash } from 'node:crypto';
import type { Field, FindingId, PatternId, ScanId, ServerId, ToolId } from '../types/index.js';
import { FindingIdSchema, ScanIdSchema, ServerIdSchema, ToolIdSchema } from '../types/index.js';

/** Stable content-derived Finding ID. Same input → same ID, always. */
export function findingId(input: {
  serverName: string;
  toolName?: string;
  patternId: PatternId;
  field: Field;
  snippet: string;
}): FindingId {
  const h = createHash('sha256');
  h.update(input.serverName);
  h.update('|');
  h.update(input.toolName ?? '');
  h.update('|');
  h.update(input.patternId);
  h.update('|');
  h.update(input.field);
  h.update('|');
  h.update(input.snippet);
  return FindingIdSchema.parse(`FND-${h.digest('hex').slice(0, 10)}`);
}

/** Stable server ID derived from its name. */
export function serverId(name: string): ServerId {
  const h = createHash('sha256');
  h.update(name);
  return ServerIdSchema.parse(`SRV-${h.digest('hex').slice(0, 8)}`);
}

/** Stable tool ID derived from server name + tool name. */
export function toolId(serverName: string, toolName: string): ToolId {
  const h = createHash('sha256');
  h.update(serverName);
  h.update('|');
  h.update(toolName);
  return ToolIdSchema.parse(`TOOL-${h.digest('hex').slice(0, 8)}`);
}

/** Random scan ID. */
export function scanId(): ScanId {
  return ScanIdSchema.parse(
    `SCN-${createHash('sha256').update(Date.now().toString()).update(Math.random().toString()).digest('hex').slice(0, 12)}`,
  );
}
