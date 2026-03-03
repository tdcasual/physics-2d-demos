import { describe, expect, it } from 'vitest';
import {
  buildLegacy2DHostPath,
  getLegacy2DAnimationById,
  legacy2DAnimationCatalog,
  legacy3DAnimationCatalog,
  toLegacySceneIndexEntries
} from '../../src/app/legacy-animation-catalog';

describe('legacy animation catalog', () => {
  it('classifies legacy animations into 2D and 3D groups', () => {
    expect(legacy2DAnimationCatalog.map((item) => item.id)).toEqual([
      'legacy-field-lines',
      'legacy-emf-analogy',
      'legacy-electrification',
      'legacy-vt-integral',
      'legacy-chase-meet'
    ]);

    expect(legacy3DAnimationCatalog.map((item) => item.id)).toEqual([]);
  });

  it('maps 2D scenes to shared host page and keeps 3D scene direct', () => {
    const entries = toLegacySceneIndexEntries();
    const fieldLines = entries.find((item) => item.id === 'legacy-field-lines');
    const vtIntegral = entries.find((item) => item.id === 'legacy-vt-integral');

    expect(fieldLines?.path).toBe(buildLegacy2DHostPath('legacy-field-lines'));
    expect(vtIntegral?.path).toBe(buildLegacy2DHostPath('legacy-vt-integral'));
  });

  it('only resolves 2D scene configs by id', () => {
    expect(getLegacy2DAnimationById('legacy-chase-meet')?.title).toBe('追及相遇演示动画');
    expect(getLegacy2DAnimationById('legacy-vt-integral')?.title).toBe('微元法交互式动画');
  });
});
