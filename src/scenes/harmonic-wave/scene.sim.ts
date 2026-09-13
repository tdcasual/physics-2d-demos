import { clamp } from '../../core/math';

export type HarmonicWaveDirection = 'right' | 'left';

export type HarmonicWaveParams = {
  amplitude: number;
  wavelength: number;
  period: number;
  direction: HarmonicWaveDirection;
  pointX: number;
  showGhost: boolean;
  showVelocity: boolean;
  showAcceleration: boolean;
};

export type HarmonicWaveState = {
  params: HarmonicWaveParams;
  time: number;
  waveSpeed: number;
  pointY: number;
  pointVelocity: number;
  pointAcceleration: number;
  velocityDirection: 'up' | 'down' | 'zero';
  accelerationDirection: 'up' | 'down' | 'zero';
};

const TAU = Math.PI * 2;
const PHASE_OFFSET = Math.PI / 2;
const BASE_W = 820;
const BASE_H = 560;
const GRAPH_LEFT = 70;
const GRAPH_RIGHT = 790;
const GRAPH_TOP = 145;
const AXIS_Y = 300;
const X_SCALE = (GRAPH_RIGHT - GRAPH_LEFT) / 8;
const Y_SCALE = 10;
const INDICATOR_HALF_WIDTH = 70;
const INDICATOR_WIDTH = 140;
const INDICATOR_HEIGHT = 28;
const INDICATOR_Y = 78;
const INDICATOR_RADIUS = 14;
const DIRECTION_ARROW_HALF = 40;
const DIRECTION_ARROW_Y = 92;
const DIRECTION_TEXT_Y = 122;
const AMPLITUDE_PIXELS = 120;
const AXIS_END = 805;
const X_LABEL_X = 810;
const VELOCITY_CLAMP = 52;
const LEGEND_Y = 480;
const LEGEND_X_1 = 80;
const LEGEND_X_2 = 190;
const LEGEND_X_3 = 330;
const LEGEND_X_4 = 455;
const HINT_Y = 532;

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeParams(
  input: Partial<HarmonicWaveParams>
): HarmonicWaveParams {
  return {
    amplitude: clamp(finite(input.amplitude, 10), 1, 10),
    wavelength: clamp(finite(input.wavelength, 4), 1, 8),
    period: clamp(finite(input.period, 2), 0.5, 4),
    direction: input.direction === 'left' ? 'left' : 'right',
    pointX: clamp(finite(input.pointX, 2), 0, 8),
    showGhost: input.showGhost !== false,
    showVelocity: input.showVelocity !== false,
    showAcceleration: input.showAcceleration !== false
  };
}

export function harmonicWaveY(
  x: number,
  t: number,
  amplitude: number,
  wavelength: number,
  period: number,
  direction: HarmonicWaveDirection | number
): number {
  const dir = direction === 'left' || direction === -1 ? -1 : 1;
  return (
    amplitude *
    Math.sin(TAU * (t / period - (dir * x) / wavelength) + PHASE_OFFSET)
  );
}

export function harmonicWaveVelocity(
  x: number,
  t: number,
  amplitude: number,
  wavelength: number,
  period: number,
  direction: HarmonicWaveDirection | number
): number {
  const dir = direction === 'left' || direction === -1 ? -1 : 1;
  const phase = TAU * (t / period - (dir * x) / wavelength) + PHASE_OFFSET;
  return ((dir * amplitude * TAU) / period) * Math.cos(phase);
}

export function harmonicWaveAcceleration(y: number, period: number): number {
  const omega = TAU / period;
  return -omega * omega * y;
}

function directionOf(value: number): 'up' | 'down' | 'zero' {
  if (value > 0.05) return 'up';
  if (value < -0.05) return 'down';
  return 'zero';
}

export const harmonicWaveConstants = {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  graphLeft: GRAPH_LEFT,
  graphTop: GRAPH_TOP,
  axisY: AXIS_Y,
  xScale: X_SCALE,
  yScale: Y_SCALE,
  graphRight: GRAPH_RIGHT,
  indicatorHalfWidth: INDICATOR_HALF_WIDTH,
  indicatorWidth: INDICATOR_WIDTH,
  indicatorHeight: INDICATOR_HEIGHT,
  indicatorY: INDICATOR_Y,
  indicatorRadius: INDICATOR_RADIUS,
  directionArrowHalf: DIRECTION_ARROW_HALF,
  directionArrowY: DIRECTION_ARROW_Y,
  directionTextY: DIRECTION_TEXT_Y,
  amplitudePixels: AMPLITUDE_PIXELS,
  axisEnd: AXIS_END,
  xLabelX: X_LABEL_X,
  velocityClamp: VELOCITY_CLAMP,
  legendY: LEGEND_Y,
  legendX1: LEGEND_X_1,
  legendX2: LEGEND_X_2,
  legendX3: LEGEND_X_3,
  legendX4: LEGEND_X_4,
  hintY: HINT_Y
};

export function createHarmonicWaveSim(
  initial: Partial<HarmonicWaveParams> = {}
) {
  const defaults = normalizeParams(initial);
  let params = { ...defaults };
  let time = 0;

  return {
    getState(): HarmonicWaveState {
      const dir = params.direction;
      const pointY = harmonicWaveY(
        params.pointX,
        time,
        params.amplitude,
        params.wavelength,
        params.period,
        dir
      );
      const pointVelocity = harmonicWaveVelocity(
        params.pointX,
        time,
        params.amplitude,
        params.wavelength,
        params.period,
        dir
      );
      const pointAcceleration = harmonicWaveAcceleration(pointY, params.period);
      return {
        params: { ...params },
        time,
        waveSpeed: params.wavelength / params.period,
        pointY,
        pointVelocity,
        pointAcceleration,
        velocityDirection: directionOf(pointVelocity),
        accelerationDirection: directionOf(pointAcceleration)
      };
    },
    getSnapshot(): HarmonicWaveState {
      return this.getState();
    },
    getParams(): HarmonicWaveParams {
      return { ...params };
    },
    setParams(next: Partial<HarmonicWaveParams>): HarmonicWaveParams {
      params = normalizeParams({ ...params, ...next });
      return { ...params };
    },
    setPointX(pointX: number): void {
      params.pointX = clamp(finite(pointX, params.pointX), 0, 8);
    },
    step(dt: number): void {
      time += Math.max(0, finite(dt, 0));
    },
    reset(): void {
      params = { ...defaults };
      time = 0;
    }
  };
}
