/// <reference types="vite/client" />
import type {
  SceneMeta,
  ScenePlacardMeta,
  SceneTestProfile
} from '../platform/scene-contract';
import {
  CURRICULUM_DOMAIN_INFO,
  type CurriculumChapter,
  type CurriculumDomain
} from '../platform/curriculum';

export type SceneRegistryEntry = ScenePlacardMeta & {
  id: string;
  title: string;
  path: string;
  keywords: string[];
  description: string;
  difficulty: number;
  icon: string;
  category: string;
  categoryLabel: string;
  /** 人教版课程体系一级分类（category 的规范化别名） */
  curriculumDomain: CurriculumDomain;
  /** 人教版课程体系二级章节 */
  curriculumChapter: CurriculumChapter;
  featured: boolean;
  source: 'modern';
  dimension: '2d' | '3d';
  testProfile?: SceneTestProfile;
};

const modules = import.meta.glob('/src/scenes/*/scene.meta.ts', {
  eager: true,
  import: '*',
  query: '?catalog'
}) as Record<string, Record<string, unknown>>;

function extractMeta(mod: Record<string, unknown>): SceneMeta | null {
  const key = Object.keys(mod).find((k) => k.endsWith('Meta'));
  if (!key) return null;
  const candidate = mod[key];
  if (!candidate || typeof candidate !== 'object') return null;
  return candidate as SceneMeta;
}

export const sceneRegistry: SceneRegistryEntry[] = Object.values(modules)
  .map(extractMeta)
  .filter((m): m is SceneMeta => m !== null)
  .map((meta) => {
    if (!meta.curriculumDomain || !meta.curriculumChapter) {
      throw new Error(
        `Scene "${meta.id}" is missing curriculumDomain/curriculumChapter. ` +
          'Add both fields to its scene.meta.ts before registering it.'
      );
    }
    const curriculum = {
      domain: meta.curriculumDomain,
      chapter: meta.curriculumChapter
    };
    const domainInfo = CURRICULUM_DOMAIN_INFO[curriculum.domain];
    return {
      id: meta.id,
      title: meta.title,
      path: meta.path,
      subject: meta.subject,
      concept: meta.concept,
      subConcepts: meta.subConcepts,
      keywords: meta.keywords,
      description: meta.description ?? meta.objective,
      difficulty: meta.difficulty ?? 2,
      icon: meta.icon ?? '📐',
      // Keep category for consumers that still use the legacy field. It is
      // deliberately normalized to the curriculum domain so new scenes do
      // not need to duplicate taxonomy data.
      category: curriculum.domain,
      categoryLabel: domainInfo.label,
      curriculumDomain: curriculum.domain,
      curriculumChapter: curriculum.chapter,
      featured: meta.featured ?? false,
      source: 'modern' as const,
      dimension: '2d' as const,
      testProfile: meta.testProfile
    };
  })
  .sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
