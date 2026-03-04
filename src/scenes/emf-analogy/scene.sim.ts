export type EmfAnalogyState = {
  isSystemOn: boolean;
  tapOpening: number;
  currentI: number;
  internalDrop: number;
  terminalVoltage: number;
  phase: number;
};

export type EmfAnalogySnapshot = {
  state: EmfAnalogyState;
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function createEmfAnalogySim() {
  const EMF = 1.5;
  const INTERNAL_R_FACTOR = 0.5;
  let state: EmfAnalogyState = {
    isSystemOn: false,
    tapOpening: 0.5,
    currentI: 0,
    internalDrop: 0,
    terminalVoltage: EMF,
    phase: 0
  };

  function recompute(): void {
    if (!state.isSystemOn) {
      state.currentI = 0;
      state.internalDrop = 0;
      state.terminalVoltage = EMF;
      return;
    }
    const maxCurrent = 0.6;
    state.currentI = state.tapOpening * maxCurrent;
    state.internalDrop = state.currentI * INTERNAL_R_FACTOR;
    state.terminalVoltage = EMF - state.internalDrop;
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
      if (state.tapOpening > 0 && !state.isSystemOn) {
        state.isSystemOn = true;
      }
      recompute();
    },
    incrementOpening(step = 0.05): void {
      state.tapOpening = clamp01(state.tapOpening + step);
      state.isSystemOn = true;
      recompute();
    },
    reset(): void {
      state = {
        isSystemOn: false,
        tapOpening: 0.5,
        currentI: 0,
        internalDrop: 0,
        terminalVoltage: EMF,
        phase: 0
      };
      recompute();
    },
    step(dt: number): void {
      const safeDt = Math.max(0, dt);
      if (!state.isSystemOn || safeDt <= 0) return;
      state.phase += safeDt * (0.5 + state.tapOpening * 2.2);
    }
  };
}
