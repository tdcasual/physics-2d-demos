import { clamp } from '../../core/math';

export type WaveStartDirection = 'up' | 'down';
export type WaveSuperposeParams = {
  amplitude1: number;
  wavelength1: number;
  amplitude2: number;
  wavelength2: number;
  direction1: WaveStartDirection;
  direction2: WaveStartDirection;
  observationX: number;
  autoRun: boolean;
};
export type WaveSuperposeState = WaveSuperposeParams & {
  time: number;
  waveSpeed1: number;
  waveSpeed2: number;
  y1: number;
  y2: number;
  sum: number;
};

export const waveSuperposeConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  graphLeft: 44,
  graphRight: 1156,
  axisY: 330,
  graphTop: 90,
  graphBottom: 570,
  graphXMin: -8,
  graphXMax: 8,
  yMax: 3,
  waveWidth: 1.7,
  speed: 1.6,
  source1X: -2.4,
  source2X: 2.4,
  cardY: 600,
  cardHeight: 124,
  axisLabelY: 560,
  pointRadius: 8,
  animationPeriod: 16,
  amplitudeMin: 0.5,
  amplitudeMax: 2,
  wavelengthMin: 1,
  wavelengthMax: 4,
  observationMin: -6,
  observationMax: 6
} as const;

const DEFAULTS: WaveSuperposeParams = {
  amplitude1: 1.5,
  wavelength1: 2,
  amplitude2: 1.5,
  wavelength2: 2,
  direction1: 'up',
  direction2: 'down',
  observationX: 0,
  autoRun: true
};
const TAU = Math.PI * 2;
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
function normalize(
  input: Partial<WaveSuperposeParams>,
  previous = DEFAULTS
): WaveSuperposeParams {
  return {
    amplitude1: clamp(
      finite(input.amplitude1, previous.amplitude1),
      waveSuperposeConstants.amplitudeMin,
      waveSuperposeConstants.amplitudeMax
    ),
    wavelength1: clamp(
      finite(input.wavelength1, previous.wavelength1),
      waveSuperposeConstants.wavelengthMin,
      waveSuperposeConstants.wavelengthMax
    ),
    amplitude2: clamp(
      finite(input.amplitude2, previous.amplitude2),
      waveSuperposeConstants.amplitudeMin,
      waveSuperposeConstants.amplitudeMax
    ),
    wavelength2: clamp(
      finite(input.wavelength2, previous.wavelength2),
      waveSuperposeConstants.wavelengthMin,
      waveSuperposeConstants.wavelengthMax
    ),
    direction1:
      input.direction1 === 'down'
        ? 'down'
        : input.direction1 === 'up'
          ? 'up'
          : previous.direction1,
    direction2:
      input.direction2 === 'up'
        ? 'up'
        : input.direction2 === 'down'
          ? 'down'
          : previous.direction2,
    observationX: clamp(
      finite(input.observationX, previous.observationX),
      waveSuperposeConstants.observationMin,
      waveSuperposeConstants.observationMax
    ),
    autoRun: input.autoRun ?? previous.autoRun
  };
}
function packet(
  x: number,
  center: number,
  amplitude: number,
  wavelength: number,
  direction: WaveStartDirection
): number {
  const distance = x - center;
  const envelope = Math.exp(
    -(distance * distance) /
      (waveSuperposeConstants.waveWidth * waveSuperposeConstants.waveWidth)
  );
  const phase = (TAU * distance) / wavelength;
  const sign = direction === 'up' ? 1 : -1;
  return sign * amplitude * envelope * Math.sin(phase);
}
export function waveComponent(
  x: number,
  time: number,
  amplitude: number,
  wavelength: number,
  direction: WaveStartDirection,
  source: 'left' | 'right'
): number {
  const center =
    source === 'left'
      ? waveSuperposeConstants.source1X + waveSuperposeConstants.speed * time
      : waveSuperposeConstants.source2X - waveSuperposeConstants.speed * time;
  return packet(x, center, amplitude, wavelength, direction);
}
export function createWaveSuperposeSim(
  initial: Partial<WaveSuperposeParams> = {}
) {
  let params = normalize(initial);
  let time = 0;
  return {
    getState(): WaveSuperposeState {
      const y1 = waveComponent(
        params.observationX,
        time,
        params.amplitude1,
        params.wavelength1,
        params.direction1,
        'left'
      );
      const y2 = waveComponent(
        params.observationX,
        time,
        params.amplitude2,
        params.wavelength2,
        params.direction2,
        'right'
      );
      return {
        ...params,
        time,
        waveSpeed1: waveSuperposeConstants.speed,
        waveSpeed2: waveSuperposeConstants.speed,
        y1,
        y2,
        sum: y1 + y2
      };
    },
    getSnapshot() {
      return this.getState();
    },
    getParams(): WaveSuperposeParams {
      return { ...params };
    },
    setParams(next: Partial<WaveSuperposeParams>): WaveSuperposeParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      if (params.autoRun)
        time =
          (time + clamp(finite(dt, 0), 0, 0.05)) %
          waveSuperposeConstants.animationPeriod;
    },
    reset(): void {
      params = { ...DEFAULTS };
      time = 0;
    }
  };
}
