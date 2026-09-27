/**
 * NO_CONTROL_PROJECTION 棘轮
 *
 * remount/reset 必须能把 live scene 投影回控件。每个场景要么：
 *   (a) entry 暴露 getParams 实现（类型声明不算），且 handle 有 fieldTypes
 *       （exposeSchemaHandle / return renderer / fieldTypes 字面量）或
 *       syncFromScene；getParams 返回键 ∩ handle fieldTypes ≠ ∅
 *       （syncFromScene 场景与豁免场景除外）
 *   (b) 登记在豁免清单——当前仅 emf-analogy：defaultParams 为空，无可投影
 *       参数。schema 仍有 tap/speed 等非 defaultParams 控件，不是零控件。
 *
 * 与 NO_EVENTFUL_PROJECTION 并存。tier-1 已有 syncFromScene 的场景
 *（doppler-effect / mechanical-wave / double-slit）不强制补 getParams。
 * electrification 经 getParams.scene ∩ scene-selector 投影，不是空投影。
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const SCENES_DIR = resolve(ROOT, 'src/scenes');

/**
 * 无可投影 defaultParams 的场景。不进 NO_PARAMS_API 以外的投影管线。
 * 禁止把「有取值控件但缺 getParams」的场景登记进来。
 */
const NO_CONTROL_PROJECTION: Record<string, string> = {
  'emf-analogy':
    'defaultParams 为空，无可投影参数；仍有 tap/speed 控件，走专用 setter（setTapOpening / 播放速度 UI），不走 defaultParams 投影'
};

/**
 * getParams 存在但返回键与 schema 字段无交集：通用投影空转。
 * 裁定见 AGENTS.md 已知限制。禁止把「有可投影键却漏写」的场景登记进来。
 */
const EMPTY_KEY_INTERSECTION_BY_RULING: Record<string, string> = {
  'xt-graph':
    'getParams 仅 {speed}，schema 只有 preset/about；preset 高亮由 URL applyParam/首绘负责',
  'tortoise-hare':
    'getParams 仅 {speed}，schema 只有 preset/about；preset 高亮由 URL applyParam/首绘负责'
};

function listSceneIds(): string[] {
  return readdirSync(SCENES_DIR)
    .filter((name) => statSync(join(SCENES_DIR, name)).isDirectory())
    .filter((name) => {
      try {
        return statSync(join(SCENES_DIR, name, 'page.ts')).isFile();
      } catch {
        return false;
      }
    })
    .sort();
}

function readSceneFile(id: string, name: string): string | null {
  try {
    return readFileSync(join(SCENES_DIR, id, name), 'utf8');
  } catch {
    return null;
  }
}

/**
 * entry 工厂返回值上的 getParams 实现，不含类型声明。
 * 判据：含 getParams 的行以 `{` 结尾，或 `getParams:` 后接箭头/函数。
 */
function entryExposesGetParams(source: string): boolean {
  for (const line of source.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
    if (!/\bgetParams\b/.test(trimmed)) continue;
    if (trimmed.endsWith('{')) return true;
    if (
      /\bgetParams\s*:\s*(?:async\s*)?(?:function\b|\([^)]*\)[\s\S]*=>)/.test(
        trimmed
      )
    ) {
      return true;
    }
  }
  return false;
}

const SCHEMA_FIELD_TYPES = new Set([
  'slider',
  'number',
  'text',
  'select',
  'button',
  'toggle',
  'preset-group',
  'transport',
  'scene-selector',
  'button-grid',
  'hint',
  'custom'
]);

