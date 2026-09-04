import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import type { Ide, NormalizedServer, RawConfig, RawServerEntry } from '../types/index.js';
import { RawConfigSchema } from '../types/index.js';
import { ParseError, SchemaError } from './errors.js';
import { parseJsonc } from './jsonc.js';

export interface ParsedConfig {
  ide: Ide;
  path: string;
  raw: RawConfig;
  servers: Map<string, RawServerEntry>;
}

/**
 * Read a config file from disk, strip JSONC noise if needed, and return the
 * parsed + validated structure. The IDE is inferred from the file path —
 * callers should pass the `Location` object they used to discover the file.
 */
export async function parseConfigFile(ide: Ide, filePath: string): Promise<ParsedConfig> {
  let text: string;
  try {
    text = await readFile(filePath, 'utf8');
  } catch (err) {
    throw new ParseError(`cannot read config file: ${filePath}`, { path: filePath, cause: err });
  }

  let raw: unknown;
  try {
    raw = extname(filePath) === '.json' ? parseJsonc(text) : parseJsonc(text);
  } catch (err) {
    throw new ParseError(`invalid JSON in config file: ${filePath}`, {
      path: filePath,
      cause: err,
    });
  }

  const result = RawConfigSchema.safeParse(raw);
  if (!result.success) {
    throw new SchemaError(`config does not match MCP schema: ${filePath}`, {
      path: filePath,
      cause: result.error,
    });
  }

  return {
    ide,
    path: filePath,
    raw: result.data,
    servers: extractServers(result.data),
  };
}

/**
 * Normalize the various server-collection shapes (map vs array) into a
 * single map of `name → RawServerEntry`. Continues without a `name` for
 * array entries that lack one (we'll use a placeholder).
 */
function extractServers(raw: RawConfig): Map<string, RawServerEntry> {
  const out = new Map<string, RawServerEntry>();
  const source = raw.mcpServers ?? raw.servers;

  if (!source) return out;

  if (Array.isArray(source)) {
    for (const entry of source) {
      const name = entry.name;
      if (!name) continue;
      const { name: _omit, ...rest } = entry;
      out.set(name, rest);
    }
  } else {
    for (const [name, entry] of Object.entries(source)) {
      out.set(name, entry);
    }
  }

  return out;
}

/**
 * Convert a raw server entry to the normalized form. We need this because
 * the parser-level shape is permissive (raw strings for args, optional
 * fields), but the auditor and policy evaluator need a strict shape.
 */
export function normalizeServer(name: string, raw: RawServerEntry): NormalizedServer | null {
  if (raw.url) {
    // HTTP or SSE server. Type defaults to http; explicit sse is honoured.
    const transport = raw.type === 'sse' ? ('sse' as const) : ('http' as const);
    return {
      name,
      transport,
      url: raw.url,
      headers: raw.headers ?? {},
    };
  }

  if (raw.command) {
    const args = Array.isArray(raw.args)
      ? raw.args
      : typeof raw.args === 'string'
        ? raw.args.split(/\s+/).filter(Boolean)
        : [];
    return {
      name,
      transport: 'stdio',
      command: raw.command,
      args,
      env: raw.env ?? {},
      ...(raw.cwd !== undefined ? { cwd: raw.cwd } : {}),
    };
  }

  return null;
}
