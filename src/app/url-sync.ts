/**
 * URL 参数同步模块
 *
 * 支持场景配置通过 URL query string 分享和恢复。
 * 读取：解析 ?key=value 并转换为对应类型
 * 写入：debounced 写入 history.replaceState
 */

import type { SceneMeta } from '../platform/scene-contract';

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
export function restoreSceneParams(sceneId: string): void {
  const url = new URL(window.location.href);
  if (url.searchParams.toString()) return; // URL 已有参数，不覆盖

  const raw = localStorage.getItem(`${PARAMS_KEY_PREFIX}${sceneId}`);
  if (!raw) return;

  try {
    const params = JSON.parse(raw) as Record<string, string>;
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
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
