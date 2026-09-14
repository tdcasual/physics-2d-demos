import { clamp } from '../../core/math';

export type AirTrackMode = 'conservation' | 'theorem';
export type CollisionPreset =
  | 'equalElastic'
  | 'heavyMoving'
  | 'lightMoving'
  | 'inelastic';
export type AirTrackMomentumParams = {
  mode: AirTrackMode;
  preset: CollisionPreset;
  massA: number;
  massB: number;
  velocityA: number;
  velocityB: number;
  autoRun: boolean;
  showVectors: boolean;
};
export type AirTrackMomentumState = AirTrackMomentumParams & {
  time: number;
  xA: number;
  xB: number;
  vA: number;
  vB: number;
  vAAfter: number;
  vBAfter: number;
  collisionTime: number;
  contactProgress: number;
  force: number;
  impulse: number;
  totalMomentum: number;
  totalMomentumAfter: number;
  status: string;
};

export const airTrackMomentumConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  trackLeft: 80,
  trackRight: 1160,
  trackY: 405,
  trackScale: 180,
  cartWidth: 94,
  cartHeight: 54,
  wheelRadius: 10,
  cartStartA: 3.0,
  cartStartB: 5.0,
  contactGap: 0.55,
  collisionDuration: 0.42,
  timeMax: 5.6,
  massMin: 0.5,
  massMax: 3,
  velocityMin: -2,
  velocityMax: 2,
  velocityStep: 0.1,
  forcePeak: 18,
  springLength: 70,
  photogateA: 2.4,
  photogateB: 5.4,
  formulaX: 34,
  formulaY: 28,
  formulaWidth: 470,
  formulaHeight: 110,
  graphX: 34,
  graphY: 548,
  graphWidth: 714,
  graphHeight: 172,
  graphLeft: 82,
  graphRight: 712,
  graphTop: 574,
  graphBottom: 690,
  gateTop: 230,
  gateHeight: 175,
  meterStart: 1,
  meterEnd: 6,
  meterStep: 0.2,
  particleRadius: 11,
  vectorScale: 40,
  maxCanvasText: 18
} as const;

