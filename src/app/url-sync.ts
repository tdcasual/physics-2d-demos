/**
 * URL 参数同步模块
 *
 * Owner-scoped pending patches + per-owner debounce. Different keys merge,
 * same key last-write-wins, deletes use an explicit sentinel. flush(A) never
 * cancels B. Restore-once lives on SceneAdapter; this module only reads/writes.
 */

import type { SceneMeta } from '../platform/scene-contract';
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
        result[key] = value.includes('.')
          ? parseFloat(value)
          : parseInt(value, 10);
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
  if (Object.keys(params).length > 0) {
    localStorage.setItem(
      `${PARAMS_KEY_PREFIX}${sceneId}`,
      JSON.stringify(params)
    );
  } else {
    localStorage.removeItem(`${PARAMS_KEY_PREFIX}${sceneId}`);
  }
}

export function restoreSceneParams(meta: SceneMeta): void {
  const url = new URL(window.location.href);
  if (url.searchParams.toString()) return;

  const raw = localStorage.getItem(`${PARAMS_KEY_PREFIX}${meta.id}`);
  if (!raw) return;

  try {
    const params = JSON.parse(raw) as Record<string, string>;
    const allowed = resolveUrlSyncKeys(meta);
    Object.entries(params).forEach(([k, v]) => {
      if (allowed.has(k)) url.searchParams.set(k, v);
    });
    window.history.replaceState({}, '', url);
  } catch {
    // ignore corrupt storage
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

type UrlParamSceneApi = {
  setParams?: (params: Record<string, number | string>) => unknown;
  setParam?: (key: string, value: number | string) => unknown;
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

    const simKey = paramSync?.paramMap?.[key] ?? key;
    if (typeof api.setParams === 'function') {
      api.setParams({ [simKey]: value });
    } else if (typeof api.setParam === 'function') {
      api.setParam(simKey, value);
    }
    if (typeof value === 'string' || activeKeys.has(key)) {
      ctx.setControlActive(key, String(value));
    } else {
      ctx.setControlValue(key, value);
    }
  }

  paramSync?.afterApply?.(ctx);
  scene.render();
}
