import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getTeachingStandards } from '../../src/app/teaching-standards';

type VisualThreshold = {
  primaryFontPx: number;
  secondaryFontPx: number;
  majorStrokePx: number;
  minorStrokePx: number;
  markerRadiusPx: number;
};

const MINIMUMS: Record<'normal' | 'presentation', VisualThreshold> = {
  normal: {
    primaryFontPx: 36,
    secondaryFontPx: 30,
    majorStrokePx: 6,
    minorStrokePx: 5,
    markerRadiusPx: 12
  },
  presentation: {
    primaryFontPx: 56,
    secondaryFontPx: 46,
    majorStrokePx: 11,
    minorStrokePx: 9,
    markerRadiusPx: 20
  }
};

const legacySceneFiles = [
  'animations/electromagnetism/模拟电场线.html',
  'animations/electromagnetism/起电方式演示.html',
  'animations/electromagnetism/电动势类比动画.html',
  'animations/mechanics/v-t面积与微元法.html',
  'animations/mechanics/追击相遇问题.html'
] as const;

function getModeBlock(content: string, mode: 'normal' | 'presentation', file: string): string {
  const modeMatch = content.match(new RegExp(`${mode}\\s*:\\s*\\{([\\s\\S]*?)\\}`));
  expect(modeMatch, `${file} should define RIGHT_STAGE_STANDARD.${mode}`).toBeTruthy();
  return modeMatch?.[1] ?? '';
}

function getNumeric(block: string, key: keyof VisualThreshold, file: string, mode: string): number {
  const match = block.match(new RegExp(`${key}\\s*:\\s*([0-9.]+)`));
  expect(match, `${file} ${mode} should define ${key}`).toBeTruthy();
  return Number(match?.[1] ?? Number.NaN);
}

describe('right stage readability standards', () => {
  it('keeps shared standards at or above classroom thresholds', () => {
    const normal = getTeachingStandards('normal').rightStage;
    const presentation = getTeachingStandards('presentation').rightStage;

    for (const [mode, minimum] of Object.entries(MINIMUMS) as Array<[keyof typeof MINIMUMS, VisualThreshold]>) {
      const token = mode === 'normal' ? normal : presentation;
      expect(token.primaryFontPx).toBeGreaterThanOrEqual(minimum.primaryFontPx);
      expect(token.secondaryFontPx).toBeGreaterThanOrEqual(minimum.secondaryFontPx);
      expect(token.majorStrokePx).toBeGreaterThanOrEqual(minimum.majorStrokePx);
      expect(token.minorStrokePx).toBeGreaterThanOrEqual(minimum.minorStrokePx);
      expect(token.markerRadiusPx).toBeGreaterThanOrEqual(minimum.markerRadiusPx);
    }
  });

  it('enforces legacy scene token minimums for each mode', () => {
    for (const file of legacySceneFiles) {
      const content = readFileSync(file, 'utf8');
      expect(content).toContain('const RIGHT_STAGE_STANDARD');

      for (const mode of ['normal', 'presentation'] as const) {
        const block = getModeBlock(content, mode, file);
        const minimum = MINIMUMS[mode];
        const primaryFontPx = getNumeric(block, 'primaryFontPx', file, mode);
        const secondaryFontPx = getNumeric(block, 'secondaryFontPx', file, mode);
        const majorStrokePx = getNumeric(block, 'majorStrokePx', file, mode);
        const minorStrokePx = getNumeric(block, 'minorStrokePx', file, mode);
        const markerRadiusPx = getNumeric(block, 'markerRadiusPx', file, mode);

        expect(primaryFontPx).toBeGreaterThanOrEqual(minimum.primaryFontPx);
        expect(secondaryFontPx).toBeGreaterThanOrEqual(minimum.secondaryFontPx);
        expect(majorStrokePx).toBeGreaterThanOrEqual(minimum.majorStrokePx);
        expect(minorStrokePx).toBeGreaterThanOrEqual(minimum.minorStrokePx);
        expect(markerRadiusPx).toBeGreaterThanOrEqual(minimum.markerRadiusPx);
      }
    }
  });
});
