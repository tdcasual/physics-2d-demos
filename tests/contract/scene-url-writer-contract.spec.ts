import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { resolveUrlSyncKeys } from '../../src/app/url-sync';
import type { SceneMeta } from '../../src/platform/scene-contract';

const ROOT = path.resolve(__dirname, '../..');

function walkTs(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkTs(full));
    else if (entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

const OBJECT_LITERAL = /write(?:Owned)?SceneParams\(\s*\{([^}]*)\}\s*\)/gs;

const metaModules = import.meta.glob('../../src/scenes/*/scene.meta.ts', {
  eager: true
}) as Record<string, Record<string, unknown>>;

function metaById(): Map<string, SceneMeta> {
  const map = new Map<string, SceneMeta>();
  for (const [file, mod] of Object.entries(metaModules)) {
    const key = Object.keys(mod).find((k) => k.endsWith('Meta'));
    if (!key) continue;
    const meta = mod[key] as SceneMeta;
    map.set(meta.id, meta);
    map.set(path.basename(path.dirname(file)), meta);
  }
  return map;
}

describe('scene URL writer contract', () => {
  it('production scene writers go through sceneWriter or writeOwnedSceneParams', () => {
    const files = [
      ...walkTs(path.join(ROOT, 'src/scenes')),
      path.join(ROOT, 'src/pages/single-loop-integration.ts')
    ];
    const missing: string[] = [];
    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8');
      if (
        !/\bwriteSceneParams\s*\(/.test(text) &&
        !/\bwriteOwnedSceneParams\s*\(/.test(text)
      ) {
        continue;
      }
      const usesOwner =
        text.includes('writeOwnedSceneParams') || text.includes('sceneWriter');
      if (!usesOwner) missing.push(path.relative(ROOT, file));
    }
    expect(missing).toEqual([]);
  });

  it('literal write payloads use keys allowed by scene metadata', () => {
    const metas = metaById();
    const files = walkTs(path.join(ROOT, 'src/scenes'));
    const violations: string[] = [];
    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8');
      if (!/write(?:Owned)?SceneParams/.test(text)) continue;
      const sceneId = path.basename(path.dirname(file));
      const meta = metas.get(sceneId);
      if (!meta) continue;
      const allowed = resolveUrlSyncKeys(meta);
      for (const match of text.matchAll(OBJECT_LITERAL)) {
        const body = match[1];
        for (const keyMatch of body.matchAll(/([A-Za-z_][\w]*)\s*:/g)) {
          const key = keyMatch[1];
          if (!allowed.has(key)) violations.push(`${sceneId}: ${key}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
