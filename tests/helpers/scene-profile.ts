import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import type { SceneMeta } from '../../src/platform/scene-contract';
import { sceneIds } from '../visual/scene-pages';

export type E2ESceneProfile = {
  hasGraph: boolean;
  hasTransport: boolean;
  supportsPresentation: boolean;
  canvasSelector: string;
};

const CANVAS_SELECTOR = 'canvas.stage-canvas, canvas.mobile-stage-canvas';
/**
 * 自建舞台 DOM 的场景覆盖：chase-meet 不消费布局画布，用自己的
 * chase-modern-motion-canvas（renderer/view-utils.ts createStageDom）。
 */
const CANVAS_SELECTOR_OVERRIDES: Record<string, string> = {
  'chase-meet': 'canvas.chase-modern-motion-canvas'
};

/** Read layout-independent capabilities directly from the exported SceneMeta. */
async function readProfile(
  id: string
): Promise<Omit<E2ESceneProfile, 'canvasSelector'>> {
  const metaPath = resolve(process.cwd(), 'src/scenes', id, 'scene.meta.ts');
  const module = (await import(pathToFileURL(metaPath).href)) as Record<
    string,
    unknown
  >;
  const meta = Object.values(module).find(
    (value): value is SceneMeta =>
      typeof value === 'object' &&
      value !== null &&
      'id' in value &&
      (value as { id?: unknown }).id === id
  );
  if (!meta?.testProfile) {
    throw new Error(
      `Scene "${id}" has no SceneMeta.testProfile; browser tests cannot infer its capabilities.`
    );
  }
  return meta.testProfile;
}

export const sceneProfiles = await Promise.all(
  sceneIds.map(async (id) => ({
    id,
    profile: {
      ...(await readProfile(id)),
      canvasSelector: CANVAS_SELECTOR_OVERRIDES[id] ?? CANVAS_SELECTOR
    }
  }))
);

export function getSceneProfile(id: string): E2ESceneProfile {
  const entry = sceneProfiles.find((scene) => scene.id === id);
  if (!entry) {
    throw new Error(`Scene "${id}" has no E2E profile.`);
  }
  return entry.profile;
}
