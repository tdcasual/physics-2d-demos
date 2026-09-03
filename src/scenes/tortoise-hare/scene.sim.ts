/**
 * 龟兔赛跑（双物体 x-t 图）仿真
 *
 * 两个物体在同一位置轴上运动，x–t 图线同图对比：
 * 图线交点 = 相遇，水平段 = 停下，斜率 = 速度。
 * 预设覆盖同时同地 / 同时非同地 / 同地非同时等出发方式，
 * 以及折线（匀速分段）与曲线（匀加速）的组合。
 * 位置被钳制在赛道范围 [RACE_X_MIN, RACE_X_MAX] 内，到达端点后速度为 0。
 */

export const RACE_T_MAX = 10;
export const RACE_X_MIN = 0;
export const RACE_X_MAX = 16;

export type RaceMover = {
  /** 位置函数 x(t)，单位 m */
  x(t: number): number;
  /** 速度函数 v(t) = dx/dt，单位 m/s */
  v(t: number): number;
};

export type RacePresetId =
  | 'classic-race'
  | 'two-uniform'
  | 'opposite'
  | 'late-start'
  | 'accel-chase'
  | 'late-accel';

export type RacePreset = {
  id: RacePresetId;
  name: string;
  desc: string;
  /** 乌龟（甲） */
  a: RaceMover;
  /** 兔子（乙） */
  b: RaceMover;
};

/** 分段线性运动：points = [[t, x], ...]，拐点处速度取右段 */
function piecewise(
  points: ReadonlyArray<readonly [number, number]>
): RaceMover {
  const first = points[0];
  const last = points[points.length - 1];
  return {
    x(t: number): number {
      if (t <= first[0]) return first[1];
      for (let i = 1; i < points.length; i += 1) {
        const [t0, x0] = points[i - 1];
        const [t1, x1] = points[i];
        if (t <= t1) return x0 + ((x1 - x0) * (t - t0)) / (t1 - t0);
      }
      return last[1];
    },
    v(t: number): number {
      for (let i = 1; i < points.length; i += 1) {
        const [t0, x0] = points[i - 1];
        const [t1, x1] = points[i];
        if (t >= t0 && t < t1) return (x1 - x0) / (t1 - t0);
      }
      return 0;
    }
  };
}

/** 赛道边界钳制：越过端点后停在端点、速度归零 */
function bounded(mover: RaceMover): RaceMover {
  return {
    x(t: number): number {
      return Math.min(RACE_X_MAX, Math.max(RACE_X_MIN, mover.x(t)));
    },
    v(t: number): number {
      const raw = mover.x(t);
      if (raw >= RACE_X_MAX && mover.v(t) > 0) return 0;
      if (raw <= RACE_X_MIN && mover.v(t) < 0) return 0;
      return mover.v(t);
    }
  };
}

function uniform(x0: number, v: number): RaceMover {
  return { x: (t) => x0 + v * t, v: () => v };
}

/** 晚出发匀速：t < delay 时原地不动 */
function delayedUniform(delay: number, x0: number, v: number): RaceMover {
  return {
    x: (t) => (t < delay ? x0 : x0 + v * (t - delay)),
    v: (t) => (t < delay ? 0 : v)
  };
}

/** 匀加速：x = x0 + v0·t + ½·a·t² */
function accel(x0: number, v0: number, a: number): RaceMover {
  return {
    x: (t) => x0 + v0 * t + 0.5 * a * t * t,
    v: (t) => v0 + a * t
  };
}

/** 晚出发匀加速 */
function delayedAccel(delay: number, a: number): RaceMover {
  return {
    x: (t) => (t < delay ? 0 : 0.5 * a * (t - delay) * (t - delay)),
    v: (t) => (t < delay ? 0 : a * (t - delay))
  };
}

export const RACE_PRESETS: readonly RacePreset[] = [
  {
    id: 'classic-race',
    name: '经典龟兔赛跑',
    desc: '同时同地 · 兔跑→睡→跑，龟匀速坚持，龟先到终点',
    a: uniform(0, 1.6),
    b: piecewise([
      [0, 0],
      [2, 12],
      [9.5, 12],
      [10, 15]
    ])
  },
  {
    id: 'two-uniform',
    name: '双匀速',
    desc: '同时同地 · 斜率不同，间距随时间拉大',
    a: uniform(0, 1),
    b: uniform(0, 2.5)
  },
  {
    id: 'opposite',
    name: '相向而行',
    desc: '同时非同地 · 从两端对向出发，交点即相遇',
    a: uniform(0, 2),
    b: uniform(RACE_X_MAX, -2)
  },
  {
    id: 'late-start',
    name: '晚出发追赶',
    desc: '同地非同时 · 兔晚出发 3 s，匀速追上乌龟',
    a: uniform(0, 1),
    b: delayedUniform(3, 0, 3)
  },
  {
    id: 'accel-chase',
    name: '匀加速追匀速',
    desc: '同时同地 · 兔静止起步匀加速，恰在终点追上',
    a: uniform(0, 2),
    b: accel(0, 0, 0.5)
  },
  {
    id: 'late-accel',
    name: '晚出发匀加速',
    desc: '同地非同时 · 兔晚出发 2 s，匀加速追赶',
    a: uniform(0, 1.5),
    b: delayedAccel(2, 1)
  }
];

export const DEFAULT_RACE_PRESET_ID: RacePresetId = 'classic-race';

/** 未知 id 的兜底预设（按 DEFAULT_RACE_PRESET_ID 解析，不依赖数组顺序） */
const FALLBACK_RACE_PRESET: RacePreset =
  RACE_PRESETS.find((p) => p.id === DEFAULT_RACE_PRESET_ID) ?? RACE_PRESETS[0];

export function getRacePreset(id: string): RacePreset {
  return RACE_PRESETS.find((p) => p.id === id) ?? FALLBACK_RACE_PRESET;
}

export type RaceState = {
  /** 当前时刻 t（s），范围 [0, RACE_T_MAX] */
  t: number;
  /** 乌龟位置 x（m）与速度 v（m/s） */
  xa: number;
  va: number;
  /** 兔子位置 x（m）与速度 v（m/s） */
  xb: number;
  vb: number;
  preset: RacePresetId;
  finished: boolean;
};

export function createRaceSim(
  initialPreset: RacePresetId = DEFAULT_RACE_PRESET_ID
) {
  let preset = getRacePreset(initialPreset);
  /* bounded 包装随预设缓存，避免 getState 每帧重复分配闭包 */
  let moverA = bounded(preset.a);
  let moverB = bounded(preset.b);
  let t = 0;
  let finished = false;

  return {
    getState(): RaceState {
      return {
        t,
        xa: moverA.x(t),
        va: moverA.v(t),
        xb: moverB.x(t),
        vb: moverB.v(t),
        preset: preset.id,
        finished
      };
    },
    step(dt: number): void {
      if (finished) return;
      const safeDt = Math.max(0, dt);
      if (safeDt === 0) return;
      t += safeDt;
      if (t >= RACE_T_MAX) {
        t = RACE_T_MAX;
        finished = true;
      }
    },
    setPreset(id: string): void {
      preset = getRacePreset(id);
      moverA = bounded(preset.a);
      moverB = bounded(preset.b);
      t = 0;
      finished = false;
    },
    reset(): void {
      t = 0;
      finished = false;
    }
  };
}

export type RaceSim = ReturnType<typeof createRaceSim>;
