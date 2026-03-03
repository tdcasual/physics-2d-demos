import { describe, expect, it } from 'vitest';
import { getTeachingStandards } from '../../src/app/teaching-standards';

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
});
