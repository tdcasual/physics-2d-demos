import { clamp } from '../../core/math';

export type PotentialScenario = 'segments' | 'point' | 'dipole';
export type PotentialGraphParams = {
  scenario: PotentialScenario;
  probeCharge: 1 | -1;
  chargeMagnitude: number;
  probePosition: number;
  showTangent: boolean;
  showArea: boolean;
  autoRun: boolean;
};
export type PotentialGraphState = {
  params: PotentialGraphParams;
  time: number;
  probePosition: number;
  potential: number;
  field: number;
  potentialEnergy: number;
  force: number;
  slope: number;
  status: string;
  phase: number;
};

export const potentialGraphConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 760,
  panelX: 786,
  panelWidth: 382,
  fieldLeft: 42,
  fieldRight: 730,
  fieldTop: 104,
  fieldBottom: 708,
  lineY: 184,
  lineLeft: 76,
  lineRight: 704,
  phiGraphX: 42,
  phiGraphY: 268,
  phiGraphWidth: 688,
  phiGraphHeight: 210,
  eGraphX: 42,
  eGraphY: 500,
  eGraphWidth: 688,
  eGraphHeight: 208,
  graphLeft: 76,
  graphRight: 704,
  phiTop: 292,
  phiBottom: 450,
  eTop: 524,
  eBottom: 682,
  xMin: 0,
  xMax: 10,
  phiMin: -2,
  phiMax: 11,
  eMin: -4,
  eMax: 4,
  graphGridStep: 64,
  probeRadius: 18,
  electrodeWidth: 10,
  electrodeHeight: 76,
  electrodeHalfHeight: 38,
  cardX: 786,
  cardWidth: 382,
  headerRuleY: 72,
  readoutY: 100,
  readoutHeight: 180,
  summaryY: 298,
  summaryHeight: 172,
  notesY: 486,
  notesHeight: 222,
  probeMin: 0.3,
  probeMax: 9.7,
  chargeMin: 0.5,
  chargeMax: 2,
  animationPeriod: 9,
  tangentSpan: 0.8
} as const;

const DEFAULTS: PotentialGraphParams = {
  scenario: 'segments',
  probeCharge: 1,
  chargeMagnitude: 1,
  probePosition: 7.58,
  showTangent: true,
  showArea: true,
  autoRun: false
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalize(
  input: Partial<PotentialGraphParams>,
  previous = DEFAULTS
): PotentialGraphParams {
  const scenario =
    input.scenario === 'point' ||
    input.scenario === 'dipole' ||
    input.scenario === 'segments'
      ? input.scenario
      : previous.scenario;
  const probeCharge =
    input.probeCharge === -1
      ? -1
      : input.probeCharge === 1
        ? 1
        : previous.probeCharge;
  return {
    scenario,
    probeCharge,
    chargeMagnitude: clamp(
      finite(input.chargeMagnitude, previous.chargeMagnitude),
      potentialGraphConstants.chargeMin,
      potentialGraphConstants.chargeMax
    ),
    probePosition: clamp(
      finite(input.probePosition, previous.probePosition),
      potentialGraphConstants.probeMin,
      potentialGraphConstants.probeMax
    ),
    showTangent: input.showTangent ?? previous.showTangent,
    showArea: input.showArea ?? previous.showArea,
    autoRun: input.autoRun ?? previous.autoRun
  };
}

export function potentialAt(
  scenario: PotentialScenario,
  x: number
): { potential: number; field: number } {
  const position = clamp(
    x,
    potentialGraphConstants.xMin,
    potentialGraphConstants.xMax
  );
  if (scenario === 'point')
    return { potential: 10 - 1.4 * position, field: 1.4 };
  if (scenario === 'dipole') {
    const potential = 8 / (position + 1) - 8 / (11 - position);
    const field = 8 / (position + 1) ** 2 + 8 / (11 - position) ** 2;
    return { potential, field };
  }
  if (position < 3) return { potential: 10 - 3 * position, field: 3 };
  if (position < 7) return { potential: 1 + 2 * (position - 3), field: -2 };
  return { potential: 9 - 1.5 * (position - 7), field: 1.5 };
}

function derive(
  params: PotentialGraphParams,
  time: number
): PotentialGraphState {
  const probePosition = params.autoRun
    ? potentialGraphConstants.probeMin +
      ((time % potentialGraphConstants.animationPeriod) /
        potentialGraphConstants.animationPeriod) *
        (potentialGraphConstants.probeMax - potentialGraphConstants.probeMin)
    : params.probePosition;
  const values = potentialAt(params.scenario, probePosition);
  const potentialEnergy =
    params.probeCharge * params.chargeMagnitude * values.potential;
  const force = params.probeCharge * params.chargeMagnitude * values.field;
  return {
    params: { ...params },
    time,
    probePosition,
    potential: values.potential,
    field: values.field,
    potentialEnergy,
    force,
    slope: -values.field,
    status:
      params.probeCharge > 0 ? '正试探电荷：F 沿 +E' : '负试探电荷：F 沿 −E',
    phase: time / potentialGraphConstants.animationPeriod
  };
}

export function createPotentialGraphSim(
  initial: Partial<PotentialGraphParams> = {}
) {
  let params = normalize(initial);
  let time = 0;
  return {
    getState: (): PotentialGraphState => derive(params, time),
    getSnapshot: (): PotentialGraphState => derive(params, time),
    getParams: (): PotentialGraphParams => ({ ...params }),
    setParams(next: Partial<PotentialGraphParams>): PotentialGraphParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      if (params.autoRun) time += Math.max(0, finite(dt, 0));
    },
    reset(): void {
      params = { ...DEFAULTS };
      time = 0;
    }
  };
}
