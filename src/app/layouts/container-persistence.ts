import { layoutRegistry } from './registry';
import type { Theme } from './types';

export function persistState(
  storageKey: string,
  theme: Theme,
  preferredLayout: string | null
): void {
  try {
    const state = {
      v: 1,
      theme,
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
): { theme?: Theme; preferredLayout?: string } | null {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const state = JSON.parse(saved);
      if (state.v !== 1) return null;
      const result: { theme?: Theme; preferredLayout?: string } = {};
      if (state.theme === 'light' || state.theme === 'dark') {
        result.theme = state.theme;
      }
      if (state.preferredLayout && layoutRegistry.has(state.preferredLayout)) {
        result.preferredLayout = state.preferredLayout;
      }
      return result;
    }
  } catch {
    // localStorage 不可用或数据损坏，忽略
  }
  return null;
}

export function saveSceneState(
  storageKey: string,
  sceneId: string,
  state: object
): void {
  try {
    const key = `${storageKey}-scene-${sceneId}`;
    localStorage.setItem(
      key,
      JSON.stringify({
        v: 1,
        state,
        timestamp: Date.now()
      })
    );
  } catch {
    // 忽略
  }
}

export function restoreSceneState(
  storageKey: string,
  sceneId: string
): object | null {
  try {
    const key = `${storageKey}-scene-${sceneId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      const data = JSON.parse(saved);
      if (data.v !== 1) return null;
      return data.state;
    }
  } catch {
    // 忽略
  }
  return null;
}
