import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createOscilloscopeSim,
  type OscilloscopeParams,
  type OscilloscopeState
} from './scene.sim';
import { createOscilloscopeView } from './scene.view';

export type CreateOscilloscopeSceneOptions = {
  canvas?: HTMLCanvasElement;
  graphCanvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: OscilloscopeState) => void;
  initialParams?: Partial<OscilloscopeParams>;
};

export function createOscilloscopeScene(
  options: CreateOscilloscopeSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): OscilloscopeState;
  getSnapshot(): OscilloscopeState;
  getParams(): OscilloscopeParams;
  setParams(params: Partial<OscilloscopeParams>): OscilloscopeParams;
  stepFrame(dt?: number): void;
  startAll(): void;
  pauseAll(): void;
  attachGraphCanvas(canvas: HTMLCanvasElement): void;
  getTransportState(): { isPlaying: boolean; speed: number };
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
  subscribe(listener: () => void): () => void;
} {
  const sim = createOscilloscopeSim(options.initialParams);
  const view = createOscilloscopeView({
    canvas: options.canvas,
    graphCanvas: options.graphCanvas,
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

  function getReadoutItems(): Array<{
    key: string;
    label: string;
    value: string;
  }> {
    const state = sim.getState();
    const ratio = state.cyclesPerScan;
    const n = Math.round(ratio);
    const waveform = !state.params.scanEnabled
      ? '无扫描'
      : state.stable
        ? '稳定'
        : '移动';
    return [
      {
        key: 'signal-frequency',
        label: 'fᵧ',
        value: `${state.params.signalFrequency.toFixed(0)} Hz`
      },
      {
        key: 'scan-frequency',
        label: 'fₓ',
        value: `${state.params.scanFrequency.toFixed(0)} Hz`
      },
      {
        key: 'cycles-per-scan',
        label: 'fᵧ / fₓ',
        value: state.stable ? `${n}` : ratio.toFixed(2)
      },
      { key: 'stable', label: '波形', value: waveform },
      {
        key: 'screen-y',
        label: 'Y 偏转',
        value: state.screenY.toFixed(2)
      }
    ];
  }

  return {
    ...base,
    init(): void {
      // Construction already applied initialParams; sim.reset() restores
      // that session snapshot, so skip it here to keep the first frame
      // identical to the URL/construction params.
      base.renderAndEmit();
    },
    getState: () => sim.getState(),
    getSnapshot: () => sim.getSnapshot(),
    getParams: () => sim.getParams(),
    setParams: base.wrapAction((next: Partial<OscilloscopeParams>) =>
      sim.setParams(next)
    ),
    stepFrame: base.wrapAction((dt?: number) => sim.stepFrame(dt)),
    startAll: base.wrapAction(() => {
      sim.setParams({ autoRun: true });
    }),
    pauseAll: base.wrapAction(() => {
      sim.setParams({ autoRun: false });
    }),
    attachGraphCanvas(canvas: HTMLCanvasElement): void {
      view.attachGraphCanvas(canvas);
      base.renderAndEmit();
    },
    getTransportState(): { isPlaying: boolean; speed: number } {
      return { isPlaying: sim.getParams().autoRun, speed: 1 };
    },
    getReadoutItems
  };
}
