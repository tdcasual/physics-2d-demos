import { clamp } from '../../core/math';

export type ConnectedBodiesInclineMode = 'freebody' | 'animation';
export type ConnectedBodiesInclineParams = {
  mode: ConnectedBodiesInclineMode;
  massA: number;
  massB: number;
  angle: number;
  mu: number;
  showForces: boolean;
  autoRun: boolean;
};
export type ConnectedBodiesInclineStatus = '静止' | '加速上滑' | '加速下滑';
export type ConnectedBodiesInclineState = ConnectedBodiesInclineParams & {
  time: number;
  displacement: number;
  acceleration: number;
  tension: number;
  normal: number;
  friction: number;
  drive: number;
  staticLimit: number;
  status: ConnectedBodiesInclineStatus;
  trend: '上滑趋势' | '下滑趋势' | '无运动趋势';
};

export const connectedBodiesInclineConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  gravity: 10,
  massMin: 1,
  massMax: 5,
  massStep: 0.5,
  angleMin: 15,
  angleMax: 60,
  angleStep: 1,
  muMin: 0,
  muMax: 0.8,
  muStep: 0.05,
  defaultMassA: 5,
  defaultMassB: 4,
  defaultAngle: 37,
  defaultMu: 0.2,
  animationPeriod: 6,
  groundLeft: 54,
  groundRight: 742,
  groundY: 650,
  inclineFootX: 74,
  inclineTopX: 620,
  inclineTopY: 176,
  pulleyX: 670,
  pulleyY: 176,
  pulleyRadius: 45,
  blockAX: 424,
  blockAY: 354,
  blockWidth: 104,
  blockHeight: 78,
  ropeEndY: 510,
  hangingX: 670,
  hangingWidth: 82,
  hangingHeight: 106,
  panelX: 790,
  panelY: 28,
  panelWidth: 382,
  headerY: 50,
  stateCardY: 92,
  stateCardHeight: 112,
  formulaCardY: 220,
  formulaCardHeight: 206,
  metricCardY: 442,
  metricCardHeight: 190,
  noteCardY: 648,
  noteCardHeight: 76,
  arrowLength: 76,
  frictionArrowLength: 58,
  motionScale: 17,
  displacementPx: 60,
  cardRadius: 14,
  gridStep: 48
} as const;

const C = connectedBodiesInclineConstants;
const DEFAULTS: ConnectedBodiesInclineParams = {
  mode: 'freebody',
  massA: C.defaultMassA,
  massB: C.defaultMassB,
  angle: C.defaultAngle,
  mu: C.defaultMu,
  showForces: true,
  autoRun: false
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
function flag(value: unknown, fallback: boolean): boolean {
  if (value === true || value === 1 || value === '1' || value === 'true')
    return true;
  if (value === false || value === 0 || value === '0' || value === 'false')
    return false;
  return fallback;
}
function normalize(
  input: Partial<ConnectedBodiesInclineParams>,
  previous = DEFAULTS
): ConnectedBodiesInclineParams {
  return {
    mode:
      input.mode === 'animation' || input.mode === 'freebody'
        ? input.mode
        : previous.mode,
    massA: clamp(finite(input.massA, previous.massA), C.massMin, C.massMax),
    massB: clamp(finite(input.massB, previous.massB), C.massMin, C.massMax),
    angle: clamp(finite(input.angle, previous.angle), C.angleMin, C.angleMax),
    mu: clamp(finite(input.mu, previous.mu), C.muMin, C.muMax),
    showForces: flag(input.showForces, previous.showForces),
    autoRun: flag(input.autoRun, previous.autoRun)
  };
}

export function deriveConnectedBodiesIncline(
  params: ConnectedBodiesInclineParams,
  time = 0
): ConnectedBodiesInclineState {
  const theta = (params.angle * Math.PI) / 180;
  const normal = params.massA * C.gravity * Math.cos(theta);
  const drive =
    params.massB * C.gravity - params.massA * C.gravity * Math.sin(theta);
  const staticLimit = params.mu * normal * 1.25;
  const moving = Math.abs(drive) > staticLimit + 1e-9;
  const direction = drive > 0 ? 1 : drive < 0 ? -1 : 0;
  const friction = moving ? -direction * params.mu * normal : -drive;
  const acceleration = moving
    ? (drive + friction) / (params.massA + params.massB)
    : 0;
  const tension = moving
    ? params.massB * (C.gravity - acceleration)
    : params.massB * C.gravity;
  const displacement =
    params.autoRun && moving
      ? direction *
        Math.min(
          0.72,
          C.motionScale *
            Math.abs(acceleration) *
            Math.pow((time % C.animationPeriod) / C.animationPeriod, 2)
        )
      : 0;
  const status: ConnectedBodiesInclineStatus = !moving
    ? '静止'
    : direction > 0
      ? '加速上滑'
      : '加速下滑';
  return {
    ...params,
    time: Math.max(0, finite(time, 0)),
    displacement,
    acceleration,
    tension,
    normal,
    friction,
    drive,
    staticLimit,
    status,
    trend:
      direction > 0 ? '上滑趋势' : direction < 0 ? '下滑趋势' : '无运动趋势'
  };
}

export function createConnectedBodiesInclineSim(
  initial: Partial<ConnectedBodiesInclineParams> = {}
) {
  let params = normalize(initial);
  let time = 0;
  return {
    getState: (): ConnectedBodiesInclineState =>
      deriveConnectedBodiesIncline(params, time),
    getSnapshot: (): ConnectedBodiesInclineState =>
      deriveConnectedBodiesIncline(params, time),
    getParams: (): ConnectedBodiesInclineParams => ({ ...params }),
    setParams(
      next: Partial<ConnectedBodiesInclineParams>
    ): ConnectedBodiesInclineParams {
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
