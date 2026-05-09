/**
 * 机械波 — 物理模拟（简谐横波）
 *
 * y = A sin(kx − dir·ωt)
 * v = λ/T 约束系统：最近调节的两个参数独立，第三个自动计算
 */

export type WaveDirection = 'right' | 'left';

export type MechanicalWaveParams = {
  amplitude: number;      // 1-10 cm
  waveSpeed: number;      // 0.5-10 m/s
  wavelength: number;     // 1-10 m
  period: number;         // 0.5-8 s
  direction: WaveDirection;
  showMicroShift: boolean;
  playbackSpeed: number;  // 0.1-2.0
};

export type ConstraintInfo = {
  dependent: 'waveSpeed' | 'wavelength' | 'period';
  independent: ['waveSpeed' | 'wavelength' | 'period', 'waveSpeed' | 'wavelength' | 'period'];
};

export type MechanicalWaveState = {
  params: MechanicalWaveParams;
  constraint: ConstraintInfo;
  time: number;
  pointPX: number;
  pointPY: number;
  pointPVy: number;
  pointPAy: number;
  velocityDirection: 'up' | 'down' | 'zero';
  accelerationDirection: 'up' | 'down' | 'zero';
};

type WaveParam = 'waveSpeed' | 'wavelength' | 'period';
const WAVE_PARAMS: WaveParam[] = ['waveSpeed', 'wavelength', 'period'];
const RANGES: Record<WaveParam, [number, number]> = {
  waveSpeed: [0.5, 10],
  wavelength: [1, 10],
  period: [0.5, 8],
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** 波形函数：y(x,t) = A sin(kx − dir·ωt) */
export function waveY(x: number, t: number, A: number, lambda: number, T: number, dir: number): number {
  const k = (2 * Math.PI) / lambda;
  const omega = (2 * Math.PI) / T;
  return A * Math.sin(k * x - dir * omega * t);
}

/** 质点振动速度：v_particle = −dir·Aω cos(kx − dir·ωt) */
export function waveVelocity(x: number, t: number, A: number, lambda: number, T: number, dir: number): number {
  const k = (2 * Math.PI) / lambda;
  const omega = (2 * Math.PI) / T;
  return -dir * A * omega * Math.cos(k * x - dir * omega * t);
}

/** 质点加速度：a = −ω²y */
export function waveAcceleration(y: number, T: number): number {
  const omega = (2 * Math.PI) / T;
  return -omega * omega * y;
}

export function createMechanicalWaveSim(initial: Partial<MechanicalWaveParams> = {}) {
  const defaults: MechanicalWaveParams = {
    amplitude: 5,
    waveSpeed: 2,
    wavelength: 4,
    period: 2,
    direction: 'right',
    showMicroShift: true,
    playbackSpeed: 1.0,
  };

  let params: MechanicalWaveParams = { ...defaults, ...initial };
  let time = 0;
  let pointPX = 5;

  // 约束追踪：最近调整的两个为独立变量
  let lastAdjusted: WaveParam[] = ['wavelength', 'period'];

  function getConstraint(): ConstraintInfo {
    const dep = WAVE_PARAMS.find(p => !lastAdjusted.includes(p)) as WaveParam;
    return {
      dependent: dep,
      independent: [lastAdjusted[0], lastAdjusted[1]],
    };
  }

  function applyConstraint(changed: WaveParam): void {
    // 更新独立变量追踪
    lastAdjusted = [changed, ...lastAdjusted.filter(p => p !== changed)].slice(0, 2) as WaveParam[];
    const dep = WAVE_PARAMS.find(p => !lastAdjusted.includes(p)) as WaveParam;
    const indep1 = lastAdjusted[0];
    const indep2 = lastAdjusted[1];

    // 根据约束公式 v = λ/T 计算因变量
    let computed: number;
    switch (dep) {
      case 'waveSpeed':
        computed = params.wavelength / params.period;
        params.waveSpeed = clamp(computed, ...RANGES.waveSpeed);
        // 若被 clamp，级联调整另一个独立变量
        if (params.waveSpeed !== computed) {
          cascadeAdjust(dep, indep1, indep2);
        }
        break;
      case 'wavelength':
        computed = params.waveSpeed * params.period;
        params.wavelength = clamp(computed, ...RANGES.wavelength);
        if (params.wavelength !== computed) {
          cascadeAdjust(dep, indep1, indep2);
        }
        break;
      case 'period':
        computed = params.wavelength / params.waveSpeed;
        params.period = clamp(computed, ...RANGES.period);
        if (params.period !== computed) {
          cascadeAdjust(dep, indep1, indep2);
        }
        break;
    }
  }

  /** 因变量被 clamp 后，调整第二个独立变量以维持 v = λ/T */
  function cascadeAdjust(dep: WaveParam, _indep1: WaveParam, indep2: WaveParam): void {
    // indep2 是较早的独立变量，优先调整它
    let cascaded: number;
    switch (indep2) {
      case 'waveSpeed':
        if (dep !== 'wavelength' && dep !== 'period') return;
        cascaded = params.wavelength / params.period;
        params.waveSpeed = clamp(cascaded, ...RANGES.waveSpeed);
        break;
      case 'wavelength':
        if (dep !== 'waveSpeed' && dep !== 'period') return;
        cascaded = params.waveSpeed * params.period;
        params.wavelength = clamp(cascaded, ...RANGES.wavelength);
        break;
      case 'period':
        if (dep !== 'waveSpeed' && dep !== 'wavelength') return;
        cascaded = params.wavelength / params.waveSpeed;
        params.period = clamp(cascaded, ...RANGES.period);
        break;
    }
  }

  function getState(): MechanicalWaveState {
    const dir = params.direction === 'right' ? 1 : -1;
    const y = waveY(pointPX, time, params.amplitude, params.wavelength, params.period, dir);
    const vy = waveVelocity(pointPX, time, params.amplitude, params.wavelength, params.period, dir);
    const ay = waveAcceleration(y, params.period);

    return {
      params: { ...params },
      constraint: getConstraint(),
      time,
      pointPX,
      pointPY: y,
      pointPVy: vy,
      pointPAy: ay,
      velocityDirection: vy > 0.05 ? 'up' : vy < -0.05 ? 'down' : 'zero',
      accelerationDirection: ay > 0.05 ? 'up' : ay < -0.05 ? 'down' : 'zero',
    };
  }

  function setParam(key: string, value: number | string): MechanicalWaveParams {
    if (key === 'direction') {
      params.direction = (value === 'left' ? 'left' : 'right') as WaveDirection;
    } else if (key === 'showMicroShift') {
      params.showMicroShift = Boolean(value);
    } else {
      (params as unknown as Record<string, number>)[key] = value as number;
      if (WAVE_PARAMS.includes(key as WaveParam)) {
        applyConstraint(key as WaveParam);
      }
    }
    return { ...params };
  }

  function setPointP(x: number): void {
    pointPX = clamp(x, 0, 12);
  }

  function step(dt: number): void {
    time += dt * params.playbackSpeed;
  }

  function reset(): void {
    params = { ...defaults };
    time = 0;
    pointPX = 5;
    lastAdjusted = ['wavelength', 'period'];
  }

  return { getState, setParam, setPointP, step, reset, getConstraint };
}
