import { toLegacySceneIndexEntries } from './legacy-animation-catalog';

export type SceneIndexEntry = {
  id: string;
  title: string;
  path: string;
  keywords?: string[];
};

export const legacySceneEntries: SceneIndexEntry[] = toLegacySceneIndexEntries();

export function isSceneIndexEntry(value: unknown): value is SceneIndexEntry {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string' && typeof item.title === 'string' && typeof item.path === 'string';
}

export function normalizeSceneIndex(input: unknown): SceneIndexEntry[] {
  if (!Array.isArray(input)) return [];
  return input.filter(isSceneIndexEntry);
}