function collectSchemaFieldKeys(source: string): Set<string> {
  const keys = new Set<string>();
  if (!source) return keys;
  for (const block of source.split('{').slice(1)) {
    const typeMatch = block.match(/\btype:\s*['"]([\w-]+)['"]/);
    const keyMatch = block.match(/\bkey:\s*['"]([^'"]+)['"]/);
    if (typeMatch && keyMatch && SCHEMA_FIELD_TYPES.has(typeMatch[1])) {
      keys.add(keyMatch[1]);
    }
  }
  return keys;
}

function extractObjectTypeKeys(block: string): string[] {
  const keys: string[] = [];
  for (const part of block.split(/[;\n,]/)) {
    const match = part.match(/^\s*(?:readonly\s+)?([A-Za-z_][\w]*)\s*[?:]/);
    if (match) keys.push(match[1]);
  }
  return keys;
}

function lookupNamedTypeKeys(sources: string[], name: string): string[] {
  const keys: string[] = [];
  const re = new RegExp(
    `(?:export\\s+)?(?:type|interface)\\s+${name}\\s*(?:=\\s*)?\\{([^}]+)\\}`
  );
  for (const src of sources) {
    const match = src.match(re);
    if (match) keys.push(...extractObjectTypeKeys(match[1]));
  }
  return keys;
}

function collectGetParamsKeys(entry: string, sim: string): Set<string> {
  const keys = new Set<string>();
  const sources = [entry, sim];

  for (const match of entry.matchAll(
    /\bgetParams\s*(?::\s*\([^)]*\)|\([^)]*\))\s*:\s*([A-Z][A-Za-z0-9_]*)/g
  )) {
    for (const key of lookupNamedTypeKeys(sources, match[1])) keys.add(key);
  }

  for (const match of entry.matchAll(
    /\bgetParams\s*(?::\s*\([^)]*\)|\([^)]*\))\s*:\s*\{([^}]+)\}/g
  )) {
    for (const key of extractObjectTypeKeys(match[1])) keys.add(key);
  }

  for (const match of entry.matchAll(
    /\bgetParams[\s\S]{0,200}?&\s*\{([^}]+)\}/g
  )) {
    for (const key of extractObjectTypeKeys(match[1])) keys.add(key);
  }

  for (const match of entry.matchAll(
    /\bgetParams\b[\s\S]{0,800}?return\s*\{([^}]+)\}/g
  )) {
    for (const part of match[1].split(',')) {
      const keyMatch = part.match(/^\s*([A-Za-z_][\w]*)\s*:/);
      if (keyMatch) keys.add(keyMatch[1]);
    }
  }

  for (const match of entry.matchAll(
    /\bgetParams\s*:[^;]*=>\s*\(?\{([^}]+)\}/g
  )) {
    for (const part of match[1].split(',')) {
      const keyMatch = part.match(/^\s*([A-Za-z_][\w]*)\s*:/);
      if (keyMatch) keys.add(keyMatch[1]);
    }
  }

  if (/sim\.getParams\s*\(/.test(entry) || /getState\(\)\.params/.test(entry)) {
    const paramsType = sim.match(/export type (\w+Params)\s*=\s*\{/);
    if (paramsType) {
      for (const key of lookupNamedTypeKeys([sim], paramsType[1])) {
        keys.add(key);
      }
    }
    const simGet = sim.match(
      /\bgetParams\s*\([^)]*\)\s*:\s*([A-Z][A-Za-z0-9_]*)/
    );
    if (simGet) {
      for (const key of lookupNamedTypeKeys([sim], simGet[1])) keys.add(key);
    }
  }

  return keys;
}

