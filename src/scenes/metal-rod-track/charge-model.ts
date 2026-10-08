/**
 * 微元法求电荷量：导体棒在匀强磁场中沿导轨滑过同一段位移 x。
 *
 * 取极短时间 Δt，其间电流近似不变：
 *   Δq = IΔt = (BLv/R)·Δt = BL·(vΔt)/R = BLΔx/R
 * 累加得 q = ΣΔq = BLx/R —— 只取决于位移 x，与 v 怎样变化无关。
 *
 * 速度变化方式是「给定」的运动学过程（外力按需调节，或纯安培力阻尼），
 * 四种方式都从 x = 0 出发、初速度 v₀，最终滑过同一段位移 x = 1.0 m。
 * 纯阻尼（只受安培力）时 v = v₀ − kx（k = B²L²/(mR)），时间上指数衰减、
 * 只渐近 1.0 m，动画在 kt = 7 处停（x = 1 − e⁻⁷ ≈ 0.999 m）。这里取
 * k = v₀/x，相当于质量 m = B²L²x/(Rv₀)，使「刚好滑行 1.0 m 停下」。
 */

/** 速度变化方式（URL 键 profile：0 匀速 · 1 匀减速 · 2 电磁阻尼 · 3 先加速后减速） */
export type ChargeProfile = 'uniform' | 'decel' | 'damping' | 'bell';

export const CHARGE_PROFILES: readonly ChargeProfile[] = [
  'uniform',
  'decel',
  'damping',
  'bell'
];

export const CHARGE_PROFILE_LABELS: Record<ChargeProfile, string> = {
  uniform: '匀速',
  decel: '匀减速至停下',
  damping: '电磁阻尼（v 随 x 线性减小）',
  bell: '先加速后减速'
};

/** 同一段位移（m） */
export const CHARGE_DISTANCE = 1;
/** 初速度（m/s）；先加速后减速从 0 起步 */
export const CHARGE_V0 = 1;
/** 纯阻尼衰减率 k = v₀/x（s⁻¹）：恰好「滑行」1.0 m 停下 */
export const CHARGE_DAMPING_K = CHARGE_V0 / CHARGE_DISTANCE;
/** 纯阻尼动画截止 kt（x = 1 − e^(−7)） */
export const CHARGE_DAMPING_KT_END = 7;
/** 先加速后减速的总时长（s） */
export const CHARGE_BELL_DURATION = 2;

export const CHARGE_STRIPS_MIN = 4;
export const CHARGE_STRIPS_MAX = 60;
export const CHARGE_STRIPS_DEFAULT = 20;

export function decodeChargeProfile(value: unknown): ChargeProfile {
  const index = Math.round(Number(value));
  if (Number.isFinite(index) && index >= 0 && index < CHARGE_PROFILES.length) {
    return CHARGE_PROFILES[index];
  }
  if (typeof value === 'string' && CHARGE_PROFILES.includes(value as never)) {
    return value as ChargeProfile;
  }
  return 'uniform';
}

export function encodeChargeProfile(profile: ChargeProfile): number {
  return CHARGE_PROFILES.indexOf(profile);
}

/** 走完（或几乎走完）x 所需时间（s） */
export function chargeProfileDuration(profile: ChargeProfile): number {
  switch (profile) {
    case 'uniform':
      return CHARGE_DISTANCE / CHARGE_V0;
    case 'decel':
      // x = v₀T/2
      return (2 * CHARGE_DISTANCE) / CHARGE_V0;
    case 'damping':
      return CHARGE_DAMPING_KT_END / CHARGE_DAMPING_K;
    case 'bell':
      return CHARGE_BELL_DURATION;
    default: {
      const never: never = profile;
      return never;
    }
  }
}

/** 先加速后减速的峰值速度：x = v_peak·2T/π ⇒ v_peak = πx/(2T) */
export function bellPeakVelocity(): number {
  return (Math.PI * CHARGE_DISTANCE) / (2 * CHARGE_BELL_DURATION);
}

function clampTime(profile: ChargeProfile, t: number): number {
  if (Number.isNaN(t)) return 0;
  // +∞ 表示「走完全程」
  return Math.min(Math.max(t, 0), chargeProfileDuration(profile));
}

export function chargeVelocityAt(profile: ChargeProfile, time: number): number {
  const t = clampTime(profile, time);
  const T = chargeProfileDuration(profile);
  switch (profile) {
    case 'uniform':
      return CHARGE_V0;
    case 'decel':
      return CHARGE_V0 * (1 - t / T);
    case 'damping':
      return CHARGE_V0 * Math.exp(-CHARGE_DAMPING_K * t);
    case 'bell':
      return bellPeakVelocity() * Math.sin((Math.PI * t) / T);
    default: {
      const never: never = profile;
      return never;
    }
  }
}

export function chargeDisplacementAt(
  profile: ChargeProfile,
  time: number
): number {
  const t = clampTime(profile, time);
  const T = chargeProfileDuration(profile);
  switch (profile) {
    case 'uniform':
      return CHARGE_V0 * t;
    case 'decel':
      return CHARGE_V0 * t - (CHARGE_V0 * t * t) / (2 * T);
    case 'damping':
      return (
        (CHARGE_V0 / CHARGE_DAMPING_K) * (1 - Math.exp(-CHARGE_DAMPING_K * t))
      );
    case 'bell':
      return (
        ((bellPeakVelocity() * T) / Math.PI) * (1 - Math.cos((Math.PI * t) / T))
      );
    default: {
      const never: never = profile;
      return never;
    }
  }
}

/** 动生电动势 E = BLv，感应电流 I = E/R */
export function inducedCurrent(
  magneticField: number,
  length: number,
  resistance: number,
  velocity: number
): number {
  return (magneticField * length * velocity) / resistance;
}

/** q = BLx/R（也即 ΔΦ/R） */
export function chargeByFormula(
  magneticField: number,
  length: number,
  resistance: number,
  displacement: number
): number {
  return (magneticField * length * displacement) / resistance;
}

export type ChargeStrip = {
  t0: number;
  t1: number;
  /** 本段取中点时刻的电流（Δt 内视为不变） */
  current: number;
};

/** 把 [0, T] 等分成 n 个 Δt，每段电流取中点值 */
export function chargeStrips(
  profile: ChargeProfile,
  magneticField: number,
  length: number,
  resistance: number,
  strips: number
): ChargeStrip[] {
  const n = Math.max(1, Math.round(strips));
  const T = chargeProfileDuration(profile);
  const dt = T / n;
  const out: ChargeStrip[] = [];
  for (let i = 0; i < n; i += 1) {
    const t0 = i * dt;
    const t1 = (i + 1) * dt;
    const v = chargeVelocityAt(profile, (t0 + t1) / 2);
    out.push({
      t0,
      t1,
      current: inducedCurrent(magneticField, length, resistance, v)
    });
  }
  return out;
}

/**
 * 到时刻 t 为止的 ΣIΔt（n 个小矩形之和；正在扫过的那一段按已过时间计）。
 * Δt → 0 时收敛到 BLx(t)/R。
 */
export function chargeStripSum(
  profile: ChargeProfile,
  magneticField: number,
  length: number,
  resistance: number,
  strips: number,
  time = Number.POSITIVE_INFINITY
): number {
  const t = clampTime(profile, time);
  let sum = 0;
  for (const strip of chargeStrips(
    profile,
    magneticField,
    length,
    resistance,
    strips
  )) {
    if (strip.t0 >= t) break;
    sum += strip.current * (Math.min(strip.t1, t) - strip.t0);
  }
  return sum;
}
