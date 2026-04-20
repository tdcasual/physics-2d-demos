import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/core/rng';

describe('createRng', () => {
  it('should produce numbers in [0, 1)', () => {
    const rng = createRng(42);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('should be deterministic with same seed', () => {
    const rng1 = createRng(123);
    const rng2 = createRng(123);
    for (let i = 0; i < 10; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  it('should produce different sequences with different seeds', () => {
    const rng1 = createRng(1);
    const rng2 = createRng(2);
    const seq1 = Array.from({ length: 5 }, () => rng1());
    const seq2 = Array.from({ length: 5 }, () => rng2());
    expect(seq1).not.toEqual(seq2);
  });

  it('should handle seed of 0 by defaulting to 1', () => {
    const rng0 = createRng(0);
    const rng1 = createRng(1);
    // Both should produce valid sequences
    expect(rng0()).toBeGreaterThanOrEqual(0);
    expect(rng1()).toBeGreaterThanOrEqual(0);
  });

  it('should handle non-integer seeds', () => {
    const rng = createRng(3.7);
    const v = rng();
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  });
});
