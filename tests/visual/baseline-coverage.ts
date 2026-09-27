import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sceneIds } from './scene-pages';

const coverageDir = dirname(fileURLToPath(import.meta.url));

type CoverageManifest = {
  screenshotSpecCount: number;
  coveredSceneIds: string[];
  dynamicSceneIds: string[];
  legacyDebtRecord: string;
  legacyDebtOwner: string;
  legacyDebtReason: string;
  legacyDebtReference: string;
  legacyDebtSceneIds: string[];
};

const coverageJson = JSON.parse(
  readFileSync(join(coverageDir, 'baseline-coverage.json'), 'utf8')
) as CoverageManifest;

export const VISUAL_COVERED_SCENE_IDS: readonly string[] =
  coverageJson.coveredSceneIds;

export const VISUAL_DYNAMIC_SCENE_IDS: readonly string[] =
  coverageJson.dynamicSceneIds;

export const VISUAL_SCREENSHOT_SPEC_COUNT = coverageJson.screenshotSpecCount;

export const VISUAL_LEGACY_DEBT_RECORD = coverageJson.legacyDebtRecord;

export const VISUAL_LEGACY_DEBT_OWNER = coverageJson.legacyDebtOwner;

export const VISUAL_LEGACY_DEBT_REASON = coverageJson.legacyDebtReason;

export const VISUAL_LEGACY_DEBT_REFERENCE = coverageJson.legacyDebtReference;

export const VISUAL_LEGACY_DEBT_SCENE_IDS: readonly string[] =
  coverageJson.legacyDebtSceneIds;

const SNAPSHOT_DIR = join(
  process.cwd(),
  'tests/visual/visual-regression.spec.ts-snapshots'
);

export function goldenName(
  sceneId: string,
  viewport: 'desktop' | 'mobile',
  platform: 'linux' | 'darwin'
): string {
  return `${sceneId}-${viewport}-${platform}.png`;
}

export function hasCompletePlatformPair(
  sceneId: string,
  platform: 'linux' | 'darwin'
): boolean {
  return (
    existsSync(join(SNAPSHOT_DIR, goldenName(sceneId, 'desktop', platform))) &&
    existsSync(join(SNAPSHOT_DIR, goldenName(sceneId, 'mobile', platform)))
  );
}

export function hasAuthoritativePair(sceneId: string): boolean {
  return (
    hasCompletePlatformPair(sceneId, 'linux') &&
    hasCompletePlatformPair(sceneId, 'darwin')
  );
}

export function untrackedSceneIds(
  discovered: readonly string[] = sceneIds
): string[] {
  const covered = new Set(VISUAL_COVERED_SCENE_IDS);
  const debt = new Set(VISUAL_LEGACY_DEBT_SCENE_IDS);
  return discovered.filter((id) => !covered.has(id) && !debt.has(id));
}

export function legacyBaselineDebt(): Record<
  string,
  { record: string; owner: string; reason: string; reference: string }
> {
  const debt: Record<
    string,
    { record: string; owner: string; reason: string; reference: string }
  > = {};
  for (const id of VISUAL_LEGACY_DEBT_SCENE_IDS) {
    debt[id] = {
      record: VISUAL_LEGACY_DEBT_RECORD,
      owner: VISUAL_LEGACY_DEBT_OWNER,
      reason: VISUAL_LEGACY_DEBT_REASON,
      reference: VISUAL_LEGACY_DEBT_REFERENCE
    };
  }
  return debt;
}
