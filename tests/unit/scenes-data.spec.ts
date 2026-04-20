import { describe, expect, it } from 'vitest';
import {
  getSceneById,
  getDifficultyLabel,
  scenes,
  featuredScenes,
  scenesByCategory
} from '../../src/app/data/scenes';
import { getEraColor, getEraName } from '../../src/app/data/timeline';

describe('scenes data', () => {
  it('getSceneById should find existing scene', () => {
    const scene = getSceneById('projectile');
    expect(scene).toBeDefined();
    expect(scene?.id).toBe('projectile');
  });

  it('getSceneById should return undefined for missing id', () => {
    expect(getSceneById('nonexistent')).toBeUndefined();
  });

  it('getDifficultyLabel should map 1-3 to labels', () => {
    expect(getDifficultyLabel(1)).toBe('入门');
    expect(getDifficultyLabel(2)).toBe('进阶');
    expect(getDifficultyLabel(3)).toBe('挑战');
  });

  it('getDifficultyLabel should return unknown for invalid', () => {
    expect(getDifficultyLabel(0)).toBe('未知');
    expect(getDifficultyLabel(99)).toBe('未知');
  });

  it('scenes should be non-empty array', () => {
    expect(Array.isArray(scenes)).toBe(true);
    expect(scenes.length).toBeGreaterThan(0);
  });

  it('featuredScenes should be subset of scenes', () => {
    expect(Array.isArray(featuredScenes)).toBe(true);
    featuredScenes.forEach((s) => {
      expect(scenes.some((scene) => scene.id === s.id)).toBe(true);
    });
  });

  it('scenesByCategory should group scenes', () => {
    expect(typeof scenesByCategory).toBe('object');
    Object.values(scenesByCategory).forEach((arr) => {
      expect(Array.isArray(arr)).toBe(true);
    });
  });
});

describe('timeline data', () => {
  it('getEraColor should return color for each era', () => {
    expect(getEraColor('ancient')).toBe('#d4a373');
    expect(getEraColor('classical')).toBe('#e17055');
    expect(getEraColor('modern')).toBe('#00b894');
    expect(getEraColor('contemporary')).toBe('#0984e3');
  });

  it('getEraName should return name for each era', () => {
    expect(getEraName('ancient')).toBe('古代');
    expect(getEraName('classical')).toBe('经典');
    expect(getEraName('modern')).toBe('近代');
    expect(getEraName('contemporary')).toBe('现代');
  });
});
