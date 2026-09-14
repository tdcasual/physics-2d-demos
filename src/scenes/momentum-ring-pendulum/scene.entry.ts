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
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
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
    getReadoutItems(): Array<{ key: string; label: string; value: string }> {
      const s = sim.getState();
      return [
        {
          key: 'ringVelocity',
          label: '圆环速度',
          value: `${s.ringVelocity.toFixed(2)} m/s`
        },
        {
          key: 'ballVelocity',
          label: '摆球速度',
          value: `${s.ballVelocity.toFixed(2)} m/s`
        },
        {
          key: 'horizontalMomentum',
          label: '水平动量',
          value: `${s.horizontalMomentum.toFixed(3)} kg·m/s`
        }
      ];
    }
  };
}
export { asBool };
