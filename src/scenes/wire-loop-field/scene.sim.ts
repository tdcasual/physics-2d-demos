import { clamp } from '../../core/math';

export type WireLoopShape = 'rectangle' | 'triangle' | 'circle' | 'semicircle';
export type MagneticDirection = 'into' | 'out';
export type WireLoopRegion =
  | 'before'
  | 'entering'
  | 'inside'
  | 'exiting'
  | 'after';

export type WireLoopFieldParams = {
  shape: WireLoopShape;
  fieldStrength: number;
  fieldDirection: MagneticDirection;
  velocity: number;
  resistance: number;
  autoRun: boolean;
  showCurrent: boolean;
};

export type WireLoopFieldState = WireLoopFieldParams & {
  time: number;
  position: number;
  overlap: number;
  coverage: number;
  flux: number;
  emf: number;
  current: number;
  magneticForce: number;
  equivalentLength: number;
  region: WireLoopRegion;
  currentDirection: 'clockwise' | 'counterclockwise' | 'none';
};

export const wireLoopFieldConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 820,
  panelX: 830,
  panelWidth: 370,
  fieldLeft: 220,
  fieldRight: 520,
  fieldTop: 96,
  fieldBottom: 388,
  loopY: 202,
  worldOriginX: 30,
  positionScale: 120,
  loopWidth: 1.5,
  loopHeight: 0.8,
  circleDiameter: 1.2,
  fieldPhysicalLeft: 1.58,
  fieldPhysicalRight: 4.08,
  startPosition: 0.32,
  endPosition: 5.45,
  gridStep: 56,
  fieldMarkStep: 60,
  graphTop: 470,
  graphBottom: 718,
  graphLeft: 48,
  graphGap: 26,
  graphWidth: 360,
  graphInsetLeft: 42,
  graphInsetRight: 16,
  graphTitleY: 494,
  panelTitleY: 42,
  panelRuleY: 72,
  panelStatusY: 94,
  panelStatusHeight: 126,
  panelDataY: 234,
  panelDataHeight: 192,
  panelFormulaY: 446,
  panelFormulaHeight: 160,
  panelHintY: 626,
  panelHintHeight: 98,
  panelInset: 28,
  animationMax: 12,
  sampleDt: 0.016,
  fieldMin: 0.2,
  fieldMax: 3,
  velocityMin: 0.5,
  velocityMax: 5,
  resistanceMin: 0.5,
  resistanceMax: 8,
  defaultField: 1,
  defaultVelocity: 2,
  defaultResistance: 2
} as const;

const DEFAULTS: WireLoopFieldParams = {
  shape: 'rectangle',
  fieldStrength: wireLoopFieldConstants.defaultField,
  fieldDirection: 'into',
  velocity: wireLoopFieldConstants.defaultVelocity,
  resistance: wireLoopFieldConstants.defaultResistance,
  autoRun: true,
  showCurrent: true
};

type ShapeGeometry = { width: number; height: number; area: number };
export function shapeGeometry(shape: WireLoopShape): ShapeGeometry {
  if (shape === 'circle' || shape === 'semicircle') {
    const diameter = wireLoopFieldConstants.circleDiameter;
    return {
      width: diameter,
      height: diameter,
      area:
        shape === 'circle'
          ? Math.PI * (diameter / 2) ** 2
          : (Math.PI * (diameter / 2) ** 2) / 2
    };
  }
  return {
    width: wireLoopFieldConstants.loopWidth,
    height: wireLoopFieldConstants.loopHeight,
    area:
      shape === 'triangle'
        ? (wireLoopFieldConstants.loopWidth *
            wireLoopFieldConstants.loopHeight) /
          2
        : wireLoopFieldConstants.loopWidth * wireLoopFieldConstants.loopHeight
  };
}

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
  input: Partial<WireLoopFieldParams>,
  previous = DEFAULTS
): WireLoopFieldParams {
  return {
    shape:
      input.shape === 'rectangle' ||
      input.shape === 'triangle' ||
      input.shape === 'circle' ||
      input.shape === 'semicircle'
        ? input.shape
        : previous.shape,
    fieldStrength: clamp(
      finite(input.fieldStrength, previous.fieldStrength),
      wireLoopFieldConstants.fieldMin,
      wireLoopFieldConstants.fieldMax
    ),
    fieldDirection:
      input.fieldDirection === 'into' || input.fieldDirection === 'out'
        ? input.fieldDirection
        : previous.fieldDirection,
    velocity: clamp(
      finite(input.velocity, previous.velocity),
      wireLoopFieldConstants.velocityMin,
      wireLoopFieldConstants.velocityMax
    ),
    resistance: clamp(
      finite(input.resistance, previous.resistance),
      wireLoopFieldConstants.resistanceMin,
      wireLoopFieldConstants.resistanceMax
    ),
    autoRun: asFlag(input.autoRun, previous.autoRun),
    showCurrent: asFlag(input.showCurrent, previous.showCurrent)
  };
}

