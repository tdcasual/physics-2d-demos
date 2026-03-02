import { describe, expect, it } from 'vitest';
import { clampParam } from '../../src/core/guards';

describe('clampParam', () => {
  it('returns nearest legal value for invalid input', () => {
    expect(clampParam(999, { min: 0, max: 10, fallback: 3 })).toBe(10);
  });
});
