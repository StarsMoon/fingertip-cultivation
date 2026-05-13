/**
 * ObjectPool — generic pool for reusable objects.
 * Used for projectiles, enemies, particles, pickups.
 * Prevents per-frame allocation and GC pressure.
 */
export class ObjectPool<T> {
  private readonly pool: T[] = [];
  private readonly factory: () => T;
  private readonly reset: (obj: T) => void;

  constructor(factory: () => T, reset: (obj: T) => void) {
    this.factory = factory;
    this.reset = reset;
  }

  /** Acquire an object from the pool (or create a new one). */
  acquire(): T {
    return this.pool.length > 0 ? this.pool.pop()! : this.factory();
  }

  /** Release an object back to the pool after resetting it. */
  release(obj: T): void {
    this.reset(obj);
    this.pool.push(obj);
  }

  /** Current number of objects available in the pool. */
  get size(): number {
    return this.pool.length;
  }
}
