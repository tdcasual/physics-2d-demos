import { clamp } from '../../core/math';

export type DisplacementTimeParams = {
  v0: number;
  acceleration: number;
  autoRun: boolean;
  showArea: boolean;
};

export type DisplacementTimeState = {
  params: DisplacementTimeParams;
  time: number;
  velocity: number;
  displacement: number;
};

export const displacementTimeConstants = {
  baseWidth: 1200,
  baseHeight: 700,
  fieldWidth: 850,
  panelWidth: 350,
  panelInset: 22,
  trackStartX: 68,
  trackEndX: 810,
  trackY: 92,
  trackOriginX: 458,
  trackScale: 5.6,
  trackDotStartX: 464,
  trackDotGap: 18,
  trackDotCount: 18,
  carWidth: 62,
  carHeight: 27,
  graphLeft: 92,
  graphRight: 800,
  velocityTop: 176,
  velocityBottom: 326,
  velocityAxisY: 286,
  velocityMax: 24,
  displacementTop: 420,
  displacementBottom: 592,
  displacementAxisY: 560,
  displacementMax: 64,
  maxTime: 4,
  cursorWidth: 2,
  gridStep: 45,
  panelTitleY: 38,
  panelDividerY: 64,
  inputCardY1: 82,
  inputCardY2: 148,
  inputCardHeight: 54,
  formulaY: 462,
  formulaHeight: 122,
  readoutY: 300,
  readoutHeight: 138,
  cursorColor: '#f0b429',
  sampleDt: 0.016
} as const;

const DEFAULT_PARAMS: DisplacementTimeParams = {
  v0: 5,
  acceleration: 4,
  autoRun: true,
  showArea: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalize(
  input: Partial<DisplacementTimeParams>,
  previous = DEFAULT_PARAMS
): DisplacementTimeParams {
  return {
    v0: clamp(finite(input.v0, previous.v0), -10, 20),
    acceleration: clamp(
      finite(input.acceleration, previous.acceleration),
      -6,
      6
    ),
    autoRun: input.autoRun ?? previous.autoRun,
    showArea: input.showArea ?? previous.showArea
  };
}

export function velocityAt(
  v0: number,
  acceleration: number,
  time: number
): number {
  return finite(v0, 0) + finite(acceleration, 0) * Math.max(0, finite(time, 0));
}

export function displacementAt(
  v0: number,
  acceleration: number,
  time: number
): number {
  const t = Math.max(0, finite(time, 0));
  return finite(v0, 0) * t + 0.5 * finite(acceleration, 0) * t * t;
}

export function createDisplacementTimeSim(
  initial: Partial<DisplacementTimeParams> = {}
) {
  const defaults = normalize(initial);
  let params = { ...defaults };
  let time = 0;

  function getState(): DisplacementTimeState {
    return {
      params: { ...params },
      time,
      velocity: velocityAt(params.v0, params.acceleration, time),
      displacement: displacementAt(params.v0, params.acceleration, time)
    };
  }

  return {
    getState,
    getSnapshot: getState,
    getParams: (): DisplacementTimeParams => ({ ...params }),
    setParams(next: Partial<DisplacementTimeParams>): DisplacementTimeParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      const delta = Math.max(0, finite(dt, 0));
      time = (time + delta) % displacementTimeConstants.maxTime;
    },
    reset(): void {
      params = { ...defaults };
      time = 0;
    }
  };
}
