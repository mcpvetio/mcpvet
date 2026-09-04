/**
 * Minimal ANSI color helpers. Avoids the `chalk`/`picocolors` dep.
 * Honors NO_COLOR env var and non-TTY stdout (set via `setColorEnabled`).
 */

let enabled = process.stdout.isTTY !== false && !process.env.NO_COLOR;

export function setColorEnabled(value: boolean): void {
  enabled = value;
}

const ESC = '\u001B[';
const codes = {
  reset: `${ESC}0m`,
  bold: `${ESC}1m`,
  dim: `${ESC}2m`,
  red: `${ESC}31m`,
  green: `${ESC}32m`,
  yellow: `${ESC}33m`,
  blue: `${ESC}34m`,
  magenta: `${ESC}35m`,
  cyan: `${ESC}36m`,
  gray: `${ESC}90m`,
} as const;

function wrap(open: string, text: string): string {
  if (!enabled) return text;
  return `${open}${text}${codes.reset}`;
}

export const c = {
  bold: (s: string) => wrap(codes.bold, s),
  dim: (s: string) => wrap(codes.dim, s),
  red: (s: string) => wrap(codes.red, s),
  green: (s: string) => wrap(codes.green, s),
  yellow: (s: string) => wrap(codes.yellow, s),
  blue: (s: string) => wrap(codes.blue, s),
  magenta: (s: string) => wrap(codes.magenta, s),
  cyan: (s: string) => wrap(codes.cyan, s),
  gray: (s: string) => wrap(codes.gray, s),
};
