/**
 * Minimal in-memory TTL cache. We keep it tiny to avoid pulling in a dep.
 * The CLI owns one cache per scan; entries are reused across servers.
 */
export class TtlCache<V> {
  private readonly store = new Map<string, { value: V; expiresAt: number }>();
  constructor(private readonly ttlMs: number) {}

  get(key: string): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: V): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}
