import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getTeachingStandards } from '../../src/app/teaching-standards';

const modernSceneViewFiles = [
  'src/scenes/projectile/scene.view.ts',
  'src/scenes/chase-meet/scene.view.ts',
  'src/scenes/field-lines/scene.view.ts',
  'src/scenes/emf-analogy/scene.view.ts',
  'src/scenes/electrification/scene.view.ts',
  'src/scenes/vt-integral/scene.view.ts'
] as const;

describe('right stage readability standards', () => {
  it('keeps shared standards at or above classroom thresholds', () => {
    const normal = getTeachingStandards('normal').rightStage;
    const presentation = getTeachingStandards('presentation').rightStage;

    expect(normal.primaryFontPx).toBeGreaterThanOrEqual(36);
    expect(normal.secondaryFontPx).toBeGreaterThanOrEqual(30);
    expect(normal.majorStrokePx).toBeGreaterThanOrEqual(6);
    expect(normal.minorStrokePx).toBeGreaterThanOrEqual(5);
    expect(normal.markerRadiusPx).toBeGreaterThanOrEqual(12);

    expect(presentation.primaryFontPx).toBeGreaterThanOrEqual(56);
    expect(presentation.secondaryFontPx).toBeGreaterThanOrEqual(46);
    expect(presentation.majorStrokePx).toBeGreaterThanOrEqual(11);
    expect(presentation.minorStrokePx).toBeGreaterThanOrEqual(9);
    expect(presentation.markerRadiusPx).toBeGreaterThanOrEqual(20);
  });

  it('all modern scene views consume shared teaching standards tokens', () => {
    for (const file of modernSceneViewFiles) {
      const content = readFileSync(file, 'utf8');
      // 允许使用 getTeachingStandards 或统一 Canvas 框架作为共享标准
      // 拆分后的 renderer 子目录也需要检查
      const usesStandards =
        content.includes('getTeachingStandards') ||
        content.includes('../../platform/standards');
      const usesUnifiedCanvas = content.includes('unified-canvas');
      expect(usesStandards || usesUnifiedCanvas).toBe(true);
      expect(content.includes('RIGHT_STAGE_STANDARD')).toBe(false);
    }
  });
});
