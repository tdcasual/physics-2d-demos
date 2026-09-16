import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
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
      { key: 'time', label: 't', value: `${s.time.toFixed(2)} s` },
      {
        key: 'velocity',
        label: 'v',
        value: `${s.velocity.toFixed(2)} m/s`
      },
      {
        key: 'displacement',
        label: 'x',
        value: `${s.displacement.toFixed(2)} m`
      },
      {
        key: 'status',
        label: '状态',
        value: s.stopped ? '瞬时静止' : '运动中'
      },
      {
        key: 'formulaV',
        label: 'v(t)',
        value: 'v₀ + at'
      },
      {
        key: 'formulaX',
        label: 'x(t)',
        value: 'v₀t + ½at²'
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
    stepFrame: base.wrapAction((dt?: number) => sim.stepFrame(dt)),
    getReadoutItems
  };
}
