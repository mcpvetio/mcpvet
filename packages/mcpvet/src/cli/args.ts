import { Command } from 'commander';
import { setColorEnabled } from './colors.js';
import { runBaseline } from './commands/baseline.js';
import { runExplain } from './commands/explain.js';
import { type ScanOptions, runScan } from './commands/scan.js';
import { withErrorHandling } from './error-handler.js';
import { setLogLevel } from './logger.js';

const VERSION = '0.0.0';

export function buildProgram(): Command {
  const program = new Command();
  program
    .name('mcpvet')
    .description('Security scanner for MCP (Model Context Protocol) configurations')
    .version(VERSION)
    .option('--no-color', 'disable ANSI colors in output');

  program
    .command('scan')
    .description('scan MCP configurations and report findings')
    .option('--json', 'output JSON instead of human-readable')
    .option('--markdown', 'output GitHub-flavored markdown (for PR comments)')
    .option('--sarif', 'output SARIF 2.1.0 (for code scanning)')
    .option('--diff', 'show changes since the last baseline')
    .option('--policy <path>', 'path to a .mcpaudit.yaml policy file')
    .option('--severity <level>', 'minimum severity to report (info|low|medium|high|critical)')
    .option('--offline', 'skip network calls to npm/PyPI/GitHub')
    .option('--quiet', 'suppress non-essential output')
    .option('--verbose', 'enable debug logging')
    .option('--baseline <path>', 'path to the baseline file (default: ~/.mcpvet/baseline.json)')
    .option('--cwd <path>', 'working directory for workspace config discovery (default: cwd)')
    .action(async (opts: ScanOptions) => {
      const exit = await withErrorHandling(() => runScan(opts), Boolean(opts.verbose));
      process.exitCode = exit;
    });

  program
    .command('baseline')
    .description('manage the scan baseline')
    .argument('<action>', 'update|show|clear|diff')
    .option('--path <path>', 'baseline file path')
    .action(async (action: string, opts: { path?: string }) => {
      const exit = await withErrorHandling(async () => {
        if (action === 'update' || action === 'show' || action === 'clear' || action === 'diff') {
          return runBaseline(action, { ...(opts.path !== undefined ? { path: opts.path } : {}) });
        }
        return 3;
      });
      process.exitCode = exit;
    });

  program
    .command('explain')
    .description('explain a finding or pattern')
    .argument('<id>', 'finding id (FND-...) or pattern id (e.g. exfil-curl-pipe-shell)')
    .action(async (id: string) => {
      const exit = await withErrorHandling(() => runExplain(id));
      process.exitCode = exit;
    });

  return program;
}

export async function main(argv: string[]): Promise<number> {
  const program = buildProgram();
  // Pre-parse to set color flag early
  const noColor = argv.includes('--no-color');
  if (noColor) setColorEnabled(false);
  if (argv.includes('--verbose') || argv.includes('-v')) setLogLevel('debug');
  await program.parseAsync(argv);
  return typeof process.exitCode === 'number' ? process.exitCode : 0;
}
