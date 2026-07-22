import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getRenderTokens } from '../../src/platform/standards';

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
    const normal = getRenderTokens(1.0).rightStage;
    const presentation = getRenderTokens(1.5).rightStage;

    expect(normal.primaryFontPx).toBeGreaterThanOrEqual(36);
    expect(normal.secondaryFontPx).toBeGreaterThanOrEqual(30);
    expect(normal.majorStrokePx).toBeGreaterThanOrEqual(6);
    expect(normal.minorStrokePx).toBeGreaterThanOrEqual(5);
    expect(normal.markerRadiusPx).toBeGreaterThanOrEqual(12);

    // 演示模式（放大）下右舞台可读性应高于标准模式
    expect(presentation.primaryFontPx).toBeGreaterThan(normal.primaryFontPx);
    expect(presentation.secondaryFontPx).toBeGreaterThan(
      normal.secondaryFontPx
    );
    expect(presentation.majorStrokePx).toBeGreaterThan(normal.majorStrokePx);
    expect(presentation.minorStrokePx).toBeGreaterThan(normal.minorStrokePx);
    expect(presentation.markerRadiusPx).toBeGreaterThan(normal.markerRadiusPx);
  });

  it('all modern scene views consume shared rendering standards', () => {
    for (const file of modernSceneViewFiles) {
      const content = readFileSync(file, 'utf8');
      // 场景视图应经由共享标准机制：演示 token（getRenderTokens / platform/standards）
      // 或响应式缩放（core/canvas-sizing 的 responsiveScale），而非各自硬编码
      const usesStandards =
        content.includes('getRenderTokens') ||
        content.includes('platform/standards') ||
        content.includes('responsiveScale') ||
        content.includes('canvas-sizing');
      expect(usesStandards).toBe(true);
      expect(content.includes('RIGHT_STAGE_STANDARD')).toBe(false);
    }
  });
});
