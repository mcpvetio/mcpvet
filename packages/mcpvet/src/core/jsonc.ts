/**
 * Minimal JSONC parser. Strips:
 *   - // line comments
 *   - /* block comments *\/
 *   - trailing commas
 *
 * We deliberately do not use a third-party JSONC library — the transforms
 * above are sufficient for the MCP config formats we target, and avoiding
 * a dep keeps the supply chain small.
 */
export function stripJsonComments(input: string): string {
  let result = '';
  let i = 0;
  let inString = false;
  let stringChar = '';
  let escaped = false;

  while (i < input.length) {
    const ch = input[i];
    const next = input[i + 1];

    if (inString) {
      result += ch;
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === stringChar) {
        inString = false;
      }
      i++;
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = true;
      stringChar = ch;
      result += ch;
      i++;
      continue;
    }

    // Line comment: // to end of line
    if (ch === '/' && next === '/') {
      i += 2;
      while (i < input.length && input[i] !== '\n') {
        i++;
      }
      continue;
    }

    // Block comment: /* ... */
    if (ch === '/' && next === '*') {
      i += 2;
      while (i < input.length && !(input[i] === '*' && input[i + 1] === '/')) {
        i++;
      }
      i += 2; // skip */
      continue;
    }

    result += ch;
    i++;
  }

  return stripTrailingCommas(result);
}

function stripTrailingCommas(input: string): string {
  // Remove commas that appear before } or ]
  return input.replace(/,(\s*[}\]])/g, '$1');
}

/** Parse JSON or JSONC. Throws SyntaxError on failure. */
export function parseJsonc(input: string): unknown {
  return JSON.parse(stripJsonComments(input));
}