function profileAt(shape: WireLoopShape, u: number): number {
  const clamped = clamp(u, 0, 1);
  if (shape === 'rectangle') return 1;
  if (shape === 'triangle') return 2 * Math.min(clamped, 1 - clamped);
  if (shape === 'circle' || shape === 'semicircle')
    return Math.sqrt(Math.max(0, 1 - (2 * clamped - 1) ** 2));
  return 1;
}

/** Fraction of the loop's area that lies between the two vertical field boundaries. */
export function areaCoverage(shape: WireLoopShape, position: number): number {
  const geometry = shapeGeometry(shape);
  const left = wireLoopFieldConstants.fieldPhysicalLeft;
  const right = wireLoopFieldConstants.fieldPhysicalRight;
  const start = clamp((left - position) / geometry.width, 0, 1);
  const end = clamp((right - position) / geometry.width, 0, 1);
  if (end <= start) return 0;
  const samples = 48;
  const step = (end - start) / samples;
  let integral = 0;
  for (let index = 0; index <= samples; index += 1) {
    const u = start + index * step;
    const weight = index === 0 || index === samples ? 0.5 : 1;
    integral += profileAt(shape, u) * weight;
  }
  const fullIntegral =
    shape === 'rectangle' ? 1 : shape === 'triangle' ? 0.5 : Math.PI / 4;
  return clamp((integral * step) / fullIntegral, 0, 1);
}

function regionAt(shape: WireLoopShape, position: number): WireLoopRegion {
  const width = shapeGeometry(shape).width;
  const left = wireLoopFieldConstants.fieldPhysicalLeft;
  const right = wireLoopFieldConstants.fieldPhysicalRight;
  const coverage = areaCoverage(shape, position);
  if (coverage <= 1e-5 && position + width <= left) return 'before';
  if (coverage <= 1e-5 && position >= right) return 'after';
  if (position < left) return 'entering';
  if (position + width <= right) return 'inside';
  return 'exiting';
}

function derive(
  params: WireLoopFieldParams,
  time: number,
  position: number
): WireLoopFieldState {
  const geometry = shapeGeometry(params.shape);
  const coverage = areaCoverage(params.shape, position);
  const epsilon = 0.002;
  const derivative =
    (areaCoverage(params.shape, position + epsilon) -
      areaCoverage(params.shape, position - epsilon)) /
    (2 * epsilon);
  const flux = params.fieldStrength * geometry.area * coverage;
  const emf = Math.abs(
    params.fieldStrength * geometry.area * derivative * params.velocity
  );
  const signedCurrent =
    params.fieldDirection === 'into'
      ? -emf / params.resistance
      : emf / params.resistance;
  const region = regionAt(params.shape, position);
  const active = region === 'entering' || region === 'exiting';
  const equivalentLength = active ? Math.abs(geometry.height * derivative) : 0;
  const magneticForce =
    params.fieldStrength * Math.abs(signedCurrent) * equivalentLength;
  const currentDirection =
    !params.showCurrent || !active || Math.abs(signedCurrent) < 1e-6
      ? 'none'
      : signedCurrent < 0
        ? 'counterclockwise'
        : 'clockwise';
  return {
    ...params,
    time,
    position,
    overlap: coverage * geometry.width,
    coverage,
    flux,
    emf,
    current: signedCurrent,
    magneticForce,
    equivalentLength,
    region,
    currentDirection
  };
}

export function wireLoopFieldAt(
  params: WireLoopFieldParams,
  position: number,
  time = 0
): WireLoopFieldState {
  return derive(normalize(params), time, position);
}

export function createWireLoopFieldSim(
  initial: Partial<WireLoopFieldParams> = {}
) {
  let params = normalize(initial);
  let time = 0;
  let position = wireLoopFieldConstants.startPosition;
  return {
    getState: (): WireLoopFieldState => derive(params, time, position),
    getSnapshot: (): WireLoopFieldState => derive(params, time, position),
    getParams: (): WireLoopFieldParams => ({ ...params }),
    setParams(next: Partial<WireLoopFieldParams>): WireLoopFieldParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      const duration = clamp(finite(dt, 0), 0, 0.1);
      const width = shapeGeometry(params.shape).width;
      position += params.velocity * duration;
      time += duration;
      if (position > wireLoopFieldConstants.endPosition + width) {
        position = wireLoopFieldConstants.startPosition;
        time = 0;
      }
    },
    reset(): void {
      params = { ...DEFAULTS };
      position = wireLoopFieldConstants.startPosition;
      time = 0;
    }
  };
}
