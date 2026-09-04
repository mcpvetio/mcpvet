import type { DiffEntry, DiffResult, ScanResult, ServerWithTools } from '../types/index.js';
import { serverId } from './ids.js';
import { computeScore } from './score.js';

/**
 * Compare two scan results and produce a structured diff. Designed for
 * "what changed in this PR" — a CI check or PR comment.
 *
 * The `before` scan may be undefined (first run / no baseline). In that
 * case every server and tool is reported as `added`.
 */
export function diff(before: ScanResult | undefined, after: ScanResult): DiffResult {
  const beforeServers = indexByServerName(before?.servers ?? []);
  const afterServers = indexByServerName(after.servers);

  const entries: DiffEntry[] = [];

  // Removed or modified servers
  for (const [name, beforeSWT] of beforeServers) {
    const afterSWT = afterServers.get(name);
    if (!afterSWT) {
      entries.push(serverEntry('removed', beforeSWT, undefined, `${name}: removed`));
      continue;
    }
    pushServerFieldChanges(entries, beforeSWT, afterSWT);
  }

  // Added servers
  for (const [name, afterSWT] of afterServers) {
    if (!beforeServers.has(name)) {
      entries.push(serverEntry('added', undefined, afterSWT, `${name}: added`));
    }
  }

  const newScore = computeScore(after.findings);
  const beforeScore = before?.score ?? {
    value: 0,
    level: 'info' as const,
    findingsByLevel: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
  };
  const riskDelta = newScore.value - beforeScore.value;

  return {
    ...(before !== undefined ? { before } : {}),
    after,
    entries,
    riskDelta,
    newRiskScore: newScore,
  };
}

function indexByServerName(servers: readonly ServerWithTools[]): Map<string, ServerWithTools> {
  const m = new Map<string, ServerWithTools>();
  for (const s of servers) m.set(s.server.name, s);
  return m;
}

function serverEntry(
  kind: DiffEntry['kind'],
  before: ServerWithTools | undefined,
  after: ServerWithTools | undefined,
  summary: string,
): DiffEntry {
  const swt = after ?? before;
  if (!swt) throw new Error('diff: empty entry');
  return {
    kind,
    serverId: serverId(swt.server.name),
    serverName: swt.server.name,
    path: `servers.${swt.server.name}`,
    before: before?.server,
    after: after?.server,
    summary,
  };
}

type ServerFieldName =
  | 'name'
  | 'transport'
  | 'command'
  | 'args'
  | 'env'
  | 'url'
  | 'headers'
  | 'cwd';

const SERVER_FIELDS: readonly ServerFieldName[] = [
  'name',
  'transport',
  'command',
  'args',
  'env',
  'url',
  'headers',
  'cwd',
];

function pushServerFieldChanges(
  entries: DiffEntry[],
  before: ServerWithTools,
  after: ServerWithTools,
): void {
  for (const f of SERVER_FIELDS) {
    const a = JSON.stringify((before.server as Record<string, unknown>)[f]);
    const b = JSON.stringify((after.server as Record<string, unknown>)[f]);
    if (a !== b) {
      entries.push({
        kind: 'modified',
        serverId: serverId(after.server.name),
        serverName: after.server.name,
        path: `servers.${after.server.name}.${f}`,
        before: (before.server as Record<string, unknown>)[f],
        after: (after.server as Record<string, unknown>)[f],
        summary: `${after.server.name}: ${f} changed`,
      });
    }
  }
  // Tools: detect added / removed / description-changed
  const beforeTools = new Map(before.tools.map((t) => [t.name, t]));
  const afterTools = new Map(after.tools.map((t) => [t.name, t]));
  for (const [name, bt] of beforeTools) {
    const at = afterTools.get(name);
    if (!at) {
      entries.push({
        kind: 'removed',
        serverId: serverId(after.server.name),
        serverName: after.server.name,
        path: `servers.${after.server.name}.tools.${name}`,
        before: bt,
        after: undefined,
        summary: `${after.server.name}: tool ${name} removed`,
      });
      continue;
    }
    if (at.description !== bt.description) {
      entries.push({
        kind: 'modified',
        serverId: serverId(after.server.name),
        serverName: after.server.name,
        path: `servers.${after.server.name}.tools.${name}.description`,
        before: bt.description,
        after: at.description,
        summary: `${after.server.name}.${name}: description changed`,
      });
    }
  }
  for (const [name, at] of afterTools) {
    if (!beforeTools.has(name)) {
      entries.push({
        kind: 'added',
        serverId: serverId(after.server.name),
        serverName: after.server.name,
        path: `servers.${after.server.name}.tools.${name}`,
        before: undefined,
        after: at,
        summary: `${after.server.name}: tool ${name} added`,
      });
    }
  }
}
