import { clamp } from '../../core/math';

export type SpringBallMode = 'single' | 'continuous';
export type SpringBallPreset = 'h0' | 'h-x0' | 'h-2x0' | 'h-3x0';

export type SpringBallParams = {
  releaseHeight: number;
  mode: SpringBallMode;
  preset: SpringBallPreset;
  autoRun: boolean;
  slow: boolean;
};

export type SpringBallState = {
  params: SpringBallParams;
  time: number;
  contactTime: number;
  stage: 'free-fall' | 'contact' | 'bottom';
  x: number;
  velocity: number;
  acceleration: number;
  springForce: number;
  netForce: number;
  phase: number;
  equilibriumX: number;
  symmetryX: number;
  bottomX: number;
  history: Array<{ t: number; x: number }>;
};

export const springBallConstants = {
  baseWidth: 660,
  baseHeight: 760,
  fieldWidth: 660,
  fieldLeft: 36,
  fieldRight: 640,
  fieldTop: 54,
  fieldBottom: 700,
  originY: 290,
  floorY: 660,
  ballRadius: 22,
  minBallCenterY: 72,
  positionScale: 520,
  mass: 1,
  stiffness: 40,
  gravity: 10,
  equilibriumX: 0.25,
  sampleDt: 0.016,
  springCenterX: 258,
  springBaseX: 222,
  springBaseWidth: 72,
  springBaseY: 30,
  springFloorX: 176,
  springFloorWidth: 164,
  springFloorEdgeLeft: 172,
  springFloorEdgeRight: 344
} as const;

const DEFAULTS: SpringBallParams = {
  releaseHeight: 0,
  mode: 'single',
  preset: 'h0',
  autoRun: true,
  slow: false
};

const PRESET_HEIGHT: Record<SpringBallPreset, number> = {
  h0: 0,
  'h-x0': springBallConstants.equilibriumX,
  'h-2x0': springBallConstants.equilibriumX * 2,
  'h-3x0': springBallConstants.equilibriumX * 3
};

export function asBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'on', 'yes'].includes(normalized)) return true;
    if (['0', 'false', 'off', 'no', ''].includes(normalized)) return false;
  }
  return fallback;
}

export function asMode(value: unknown): SpringBallMode | undefined {
  if (value === 'single' || value === 'continuous') return value;
  if (value === 0 || value === '0') return 'single';
  if (value === 1 || value === '1') return 'continuous';
  return undefined;
}

export function asPreset(value: unknown): SpringBallPreset | undefined {
  if (
    value === 'h0' ||
    value === 'h-x0' ||
    value === 'h-2x0' ||
    value === 'h-3x0'
  )
    return value;
  if (typeof value === 'number' && Number.isInteger(value))
    return (['h0', 'h-x0', 'h-2x0', 'h-3x0'][value] ?? undefined) as
      | SpringBallPreset
      | undefined;
  if (typeof value === 'string' && ['0', '1', '2', '3'].includes(value))
    return ['h0', 'h-x0', 'h-2x0', 'h-3x0'][Number(value)] as SpringBallPreset;
  return undefined;
}

