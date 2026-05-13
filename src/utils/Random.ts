/**
 * Random — seeded pseudo-random number generator.
 * Used for deterministic spawner behavior and daily challenge (same seed = same result).
 */
export class Random {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  /** Next float in [0, 1). */
  next(): number {
    // Mulberry32 — fast 32-bit PRNG
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Float in [min, max). */
  nextRange(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Integer in [min, max] inclusive. */
  nextInt(min: number, max: number): number {
    return Math.floor(min + this.next() * (max - min + 1));
  }

  /** Boolean with given probability. */
  nextBool(probability: number = 0.5): boolean {
    return this.next() < probability;
  }

  /** Pick a random index from an array. */
  nextIndex(length: number): number {
    return Math.floor(this.next() * length);
  }

  /** Shuffle an array in place (Fisher-Yates). */
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      const tmp = arr[i]!;
      arr[i] = arr[j]!;
      arr[j] = tmp;
    }
    return arr;
  }

  /** Get current seed state (for save/restore). */
  getState(): number {
    return this.state;
  }

  /** Restore seed state. */
  setState(state: number): void {
    this.state = state;
  }
}
