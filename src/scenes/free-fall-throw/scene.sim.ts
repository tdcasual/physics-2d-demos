import { clamp } from '../../core/math';

export type FreeFallMode = 'compare' | 'single' | 'reverse';
export type FreeFallParams = {
  initialSpeed: number;
  mode: FreeFallMode;
  timeProgress: number;
  autoRun: boolean;
  showVelocity: boolean;
  showHeight: boolean;
};

export type MotionSegment = 'rising' | 'apex' | 'falling';
export type FreeFallState = FreeFallParams & {
  time: number;
  clockTime: number;
  totalTime: number;
  riseTime: number;
  apexHeight: number;
  height: number;
  velocity: number;
  acceleration: number;
  segment: MotionSegment;
  bHeight: number;
  bVelocity: number;
  bReleased: boolean;
  history: Array<{ time: number; height: number; velocity: number }>;
};

export const freeFallConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 820,
  panelX: 830,
  panelWidth: 370,
  gravity: 10,
  speedMin: 10,
  speedMax: 30,
  defaultSpeed: 20,
  playbackRate: 0.22,
  sampleCount: 72,
  motionAreaLeft: 48,
  motionAreaRight: 290,
  groundY: 690,
  motionTop: 122,
  graphX: 320,
  velocityGraphY: 88,
  velocityGraphWidth: 470,
  velocityGraphHeight: 250,
  heightGraphY: 396,
  heightGraphWidth: 470,
  heightGraphHeight: 294,
  graphInsetLeft: 46,
  graphInsetRight: 18,
  graphInsetTop: 45,
  graphInsetBottom: 35,
  gridTop: 76,
  motionA: 145,
  motionB: 230,
  motionLeft: 28,
  motionRight: 284,
  heightGuideEnd: 280,
  ballRadius: 16,
  panelTitleY: 42,
  panelRuleY: 72,
  panelModeY: 94,
  panelModeHeight: 54,
  panelDataY: 166,
  panelDataHeight: 246,
  panelFormulaY: 430,
  panelFormulaHeight: 142,
  panelHintY: 596,
  panelHintHeight: 112,
  panelInset: 28
} as const;

