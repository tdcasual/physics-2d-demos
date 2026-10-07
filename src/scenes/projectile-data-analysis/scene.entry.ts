import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import {
  cloneSession,
  createDataWorkspaceHost,
  createEmptySession,
  freezeSession
} from '../../platform/data-workspace';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { projectileLabMeta } from './scene.meta';
import {
  MEASURE_POINT_COUNT,
  createProjectileLabSim,
  type ProjectileLabGate,
  type ProjectileLabPhase,
  type ProjectileLabState
} from './scene.sim';
import { createProjectileLabView } from './scene.view';
import type { createProjectileLabDataWorkspace } from './data-task';

/** 慢放倍率：真实过程不足 1 s，按此倍率放慢到约 2 s 便于观察。 */
const SLOW_MOTION = 0.35;
/** 外部循环（shell）在此时间窗内推进过，就不再由自带循环重复推进。 */
const SHELL_STEP_WINDOW_MS = 120;
const MAX_FRAME_DT_S = 0.05;

export type CreateProjectileLabSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

export type ProjectileLabSceneParams = {
  releaseH: number;
  plateY: number;
  chuteTilt: number;
  useLocator: number;
  recordOrigin: number;
  showLabels: number;
};

function asFlag(value: number | boolean | undefined): boolean | undefined {
  if (typeof value === 'boolean') return value;
  return typeof value === 'number' ? value > 0 : undefined;
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

export function createProjectileLabScene(
  options: CreateProjectileLabSceneOptions = {}
) {
  const defaults = projectileLabMeta.defaultParams;
  const sim = createProjectileLabSim({
    releaseH: defaults.releaseH,
    plateY: defaults.plateY,
    chuteTilt: defaults.chuteTilt,
    useLocator: (defaults.useLocator ?? 1) > 0,
    recordOrigin: (defaults.recordOrigin ?? 1) > 0,
    showLabels: (defaults.showLabels ?? 1) > 0
  });
  const view = createProjectileLabView({
    canvas: options.canvas,
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });

  const base = createStandardSceneEntry({
    sim,
    view,
    getState: () => sim.getState(),
    resetView: () => view.reset()
  });

  type InnerWorkspace = ReturnType<typeof createProjectileLabDataWorkspace>;
  let hostRef: InnerWorkspace | null = null;

  function setAnalysisVisual(active: boolean): void {
    view.setAnalysisMode(active);
    base.renderAndEmit();
  }

  const dataWorkspace = createDataWorkspaceHost<InnerWorkspace>({
    load: () =>
      import('./data-task').then((mod) =>
        mod.createProjectileLabDataWorkspace({
          getState: () => sim.getState()
        })
      ),
    eligibility: () => {
      if (!sim.getState().traced) {
        return { ok: false as const, reason: '请先记录落点并描出轨迹' };
      }
      return { ok: false as const, reason: '数据任务加载中…' };
    },
    emptySession: (active) => {
      const session = createEmptySession(MEASURE_POINT_COUNT);
      session.active = active;
      return freezeSession(cloneSession(session));
    },
    prefetch: true,
    onActiveChange: (active) => view.setAnalysisMode(active),
    notify: () => base.notify(),
    renderAndEmit: () => base.renderAndEmit(),
    effects: {
      submitField: 'notify',
      addTrial: 'none',
      removeTrial: 'none',
      syncInstrument: 'none'
    },
    extensions: {
      invalidateAll: { notify: true },
      setActiveVisual: setAnalysisVisual,
      renderResult: true
    },
    loadingMessage: '数据任务加载中…',
    notReadyError: '[projectile-data-analysis] data workspace not ready',
    loadErrorLabel: '[projectile-data-analysis] 数据任务模块加载失败',
    onInnerReady: (inner) => {
      hostRef = inner;
    }
  });

  // 释放与描迹动画由场景自带的 rAF 循环推进：控制面板按钮无法启动
  // shell 的播放循环，而这两个动作都是一次性的短动画。
  let frame: number | null = null;
  let lastFrameMs = 0;
  let lastShellStepMs = Number.NEGATIVE_INFINITY;
  let lastPhase: ProjectileLabPhase = 'idle';
  let disposed = false;

  function advance(dt: number): void {
    sim.step(dt * SLOW_MOTION);
    const phase = sim.getState().phase;
    if (phase !== lastPhase) {
      lastPhase = phase;
      base.notify();
    }
  }

  function tick(timestamp: number): void {
    frame = null;
    if (disposed) return;
    const dt = Math.min(
      MAX_FRAME_DT_S,
      Math.max(0, timestamp - lastFrameMs) / 1000
    );
    lastFrameMs = timestamp;
    if (timestamp - lastShellStepMs > SHELL_STEP_WINDOW_MS) advance(dt);
    base.renderAndEmit();
    if (sim.getState().busy) frame = requestAnimationFrame(tick);
  }

  function ensureLoop(): void {
    if (frame != null || disposed) return;
    if (typeof requestAnimationFrame !== 'function') return;
    lastFrameMs = now();
    frame = requestAnimationFrame(tick);
  }

  function stopLoop(): void {
    if (frame != null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(frame);
    }
    frame = null;
  }

  function afterAction(): void {
    lastPhase = sim.getState().phase;
    base.renderAndEmit();
    base.notify();
    if (sim.getState().busy) ensureLoop();
  }

  function getParams(): ProjectileLabSceneParams {
    const params = sim.getParams();
    return {
      releaseH: params.releaseH,
      plateY: params.plateY,
      chuteTilt: params.chuteTilt,
      useLocator: params.useLocator ? 1 : 0,
      recordOrigin: params.recordOrigin ? 1 : 0,
      showLabels: params.showLabels ? 1 : 0
    };
  }

  function clearPaper(reason: string, clear: () => void): void {
    stopLoop();
    clear();
    hostRef?.invalidateAll(reason);
    afterAction();
  }

  return {
    ...base,
    step(dt: number): void {
      lastShellStepMs = now();
      advance(dt);
    },
    startAll(): void {
      sim.release();
      afterAction();
    },
    pauseAll(): void {
      // 一次释放不足 1 s，不支持中途暂停。
    },
    reset(): void {
      clearPaper('实验已重置，请重新记录并测量', () => sim.reset());
    },
    /** 从当前释放位置由静止释放小球。 */
    release(): ProjectileLabGate {
      const gate = sim.release();
      afterAction();
      return gate;
    },
    /** 挡板下移一格；已到最低处返回 false。 */
    lowerPlate(): boolean {
      const moved = sim.lowerPlate();
      afterAction();
      return moved;
    },
    /** 取下白纸描出轨迹。 */
    trace(): ProjectileLabGate {
      const gate = sim.trace();
      afterAction();
      return gate;
    },
    /** 换一张白纸，落点、轨迹与已校对的数据全部作废。 */
    newPaper(): void {
      clearPaper('已换白纸，请重新记录并测量', () => sim.newPaper());
    },
    getTransportState(): { isPlaying: boolean; speed: number } {
      return { isPlaying: sim.getState().busy, speed: 1 };
    },
    setParams(
      next: Partial<{
        releaseH: number;
        plateY: number;
        chuteTilt: number;
        useLocator: number | boolean;
        recordOrigin: number | boolean;
        showLabels: number | boolean;
      }>
    ): ProjectileLabSceneParams {
      sim.setParams({
        releaseH: next.releaseH,
        plateY: next.plateY,
        chuteTilt: next.chuteTilt,
        useLocator: asFlag(next.useLocator),
        recordOrigin: asFlag(next.recordOrigin),
        showLabels: asFlag(next.showLabels)
      });
      afterAction();
      return getParams();
    },
    getParams,
    getState(): ProjectileLabState {
      return sim.getState();
    },
    getDataWorkspace() {
      return dataWorkspace;
    },
    getReadoutItems() {
      const state = sim.getState();
      const status = state.traced
        ? state.busy
          ? '正在描出轨迹'
          : '轨迹已描出，可进入数据处理'
        : state.busy
          ? '小球运动中'
          : state.traceGate.ok
            ? '落点足够，可以描出轨迹'
            : state.marks.length === 0
              ? '从同一位置释放小球，记录落点'
              : state.traceGate.reason;
      const setup = [
        state.params.useLocator ? null : '未用定位卡',
        state.params.chuteTilt === 0 ? null : '斜槽末端不水平',
        state.consistent ? null : '落点不在同一条轨迹上'
      ].filter((item): item is string => item !== null);
      return [
        {
          key: 'release',
          label: '释放高度 h',
          value: `${state.params.releaseH.toFixed(1)} cm`
        },
        {
          key: 'tilt',
          label: '末端倾角',
          value: `${state.params.chuteTilt}°`
        },
        {
          key: 'plate',
          label: '挡板位置 y',
          value: `${state.params.plateY.toFixed(0)} cm`
        },
        {
          key: 'marks',
          label: '落点',
          value: `${state.marks.length} 个 / ${state.levelCount} 个高度`
        },
        { key: 'status', label: '进度', value: status },
        {
          key: 'setup',
          label: '误差来源',
          value: setup.length > 0 ? setup.join('、') : '无'
        }
      ];
    },
    dispose(): void {
      disposed = true;
      stopLoop();
      hostRef?.resetSession();
      dataWorkspace.setActive(false);
      base.dispose();
    }
  };
}

export type ProjectileLabScene = ReturnType<typeof createProjectileLabScene>;
