import { sceneRegistry, type SceneRegistryEntry } from '../catalog/scene-registry';

export type SceneIndexEntry = Pick<SceneRegistryEntry, 'id' | 'title' | 'path' | 'subject' | 'concept' | 'subConcepts'> & {
  keywords?: string[];
};

function normalizeSubConcepts(value: unknown): [string, string] | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const [first, second] = value;
  if (typeof first !== 'string' || typeof second !== 'string') return null;
  const normalizedFirst = first.trim();
  const normalizedSecond = second.trim();
  if (!normalizedFirst || !normalizedSecond) return null;
  return [normalizedFirst, normalizedSecond];
}

export const sceneIndexEntries: SceneIndexEntry[] = sceneRegistry.map((item) => ({
  id: item.id,
  title: item.title,
  path: item.path,
  subject: item.subject,
  concept: item.concept,
  subConcepts: item.subConcepts,
  keywords: item.keywords
}));

export function isSceneIndexEntry(value: unknown): value is SceneIndexEntry {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.path === 'string' &&
    typeof item.subject === 'string' &&
    typeof item.concept === 'string' &&
    normalizeSubConcepts(item.subConcepts) !== null
  );
}

export function normalizeSceneIndex(input: unknown): SceneIndexEntry[] {
  if (!Array.isArray(input)) return [];
  return input.flatMap((entry) => {
    if (!isSceneIndexEntry(entry)) return [];
    const subConcepts = normalizeSubConcepts(entry.subConcepts);
    if (!subConcepts) return [];
    return [
      {
        id: entry.id.trim(),
        title: entry.title.trim(),
        path: entry.path.trim(),
        subject: entry.subject.trim(),
        concept: entry.concept.trim(),
        subConcepts,
        keywords: Array.isArray(entry.keywords) ? entry.keywords.filter((item): item is string => typeof item === 'string') : []
      }
    ];
  });
}
