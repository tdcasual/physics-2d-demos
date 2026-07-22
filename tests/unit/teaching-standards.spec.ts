import { describe, expect, it } from 'vitest';
import { getRenderTokens } from '../../src/platform/standards';

describe('teaching standards (getRenderTokens)', () => {
  it('uses 1080p baseline and scales tokens up for presentation', () => {
    const normal = getRenderTokens(1.0);
    const presentation = getRenderTokens(1.5);

    expect(normal.viewport).toEqual({ width: 1920, height: 1080 });
    expect(presentation.bodyFontPx).toBeGreaterThan(normal.bodyFontPx);
    expect(presentation.controlFontPx).toBeGreaterThan(normal.controlFontPx);
    expect(presentation.strokePx).toBeGreaterThan(normal.strokePx);
    expect(presentation.pointRadiusPx).toBeGreaterThan(normal.pointRadiusPx);
  });

  it('enforces classroom readability minimums on right-side animation', () => {
    const normal = getRenderTokens(1.0);
    expect(normal.rightStage.primaryFontPx).toBeGreaterThanOrEqual(36);
    expect(normal.rightStage.secondaryFontPx).toBeGreaterThanOrEqual(30);
    expect(normal.rightStage.majorStrokePx).toBeGreaterThanOrEqual(6);
    expect(normal.rightStage.minorStrokePx).toBeGreaterThanOrEqual(5);
    expect(normal.rightStage.markerRadiusPx).toBeGreaterThanOrEqual(12);

    // 演示模式（放大）下右舞台可读性应高于标准模式
    const presentation = getRenderTokens(1.5);
    expect(presentation.rightStage.primaryFontPx).toBeGreaterThan(
      normal.rightStage.primaryFontPx
    );
    expect(presentation.rightStage.secondaryFontPx).toBeGreaterThan(
      normal.rightStage.secondaryFontPx
    );
    expect(presentation.rightStage.majorStrokePx).toBeGreaterThan(
      normal.rightStage.majorStrokePx
    );
    expect(presentation.rightStage.minorStrokePx).toBeGreaterThan(
      normal.rightStage.minorStrokePx
    );
    expect(presentation.rightStage.markerRadiusPx).toBeGreaterThan(
      normal.rightStage.markerRadiusPx
    );
  });

  it('clamps scale to a minimum of 0.5', () => {
    const tiny = getRenderTokens(0.1);
    const floor = getRenderTokens(0.5);
    expect(tiny.bodyFontPx).toBe(floor.bodyFontPx);
    expect(tiny.pointRadiusPx).toBe(floor.pointRadiusPx);
  });
});
