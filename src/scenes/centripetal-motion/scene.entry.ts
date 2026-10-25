import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { SceneLifecycle } from '../../platform/scene-contract';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createCentripetalView } from './scene.view';
import {
  createCentripetalSim,
  type CentripetalParams,
  type CentripetalState
} from './scene.sim';
import type { ReadoutItem } from '../../platform/readout';

export type CreateCentripetalSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: CentripetalState) => void;
};

export function createCentripetalScene(
  options: CreateCentripetalSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): CentripetalState;
  getSnapshot(): CentripetalState;
  getParams(): CentripetalParams;
  setParams(params: Partial<CentripetalParams>): CentripetalParams;
  getReadoutItems(): ReadoutItem[];
  subscribe(listener: () => void): () => void;
  startAll(): void;
  pauseAll(): void;
  getTransportState(): { isPlaying: boolean; speed: number };
} {
  const sim = createCentripetalSim();
  const view = createCentripetalView({
    canvas: options.canvas,
    theme: options.theme ?? 'light',
    mode: options.mode,
    demoHints: options.demoHints
  });
  const base = createStandardSceneEntry({
    sim,
    view,
    getState: () => sim.getState(),
    onReadout: options.onReadout
  });
  function getReadoutItems(): ReadoutItem[] {
    const state = sim.getState();
    return [
      {
        key: 'speed',
        label: '线速度 v',
        value: state.speed,
        digits: 2,
        unit: 'm/s'
      },
      {
        key: 'centripetalAcceleration',
        label: '向心加速度 aₙ',
        value: state.centripetalAcceleration,
        digits: 2,
        unit: 'm/s²'
      },
      {
        key: 'centripetalForce',
        label: '向心合力 Fₙ',
        value: state.centripetalForce,
        digits: 2,
        unit: 'N'
      },
      {
        key: 'period',
        label: '运动周期 T',
        value: state.period,
        digits: 2,
        unit: 's'
      }
    ];
  }
  return {
    ...base,
    getState: () => sim.getState(),
    getSnapshot: () => sim.getSnapshot(),
    getParams: () => sim.getParams(),
    setParams: base.wrapAction((next: Partial<CentripetalParams>) =>
      sim.setParams(next)
    ),
    startAll: base.wrapAction(() => {
      sim.setParams({ autoRun: true });
    }),
    pauseAll: base.wrapAction(() => {
      sim.setParams({ autoRun: false });
    }),
    getTransportState(): { isPlaying: boolean; speed: number } {
      return { isPlaying: sim.getParams().autoRun, speed: 1 };
    },
    getReadoutItems
  };
}
