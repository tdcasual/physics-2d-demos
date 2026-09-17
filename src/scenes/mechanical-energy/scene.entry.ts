import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import {
  clampTimeScale,
  createStandardSceneEntry
} from '../scene-entry-helpers';
import { createMechanicalEnergyView } from './scene.view';
import {
  asEnvironment,
  createMechanicalEnergySim,
  formatFixed,
  type MechanicalEnergyEnvironment,
  type MechanicalEnergyParams,
  type MechanicalEnergyState
} from './scene.sim';

export type CreateMechanicalEnergySceneOptions = {
  canvas?: HTMLCanvasElement;
  graphCanvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: MechanicalEnergyState) => void;
};

export { asEnvironment };

export function createMechanicalEnergyScene(
  options: CreateMechanicalEnergySceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): MechanicalEnergyState;
  getSnapshot(): MechanicalEnergyState;
  getParams(): MechanicalEnergyParams;
  setParams(params: Partial<MechanicalEnergyParams>): MechanicalEnergyParams;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
  subscribe(listener: () => void): () => void;
  attachGraphCanvas(canvas: HTMLCanvasElement): void;
  startAll(): void;
  pauseAll(): void;
  setTimeScale(scale: number): void;
  getTimeScale(): number;
  getTransportState(): { isPlaying: boolean; speed: number };
} {
  const sim = createMechanicalEnergySim();
  const view = createMechanicalEnergyView({
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
  return {
    ...base,
    step(dt: number): void {
      sim.step(dt * timeScale);
    },
    getState: (): MechanicalEnergyState => sim.getState(),
    getSnapshot: (): MechanicalEnergyState => sim.getSnapshot(),
    getParams: (): MechanicalEnergyParams => sim.getParams(),
    setParams: base.wrapAction((next: Partial<MechanicalEnergyParams>) =>
      sim.setParams(next)
    ),
    attachGraphCanvas(canvas: HTMLCanvasElement): void {
      view.attachGraphCanvas(canvas);
      base.renderAndEmit();
    },
    startAll: base.wrapAction(() => {
      if (sim.getState().finished) sim.rewind();
      sim.setParams({ autoRun: true });
    }),
    pauseAll: base.wrapAction(() => {
      sim.setParams({ autoRun: false });
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
      return {
        isPlaying: state.params.autoRun && !state.finished,
        speed: timeScale
      };
    },
    getReadoutItems() {
      const state = sim.getState();
      return [
        {
          key: 'acceleration',
          label: '加速度 a',
          value: `${formatFixed(state.acceleration, 2)} m/s²`
        },
        {
          key: 'height',
          label: '下落 h',
          value: `${formatFixed(state.height * 100, 2)} cm`
        },
        {
          key: 'speed',
          label: '速度 v',
          value: `${formatFixed(state.speed, 3)} m/s`
        },
        {
          key: 'potentialLoss',
          label: 'ΔEₚ',
          value: `${formatFixed(state.potentialLoss, 3)} J`
        },
        {
          key: 'kineticGain',
          label: 'ΔEₖ',
          value: `${formatFixed(state.kineticGain, 3)} J`
        },
        {
          key: 'dissipation',
          label: 'Wᵣ',
          value: `${formatFixed(state.dissipation, 3)} J`
        }
      ];
    }
  };
}

export type { MechanicalEnergyEnvironment };
