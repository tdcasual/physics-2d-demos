import { clamp } from '../../core/math';

export type VariableWorkMode = 'linear' | 'power' | 'piecewise';
export type VariableWorkParams = {
  mode: VariableWorkMode;
  mass: number;
  k: number;
  microsteps: number;
  autoRun: boolean;
};
export type VariableWorkState = {
  params: VariableWorkParams;
  time: number;
  x: number;
  force: number;
  velocity: number;
  power: number;
  work: number;
  kineticGain: number;
  rectangles: Array<{ x: number; width: number; height: number }>;
};

export const variableWorkConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 760,
  panelX: 786,
  panelWidth: 382,
  panelInset: 22,
  trackY: 154,
  cartX: 334,
  cartY: 112,
  cartWidth: 112,
  cartHeight: 66,
  trackStart: 74,
  trackEnd: 716,
  graphY: 304,
  graphHeight: 340,
  graphLeft: 52,
  graphWidth: 676,
  graphGap: 28,
  graphTitleY: 278,
  graphAxisX: 86,
  graphAxisY: 612,
  graphXWidth: 252,
  graphPLeft: 384,
  graphPWidth: 318,
  panelRuleY: 72,
  modelCardY: 84,
  modelCardHeight: 92,
  paramCardY: 192,
  paramCardHeight: 164,
  readoutCardY: 374,
  readoutCardHeight: 216,
  hintCardY: 608,
  hintCardHeight: 106,
  defaultMass: 2,
  defaultK: 2,
  defaultMicrosteps: 0,
  massMin: 0.5,
  massMax: 5,
  kMin: 0.5,
  kMax: 6,
  microstepsMin: 0,
  microstepsMax: 32,
  animationPeriod: 5
} as const;

const DEFAULTS: VariableWorkParams = {
  mode: 'linear',
  mass: 2,
  k: 2,
  microsteps: 0,
  autoRun: true
};
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
function normalize(
  input: Partial<VariableWorkParams>,
  previous = DEFAULTS
): VariableWorkParams {
  return {
    mode:
      input.mode === 'power' || input.mode === 'piecewise'
        ? input.mode
        : 'linear',
    mass: clamp(
      finite(input.mass, previous.mass),
      variableWorkConstants.massMin,
      variableWorkConstants.massMax
    ),
    k: clamp(
      finite(input.k, previous.k),
      variableWorkConstants.kMin,
      variableWorkConstants.kMax
    ),
    microsteps: Math.round(
      clamp(
        finite(input.microsteps, previous.microsteps),
        variableWorkConstants.microstepsMin,
        variableWorkConstants.microstepsMax
      )
    ),
    autoRun: input.autoRun ?? previous.autoRun
  };
}
export function workForce(params: VariableWorkParams, x: number): number {
  if (params.mode === 'power') return 10 / Math.max(0.4, x + 0.4);
  if (params.mode === 'piecewise')
    return x < 3 ? params.k * x : params.k * 3 - params.k * 0.5 * (x - 3);
  return params.k * x;
}
export function workValue(params: VariableWorkParams, x: number): number {
  if (params.mode === 'power') return 10 * Math.log((x + 0.4) / 0.4);
  if (params.mode === 'piecewise')
    return x <= 3
      ? 0.5 * params.k * x * x
      : 0.5 * params.k * 9 +
          params.k * 3 * (x - 3) -
          0.25 * params.k * (x - 3) * (x - 3);
  return 0.5 * params.k * x * x;
}
export function createVariableWorkSim(
  initial: Partial<VariableWorkParams> = {}
) {
  const defaults = normalize(initial);
  let params = { ...defaults };
  let time = 0;
  function getState(): VariableWorkState {
    const t = params.autoRun
      ? time
      : variableWorkConstants.animationPeriod * 0.5;
    const x = 1 + (t / variableWorkConstants.animationPeriod) * 3;
    const force = workForce(params, x);
    const work = workValue(params, x);
    const velocity = Math.sqrt(Math.max(0, (2 * work) / params.mass));
    const rectangles =
      params.microsteps > 0
        ? Array.from({ length: params.microsteps }, (_, i) => {
            const width = x / params.microsteps;
            return {
              x: i * width,
              width,
              height: workForce(params, i * width + width * 0.5)
            };
          })
        : [];
    return {
      params: { ...params },
      time: t,
      x,
      force,
      work,
      velocity,
      power: force * velocity,
      kineticGain: work,
      rectangles
    };
  }
  return {
    getState,
    getSnapshot: getState,
    getParams: (): VariableWorkParams => ({ ...params }),
    setParams(next: Partial<VariableWorkParams>) {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number) {
      if (params.autoRun) {
        time += Math.max(0, finite(dt, 0));
        if (time > variableWorkConstants.animationPeriod) time = 0;
      }
    },
    reset() {
      params = { ...defaults };
      time = 0;
    }
  };
}
