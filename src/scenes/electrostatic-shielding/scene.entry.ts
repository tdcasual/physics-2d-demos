import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createElectrostaticShieldingView } from './scene.view';
import {
  createElectrostaticShieldingSim,
  type ElectrostaticShieldingParams,
  type ElectrostaticShieldingState
} from './scene.sim';

export type CreateElectrostaticShieldingSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: ElectrostaticShieldingState) => void;
};

export function createElectrostaticShieldingScene(
  options: CreateElectrostaticShieldingSceneOptions = {}
): SceneLifecycle & {
  getState(): ElectrostaticShieldingState;
  getSnapshot(): ElectrostaticShieldingState;
  getParams(): ElectrostaticShieldingParams;
  setParams(
    next: Partial<ElectrostaticShieldingParams>
  ): ElectrostaticShieldingParams;
  setProbe(x: number, y: number): ElectrostaticShieldingParams;
  pickProbe(x: number, y: number): boolean;
  reset(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  resize(): void;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
} {
  const sim = createElectrostaticShieldingSim();
  const view = createElectrostaticShieldingView({
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
  let dragging = false;
  const onPointerDown = (event: PointerEvent) => {
    if (!canvas) return;
    const point = view.toBasePoint(event.clientX, event.clientY);
    if (!point || !sim.pickProbe(point.x, point.y)) return;
    dragging = true;
    canvas.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent) => {
    if (!dragging) return;
    const point = view.toBasePoint(event.clientX, event.clientY);
    if (!point) return;
    sim.setProbe(point.x, point.y);
    base.renderAndEmit();
  };
  const onPointerUp = (event: PointerEvent) => {
    dragging = false;
    try {
      canvas?.releasePointerCapture(event.pointerId);
    } catch {
      /* no-op */
    }
  };
  canvas?.addEventListener('pointerdown', onPointerDown);
  canvas?.addEventListener('pointermove', onPointerMove);
  canvas?.addEventListener('pointerup', onPointerUp);
  canvas?.addEventListener('pointercancel', onPointerUp);
  return {
    ...base,
    getState: () => sim.getState(),
    getSnapshot: () => sim.getSnapshot(),
    getParams: () => sim.getParams(),
    setParams: base.wrapAction((next: Partial<ElectrostaticShieldingParams>) =>
      sim.setParams(next)
    ),
    setProbe: base.wrapAction((x: number, y: number) => sim.setProbe(x, y)),
    pickProbe: (x: number, y: number) => sim.pickProbe(x, y),
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
      const state = sim.getState();
      return [
        { key: 'region', label: '当前物理空间区域', value: state.region },
        {
          key: 'measuredField',
          label: '实测合场强 |E|',
          value: `${state.measuredField.toFixed(2)} V/m`
        },
        {
          key: 'innerInducedCharge',
          label: '内表面感应电荷',
          value: `${state.innerInducedCharge.toFixed(1)} q`
        },
        {
          key: 'outerNetCharge',
          label: '外表面净电荷',
          value: `${state.outerNetCharge.toFixed(1)} q`
        },
        { key: 'status', label: '状态', value: state.status }
      ];
    },
    dispose() {
      canvas?.removeEventListener('pointerdown', onPointerDown);
      canvas?.removeEventListener('pointermove', onPointerMove);
      canvas?.removeEventListener('pointerup', onPointerUp);
      canvas?.removeEventListener('pointercancel', onPointerUp);
      base.dispose();
    }
  };
}
