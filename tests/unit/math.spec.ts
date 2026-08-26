import { describe, it, expect } from 'vitest';
import { clamp } from '../../src/core/math';

describe('clamp', () => {
  it('returns value inside range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('clamps to min and max', () => {
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(30, 0, 10)).toBe(10);
  });

  it('handles equal min/max', () => {
    expect(clamp(7, 2, 2)).toBe(2);
  });
});
