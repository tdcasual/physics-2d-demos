import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createParallelCapacitorView } from './scene.view';
import {
  createParallelCapacitorSim,
  type CapacitorParams,
  type CapacitorState
} from './scene.sim';
export type CreateParallelCapacitorSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: CapacitorState) => void;
};
export function createParallelCapacitorScene(
  options: CreateParallelCapacitorSceneOptions = {}
) {
  const sim = createParallelCapacitorSim();
  const view = createParallelCapacitorView({
    canvas: options.canvas,
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
  return {
    ...base,
    getState: (): CapacitorState => sim.getState(),
    getSnapshot: (): CapacitorState => sim.getSnapshot(),
    getParams: (): CapacitorParams => sim.getParams(),
    setParams: base.wrapAction((next: Partial<CapacitorParams>) =>
      sim.setParams(next)
    ),
    reset: base.wrapAction(() => sim.reset()),
    getReadoutItems() {
      const s = sim.getState();
      return [
        {
          key: 'capacitanceRatio',
          label: '电容 C',
          value: `${s.capacitanceRatio.toFixed(2)} C₀`
        },
        {
          key: 'voltageRatio',
          label: '电压 U',
          value: `${s.voltageRatio.toFixed(2)} U₀`
        },
        {
          key: 'needleAngle',
          label: '静电计张角 θ',
          value: `${s.needleAngle.toFixed(1)}°`
        },
        {
          key: 'fieldRatio',
          label: '电场强度 E',
          value: `${s.fieldRatio.toFixed(2)} E₀`
        }
      ];
    }
  };
}
