/**
 * 控件投影（scene live params → 控制面板静默回写）
 *
 * remount / reset 共用。永不调用 applyAll / applyParam / afterApply、
 * 任何 scene setter 或 scene.render()。
 */

import type { ControlsSchema } from './controls-schema';
import {
  controlKeyOfParam,
  paramToControl,
  type ControlValue,
  type ParamBindings
} from './param-binding';

const VALUE_FIELD_TYPES = new Set<string>([
  'slider',
  'number',
  'text',
  'toggle',
  'select'
]);

const ACTIVE_FIELD_TYPES = new Set<string>(['preset-group', 'scene-selector']);

export type ControlProjectionHandle = {
  fieldTypes?: Map<string, string>;
  /** schema `bind`：参数键/单位 → 控件键/单位 */
  bindings?: ParamBindings;
  setValueSilently?: (key: string, value: number | string | boolean) => void;
  setActiveSilently?: (key: string, id: string) => void;
  syncFromScene?: () => void;
};

/** 投影器只读这两项；applyAll / applyParam / afterApply 即使存在也不调用 */
export type ControlProjectionParamSync = {
  activeKeys?: string[];
  projectControls?: (
    params: Record<string, unknown>,
    ctx: { handle: ControlProjectionHandle }
  ) => void;
};

export type ProjectControlsFromParamsOptions = {
  params: Record<string, unknown>;
  handle: ControlProjectionHandle;
  paramSync?: ControlProjectionParamSync;
};

/**
 * 静态收集 schema 字段键 → 类型。只读 sections[].fields[]，
 * 不展开 button-grid 内嵌按钮键。
 */
export function collectFieldKeys(schema: ControlsSchema): Map<string, string> {
  const keys = new Map<string, string>();
  for (const section of schema.sections) {
    for (const field of section.fields) {
      keys.set(field.key, field.type);
    }
  }
  return keys;
}

/**
 * 按字段类型把 live params 静默投影到控件句柄。
 *
 * 键宇宙 = handle 字段类型表 ∩ params（经 schema `bind` 反查后的控件键，
 * 数值按 bind.scale 换算为控件单位）。
 * 缺静默 setter 的键跳过，不回退事件性 setValue / setActive。
 *
 * @returns 至少投影了一键则为 true；无法投影任何键（缺类型表或静默 setter）为 false。
 */
export function projectControlsFromParams(
  options: ProjectControlsFromParamsOptions
): boolean {
  const { params, handle, paramSync } = options;

  if (paramSync?.projectControls) {
    paramSync.projectControls(params, { handle });
    return true;
  }

  const fieldTypes = resolveFieldTypes(handle);
  if (!fieldTypes || fieldTypes.size === 0) return false;

  const activeKeys = new Set(paramSync?.activeKeys ?? []);
  let projected = 0;

  for (const [paramKey, rawValue] of Object.entries(params)) {
    const controlKey = controlKeyOfParam(paramKey, handle.bindings);
    const value = paramToControl(controlKey, rawValue, handle.bindings);
    const fieldType = fieldTypes.get(controlKey);
    if (fieldType === undefined) continue;

    if (usesActiveSetter(controlKey, fieldType, activeKeys)) {
      if (typeof handle.setActiveSilently !== 'function') continue;
      const id = toActiveId(value);
      if (id === undefined) continue;
      handle.setActiveSilently(controlKey, id);
      projected += 1;
      continue;
    }

    if (!VALUE_FIELD_TYPES.has(fieldType)) continue;
    if (typeof handle.setValueSilently !== 'function') continue;
    if (!isSilentValue(value)) continue;
    handle.setValueSilently(controlKey, value);
    projected += 1;
  }

  return projected > 0;
}

/**
 * remount / reset 共用入口：优先 handle.syncFromScene；
 * 否则通用投影。投影 0 键时不再回退事件性 refresh。
 */
export function syncControlsFromLiveParams(options: {
  params: Record<string, unknown>;
  handle: unknown;
  paramSync?: ControlProjectionParamSync;
}): void {
  const handle = (options.handle ?? {}) as ControlProjectionHandle;
  if (typeof handle.syncFromScene === 'function') {
    handle.syncFromScene();
    return;
  }
  projectControlsFromParams({
    params: options.params,
    handle,
    paramSync: options.paramSync
  });
}

export function paramsFromScene(
  scene: { getParams?(): object } | null | undefined
): Record<string, unknown> {
  const raw = scene?.getParams?.();
  if (raw == null || typeof raw !== 'object') return {};
  return raw as Record<string, unknown>;
}

function resolveFieldTypes(
  handle: ControlProjectionHandle
): Map<string, string> | undefined {
  const types = handle.fieldTypes;
  if (types && types.size > 0) return types;
  return undefined;
}

function usesActiveSetter(
  key: string,
  fieldType: string,
  activeKeys: Set<string>
): boolean {
  return (
    key === 'preset' || activeKeys.has(key) || ACTIVE_FIELD_TYPES.has(fieldType)
  );
}

function isSilentValue(value: unknown): value is number | string | boolean {
  return (
    typeof value === 'number' ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  );
}

function toActiveId(value: unknown): string | undefined {
  // null = 派生参数当前不对应任何选项（如自定义参数下的预设）：清除高亮
  if (value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return undefined;
}

/**
 * 「重置」按钮的标准处理（配合 createBoundControls）：场景复位 → 控件静默
 * 投影（按 schema bind 换算）→ 把复位后的参数写回 URL，使分享链接与画面一致。
 */
export function resetSceneAndControls(
  scene: { reset(): void; getParams(): object },
  handle: ControlProjectionHandle,
  writeParam?: (key: string, value: ControlValue) => void
): void {
  scene.reset();
  const params = scene.getParams() as Record<string, unknown>;
  syncControlsFromLiveParams({ params, handle });
  if (!writeParam) return;
  for (const [paramKey, value] of Object.entries(params)) {
    if (
      typeof value !== 'number' &&
      typeof value !== 'string' &&
      typeof value !== 'boolean'
    ) {
      continue;
    }
    const controlKey = controlKeyOfParam(paramKey, handle.bindings);
    writeParam(controlKey, paramToControl(controlKey, value, handle.bindings));
  }
}
