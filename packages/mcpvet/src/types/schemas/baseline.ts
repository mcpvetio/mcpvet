import { z } from 'zod';
import { ScanResultSchema } from './scan.js';

/**
 * A persisted baseline. The version field lets us evolve the format
 * without breaking existing baselines (we can write a migration).
 */
export const BaselineSnapshotSchema = z.object({
  version: z.literal(1),
  capturedAt: z.string().datetime(),
  scanResult: ScanResultSchema,
});
export type BaselineSnapshot = z.infer<typeof BaselineSnapshotSchema>;
