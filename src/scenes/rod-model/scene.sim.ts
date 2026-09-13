import { clamp } from '../../core/math';

export type RodModel = 'resistor' | 'capacitor';

export type RodParams = {
  model: RodModel;
  fieldStrength: number;
  railGap: number;
  externalForce: number;
  mass: number;
  resistance: number;
  capacitance: number;
  autoRun: boolean;
};

export type RodState = {
  params: RodParams;
  time: number;
  position: number;
  velocity: number;
  acceleration: number;
  current: number;
  magneticForce: number;
  emf: number;
  heatingPower: number;
  terminalVelocity: number | null;
  equivalentMass: number;
  phase: number;
};

export const rodModelConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 760,
  panelX: 786,
  panelWidth: 382,
  diagramX: 42,
  diagramY: 48,
  diagramWidth: 688,
  diagramHeight: 318,
  railLeft: 90,
  railRight: 730,
  railTop: 130,
  railBottom: 290,
  fieldLeft: 180,
  fieldRight: 720,
  fieldTop: 72,
  fieldBottom: 352,
  graphX: 42,
  graphY: 388,
  graphWidth: 688,
  graphHeight: 320,
  graphLeft: 94,
  graphRight: 700,
  graphTop: 438,
  graphBottom: 676,
  graphGridStep: 64,
  circuitComponentHeight: 60,
  legendPanelX: 300,
  legendPanelY: 38,
  legendPanelWidth: 360,
  legendPanelHeight: 58,
  legendLineStartX: 305,
  legendLineEndX: 325,
  legendTextX: 338,
  legendLineY: 78,
  panelCardX: 786,
  panelCardWidth: 382,
  headerRuleY: 72,
  readoutY: 100,
  readoutHeight: 188,
  formulaY: 304,
  formulaHeight: 190,
  noteY: 510,
  noteHeight: 198,
  positionScale: 92,
  startPosition: 0,
  timeMax: 10,
  velocityMax: 12,
  fieldMin: 0.2,
  fieldMax: 3,
  railGapMin: 0.5,
  railGapMax: 2,
  forceMin: 0.5,
  forceMax: 6,
  massMin: 0.2,
  massMax: 2,
  resistanceMin: 0.2,
  resistanceMax: 4,
  capacitanceMin: 0.1,
  capacitanceMax: 2,
  animationPeriod: 12
} as const;

const DEFAULTS: RodParams = {
  model: 'resistor',
  fieldStrength: 1,
  railGap: 1,
  externalForce: 2,
  mass: 0.5,
  resistance: 1,
  capacitance: 0.5,
  autoRun: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalize(input: Partial<RodParams>, previous = DEFAULTS): RodParams {
  return {
    model:
      input.model === 'capacitor'
        ? 'capacitor'
        : input.model === 'resistor'
          ? 'resistor'
          : previous.model,
    fieldStrength: clamp(
      finite(input.fieldStrength, previous.fieldStrength),
      rodModelConstants.fieldMin,
      rodModelConstants.fieldMax
    ),
    railGap: clamp(
      finite(input.railGap, previous.railGap),
      rodModelConstants.railGapMin,
      rodModelConstants.railGapMax
    ),
    externalForce: clamp(
      finite(input.externalForce, previous.externalForce),
      rodModelConstants.forceMin,
      rodModelConstants.forceMax
    ),
    mass: clamp(
      finite(input.mass, previous.mass),
      rodModelConstants.massMin,
      rodModelConstants.massMax
    ),
    resistance: clamp(
      finite(input.resistance, previous.resistance),
      rodModelConstants.resistanceMin,
      rodModelConstants.resistanceMax
    ),
    capacitance: clamp(
      finite(input.capacitance, previous.capacitance),
      rodModelConstants.capacitanceMin,
      rodModelConstants.capacitanceMax
    ),
    autoRun: input.autoRun ?? previous.autoRun
  };
}

export function dragCoefficient(params: RodParams): number {
  return (
    (params.fieldStrength *
      params.fieldStrength *
      params.railGap *
      params.railGap) /
    params.resistance
  );
}

export function equivalentMass(params: RodParams): number {
  return params.model === 'capacitor'
    ? params.mass +
        params.fieldStrength *
          params.fieldStrength *
          params.railGap *
          params.railGap *
          params.capacitance
    : params.mass;
}

export function accelerationAt(params: RodParams, velocity: number): number {
  if (params.model === 'capacitor')
    return params.externalForce / equivalentMass(params);
  return (
    (params.externalForce - dragCoefficient(params) * velocity) / params.mass
  );
}

export function currentAt(params: RodParams, velocity: number): number {
  if (params.model === 'capacitor')
    return (
      params.capacitance *
      params.fieldStrength *
      params.railGap *
      accelerationAt(params, velocity)
    );
  return (params.fieldStrength * params.railGap * velocity) / params.resistance;
}

function derive(
  params: RodParams,
  time: number,
  position: number,
  velocity: number
): RodState {
  const acceleration = accelerationAt(params, velocity);
  const current = currentAt(params, velocity);
  const emf = params.fieldStrength * params.railGap * velocity;
  const magneticForce = params.fieldStrength * params.railGap * current;
  const terminalVelocity =
    params.model === 'resistor'
      ? params.externalForce / dragCoefficient(params)
      : null;
  return {
    params: { ...params },
    time,
    position,
    velocity,
    acceleration,
    current,
    magneticForce,
    emf,
    heatingPower:
      params.model === 'resistor' ? current * current * params.resistance : 0,
    terminalVelocity,
    equivalentMass: equivalentMass(params),
    phase: time / rodModelConstants.animationPeriod
  };
}

export function createRodModelSim(initial: Partial<RodParams> = {}) {
  let params = normalize(initial);
  let time = 0;
  let position = rodModelConstants.startPosition;
  let velocity = 0;
  return {
    getState: (): RodState => derive(params, time, position, velocity),
    getSnapshot: (): RodState => derive(params, time, position, velocity),
    getParams: (): RodParams => ({ ...params }),
    setParams(next: Partial<RodParams>): RodParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      const duration = Math.max(0, finite(dt, 0));
      const subSteps = Math.max(1, Math.ceil(duration * 20));
      const subDt = duration / subSteps;
      for (let index = 0; index < subSteps; index += 1) {
        const a = accelerationAt(params, velocity);
        velocity = Math.max(0, velocity + a * subDt);
        position += velocity * subDt;
        time += subDt;
      }
    },
    reset(): void {
      params = { ...DEFAULTS };
      time = 0;
      position = rodModelConstants.startPosition;
      velocity = 0;
    }
  };
}
