export type Orientation = 'horizontal' | 'vertical';

export type OscillatorParams = {
  k: number; // 劲度系数 N/m
  m: number; // 质量 kg
  x0: number; // 初始位移 m（相对于平衡位置）
  orientation: Orientation;
  phase?: number; // 初始相位 (rad)，可选，默认由 x0 符号决定
};

export type ResolvedOscillatorParams = {
  k: number;
  m: number;
  x0: number;
  orientation: Orientation;
};

export type OscillatorState = {
  x: number; // 位移（相对于平衡位置）
  v: number; // 速度
  a: number; // 加速度
  t: number; // 时间
  phase: number; // 当前相位角 (rad)
};

export type Oscillator = {
  id: string;
  params: ResolvedOscillatorParams;
  state: OscillatorState;
  initial: OscillatorState;
  color: string;
  isPlaying: boolean;
  localTime: number; // 每个振子独立的本地时间
  startDelay: number; // 启动延迟（秒），用于相位演示
};

// 配色方案（用于区分不同振子）
export const OSCILLATOR_COLORS = [
  '#3b82f6', // 蓝
  '#ff6b6b', // 红
  '#22c55e', // 绿
  '#ffd43b', // 黄
  '#da77f2', // 紫
  '#ff922b'  // 橙
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeParams(input: Partial<OscillatorParams>): ResolvedOscillatorParams {
  return {
    k: clamp(Number.isFinite(input.k) ? input.k! : 10, 1, 100),
    m: clamp(Number.isFinite(input.m) ? input.m! : 1, 0.1, 10),
    x0: clamp(Number.isFinite(input.x0) ? input.x0! : 5, -20, 20),
    orientation: input.orientation === 'vertical' ? 'vertical' : 'horizontal'
  };
}

function computeOmega(k: number, m: number): number {
  return Math.sqrt(k / m);
}

export function createOscillatorState(
  params: ResolvedOscillatorParams,
  customPhase?: number
): OscillatorState {
  // 使用自定义相位，或根据 x0 符号计算
  const initialPhase = customPhase !== undefined 
    ? customPhase 
    : (params.x0 >= 0 ? 0 : Math.PI);
  
  return {
    x: params.x0,
    v: 0,
    a: -(params.k / params.m) * params.x0,
    t: 0,
    phase: initialPhase
  };
}

export function createOscillator(
  id: string,
  params: Partial<OscillatorParams>,
  color: string,
  startDelay: number = 0
): Oscillator {
  const normalized = normalizeParams(params);
  const initial = createOscillatorState(normalized, params.phase);
  return {
    id,
    params: normalized,
    state: { ...initial },
    initial: { ...initial },
    color,
    isPlaying: false,
    localTime: 0,
    startDelay
  };
}

export type SpringOscillatorSim = {
  oscillators: Oscillator[];
  globalTime: number;
  addOscillator(params?: Partial<OscillatorParams>, startDelay?: number): Oscillator;
  removeOscillator(id: string): boolean;
  updateOscillator(id: string, params: Partial<OscillatorParams>): boolean;
  startOscillator(id: string): void;
  pauseOscillator(id: string): void;
  resetOscillator(id: string): void;
  resetAll(): void;
  step(dt: number): void;
  getOmega(id: string): number;
  getPeriod(id: string): number;
  getPhaseDifference(id1: string, id2: string): number | null;
};

export function createSpringOscillatorSim(): SpringOscillatorSim {
  const oscillators: Oscillator[] = [];
  let globalTime = 0;
  let colorIndex = 0;

  function getNextColor(): string {
    const color = OSCILLATOR_COLORS[colorIndex % OSCILLATOR_COLORS.length];
    colorIndex++;
    return color;
  }

  return {
    oscillators,
    get globalTime() { return globalTime; },

    addOscillator(params: Partial<OscillatorParams> = {}, startDelay: number = 0): Oscillator {
      const id = `osc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const osc = createOscillator(id, params, getNextColor(), startDelay);
      oscillators.push(osc);
      return osc;
    },

    removeOscillator(id: string): boolean {
      const idx = oscillators.findIndex(o => o.id === id);
      if (idx === -1) return false;
      oscillators.splice(idx, 1);
      return true;
    },

    updateOscillator(id: string, params: Partial<OscillatorParams>): boolean {
      const osc = oscillators.find(o => o.id === id);
      if (!osc) return false;
      
      const wasPlaying = osc.isPlaying;
      osc.isPlaying = false;
      
      // 保存自定义相位（如果提供了）
      const customPhase = params.phase;
      
      // 更新参数
      osc.params = normalizeParams({ ...osc.params, ...params });
      
      // 重新计算初始状态，保留自定义相位
      osc.initial = createOscillatorState(osc.params, customPhase);
      osc.state = { ...osc.initial };
      
      osc.isPlaying = wasPlaying;
      return true;
    },

    startOscillator(id: string): void {
      const osc = oscillators.find(o => o.id === id);
      if (osc) osc.isPlaying = true;
    },

    pauseOscillator(id: string): void {
      const osc = oscillators.find(o => o.id === id);
      if (osc) osc.isPlaying = false;
    },

    resetOscillator(id: string): void {
      const osc = oscillators.find(o => o.id === id);
      if (osc) {
        osc.state = { ...osc.initial };
        osc.isPlaying = false;
        osc.localTime = 0;
      }
    },

    resetAll(): void {
      oscillators.forEach(osc => {
        osc.state = { ...osc.initial };
        osc.isPlaying = false;
        osc.localTime = 0;
      });
      globalTime = 0;
    },

    step(dt: number): void {
      const safeDt = Math.max(0, dt);
      if (safeDt === 0) return;
      
      globalTime += safeDt;
      
      oscillators.forEach(osc => {
        if (!osc.isPlaying) return;
        
        // 更新本地时间
        osc.localTime += safeDt;
        
        // 如果还在启动延迟期内，保持在初始位置不动
        if (osc.localTime < osc.startDelay) {
          osc.state.x = osc.initial.x;
          osc.state.v = 0;
          osc.state.a = 0;
          osc.state.t = osc.localTime;
          osc.state.phase = osc.initial.phase;
          return;
        }
        
        // 实际运动时间（扣除延迟）
        const effectiveTime = osc.localTime - osc.startDelay;
        
        const { k, m } = osc.params;
        const omega = computeOmega(k, m);
        
        // 解析解：x(t) = A * cos(omega * t + phi)
        // 使用有效时间计算
        const A = Math.abs(osc.initial.x); // 使用绝对值作为振幅
        const phi0 = osc.initial.phase;
        
        osc.state.t = osc.localTime;
        const phase = omega * effectiveTime + phi0;
        osc.state.phase = phase;
        osc.state.x = A * Math.cos(phase);
        osc.state.v = -A * omega * Math.sin(phase);
        osc.state.a = -A * omega * omega * Math.cos(phase);
      });
    },

    getOmega(id: string): number {
      const osc = oscillators.find(o => o.id === id);
      if (!osc) return 0;
      return computeOmega(osc.params.k, osc.params.m);
    },

    getPeriod(id: string): number {
      const omega = this.getOmega(id);
      if (omega === 0) return 0;
      return (2 * Math.PI) / omega;
    },

    getPhaseDifference(id1: string, id2: string): number | null {
      const osc1 = oscillators.find(o => o.id === id1);
      const osc2 = oscillators.find(o => o.id === id2);
      if (!osc1 || !osc2) return null;
      
      // 计算周期
      const omega1 = computeOmega(osc1.params.k, osc1.params.m);
      const omega2 = computeOmega(osc2.params.k, osc2.params.m);
      const T1 = (2 * Math.PI) / omega1;
      const T2 = (2 * Math.PI) / omega2;
      
      // 相位差由启动延迟决定：Δφ = 2π × (Δt / T)
      // 假设两个振子周期相同（同相演示的前提）
      const avgPeriod = (T1 + T2) / 2;
      const timeDiff = osc2.startDelay - osc1.startDelay;
      let diff = (2 * Math.PI * timeDiff) / avgPeriod;
      
      // 归一化到 [-pi, pi]
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      
      return diff;
    }
  };
}
