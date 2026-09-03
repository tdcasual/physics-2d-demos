/**
 * 位置—时间图像（x-t 图）仿真
 *
 * 一维运动学演示：小车在位置轴上按预设运动规律运动，
 * x–t 图线随时间逐点绘出。所有预设运动均为解析形式，
 * x(t) 与 v(t) = dx/dt 严格互为原函数/导数。
 */

export const XT_T_MAX = 10;
export const XT_X_MIN = -10;
export const XT_X_MAX = 10;

export type XtPresetId =
  | 'rest'
  | 'uniform-pos'
  | 'uniform-neg'
  | 'accel'
  | 'decel'
  | 'tri'
  | 'abc'
  | 'abc-cross';

export type XtPreset = {
  id: XtPresetId;
  name: string;
  desc: string;
  /** 位置函数 x(t)，单位 m */
  x(t: number): number;
  /** 速度函数 v(t) = dx/dt，单位 m/s */
  v(t: number): number;
};

/** 分段线性运动：points = [[t, x], ...]，自动求每段速度（拐点处取右段速度） */
function piecewise(points: ReadonlyArray<readonly [number, number]>): {
  x(t: number): number;
  v(t: number): number;
} {
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

const triMotion = piecewise([
  [0, -8],
  [2.5, 8],
  [5, -8],
  [7.5, 8],
  [10, -8]
]);
const abcMotion = piecewise([
  [0, 0],
  [2, 4],
  [4, 4],
  [7, 8],
  [10, 0]
]);
const abcCrossMotion = piecewise([
  [0, -6],
  [2, -1],
  [4, -1],
  [7, 7],
  [10, -3]
]);

export const XT_PRESETS: readonly XtPreset[] = [
  {
    id: 'rest',
    name: '水平直线',
    desc: '静止 · x 恒定，斜率 v = 0',
    x: () => 2,
    v: () => 0
  },
  {
    id: 'uniform-pos',
    name: '倾斜直线 ↗',
    desc: '匀速正向 · v = +1.6 m/s',
    x: (t) => -8 + 1.6 * t,
    v: () => 1.6
  },
  {
    id: 'uniform-neg',
    name: '倾斜直线 ↘',
    desc: '匀速反向 · v = −1.6 m/s',
    x: (t) => 8 - 1.6 * t,
    v: () => -1.6
  },
  {
    id: 'accel',
    name: '曲线（上弯）',
    desc: '匀加速 · x = −9 + 0.18t²，斜率渐大',
    x: (t) => -9 + 0.18 * t * t,
    v: (t) => 0.36 * t
  },
  {
    id: 'decel',
    name: '曲线（下弯）',
    desc: '匀减速 · x = 9 − 0.18t²，斜率渐小',
    x: (t) => 9 - 0.18 * t * t,
    v: (t) => -0.36 * t
  },
  {
    id: 'tri',
    name: '往返直线',
    desc: '匀速折返 · 三角波，每段速率 ±6.4 m/s',
    x: triMotion.x,
    v: triMotion.v
  },
  {
    id: 'abc',
    name: '课本折线',
    desc: 'O→A→B→C→D：先匀速 → 停顿 → 再匀速 → 返回原点',
    x: abcMotion.x,
    v: abcMotion.v
  },
  {
    id: 'abc-cross',
    name: '折线（跨越正负区）',
    desc: '从 x=−6 出发，穿过原点进入正半区再返回',
    x: abcCrossMotion.x,
    v: abcCrossMotion.v
  }
];

export const DEFAULT_PRESET_ID: XtPresetId = 'uniform-pos';

/** 未知 id 的兜底预设（按 DEFAULT_PRESET_ID 解析，不依赖数组顺序） */
const FALLBACK_PRESET: XtPreset =
  XT_PRESETS.find((p) => p.id === DEFAULT_PRESET_ID) ?? XT_PRESETS[0];

export function getXtPreset(id: string): XtPreset {
  return XT_PRESETS.find((p) => p.id === id) ?? FALLBACK_PRESET;
}

export type XtGraphState = {
  /** 当前时刻 t（s），范围 [0, XT_T_MAX] */
  t: number;
  /** 当前位置 x（m） */
  x: number;
  /** 当前速度 v（m/s） */
  v: number;
  /** 当前预设 id */
  preset: XtPresetId;
  /** 图线是否已绘至 t = T_MAX（演示播完） */
  finished: boolean;
};

export function createXtGraphSim(
  initialPreset: XtPresetId = DEFAULT_PRESET_ID
) {
  let preset = getXtPreset(initialPreset);
  let t = 0;
  let finished = false;

  function snapshot(): XtGraphState {
    return {
      t,
      x: preset.x(t),
      v: preset.v(t),
      preset: preset.id,
      finished
    };
  }

  return {
    getState(): XtGraphState {
      return snapshot();
    },
    /** 推进 dt 秒；到达 T_MAX 后 clamp 并标记 finished，后续 step 为空操作 */
    step(dt: number): void {
      if (finished) return;
      const safeDt = Math.max(0, dt);
      if (safeDt === 0) return;
      t += safeDt;
      if (t >= XT_T_MAX) {
        t = XT_T_MAX;
        finished = true;
      }
    },
    /** 切换预设：回到 t = 0，清除完成标记 */
    setPreset(id: string): void {
      preset = getXtPreset(id);
      t = 0;
      finished = false;
    },
    /** 回到 t = 0（保留当前预设） */
    reset(): void {
      t = 0;
      finished = false;
    }
  };
}

export type XtGraphSim = ReturnType<typeof createXtGraphSim>;
