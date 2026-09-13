import { clamp } from '../../core/math';

export type LoopRegion = 'before' | 'entering' | 'inside' | 'exiting' | 'after';
export type SingleLoopParams = {
  initialVelocity: number;
  fieldStrength: number;
  mass: number;
  resistance: number;
  autoRun: boolean;
  showCurrent: boolean;
};
export type SingleLoopState = {
  params: SingleLoopParams;
  time: number;
  position: number;
  velocity: number;
  current: number;
  acceleration: number;
  emf: number;
  magneticForce: number;
  overlap: number;
  region: LoopRegion;
  phase: number;
};

export const singleLoopConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 760,
  panelX: 786,
  panelWidth: 382,
  diagramX: 42,
  diagramY: 48,
  diagramWidth: 688,
  diagramHeight: 278,
  fieldLeft: 300,
  fieldRight: 620,
  fieldTop: 94,
  fieldBottom: 246,
  trackY: 170,
  loopHeight: 1.2,
  loopWidth: 1,
  physicalFieldWidth: 4,
  positionScale: 80,
  graphY: 350,
  graphHeight: 358,
  vGraphX: 42,
  vGraphWidth: 334,
  iGraphX: 396,
  iGraphWidth: 334,
  graphTop: 406,
  graphBottom: 676,
  graphLeftInset: 46,
  graphRightInset: 18,
  xMin: -2,
  xMax: 6,
  vMin: 0,
  vMax: 12,
  currentMax: 12,
  graphGridStep: 56,
  panelCardX: 786,
  panelCardWidth: 382,
  headerRuleY: 72,
  readoutY: 100,
  readoutHeight: 214,
  formulaY: 336,
  formulaHeight: 210,
  noteY: 566,
  noteHeight: 142,
  startPosition: -1.2,
  timeMax: 12,
  wireLength: 140,
  velocityMin: 2,
  velocityMax: 20,
  fieldMin: 0.2,
  fieldMax: 3,
  massMin: 0.5,
  massMax: 4,
  resistanceMin: 0.5,
  resistanceMax: 8,
  animationPeriod: 12
} as const;

const DEFAULTS: SingleLoopParams = {
  initialVelocity: 10,
  fieldStrength: 1.5,
  mass: 2,
  resistance: 2,
  autoRun: true,
  showCurrent: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalize(
  input: Partial<SingleLoopParams>,
  previous = DEFAULTS
): SingleLoopParams {
  return {
    initialVelocity: clamp(
      finite(input.initialVelocity, previous.initialVelocity),
      singleLoopConstants.velocityMin,
      singleLoopConstants.velocityMax
    ),
    fieldStrength: clamp(
      finite(input.fieldStrength, previous.fieldStrength),
      singleLoopConstants.fieldMin,
      singleLoopConstants.fieldMax
    ),
    mass: clamp(
      finite(input.mass, previous.mass),
      singleLoopConstants.massMin,
      singleLoopConstants.massMax
    ),
    resistance: clamp(
      finite(input.resistance, previous.resistance),
      singleLoopConstants.resistanceMin,
      singleLoopConstants.resistanceMax
    ),
    autoRun: input.autoRun ?? previous.autoRun,
    showCurrent: input.showCurrent ?? previous.showCurrent
  };
}

export function regionAt(position: number): LoopRegion {
  if (position < -singleLoopConstants.loopWidth) return 'before';
  if (position < 0) return 'entering';
  if (
    position <
    singleLoopConstants.physicalFieldWidth - singleLoopConstants.loopWidth
  )
    return 'inside';
  if (position < singleLoopConstants.physicalFieldWidth) return 'exiting';
  return 'after';
}

export function dampingRate(params: SingleLoopParams): number {
  const d = singleLoopConstants.loopHeight;
  return (
    (params.fieldStrength * params.fieldStrength * d * d) /
    (params.mass * params.resistance)
  );
}

export function velocityAtPosition(
  params: SingleLoopParams,
  position: number
): number {
  const k = dampingRate(params);
  const enteringDistance = clamp(
    position + singleLoopConstants.loopWidth,
    0,
    singleLoopConstants.loopWidth
  );
  const exitDistance = clamp(
    position -
      (singleLoopConstants.physicalFieldWidth - singleLoopConstants.loopWidth),
    0,
    singleLoopConstants.loopWidth
  );
  return Math.max(
    0,
    params.initialVelocity - k * enteringDistance - k * exitDistance
  );
}

export function currentAtPosition(
  params: SingleLoopParams,
  position: number
): number {
  const region = regionAt(position);
  if (region !== 'entering' && region !== 'exiting') return 0;
  return (
    ((region === 'entering' ? 1 : -1) *
      params.fieldStrength *
      singleLoopConstants.loopHeight *
      velocityAtPosition(params, position)) /
    params.resistance
  );
}

function derive(
  params: SingleLoopParams,
  time: number,
  position: number
): SingleLoopState {
  const region = regionAt(position);
  const velocity = velocityAtPosition(params, position);
  const current = currentAtPosition(params, position);
  const k = dampingRate(params);
  const active = region === 'entering' || region === 'exiting';
  const acceleration = active ? -k * velocity : 0;
  const emf =
    Math.abs(params.fieldStrength * singleLoopConstants.loopHeight * velocity) *
    (active ? 1 : 0);
  return {
    params: { ...params },
    time,
    position,
    velocity,
    current,
    acceleration,
    emf,
    magneticForce:
      params.fieldStrength * singleLoopConstants.loopHeight * current,
    overlap: clamp(
      Math.min(
        position + singleLoopConstants.loopWidth,
        singleLoopConstants.physicalFieldWidth
      ) - Math.max(position, 0),
      0,
      singleLoopConstants.loopWidth
    ),
    region,
    phase: time / singleLoopConstants.animationPeriod
  };
}

export function createSingleLoopSim(initial: Partial<SingleLoopParams> = {}) {
  let params = normalize(initial);
  let time = 0;
  let position = singleLoopConstants.startPosition;
  let velocity = params.initialVelocity;
  return {
    getState: (): SingleLoopState => derive(params, time, position),
    getSnapshot: (): SingleLoopState => derive(params, time, position),
    getParams: (): SingleLoopParams => ({ ...params }),
    setParams(next: Partial<SingleLoopParams>): SingleLoopParams {
      params = normalize({ ...params, ...next }, params);
      if (next.initialVelocity !== undefined && time === 0)
        velocity = params.initialVelocity;
      return { ...params };
    },
    step(dt: number): void {
      if (
        !params.autoRun ||
        position >=
          singleLoopConstants.physicalFieldWidth +
            singleLoopConstants.loopWidth +
            0.8
      )
        return;
      const duration = Math.max(0, finite(dt, 0));
      const subSteps = Math.max(1, Math.ceil(duration * 12));
      const subDt = duration / subSteps;
      for (let index = 0; index < subSteps; index += 1) {
        const region = regionAt(position);
        if (region === 'entering' || region === 'exiting') {
          velocity = Math.max(
            0,
            velocity - dampingRate(params) * velocity * subDt
          );
        }
        position += velocity * subDt;
        time += subDt;
      }
    },
    reset(): void {
      params = { ...DEFAULTS };
      time = 0;
      position = singleLoopConstants.startPosition;
      velocity = params.initialVelocity;
    }
  };
}
