import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createSingleSlitSim,
  type SingleSlitHandle,
  type SingleSlitParams,
  type SingleSlitState
} from './scene.sim';
import { createSingleSlitView } from './scene.view';

export type CreateSingleSlitSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: SingleSlitState) => void;
};

export function createSingleSlitScene(
  options: CreateSingleSlitSceneOptions = {}
) {
  const sim = createSingleSlitSim();
  const view = createSingleSlitView({
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

  function getReadoutItems() {
    const state = sim.getState();
    return [
      {
        key: 'theta',
        label: '衍射角 θ',
        value: `${state.angle.toFixed(3)}°`
      },
      {
        key: 'intensity',
        label: 'I/I₀',
        value: state.intensity.toFixed(3)
      },
      {
        key: 'firstMinimum',
        label: '第一暗纹 x₁',
        value: `${state.firstMinimum.toFixed(2)} mm`
      },
      {
        key: 'centralWidth',
        label: '中央明纹 Δx',
        value: `${state.centralWidth.toFixed(2)} mm`
      },
      { key: 'status', label: '状态', value: state.status },
      {
        key: 'formulaI',
        label: 'I(θ)',
        value: 'I/I₀ = (sinβ/β)²',
        layout: 'full' as const
      },
      {
        key: 'formulaX1',
        label: 'x₁',
        value: 'x₁ ≈ λL/a',
        layout: 'full' as const
      },
      {
        key: 'formulaDx',
        label: 'Δx',
        value: 'Δx ≈ 2λL/a',
        layout: 'full' as const
      }
    ];
  }

  return {
    ...base,
    getState: (): SingleSlitState => sim.getState(),
    getSnapshot: (): SingleSlitState => sim.getSnapshot(),
    getParams: (): SingleSlitParams => sim.getParams(),
    setParams: base.wrapAction(
      (next: Partial<SingleSlitParams>): SingleSlitParams => sim.setParams(next)
    ),
    pickHandle(x: number, y: number): SingleSlitHandle {
      return sim.pickHandle(x, y);
    },
    moveHandle: base.wrapAction(
      (handle: Exclude<SingleSlitHandle, null>, x: number, y: number): void => {
        sim.moveHandle(handle, x, y);
      }
    ),
    stepFrame: base.wrapAction((dt?: number) => sim.stepFrame(dt)),
    getReadoutItems
  };
}
