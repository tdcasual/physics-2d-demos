/// <reference types="vite/client" />
import type {
  SceneMeta,
  ScenePlacardMeta,
  SceneTestProfile
} from '../platform/scene-contract';

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
  featured: boolean;
  source: 'modern';
  dimension: '2d' | '3d';
  testProfile?: SceneTestProfile;
};

const SUBJECT_TO_CATEGORY: Record<string, { category: string; label: string }> =
  {
    力学: { category: 'mechanics', label: '力学' },
    电磁学: { category: 'electromagnetism', label: '电磁学' },
    方法: { category: 'method', label: '方法' }
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
    const mapped = SUBJECT_TO_CATEGORY[meta.subject] ?? {
      category: 'method',
      label: '方法'
    };
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
      category: meta.category ?? mapped.category,
      categoryLabel: mapped.label,
      featured: meta.featured ?? false,
      source: 'modern' as const,
      dimension: '2d' as const,
      testProfile: meta.testProfile
    };
  })
  .sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
