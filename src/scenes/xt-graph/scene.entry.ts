import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import {
  clampTimeScale,
  createStandardSceneEntry
} from '../scene-entry-helpers';
import {
  createXtGraphSim,
  DEFAULT_PRESET_ID,
  type XtGraphState,
  type XtPresetId
} from './scene.sim';
import { createXtGraphView } from './scene.view';

export type XtGraphParams = {
  /** 播放速度倍率（0.25–3，与 transport-bar 对齐） */
  speed: number;
};

export type CreateXtGraphSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: XtGraphState) => void;
};

export function createXtGraphScene(options: CreateXtGraphSceneOptions = {}) {
  const sim = createXtGraphSim(DEFAULT_PRESET_ID);
  const view = createXtGraphView({
    canvas: options.canvas,
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });

  let timeScale = 1;
  let playing = false;

  const base = createStandardSceneEntry({
    sim,
    view,
    getState: () => sim.getState(),
    onReadout: options.onReadout
  });

  return {
    ...base,
    /** 覆盖 base.step：应用播放速度倍率；播完后 sim 内部空操作 */
    step(dt: number): void {
      sim.step(dt * timeScale);
      if (playing && sim.getState().finished) {
        playing = false;
        // 只 notify；停 RAF 由 SceneAdapter 根据 getTransportState 执行。
        base.notify();
      }
    },
    /** 播完后再次播放 = 重新演示 */
    startAll(): void {
      if (sim.getState().finished) sim.reset();
      playing = true;
      base.renderAndEmit();
      base.notify();
    },
    pauseAll(): void {
      playing = false;
      base.notify();
    },
    reset(): void {
      playing = false;
      sim.reset();
      base.renderAndEmit();
      base.notify();
    },
    setTimeScale(scale: number): void {
      timeScale = clampTimeScale(scale);
      base.notify();
    },
    getTimeScale(): number {
      return timeScale;
    },
    getTransportState(): { isPlaying: boolean; speed: number } {
      return {
        isPlaying: playing && !sim.getState().finished,
        speed: timeScale
      };
    },
    /**
     * 切换预设运动（回到 t = 0）。
     * 播放状态保持不变：播放中切换则从头继续播，与 transport bar 显示一致
     * （entry 无法触及 adapter 的 shell 循环，暂停语义会造成状态脱钩）。
     */
    setPreset: base.wrapAction((id: XtPresetId): void => {
      sim.setPreset(id);
    }),
    /** URL 参数管线入口：preset → 切换预设；speed → 播放速度 */
    setParams(next: { preset?: string; speed?: number }): XtGraphParams {
      if (typeof next.speed === 'number' && Number.isFinite(next.speed)) {
        timeScale = clampTimeScale(next.speed);
      }
      if (typeof next.preset === 'string') {
        sim.setPreset(next.preset);
      }
      base.renderAndEmit();
      base.notify();
      return { speed: timeScale };
    },
    getParams(): XtGraphParams {
      return { speed: timeScale };
    },
    getState: (): XtGraphState => sim.getState(),
    getReadoutItems(): Array<{ label: string; value: string }> {
      const s = sim.getState();
      const sign = (v: number) => (v >= 0 ? '+' : '');
      return [
        { label: '时间 t', value: `${s.t.toFixed(2)} s` },
        { label: '位置 x', value: `${sign(s.x)}${s.x.toFixed(2)} m` },
        { label: '速度 v', value: `${sign(s.v)}${s.v.toFixed(2)} m/s` }
      ];
    }
  };
}

export type XtGraphScene = ReturnType<typeof createXtGraphScene>;