const DEFAULTS: FreeFallParams = {
  initialSpeed: freeFallConstants.defaultSpeed,
  mode: 'compare',
  timeProgress: 0,
  autoRun: true,
  showVelocity: true,
  showHeight: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asFlag(value: unknown, fallback: boolean): boolean {
  if (value === true || value === 1 || value === '1' || value === 'true')
    return true;
  if (value === false || value === 0 || value === '0' || value === 'false')
    return false;
  return fallback;
}

function normalize(
  input: Partial<FreeFallParams>,
  previous = DEFAULTS
): FreeFallParams {
  return {
    initialSpeed: clamp(
      finite(input.initialSpeed, previous.initialSpeed),
      freeFallConstants.speedMin,
      freeFallConstants.speedMax
    ),
    mode:
      input.mode === 'compare' ||
      input.mode === 'single' ||
      input.mode === 'reverse'
        ? input.mode
        : previous.mode,
    timeProgress: clamp(
      finite(input.timeProgress, previous.timeProgress),
      0,
      1
    ),
    autoRun: asFlag(input.autoRun, previous.autoRun),
    showVelocity: asFlag(input.showVelocity, previous.showVelocity),
    showHeight: asFlag(input.showHeight, previous.showHeight)
  };
}

function kinematicsAt(
  initialSpeed: number,
  physicalTime: number
): {
  height: number;
  velocity: number;
  segment: MotionSegment;
} {
  const g = freeFallConstants.gravity;
  const riseTime = initialSpeed / g;
  const apexHeight = (initialSpeed * initialSpeed) / (2 * g);
  const t = clamp(physicalTime, 0, riseTime * 2);
  const height = clamp(initialSpeed * t - 0.5 * g * t * t, 0, apexHeight);
  const velocity = initialSpeed - g * t;
  const segment: MotionSegment =
    Math.abs(velocity) < 0.12 ? 'apex' : velocity > 0 ? 'rising' : 'falling';
  return { height, velocity, segment };
}

function stateAt(params: FreeFallParams, clockTime: number): FreeFallState {
  const riseTime = params.initialSpeed / freeFallConstants.gravity;
  const apexHeight =
    (params.initialSpeed * params.initialSpeed) /
    (2 * freeFallConstants.gravity);
  const clockTotal = params.mode === 'reverse' ? riseTime : riseTime * 2;
  const boundedClock = clamp(clockTime, 0, clockTotal);
  const physicalTime =
    params.mode === 'reverse' ? riseTime - boundedClock : boundedClock;
  const main = kinematicsAt(params.initialSpeed, physicalTime);
  const bReleased = params.mode === 'compare' && physicalTime >= riseTime;
  const bElapsed = Math.max(0, physicalTime - riseTime);
  const bHeight =
    params.mode === 'compare'
      ? clamp(
          apexHeight - 0.5 * freeFallConstants.gravity * bElapsed * bElapsed,
          0,
          apexHeight
        )
      : 0;
  const bVelocity =
    params.mode === 'compare' && bReleased
      ? -freeFallConstants.gravity * bElapsed
      : 0;
  const history: Array<{ time: number; height: number; velocity: number }> = [];
  for (let index = 0; index <= freeFallConstants.sampleCount; index += 1) {
    const t = (riseTime * 2 * index) / freeFallConstants.sampleCount;
    const point = kinematicsAt(params.initialSpeed, t);
    history.push({ time: t, height: point.height, velocity: point.velocity });
  }
  return {
    ...params,
    time: physicalTime,
    clockTime: boundedClock,
    timeProgress: clockTotal <= 0 ? 0 : boundedClock / clockTotal,
    totalTime: params.mode === 'reverse' ? riseTime : riseTime * 2,
    riseTime,
    apexHeight,
    height: main.height,
    velocity: main.velocity,
    acceleration: -freeFallConstants.gravity,
    segment: main.segment,
    bHeight,
    bVelocity,
    bReleased,
    history
  };
}

export function freeFallAt(
  params: FreeFallParams,
  time: number
): FreeFallState {
  const normalized = normalize(params);
  const riseTime = normalized.initialSpeed / freeFallConstants.gravity;
  const physicalTime = clamp(finite(time, 0), 0, riseTime * 2);
  const clockTime =
    normalized.mode === 'reverse' ? riseTime - physicalTime : physicalTime;
  return stateAt(normalized, clockTime);
}

export function createFreeFallSim(initial: Partial<FreeFallParams> = {}) {
  let params = normalize(initial);
  let clockTime = 0;
  return {
    getState: (): FreeFallState => stateAt(params, clockTime),
    getSnapshot: (): FreeFallState => stateAt(params, clockTime),
    getParams: (): FreeFallParams => ({
      ...params,
      timeProgress: stateAt(params, clockTime).timeProgress
    }),
    setParams(next: Partial<FreeFallParams>): FreeFallParams {
      const hadProgress = Object.prototype.hasOwnProperty.call(
        next,
        'timeProgress'
      );
      params = normalize({ ...params, ...next }, params);
      if (hadProgress) {
        const total =
          params.mode === 'reverse'
            ? params.initialSpeed / freeFallConstants.gravity
            : (params.initialSpeed / freeFallConstants.gravity) * 2;
        clockTime = params.timeProgress * total;
      }
      return { ...params };
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      const duration = clamp(finite(dt, 0), 0, 0.1);
      const total =
        params.mode === 'reverse'
          ? params.initialSpeed / freeFallConstants.gravity
          : (params.initialSpeed / freeFallConstants.gravity) * 2;
      clockTime += duration * freeFallConstants.playbackRate;
      if (clockTime >= total) clockTime = 0;
    },
    reset(): void {
      params = { ...DEFAULTS };
      clockTime = 0;
    }
  };
}
