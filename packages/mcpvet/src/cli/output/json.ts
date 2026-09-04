import type { DiffResult, OriginInfo, ScanResult } from '../../types/index.js';

export interface JsonOutput {
  version: 1;
  scan: ScanResult;
  origins: OriginInfo[];
  diff?: DiffResult;
}

export function formatJson(scan: ScanResult, origins: OriginInfo[], diff?: DiffResult): string {
  const out: JsonOutput = { version: 1, scan, origins };
  if (diff !== undefined) out.diff = diff;
  return `${JSON.stringify(out, null, 2)}\n`;
}
