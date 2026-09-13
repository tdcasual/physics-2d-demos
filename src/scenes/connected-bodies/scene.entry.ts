import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createConnectedBodiesView } from './scene.view';
import {
  createConnectedBodiesSim,
  type ConnectedBodiesParams,
  type ConnectedBodiesState,
  type CutTarget
} from './scene.sim';
export type CreateConnectedBodiesSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: ConnectedBodiesState) => void;
};
export function createConnectedBodiesScene(
  options: CreateConnectedBodiesSceneOptions = {}
) {
  const sim = createConnectedBodiesSim();
  const view = createConnectedBodiesView({
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
    getState: (): ConnectedBodiesState => sim.getState(),
    getSnapshot: (): ConnectedBodiesState => sim.getSnapshot(),
    getParams: (): ConnectedBodiesParams => sim.getParams(),
    setParams: base.wrapAction((next: Partial<ConnectedBodiesParams>) =>
      sim.setParams(next)
    ),
    cut: base.wrapAction((target: CutTarget) => sim.cut(target)),
    reset: base.wrapAction(() => sim.reset()),
    getReadoutItems() {
      const s = sim.getState();
      return [
        {
          key: 'accelerationA',
          label: '球 A 加速度',
          value: `${s.accelerationA.toFixed(1)} m/s²`
        },
        {
          key: 'accelerationB',
          label: '球 B 加速度',
          value: `${s.accelerationB.toFixed(1)} m/s²`
        },
        {
          key: 'upperForce',
          label: '上方连接力',
          value: `${s.upperForce.toFixed(1)} N`
        },
        {
          key: 'lowerForce',
          label: '下方连接力',
          value: `${s.lowerForce.toFixed(1)} N`
        }
      ];
    }
  };
}
