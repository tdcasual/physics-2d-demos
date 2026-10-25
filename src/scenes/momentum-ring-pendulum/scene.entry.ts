import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createRingPendulumView } from './scene.view';
import {
  createRingPendulumSim,
  type RingPendulumParams,
  type RingPendulumState
} from './scene.sim';
import type { ReadoutItem } from '../../platform/readout';
export type CreateRingPendulumSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: RingPendulumState) => void;
};
function asBool(v: unknown): boolean {
  return (
    v === true || v === 1 || v === '1' || String(v).toLowerCase() === 'true'
  );
}
export function createRingPendulumScene(
  options: CreateRingPendulumSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): RingPendulumState;
  getSnapshot(): RingPendulumState;
  getParams(): RingPendulumParams;
  setParams(next: Partial<RingPendulumParams>): RingPendulumParams;
  reset(): void;
  getReadoutItems(): ReadoutItem[];
} {
  const sim = createRingPendulumSim();
  const view = createRingPendulumView({
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
    setParams: base.wrapAction((next: Partial<RingPendulumParams>) =>
      sim.setParams(next)
    ),
    reset: base.wrapAction(() => sim.reset()),
    getReadoutItems(): ReadoutItem[] {
      const s = sim.getState();
      return [
        {
          key: 'ringVelocity',
          label: '圆环速度',
          value: s.ringVelocity,
          digits: 2,
          unit: 'm/s'
        },
        {
          key: 'ballVelocity',
          label: '摆球速度',
          value: s.ballVelocity,
          digits: 2,
          unit: 'm/s'
        },
        {
          key: 'horizontalMomentum',
          label: '水平动量',
          value: s.horizontalMomentum,
          digits: 3,
          unit: 'kg·m/s'
        }
      ];
    }
  };
}
export { asBool };
