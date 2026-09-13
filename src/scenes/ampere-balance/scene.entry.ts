import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createAmpereBalanceView } from './scene.view';
import {
  createAmpereBalanceSim,
  type AmpereBalanceParams,
  type AmpereBalanceState,
  type AmpereFieldDirection,
  type AmpereCurrentDirection
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
) {
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
  function getReadoutItems() {
    const state = sim.getState();
    return [
      {
        key: 'ampereForce',
        label: '安培力 Fₐ',
        value: `${state.ampereForce.toFixed(2)} N`
      },
      {
        key: 'normalForce',
        label: '支持力 FN',
        value: `${state.normalForce.toFixed(2)} N`
      },
      {
        key: 'frictionRequired',
        label: '所需摩擦力',
        value: `${state.frictionRequired.toFixed(2)} N`
      },
      {
        key: 'acceleration',
        label: '光滑斜面加速度',
        value: `${state.acceleration.toFixed(2)} m/s²`
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
    getState: (): AmpereBalanceState => sim.getState(),
    getSnapshot: (): AmpereBalanceState => sim.getSnapshot(),
    getParams: (): AmpereBalanceParams => sim.getParams(),
    setParams: base.wrapAction((next: Partial<AmpereBalanceParams>) =>
      sim.setParams(next)
    ),
    setFieldDirection: base.wrapAction((value: AmpereFieldDirection) =>
      sim.setParams({ fieldDirection: value })
    ),
    setCurrentDirection: base.wrapAction((value: AmpereCurrentDirection) =>
      sim.setParams({ currentDirection: value })
    ),
    reset: base.wrapAction(() => sim.reset()),
    getReadoutItems
  };
}
