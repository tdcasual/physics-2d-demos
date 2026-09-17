import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import {
  clampTimeScale,
  createStandardSceneEntry
} from '../scene-entry-helpers';
import { createVariableWorkView } from './scene.view';
import {
  createVariableWorkSim,
  type VariableWorkParams,
  type VariableWorkState
} from './scene.sim';

export type CreateVariableWorkSceneOptions = {
  canvas?: HTMLCanvasElement;
  graphCanvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: VariableWorkState) => void;
};

export function createVariableWorkScene(
  options: CreateVariableWorkSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): VariableWorkState;
  getSnapshot(): VariableWorkState;
  getParams(): VariableWorkParams;
  setParams(params: Partial<VariableWorkParams>): VariableWorkParams;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
  subscribe(listener: () => void): () => void;
  attachGraphCanvas(canvas: HTMLCanvasElement): void;
  startAll(): void;
  pauseAll(): void;
  setTimeScale(scale: number): void;
  getTimeScale(): number;
  getTransportState(): { isPlaying: boolean; speed: number };
} {
  const sim = createVariableWorkSim();
  const view = createVariableWorkView({
    canvas: options.canvas,
    graphCanvas: options.graphCanvas,
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  const base = createStandardSceneEntry({
    sim,
    view,
    getState: () => sim.getState(),
    onReadout: options.onReadout
  });
  let timeScale = 1;

  function getReadoutItems() {
    const s = sim.getState();
    const items = [
      { key: 'force', label: '即时外力 F', value: `${s.force.toFixed(2)} N` },
      {
        key: 'velocity',
        label: '即时速度 v',
        value: `${s.velocity.toFixed(2)} m/s`
      },
      { key: 'power', label: '即时功率 P', value: `${s.power.toFixed(2)} W` },
      {
        key: 'work',
        label: '解析功 W',
        value: `${s.work.toFixed(2)} J`
      },
      {
        key: 'kinetic',
        label: '动能增量 ΔEₖ',
        value: `${s.kineticGain.toFixed(2)} J`
      }
    ];
    if (s.params.microsteps > 0) {
      const bias =
        s.riemannBias === 'under'
          ? '低估'
          : s.riemannBias === 'over'
            ? '高估'
            : '相等';
      items.push(
        {
          key: 'riemann',
          label: '左端点 Wₙ',
          value: `${s.riemannWork.toFixed(2)} J`
        },
        {
          key: 'riemannError',
          label: '|W − Wₙ|',
          value: `${s.riemannError.toFixed(3)} J`
        },
        { key: 'riemannBias', label: '逼近', value: bias }
      );
    }
    return items;
  }

  return {
    ...base,
    step(dt: number): void {
      sim.step(dt * timeScale);
    },
    getState: (): VariableWorkState => sim.getState(),
    getSnapshot: (): VariableWorkState => sim.getSnapshot(),
    getParams: (): VariableWorkParams => sim.getParams(),
    setParams: base.wrapAction((next: Partial<VariableWorkParams>) =>
      sim.setParams(next)
    ),
    attachGraphCanvas(canvas: HTMLCanvasElement): void {
      view.attachGraphCanvas(canvas);
      base.renderAndEmit();
    },
    startAll: base.wrapAction(() => {
      sim.start();
    }),
    pauseAll: base.wrapAction(() => {
      sim.pause();
    }),
    setTimeScale(scale: number): void {
      timeScale = clampTimeScale(scale);
      base.notify();
    },
    getTimeScale(): number {
      return timeScale;
    },
    getTransportState(): { isPlaying: boolean; speed: number } {
      const state = sim.getState();
      return { isPlaying: state.playing, speed: timeScale };
    },
    getReadoutItems
  };
}
