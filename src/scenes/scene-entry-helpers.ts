/**
 * 场景入口辅助函数
 *
 * 提取各场景 scene.entry.ts 中的公共生命周期模式，减少重复代码。
 * 采用 opt-in 设计：复杂场景可只使用部分 helper，保留自定义逻辑。
 */

import type { SceneLifecycle } from './types';
import type { TeachingMode, TeachingTheme } from '../platform/standards';
import type { DemoRenderHints } from '../platform/demo-profile';

/** 播放速度倍率下限（与 transport-bar 滑块区间对齐） */
export const MIN_TIME_SCALE = 0.25;
/** 播放速度倍率上限 */
export const MAX_TIME_SCALE = 3;

/** 钳制播放速度倍率到 [MIN_TIME_SCALE, MAX_TIME_SCALE] */
export function clampTimeScale(scale: number): number {
  return Math.max(MIN_TIME_SCALE, Math.min(MAX_TIME_SCALE, scale));
}

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
 *   setParam: base.wrapAction((key: string, value: number) => {
 *     sim.setParam(key, value);
 *   })
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
  /**
   * 可选视图重置钩子 — 在 init/reset 路径中于 sim.reset() 之后、
   * 首次 renderAndEmit 之前调用（如清空轨迹、重置相机）
   */
  resetView?: () => void;
}): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  renderAndEmit(): void;
  subscribe(listener: () => void): () => void;
  notify(): void;
  /**
   * 包装场景动作：执行 fn 后自动 renderAndEmit + notify，
   * 并透传 fn 的返回值（适用于需要返回 sim 结果的 setter）
   */
  wrapAction<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R;
} {
  const { sim, view, getState, onReadout, resetView } = options;
  const { subscribe, notify, clear } = createNotifySystem();

  function renderAndEmit(): void {
    const state = getState();
    view.render(state);
    onReadout?.(state);
  }

  function wrapAction<A extends unknown[], R>(
    fn: (...args: A) => R
  ): (...args: A) => R {
    return (...args: A): R => {
      const result = fn(...args);
      renderAndEmit();
      notify();
      return result;
    };
  }

  return {
    init(): void {
      sim.reset();
      resetView?.();
      renderAndEmit();
    },
    reset(): void {
      sim.reset();
      resetView?.();
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
      clear();
    },
    renderAndEmit,
    subscribe,
    notify,
    wrapAction
  };
}
