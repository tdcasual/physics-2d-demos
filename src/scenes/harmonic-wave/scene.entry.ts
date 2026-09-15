import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import {
  clampTimeScale,
  createStandardSceneEntry
} from '../scene-entry-helpers';
import {
  createHarmonicWaveSim,
  type HarmonicWaveParams,
  type HarmonicWaveState,
  type HarmonicWaveDirection
} from './scene.sim';
import { createHarmonicWaveView } from './scene.view';

export type CreateHarmonicWaveSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: HarmonicWaveState) => void;
};

export function createHarmonicWaveScene(
  options: CreateHarmonicWaveSceneOptions = {}
) {
  const sim = createHarmonicWaveSim();
  const view = createHarmonicWaveView({
    canvas: options.canvas,
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });

  let timeScale = 1;
  let playing = false;

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
    const dir = state.params.direction === 'right' ? '向右' : '向左';
    const arrow = (value: 'up' | 'down' | 'zero'): string =>
      value === 'up' ? '↑' : value === 'down' ? '↓' : '—';
    return [
      {
        key: 'wave-speed',
        label: 'v',
        value: `${state.waveSpeed.toFixed(2)} m/s`
      },
      { key: 'time', label: 't', value: `${state.time.toFixed(2)} s` },
      {
        key: 'point-y',
        label: 'P 位移',
        value: `${state.pointY.toFixed(1)} cm`
      },
      {
        key: 'velocity',
        label: 'P 速度',
        value: arrow(state.velocityDirection)
      },
      {
        key: 'acceleration',
        label: 'P 加速度',
        value: arrow(state.accelerationDirection)
      },
      { key: 'direction', label: '波向', value: dir }
    ];
  }

  return {
    ...base,
    step(dt: number): void {
      if (!playing) return;
      sim.step(dt * timeScale);
    },
    startAll(): void {
      playing = true;
      base.renderAndEmit();
      base.notify();
    },
    pauseAll(): void {
      playing = false;
      base.renderAndEmit();
      base.notify();
    },
    reset(): void {
      playing = false;
      sim.reset();
      base.renderAndEmit();
      base.notify();
    },
    setTimeScale(scale: number): void {
      timeScale = clampTimeScale(scale);
      base.notify();
    },
    getTimeScale(): number {
      return timeScale;
    },
    getTransportState(): { isPlaying: boolean; speed: number } {
      return { isPlaying: playing, speed: timeScale };
    },
    getState: (): HarmonicWaveState => sim.getState(),
    getSnapshot: (): HarmonicWaveState => sim.getSnapshot(),
    getParams: (): HarmonicWaveParams => sim.getParams(),
    setParams: base.wrapAction(
      (next: Partial<HarmonicWaveParams>): HarmonicWaveParams =>
        sim.setParams(next)
    ),
    setDirection: base.wrapAction(
      (direction: HarmonicWaveDirection): HarmonicWaveParams =>
        sim.setParams({ direction })
    ),
    setPointX: base.wrapAction((pointX: number): void => sim.setPointX(pointX)),
    getReadoutItems
  };
}
