import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createFeederSim,
  feederConstants,
  type FeederParams,
  type FeederState
} from './scene.sim';
import { createFeederView } from './scene.view';

export type CreateFeederSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: FeederState) => void;
};

export function createFeederScene(
  options: CreateFeederSceneOptions = {}
): SceneLifecycle & {
  getState(): FeederState;
  getSnapshot(): FeederState;
  getParams(): FeederParams;
  setParams(next: Partial<FeederParams>): FeederParams;
  reset(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  resize(): void;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
} {
  const sim = createFeederSim();
  const view = createFeederView({
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
    getState: () => sim.getState(),
    getSnapshot: () => sim.getSnapshot(),
    getParams: () => sim.getParams(),
    setParams: base.wrapAction((next: Partial<FeederParams>) =>
      sim.setParams(next)
    ),
    reset: base.wrapAction(() => sim.reset()),
    setTheme(theme: TeachingTheme) {
      view.setTheme(theme);
      base.renderAndEmit();
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints) {
      view.setMode(mode, hints);
      base.renderAndEmit();
    },
    resize() {
      view.resize();
    },
    getReadoutItems() {
      const s = sim.getState();
      return [
        {
          key: 'water-depth',
          label: '水深 h',
          value: `${s.effectiveDepth.toFixed(2)} m`
        },
        {
          key: 'buoyant-force',
          label: '浮力 F浮',
          value: `${s.buoyantForce.toFixed(1)} N`
        },
        {
          key: 'spring-force',
          label: '弹力 F弹',
          value: `${s.springForce.toFixed(1)} N`
        },
        {
          key: 'sensor-resistance',
          label: '传感电阻 R₁',
          value: `${s.sensorResistance.toFixed(2)} Ω`
        },
        {
          key: 'meter-voltage',
          label: '电压表 U₀',
          value: `${s.meterVoltage.toFixed(2)} V`
        }
      ];
    }
  };
}

export { feederConstants };
