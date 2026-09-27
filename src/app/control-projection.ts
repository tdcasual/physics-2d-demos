/**
 * 控件投影（scene live params → 控制面板静默回写）
 *
 * remount / reset 共用。永不调用 applyAll / applyParam / afterApply、
 * 任何 scene setter 或 scene.render()。
 */

import type { ControlsSchema } from '../platform/controls-schema';

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
  schema?: ControlsSchema;
  setValueSilently?: (key: string, value: number | string | boolean) => void;
  setActiveSilently?: (key: string, id: string) => void;
  syncFromScene?: () => void;
  refresh?: () => void;
};

/** 投影器只读这三项；applyAll / applyParam / afterApply 即使存在也不调用 */
export type ControlProjectionParamSync = {
  paramMap?: Record<string, string>;
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
 * 键宇宙 = handle 字段类型表 ∩ params（经 paramMap 反查后的控件键）。
 * 缺静默 setter 的键跳过，不回退事件性 setValue / setActive。
 *
 * @returns 至少投影了一键则为 true；无法投影任何键（缺类型表或静默 setter）为 false，
 *   调用方可回退 handle.refresh（TODO(A4) 退役该回退）。
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

  const reverseMap = invertParamMap(paramSync?.paramMap);
  const activeKeys = new Set(paramSync?.activeKeys ?? []);
  let projected = 0;

  for (const [paramKey, value] of Object.entries(params)) {
    const controlKey = reverseMap.get(paramKey) ?? paramKey;
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
 * 否则通用投影；投影 0 键时回退 handle.refresh。
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
  const projected = projectControlsFromParams({
    params: options.params,
    handle,
    paramSync: options.paramSync
  });
  if (!projected) {
    // TODO(A4): ②③ 场景迁移后退役 handle.refresh
    handle.refresh?.();
  }
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
  if (handle.fieldTypes) {
    return handle.fieldTypes.size > 0 ? handle.fieldTypes : undefined;
  }
  if (handle.schema) {
    const keys = collectFieldKeys(handle.schema);
    return keys.size > 0 ? keys : undefined;
  }
  return undefined;
}

/**
 * paramMap 为控件键 → sim 键。反查得到 sim 键 → 控件键。
 * 非单射时丢弃反查（调用方应走 paramSync.projectControls）。
 */
function invertParamMap(
  paramMap: Record<string, string> | undefined
): Map<string, string> {
  const reverse = new Map<string, string>();
  if (!paramMap) return reverse;
  const seenSimKeys = new Set<string>();
  for (const [controlKey, simKey] of Object.entries(paramMap)) {
    if (seenSimKeys.has(simKey)) return new Map();
    seenSimKeys.add(simKey);
    reverse.set(simKey, controlKey);
  }
  return reverse;
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
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return undefined;
}
