import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createAccelForceSim,
  type AccelForceParams,
  type AccelForceState
} from './scene.sim';
import { createAccelForceView } from './scene.view';

export type CreateAccelForceSceneOptions = {
  canvas?: HTMLCanvasElement;
  graphCanvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: AccelForceState) => void;
};

function formatAccel(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return `${value.toFixed(2)} m/s²`;
}

export function createAccelForceScene(
  options: CreateAccelForceSceneOptions = {}
) {
  const sim = createAccelForceSim();
  const view = createAccelForceView({
    canvas: options.canvas,
    graphCanvas: options.graphCanvas,
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
      { key: 'force', label: '拉力 F', value: `${s.force.toFixed(3)} N` },
      {
        key: 'inverseMass',
        label: '1/M',
        value: `${s.inverseMass.toFixed(2)} kg⁻¹`
      },
      {
        key: 'accelTheory',
        label: 'a理',
        value: formatAccel(s.acceleration)
      },
      { key: 'accelTape', label: 'a仿', value: formatAccel(s.aTape) },
      { key: 'friction', label: 'f', value: `${s.friction.toFixed(3)} N` },
      { key: 'time', label: 't', value: `${s.time.toFixed(2)} s` },
      { key: 'velocity', label: 'v', value: `${s.velocity.toFixed(2)} m/s` },
      { key: 'status', label: '状态', value: s.status }
    ];
  }

  return {
    ...base,
    getState: (): AccelForceState => sim.getState(),
    getSnapshot: (): AccelForceState => sim.getSnapshot(),
    getParams: (): AccelForceParams => sim.getParams(),
    setParams: base.wrapAction(
      (next: Partial<AccelForceParams>): AccelForceParams => sim.setParams(next)
    ),
    release: base.wrapAction(() => sim.release()),
    resetCart: base.wrapAction(() => sim.resetCart()),
    recordPoint: base.wrapAction(() => sim.recordPoint()),
    clearRecords: base.wrapAction(() => sim.clearRecords()),
    stepFrame: base.wrapAction((dt?: number) => sim.stepFrame(dt)),
    startAll: base.wrapAction(() => {
      const state = sim.getState();
      if (state.finished) sim.release();
      else sim.setParams({ autoRun: true });
    }),
    pauseAll: base.wrapAction(() => {
      sim.setParams({ autoRun: false });
    }),
    attachGraphCanvas(canvas: HTMLCanvasElement): void {
      view.attachGraphCanvas(canvas);
      base.renderAndEmit();
    },
    getTransportState(): { isPlaying: boolean; speed: number } {
      const s = sim.getState();
      return { isPlaying: s.params.autoRun && !s.finished, speed: 1 };
    },
    getReadoutItems
  };
}
