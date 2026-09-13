import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createBoundedMagneticView } from './scene.view';
import {
  createBoundedMagneticSim,
  type BoundedMagneticParams,
  type BoundedMagneticState
} from './scene.sim';
export type CreateBoundedMagneticSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: BoundedMagneticState) => void;
};
export function createBoundedMagneticScene(
  options: CreateBoundedMagneticSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): BoundedMagneticState;
  getSnapshot(): BoundedMagneticState;
  getParams(): BoundedMagneticParams;
  setParams(next: Partial<BoundedMagneticParams>): BoundedMagneticParams;
  reset(): void;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
} {
  const sim = createBoundedMagneticSim();
  const view = createBoundedMagneticView({
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
    setParams: base.wrapAction((next: Partial<BoundedMagneticParams>) =>
      sim.setParams(next)
    ),
    reset: base.wrapAction(() => sim.reset()),
    getReadoutItems() {
      const s = sim.getState();
      return [
        {
          key: 'deflection',
          label: '偏转圆心角 Δθ',
          value: `${s.deflectionAngle.toFixed(1)}°`
        },
        {
          key: 'radius',
          label: '轨道半径 r',
          value: `${s.orbitRadius.toFixed(1)}`
        },
        {
          key: 'position',
          label: '粒子位置 x',
          value: `${s.position.x.toFixed(0)}`
        },
        {
          key: 'time',
          label: '场内运动时间 t',
          value: `${s.time.toFixed(2)} s`
        },
        { key: 'status', label: '状态', value: s.status }
      ];
    }
  };
}
