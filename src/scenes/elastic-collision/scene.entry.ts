import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  collisionConstants,
  createCollisionSim,
  type CollisionParams,
  type CollisionState
} from './scene.sim';
import { createCollisionView } from './scene.view';

export type CreateCollisionSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: CollisionState) => void;
};
export function createCollisionScene(
  options: CreateCollisionSceneOptions = {}
): SceneLifecycle & {
  getState(): CollisionState;
  getSnapshot(): CollisionState;
  getParams(): CollisionParams;
  setParams(next: Partial<CollisionParams>): CollisionParams;
  reset(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  resize(): void;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
} {
  const sim = createCollisionSim();
  const view = createCollisionView({
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
    setParams: base.wrapAction((next: Partial<CollisionParams>) =>
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
          key: 'momentumA',
          label: 'A 动量 pₐ',
          value: s.momentumA.toFixed(2) + ' kg·m/s'
        },
        {
          key: 'momentumB',
          label: 'B 动量 pᵦ',
          value: s.momentumB.toFixed(2) + ' kg·m/s'
        },
        {
          key: 'totalMomentum',
          label: '系统总动量 Σp',
          value: s.totalMomentum.toFixed(2) + ' kg·m/s'
        },
        {
          key: 'totalEnergy',
          label: '系统总动能 ΣEₖ',
          value: s.totalEnergy.toFixed(2) + ' J'
        },
        {
          key: 'collision',
          label: '状态',
          value: s.collided ? '碰撞完成（e = 1）' : '等待碰撞'
        }
      ];
    }
  };
}
export { collisionConstants };
