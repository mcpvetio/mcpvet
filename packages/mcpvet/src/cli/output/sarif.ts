import type { ScanResult } from '../../types/index.js';

/**
 * SARIF 2.1.0 output for GitHub code scanning integration.
 * See https://docs.oasis-open.org/sarif/sarif/v2.1.0/
 */
export function formatSarif(scan: ScanResult): string {
  const results = scan.findings.map((f) => ({
    ruleId: f.patternId,
    level: sarifLevel(f.severity),
    message: {
      text: `${f.patternId} in ${f.serverName}${f.toolName ? ` (${f.toolName})` : ''}.${f.field}: ${f.snippet}`,
    },
    locations: [
      {
        physicalLocation: {
          artifactLocation: { uri: 'mcp-config' },
          region: { startLine: 1, snippet: { text: f.snippet } },
        },
      },
    ],
    properties: {
      severity: f.severity,
      serverName: f.serverName,
      ...(f.toolName !== undefined ? { toolName: f.toolName } : {}),
      field: f.field,
      references: f.references,
    },
  }));

  const sarif = {
    $schema:
      'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'mcpvet',
            informationUri: 'https://github.com/mcpvetio/mcpvet',
            version: scan.toolVersion,
            rules: scan.findings.map((f) => ({
              id: f.patternId,
              name: f.patternId,
              shortDescription: { text: f.patternId },
              fullDescription: { text: f.message },
              helpUri: f.references[0] ?? 'https://github.com/mcpvetio/mcpvet',
              defaultConfiguration: { level: sarifLevel(f.severity) },
            })),
          },
        },
        results,
        properties: {
          riskScore: scan.score,
        },
      },
    ],
  };
  return `${JSON.stringify(sarif, null, 2)}\n`;
}

function sarifLevel(
  severity: ScanResult['findings'][number]['severity'],
): 'error' | 'warning' | 'note' {
  if (severity === 'critical' || severity === 'high') return 'error';
  if (severity === 'medium') return 'warning';
  return 'note';
}
