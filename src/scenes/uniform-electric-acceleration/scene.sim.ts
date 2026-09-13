import { clamp } from '../../core/math';

export type UniformElectricAccelerationParams = {
  voltage: number;
  plateGap: number;
  charge: number;
  mass: number;
  autoRun: boolean;
  showVectors: boolean;
};

export type UniformElectricAccelerationState = {
  params: UniformElectricAccelerationParams;
  time: number;
  stage: 'inside' | 'exit';
  progress: number;
  position: number;
  speed: number;
  electricField: number;
  force: number;
  acceleration: number;
  work: number;
  kineticEnergy: number;
  finalSpeed: number;
  transitTime: number;
  passageDuration: number;
};

export const uniformElectricAccelerationConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 790,
  panelX: 790,
  panelWidth: 410,
  panelInset: 24,
  plateLeft: 210,
  plateTop: 230,
  plateBottom: 580,
  axisY: 410,
  gapScale: 26,
  fieldTop: 72,
  fieldBottom: 700,
  gridStep: 54,
  particleRadius: 12,
  defaultVoltage: 50,
  defaultPlateGap: 10,
  defaultCharge: 1,
  defaultMass: 1,
  voltageMin: 20,
  voltageMax: 100,
  plateGapMin: 4,
  plateGapMax: 20,
  chargeMin: 0.5,
  chargeMax: 3,
  massMin: 0.5,
  massMax: 4,
  chargeUnit: 1.602176634e-19,
  massUnit: 1.67262192369e-27,
  titleY: 38,
  panelRuleY: 72,
  metricsCardY: 94,
  metricsCardHeight: 288,
  formulaCardY: 404,
  formulaCardHeight: 236,
  energyCardX: 540,
  energyCardY: 92,
  energyCardWidth: 220,
  energyCardHeight: 132,
  passageBase: 1.05,
  passagePerCm: 0.09,
  holdDuration: 0.85,
  cardRadius: 12
} as const;

const DEFAULTS: UniformElectricAccelerationParams = {
  voltage: uniformElectricAccelerationConstants.defaultVoltage,
  plateGap: uniformElectricAccelerationConstants.defaultPlateGap,
  charge: uniformElectricAccelerationConstants.defaultCharge,
  mass: uniformElectricAccelerationConstants.defaultMass,
  autoRun: true,
  showVectors: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalize(
  input: Partial<UniformElectricAccelerationParams>,
  previous = DEFAULTS
): UniformElectricAccelerationParams {
  return {
    voltage: clamp(
      finite(input.voltage, previous.voltage),
      uniformElectricAccelerationConstants.voltageMin,
      uniformElectricAccelerationConstants.voltageMax
    ),
    plateGap: clamp(
      finite(input.plateGap, previous.plateGap),
      uniformElectricAccelerationConstants.plateGapMin,
      uniformElectricAccelerationConstants.plateGapMax
    ),
    charge: clamp(
      finite(input.charge, previous.charge),
      uniformElectricAccelerationConstants.chargeMin,
      uniformElectricAccelerationConstants.chargeMax
    ),
    mass: clamp(
      finite(input.mass, previous.mass),
      uniformElectricAccelerationConstants.massMin,
      uniformElectricAccelerationConstants.massMax
    ),
    autoRun: input.autoRun ?? previous.autoRun,
    showVectors: input.showVectors ?? previous.showVectors
  };
}

export function uniformElectricAccelerationMeasures(
  params: Pick<
    UniformElectricAccelerationParams,
    'voltage' | 'plateGap' | 'charge' | 'mass'
  >
) {
  const gapMeters = params.plateGap / 100;
  const chargeC =
    params.charge * uniformElectricAccelerationConstants.chargeUnit;
  const massKg = params.mass * uniformElectricAccelerationConstants.massUnit;
  const electricField = params.voltage / Math.max(1e-6, gapMeters);
  const force = chargeC * electricField;
  const acceleration = force / massKg;
  const work = chargeC * params.voltage;
  const finalSpeed = Math.sqrt((2 * work) / massKg);
  const transitTime = Math.sqrt((2 * gapMeters) / acceleration);
  const passageDuration =
    uniformElectricAccelerationConstants.passageBase +
    params.plateGap * uniformElectricAccelerationConstants.passagePerCm;
  return {
    gapMeters,
    chargeC,
    massKg,
    electricField,
    force,
    acceleration,
    work,
    finalSpeed,
    transitTime,
    passageDuration
  };
}

export function createUniformElectricAccelerationSim(
  initial: Partial<UniformElectricAccelerationParams> = {}
) {
  const defaults = normalize(initial);
  let params = { ...defaults };
  let time = 0;

  function getState(): UniformElectricAccelerationState {
    const result = uniformElectricAccelerationMeasures(params);
    const cycle =
      result.passageDuration +
      uniformElectricAccelerationConstants.holdDuration;
    const current = time % cycle;
    const inside = current < result.passageDuration;
    const progress = inside ? current / result.passageDuration : 1;
    return {
      params: { ...params },
      time,
      stage: inside ? 'inside' : 'exit',
      progress,
      position: result.gapMeters * progress,
      speed: result.finalSpeed * Math.sqrt(progress),
      electricField: result.electricField,
      force: result.force,
      acceleration: result.acceleration,
      work: result.work * progress,
      kineticEnergy: result.work * progress,
      finalSpeed: result.finalSpeed,
      transitTime: result.transitTime,
      passageDuration: result.passageDuration
    };
  }

  return {
    getState,
    getSnapshot: getState,
    getParams: (): UniformElectricAccelerationParams => ({ ...params }),
    setParams(
      next: Partial<UniformElectricAccelerationParams>
    ): UniformElectricAccelerationParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      if (params.autoRun) time += Math.max(0, finite(dt, 0));
    },
    reset(): void {
      params = { ...defaults };
      time = 0;
    }
  };
}
