/**
 * 控件编解码契约（运行时）
 *
 * 对每个场景 schema 的枚举字段（preset-group / scene-selector / select）的
 * 每个选项、以及每个 toggle 的 true/false：经 schema `bind` 编码后
 * `setParams`，再从 `getParams` 解码回控件值，必须得到原值。
 *
 * 这保证平台默认路由（createBoundControls）、URL 恢复与 remount 投影对该
 * 字段都正确——编码只在 schema 声明一次（bind.values / bind.numeric），
 * 不再由 page 手写 decode/encode。字段键不是 sim 参数（纯 UI 状态）时跳过。
 */
import { describe, expect, it } from 'vitest';
import type {
  ControlField,
  ControlsSchema
} from '../../src/platform/controls-schema';
import {
  collectBindings,
  controlToParam,
  paramKeyOf,
  paramToControl
} from '../../src/platform/param-binding';

/** 不走 setParams 的字段（理由必填） */
const NON_PARAM_CODEC: Record<string, string> = {
  'electrification.scene':
    '子场景经 setScene 切换（EXISTING_SPECIAL_HANDLE_FORMS 冻结形态），setParams 不接收 scene'
};

type SceneApi = {
  setParams?: (params: Record<string, unknown>) => unknown;
  getParams?: () => Record<string, unknown>;
  dispose?: () => void;
};

const entryModules = import.meta.glob<Record<string, unknown>>(
  '../../src/scenes/*/scene.entry.ts',
  { eager: true }
);
const schemaModules = import.meta.glob<Record<string, unknown>>(
  '../../src/scenes/*/controls-schema.ts',
  { eager: true }
);

function optionsOf(field: ControlField): Array<string | boolean> | null {
  switch (field.type) {
    case 'preset-group':
      return field.presets.map((preset) => preset.id);
    case 'scene-selector':
      return field.scenes.map((scene) => scene.id);
    case 'select':
      return field.options.map((option) => option.value);
    case 'toggle':
      return [true, false];
    default:
      return null;
  }
}

const cases: Array<{
  id: string;
  create: () => SceneApi;
  schema: ControlsSchema;
}> = [];
for (const [path, mod] of Object.entries(entryModules)) {
  const id = path.split('/').slice(-2, -1)[0];
  const schemaMod = schemaModules[`../../src/scenes/${id}/controls-schema.ts`];
  if (!schemaMod) continue;
  const factory = Object.entries(mod).find(
    ([name, value]) =>
      name.startsWith('create') &&
      name.endsWith('Scene') &&
      typeof value === 'function'
  )?.[1] as ((opts: Record<string, unknown>) => SceneApi) | undefined;
  if (!factory) continue;
  const create = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    return factory({
      canvas,
      theme: 'light',
      mode: 'classroom',
      urlParams: {}
    });
  };
  for (const value of Object.values(schemaMod)) {
    if (value && typeof value === 'object' && 'sections' in value) {
      cases.push({ id, create, schema: value as ControlsSchema });
    }
  }
}

describe('control codec contract', () => {
  it('exemptions are not stale', () => {
    const fieldIds = new Set(
      cases.flatMap(({ id, schema }) =>
        schema.sections.flatMap((s) => s.fields.map((f) => `${id}.${f.key}`))
      )
    );
    for (const key of Object.keys(NON_PARAM_CODEC)) {
      expect(fieldIds.has(key), `${key}: unknown exemption`).toBe(true);
    }
  });

  it.each(cases.map((c, i) => ({ ...c, label: `${c.id}#${i}` })))(
    '$label: enum options and toggles round-trip through the sim',
    ({ id, create, schema }) => {
      const bindings = collectBindings(schema);
      const failures: string[] = [];
      for (const section of schema.sections) {
        for (const field of section.fields) {
          const options = optionsOf(field);
          if (!options || `${id}.${field.key}` in NON_PARAM_CODEC) continue;
          const scene = create();
          try {
            const paramKey = paramKeyOf(field.key, bindings);
            const live = scene.getParams?.();
            if (!scene.setParams || !live || !(paramKey in live)) continue;
            for (const option of options) {
              scene.setParams({
                [paramKey]: controlToParam(field.key, option, bindings)
              });
              const back = paramToControl(
                field.key,
                scene.getParams?.()[paramKey],
                bindings
              );
              const same =
                typeof option === 'boolean'
                  ? Boolean(back) === option
                  : String(back) === option;
              if (!same) {
                failures.push(
                  `${field.key}=${String(option)} → ${JSON.stringify(scene.getParams?.()[paramKey])}`
                );
              }
            }
          } finally {
            scene.dispose?.();
          }
        }
      }
      expect(
        failures,
        `${id}: 在 controls-schema 字段声明 bind.values / bind.numeric 编码`
      ).toEqual([]);
    }
  );
});
