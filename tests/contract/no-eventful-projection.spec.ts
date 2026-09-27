/**
 * NO_EVENTFUL_PROJECTION 棘轮
 *
 * handle 暴露 setValue 就必须同时暴露 setValueSilently 与 fieldTypes
 *（或经 exposeSchemaHandle / return renderer / §1.2(c) 既有形态）。
 * A4 机械批已收口 grandfather；只许空清单，禁止新增。
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const SCENES_DIR = resolve(ROOT, 'src/scenes');
const PAGES_DIR = resolve(ROOT, 'src/pages');

/**
 * 仍无法经 page.ts 字面量判定 silent-ready 的既有形态。
 * A5 收窄为 id→理由映射：electrification 仍无 setValue（button-grid 动作），
 * 但已转发 setActiveSilently，scene-selector 走通用投影；委托工厂
 *（page.ts 不展开静默四件套）单独登记。
 */
const EXISTING_SPECIAL_HANDLE_FORMS: Record<string, string> = {
  electrification:
    'handle 转发 setActiveSilently+fieldTypes；scene-selector 经通用投影回读 live scene；无 setValue（action 为 button-grid）',
  'single-loop':
    'page.ts 委托 src/pages/single-loop-integration.ts（该文件已 silent-ready）',
  'spring-oscillator':
    'imperative 列表重建；page.ts 委托 controls.ts 的 syncFromScene。相位预设卡是 custom DOM，正则扫不到 preset-group'
};

function isSpecialForm(id: string): boolean {
  return Object.hasOwn(EXISTING_SPECIAL_HANDLE_FORMS, id);
}

/** src/pages 无剩余特殊形态；single-loop-integration 已挂 fieldTypes */
const PAGES_SPECIAL_FORMS = new Set<string>();

/** A4 已收口 chase-meet / emf-analogy；禁止再登记 dispose-only 待迁移。 */
const DISPOSE_ONLY_PENDING = [] as const;

/**
 * A4 机械批已清空。只许空清单；新增场景必须 silent-ready。
 */
const EVENTFUL_PROJECTION_GRANDFATHER = [] as const;

const GRANDFATHER_SET = new Set<string>(EVENTFUL_PROJECTION_GRANDFATHER);
const GRANDFATHER_CEILING = 0;

