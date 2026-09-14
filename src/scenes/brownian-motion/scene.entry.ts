import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createBrownianView } from './scene.view';
import {
  createBrownianSim,
  type BrownianParams,
  type BrownianState
} from './scene.sim';
export type CreateBrownianSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: BrownianState) => void;
};
export function createBrownianScene(
  options: CreateBrownianSceneOptions = {}
): SceneLifecycle & {
  getState(): BrownianState;
  getSnapshot(): BrownianState;
  getParams(): BrownianParams;
  setParams(next: Partial<BrownianParams>): BrownianParams;
  reset(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  resize(): void;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
} {
  const sim = createBrownianSim();
  const view = createBrownianView({
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
    setParams: base.wrapAction((next: Partial<BrownianParams>) =>
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
          key: 'molecularSpeed',
          label: '分子平均速率 v',
          value: `${s.molecularSpeed.toFixed(2)} a.u.`
        },
        {
          key: 'instantCollisions',
          label: '表面瞬时撞击',
          value: `${s.instantCollisions} 次/帧`
        },
        {
          key: 'netForce',
          label: '不平衡合力 F合',
          value: `${s.netForce.toFixed(2)}`
        },
        { key: 'status', label: '状态', value: s.status }
      ];
    }
  };
}
