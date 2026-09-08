/**
 * URL 参数同步模块
 *
 * 支持场景配置通过 URL query string 分享和恢复。
 * 读取：解析 ?key=value 并转换为对应类型
 * 写入：debounced 写入 history.replaceState
 */

import type { SceneMeta } from '../platform/scene-contract';
import type {
  ParamSyncContext,
  SceneInstance,
  SceneParamSync
} from './scene-bootstrapper-types';

/**
 * URL 读取/写回允许的键集合：defaultParams ∪ urlSyncKeys ∪ {preset}
 *
 * 与 readSceneParams 的读取口径一致（readSceneParams 对 preset 有
 * 特判放行），写回（writeParam）用同一集合过滤：不可读的 key
 * 写了也无法恢复，直接忽略。
 *
 * 这些键会被读取，但 entry 无 setParams/setParam 时管线静默丢弃
 * （与旧行为等价）。无参数 API 的场景：electrification / emf-analogy /
 * field-lines / spring-oscillator / vt-integral。
 */
export function resolveUrlSyncKeys(meta: SceneMeta): Set<string> {
  return new Set([
    ...Object.keys(meta.defaultParams),
    ...(meta.urlSyncKeys ?? []),
    'preset'
  ]);
}

/**
 * 从当前 URL 读取与场景元数据匹配的参数
 */
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
      // URL 字符串参数（如 step）保持原样；数值参数尝试解析
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

let writeTimeout: number | null = null;

const PARAMS_KEY_PREFIX = 'physics-demos-params-';

/**
 * 将当前 URL 参数持久化到 localStorage
 */
export function persistSceneParams(sceneId: string): void {
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

/**
 * 从 localStorage 恢复之前保存的参数
 * 若 URL 已有参数则不覆盖（URL 优先级更高）
 */
export function restoreSceneParams(meta: SceneMeta): void {
  const url = new URL(window.location.href);
  if (url.searchParams.toString()) return; // URL 已有参数，不覆盖

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

/**
 * 将参数写入 URL query string（debounced 150ms）
 * 保留 URL 中已有的其他参数
 */
export function writeSceneParams(
  params: Record<string, number | string | boolean | undefined>
): void {
  if (writeTimeout) clearTimeout(writeTimeout);
  writeTimeout = window.setTimeout(() => {
    const url = new URL(window.location.href);
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === '' || v === null) {
        url.searchParams.delete(k);
      } else {
        url.searchParams.set(k, String(v));
      }
    });
    window.history.replaceState({}, '', url);
  }, 150);
}

/** 管线场景侧最小 API：setParams 批量 / setParam 单键 / render 首绘 */
type UrlParamSceneApi = {
  setParams?: (params: Record<string, number | string>) => unknown;
  setParam?: (key: string, value: number | string) => unknown;
  render: () => void;
};

/**
 * 声明式 URL 参数管线（场景页通用样板的下沉实现）
 *
 * readSceneParams → scene.setParams（无 setParams 时退回 setParam 单键
 * API）→ createControls 返回句柄回写（数值走 setValue；字符串或
 * paramSync.activeKeys 走 setActive）→ URL 非空时同步首绘。
 *
 * 场景特例通过 paramSync 钩子接管：applyParam（单键）、applyAll（整体，
 * 返回 true 时连首绘也一并接管）、afterApply（默认管线后、首绘前）。
 *
 * 仅在 URL 含合法参数时动作；URL 无参数时为纯 no-op。
 */
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
    setActive?: (key: string, value: string) => void;
  };
  const ctx: ParamSyncContext<TScene> = {
    scene,
    mount,
    controls,
    scheduleRender,
    setControlValue: (key, value) => handle.setValue?.(key, value),
    setControlActive: (key, value) => handle.setActive?.(key, value)
  };

  // 整体接管逃生口（含首绘时机）
  if (paramSync?.applyAll?.(urlParams, ctx)) return;

  const api = scene as unknown as UrlParamSceneApi;
  const activeKeys = new Set(paramSync?.activeKeys ?? []);

  for (const [key, value] of Object.entries(urlParams)) {
    // 场景单键逃生口：返回 true 表示已处理
    if (paramSync?.applyParam?.(key, value, ctx)) continue;
    // preset 语义因场景而异，默认管线不应用（需 applyParam 接管）
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
  // URL 参数应用后立即同步首绘（不等下一帧）
  scene.render();
}
