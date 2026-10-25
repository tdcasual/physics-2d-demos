/**
 * URL 参数同步模块
 *
 * Owner-scoped pending patches + per-owner debounce. Different keys merge,
 * same key last-write-wins, deletes use an explicit sentinel. flush(A) never
 * cancels B. Restore-once lives on SceneAdapter; this module only reads/writes.
 */

import type { SceneMeta } from '../platform/scene-contract';
import { asBoolean } from '../core/coerce';
import {
  paramKeyOf,
  paramToControl,
  type ParamBindings
} from '../platform/param-binding';
import type {
  ParamSyncContext,
  SceneInstance,
  SceneParamSync,
  SceneParamWriter
} from './scene-bootstrapper-types';

export type { SceneParamWriter };

export const URL_PARAM_DELETE = Symbol('url-param-delete');
export type UrlParamValue = number | string | boolean | undefined;
export type UrlParamPatch = Record<string, UrlParamValue>;

const DELETE_SENTINEL = URL_PARAM_DELETE;
type StoredValue = string | typeof DELETE_SENTINEL;

export function resolveUrlSyncKeys(meta: SceneMeta): Set<string> {
  return new Set([
    ...Object.keys(meta.defaultParams),
    ...(meta.urlSyncKeys ?? []),
    'preset'
  ]);
}

// 十进制数（可带小数与指数）。拒绝十六进制、Infinity、空串等 Number() 会
// 接受或产生 NaN 的写法。
const DECIMAL_NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