function finite(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normalize(
  input: Partial<SpringBallParams> & Record<string, unknown>,
  previous = DEFAULTS
): SpringBallParams {
  const preset = asPreset(input.preset) ?? previous.preset;
  return {
    releaseHeight: clamp(
      finite(input.releaseHeight, PRESET_HEIGHT[preset]),
      0,
      0.75
    ),
    mode: asMode(input.mode) ?? previous.mode,
    preset,
    autoRun: asBool(input.autoRun, previous.autoRun),
    slow: asBool(input.slow, previous.slow)
  };
}

function contactTime(height: number): number {
  return Math.sqrt((2 * height) / springBallConstants.gravity);
}

function stateAt(params: SpringBallParams, time: number): SpringBallState {
  const h = params.releaseHeight;
  const tc = contactTime(h);
  const omega = Math.sqrt(
    springBallConstants.stiffness / springBallConstants.mass
  );
  const equilibriumX = springBallConstants.equilibriumX;
  const symmetryX = equilibriumX * 2;
  const contactVelocity = Math.sqrt(2 * springBallConstants.gravity * h);
  let x: number;
  let velocity: number;
  let phase = 0;
  let stage: SpringBallState['stage'];
  if (time < tc) {
    stage = 'free-fall';
    x = -h + 0.5 * springBallConstants.gravity * time * time;
    velocity = springBallConstants.gravity * time;
  } else {
    const tau = time - tc;
    phase = omega * tau;
    const shifted =
      -equilibriumX * Math.cos(phase) +
      (contactVelocity / omega) * Math.sin(phase);
    x = equilibriumX + shifted;
    velocity =
      equilibriumX * omega * Math.sin(phase) +
      contactVelocity * Math.cos(phase);
    const bottomPhase =
      Math.PI - Math.atan2(contactVelocity, equilibriumX * omega);
    stage = phase >= bottomPhase - 1e-4 ? 'bottom' : 'contact';
  }
  const springForce = Math.max(0, springBallConstants.stiffness * x);
  const netForce =
    springBallConstants.mass * springBallConstants.gravity - springForce;
  const acceleration = netForce / springBallConstants.mass;
  const bottomX =
    equilibriumX +
    Math.sqrt(equilibriumX * equilibriumX + (contactVelocity / omega) ** 2);
  return {
    params: { ...params },
    time,
    contactTime: tc,
    stage,
    x,
    velocity,
    acceleration,
    springForce,
    netForce,
    phase,
    equilibriumX,
    symmetryX,
    bottomX,
    history: []
  };
}

export function createSpringBallSim(initial: Partial<SpringBallParams> = {}) {
  const baseline = normalize(initial);
  let params = { ...baseline };
  let time = 0;
  let history: Array<{ t: number; x: number }> = [];
  function getState(): SpringBallState {
    const state = stateAt(params, time);
    return { ...state, history: history.map((point) => ({ ...point })) };
  }
  return {
    getState,
    getSnapshot: getState,
    getParams: (): SpringBallParams => ({ ...params }),
    setParams(next: Partial<SpringBallParams>): SpringBallParams {
      params = normalize({ ...params, ...next }, params);
      const preset = asPreset(next.preset);
      if (preset) params.releaseHeight = PRESET_HEIGHT[preset];
      history = [];
      return { ...params };
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      const speed = params.slow ? 0.3 : 1;
      const safeDt = Math.max(0, finite(dt, 0)) * speed;
      const current = stateAt(params, time);
      if (params.mode === 'single' && time >= current.contactTime) {
        const omega = Math.sqrt(
          springBallConstants.stiffness / springBallConstants.mass
        );
        const contactVelocity = Math.sqrt(
          2 * springBallConstants.gravity * params.releaseHeight
        );
        const phase = Math.atan2(
          contactVelocity,
          springBallConstants.equilibriumX * omega
        );
        const bottomTau = (Math.PI - phase) / omega;
        if (time - current.contactTime + safeDt >= bottomTau) {
          time = current.contactTime + bottomTau;
          history.push({ t: time, x: stateAt(params, time).x });
          return;
        }
      }
      time += safeDt;
      const period =
        (2 * Math.PI) /
        Math.sqrt(springBallConstants.stiffness / springBallConstants.mass);
      if (
        params.mode === 'continuous' &&
        time > contactTime(params.releaseHeight) + period
      ) {
        time =
          contactTime(params.releaseHeight) +
          ((time - contactTime(params.releaseHeight)) % period);
      }
      if (
        history.length === 0 ||
        time - history[history.length - 1].t >= 0.03
      ) {
        history.push({ t: time, x: stateAt(params, time).x });
        if (history.length > 240) history.shift();
      }
    },
    reset(): void {
      params = { ...baseline };
      time = 0;
      history = [];
    }
  };
}
