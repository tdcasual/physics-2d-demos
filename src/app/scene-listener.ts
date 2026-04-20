/**
 * 场景可观察包装工具
 *
 * 减少 page.ts 中 _listener / subscribe / notify 的重复代码。
 */

export interface SceneListener {
  subscribe: (listener: () => void) => () => void;
  notify: () => void;
}

export function createSceneListener(): SceneListener {
  let _listener: (() => void) | null = null;
  return {
    subscribe(listener: () => void) {
      _listener = listener;
      return () => {
        _listener = null;
      };
    },
    notify() {
      _listener?.();
    }
  };
}
