/**
 * NO_CONTROL_PROJECTION 棘轮
 *
 * remount/reset 必须能把 live scene 投影回控件。每个场景要么：
 *   (a) entry 暴露 getParams，且 handle 有 fieldTypes（exposeSchemaHandle /
 *       return renderer / fieldTypes 字面量）或 syncFromScene
 *   (b) 登记在豁免清单——当前仅 emf-analogy：defaultParams 为空，无可投影
 *       参数。schema 仍有 tap/speed 等非 defaultParams 控件，不是零控件。
 *
 * 与 NO_EVENTFUL_PROJECTION 并存。tier-1 已有 syncFromScene 的场景
 *（doppler-effect / mechanical-wave / double-slit）不强制补 getParams。
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

/** entry 工厂返回值上的 getParams，不含 sim.getParams() 内部调用。 */
function entryExposesGetParams(source: string): boolean {
  return /\bgetParams\s*(?:\([^)]*\)\s*[:{]|:)/.test(source);
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
});
