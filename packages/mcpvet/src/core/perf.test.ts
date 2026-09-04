import { describe, expect, it } from 'vitest';
import { loadPatternCatalog } from '../patterns/loader.js';
import type { ServerWithTools } from '../types/index.js';
import { PolicySchema } from '../types/index.js';
import { audit } from './auditor.js';
import { computeScore } from './score.js';

const policy = PolicySchema.parse({ version: 1 });

/**
 * Performance budgets. These are CI-enforced contracts, not aspirational targets.
 * If a regression pushes us over the budget, CI fails — that's by design.
 *
 * Generous bounds: a healthy scan should be 5-10x faster than these. The budgets
 * are set to catch a 2x regression in CI, not to track micro-optimizations.
 */

describe('performance budgets', () => {
  it('audits 100 servers in under 500ms offline', async () => {
    const catalog = await loadPatternCatalog();

    // 100 clean servers
    const servers: ServerWithTools[] = Array.from({ length: 100 }, (_, i) => ({
      server: {
        name: `server-${i}`,
        transport: 'stdio' as const,
        command: 'mcp-foo',
        args: ['--read-only'],
        env: {},
      },
      tools: [
        {
          name: 'do_thing',
          description: 'Performs a benign read-only operation on a local file.',
        },
      ],
    }));

    const start = performance.now();
    const findings = audit(servers, catalog, policy);
    const elapsed = performance.now() - start;

    expect(findings).toEqual([]);
    expect(elapsed).toBeLessThan(500);
  });

  it('audits 100 servers with 5 tool descriptions each in under 1s', async () => {
    const catalog = await loadPatternCatalog();

    const servers: ServerWithTools[] = Array.from({ length: 100 }, (_, i) => ({
      server: {
        name: `server-${i}`,
        transport: 'stdio' as const,
        command: 'mcp-foo',
        args: [],
        env: {},
      },
      tools: Array.from({ length: 5 }, (_, j) => ({
        name: `tool-${j}`,
        description: `Tool number ${j} for server ${i}. Reads a file from the workspace.`,
      })),
    }));

    const start = performance.now();
    audit(servers, catalog, policy);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(1000);
  });

  it('computeScore handles 1000 findings in under 50ms', () => {
    const findings = Array.from({ length: 1000 }, (_, i) => ({
      id: `FND-${i}` as never,
      patternId: 'p' as never,
      severity: (['critical', 'high', 'medium', 'low', 'info'] as const)[i % 5] ?? 'info',
      serverId: 's' as never,
      serverName: 's',
      field: 'description' as const,
      snippet: 'x',
      message: 'm',
      references: [],
    }));
    const start = performance.now();
    const score = computeScore(findings);
    const elapsed = performance.now() - start;

    expect(score.value).toBeLessThanOrEqual(100);
    expect(elapsed).toBeLessThan(50);
  });
});