function collectParamMap(page: string): Map<string, string> {
  const map = new Map<string, string>();
  const inline = page.match(/paramMap\s*:\s*\{([^}]+)\}/);
  let body = inline?.[1];
  if (!body) {
    const ident = page.match(/paramMap\s*:\s*([A-Za-z_][\w]*)/);
    if (ident) {
      const re = new RegExp(
        `(?:const|let)\\s+${ident[1]}[^=]*=\\s*\\{([^}]+)\\}`
      );
      body = page.match(re)?.[1];
    }
  }
  if (!body) return map;
  for (const match of body.matchAll(
    /['"]?([A-Za-z_][\w]*)['"]?\s*:\s*['"]([^'"]+)['"]/g
  )) {
    map.set(match[1], match[2]);
  }
  return map;
}

function mappedControlKeys(
  paramKeys: Set<string>,
  paramMap: Map<string, string>
): Set<string> {
  const reverse = new Map<string, string>();
  for (const [controlKey, simKey] of paramMap) {
    reverse.set(simKey, controlKey);
  }
  const mapped = new Set<string>();
  for (const key of paramKeys) {
    mapped.add(reverse.get(key) ?? key);
  }
  return mapped;
}

function handleCanReceiveProjection(sources: string[]): boolean {
  const source = sources.filter(Boolean).join('\n');
  if (/\bexposeSchemaHandle\s*\(/.test(source)) return true;
  if (/\breturn\s+renderer\s*;/.test(source)) return true;
  if (/\bfieldTypes\b/.test(source)) return true;
  if (/\bsyncFromScene\b/.test(source)) return true;
  return false;
}

function handleHasSyncFromScene(sources: string[]): boolean {
  return sources.some((source) => /\bsyncFromScene\b/.test(source));
}

/** page.ts 委托到 src/pages 的工厂时，把被调文件纳入 handle 扫描。 */
const EXTRA_HANDLE_FILES: Record<string, string> = {
  'single-loop': 'src/pages/single-loop-integration.ts'
};

describe('NO_CONTROL_PROJECTION', () => {
  const sceneIds = listSceneIds();

  it('exemption list is emf-analogy only, with a reason', () => {
    expect(Object.keys(NO_CONTROL_PROJECTION)).toEqual(['emf-analogy']);
    const reason = NO_CONTROL_PROJECTION['emf-analogy'];
    expect(reason).toMatch(/defaultParams 为空/);
    expect(reason).toMatch(/tap\/speed/);
  });

  it('exempted ids exist and are not stale', () => {
    for (const id of Object.keys(NO_CONTROL_PROJECTION)) {
      expect(sceneIds.includes(id), `${id}: unknown exemption`).toBe(true);
    }
  });

  it('every scene can project on remount, or is listed with a reason', () => {
    const unclassified: string[] = [];
    const staleExemption: string[] = [];
    for (const id of sceneIds) {
      const entry = readSceneFile(id, 'scene.entry.ts') ?? '';
      const page = readSceneFile(id, 'page.ts') ?? '';
      const controls = readSceneFile(id, 'controls.ts') ?? '';
      const extraPath = EXTRA_HANDLE_FILES[id];
      const extra = extraPath
        ? readFileSync(join(ROOT, extraPath), 'utf8')
        : '';
      const handleSources = [page, controls, extra];
      const hasGetParams = entryExposesGetParams(entry);
      const handleReady = handleCanReceiveProjection(handleSources);
      const hasSync = handleHasSyncFromScene(handleSources);
      const exempt = Object.hasOwn(NO_CONTROL_PROJECTION, id);
      const projects = (hasGetParams && handleReady) || hasSync;
      if (exempt && projects && hasGetParams) {
        staleExemption.push(id);
        continue;
      }
      if (exempt || projects) continue;
      unclassified.push(id);
    }
    expect(
      staleExemption,
      'exemption is stale: scene now exposes getParams; remove from NO_CONTROL_PROJECTION'
    ).toEqual([]);
    expect(
      unclassified,
      `missing getParams+handle projection (or syncFromScene). ` +
        `Add entry getParams, or register in NO_CONTROL_PROJECTION with a reason: ` +
        unclassified.join(', ')
    ).toEqual([]);
  });

  it('entryExposesGetParams matches implementation form, not type declarations', () => {
    expect(entryExposesGetParams('getParams(): Foo;')).toBe(false);
    expect(entryExposesGetParams('getParams(): ResolvedChaseMeetParams;')).toBe(
      false
    );
    expect(entryExposesGetParams('getParams(): Foo {')).toBe(true);
    expect(
      entryExposesGetParams('getParams(): { n: number; q1: number } {')
    ).toBe(true);
    expect(entryExposesGetParams('getParams: () => sim.getParams(),')).toBe(
      true
    );
    expect(
      entryExposesGetParams(
        'getParams: (): AccelForceParams => sim.getParams(),'
      )
    ).toBe(true);
  });

  it('empty-intersection ruling list is frozen with reasons', () => {
    expect(Object.keys(EMPTY_KEY_INTERSECTION_BY_RULING).sort()).toEqual([
      'tortoise-hare',
      'xt-graph'
    ]);
    for (const [id, reason] of Object.entries(
      EMPTY_KEY_INTERSECTION_BY_RULING
    )) {
      expect(sceneIds.includes(id), `${id}: unknown ruling id`).toBe(true);
      expect(reason.trim().length).toBeGreaterThan(10);
    }
  });

  it('getParams keys intersect handle fieldTypes, except sync/exempt/ruling', () => {
    const empty: string[] = [];
    const staleRuling: string[] = [];
    const missingKeys: string[] = [];
    for (const id of sceneIds) {
      if (Object.hasOwn(NO_CONTROL_PROJECTION, id)) continue;
      const entry = readSceneFile(id, 'scene.entry.ts') ?? '';
      const page = readSceneFile(id, 'page.ts') ?? '';
      const controls = readSceneFile(id, 'controls.ts') ?? '';
      const schema = readSceneFile(id, 'controls-schema.ts') ?? '';
      const sim = readSceneFile(id, 'scene.sim.ts') ?? '';
      const extraPath = EXTRA_HANDLE_FILES[id];
      const extra = extraPath
        ? readFileSync(join(ROOT, extraPath), 'utf8')
        : '';
      const handleSources = [page, controls, extra];
      if (handleHasSyncFromScene(handleSources)) continue;
      if (!entryExposesGetParams(entry)) continue;

      const paramKeys = collectGetParamsKeys(entry, sim);
      const fieldKeys = collectSchemaFieldKeys(schema + '\n' + controls);
      const mapped = mappedControlKeys(paramKeys, collectParamMap(page));
      const inter = [...mapped].filter((key) => fieldKeys.has(key));
      const ruled = Object.hasOwn(EMPTY_KEY_INTERSECTION_BY_RULING, id);

      if (paramKeys.size === 0) {
        missingKeys.push(id);
        continue;
      }
      if (ruled && inter.length > 0) {
        staleRuling.push(id);
        continue;
      }
      if (ruled) continue;
      if (inter.length === 0) empty.push(id);
    }
    expect(
      missingKeys,
      'could not extract getParams keys; tighten collector or add a named type'
    ).toEqual([]);
    expect(
      staleRuling,
      'empty-intersection ruling is stale: keys now overlap fieldTypes'
    ).toEqual([]);
    expect(
      empty,
      `getParams keys ∩ fieldTypes is empty. Add overlapping keys, ` +
        `or register in EMPTY_KEY_INTERSECTION_BY_RULING with a reason: ` +
        empty.join(', ')
    ).toEqual([]);
  });
});
