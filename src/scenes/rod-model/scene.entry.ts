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
import type { ReadoutItem } from '../../platform/readout';

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
  getReadoutItems(): ReadoutItem[];
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
    getReadoutItems(): ReadoutItem[] {
      const state = sim.getState();
      const items: ReadoutItem[] = [
        {
          key: 'model',
          label: '模型',
          value: state.params.model === 'resistor' ? '纯电阻棒' : '纯电容棒'
        },
        {
          key: 'time',
          label: 't',
          value: state.time,
          digits: 2,
          unit: 's'
        },
        {
          key: 'velocity',
          label: 'v',
          value: state.velocity,
          digits: 2,
          unit: 'm/s'
        },
        {
          key: 'acceleration',
          label: 'a',
          value: state.acceleration,
          digits: 2,
          unit: 'm/s²'
        },
        {
          key: 'magneticForce',
          label: 'F安',
          value: state.magneticForce,
          digits: 2,
          unit: 'N'
        },
        {
          key: 'current',
          label: 'I',
          value: state.current,
          digits: 2,
          unit: 'A'
        },
        {
          key: 'heatingPower',
          label: 'P',
          value: state.heatingPower,
          digits: 2,
          unit: 'W'
        }
      ];
      if (
        state.params.model === 'resistor' &&
        state.terminalVelocity !== null
      ) {
        items.push({
          key: 'terminalVelocity',
          label: 'vₘ',
          value: state.terminalVelocity,
          digits: 2,
          unit: 'm/s'
        });
      } else {
        items.push({
          key: 'equivalentMass',
          label: 'm*',
          value: state.equivalentMass,
          digits: 2,
          unit: 'kg'
        });
      }
      return items;
    }
  };
}

export type { RodModel };
