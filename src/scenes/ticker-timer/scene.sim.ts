import { clamp } from '../../core/math';

export const tickerTimerConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 850,
  panelWidth: 350,
  panelInset: 22,
  tickPeriod: 0.02,
  maxTime: 1.2,
  maxDots: 61,
  visualScale: 3.0,
  tapeLeft: 84,
  tapeRight: 780,
  tapeY: 500,
  tapeHeight: 46,
  rulerY: 548,
  rulerHeight: 56,
  coilSpacing: 92,
  coilPlateHeight: 102,
  coilLowerY: 54,
  wheelRadius: 56,
  armY: 199,
  armHeadY: 186,
  tapeStripY: 207,
  powerX: 132,
  powerY: 278,
  sampleDt: 0.016
} as const;

export type TickerTimerModel = 'uniform' | 'ua' | 'ud';

export type TickerTimerParams = {
  model: TickerTimerModel;
  initialVelocity: number;
  acceleration: number;
  voltageOn: boolean;
  autoRun: boolean;
};

export type TickerDot = { index: number; t: number; xM: number };

export type TickerTimerState = {
  params: TickerTimerParams;
  time: number;
  running: boolean;
  released: boolean;
  finished: boolean;
  dots: TickerDot[];
  currentX: number;
  currentV: number;
  averageVelocity: number | null;
  deltaS: number | null;
  measuredAcceleration: number | null;
  error: string | null;
};

const DEFAULTS: TickerTimerParams = {
  model: 'ua',
  initialVelocity: 0.5,
  acceleration: 2.5,
  voltageOn: false,
  autoRun: true
};

const MODEL_ACCELERATION: Record<TickerTimerModel, number> = {
  uniform: 0,
  ua: 2.5,
  ud: -2.5
};

function finite(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (
      normalized === '1' ||
      normalized === 'true' ||
      normalized === 'on' ||
      normalized === 'yes'
    )
      return true;
    if (
      normalized === '0' ||
      normalized === 'false' ||
      normalized === 'off' ||
      normalized === 'no' ||
      normalized === ''
    )
      return false;
  }
  return fallback;
}

function model(value: unknown, fallback: TickerTimerModel): TickerTimerModel {
  if (value === 'uniform' || value === 'ua' || value === 'ud') return value;
  if (typeof value === 'number')
    return (
      (['uniform', 'ua', 'ud'][value] as TickerTimerModel | undefined) ??
      fallback
    );
  if (typeof value === 'string' && /^(0|1|2)$/.test(value.trim()))
    return ['uniform', 'ua', 'ud'][Number(value)] as TickerTimerModel;
  return fallback;
}

function normalize(
  input: Partial<TickerTimerParams>,
  previous = DEFAULTS
): TickerTimerParams {
  return {
    model: model(input.model, previous.model),
    initialVelocity: clamp(
      finite(input.initialVelocity, previous.initialVelocity),
      0,
      2
    ),
    acceleration: clamp(
      finite(input.acceleration, previous.acceleration),
      -5,
      5
    ),
    voltageOn: bool(input.voltageOn, previous.voltageOn),
    autoRun: bool(input.autoRun, previous.autoRun)
  };
}

function positionAt(v0: number, a: number, t: number): number {
  return Math.max(0, v0 * t + 0.5 * a * t * t);
}

function velocityAt(v0: number, a: number, t: number): number {
  return Math.max(0, v0 + a * t);
}

export function createTickerTimerSim(initial: Partial<TickerTimerParams> = {}) {
  let params = normalize(initial);
  if (initial.model !== undefined)
    params.acceleration = MODEL_ACCELERATION[params.model];
  const initialParams: TickerTimerParams = { ...params };
  let time = 0;
  let released = false;
  let error: string | null = null;

  function makeDots(): TickerDot[] {
    if (!released) return [];
    const count = Math.min(
      tickerTimerConstants.maxDots,
      Math.floor(time / tickerTimerConstants.tickPeriod) + 1
    );
    return Array.from({ length: count }, (_, index) => {
      const t = index * tickerTimerConstants.tickPeriod;
      return {
        index,
        t,
        xM: positionAt(params.initialVelocity, params.acceleration, t)
      };
    });
  }

  function getState(): TickerTimerState {
    const dots = makeDots();
    const currentT = Math.min(time, tickerTimerConstants.maxTime);
    const currentX = released
      ? positionAt(params.initialVelocity, params.acceleration, currentT)
      : 0;
    const currentV = released
      ? velocityAt(params.initialVelocity, params.acceleration, currentT)
      : params.initialVelocity;
    let averageVelocity: number | null = null;
    let deltaS: number | null = null;
    let measuredAcceleration: number | null = null;
    if (dots.length >= 3) {
      const before = dots[dots.length - 3];
      const previous = dots[dots.length - 2];
      const latest = dots[dots.length - 1];
      averageVelocity =
        (latest.xM - before.xM) / (2 * tickerTimerConstants.tickPeriod);
      deltaS = latest.xM - previous.xM - (previous.xM - before.xM);
      measuredAcceleration = deltaS / tickerTimerConstants.tickPeriod ** 2;
    }
    return {
      params: { ...params },
      time,
      running:
        params.autoRun && released && time < tickerTimerConstants.maxTime,
      released,
      finished: released && time >= tickerTimerConstants.maxTime,
      dots,
      currentX,
      currentV,
      averageVelocity,
      deltaS,
      measuredAcceleration,
      error
    };
  }

  return {
    getState,
    getSnapshot: getState,
    getParams: (): TickerTimerParams => ({ ...params }),
    setParams(next: Partial<TickerTimerParams>): TickerTimerParams {
      const nextModel =
        next.model !== undefined ? model(next.model, params.model) : undefined;
      params = normalize({ ...params, ...next }, params);
      if (nextModel !== undefined)
        params.acceleration = MODEL_ACCELERATION[nextModel];
      error = null;
      return { ...params };
    },
    powerOn(): void {
      params.voltageOn = true;
      error = null;
    },
    releaseTape(): boolean {
      if (!params.voltageOn) {
        error = '请先接通电源，再释放纸带';
        return false;
      }
      released = true;
      error = null;
      return true;
    },
    reset(): void {
      params = { ...initialParams };
      time = 0;
      released = false;
      error = null;
    },
    clearError(): void {
      error = null;
    },
    step(dt: number): void {
      if (!params.autoRun || !released || time >= tickerTimerConstants.maxTime)
        return;
      time = Math.min(
        tickerTimerConstants.maxTime,
        time + Math.max(0, finite(dt, 0))
      );
    }
  };
}
