import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createConnectedBodiesInclineView } from './scene.view';
import {
  createConnectedBodiesInclineSim,
  type ConnectedBodiesInclineParams,
  type ConnectedBodiesInclineState
} from './scene.sim';

export type CreateConnectedBodiesInclineSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: ConnectedBodiesInclineState) => void;
};

export function createConnectedBodiesInclineScene(
  options: CreateConnectedBodiesInclineSceneOptions = {}
): SceneLifecycle & {
  getState(): ConnectedBodiesInclineState;
  getSnapshot(): ConnectedBodiesInclineState;
  getParams(): ConnectedBodiesInclineParams;
  setParams(
    next: Partial<ConnectedBodiesInclineParams>
  ): ConnectedBodiesInclineParams;
  reset(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  resize(): void;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
} {
  const sim = createConnectedBodiesInclineSim();
  const view = createConnectedBodiesInclineView({
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
    setParams: base.wrapAction((next: Partial<ConnectedBodiesInclineParams>) =>
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
          key: 'acceleration',
          label: '系统加速度',
          value: `${s.acceleration.toFixed(2)} m/s²`
        },
        { key: 'tension', label: '绳张力', value: `${s.tension.toFixed(2)} N` },
        {
          key: 'friction',
          label: '摩擦力',
          value: `${s.friction.toFixed(2)} N`
        },
        { key: 'normal', label: '支持力', value: `${s.normal.toFixed(2)} N` }
      ];
    }
  };
}
