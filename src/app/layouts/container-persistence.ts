import { layoutRegistry } from './registry';

/**
 * 容器自身状态只保留布局偏好。
 * 主题由 src/app/theme-store.ts 统一管理（统一 key `physics-lab-theme`），
 * 旧版本容器状态里的 theme 字段由 theme-store 的迁移逻辑吸收。
 */
export function persistState(
  storageKey: string,
  preferredLayout: string | null
): void {
  try {
    const state = {
      v: 1,
      preferredLayout,
      timestamp: Date.now()
    };
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // localStorage 不可用，忽略
  }
}

export function restorePersistedState(
  storageKey: string
): { preferredLayout?: string } | null {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const state = JSON.parse(saved);
      if (state.v !== 1) return null;
      const result: { preferredLayout?: string } = {};
      if (state.preferredLayout && layoutRegistry.has(state.preferredLayout)) {
        result.preferredLayout = state.preferredLayout;
      }
      return result;
    }
  } catch (err) {
    console.warn(
      '[persistence] Failed to restore state:',
      err instanceof Error ? err.message : err
    );
  }
  return null;
}

export function saveLayoutState(
  storageKey: string,
  layoutId: string,
  state: Record<string, unknown>
): void {
  try {
    const key = `${storageKey}-layout-${layoutId}`;
    localStorage.setItem(
      key,
      JSON.stringify({
        v: 1,
        state,
        timestamp: Date.now()
      })
    );
  } catch (err) {
    console.warn(
      '[persistence] Failed to save state:',
      err instanceof Error ? err.message : err
    );
  }
}

export function restoreLayoutState(
  storageKey: string,
  layoutId: string
): Record<string, unknown> | null {
  try {
    const key = `${storageKey}-layout-${layoutId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      const data = JSON.parse(saved);
      if (data.v !== 1) return null;
      return data.state;
    }
  } catch (err) {
    console.warn(
      '[persistence] Failed to restore layout state:',
      err instanceof Error ? err.message : err
    );
  }
  return null;
}
