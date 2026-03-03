import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { sceneRegistry } from '../src/catalog/scene-registry';

type FallbackEntry = {
  id: string;
  title: string;
  path: string;
};

export function toFallbackScript(entries: FallbackEntry[]): string {
  return `window.__SCENE_FALLBACK__ = ${JSON.stringify(entries)};\n`;
}

export async function generateNavFallback(outFile = resolve(process.cwd(), 'public/scene-fallback.js')): Promise<FallbackEntry[]> {
  const entries = sceneRegistry.map((item) => ({
    id: item.id,
    title: item.title,
    path: item.path
  }));

  await mkdir(dirname(outFile), { recursive: true });
  await writeFile(outFile, toFallbackScript(entries), 'utf8');
  return entries;
}

async function maybeRunCli(): Promise<void> {
  const entryArg = process.argv[1];
  if (!entryArg) return;

  const expected = pathToFileURL(resolve(entryArg)).href;
  if (import.meta.url !== expected) return;

  const outFile = process.argv[2] ? resolve(process.cwd(), process.argv[2]) : resolve(process.cwd(), 'public/scene-fallback.js');
  const result = await generateNavFallback(outFile);
  console.log(`Generated ${result.length} fallback entries -> ${outFile}`);
}

void maybeRunCli();
