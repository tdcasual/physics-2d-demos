import { clamp } from '../../core/math';

export type ConnectedBodiesArrangement = 'string-spring' | 'spring-string';
export type CutTarget = 'none' | 'upper' | 'lower';
export type ConnectedBodiesParams = {
  arrangement: ConnectedBodiesArrangement;
  massA: number;
  massB: number;
  cut: CutTarget;
};
export type ConnectedBodiesState = {
  params: ConnectedBodiesParams;
  accelerationA: number;
  accelerationB: number;
  upperForce: number;
  lowerForce: number;
  released: boolean;
  time: number;
};

export const connectedBodiesConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 760,
  panelX: 786,
  panelWidth: 382,
  panelInset: 22,
  beamX: 72,
  beamY: 64,
  beamWidth: 190,
  beamHeight: 20,
  lineX: 164,
  topY: 84,
  ballAX: 164,
  ballAY: 226,
  ballBX: 164,
  ballBY: 438,
  ballRadius: 34,
  analysisX: 330,
  analysisWidth: 392,
  analysisAY: 146,
  analysisBY: 420,
  analysisHeight: 190,
  analysisRuleOffset: 52,
  cutLabelY: 650,
  noteY: 726,
  upperCutY1: 138,
  upperCutY2: 166,
  lowerCutY1: 342,
  lowerCutY2: 370,
  panelRuleY: 72,
  modelCardY: 84,
  modelCardHeight: 110,
  controlCardY: 206,
  controlCardHeight: 184,
  stateCardY: 406,
  stateCardHeight: 238,
  ruleCardY: 658,
  ruleCardHeight: 80,
  defaultMassA: 2,
  defaultMassB: 1,
  massMin: 0.5,
  massMax: 5,
  gravity: 10
} as const;

const DEFAULTS: ConnectedBodiesParams = {
  arrangement: 'string-spring',
  massA: 2,
  massB: 1,
  cut: 'none'
};
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
function normalize(
  input: Partial<ConnectedBodiesParams>,
  previous = DEFAULTS
): ConnectedBodiesParams {
  return {
    arrangement:
      input.arrangement === 'spring-string' ? 'spring-string' : 'string-spring',
    massA: clamp(
      finite(input.massA, previous.massA),
      connectedBodiesConstants.massMin,
      connectedBodiesConstants.massMax
    ),
    massB: clamp(
      finite(input.massB, previous.massB),
      connectedBodiesConstants.massMin,
      connectedBodiesConstants.massMax
    ),
    cut: input.cut === 'upper' || input.cut === 'lower' ? input.cut : 'none'
  };
}

export function createConnectedBodiesSim(
  initial: Partial<ConnectedBodiesParams> = {}
) {
  let params = normalize(initial);
  let time = 0;
  function getState(): ConnectedBodiesState {
    const { massA, massB } = params;
    const g = connectedBodiesConstants.gravity;
    let accelerationA = 0;
    let accelerationB = 0;
    let upperForce = (massA + massB) * g;
    let lowerForce = massB * g;
    if (params.cut === 'lower') {
      accelerationA = (massB * g) / massA;
      accelerationB = -g;
      lowerForce = 0;
    }
    if (params.cut === 'upper') {
      accelerationA = -g;
      accelerationB = g;
      upperForce = 0;
    }
    if (params.arrangement === 'spring-string' && params.cut === 'upper') {
      accelerationA = g;
      accelerationB = -g;
      lowerForce = massA * g;
    }
    return {
      params: { ...params },
      accelerationA,
      accelerationB,
      upperForce,
      lowerForce,
      released: params.cut !== 'none',
      time
    };
  }
  return {
    getState,
    getSnapshot: getState,
    getParams: (): ConnectedBodiesParams => ({ ...params }),
    setParams(next: Partial<ConnectedBodiesParams>) {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    cut(target: CutTarget) {
      params = normalize({ ...params, cut: target }, params);
      time = 0;
    },
    reset() {
      params = { ...DEFAULTS };
      time = 0;
    },
    step(dt: number) {
      if (params.cut !== 'none') time += Math.max(0, finite(dt, 0));
    }
  };
}
