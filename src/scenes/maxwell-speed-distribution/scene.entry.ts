import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createMaxwellView } from './scene.view';
import {
  createMaxwellSim,
  type MaxwellParams,
  type MaxwellState
} from './scene.sim';
import type { ReadoutItem } from '../../platform/readout';
export type CreateMaxwellSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: MaxwellState) => void;
};
function asBool(v: unknown): boolean {
  return (
    v === true || v === 1 || v === '1' || String(v).toLowerCase() === 'true'
  );
}
export function createMaxwellScene(
  options: CreateMaxwellSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): MaxwellState;
  getSnapshot(): MaxwellState;
  getParams(): MaxwellParams;
  setParams(next: Partial<MaxwellParams>): MaxwellParams;
  reset(): void;
  getReadoutItems(): ReadoutItem[];
} {
  const sim = createMaxwellSim();
  const view = createMaxwellView({
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
  return {
    ...base,
    getState: () => sim.getState(),
    getSnapshot: () => sim.getSnapshot(),
    getParams: () => sim.getParams(),
    setParams: base.wrapAction((next: Partial<MaxwellParams>) =>
      sim.setParams(next)
    ),
    reset: base.wrapAction(() => sim.reset()),
    getReadoutItems(): ReadoutItem[] {
      const s = sim.getState();
      return [
        {
          key: 'mostProbable',
          label: '最可几速率',
          value: s.mostProbable,
          digits: 0,
          unit: 'm/s'
        },
        {
          key: 'meanSpeed',
          label: '平均速率',
          value: s.meanSpeed,
          digits: 0,
          unit: 'm/s'
        },
        {
          key: 'rmsSpeed',
          label: '方均根速率',
          value: s.rmsSpeed,
          digits: 0,
          unit: 'm/s'
        }
      ];
    }
  };
}
export { asBool };
