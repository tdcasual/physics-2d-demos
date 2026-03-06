import { chaseMeetMeta } from '../scenes/chase-meet/scene.meta';
import { electrificationMeta } from '../scenes/electrification/scene.meta';
import { emfAnalogyMeta } from '../scenes/emf-analogy/scene.meta';
import { fieldLinesMeta } from '../scenes/field-lines/scene.meta';
import { projectileMeta } from '../scenes/projectile/scene.meta';
import { vtIntegralMeta } from '../scenes/vt-integral/scene.meta';
import type { ScenePlacardMeta } from '../scenes/types';

export type SceneRegistrySource = 'modern';
export type SceneRegistryDimension = '2d' | '3d';

export type SceneRegistryEntry = ScenePlacardMeta & {
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
    subject: projectileMeta.subject,
    concept: projectileMeta.concept,
    subConcepts: projectileMeta.subConcepts,
    keywords: projectileMeta.keywords,
    source: 'modern',
    dimension: '2d'
  },
  {
    id: chaseMeetMeta.id,
    title: chaseMeetMeta.title,
    path: chaseMeetMeta.path,
    subject: chaseMeetMeta.subject,
    concept: chaseMeetMeta.concept,
    subConcepts: chaseMeetMeta.subConcepts,
    keywords: chaseMeetMeta.keywords,
    source: 'modern',
    dimension: '2d'
  },
  {
    id: fieldLinesMeta.id,
    title: fieldLinesMeta.title,
    path: fieldLinesMeta.path,
    subject: fieldLinesMeta.subject,
    concept: fieldLinesMeta.concept,
    subConcepts: fieldLinesMeta.subConcepts,
    keywords: fieldLinesMeta.keywords,
    source: 'modern',
    dimension: '2d'
  },
  {
    id: emfAnalogyMeta.id,
    title: emfAnalogyMeta.title,
    path: emfAnalogyMeta.path,
    subject: emfAnalogyMeta.subject,
    concept: emfAnalogyMeta.concept,
    subConcepts: emfAnalogyMeta.subConcepts,
    keywords: emfAnalogyMeta.keywords,
    source: 'modern',
    dimension: '2d'
  },
  {
    id: electrificationMeta.id,
    title: electrificationMeta.title,
    path: electrificationMeta.path,
    subject: electrificationMeta.subject,
    concept: electrificationMeta.concept,
    subConcepts: electrificationMeta.subConcepts,
    keywords: electrificationMeta.keywords,
    source: 'modern',
    dimension: '2d'
  },
  {
    id: vtIntegralMeta.id,
    title: vtIntegralMeta.title,
    path: vtIntegralMeta.path,
    subject: vtIntegralMeta.subject,
    concept: vtIntegralMeta.concept,
    subConcepts: vtIntegralMeta.subConcepts,
    keywords: vtIntegralMeta.keywords,
    source: 'modern',
    dimension: '2d'
  }
];
