import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import {
  clampTimeScale,
  createStandardSceneEntry
} from '../scene-entry-helpers';
import { tickerTapeMeta } from './scene.meta';
import {
  createTickerTapeSim,
  type NoiseLevel,
  type TapeKind,
  type TickerTapeParams,
  type TickerTapeState
} from './scene.sim';
import { createTickerTapeView } from './scene.view';

const KIND_BY_INDEX: TapeKind[] = ['uniform', 'ua', 'ud', 'variable'];
const NOISE_BY_INDEX: NoiseLevel[] = ['off', 'typical', 'large'];

export type CreateTickerTapeSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

function asKind(value: unknown): TapeKind | undefined {
  if (
    value === 'uniform' ||
    value === 'ua' ||
    value === 'ud' ||
    value === 'variable'
  ) {
    return value;
  }
  if (typeof value === 'number' && KIND_BY_INDEX[value]) {
    return KIND_BY_INDEX[value];
  }
  return undefined;
}

function asNoise(value: unknown): NoiseLevel | undefined {
  if (value === 'off' || value === 'typical' || value === 'large') return value;
  if (typeof value === 'number' && NOISE_BY_INDEX[value]) {
    return NOISE_BY_INDEX[value];
  }
  return undefined;
}

export function createTickerTapeScene(
  options: CreateTickerTapeSceneOptions = {}
) {
  const sim = createTickerTapeSim({
    speed: tickerTapeMeta.defaultParams.speed ?? 1,
    tapeKind: 'ua',
    countEvery: 1,
    noise: 'off',
    showA: false
  });
  const view = createTickerTapeView({
    canvas: options.canvas,
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });

  let timeScale = 1;
  const base = createStandardSceneEntry({
    sim,
    view,
    getState: () => sim.getState(),
    resetView: () => view.reset()
  });
  view.setOnOriginDrag((tickIndex) => {
    sim.setOriginTickIndex(tickIndex);
    base.renderAndEmit();
    base.notify();
  });

  return {
    ...base,
    step(dt: number): void {
      sim.step(dt * timeScale);
    },
    startAll(): void {
      sim.startPlayback();
      base.renderAndEmit();
      base.notify();
    },
    pauseAll(): void {
      sim.pausePlayback();
      base.notify();
    },
    reset(): void {
      sim.reset();
      view.reset();
      base.renderAndEmit();
      base.notify();
    },
    plotScatter(): void {
      view.plotScatter(sim.getState());
      base.renderAndEmit();
      base.notify();
    },
    plotFit(): boolean {
      const ok = view.plotFit(sim.getState());
      base.renderAndEmit();
      base.notify();
      return ok;
    },
    getPlotStatus() {
      return view.getPlotStatus(sim.getState());
    },
    setTimeScale(scale: number): void {
      timeScale = clampTimeScale(scale);
      base.notify();
    },
    getTimeScale(): number {
      return timeScale;
    },
    getTransportState(): { isPlaying: boolean; speed: number } {
      const s = sim.getState();
      return { isPlaying: s.playing, speed: timeScale };
    },
    attachGraphCanvas(canvas: HTMLCanvasElement): void {
      view.attachGraphCanvas(canvas);
      base.renderAndEmit();
    },
    fillFromRuler(): void {
      sim.fillFromRuler();
      base.renderAndEmit();
      base.notify();
    },
    setMeasuredX(index: number, value: number | null): void {
      sim.setMeasuredX(index, value);
      base.renderAndEmit();
      base.notify();
    },
    setDeltaX(index: number, value: number | null): void {
      sim.setDeltaX(index, value);
      base.renderAndEmit();
      base.notify();
    },
    setV(index: number, value: number | null): void {
      sim.setV(index, value);
      base.renderAndEmit();
      base.notify();
    },
    setParams(
      next: Partial<{
        preset: string;
        speed: number;
        countEvery: number | boolean;
        noise: string | number;
        showA: number | boolean;
        tapeKind: string;
      }>
    ): TickerTapeParams {
      const patch: Partial<TickerTapeParams> = {};
      if (typeof next.speed === 'number') {
        timeScale = clampTimeScale(next.speed);
        patch.speed = timeScale;
      }
      const kind = asKind(next.preset ?? next.tapeKind);
      if (kind) patch.tapeKind = kind;
      if (typeof next.countEvery === 'boolean') {
        patch.countEvery = next.countEvery ? 5 : 1;
      } else if (next.countEvery === 1 || next.countEvery === 5) {
        patch.countEvery = next.countEvery;
      }
      const noise = asNoise(next.noise);
      if (noise) patch.noise = noise;
      if (typeof next.showA === 'boolean') patch.showA = next.showA;
      else if (typeof next.showA === 'number') patch.showA = next.showA > 0;
      sim.setParams(patch);
      base.renderAndEmit();
      base.notify();
      return sim.getParams();
    },
    getParams(): {
      speed: number;
      tapeKind: TapeKind;
      countEvery: 1 | 5;
      noise: number;
      showA: number;
      preset: TapeKind;
    } {
      const p = sim.getParams();
      return {
        speed: p.speed,
        tapeKind: p.tapeKind,
        countEvery: p.countEvery,
        noise: NOISE_BY_INDEX.indexOf(p.noise),
        showA: p.showA ? 1 : 0,
        preset: p.tapeKind
      };
    },
    getState(): TickerTapeState {
      return sim.getState();
    },
    getReadoutItems() {
      const s = sim.getState();
      const items = [
        { key: 'period', label: '打点周期', value: '0.02 s' },
        { key: 'T', label: '计数间隔 T', value: `${s.T.toFixed(2)} s` },
        { key: 'tape', label: '纸带', value: s.tapeKind }
      ];
      if (s.showA && s.aMs2 !== null) {
        items.push({
          key: 'a',
          label: 'a（逐差）',
          value: `${s.aMs2.toFixed(2)} m/s²`
        });
      }
      return items;
    }
  };
}

export type TickerTapeScene = ReturnType<typeof createTickerTapeScene>;
