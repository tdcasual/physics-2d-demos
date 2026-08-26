/**
 * 波的干涉 — 物理仿真层
 *
 * 双源对撞(head-on)与单向传播(single)两种模式，
 * 支持脉冲包络、观察点历史记录、干涉参数实时计算。
 */

export const WAVE_SPEED = 6;
export const DOMAIN_MAX = 30;

export type WaveSceneMode = 'head-on' | 'single';

export type WaveParams = {
  freq1: number;
  freq2: number;
  amp1: number;
  amp2: number;
  phaseDiff: number; // degrees
  observerX: number;
  observers: number[]; // additional observer positions
  mode: WaveSceneMode;
  showWave1: boolean;
  showWave2: boolean;
  showInterference: boolean;
  isPulseMode: boolean;
  playbackSpeed: number;
};

export type InterferenceParams = {
  y1: number;
  y2: number;
  ySum: number;
  phase1: number;
  phase2: number;
  dphaseDeg: number;
  A_theory: number;
  intensityPct: number;
  I_current: number;
  I_max: number;
};

export type HistoryPoint = {
  t: number;
  y: number;
};

export type GhostPoint = {
  x: number;
  y: number;
  t: number;
};

export type ObserverData = {
  x: number;
  history: HistoryPoint[];
  ghostTrail: GhostPoint[];
  interference: InterferenceParams;
};

export type WaveState = {
  time: number;
  observerX: number;
  history: HistoryPoint[];
  ghostTrail: GhostPoint[];
  interference: InterferenceParams;
  params: WaveParams;
  allObservers: ObserverData[];
};

const PULSE_WIDTH = 4;
const PULSE_PERIOD = 8;
const PULSE_DELAY = 2;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function pulseEnvelope(x: number, center: number, width: number): number {
  const sigma = width / 3;
  return Math.exp(-Math.pow((x - center) / sigma, 2));
}

function normalizeParams(input: Partial<WaveParams>): WaveParams {
  const observerX = clamp(
    Number.isFinite(input.observerX) ? input.observerX! : 15,
    0,
    DOMAIN_MAX
  );
  const observers = (input.observers ?? []).map((x) => clamp(x, 0, DOMAIN_MAX));
  return {
    freq1: clamp(Number.isFinite(input.freq1) ? input.freq1! : 4, 0.5, 20),
    freq2: clamp(Number.isFinite(input.freq2) ? input.freq2! : 4, 0.5, 20),
    amp1: clamp(Number.isFinite(input.amp1) ? input.amp1! : 5, 0.5, 15),
    amp2: clamp(Number.isFinite(input.amp2) ? input.amp2! : 5, 0.5, 15),
    phaseDiff: clamp(
      Number.isFinite(input.phaseDiff) ? input.phaseDiff! : 0,
      0,
      360
    ),
    observerX,
    observers: observers.length > 0 ? observers : [],
    mode: input.mode === 'single' ? 'single' : 'head-on',
    showWave1: input.showWave1 ?? true,
    showWave2: input.showWave2 ?? true,
    showInterference: input.showInterference ?? true,
    isPulseMode: input.isPulseMode ?? false,
    playbackSpeed: clamp(
      Number.isFinite(input.playbackSpeed) ? input.playbackSpeed! : 1,
      0.1,
      3
    )
  };
}

export function computeInterference(
  params: WaveParams,
  observerX: number,
  t: number
): InterferenceParams {
  const k1 = (2 * Math.PI * params.freq1) / WAVE_SPEED;
  const k2 = (2 * Math.PI * params.freq2) / WAVE_SPEED;
  const w1 = 2 * Math.PI * params.freq1;
  const w2 = 2 * Math.PI * params.freq2;
  const phi0 = (params.phaseDiff * Math.PI) / 180;

  let y1: number, y2: number, phase1: number, phase2: number;

  if (params.mode === 'head-on') {
    phase1 = k1 * observerX - w1 * t;
    y1 = params.amp1 * Math.sin(phase1);

    phase2 = k2 * (DOMAIN_MAX - observerX) - w2 * t + phi0;
    y2 = params.amp2 * Math.sin(phase2);

    if (params.isPulseMode) {
      const center1 = WAVE_SPEED * (t % PULSE_PERIOD) - PULSE_WIDTH / 2;
      const t2 = (t - PULSE_DELAY + PULSE_PERIOD * 10) % PULSE_PERIOD;
      const center2 = DOMAIN_MAX + PULSE_WIDTH / 2 - WAVE_SPEED * t2;
      y1 *= pulseEnvelope(observerX, center1, PULSE_WIDTH);
      y2 *= pulseEnvelope(observerX, center2, PULSE_WIDTH);
    }
  } else {
    phase1 = k1 * observerX - w1 * t;
    phase2 = k2 * observerX - w2 * t + phi0;
    y1 = params.amp1 * Math.sin(phase1);
    y2 = params.amp2 * Math.sin(phase2);
  }

  const ySum = y1 + y2;

  let dphase = (phase2 - phase1) % (2 * Math.PI);
  if (dphase < 0) dphase += 2 * Math.PI;
  const dphaseDeg = (dphase * 180) / Math.PI;

  const A_theory = Math.sqrt(
    params.amp1 * params.amp1 +
      params.amp2 * params.amp2 +
      2 * params.amp1 * params.amp2 * Math.cos(dphase)
  );

  const I_max = Math.pow(params.amp1 + params.amp2, 2);
  const I_current = Math.pow(A_theory, 2);
  const intensityPct =
    (I_current / Math.pow(Math.max(params.amp1, params.amp2), 2)) * 100;

  return {
    y1,
    y2,
    ySum,
    phase1,
    phase2,
    dphaseDeg,
    A_theory,
    intensityPct,
    I_current,
    I_max
  };
}