const HANDLE_KEY =
  /^(setValueSilently|setActiveSilently|setValue|setActive|setVisible|fieldTypes|syncFromScene|dispose)\b\s*[:(\s,]/;

const ACTIVE_FIELD_TYPE = /type:\s*['"](?:preset-group|scene-selector)['"]/;

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

function listPageTsFiles(): string[] {
  return readdirSync(PAGES_DIR)
    .filter((name) => name.endsWith('.ts'))
    .map((name) => join(PAGES_DIR, name))
    .sort();
}

function collectHandleKeys(source: string): Set<string> {
  const keys = new Set<string>();
  for (const line of source.split('\n')) {
    const match = line.trim().match(HANDLE_KEY);
    if (match) keys.add(match[1]);
  }
  return keys;
}

function isSilentReady(source: string): boolean {
  if (/\bexposeSchemaHandle\s*\(/.test(source)) return true;
  if (/\breturn\s+renderer\s*;/.test(source)) return true;
  const keys = collectHandleKeys(source);
  return (
    keys.has('setValue') &&
    keys.has('setValueSilently') &&
    keys.has('fieldTypes')
  );
}

function isDisposeOnly(source: string): boolean {
  const keys = collectHandleKeys(source);
  return keys.has('dispose') && !keys.has('setValue') && !keys.has('setActive');
}

describe('NO_EVENTFUL_PROJECTION', () => {
  const sceneIds = listSceneIds();

  it('grandfather is a frozen ceiling over unmigrated scenes (A4 may only shrink)', () => {
    expect(EVENTFUL_PROJECTION_GRANDFATHER.length).toBeLessThanOrEqual(
      GRANDFATHER_CEILING
    );
    expect(GRANDFATHER_SET.size).toBe(EVENTFUL_PROJECTION_GRANDFATHER.length);
    const unknown = EVENTFUL_PROJECTION_GRANDFATHER.filter(
      (id) => !sceneIds.includes(id)
    );
    expect(unknown).toEqual([]);
    const overlap = EVENTFUL_PROJECTION_GRANDFATHER.filter((id) =>
      isSpecialForm(id)
    );
    expect(overlap).toEqual([]);
    for (const [id, reason] of Object.entries(EXISTING_SPECIAL_HANDLE_FORMS)) {
      expect(sceneIds.includes(id), `${id}: unknown special-form id`).toBe(
        true
      );
      expect(
        reason.trim().length,
        `${id}: special-form reason must be non-empty`
      ).toBeGreaterThan(10);
    }
  });

  it('dispose-only pending list is closed after A4', () => {
    expect(DISPOSE_ONLY_PENDING).toEqual([]);
    const leftover: string[] = [];
    for (const id of sceneIds) {
      if (isSpecialForm(id)) continue;
      const source = readFileSync(join(SCENES_DIR, id, 'page.ts'), 'utf8');
      if (isSilentReady(source)) continue;
      if (isDisposeOnly(source)) leftover.push(id);
    }
    expect(leftover).toEqual([]);
  });

  it('every scene page is grandfather, special-form, or silent-ready with fieldTypes', () => {
    const unclassified: string[] = [];
    const staleGrandfather: string[] = [];
    for (const id of sceneIds) {
      const source = readFileSync(join(SCENES_DIR, id, 'page.ts'), 'utf8');
      const silentReady = isSilentReady(source);
      const grandfathered = GRANDFATHER_SET.has(id);
      const special = isSpecialForm(id);
      if (silentReady && grandfathered) {
        staleGrandfather.push(id);
        continue;
      }
      if (silentReady || grandfathered || special) continue;
      unclassified.push(id);
    }
    expect(staleGrandfather).toEqual([]);
    expect(unclassified).toEqual([]);
  });

  it('new scenes must not join the grandfather list', () => {
    const missingFromPartition = sceneIds.filter(
      (id) => !GRANDFATHER_SET.has(id) && !isSpecialForm(id)
    );
    for (const id of missingFromPartition) {
      const source = readFileSync(join(SCENES_DIR, id, 'page.ts'), 'utf8');
      expect(
        isSilentReady(source),
        `${id}: use exposeSchemaHandle / return renderer / setValue+setValueSilently+fieldTypes; do not add to EVENTFUL_PROJECTION_GRANDFATHER`
      ).toBe(true);
    }
  });

  it('src/pages/*.ts handles expose silent setters and fieldTypes, or are listed', () => {
    const stalePages: string[] = [];
    const unclassified: string[] = [];
    for (const file of listPageTsFiles()) {
      const rel = relative(ROOT, file).replaceAll('\\', '/');
      const source = readFileSync(file, 'utf8');
      const silentReady = isSilentReady(source);
      const special = PAGES_SPECIAL_FORMS.has(rel);
      if (silentReady && special) {
        stalePages.push(rel);
        continue;
      }
      if (silentReady || special) continue;
      const keys = collectHandleKeys(source);
      if (!keys.has('setValue') && !/\bexposeSchemaHandle\s*\(/.test(source)) {
        continue;
      }
      unclassified.push(rel);
    }
    expect(stalePages).toEqual([]);
    expect(unclassified).toEqual([]);
  });

  it('exposeSchemaHandle transcludes fieldTypes by reference', () => {
    const source = readFileSync(
      resolve(ROOT, 'src/ui/components/expose-schema-handle.ts'),
      'utf8'
    );
    expect(source).toMatch(/fieldTypes:\s*renderer\.fieldTypes/);
    expect(source).not.toMatch(/new Map\s*\(\s*renderer\.fieldTypes/);
  });

  it('preset-group/scene-selector schemas expose setActiveSilently', () => {
    const missing: string[] = [];
    for (const id of sceneIds) {
      if (isSpecialForm(id)) continue;
      const schemaFiles = ['controls-schema.ts', 'controls.ts'].map((name) =>
        join(SCENES_DIR, id, name)
      );
      const hasActiveField = schemaFiles.some((file) => {
        try {
          return ACTIVE_FIELD_TYPE.test(readFileSync(file, 'utf8'));
        } catch {
          return false;
        }
      });
      if (!hasActiveField) continue;
      const source = readFileSync(join(SCENES_DIR, id, 'page.ts'), 'utf8');
      const keys = collectHandleKeys(source);
      const ready =
        /\bexposeSchemaHandle\s*\(/.test(source) ||
        /\breturn\s+renderer\s*;/.test(source) ||
        keys.has('setActiveSilently');
      if (!ready) missing.push(id);
    }
    expect(missing).toEqual([]);
  });
});
