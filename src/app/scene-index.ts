import { sceneRegistry, type SceneRegistryEntry } from '../catalog/scene-registry';

export type SceneIndexEntry = Pick<SceneRegistryEntry, 'id' | 'title' | 'path'> & {
  keywords?: string[];
};

export const sceneIndexEntries: SceneIndexEntry[] = sceneRegistry.map((item) => ({
  id: item.id,
  title: item.title,
  path: item.path,
  keywords: item.keywords
}));

export function isSceneIndexEntry(value: unknown): value is SceneIndexEntry {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string' && typeof item.title === 'string' && typeof item.path === 'string';
}

export function normalizeSceneIndex(input: unknown): SceneIndexEntry[] {
  if (!Array.isArray(input)) return [];
  return input.filter(isSceneIndexEntry);
}
