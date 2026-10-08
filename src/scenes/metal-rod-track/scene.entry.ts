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
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
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
            value: `${c.stripSum.toFixed(3)} C`
          },
          {
            key: 'charge-formula',
            label: 'BLx/R',
            value: `${c.formula.toFixed(3)} C`
          },
          {
            key: 'charge-x',
            label: '位移 x',
            value: `${c.displacement.toFixed(3)} m`
          },
          {
            key: 'charge-current',
            label: '电流 I',
            value: `${c.current.toFixed(3)} A`
          },
          {
            key: 'charge-velocity',
            label: '速度 v',
            value: `${c.velocity.toFixed(3)} m/s`
          },
          {
            key: 'charge-time',
            label: '时间 t',
            value: `${c.time.toFixed(2)} s`
          }
        ];
      }
      return [
        { key: 'emf', label: '电动势 E', value: `${s.emf.toFixed(2)} V` },
        { key: 'current', label: '电流 I', value: `${s.current.toFixed(2)} A` },
        {
          key: 'force',
          label: '安培力 Fₐ',
          value: `${s.magneticForce.toFixed(2)} N`
        },
        {
          key: 'velocity',
          label: '瞬时速度 v',
          value: `${s.velocity.toFixed(2)} m/s`
        },
        { key: 'status', label: '状态', value: s.status }
      ];
    }
  };
}
