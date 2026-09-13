import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  conveyorConstants,
  createConveyorSim,
  type BeltDirection,
  type ConveyorParams,
  type ConveyorState,
  type ReleaseTarget
} from './scene.sim';
import { createConveyorView } from './scene.view';

export type CreateConveyorSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: ConveyorState) => void;
};

export function createConveyorScene(
  options: CreateConveyorSceneOptions = {}
): SceneLifecycle & {
  getState(): ConveyorState;
  getSnapshot(): ConveyorState;
  getParams(): ConveyorParams;
  setParams(next: Partial<ConveyorParams>): ConveyorParams;
  release(target?: ReleaseTarget): void;
  placeAt(s: number): void;
  reset(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  resize(): void;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
} {
  const sim = createConveyorSim();
  const view = createConveyorView({
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
      (event.clientX - rect.left) * (conveyorConstants.baseWidth / rect.width);
    const y =
      (event.clientY - rect.top) * (conveyorConstants.baseHeight / rect.height);
    const x0 = conveyorConstants.beltStartX;
    const y0 = conveyorConstants.beltStartY;
    const dx = conveyorConstants.beltEndX - x0;
    const dy = conveyorConstants.beltEndY - y0;
    const t = Math.max(
      0,
      Math.min(1, ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy))
    );
    const px = x0 + dx * t;
    const py = y0 + dy * t;
    if (Math.hypot(x - px, y - py) < 58)
      placeAt(t * conveyorConstants.beltLength);
  };
  function placeAt(s: number): void {
    sim.placeAt(s);
    base.renderAndEmit();
  }
  canvas?.addEventListener('pointerdown', onPointerDown);
  return {
    ...base,
    getState: () => sim.getState(),
    getSnapshot: () => sim.getSnapshot(),
    getParams: () => sim.getParams(),
    setParams: base.wrapAction((next: Partial<ConveyorParams>) =>
      sim.setParams(next)
    ),
    release: base.wrapAction((target?: ReleaseTarget) => sim.release(target)),
    placeAt: base.wrapAction((s: number) => sim.placeAt(s)),
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
        { key: 'status', label: '相对状态', value: s.status },
        {
          key: 'acceleration',
          label: '加速度 a',
          value: s.acceleration.toFixed(2) + ' m/s²'
        },
        {
          key: 'velocity',
          label: '物块速度 v',
          value: s.blockVelocity.toFixed(2) + ' m/s'
        },
        {
          key: 'relativeVelocity',
          label: '相对速度',
          value: s.relativeVelocity.toFixed(2) + ' m/s'
        },
        {
          key: 'friction',
          label: '摩擦力 f',
          value: s.friction.toFixed(2) + ' N'
        },
        {
          key: 'gravityComponent',
          label: '重力分量',
          value: s.gravityComponent.toFixed(2) + ' N/kg'
        }
      ];
    },
    dispose() {
      canvas?.removeEventListener('pointerdown', onPointerDown);
      base.dispose();
    }
  };
}

export type ConveyorScene = ReturnType<typeof createConveyorScene>;
export type { BeltDirection };
