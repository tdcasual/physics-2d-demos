import { clamp } from '../../core/math';
export type TwoBallParams = {
  length: number;
  angle: number;
  massA: number;
  massB: number;
  autoRun: boolean;
};
export type TwoBallState = TwoBallParams & {
  x: number;
  y: number;
  speed: number;
  vA: number;
  vB: number;
  potential: number;
  kineticA: number;
  kineticB: number;
  totalEnergy: number;
  time: number;
};
export const twoBallConstants = {
  baseWidth: 1280,
  baseHeight: 820,
  fieldWidth: 860,
  panelX: 860,
  panelWidth: 420,
  cardRadius: 12
} as const;
const DEFAULTS: TwoBallParams = {
  length: 1,
  angle: 0.9,
  massA: 1,
  massB: 1,
  autoRun: true
};
const g = 9.8;
function num(v: unknown, f: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : f;
}
function normalize(
  input: Partial<TwoBallParams>,
  previous = DEFAULTS
): TwoBallParams {
  return {
    length: clamp(num(input.length, previous.length), 0.5, 1.5),
    angle: clamp(num(input.angle, previous.angle), -1.5, 1.5),
    massA: clamp(num(input.massA, previous.massA), 0.5, 3),
    massB: clamp(num(input.massB, previous.massB), 0.5, 3),
    autoRun: input.autoRun ?? previous.autoRun
  };
}
export function calculateTwoBall(
  params: TwoBallParams,
  time: number
): TwoBallState {
  const a = params.autoRun
    ? params.angle + 0.65 * Math.sin(time * 0.8)
    : params.angle;
  const x = params.length * Math.sin(a);
  const y = -params.length * Math.cos(a);
  const totalEnergy = params.massA * g * params.length;
  const potential = params.massA * g * (y + params.length);
  const kinetic = Math.max(0, totalEnergy - potential);
  const vA =
    Math.sqrt((2 * kinetic) / Math.max(params.massA, 0.01)) *
    Math.abs(Math.cos(a));
  const vB =
    Math.sqrt((2 * kinetic) / Math.max(params.massB, 0.01)) *
    Math.abs(Math.sin(a));
  const kineticA = 0.5 * params.massA * vA * vA;
  const kineticB = Math.max(0, totalEnergy - potential - kineticA);
  const speed = Math.sqrt(
    (2 * kinetic) / Math.max(params.massA + params.massB, 0.01)
  );
  return {
    ...params,
    angle: a,
    x,
    y,
    speed,
    vA,
    vB,
    potential,
    kineticA,
    kineticB,
    totalEnergy,
    time
  };
}
export function createTwoBallSim(initial: Partial<TwoBallParams> = {}) {
  const defaults = normalize(initial);
  let params = { ...defaults };
  let time = 0;
  function getState(): TwoBallState {
    return calculateTwoBall(params, time);
  }
  return {
    getState,
    getSnapshot: getState,
    getParams: (): TwoBallParams => ({ ...params }),
    setParams(next: Partial<TwoBallParams>): TwoBallParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      if (params.autoRun) time += Math.max(0, num(dt, 0));
    },
    reset(): void {
      params = { ...defaults };
      time = 0;
    }
  };
}
