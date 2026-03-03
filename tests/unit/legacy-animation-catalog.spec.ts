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
      'legacy-chase-meet'
    ]);

    expect(legacy3DAnimationCatalog.map((item) => item.id)).toEqual([
      'legacy-potential-3d',
      'legacy-equipotential-3d',
      'legacy-vt-integral'
    ]);
  });

  it('maps 2D scenes to shared host page and keeps 3D scene direct', () => {
    const entries = toLegacySceneIndexEntries();
    const fieldLines = entries.find((item) => item.id === 'legacy-field-lines');
    const potential3D = entries.find((item) => item.id === 'legacy-potential-3d');

    expect(fieldLines?.path).toBe(buildLegacy2DHostPath('legacy-field-lines'));
    expect(potential3D?.path).toBe('/animations/electromagnetism/3D 生成电势图.html');
  });

  it('only resolves 2D scene configs by id', () => {
    expect(getLegacy2DAnimationById('legacy-chase-meet')?.title).toBe('追及相遇演示动画');
    expect(getLegacy2DAnimationById('legacy-equipotential-3d')).toBeUndefined();
  });
});
