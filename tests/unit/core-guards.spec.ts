import { describe, expect, it } from 'vitest';
import { clampParam } from '../../src/core/guards';

describe('clampParam', () => {
  it('should return value when within range', () => {
    expect(clampParam(5, { min: 0, max: 10, fallback: 0 })).toBe(5);
  });

  it('should clamp to min when below range', () => {
    expect(clampParam(-5, { min: 0, max: 10, fallback: 0 })).toBe(0);
  });

  it('should clamp to max when above range', () => {
    expect(clampParam(15, { min: 0, max: 10, fallback: 0 })).toBe(10);
  });

  it('should return fallback for non-finite values', () => {
    expect(clampParam(NaN, { min: 0, max: 10, fallback: 5 })).toBe(5);
    expect(clampParam(Infinity, { min: 0, max: 10, fallback: 5 })).toBe(5);
    expect(clampParam(-Infinity, { min: 0, max: 10, fallback: 5 })).toBe(5);
  });

  it('should handle edge values', () => {
    expect(clampParam(0, { min: 0, max: 10, fallback: 0 })).toBe(0);
    expect(clampParam(10, { min: 0, max: 10, fallback: 0 })).toBe(10);
  });
});