export function createWaveInterferenceSim(initial: Partial<WaveParams> = {}) {
  let params = normalizeParams(initial);
  let time = 0;

  // Primary observer
  const history: HistoryPoint[] = [];
  const ghostTrail: GhostPoint[] = [];
  const maxHistory = 1800;
  const maxGhost = 60;

  // Additional observers
  const observerHistories: HistoryPoint[][] = [];
  const observerGhostTrails: GhostPoint[][] = [];

  function ensureObserverArrays(): void {
    while (observerHistories.length < params.observers.length) {
      observerHistories.push([]);
      observerGhostTrails.push([]);
    }
    while (observerHistories.length > params.observers.length) {
      observerHistories.pop();
      observerGhostTrails.pop();
    }
  }

  function recordHistory(): void {
    ensureObserverArrays();

    // Primary observer
    const primary = computeInterference(params, params.observerX, time);
    history.push({ t: time, y: primary.ySum });
    ghostTrail.push({ x: params.observerX, y: primary.ySum, t: time });
    if (history.length > maxHistory) history.shift();
    if (ghostTrail.length > maxGhost) ghostTrail.shift();

    // Additional observers
    for (let i = 0; i < params.observers.length; i++) {
      const x = params.observers[i];
      const interference = computeInterference(params, x, time);
      const h = observerHistories[i];
      const g = observerGhostTrails[i];
      h.push({ t: time, y: interference.ySum });
      g.push({ x, y: interference.ySum, t: time });
      if (h.length > maxHistory) h.shift();
      if (g.length > maxGhost) g.shift();
    }
  }

  function getAllObservers(): ObserverData[] {
    ensureObserverArrays();
    const result: ObserverData[] = [];
    for (let i = 0; i < params.observers.length; i++) {
      result.push({
        x: params.observers[i],
        history: [...observerHistories[i]],
        ghostTrail: [...observerGhostTrails[i]],
        interference: computeInterference(params, params.observers[i], time)
      });
    }
    return result;
  }

  function getState(): WaveState {
    return {
      time,
      observerX: params.observerX,
      history: [...history],
      ghostTrail: [...ghostTrail],
      interference: computeInterference(params, params.observerX, time),
      params: { ...params },
      allObservers: getAllObservers()
    };
  }

  return {
    getState,
    getParams(): WaveParams {
      return { ...params };
    },
    setParams(next: Partial<WaveParams>): WaveParams {
      params = normalizeParams({ ...params, ...next });
      return { ...params };
    },
    step(dt: number): void {
      const safeDt = Math.max(0, dt) * params.playbackSpeed;
      if (safeDt === 0) return;
      time += safeDt;
      recordHistory();
    },
    reset(): void {
      time = 0;
      history.length = 0;
      ghostTrail.length = 0;
      observerHistories.length = 0;
      observerGhostTrails.length = 0;
    },
    setTime(t: number): void {
      time = Math.max(0, t);
    },
    getTime(): number {
      return time;
    },
    setObserverX(x: number): void {
      params.observerX = clamp(x, 0, DOMAIN_MAX);
    },
    addObserver(x: number): void {
      const pos = clamp(x, 0, DOMAIN_MAX);
      if (!params.observers.includes(pos)) {
        params.observers = [...params.observers, pos];
        observerHistories.push([]);
        observerGhostTrails.push([]);
      }
    },
    removeObserver(index: number): void {
      if (index >= 0 && index < params.observers.length) {
        params.observers = params.observers.filter((_, i) => i !== index);
        observerHistories.splice(index, 1);
        observerGhostTrails.splice(index, 1);
      }
    },
    setObserverPosition(index: number, x: number): void {
      if (index >= 0 && index < params.observers.length) {
        const newObservers = [...params.observers];
        newObservers[index] = clamp(x, 0, DOMAIN_MAX);
        params.observers = newObservers;
      }
    },
    clearHistory(): void {
      history.length = 0;
      ghostTrail.length = 0;
      for (let i = 0; i < observerHistories.length; i++) {
        observerHistories[i].length = 0;
        observerGhostTrails[i].length = 0;
      }
    }
  };
}

export type WaveInterferenceSim = ReturnType<typeof createWaveInterferenceSim>;