const C = airTrackMomentumConstants;
const DEFAULTS: AirTrackMomentumParams = {
  mode: 'conservation',
  preset: 'equalElastic',
  massA: 1,
  massB: 1,
  velocityA: 1.5,
  velocityB: 0,
  autoRun: true,
  showVectors: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
function bool(value: unknown, fallback: boolean): boolean {
  if (value === true || value === 1 || value === '1' || value === 'true')
    return true;
  if (value === false || value === 0 || value === '0' || value === 'false')
    return false;
  return fallback;
}
function normalize(
  input: Partial<AirTrackMomentumParams>,
  previous = DEFAULTS
): AirTrackMomentumParams {
  const mode: AirTrackMode =
    input.mode === 'theorem' || input.mode === 'conservation'
      ? input.mode
      : previous.mode;
  const preset: CollisionPreset =
    input.preset === 'heavyMoving' ||
    input.preset === 'lightMoving' ||
    input.preset === 'inelastic' ||
    input.preset === 'equalElastic'
      ? input.preset
      : previous.preset;
  return {
    mode,
    preset,
    massA: clamp(finite(input.massA, previous.massA), C.massMin, C.massMax),
    massB: clamp(finite(input.massB, previous.massB), C.massMin, C.massMax),
    velocityA: clamp(
      finite(input.velocityA, previous.velocityA),
      C.velocityMin,
      C.velocityMax
    ),
    velocityB: clamp(
      finite(input.velocityB, previous.velocityB),
      C.velocityMin,
      C.velocityMax
    ),
    autoRun: bool(input.autoRun, previous.autoRun),
    showVectors: bool(input.showVectors, previous.showVectors)
  };
}

function presetParams(params: AirTrackMomentumParams): AirTrackMomentumParams {
  if (params.preset === 'heavyMoving')
    return { ...params, massA: 2, massB: 1, velocityA: 1.5, velocityB: 0 };
  if (params.preset === 'lightMoving')
    return { ...params, massA: 1, massB: 2, velocityA: 0, velocityB: 1.5 };
  if (params.preset === 'inelastic')
    return { ...params, massA: 2, massB: 1, velocityA: 1.5, velocityB: 0 };
  return { ...params, massA: 1, massB: 1, velocityA: 1.5, velocityB: 0 };
}

function collisionVelocities(params: AirTrackMomentumParams): {
  vA: number;
  vB: number;
} {
  const { massA, massB, velocityA, velocityB } = params;
  if (params.preset === 'inelastic') {
    const common = (massA * velocityA + massB * velocityB) / (massA + massB);
    return { vA: common, vB: common };
  }
  return {
    vA: ((massA - massB) * velocityA + 2 * massB * velocityB) / (massA + massB),
    vB: (2 * massA * velocityA + (massB - massA) * velocityB) / (massA + massB)
  };
}

function derive(
  params: AirTrackMomentumParams,
  time: number
): AirTrackMomentumState {
  const t = clamp(Math.max(0, finite(time, 0)), 0, C.timeMax);
  const preset = presetParams(params);
  const relative = preset.velocityA - preset.velocityB;
  const distance = C.cartStartB - C.cartStartA - C.contactGap;
  const collisionTime =
    relative > 0
      ? clamp(distance / relative, 0.5, C.timeMax - C.collisionDuration - 0.2)
      : C.timeMax;
  const contactProgress = clamp(
    (t - collisionTime) / C.collisionDuration,
    0,
    1
  );
  const after = collisionVelocities(preset);
  let xA = C.cartStartA + preset.velocityA * Math.min(t, collisionTime);
  let xB = C.cartStartB + preset.velocityB * Math.min(t, collisionTime);
  let vA = preset.velocityA;
  let vB = preset.velocityB;
  if (t >= collisionTime) {
    const phase = contactProgress;
    const smooth = phase * phase * (3 - 2 * phase);
    vA = preset.velocityA + (after.vA - preset.velocityA) * smooth;
    vB = preset.velocityB + (after.vB - preset.velocityB) * smooth;
    xA =
      C.cartStartA +
      preset.velocityA * collisionTime +
      (t - collisionTime) * ((preset.velocityA + after.vA) / 2);
    xB =
      C.cartStartB +
      preset.velocityB * collisionTime +
      (t - collisionTime) * ((preset.velocityB + after.vB) / 2);
  }
  const inContact =
    t >= collisionTime && t <= collisionTime + C.collisionDuration;
  const force = inContact
    ? C.forcePeak * Math.sin(Math.PI * contactProgress)
    : 0;
  const impulse = inContact
    ? (C.forcePeak *
        C.collisionDuration *
        (1 - Math.cos(Math.PI * contactProgress))) /
      Math.PI
    : t > collisionTime + C.collisionDuration
      ? preset.massA * (after.vA - preset.velocityA)
      : 0;
  const totalMomentum = preset.massA * vA + preset.massB * vB;
  const totalMomentumAfter = preset.massA * after.vA + preset.massB * after.vB;
  const status = inContact
    ? '碰撞接触'
    : t < collisionTime
      ? '碰撞前'
      : '碰撞后';
  return {
    ...preset,
    time: t,
    xA,
    xB,
    vA,
    vB,
    vAAfter: after.vA,
    vBAfter: after.vB,
    collisionTime,
    contactProgress,
    force,
    impulse,
    totalMomentum,
    totalMomentumAfter,
    status
  };
}

export function airTrackMomentumAt(
  params: Partial<AirTrackMomentumParams> = {},
  time = 0
): AirTrackMomentumState {
  return derive(normalize(params), time);
}

export function createAirTrackMomentumSim(
  initial: Partial<AirTrackMomentumParams> = {}
) {
  let params = normalize(initial);
  let time = 0;
  return {
    getState: (): AirTrackMomentumState => derive(params, time),
    getSnapshot: (): AirTrackMomentumState => derive(params, time),
    getParams: (): AirTrackMomentumParams => ({ ...params }),
    setParams(next: Partial<AirTrackMomentumParams>): AirTrackMomentumParams {
      params = normalize({ ...params, ...next }, params);
      return { ...params };
    },
    step(dt: number): void {
      if (params.autoRun)
        time = Math.min(C.timeMax, time + clamp(finite(dt, 0), 0, 0.1));
    },
    relaunch(): void {
      time = 0;
    },
    reset(): void {
      params = { ...DEFAULTS };
      time = 0;
    }
  };
}
