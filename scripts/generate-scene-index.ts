import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { sceneRegistry } from '../src/catalog/scene-registry';
import type { SceneIndexEntry } from '../src/app/scene-index';

export function toSceneIndex(items: Array<Pick<SceneIndexEntry, 'id' | 'title' | 'path'> & Partial<SceneIndexEntry>>): SceneIndexEntry[] {
  const map = new Map<string, SceneIndexEntry>();

  for (const item of items) {
    if (!item.id || !item.title || !item.path) continue;
    map.set(item.id, {
      id: item.id,
      title: item.title.trim(),
      path: item.path.trim(),
      keywords: item.keywords ?? []
    });
  }

  return [...map.values()].sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN', { numeric: true, sensitivity: 'base' }));
}

export async function generateSceneIndex(outFile = resolve(process.cwd(), 'public/scene-index.json')): Promise<SceneIndexEntry[]> {
  const generated = toSceneIndex(
    sceneRegistry.map((item) => ({
      id: item.id,
      title: item.title,
      path: item.path,
      keywords: item.keywords
    }))
  );

  await mkdir(dirname(outFile), { recursive: true });
  await writeFile(outFile, JSON.stringify(generated, null, 2), 'utf8');
  return generated;
}

async function maybeRunCli(): Promise<void> {
  const entryArg = process.argv[1];
  if (!entryArg) return;

  const expected = pathToFileURL(resolve(entryArg)).href;
  if (import.meta.url !== expected) return;

  const outFile = process.argv[2] ? resolve(process.cwd(), process.argv[2]) : resolve(process.cwd(), 'public/scene-index.json');
  const result = await generateSceneIndex(outFile);
  console.log(`Generated ${result.length} scene entries -> ${outFile}`);
}

void maybeRunCli();
