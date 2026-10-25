import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createOrbitCriticalView } from './scene.view';
import {
  createOrbitCriticalSim,
  type OrbitCriticalParams,
  type OrbitCriticalState
} from './scene.sim';
import type { ReadoutItem } from '../../platform/readout';

export type CreateOrbitCriticalSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: OrbitCriticalState) => void;
};
export function createOrbitCriticalScene(
  options: CreateOrbitCriticalSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): OrbitCriticalState;
  getSnapshot(): OrbitCriticalState;
  getParams(): OrbitCriticalParams;
  setParams(next: Partial<OrbitCriticalParams>): OrbitCriticalParams;
  reset(): void;
  getReadoutItems(): ReadoutItem[];
} {
  const sim = createOrbitCriticalSim();
  const view = createOrbitCriticalView({
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
    setParams: base.wrapAction((next: Partial<OrbitCriticalParams>) =>
      sim.setParams(next)
    ),
    reset: base.wrapAction(() => sim.reset()),
    getReadoutItems() {
      const s = sim.getState();
      return [
        {
          key: 'speed',
          label: '瞬时速度 v',
          value: s.speed,
          digits: 2,
          unit: 'm/s'
        },
        {
          key: 'normal',
          label: '支持力 Fₙ',
          value: s.normalForce,
          digits: 2,
          unit: 'N'
        },
        {
          key: 'accel',
          label: '向心加速度 aᵣ',
          value: s.speed ** 2 / s.radius,
          digits: 2,
          unit: 'm/s²'
        },
        {
          key: 'critical',
          label: '临界底速',
          value: s.criticalBottomSpeed,
          digits: 2,
          unit: 'm/s'
        },
        { key: 'status', label: '状态', value: s.status }
      ];
    }
  };
}
