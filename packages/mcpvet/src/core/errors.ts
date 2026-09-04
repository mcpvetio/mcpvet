/**
 * Typed error model. Every error exposes:
 *   - `code`: stable machine-readable string (snake-case)
 *   - `message`: human-friendly explanation
 *   - `cause`: underlying error if any (Error.cause convention)
 *   - `context`: optional structured fields (path, line, etc.)
 *
 * The CLI's error handler maps these to user-facing output and exit codes.
 */

export type ErrorCode =
  | 'parse_error'
  | 'schema_error'
  | 'network_error'
  | 'not_found'
  | 'policy_error'
  | 'baseline_error'
  | 'pattern_error'
  | 'io_error'
  | 'config_error'
  | 'timeout'
  | 'aborted'
  | 'unknown';

export type ErrorContext = Record<string, string | number | boolean | null | undefined>;

interface McpvetErrorInit {
  code: ErrorCode;
  message: string;
  cause?: unknown;
  context?: ErrorContext;
}

export class McpvetError extends Error {
  readonly code: ErrorCode;
  readonly context: ErrorContext;

  constructor(init: McpvetErrorInit) {
    super(init.message, { cause: init.cause });
    this.name = this.constructor.name;
    this.code = init.code;
    this.context = init.context ?? {};
  }

  /** Structured representation, suitable for JSON output. */
  toJSON(): {
    name: string;
    code: ErrorCode;
    message: string;
    context: ErrorContext;
    cause?: string;
  } {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      ...(this.cause !== undefined && this.cause instanceof Error
        ? { cause: this.cause.message }
        : {}),
    };
  }
}

export class ParseError extends McpvetError {
  constructor(
    message: string,
    init: { path: string; cause?: unknown } & { context?: ErrorContext },
  ) {
    super({
      code: 'parse_error',
      message,
      cause: init.cause,
      context: { path: init.path, ...(init.context ?? {}) },
    });
  }
}

export class SchemaError extends McpvetError {
  constructor(message: string, init: { path?: string; field?: string; cause?: unknown }) {
    super({
      code: 'schema_error',
      message,
      cause: init.cause,
      context: {
        ...(init.path !== undefined ? { path: init.path } : {}),
        ...(init.field !== undefined ? { field: init.field } : {}),
      },
    });
  }
}

export class NetworkError extends McpvetError {
  constructor(message: string, init: { url?: string; status?: number; cause?: unknown }) {
    super({
      code: 'network_error',
      message,
      cause: init.cause,
      context: {
        ...(init.url !== undefined ? { url: init.url } : {}),
        ...(init.status !== undefined ? { status: init.status } : {}),
      },
    });
  }
}

export class NotFoundError extends McpvetError {
  constructor(message: string, init: { resource: string; path?: string }) {
    super({
      code: 'not_found',
      message,
      context: { resource: init.resource, ...(init.path !== undefined ? { path: init.path } : {}) },
    });
  }
}

export class PolicyError extends McpvetError {
  constructor(message: string, init: { path?: string; field?: string; cause?: unknown }) {
    super({
      code: 'policy_error',
      message,
      cause: init.cause,
      context: {
        ...(init.path !== undefined ? { path: init.path } : {}),
        ...(init.field !== undefined ? { field: init.field } : {}),
      },
    });
  }
}

export class BaselineError extends McpvetError {
  constructor(message: string, init: { path: string; cause?: unknown }) {
    super({
      code: 'baseline_error',
      message,
      cause: init.cause,
      context: { path: init.path },
    });
  }
}

export class PatternError extends McpvetError {
  constructor(message: string, init: { patternId?: string; cause?: unknown }) {
    super({
      code: 'pattern_error',
      message,
      cause: init.cause,
      context: init.patternId !== undefined ? { patternId: init.patternId } : {},
    });
  }
}

export class IoError extends McpvetError {
  constructor(message: string, init: { path: string; cause?: unknown }) {
    super({
      code: 'io_error',
      message,
      cause: init.cause,
      context: { path: init.path },
    });
  }
}

export class ConfigError extends McpvetError {
  constructor(message: string, init: { field?: string; cause?: unknown }) {
    super({
      code: 'config_error',
      message,
      cause: init.cause,
      context: init.field !== undefined ? { field: init.field } : {},
    });
  }
}

export class TimeoutError extends McpvetError {
  constructor(message: string, init: { operation: string; timeoutMs: number }) {
    super({
      code: 'timeout',
      message,
      context: { operation: init.operation, timeoutMs: init.timeoutMs },
    });
  }
}

export class AbortedError extends McpvetError {
  constructor(message = 'Operation aborted') {
    super({ code: 'aborted', message });
  }
}

/** Type guard: is this an mcpvet error (vs a generic Error from a dep)? */
export function isMcpvetError(err: unknown): err is McpvetError {
  return err instanceof McpvetError;
}
