import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { SceneLifecycle } from '../../platform/scene-contract';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createAmpereBalanceView } from './scene.view';
import {
  createAmpereBalanceSim,
  formatFixed,
  type AmpereBalanceParams,
  type AmpereBalanceState,
  type AmpereCurrentDirection,
  type AmpereFieldDirection
} from './scene.sim';

export type CreateAmpereBalanceSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: AmpereBalanceState) => void;
};

export function createAmpereBalanceScene(
  options: CreateAmpereBalanceSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): AmpereBalanceState;
  getSnapshot(): AmpereBalanceState;
  getParams(): AmpereBalanceParams;
  setParams(params: Partial<AmpereBalanceParams>): AmpereBalanceParams;
  setFieldDirection(value: AmpereFieldDirection): void;
  setCurrentDirection(value: AmpereCurrentDirection): void;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
  subscribe(listener: () => void): () => void;
} {
  const sim = createAmpereBalanceSim();
  const view = createAmpereBalanceView({
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
  function getReadoutItems(): Array<{
    key: string;
    label: string;
    value: string;
  }> {
    const state = sim.getState();
    return [
      {
        key: 'ampereForce',
        label: '安培力 Fₐ',
        value: `${formatFixed(state.ampereForce)} N`
      },
      {
        key: 'normalForce',
        label: '支持力 Fₙ',
        value: `${formatFixed(state.normalForce)} N`
      },
      {
        key: 'frictionRequired',
        label: '所需摩擦力 f需',
        value: `${formatFixed(state.frictionRequired)} N`
      },
      {
        key: 'acceleration',
        label: '沿斜面分量 a∥',
        value: `${formatFixed(state.acceleration)} m/s²`
      },
      {
        key: 'trend',
        label: '状态',
        value: state.detached ? '已脱离斜面' : state.trend
      }
    ];
  }
  return {
    ...base,
    getState: () => sim.getState(),
    getSnapshot: () => sim.getSnapshot(),
    getParams: () => sim.getParams(),
    setParams: base.wrapAction((next: Partial<AmpereBalanceParams>) =>
      sim.setParams(next)
    ),
    setFieldDirection: base.wrapAction((value: AmpereFieldDirection) => {
      sim.setParams({ fieldDirection: value });
    }),
    setCurrentDirection: base.wrapAction((value: AmpereCurrentDirection) => {
      sim.setParams({ currentDirection: value });
    }),
    getReadoutItems
  };
}
