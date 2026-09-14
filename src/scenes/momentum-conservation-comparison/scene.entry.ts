import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createMomentumComparisonSim,
  type MomentumCollision,
  type MomentumComparisonParams,
  type MomentumComparisonState,
  type MomentumScheme
} from './scene.sim';
import { createMomentumComparisonView } from './scene.view';

export type CreateMomentumComparisonSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: MomentumComparisonState) => void;
};

export function asMomentumScheme(value: unknown): MomentumScheme | undefined {
  return value === 'chute' || value === 'airTrack' || value === 'pendulum'
    ? value
    : undefined;
}

export function asMomentumCollision(
  value: unknown
): MomentumCollision | undefined {
  return value === 'elastic' || value === 'partial' || value === 'inelastic'
    ? value
    : undefined;
}

export function createMomentumComparisonScene(
  options: CreateMomentumComparisonSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): MomentumComparisonState;
  getSnapshot(): MomentumComparisonState;
  getParams(): MomentumComparisonParams;
  setParams(next: Partial<MomentumComparisonParams>): MomentumComparisonParams;
  reset(): void;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
} {
  const sim = createMomentumComparisonSim();
  const view = createMomentumComparisonView({
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
    setParams: base.wrapAction((next: Partial<MomentumComparisonParams>) =>
      sim.setParams(next)
    ),
    reset: base.wrapAction(() => sim.reset()),
    getReadoutItems() {
      const state = sim.getState();
      return [
        {
          key: 'totalMomentumBefore',
          label: '碰前总动量',
          value: state.totalMomentumBefore.toFixed(2)
        },
        {
          key: 'totalMomentumAfter',
          label: '碰后总动量',
          value: state.totalMomentumAfter.toFixed(2)
        },
        { key: 'impulse', label: '系统冲量', value: state.impulse.toFixed(2) },
        { key: 'status', label: '状态', value: state.status }
      ];
    }
  };
}
