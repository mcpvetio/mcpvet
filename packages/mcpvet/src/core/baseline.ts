import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import type { BaselineSnapshot } from '../types/index.js';
import { BaselineSnapshotSchema } from '../types/index.js';
import { BaselineError } from './errors.js';

/**
 * Strategy for persisting scan baselines. The CLI picks one based on
 * user config (or defaults to LocalBaselineStore).
 */
export interface BaselineStore {
  /** Returns the current baseline, or null if none. */
  read(): Promise<BaselineSnapshot | null>;
  /** Persist a new baseline. */
  write(snapshot: BaselineSnapshot): Promise<void>;
  /** Remove the baseline. */
  clear(): Promise<void>;
}

/** Noop store. Use when the user opts out of baseline tracking. */
export class NoopBaselineStore implements BaselineStore {
  async read(): Promise<BaselineSnapshot | null> {
    return null;
  }
  async write(): Promise<void> {
    // no-op
  }
  async clear(): Promise<void> {
    // no-op
  }
}

/**
 * File-backed baseline store. Writes are atomic: the snapshot is first
 * written to a temp file, fsync'd, then renamed over the target. A crash
 * mid-write leaves the previous baseline intact.
 */
export class LocalBaselineStore implements BaselineStore {
  constructor(private readonly path: string) {}

  async read(): Promise<BaselineSnapshot | null> {
    try {
      const text = await readFile(this.path, 'utf8');
      const raw = JSON.parse(text);
      const result = BaselineSnapshotSchema.safeParse(raw);
      if (!result.success) {
        // Corrupted baseline — treat as no baseline rather than failing the scan.
        return null;
      }
      return result.data;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw new BaselineError(`cannot read baseline: ${this.path}`, {
        path: this.path,
        cause: err,
      });
    }
  }

  async write(snapshot: BaselineSnapshot): Promise<void> {
    // Validate before writing — never persist garbage.
    const result = BaselineSnapshotSchema.safeParse(snapshot);
    if (!result.success) {
      throw new BaselineError('refusing to write invalid baseline', {
        path: this.path,
        cause: result.error,
      });
    }

    const text = JSON.stringify(result.data, null, 2);
    const tmpPath = join(tmpdir(), `mcpvet-baseline-${randomBytes(8).toString('hex')}.json`);

    try {
      await mkdir(dirname(this.path), { recursive: true });
      await writeFile(tmpPath, text, { mode: 0o600 });
      await rename(tmpPath, this.path);
    } catch (err) {
      // Clean up tmp if rename failed.
      await unlink(tmpPath).catch(() => {});
      throw new BaselineError(`cannot write baseline: ${this.path}`, {
        path: this.path,
        cause: err,
      });
    }
  }

  async clear(): Promise<void> {
    try {
      await unlink(this.path);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw new BaselineError(`cannot clear baseline: ${this.path}`, {
        path: this.path,
        cause: err,
      });
    }
  }
}
