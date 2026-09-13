import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import { createUvtSim, type UvtParams, type UvtState } from './scene.sim';
import { createUvtView } from './scene.view';
export type CreateUvtSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: UvtState) => void;
};
export function createUvtScene(options: CreateUvtSceneOptions = {}) {
  const sim = createUvtSim();
  const view = createUvtView({
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
    const s = sim.getState();
    return [
      { key: 'time', label: '时间', value: `${s.time.toFixed(2)} s` },
      {
        key: 'velocity',
        label: '瞬时速度',
        value: `${s.velocity.toFixed(2)} m/s`
      },
      {
        key: 'displacement',
        label: '累计位移',
        value: `${s.displacement.toFixed(2)} m`
      }
    ];
  }
  return {
    ...base,
    getState: (): UvtState => sim.getState(),
    getSnapshot: (): UvtState => sim.getSnapshot(),
    getParams: (): UvtParams => sim.getParams(),
    setParams: base.wrapAction(
      (next: Partial<UvtParams>): UvtParams => sim.setParams(next)
    ),
    getReadoutItems
  };
}
