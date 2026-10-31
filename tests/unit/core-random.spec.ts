import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../src/core/random';

describe('mulberry32', () => {
  it('is deterministic for the same seed', () => {
    const a = mulberry32(0xe4f4a107);
    const b = mulberry32(0xe4f4a107);
    const seqA = [a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
    expect(seqA.every((n) => n >= 0 && n < 1)).toBe(true);
  });

  it('different seeds diverge', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
});
