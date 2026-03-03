import { buildLegacy2DHostPath, legacyAnimationCatalog, type LegacyAnimationDimension } from '../app/legacy-animation-catalog';
import { projectileMeta } from '../scenes/projectile/scene.meta';

export type SceneRegistrySource = 'modern' | 'legacy';

export type SceneRegistryEntry = {
  id: string;
  title: string;
  path: string;
  keywords: string[];
  source: SceneRegistrySource;
  dimension: LegacyAnimationDimension;
};

const modernScenes: SceneRegistryEntry[] = [
  {
    id: projectileMeta.id,
    title: projectileMeta.title,
    path: projectileMeta.path,
    keywords: projectileMeta.keywords,
    source: 'modern',
    dimension: '2d'
  }
];

const legacyScenes: SceneRegistryEntry[] = legacyAnimationCatalog.map((item) => ({
  id: item.id,
  title: item.title,
  path: item.dimension === '2d' ? buildLegacy2DHostPath(item.id) : item.sourcePath,
  keywords: item.keywords,
  source: 'legacy',
  dimension: item.dimension
}));

export const sceneRegistry: SceneRegistryEntry[] = [...modernScenes, ...legacyScenes];
