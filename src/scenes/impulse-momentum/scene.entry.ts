import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createImpulseMomentumView } from './scene.view';
import {
  asImpulseForceModel,
  createImpulseMomentumSim,
  impulseMomentumConstants as C,
  type ImpulseForceModel,
  type ImpulseMomentumParams,
  type ImpulseMomentumState
} from './scene.sim';

export type CreateImpulseMomentumSceneOptions = {
  canvas?: HTMLCanvasElement;
  graphCanvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: ImpulseMomentumState) => void;
};

export function asForceModel(value: unknown): ImpulseForceModel | undefined {
  return asImpulseForceModel(value);
}

function signed(value: number, digits: number, unit: string): string {
  const mag = Math.abs(value).toFixed(digits);
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${mag} ${unit}`;
}

export function createImpulseMomentumScene(
  options: CreateImpulseMomentumSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): ImpulseMomentumState;
  getSnapshot(): ImpulseMomentumState;
  getParams(): ImpulseMomentumParams;
  setParams(params: Partial<ImpulseMomentumParams>): ImpulseMomentumParams;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
  subscribe(listener: () => void): () => void;
  attachGraphCanvas(canvas: HTMLCanvasElement): void;
  startAll(): void;
  pauseAll(): void;
  getTransportState(): { isPlaying: boolean; speed: number };
} {
  const sim = createImpulseMomentumSim();
  let emit = (): void => {};
  const view = createImpulseMomentumView({
    canvas: options.canvas,
    graphCanvas: options.graphCanvas,
    theme: options.theme ?? 'light',
    mode: options.mode,
    demoHints: options.demoHints,
    onTimeScrub: (time) => {
      sim.setParams({ autoRun: false });
      sim.setTime(time);
      emit();
    }
  });
  const base = createStandardSceneEntry({
    sim,
    view,
    getState: () => sim.getState(),
    onReadout: options.onReadout
  });
  emit = () => {
    base.renderAndEmit();
    base.notify();
  };
  return {
    ...base,
    getState: () => sim.getState(),
    getSnapshot: () => sim.getSnapshot(),
    getParams: () => sim.getParams(),
    setParams: base.wrapAction((next: Partial<ImpulseMomentumParams>) =>
      sim.setParams(next)
    ),
    attachGraphCanvas(canvas: HTMLCanvasElement): void {
      view.attachGraphCanvas(canvas);
      base.renderAndEmit();
    },
    startAll: base.wrapAction(() => {
      if (sim.getState().finished) sim.setTime(C.timeMin);
      sim.setParams({ autoRun: true });
    }),
    pauseAll: base.wrapAction(() => {
      sim.setParams({ autoRun: false });
    }),
    getTransportState(): { isPlaying: boolean; speed: number } {
      const state = sim.getState();
      return {
        isPlaying: state.params.autoRun && !state.finished,
        speed: 1
      };
    },
    getReadoutItems(): Array<{ key: string; label: string; value: string }> {
      const state = sim.getState();
      return [
        { key: 'time', label: 't', value: `${state.time.toFixed(2)} s` },
        {
          key: 'force',
          label: 'Fₓ',
          value: `${state.force.toFixed(2)} N`
        },
        {
          key: 'impulse',
          label: 'Iₓ',
          value: `${state.impulse.toFixed(2)} N·s`
        },
        {
          key: 'p0',
          label: 'p₀',
          value: signed(state.initialMomentum, 2, 'kg·m/s')
        },
        {
          key: 'dp',
          label: 'Δpₓ',
          value: signed(state.momentumChange, 2, 'kg·m/s')
        },
        {
          key: 'p',
          label: 'pₓ',
          value: signed(state.momentum, 2, 'kg·m/s')
        },
        {
          key: 'velocity',
          label: 'v',
          value: signed(state.velocity, 2, 'm/s')
        }
      ];
    }
  };
}
