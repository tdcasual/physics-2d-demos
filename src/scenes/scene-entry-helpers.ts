/**
 * 场景入口辅助函数
 *
 * 提取各场景 scene.entry.ts 中的公共生命周期模式，减少重复代码。
 * 采用 opt-in 设计：复杂场景可只使用部分 helper，保留自定义逻辑。
 */

import type { SceneLifecycle } from './types';
import type { TeachingMode, TeachingTheme } from '../platform/standards';
import type { DemoRenderHints } from '../platform/demo-profile';

/** 最小视图接口 — 标准场景入口所需 */
export type MinimalViewApi = {
  render(state: unknown): void;
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  dispose(): void;
};

/** 最小仿真接口 — 标准场景入口所需 */
export type MinimalSimApi = {
  reset(): void;
  step(dt: number): void;
};

/**
 * 创建标准通知系统（subscribe/notify）
 */
export function createNotifySystem() {
  const listeners: (() => void)[] = [];

  function notify(): void {
    listeners.forEach((fn) => {
      try {
        fn();
      } catch {
        /* ignore listener errors */
      }
    });
  }

  function subscribe(listener: () => void): () => void {
    listeners.push(listener);
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }

  function clear(): void {
    listeners.length = 0;
  }

  return { notify, subscribe, clear };
}

/**
 * 创建标准场景入口
 *
 * 封装通用的 SceneLifecycle + resize/setTheme/setMode/renderAndEmit 模式。
 * 返回的对象可直接展开，再追加场景特有的扩展方法。
 *
 * @example
 * const base = createStandardSceneEntry({
 *   sim: createMySim(),
 *   view: createMyView({ canvas, theme, mode }),
 *   getState: () => sim.getState(),
 *   onReadout: options.onReadout
 * });
 * return {
 *   ...base,
 *   setParam(key: string, value: number) {
 *     sim.setParam(key, value);
 *     base.renderAndEmit();
 *   }
 * };
 */
export function createStandardSceneEntry<
  TSim extends MinimalSimApi = MinimalSimApi,
  TView extends MinimalViewApi = MinimalViewApi,
  TState = unknown
>(options: {
  sim: TSim;
  view: TView;
  getState: () => TState;
  onReadout?: (state: TState) => void;
}): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  renderAndEmit(): void;
  subscribe(listener: () => void): () => void;
  notify(): void;
} {
  const { sim, view, getState, onReadout } = options;
  const { subscribe, notify } = createNotifySystem();

  function renderAndEmit(): void {
    const state = getState();
    view.render(state);
    onReadout?.(state);
  }

  return {
    init(): void {
      sim.reset();
      renderAndEmit();
    },
    reset(): void {
      sim.reset();
      renderAndEmit();
      notify();
    },
    step(dt: number): void {
      sim.step(dt);
    },
    render(): void {
      renderAndEmit();
      notify();
    },
    resize(): void {
      view.resize();
      renderAndEmit();
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints): void {
      view.setMode(mode, hints);
      renderAndEmit();
      notify();
    },
    setTheme(theme: TeachingTheme): void {
      view.setTheme(theme);
      renderAndEmit();
      notify();
    },
    dispose(): void {
      view.dispose();
    },
    renderAndEmit,
    subscribe,
    notify
  };
}
