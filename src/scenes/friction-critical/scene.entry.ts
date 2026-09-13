import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createFrictionSim,
  frictionConstants,
  type FrictionParams,
  type FrictionState
} from './scene.sim';
import { createFrictionView } from './scene.view';
export type CreateFrictionSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: FrictionState) => void;
};
export function createFrictionScene(
  options: CreateFrictionSceneOptions = {}
): SceneLifecycle & {
  getState(): FrictionState;
  getSnapshot(): FrictionState;
  getParams(): FrictionParams;
  setParams(next: Partial<FrictionParams>): FrictionParams;
  reset(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  resize(): void;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
} {
  const sim = createFrictionSim();
  const view = createFrictionView({
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
  const canvas = options.canvas;
  const onPointerDown = (event: PointerEvent) => {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x =
      ((event.clientX - rect.left) * frictionConstants.baseWidth) / rect.width;
    if (x < frictionConstants.graphLeft || x > frictionConstants.graphRight)
      return;
    const force =
      frictionConstants.forceMin +
      ((x - frictionConstants.graphLeft) /
        (frictionConstants.graphRight - frictionConstants.graphLeft)) *
        frictionConstants.forceMax;
    sim.setParams({ force });
    base.renderAndEmit();
  };
  canvas?.addEventListener('pointerdown', onPointerDown);
  return {
    ...base,
    getState: () => sim.getState(),
    getSnapshot: () => sim.getSnapshot(),
    getParams: () => sim.getParams(),
    setParams: base.wrapAction((next: Partial<FrictionParams>) =>
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
        { key: 'status', label: '状态', value: s.status },
        {
          key: 'friction',
          label: '接触面摩擦力 f',
          value: s.friction.toFixed(2) + ' N'
        },
        {
          key: 'maxStatic',
          label: '最大静摩擦力 fₘₐₓ',
          value: s.maxStatic.toFixed(2) + ' N'
        },
        {
          key: 'acceleration',
          label: '加速度 a',
          value: s.acceleration.toFixed(2) + ' m/s²'
        }
      ];
    },
    dispose() {
      canvas?.removeEventListener('pointerdown', onPointerDown);
      base.dispose();
    }
  };
}
