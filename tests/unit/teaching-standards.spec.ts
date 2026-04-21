import { describe, expect, it } from 'vitest';
import { getTeachingStandards } from '../../src/platform/standards';

describe('teaching standards', () => {
  it('uses 1080p baseline and larger presentation tokens', () => {
    const normal = getTeachingStandards('normal');
    const presentation = getTeachingStandards('presentation');

    expect(normal.viewport).toEqual({ width: 1920, height: 1080 });
    expect(presentation.bodyFontPx).toBeGreaterThan(normal.bodyFontPx);
    expect(presentation.controlFontPx).toBeGreaterThan(normal.controlFontPx);
    expect(presentation.strokePx).toBeGreaterThan(normal.strokePx);
    expect(presentation.pointRadiusPx).toBeGreaterThan(normal.pointRadiusPx);
  });

  it('enforces classroom readability minimums on right-side animation', () => {
    const normal = getTeachingStandards('normal');
    const presentation = getTeachingStandards('presentation');

    expect(normal.rightStage.primaryFontPx).toBeGreaterThanOrEqual(36);
    expect(normal.rightStage.secondaryFontPx).toBeGreaterThanOrEqual(30);
    expect(normal.rightStage.majorStrokePx).toBeGreaterThanOrEqual(6);
    expect(normal.rightStage.minorStrokePx).toBeGreaterThanOrEqual(5);
    expect(normal.rightStage.markerRadiusPx).toBeGreaterThanOrEqual(12);

    expect(presentation.rightStage.primaryFontPx).toBeGreaterThanOrEqual(56);
    expect(presentation.rightStage.secondaryFontPx).toBeGreaterThanOrEqual(46);
    expect(presentation.rightStage.majorStrokePx).toBeGreaterThanOrEqual(11);
    expect(presentation.rightStage.minorStrokePx).toBeGreaterThanOrEqual(9);
    expect(presentation.rightStage.markerRadiusPx).toBeGreaterThanOrEqual(20);
  });
});
