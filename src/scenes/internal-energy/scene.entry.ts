import type { DemoRenderHints } from '../../platform/demo-profile';
import type { SceneLifecycle } from '../../platform/scene-contract';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import {
  clampTimeScale,
  createStandardSceneEntry
} from '../scene-entry-helpers';
import { createInternalEnergyView } from './scene.view';
import {
  createInternalEnergySim,
  type InternalEnergyParams,
  type InternalEnergyState
} from './scene.sim';

export type CreateInternalEnergySceneOptions = {
  canvas?: HTMLCanvasElement;
  graphCanvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: InternalEnergyState) => void;
};

function signed(value: number, digits: number, unit: string): string {
  const mag = Math.abs(value).toFixed(digits);
  const sign = value > 0.005 ? '+' : value < -0.005 ? '−' : '';
  return `${sign}${mag} ${unit}`;
}

export function createInternalEnergyScene(
  options: CreateInternalEnergySceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): InternalEnergyState;
  getSnapshot(): InternalEnergyState;
  getParams(): InternalEnergyParams;
  setParams(params: Partial<InternalEnergyParams>): InternalEnergyParams;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
  subscribe(listener: () => void): () => void;
  attachGraphCanvas(canvas: HTMLCanvasElement): void;
  startAll(): void;
  pauseAll(): void;
  setTimeScale(scale: number): void;
  getTimeScale(): number;
  getTransportState(): { isPlaying: boolean; speed: number };
} {
  const sim = createInternalEnergySim();
  const view = createInternalEnergyView({
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
  let timeScale = 1;

  function getReadoutItems() {
    const s = sim.getState();
    if (s.params.mode === 'heat') {
      return [
        {
          key: 'tHot',
          label: 'T左',
          value: `${s.tHotNow.toFixed(1)} °C`
        },
        {
          key: 'tCold',
          label: 'T右',
          value: `${s.tColdNow.toFixed(1)} °C`
        },
        { key: 'tEq', label: 'Teq', value: `${s.tEq.toFixed(1)} °C` },
        { key: 'work', label: 'W', value: signed(s.work, 2, 'J') },
        { key: 'heatHot', label: 'Q左', value: signed(s.heatHot, 1, 'J') },
        { key: 'heatCold', label: 'Q右', value: signed(s.heatCold, 1, 'J') },
        {
          key: 'heatSum',
          label: 'Q合',
          value: signed(s.heatSum, 2, 'J')
        }
      ];
    }
    const phenomenon = s.ignited ? '引火（示意）' : s.fog ? '凝结雾' : '—';
    return [
      {
        key: 'temperature',
        label: 'T',
        value: `${s.temperature.toFixed(1)} °C`
      },
      {
        key: 'pressure',
        label: 'p',
        value: `${s.pressure.toFixed(0)} kPa`
      },
      {
        key: 'volume',
        label: 'V',
        value: `${s.volume.toFixed(1)} mL`
      },
      { key: 'work', label: 'W', value: signed(s.work, 2, 'J') },
      { key: 'heat', label: 'Q', value: signed(s.heat, 2, 'J') },
      {
        key: 'deltaU',
        label: 'ΔU',
        value: signed(s.deltaU, 2, 'J')
      },
      { key: 'phenomenon', label: '现象', value: phenomenon }
    ];
  }

  return {
    ...base,
    step(dt: number): void {
      sim.step(dt * timeScale);
    },
    getState: (): InternalEnergyState => sim.getState(),
    getSnapshot: (): InternalEnergyState => sim.getSnapshot(),
    getParams: (): InternalEnergyParams => sim.getParams(),
    setParams: base.wrapAction((next: Partial<InternalEnergyParams>) =>
      sim.setParams(next)
    ),
    attachGraphCanvas(canvas: HTMLCanvasElement): void {
      view.attachGraphCanvas(canvas);
      base.renderAndEmit();
    },
    startAll: base.wrapAction(() => {
      sim.start();
    }),
    pauseAll: base.wrapAction(() => {
      sim.pause();
    }),
    setTimeScale(scale: number): void {
      timeScale = clampTimeScale(scale);
      base.notify();
    },
    getTimeScale(): number {
      return timeScale;
    },
    getTransportState(): { isPlaying: boolean; speed: number } {
      const state = sim.getState();
      return { isPlaying: state.playing, speed: timeScale };
    },
    getReadoutItems
  };
}
