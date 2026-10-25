import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createInclineSpringView } from './scene.view';
import {
  createInclineSpringSim,
  type InclineSpringParams,
  type InclineSpringState
} from './scene.sim';
import type { ReadoutItem } from '../../platform/readout';

export type CreateInclineSpringSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: InclineSpringState) => void;
};
export function createInclineSpringScene(
  options: CreateInclineSpringSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): InclineSpringState;
  getSnapshot(): InclineSpringState;
  getParams(): InclineSpringParams;
  setParams(next: Partial<InclineSpringParams>): InclineSpringParams;
  reset(): void;
  getReadoutItems(): ReadoutItem[];
} {
  const sim = createInclineSpringSim();
  const view = createInclineSpringView({
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
    resize() {
      view.resize();
    },
    setTheme(theme: TeachingTheme) {
      view.setTheme(theme);
      base.renderAndEmit();
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints) {
      view.setMode(mode, hints);
      base.renderAndEmit();
    },
    getState: () => sim.getState(),
    getSnapshot: () => sim.getSnapshot(),
    getParams: () => sim.getParams(),
    setParams: base.wrapAction((next: Partial<InclineSpringParams>) =>
      sim.setParams(next)
    ),
    reset: base.wrapAction(() => sim.reset()),
    getReadoutItems() {
      const s = sim.getState();
      return [
        { key: 'status', label: '状态', value: s.status },
        {
          key: 'velocity',
          label: '速度 v',
          value: s.velocity,
          digits: 2,
          unit: 'm/s'
        },
        {
          key: 'acceleration',
          label: '加速度 a',
          value: s.acceleration,
          digits: 2,
          unit: 'm/s²'
        },
        {
          key: 'spring-force',
          label: '弹力 F弹',
          value: s.springForce,
          digits: 1,
          unit: 'N'
        },
        {
          key: 'total-energy',
          label: '总能量 E总',
          value: s.totalEnergy,
          digits: 2,
          unit: 'J'
        }
      ];
    }
  };
}
