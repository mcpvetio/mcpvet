import path from 'node:path';
import { LocalBaselineStore } from '../../core/baseline.js';
import { log } from '../logger.js';
import { EXIT } from './scan.js';

export interface BaselineOptions {
  path?: string;
  cwd?: string;
}

function defaultPath(): string {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? '/tmp';
  return path.join(home, '.mcpvet', 'baseline.json');
}

export async function runBaseline(
  action: 'update' | 'show' | 'clear' | 'diff',
  opts: BaselineOptions,
): Promise<number> {
  const file = opts.path ?? defaultPath();
  const store = new LocalBaselineStore(file);

  switch (action) {
    case 'show': {
      const snap = await store.read();
      if (!snap) {
        log.warn(`no baseline at ${file}`);
        return EXIT.OK;
      }
      process.stdout.write(`${JSON.stringify(snap, null, 2)}\n`);
      return EXIT.OK;
    }
    case 'clear': {
      await store.clear();
      log.info(`cleared baseline at ${file}`);
      return EXIT.OK;
    }
    case 'update':
    case 'diff': {
      log.info(
        `run \`mcpvet scan\` first to populate the baseline; "update" is implicit after each scan`,
      );
      return EXIT.OK;
    }
  }
}
