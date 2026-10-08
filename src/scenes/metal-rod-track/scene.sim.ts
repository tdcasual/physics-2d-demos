import { clamp } from '../../core/math';
import {
  CHARGE_PROFILES,
  CHARGE_STRIPS_DEFAULT,
  CHARGE_STRIPS_MAX,
  CHARGE_STRIPS_MIN,
  chargeByFormula,
  chargeDisplacementAt,
  chargeProfileDuration,
  chargeStripSum,
  chargeVelocityAt,
  inducedCurrent,
  type ChargeProfile
} from './charge-model';

/** coast 阻尼滑行 · pull 恒力加速 · charge 微元法求电荷量 */
export type MetalRodMode = 'coast' | 'pull' | 'charge';

export type MetalRodParams = {
  mode: MetalRodMode;
  magneticField: number;
  resistance: number;
  mass: number;
  initialVelocity: number;
  autoRun: boolean;
  /** 电荷量模式的速度变化方式（CHARGE_PROFILES 下标，URL 数字编码） */
  profile: number;
  /** 电荷量模式把全程等分的 Δt 份数 n */
  strips: number;
};

/** 电荷量模式的运动与累计量（mode !== 'charge' 时也按当前参数给出） */
export type MetalRodChargeState = {
  profile: ChargeProfile;
  time: number;
  duration: number;
  displacement: number;
  velocity: number;
  current: number;
  /** ΣIΔt：已扫过的 Δt 小矩形之和 */
  stripSum: number;
  /** BLx/R */
  formula: number;
  finished: boolean;
};

export type MetalRodState = MetalRodParams & {
  time: number;
  position: number;
  velocity: number;
  acceleration: number;
  emf: number;
  current: number;
  magneticForce: number;
  electricPower: number;
  forcePower: number;
  status: string;
  charge: MetalRodChargeState;
};

export const metalRodConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 820,
  gridStep: 54,
  railLeft: 92,
  railRight: 744,
  railTop: 202,
  railBottom: 476,
  rodWidth: 18,
  rodMinX: 150,
  rodMaxX: 690,
  resistorX: 118,
  resistorY: 338,
  resistorHeight: 82,
  loopLeft: 118,
  loopRight: 716,
  loopTop: 202,
  loopBottom: 476,
  infoX: 36,
  infoY: 36,
  infoWidth: 300,
  infoHeight: 144,
  readoutX: 882,
  readoutY: 330,
  readoutWidth: 280,
  readoutHeight: 240,
  trackX: 36,
  trackY: 176,
  trackWidth: 784,
  trackHeight: 350,
  rodScale: 360,
  rodLength: 1.5,
  driveForce: 1.5,
  magneticFieldMin: 0,
  magneticFieldMax: 2,
  resistanceMin: 0.5,
  resistanceMax: 4,
  massMin: 0.2,
  massMax: 2,
  velocityMin: 0,
  velocityMax: 24,
  animationPeriod: 12
} as const;

