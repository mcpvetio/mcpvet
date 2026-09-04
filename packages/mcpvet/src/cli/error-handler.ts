import { type ErrorCode, isMcpvetError } from '../core/errors.js';
import { EXIT } from './commands/scan.js';
import { log } from './logger.js';

const CODE_TO_EXIT: Partial<Record<ErrorCode, number>> = {
  config_error: EXIT.CONFIG_ERROR,
  policy_error: EXIT.CONFIG_ERROR,
  parse_error: EXIT.CONFIG_ERROR,
  schema_error: EXIT.CONFIG_ERROR,
  io_error: EXIT.RUNTIME_ERROR,
  baseline_error: EXIT.RUNTIME_ERROR,
  network_error: EXIT.NETWORK_FATAL,
  timeout: EXIT.NETWORK_FATAL,
  not_found: EXIT.CONFIG_ERROR,
};

/**
 * Run a command with global error handling. Prints a user-friendly error
 * and returns the appropriate exit code. Stack traces are only shown in
 * verbose mode.
 */
export async function withErrorHandling(
  fn: () => Promise<number>,
  verbose = false,
): Promise<number> {
  try {
    return await fn();
  } catch (err) {
    if (isMcpvetError(err)) {
      log.error(`${err.code}: ${err.message}`);
      if (verbose) {
        process.stderr.write(`${err.stack ?? ''}\n`);
        if (err.cause instanceof Error) {
          process.stderr.write(`cause: ${err.cause.stack ?? err.cause.message}\n`);
        }
      }
      return CODE_TO_EXIT[err.code] ?? EXIT.RUNTIME_ERROR;
    }
    if (err instanceof Error) {
      log.error(`unexpected: ${err.message}`);
      if (verbose) process.stderr.write(`${err.stack ?? ''}\n`);
    } else {
      log.error(`unexpected: ${String(err)}`);
    }
    return EXIT.RUNTIME_ERROR;
  }
}
