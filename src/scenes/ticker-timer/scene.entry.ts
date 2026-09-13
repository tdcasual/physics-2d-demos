import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { SceneLifecycle } from '../../platform/scene-contract';
import { createStandardSceneEntry } from '../scene-entry-helpers';
import {
  createTickerTimerSim,
  type TickerTimerModel,
  type TickerTimerParams,
  type TickerTimerState,
  tickerTimerConstants
} from './scene.sim';
import { createTickerTimerView } from './scene.view';

export type CreateTickerTimerSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onReadout?: (state: TickerTimerState) => void;
};

function asModel(value: unknown): TickerTimerModel | undefined {
  if (value === 'uniform' || value === 'ua' || value === 'ud') return value;
  if (typeof value === 'number')
    return (['uniform', 'ua', 'ud'][value] ?? undefined) as
      | TickerTimerModel
      | undefined;
  return undefined;
}

export function createTickerTimerScene(
  options: CreateTickerTimerSceneOptions = {}
): SceneLifecycle & {
  resize(): void;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  getState(): TickerTimerState;
  getSnapshot(): TickerTimerState;
  getParams(): TickerTimerParams;
  setParams(params: Partial<TickerTimerParams>): TickerTimerParams;
  powerOn(): void;
  releaseTape(): boolean;
  getReadoutItems(): Array<{ key: string; label: string; value: string }>;
  subscribe(listener: () => void): () => void;
} {
  const sim = createTickerTimerSim();
  const view = createTickerTimerView({
    canvas: options.canvas,
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
    return [
      {
        key: 'timer-period',
        label: '周期 T',
        value: `${tickerTimerConstants.tickPeriod.toFixed(3)} s`
      },
      { key: 'dot-count', label: '打点数', value: String(state.dots.length) },
      {
        key: 'measured-acceleration',
        label: '测得加速度',
        value:
          state.measuredAcceleration === null
            ? '—'
            : `${state.measuredAcceleration.toFixed(2)} m/s²`
      }
    ];
  }
  return {
    ...base,
    getState: () => sim.getState(),
    getSnapshot: () => sim.getSnapshot(),
    getParams: () => sim.getParams(),
    setParams: base.wrapAction((next: Partial<TickerTimerParams>) =>
      sim.setParams(next)
    ),
    powerOn: base.wrapAction(() => sim.powerOn()),
    releaseTape: base.wrapAction(() => sim.releaseTape()),
    getReadoutItems
  };
}

export { asModel };
