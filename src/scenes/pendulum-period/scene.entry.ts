import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createPendulumSim,
  type PendulumParams,
  type PendulumState
} from './scene.sim';
import { createPendulumView } from './scene.view';

export type CreatePendulumSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: PendulumState) => void;
};

export function createPendulumScene(options: CreatePendulumSceneOptions = {}) {
  const sim = createPendulumSim();
  const view = createPendulumView({
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
    getState: (): PendulumState => sim.getState(),
    getSnapshot: (): PendulumState => sim.getSnapshot(),
    getParams: (): PendulumParams => sim.getParams(),
    setParams: base.wrapAction((next: Partial<PendulumParams>) =>
      sim.setParams(next)
    ),
    startPhotogate: base.wrapAction(() => sim.startPhotogate()),
    resetMeasurement: base.wrapAction(() => sim.resetMeasurement()),
    resetSmallAngle: base.wrapAction(() => sim.resetSmallAngle()),
    reset: base.wrapAction(() => sim.reset()),
    getReadoutItems() {
      const state = sim.getState();
      return [
        {
          key: 'angle',
          label: '摆角 θ',
          value: `${((state.angleRad * 180) / Math.PI).toFixed(1)}°`
        },
        {
          key: 'period',
          label: '小角周期 T',
          value: `${state.period.toFixed(2)} s`
        },
        {
          key: 'speed',
          label: '线速度 v',
          value: `${state.speed.toFixed(2)} m/s`
        },
        {
          key: 'tension',
          label: '绳张力 F_T',
          value: `${state.tension.toFixed(2)} N`
        },
        {
          key: 'measuredGravity',
          label: '测得 g',
          value:
            state.measuredGravity === null
              ? '--'
              : `${state.measuredGravity.toFixed(2)} m/s²`
        }
      ];
    }
  };
}
