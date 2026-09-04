import type {
  Field,
  Finding,
  Pattern,
  PatternCatalog,
  Policy,
  ServerWithTools,
} from '../types/index.js';
import { findingId, serverId, toolId } from './ids.js';

/** A compiled pattern: pre-built regexes and a stable fingerprint for dedup. */
interface CompiledPattern {
  pattern: Pattern;
  /** Pre-compiled regexes. Empty if pattern has no regex matchers. */
  regexes: RegExp[];
}

const compiledCache = new WeakMap<PatternCatalog, CompiledPattern[]>();

/**
 * Pre-compile all regex matchers in a catalog. Returns a cache-friendly
 * representation that avoids re-parsing on every scan.
 */
export function compileCatalog(catalog: PatternCatalog): CompiledPattern[] {
  const cached = compiledCache.get(catalog);
  if (cached) return cached;

  const compiled: CompiledPattern[] = [];
  for (const pattern of catalog.patterns) {
    if (!pattern.enabled) continue;
    const regexes: RegExp[] = [];
    for (const m of pattern.matchers) {
      if (m.kind === 'regex') {
        try {
          regexes.push(new RegExp(m.pattern, m.flags));
        } catch {
          // Bad regex in the catalog — skip it rather than failing the whole scan.
          // In production we'd log this; tests cover the failure path.
        }
      }
    }
    compiled.push({ pattern, regexes });
  }
  compiledCache.set(catalog, compiled);
  return compiled;
}

/**
 * Run a single pattern against a single text field. Returns true if any
 * matcher (regex or keyword) matches.
 */
function matchField(compiled: CompiledPattern, text: string): boolean {
  for (const m of compiled.pattern.fields.length === 0 ? [] : compiled.pattern.matchers) {
    if (m.kind === 'regex') {
      for (const re of compiled.regexes) {
        re.lastIndex = 0;
        if (re.test(text)) return true;
      }
    } else if (m.kind === 'keyword') {
      const haystack = m.caseSensitive ? text : text.toLowerCase();
      const needle = m.caseSensitive ? m.pattern : m.pattern.toLowerCase();
      if (haystack.includes(needle)) return true;
    }
    // glob matcher is intentionally unsupported in v1 — not in the YAML catalog.
  }
  return false;
}

/** Extract the snippet that triggered a match. Bounded to 200 chars. */
function extractSnippet(text: string, pattern: Pattern): string {
  for (const m of pattern.matchers) {
    if (m.kind === 'regex') {
      try {
        const re = new RegExp(m.pattern, m.flags.includes('g') ? m.flags : `${m.flags}g`);
        const match = re.exec(text);
        if (match) return truncate(match[0], 200);
      } catch {
        // ignore
      }
    } else if (m.kind === 'keyword') {
      const idx = text.toLowerCase().indexOf(m.pattern.toLowerCase());
      if (idx >= 0) {
        return truncate(text.slice(Math.max(0, idx - 20), idx + m.pattern.length + 20), 200);
      }
    }
  }
  return truncate(text, 200);
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`;
}

/** The fields we know how to extract from a server, with their text values. */
function serverFieldValues(s: ServerWithTools['server']): Partial<Record<Field, string>> {
  const out: Partial<Record<Field, string>> = {};
  if (s.transport === 'stdio') {
    out.command = s.command;
    if (s.args.length > 0) out.args = s.args.join(' ');
    const envEntries = Object.entries(s.env);
    if (envEntries.length > 0) {
      out.env = envEntries.map(([k, v]) => `${k}=${v}`).join(' ');
    }
  } else {
    out.url = s.url;
    const headerEntries = Object.entries(s.headers);
    if (headerEntries.length > 0) {
      out.headers = headerEntries.map(([k, v]) => `${k}: ${v}`).join(' ');
    }
  }
  return out;
}

/**
 * Run the audit. Returns a list of findings, deduped by (server, tool, pattern, field).
 * Findings below the policy's `severityThreshold` are filtered out.
 */
export function audit(
  servers: readonly ServerWithTools[],
  catalog: PatternCatalog,
  policy: Policy,
): Finding[] {
  const compiled = compileCatalog(catalog);
  const findings: Finding[] = [];
  const seen = new Set<string>();

  for (const { server, tools } of servers) {
    const sId = serverId(server.name);
    const sValues = serverFieldValues(server);

    for (const cp of compiled) {
      if (policy.disabledPatterns.includes(cp.pattern.id)) continue;

      for (const field of cp.pattern.fields) {
        const value = sValues[field];
        if (!value) continue;
        if (!matchField(cp, value)) continue;

        const id = findingId({
          serverName: server.name,
          patternId: cp.pattern.id,
          field,
          snippet: extractSnippet(value, cp.pattern),
        });
        const key = `${sId}|${cp.pattern.id}|${field}`;
        if (seen.has(key)) continue;
        seen.add(key);

        if (!severityMeets(cp.pattern.severity, policy.severityThreshold)) continue;

        findings.push({
          id,
          patternId: cp.pattern.id,
          severity: cp.pattern.severity,
          serverId: sId,
          serverName: server.name,
          field,
          snippet: extractSnippet(value, cp.pattern),
          message: `${cp.pattern.name}: matched in ${field}`,
          references: cp.pattern.references,
        });
      }
    }

    // Audit each tool's description
    for (const t of tools) {
      if (!t.description) continue;
      const tId = toolId(server.name, t.name);

      for (const cp of compiled) {
        if (policy.disabledPatterns.includes(cp.pattern.id)) continue;
        if (!cp.pattern.fields.includes('description')) continue;
        if (!matchField(cp, t.description)) continue;

        const snippet = extractSnippet(t.description, cp.pattern);
        const id = findingId({
          serverName: server.name,
          toolName: t.name,
          patternId: cp.pattern.id,
          field: 'description',
          snippet,
        });
        const key = `${sId}|${tId}|${cp.pattern.id}|description`;
        if (seen.has(key)) continue;
        seen.add(key);

        if (!severityMeets(cp.pattern.severity, policy.severityThreshold)) continue;

        findings.push({
          id,
          patternId: cp.pattern.id,
          severity: cp.pattern.severity,
          serverId: sId,
          serverName: server.name,
          toolId: tId,
          toolName: t.name,
          field: 'description',
          snippet,
          message: `${cp.pattern.name}: tool description triggers pattern`,
          references: cp.pattern.references,
        });
      }
    }
  }

  return findings;
}

const SEVERITY_RANK = { info: 0, low: 1, medium: 2, high: 3, critical: 4 } as const;

function severityMeets(s: Pattern['severity'], threshold: Policy['severityThreshold']): boolean {
  return SEVERITY_RANK[s] >= SEVERITY_RANK[threshold];
}
