import { c } from './colors.js';

type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

let current: Level = 'info';

export function setLogLevel(level: Level): void {
  current = level;
}

function shouldLog(level: Level): boolean {
  return LEVELS[level] >= LEVELS[current];
}

function emit(level: Level, msg: string): void {
  if (!shouldLog(level)) return;
  const tag =
    level === 'debug'
      ? c.gray('debug')
      : level === 'info'
        ? c.cyan('info')
        : level === 'warn'
          ? c.yellow('warn')
          : c.red('error');
  process.stderr.write(`${tag}  ${msg}\n`);
}

export const log = {
  debug: (msg: string) => emit('debug', msg),
  info: (msg: string) => emit('info', msg),
  warn: (msg: string) => emit('warn', msg),
  error: (msg: string) => emit('error', msg),
};