/** 数值型 URL 参数：仅接受有限十进制数，否则返回 null（调用方丢弃该键）。 */
export function parseNumericUrlParam(raw: string): number | null {
  const text = raw.trim();
  if (!DECIMAL_NUMBER.test(text)) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

export function readSceneParams(
  meta: SceneMeta
): Record<string, number | string> {
  const params = new URLSearchParams(window.location.search);
  const result: Record<string, number | string> = {};
  const allowedKeys = new Set([
    ...Object.keys(meta.defaultParams),
    ...(meta.urlSyncKeys ?? [])
  ]);

  for (const [key, value] of params) {
    if (allowedKeys.has(key)) {
      const defaultVal = meta.defaultParams[key];
      if (typeof defaultVal === 'number') {
        // 非法数值（?k=abc、?k=、?k=Infinity）丢弃，场景保持默认值；
        // NaN 一旦进入 setParams，多数场景会把它存下来并画出 NaN 读数。
        const parsed = parseNumericUrlParam(value);
        if (parsed !== null) result[key] = parsed;
      } else {
        result[key] = value;
      }
    } else if (key === 'preset') {
      result[key] = value;
    }
  }

  return result;
}

const PARAMS_KEY_PREFIX = 'physics-demos-params-';
const PRESERVED_QUERY_KEYS = new Set(['layout', 'theme']);

type OwnerRecord = {
  token: string;
  timer: number | null;
  patch: Map<string, StoredValue>;
  closed: boolean;
  allowedKeys: Set<string> | null;
};

const owners = new Map<string, OwnerRecord>();
let ownerSeq = 0;

function storeValue(v: UrlParamValue): StoredValue | null {
  if (v === undefined || v === null || v === '') return DELETE_SENTINEL;
  // 布尔一律写 1/0：toggle 对应的 defaultParams 是数值，'true' 会被
  // readSceneParams 当作非法数值丢弃（此前更会解析成 NaN 而判假）。
  if (typeof v === 'boolean') return v ? '1' : '0';
  return String(v);
}

function applyStoredToUrl(
  url: URL,
  patch: Map<string, StoredValue>,
  allowedKeys: Set<string> | null
): void {
  patch.forEach((value, key) => {
    if (allowedKeys && !allowedKeys.has(key)) return;
    if (PRESERVED_QUERY_KEYS.has(key)) return;
    if (typeof value !== 'string') url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  });
}

function flushOwner(record: OwnerRecord): void {
  if (record.timer != null) {
    clearTimeout(record.timer);
    record.timer = null;
  }
  if (record.patch.size === 0) return;
  const url = new URL(window.location.href);
  applyStoredToUrl(url, record.patch, record.allowedKeys);
  window.history.replaceState({}, '', url);
  record.patch.clear();
}

export function createSceneParamWriter(
  allowedKeys?: Iterable<string>
): SceneParamWriter {
  const token = `url-owner-${++ownerSeq}`;
  const record: OwnerRecord = {
    token,
    timer: null,
    patch: new Map(),
    closed: false,
    allowedKeys: allowedKeys ? new Set(allowedKeys) : null
  };
  owners.set(token, record);

  return {
    token,
    write(patch: UrlParamPatch) {
      if (record.closed) return;
      Object.entries(patch).forEach(([key, value]) => {
        // Illegal keys drop silently. Known legal keys must land in the
        // pending patch — scene-url-writer-contract asserts zero loss.
        if (record.allowedKeys && !record.allowedKeys.has(key)) return;
        const stored = storeValue(value);
        if (stored == null) return;
        record.patch.set(key, stored);
      });
      if (record.timer != null) clearTimeout(record.timer);
      record.timer = window.setTimeout(() => {
        record.timer = null;
        flushOwner(record);
      }, 150);
    },
    flush() {
      if (record.closed && record.patch.size === 0) return;
      flushOwner(record);
    },
    close() {
      flushOwner(record);
      record.closed = true;
      owners.delete(token);
    }
  };
}

/** Test helper: drop all owner timers/patches. */
export function resetUrlSyncOwners(): void {
  owners.forEach((record) => {
    if (record.timer != null) clearTimeout(record.timer);
  });
  owners.clear();
}

export function persistSceneParams(sceneId: string): void {
  owners.forEach((record) => {
    if (!record.closed) flushOwner(record);
  });
  const url = new URL(window.location.href);
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  // 存储不可用（隐私模式、iframe 第三方存储被拦截、配额满）时只放弃镜像：
  // 调用方 unmount 在其后还要 dispose 场景，不能被异常打断。
  try {
    if (Object.keys(params).length > 0) {
      localStorage.setItem(
        `${PARAMS_KEY_PREFIX}${sceneId}`,
        JSON.stringify(params)
      );
    } else {
      localStorage.removeItem(`${PARAMS_KEY_PREFIX}${sceneId}`);
    }
  } catch {
    // ignore unavailable storage
  }
}

export function restoreSceneParams(meta: SceneMeta): void {
  const url = new URL(window.location.href);
  if (url.searchParams.toString()) return;

  try {
    // getItem 在存储被禁用时会抛 SecurityError，须与解析一起兜住，
    // 否则场景启动（bootScenePage）整体失败。
    const raw = localStorage.getItem(`${PARAMS_KEY_PREFIX}${meta.id}`);
    if (!raw) return;
    const params = JSON.parse(raw) as Record<string, string>;
    const allowed = resolveUrlSyncKeys(meta);
    Object.entries(params).forEach(([k, v]) => {
      if (allowed.has(k)) url.searchParams.set(k, v);
    });
    window.history.replaceState({}, '', url);
  } catch {
    // ignore corrupt or unavailable storage
  }
}

function ensureOwner(
  token: string,
  allowedKeys: Set<string> | null
): OwnerRecord {
  let record = owners.get(token);
  if (!record || record.closed) {
    record = {
      token,
      timer: null,
      patch: new Map(),
      closed: false,
      allowedKeys
    };
    owners.set(token, record);
  }
  return record;
}

function writeToOwner(record: OwnerRecord, patch: UrlParamPatch): void {
  if (record.closed) return;
  Object.entries(patch).forEach(([key, value]) => {
    if (record.allowedKeys && !record.allowedKeys.has(key)) return;
    const stored = storeValue(value);
    if (stored == null) return;
    record.patch.set(key, stored);
  });
  if (record.timer != null) clearTimeout(record.timer);
  record.timer = window.setTimeout(() => {
    record.timer = null;
    flushOwner(record);
  }, 150);
}

let activeWriter: SceneParamWriter | null = null;

/** Bind the current scene-generation writer so legacy writeSceneParams join it. */
export function bindActiveSceneWriter(
  writer: SceneParamWriter | null
): () => void {
  activeWriter = writer;
  return () => {
    if (activeWriter === writer) activeWriter = null;
  };
}

/**
 * Legacy write: joins the bound scene-generation writer when one is
 * active, otherwise a process-wide `legacy` owner. Production scene
 * pages must use `writeOwnedSceneParams` (scene-url-writer-contract).
 * Kept because unit tests bind a writer via `bindActiveSceneWriter` and
 * assert this helper; removing it would rewrite those tests without
 * changing production behavior.
 */
export function writeSceneParams(params: UrlParamPatch): void {
  if (activeWriter) {
    activeWriter.write(params);
    return;
  }
  writeToOwner(ensureOwner('legacy', null), params);
}

/** Production writes must use the injected scene-generation writer. */
export function writeOwnedSceneParams(
  writer: SceneParamWriter | null | undefined,
  params: UrlParamPatch
): void {
  if (!writer) {
    throw new Error('writeOwnedSceneParams requires a scene-generation writer');
  }
  writer.write(params);
}

export function flushSceneParams(): void {
  owners.forEach((record) => flushOwner(record));
}

/**
 * 按字段类型归一 URL 值（无 bind.values 编码时）：toggle → 布尔；
 * slider / number 收到字符串（仅列在 urlSyncKeys 的键）→ 有限数，非法返回 null。
 */
function coerceUrlValue(
  value: number | string,
  fieldType: string | undefined,
  hasCodec: boolean
): number | string | boolean | null {
  if (hasCodec) return value;
  if (fieldType === 'toggle') return asBoolean(value);
  if (
    (fieldType === 'slider' || fieldType === 'number') &&
    typeof value === 'string'
  ) {
    return parseNumericUrlParam(value);
  }
  return value;
}

type UrlParamSceneApi = {
  setParams?: (params: Record<string, number | string | boolean>) => unknown;
  setParam?: (key: string, value: number | string | boolean) => unknown;
  render: () => void;
};

export function applySceneUrlParams<TScene extends SceneInstance>(
  meta: SceneMeta,
  target: {
    scene: TScene;
    controls: unknown;
    mount: HTMLElement;
    scheduleRender: () => void;
  },
  paramSync?: SceneParamSync<TScene>,
  preloadedParams?: Record<string, number | string>
): void {
  const urlParams = preloadedParams ?? readSceneParams(meta);
  if (Object.keys(urlParams).length === 0) return;

  const { scene, controls, mount, scheduleRender } = target;
  const handle = (controls ?? {}) as {
    bindings?: ParamBindings;
    fieldTypes?: ReadonlyMap<string, string>;
    fieldOptions?: ReadonlyMap<string, readonly string[]>;
    setValue?: (key: string, value: number | string | boolean) => void;
    setValueSilently?: (key: string, value: number | string | boolean) => void;
    setActive?: (key: string, value: string) => void;
    setActiveSilently?: (key: string, value: string) => void;
  };
  const ctx: ParamSyncContext<TScene> = {
    scene,
    mount,
    controls,
    scheduleRender,
    setControlValue: (key, value) => {
      if (handle.setValueSilently) handle.setValueSilently(key, value);
      else handle.setValue?.(key, value);
    },
    setControlActive: (key, value) => {
      if (handle.setActiveSilently) handle.setActiveSilently(key, value);
      else handle.setActive?.(key, value);
    }
  };

  if (paramSync?.applyAll?.(urlParams, ctx)) return;

  const api = scene as unknown as UrlParamSceneApi;
  const activeKeys = new Set(paramSync?.activeKeys ?? []);

  for (const [key, value] of Object.entries(urlParams)) {
    if (paramSync?.applyParam?.(key, value, ctx)) continue;
    if (key === 'preset') continue;

    // URL / meta 约定为参数单位：原值进 sim，经 bind 换算后投影到控件。
    const fieldType = handle.fieldTypes?.get(key);
    const paramValue = coerceUrlValue(
      value,
      fieldType,
      Boolean(handle.bindings?.get(key)?.values)
    );
    if (paramValue === null) continue;
    // 枚举字段只接受 schema 声明的选项：?model=garbage 直接丢弃，sim 保持默认
    const options = handle.fieldOptions?.get(key);
    if (
      options &&
      !options.includes(
        String(paramToControl(key, paramValue, handle.bindings))
      )
    ) {
      continue;
    }
    const simKey = paramKeyOf(key, handle.bindings);
    if (typeof api.setParams === 'function') {
      api.setParams({ [simKey]: paramValue });
    } else if (typeof api.setParam === 'function') {
      api.setParam(simKey, paramValue);
    }
    const controlValue = paramToControl(key, paramValue, handle.bindings);
    const isActiveField =
      fieldType === 'preset-group' || fieldType === 'scene-selector';
    if (isActiveField || activeKeys.has(key)) {
      ctx.setControlActive(key, String(controlValue));
    } else if (typeof controlValue === 'string' && fieldType === undefined) {
      // 无字段类型表的句柄：沿用旧约定，字符串走 setActive
      ctx.setControlActive(key, controlValue);
    } else {
      ctx.setControlValue(key, controlValue);
    }
  }

  paramSync?.afterApply?.(ctx);
  scene.render();
}