const DEFAULTS: MetalRodParams = {
  mode: 'coast',
  magneticField: 1,
  resistance: 2,
  mass: 1,
  initialVelocity: 20,
  autoRun: true,
  profile: 0,
  strips: CHARGE_STRIPS_DEFAULT
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalize(
  input: Partial<MetalRodParams>,
  previous = DEFAULTS
): MetalRodParams {
  return {
    mode:
      input.mode === 'pull' || input.mode === 'coast' || input.mode === 'charge'
        ? input.mode
        : previous.mode,
    magneticField: clamp(
      finite(input.magneticField, previous.magneticField),
      metalRodConstants.magneticFieldMin,
      metalRodConstants.magneticFieldMax
    ),
    resistance: clamp(
      finite(input.resistance, previous.resistance),
      metalRodConstants.resistanceMin,
      metalRodConstants.resistanceMax
    ),
    mass: clamp(
      finite(input.mass, previous.mass),
      metalRodConstants.massMin,
      metalRodConstants.massMax
    ),
    initialVelocity: clamp(
      finite(input.initialVelocity, previous.initialVelocity),
      metalRodConstants.velocityMin,
      metalRodConstants.velocityMax
    ),
    autoRun: input.autoRun ?? previous.autoRun,
    profile: clamp(
      Math.round(finite(input.profile, previous.profile)),
      0,
      CHARGE_PROFILES.length - 1
    ),
    strips: clamp(
      Math.round(finite(input.strips, previous.strips)),
      CHARGE_STRIPS_MIN,
      CHARGE_STRIPS_MAX
    )
  };
}

export function chargeProfileOf(params: MetalRodParams): ChargeProfile {
  return CHARGE_PROFILES[params.profile] ?? 'uniform';
}

export function deriveCharge(
  params: MetalRodParams,
  time: number
): MetalRodChargeState {
  const profile = chargeProfileOf(params);
  const duration = chargeProfileDuration(profile);
  const t = Math.min(Math.max(time, 0), duration);
  const B = params.magneticField;
  const L = metalRodConstants.rodLength;
  const R = params.resistance;
  const displacement = chargeDisplacementAt(profile, t);
  const velocity = chargeVelocityAt(profile, t);
  return {
    profile,
    time: t,
    duration,
    displacement,
    velocity,
    current: inducedCurrent(B, L, R, velocity),
    stripSum: chargeStripSum(profile, B, L, R, params.strips, t),
    formula: chargeByFormula(B, L, R, displacement),
    finished: t >= duration
  };
}

export function dragCoefficient(params: MetalRodParams): number {
  return (
    (params.magneticField *
      params.magneticField *
      metalRodConstants.rodLength ** 2) /
    params.resistance
  );
}

export function accelerationAt(
  params: MetalRodParams,
  velocity: number
): number {
  const magneticDrag = dragCoefficient(params) * Math.max(0, velocity);
  return (
    (params.mode === 'pull' ? metalRodConstants.driveForce : 0) / params.mass -
    magneticDrag / params.mass
  );
}

function derive(
  params: MetalRodParams,
  time: number,
  position: number,
  velocity: number,
  chargeTime: number
): MetalRodState {
  const charge = deriveCharge(params, chargeTime);
  if (params.mode === 'charge') {
    // 电荷量模式：运动由给定的 v(t) 决定，E、I、Fₐ 随之计算
    const L = metalRodConstants.rodLength;
    const emf = params.magneticField * L * charge.velocity;
    const magneticForce = params.magneticField * L * charge.current;
    return {
      ...params,
      time: charge.time,
      position: charge.displacement,
      velocity: charge.velocity,
      acceleration: 0,
      emf,
      current: charge.current,
      magneticForce,
      electricPower: charge.current * charge.current * params.resistance,
      forcePower: 0,
      status: charge.finished ? '已滑过 x，累计完毕' : '累计 Δq 中',
      charge
    };
  }
  const safeVelocity = Math.max(0, velocity);
  const emf = params.magneticField * metalRodConstants.rodLength * safeVelocity;
  const current = emf / params.resistance;
  const magneticForce =
    params.magneticField * metalRodConstants.rodLength * current;
  const acceleration = accelerationAt(params, safeVelocity);
  return {
    ...params,
    time,
    position,
    velocity: safeVelocity,
    acceleration,
    emf,
    current,
    magneticForce,
    electricPower: current * current * params.resistance,
    forcePower:
      (params.mode === 'pull' ? metalRodConstants.driveForce : 0) *
      safeVelocity,
    status:
      params.mode === 'pull'
        ? '恒定拉力加速'
        : safeVelocity < 0.08
          ? '已停下'
          : '初速度阻尼滑行',
    charge
  };
}

export function createMetalRodSim(initial: Partial<MetalRodParams> = {}) {
  let params = normalize(initial);
  let time = 0;
  let position = 0;
  let velocity = params.initialVelocity;
  let chargeTime = 0;
  const snapshot = (): MetalRodState =>
    derive(params, time, position, velocity, chargeTime);
  return {
    getState: snapshot,
    getSnapshot: snapshot,
    getParams: (): MetalRodParams => ({ ...params }),
    setParams(next: Partial<MetalRodParams>): MetalRodParams {
      const previousVelocity = velocity;
      const previous = params;
      params = normalize({ ...params, ...next }, params);
      if (next.initialVelocity !== undefined) velocity = params.initialVelocity;
      else if (next.mode !== undefined) velocity = previousVelocity;
      // 进入电荷量模式或换一种 v 变化方式：从 x = 0 重新开始累计
      if (
        (params.mode === 'charge' && previous.mode !== 'charge') ||
        params.profile !== previous.profile
      ) {
        chargeTime = 0;
      }
      return { ...params };
    },
    step(dt: number): void {
      if (!params.autoRun) return;
      if (params.mode === 'charge') {
        const limit = chargeProfileDuration(chargeProfileOf(params));
        chargeTime = Math.min(
          limit,
          chargeTime + clamp(finite(dt, 0), 0, 0.05)
        );
        return;
      }
      const duration = clamp(finite(dt, 0), 0, 0.05);
      const subSteps = Math.max(1, Math.ceil(duration * 20));
      const subDt = duration / subSteps;
      for (let index = 0; index < subSteps; index += 1) {
        const acceleration = accelerationAt(params, velocity);
        velocity = Math.max(0, velocity + acceleration * subDt);
        position = (position + velocity * subDt) % metalRodConstants.rodLength;
        time = (time + subDt) % metalRodConstants.animationPeriod;
      }
    },
    /** 参数回到默认，但保留运动模式与 v 变化方式（与子场景重置语义一致） */
    reset(): void {
      params = { ...DEFAULTS, mode: params.mode, profile: params.profile };
      time = 0;
      position = 0;
      velocity = params.initialVelocity;
      chargeTime = 0;
    }
  };
}
