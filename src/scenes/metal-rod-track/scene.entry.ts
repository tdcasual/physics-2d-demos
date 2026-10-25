import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createMetalRodView } from './scene.view';
import {
  createMetalRodSim,
  type MetalRodParams,
  type MetalRodState
} from './scene.sim';
import type { ReadoutItem } from '../../platform/readout';

export type CreateMetalRodSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: MetalRodState) => void;
};

export function createMetalRodScene(
  options: CreateMetalRodSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): MetalRodState;
  getSnapshot(): MetalRodState;
  getParams(): MetalRodParams;
  setParams(next: Partial<MetalRodParams>): MetalRodParams;
  reset(): void;
  getReadoutItems(): ReadoutItem[];
} {
  const sim = createMetalRodSim();
  const view = createMetalRodView({
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
    setParams: base.wrapAction((next: Partial<MetalRodParams>) =>
      sim.setParams(next)
    ),
    reset: base.wrapAction(() => sim.reset()),
    getReadoutItems() {
      const s = sim.getState();
      if (s.mode === 'charge') {
        const c = s.charge;
        // 前三项进入演示读数（readoutKeys），其余只在常规面板显示
        return [
          {
            key: 'charge-sum',
            label: '累计 ΣIΔt',
            value: c.stripSum,
            digits: 3,
            unit: 'C'
          },
          {
            key: 'charge-formula',
            label: 'BLx/R',
            value: c.formula,
            digits: 3,
            unit: 'C'
          },
          {
            key: 'charge-x',
            label: '位移 x',
            value: c.displacement,
            digits: 3,
            unit: 'm'
          },
          {
            key: 'charge-current',
            label: '电流 I',
            value: c.current,
            digits: 3,
            unit: 'A'
          },
          {
            key: 'charge-velocity',
            label: '速度 v',
            value: c.velocity,
            digits: 3,
            unit: 'm/s'
          },
          {
            key: 'charge-time',
            label: '时间 t',
            value: c.time,
            digits: 2,
            unit: 's'
          }
        ];
      }
      return [
        { key: 'emf', label: '电动势 E', value: s.emf, digits: 2, unit: 'V' },
        {
          key: 'current',
          label: '电流 I',
          value: s.current,
          digits: 2,
          unit: 'A'
        },
        {
          key: 'force',
          label: '安培力 Fₐ',
          value: s.magneticForce,
          digits: 2,
          unit: 'N'
        },
        {
          key: 'velocity',
          label: '瞬时速度 v',
          value: s.velocity,
          digits: 2,
          unit: 'm/s'
        },
        { key: 'status', label: '状态', value: s.status }
      ];
    }
  };
}
