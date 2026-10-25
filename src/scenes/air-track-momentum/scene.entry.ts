import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createAirTrackMomentumView } from './scene.view';
import {
  createAirTrackMomentumSim,
  type AirTrackMomentumParams,
  type AirTrackMomentumState
} from './scene.sim';
import type { ReadoutItem } from '../../platform/readout';

export type CreateAirTrackMomentumSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: AirTrackMomentumState) => void;
};

export function createAirTrackMomentumScene(
  options: CreateAirTrackMomentumSceneOptions = {}
): SceneLifecycle & {
  getState(): AirTrackMomentumState;
  getSnapshot(): AirTrackMomentumState;
  getParams(): AirTrackMomentumParams;
  setParams(next: Partial<AirTrackMomentumParams>): AirTrackMomentumParams;
  relaunch(): void;
  reset(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  resize(): void;
  getReadoutItems(): ReadoutItem[];
} {
  const sim = createAirTrackMomentumSim();
  const view = createAirTrackMomentumView({
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
    setParams: base.wrapAction((next: Partial<AirTrackMomentumParams>) =>
      sim.setParams(next)
    ),
    relaunch: base.wrapAction(() => sim.relaunch()),
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
          key: 'totalMomentum',
          label: '碰撞前总动量',
          value: s.totalMomentum,
          digits: 2,
          unit: 'kg·m/s'
        },
        {
          key: 'totalMomentumAfter',
          label: '碰撞后总动量',
          value: s.totalMomentumAfter,
          digits: 2,
          unit: 'kg·m/s'
        },
        {
          key: 'impulse',
          label: '冲量 J',
          value: s.impulse,
          digits: 2,
          unit: 'N·s'
        },
        {
          key: 'force',
          label: '接触力 F',
          value: s.force,
          digits: 2,
          unit: 'N'
        },
        { key: 'vA', label: '红滑块速度', value: s.vA, digits: 2, unit: 'm/s' },
        { key: 'vB', label: '蓝滑块速度', value: s.vB, digits: 2, unit: 'm/s' }
      ];
    }
  };
}
