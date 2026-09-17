import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createRodModelView } from './scene.view';
import {
  asRodModel,
  createRodModelSim,
  type RodModel,
  type RodParams,
  type RodState
} from './scene.sim';

export type CreateRodModelSceneOptions = {
  canvas?: HTMLCanvasElement;
  graphCanvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: RodState) => void;
};

export { asRodModel };

export function createRodModelScene(
  options: CreateRodModelSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): RodState;
  getSnapshot(): RodState;
  getParams(): RodParams;
  setParams(params: Partial<RodParams>): RodParams;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
  subscribe(listener: () => void): () => void;
  attachGraphCanvas(canvas: HTMLCanvasElement): void;
  startAll(): void;
  pauseAll(): void;
  getTransportState(): { isPlaying: boolean; speed: number };
} {
  const sim = createRodModelSim();
  const view = createRodModelView({
    canvas: options.canvas,
    graphCanvas: options.graphCanvas,
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
  return {
    ...base,
    getState: () => sim.getState(),
    getSnapshot: () => sim.getSnapshot(),
    getParams: () => sim.getParams(),
    setParams: base.wrapAction((next: Partial<RodParams>) =>
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
    getTransportState(): { isPlaying: boolean; speed: number } {
      const state = sim.getState();
      return {
        isPlaying: state.params.autoRun && !state.finished,
        speed: 1
      };
    },
    getReadoutItems(): Array<{
      key: string;
      label: string;
      value: string;
    }> {
      const state = sim.getState();
      const items: Array<{ key: string; label: string; value: string }> = [
        {
          key: 'model',
          label: '模型',
          value: state.params.model === 'resistor' ? '纯电阻棒' : '纯电容棒'
        },
        {
          key: 'time',
          label: 't',
          value: `${state.time.toFixed(2)} s`
        },
        {
          key: 'velocity',
          label: 'v',
          value: `${state.velocity.toFixed(2)} m/s`
        },
        {
          key: 'acceleration',
          label: 'a',
          value: `${state.acceleration.toFixed(2)} m/s²`
        },
        {
          key: 'magneticForce',
          label: 'F安',
          value: `${state.magneticForce.toFixed(2)} N`
        },
        {
          key: 'current',
          label: 'I',
          value: `${state.current.toFixed(2)} A`
        },
        {
          key: 'heatingPower',
          label: 'P',
          value: `${state.heatingPower.toFixed(2)} W`
        }
      ];
      if (
        state.params.model === 'resistor' &&
        state.terminalVelocity !== null
      ) {
        items.push({
          key: 'terminalVelocity',
          label: 'vₘ',
          value: `${state.terminalVelocity.toFixed(2)} m/s`
        });
      } else {
        items.push({
          key: 'equivalentMass',
          label: 'm*',
          value: `${state.equivalentMass.toFixed(2)} kg`
        });
      }
      return items;
    }
  };
}

export type { RodModel };
