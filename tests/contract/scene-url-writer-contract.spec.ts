import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  createSceneParamWriter,
  resolveUrlSyncKeys,
  resetUrlSyncOwners
} from '../../src/app/url-sync';
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

const WRITE_NAMES = ['writeOwnedSceneParams', 'writeSceneParams'] as const;

function productionWriterFiles(): string[] {
  return [
    ...walkTs(path.join(ROOT, 'src/scenes')),
    path.join(ROOT, 'src/pages/single-loop-integration.ts')
  ];
}

function splitTopLevelArgs(argsSrc: string): string[] {
  const args: string[] = [];
  let depth = 0;
  let start = 0;
  let quote: string | null = null;
  for (let i = 0; i < argsSrc.length; i++) {
    const ch = argsSrc[i];
    if (quote) {
      if (ch === '\\') {
        i += 1;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '(' || ch === '{' || ch === '[') depth += 1;
    else if (ch === ')' || ch === '}' || ch === ']') depth -= 1;
    else if (ch === ',' && depth === 0) {
      args.push(argsSrc.slice(start, i).trim());
      start = i + 1;
    }
  }
  const tail = argsSrc.slice(start).trim();
  if (tail) args.push(tail);
  return args;
}

function findCallArgs(text: string, name: string): string[] {
  const out: string[] = [];
  const needle = `${name}(`;
  let i = 0;
  while (i < text.length) {
    const idx = text.indexOf(needle, i);
    if (idx < 0) break;
    if (idx > 0 && /[\w$]/.test(text[idx - 1] ?? '')) {
      i = idx + needle.length;
      continue;
    }
    let depth = 1;
    let j = idx + needle.length;
    let quote: string | null = null;
    while (j < text.length && depth > 0) {
      const ch = text[j];
      if (quote) {
        if (ch === '\\') {
          j += 2;
          continue;
        }
        if (ch === quote) quote = null;
        j += 1;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === '`') {
        quote = ch;
        j += 1;
        continue;
      }
      if (ch === '(') depth += 1;
      else if (ch === ')') depth -= 1;
      j += 1;
    }
    out.push(text.slice(idx + needle.length, j - 1));
    i = j;
  }
  return out;
}

function objectLiteralKeys(src: string): string[] | null {
  const trimmed = src.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;
  const body = trimmed.slice(1, -1);
  const keys: string[] = [];
  for (const match of body.matchAll(/([A-Za-z_][\w]*)\s*:/g)) {
    keys.push(match[1]);
  }
  return keys;
}

function matchBrackets(text: string, openIdx: number): number {
  const open = text[openIdx];
  const close = open === '(' ? ')' : open === '{' ? '}' : ']';
  let depth = 0;
  for (let i = openIdx; i < text.length; i++) {
    const ch = text[i];
    if (ch === open) depth += 1;
    else if (ch === close) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function skipWs(text: string, i: number): number {
  while (i < text.length && /\s/.test(text[i] ?? '')) i += 1;
  return i;
}

function functionBody(text: string, name: string): string | null {
  const pattern = new RegExp(
    `(?:export\\s+)?(?:async\\s+)?function\\s+${name}\\s*\\(`
  );
  const match = pattern.exec(text);
  if (!match) return null;
  const openParen = match.index + match[0].length - 1;
  const closeParen = matchBrackets(text, openParen);
  if (closeParen < 0) return null;
  let i = skipWs(text, closeParen + 1);
  if (text[i] === ':') {
    i = skipWs(text, i + 1);
    if (text[i] === '{') {
      const endType = matchBrackets(text, i);
      if (endType < 0) return null;
      i = skipWs(text, endType + 1);
    } else {
      while (i < text.length && text[i] !== '{') i += 1;
    }
  }
  if (text[i] !== '{') return null;
  const end = matchBrackets(text, i);
  if (end < 0) return null;
  return text.slice(i, end + 1);
}

function keysFromReturnObject(body: string): string[] | null {
  const idx = body.search(/return\s*\{/);
  if (idx < 0) return null;
  const brace = body.indexOf('{', idx);
  let depth = 0;
  for (let i = brace; i < body.length; i++) {
    const ch = body[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return objectLiteralKeys(body.slice(brace, i + 1)) ?? [];
      }
    }
  }
  return null;
}

function importPathFor(text: string, name: string): string | null {
  const importRe = /import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g;
  for (const match of text.matchAll(importRe)) {
    const names = match[1].split(',').map((part) => {
      const bits = part.trim().split(/\s+as\s+/);
      return (bits[1] ?? bits[0]).trim();
    });
    if (names.includes(name)) return match[2];
  }
  return null;
}

function keysFromBinding(text: string, name: string): string[] | null {
  const decl = new RegExp(
    `(?:const|let)\\s+${name}\\s*=\\s*(\\{[\\s\\S]*?\\})`
  ).exec(text);
  if (!decl) return null;
  return objectLiteralKeys(decl[1]);
}

function resolvePayloadKeys(
  file: string,
  text: string,
  payload: string
): string[] | null {
  const literal = objectLiteralKeys(payload);
  if (literal) return literal;
  const call = /^([A-Za-z_][\w]*)\s*\(/.exec(payload.trim());
  const ident = /^([A-Za-z_][\w]*)$/.exec(payload.trim());
  const name = call?.[1] ?? ident?.[1];
  if (!name) return null;
  const localBody = functionBody(text, name);
  if (localBody) return keysFromReturnObject(localBody);
  const binding = keysFromBinding(text, name);
  if (binding) return binding;
  const spec = importPathFor(text, name);
  if (!spec) return null;
  const imported = path.resolve(path.dirname(file), spec);
  const candidates = [
    imported,
    `${imported}.ts`,
    path.join(imported, 'index.ts')
  ];
  const target = candidates.find((p) => fs.existsSync(p));
  if (!target) return null;
  const importedText = fs.readFileSync(target, 'utf8');
  const importedBody = functionBody(importedText, name);
  if (!importedBody) return null;
  return keysFromReturnObject(importedBody);
}

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
    const files = productionWriterFiles();
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

  it('write payloads (literals and restoredUrlParams/patch/helpers) use keys allowed by scene metadata', () => {
    const metas = metaById();
    const files = productionWriterFiles();
    const violations: string[] = [];
    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8');
      if (!/write(?:Owned)?SceneParams/.test(text)) continue;
      const rel = path.relative(ROOT, file);
      const sceneId =
        rel.startsWith(`src/pages${path.sep}`) &&
        path.basename(file) === 'single-loop-integration.ts'
          ? 'single-loop'
          : path.basename(path.dirname(file));
      const meta = metas.get(sceneId);
      if (!meta) {
        violations.push(`${rel}: no scene meta for ${sceneId}`);
        continue;
      }
      const allowed = resolveUrlSyncKeys(meta);
      for (const name of WRITE_NAMES) {
        const arityOffset = name === 'writeSceneParams' ? 0 : 1;
        for (const argsSrc of findCallArgs(text, name)) {
          const args = splitTopLevelArgs(argsSrc);
          const payload = args[arityOffset];
          if (!payload) {
            violations.push(`${rel}: missing payload in ${name}()`);
            continue;
          }
          const keys = resolvePayloadKeys(file, text, payload);
          if (!keys) {
            violations.push(`${rel}: unresolved payload ${payload.trim()}`);
            continue;
          }
          for (const key of keys) {
            if (!allowed.has(key)) {
              violations.push(`${sceneId}: ${key} via ${payload.trim()}`);
            }
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('never drops known legal keys from a writer allowlist', () => {
    const previous = window.location.href;
    resetUrlSyncOwners();
    try {
      const seen = new Set<SceneMeta>();
      for (const meta of metaById().values()) {
        if (seen.has(meta)) continue;
        seen.add(meta);
        const allowed = resolveUrlSyncKeys(meta);
        const writer = createSceneParamWriter(allowed);
        window.history.replaceState({}, '', '/writer-contract.html');
        const patch: Record<string, string> = {};
        for (const key of allowed) patch[key] = '1';
        patch.__illegal__ = 'drop-me';
        writer.write(patch);
        writer.flush();
        const url = new URL(window.location.href);
        for (const key of allowed) {
          if (key === 'layout' || key === 'theme') continue;
          expect(url.searchParams.get(key), `${meta.id}:${key}`).toBe('1');
        }
        expect(url.searchParams.get('__illegal__')).toBeNull();
        writer.close();
      }
    } finally {
      resetUrlSyncOwners();
      window.history.replaceState({}, '', previous);
    }
  });
});
