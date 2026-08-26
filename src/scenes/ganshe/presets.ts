import type { WaveParams } from './scene.sim';

/** schema 控件 key → WaveParams key 映射 */
export const gansheParamMapping: Record<string, string> = {
  freq1: 'freq1',
  freq2: 'freq2',
  amp1: 'amp1',
  amp2: 'amp2',
  phaseDiff: 'phaseDiff',
  observerX: 'observerX'
};

/** 预设参数表（由 controls-schema 的 preset-group 触发应用） */
export const ganshePresets: Record<string, Partial<WaveParams>> = {
  constructive: {
    isPulseMode: false,
    freq1: 4,
    freq2: 4,
    phaseDiff: 0,
    amp1: 5,
    amp2: 5
  },
  destructive: {
    isPulseMode: false,
    freq1: 4,
    freq2: 4,
    phaseDiff: 180,
    amp1: 5,
    amp2: 5
  },
  beat: {
    isPulseMode: false,
    freq1: 4,
    freq2: 5,
    phaseDiff: 0,
    amp1: 5,
    amp2: 5
  },
  standing: {
    isPulseMode: false,
    freq1: 4,
    freq2: 4,
    phaseDiff: 0,
    amp1: 5,
    amp2: 5,
    mode: 'head-on',
    observerX: 15
  },
  pulse: {
    isPulseMode: true,
    freq1: 3,
    freq2: 5,
    phaseDiff: 0,
    amp1: 8,
    amp2: 5,
    mode: 'head-on',
    observerX: 15
  }
};
