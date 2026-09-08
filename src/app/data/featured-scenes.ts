/**
 * Homepage hero cards: only the six featured scene metas.
 * Do not import catalog/scene-registry — that eager-globs every scene.meta.ts.
 */
import { chaseMeetMeta } from '../../scenes/chase-meet/scene.meta';
import { fieldLinesMeta } from '../../scenes/field-lines/scene.meta';
import { gansheMeta } from '../../scenes/ganshe/scene.meta';
import { projectileMeta } from '../../scenes/projectile/scene.meta';
import { springOscillatorMeta } from '../../scenes/spring-oscillator/scene.meta';
import { vtIntegralMeta } from '../../scenes/vt-integral/scene.meta';
import type { SceneMeta } from '../../platform/scene-contract';

export const featuredScenes: SceneMeta[] = [
  chaseMeetMeta,
  fieldLinesMeta,
  gansheMeta,
  projectileMeta,
  springOscillatorMeta,
  vtIntegralMeta
].sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
