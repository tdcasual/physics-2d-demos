export type EmfAnalogyState = {
  /** 电源电动势 (V) */
  emf: number;
  /** 内阻 (Ω) */
  internalR: number;
  /** 外电阻 (Ω) */
  externalR: number;
  /** 总电流 (A) */
  currentI: number;
  /** 内电压 / 内阻压降 (V) */
  internalDrop: number;
  /** 路端电压 (V) */
  terminalVoltage: number;
  /** 开关状态 */
  isSystemOn: boolean;
  /** 阀门开度 0~1 */
  tapOpening: number;
  /** 动画相位角 */
  phase: number;
};

export type EmfAnalogySnapshot = {
  state: EmfAnalogyState;
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * 根据阀门开度计算外电阻 R。
 * 开度越大 → 外电阻越小 → 电流越大。
 * 开度 0% → 断路 (R = ∞)
 * 开度 100% → 短路 (R = 0Ω)
 */
function openingToResistance(opening: number): number {
  if (opening <= 0) return Infinity;
  // 开度 0.5 → R = 2.0Ω，此时 I = 1.5 / (2.0 + 0.5) = 0.6A
  // 开度 1.0 → R = 0Ω，此时 I = 1.5 / 0.5 = 3.0A (短路)
  return (2.0 * (1 - opening)) / opening;
}

export function createEmfAnalogySim() {
  const EMF = 1.5;
  const INTERNAL_R = 0.5;

  let state: EmfAnalogyState = {
    emf: EMF,
    internalR: INTERNAL_R,
    externalR: Infinity,
    currentI: 0,
    internalDrop: 0,
    terminalVoltage: EMF,
    isSystemOn: false,
    tapOpening: 0.5,
    phase: 0
  };

  function recompute(): void {
    if (!state.isSystemOn || state.tapOpening <= 0) {
      state.currentI = 0;
      state.internalDrop = 0;
      state.terminalVoltage = state.emf;
      state.externalR = state.isSystemOn
        ? openingToResistance(state.tapOpening)
        : Infinity;
      return;
    }

    state.externalR = openingToResistance(state.tapOpening);
    state.currentI = state.emf / (state.externalR + state.internalR);
    state.internalDrop = state.currentI * state.internalR;
    state.terminalVoltage = state.emf - state.internalDrop;
  }

  recompute();

  return {
    getSnapshot(): EmfAnalogySnapshot {
      return { state: { ...state } };
    },

    setSystemOn(on: boolean): void {
      state.isSystemOn = on;
      recompute();
    },

    setTapOpening(opening: number): void {
      state.tapOpening = clamp01(opening);
      // 调节开度时自动闭合开关（教学演示惯例）
      if (state.tapOpening > 0 && !state.isSystemOn) {
        state.isSystemOn = true;
      }
      recompute();
    },

    incrementOpening(step = 0.05): void {
      state.tapOpening = clamp01(state.tapOpening + step);
      if (state.tapOpening > 0 && !state.isSystemOn) {
        state.isSystemOn = true;
      }
      recompute();
    },

    reset(): void {
      state = {
        emf: EMF,
        internalR: INTERNAL_R,
        externalR: Infinity,
        currentI: 0,
        internalDrop: 0,
        terminalVoltage: EMF,
        isSystemOn: false,
        tapOpening: 0.5,
        phase: 0
      };
      recompute();
    },

    step(dt: number): void {
      const safeDt = Math.max(0, dt);
      if (safeDt <= 0) return;
      // 相位用于驱动动画旋转，与电流成正比
      const speed = state.isSystemOn ? 0.5 + state.currentI * 3.0 : 0.02;
      state.phase += safeDt * speed;
    }
  };
}
