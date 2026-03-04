import { chaseMeetMeta } from '../scenes/chase-meet/scene.meta';
import { electrificationMeta } from '../scenes/electrification/scene.meta';
import { emfAnalogyMeta } from '../scenes/emf-analogy/scene.meta';
import { fieldLinesMeta } from '../scenes/field-lines/scene.meta';
import { projectileMeta } from '../scenes/projectile/scene.meta';
import { vtIntegralMeta } from '../scenes/vt-integral/scene.meta';

export type SceneRegistrySource = 'modern';
export type SceneRegistryDimension = '2d' | '3d';

export type SceneRegistryEntry = {
  id: string;
  title: string;
  path: string;
  keywords: string[];
  source: SceneRegistrySource;
  dimension: SceneRegistryDimension;
};

export const sceneRegistry: SceneRegistryEntry[] = [
  {
    id: projectileMeta.id,
    title: projectileMeta.title,
    path: projectileMeta.path,
    keywords: projectileMeta.keywords,
    source: 'modern',
    dimension: '2d'
  },
  {
    id: chaseMeetMeta.id,
    title: chaseMeetMeta.title,
    path: chaseMeetMeta.path,
    keywords: chaseMeetMeta.keywords,
    source: 'modern',
    dimension: '2d'
  },
  {
    id: fieldLinesMeta.id,
    title: fieldLinesMeta.title,
    path: fieldLinesMeta.path,
    keywords: fieldLinesMeta.keywords,
    source: 'modern',
    dimension: '2d'
  },
  {
    id: emfAnalogyMeta.id,
    title: emfAnalogyMeta.title,
    path: emfAnalogyMeta.path,
    keywords: emfAnalogyMeta.keywords,
    source: 'modern',
    dimension: '2d'
  },
  {
    id: electrificationMeta.id,
    title: electrificationMeta.title,
    path: electrificationMeta.path,
    keywords: electrificationMeta.keywords,
    source: 'modern',
    dimension: '2d'
  },
  {
    id: vtIntegralMeta.id,
    title: vtIntegralMeta.title,
    path: vtIntegralMeta.path,
    keywords: vtIntegralMeta.keywords,
    source: 'modern',
    dimension: '2d'
  }
];
