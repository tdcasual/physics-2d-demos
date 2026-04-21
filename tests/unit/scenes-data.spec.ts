import { describe, expect, it } from 'vitest';
import { getDifficultyLabel, featuredScenes } from '../../src/app/data/scenes';

describe('scenes data', () => {
  it('getDifficultyLabel should map 1-3 to labels', () => {
    expect(getDifficultyLabel(1)).toBe('入门');
    expect(getDifficultyLabel(2)).toBe('进阶');
    expect(getDifficultyLabel(3)).toBe('挑战');
  });

  it('getDifficultyLabel should return unknown for invalid', () => {
    expect(getDifficultyLabel(0)).toBe('未知');
    expect(getDifficultyLabel(99)).toBe('未知');
  });

  it('featuredScenes should be non-empty array', () => {
    expect(Array.isArray(featuredScenes)).toBe(true);
    expect(featuredScenes.length).toBeGreaterThan(0);
  });
});
