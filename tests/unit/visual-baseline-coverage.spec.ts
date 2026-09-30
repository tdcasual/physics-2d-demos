import { describe, expect, it } from 'vitest';
import { sceneIds } from '../visual/scene-pages';
import {
  hasAuthoritativePair,
  legacyBaselineDebt,
  untrackedSceneIds,
  VISUAL_COVERED_SCENE_IDS,
  VISUAL_DYNAMIC_SCENE_IDS,
  VISUAL_LEGACY_DEBT_OWNER,
  VISUAL_LEGACY_DEBT_RECORD,
  VISUAL_LEGACY_DEBT_SCENE_IDS,
  VISUAL_SCREENSHOT_SPEC_COUNT
} from '../visual/baseline-coverage';

describe('visual baseline coverage manifest', () => {
  it('accounts for every discovered scene with full pairs or explicit debt', () => {
    const covered = [...VISUAL_COVERED_SCENE_IDS].sort();
    const discovered = [...sceneIds].sort();
    const debtIds = [...VISUAL_LEGACY_DEBT_SCENE_IDS].sort();
    const namedDebt = legacyBaselineDebt();
    expect(covered.filter((id) => !discovered.includes(id))).toEqual([]);
    expect(debtIds.filter((id) => !discovered.includes(id))).toEqual([]);
    expect(covered.filter((id) => !hasAuthoritativePair(id))).toEqual([]);
    expect(untrackedSceneIds(discovered)).toEqual([]);
    expect(covered.filter((id) => debtIds.includes(id))).toEqual([]);
    expect(covered.length + debtIds.length).toBe(discovered.length);
    expect(debtIds).toHaveLength(23);
    expect(VISUAL_COVERED_SCENE_IDS.length * 2).toBe(
      VISUAL_SCREENSHOT_SPEC_COUNT
    );
    expect(VISUAL_SCREENSHOT_SPEC_COUNT).toBe(194);
    expect(VISUAL_LEGACY_DEBT_RECORD).toBe('B11');
    expect(VISUAL_LEGACY_DEBT_OWNER).toBe('physics-2d maintainers');
    expect(Object.keys(namedDebt).sort()).toEqual(debtIds);
    expect(
      Object.values(namedDebt).every((item) => item.record === 'B11')
    ).toBe(true);
  });

  it('keeps the dynamic screenshot allowlist inside discovered scenes', () => {
    expect(
      VISUAL_DYNAMIC_SCENE_IDS.filter((id) => !sceneIds.includes(id))
    ).toEqual([]);
  });
});
