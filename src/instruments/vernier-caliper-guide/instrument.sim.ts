/**
 * 游标卡尺使用演示 — 物理/读数模型
 *
 * 读数引擎：测量值 = 游标零线左侧主尺整毫米 + 最优对齐游标格 × 精度。
 * 三种测量方式（外径/内径/深度）共用同一读数引擎，各有一个尺寸固定的
 * 被测物（targetSize）。卡爪开度按物理约束钳位：外径爪不能闭到小于
 * 被测外径，内径爪与深度尺不能超过被测内径/槽深。支持隐藏读数的练习
 * 模式与自动播放的使用演示。
 */

import type {
  InstrumentParams,
  InstrumentState
} from '../_contract/instrument-contract';

export type GuidePrecision = 0.02 | 0.05 | 0.1;

/** 0=外径（外测量爪） 1=内径（内测量爪） 2=深度（深度尺） */
export type MeasureMode = 0 | 1 | 2;

export interface VernierCaliperGuideParams extends InstrumentParams {
  precision: GuidePrecision;
  mode: MeasureMode;
  /** 卡爪开度（游标零线位置），mm */
  jawPosition: number;
  /** 1=显示读数分解；0=隐藏（练习模式：读尺面对照后再翻开核对） */
  showReading: number;
  /** 1=自动播放使用演示（选方式→贴合→锁紧→读数 循环） */
  demo: number;
}

export type VernierCaliperGuideState = InstrumentState & {
  precision: GuidePrecision;
  mode: MeasureMode;
  modeName: string;
  /** 被测物尺寸（各方式固定）：外径爪开度 ≥ 它，内径爪/深度尺行程 ≤ 它 */
  targetSize: number;
  jawPosition: number;
  mainScaleReading: number;
  vernierAlignment: number;
  /** 最优对齐格的残余偏差（mm），用于对齐高亮强度 */
  alignOffset: number;
  totalReading: number;
  vernierDivisions: number;
  vernierLength: number;
  showReading: boolean;
  demo: boolean;
  /** 演示步骤：0 选方式 1 量爪贴合 2 锁紧螺钉 3 读数 */
  demoStep: number;
};

const VALID_PRECISIONS: GuidePrecision[] = [0.1, 0.05, 0.02];

/** 行程上限（mm）：常见学生卡尺量程 0–150mm */
export const JAW_MAX = 150;

const MODES: Array<{ name: string; target: number }> = [
  { name: '外径测量（外测量爪）', target: 23.7 },
  { name: '内径测量（内测量爪）', target: 34.2 },
  // 深度目标取 41.9：在 0.1/0.05/0.02 三档精度下都可精确表示，
  // 避免演示落到「读数被迫进位」的混淆情形（如 41.85 在 0.1 档只能读 41.9）
  { name: '深度测量（深度尺）', target: 41.9 }
];

/** 演示步骤时长（秒）与步数；step 的 dt 单位与全生态一致为秒 */
const DEMO_STEP_S = 1.6;
const DEMO_STEPS = 4;

function snapPrecision(raw: unknown): GuidePrecision {
  const p = Number(raw);
  return VALID_PRECISIONS.reduce((best, v) =>
    Math.abs(v - p) < Math.abs(best - p) ? v : best
  );
}

function snapMode(raw: unknown): MeasureMode {
  const m = Math.round(Number(raw));
  return (m === 1 || m === 2 ? m : 0) as MeasureMode;
}

function snap01(raw: unknown): 0 | 1 {
  return Number(raw) >= 0.5 ? 1 : 0;
}

/**
 * 卡爪开度的物理钳位：被测物尺寸固定，外径爪闭合时被被测物挡住
 * （≥ 外径），内径爪张开时被管壁挡住（≤ 内径），深度尺不能超过槽深。
 */
function clampJaw(mode: MeasureMode, jaw: number): number {
  const t = MODES[mode].target;
  const lo = mode === 0 ? t : 0;
  const hi = mode === 0 ? JAW_MAX : t;
  return Math.min(hi, Math.max(lo, jaw));
}

function normalize(
  input: VernierCaliperGuideParams
): VernierCaliperGuideParams {
  const mode = snapMode(input.mode);
  return {
    precision: snapPrecision(input.precision),
    mode,
    jawPosition: clampJaw(mode, Number(input.jawPosition) || 0),
    showReading: snap01(input.showReading),
    demo: snap01(input.demo)
  };
}

function precisionConfig(precision: GuidePrecision): {
  divisions: number;
  length: number;
} {
  switch (precision) {
    case 0.1:
      return { divisions: 10, length: 9 };
    case 0.05:
      return { divisions: 20, length: 19 };
    case 0.02:
    default:
      return { divisions: 50, length: 49 };
  }
}

export function computeReading(
  jawPosition: number,
  precision: GuidePrecision
): {
  mainScaleReading: number;
  vernierAlignment: number;
  alignOffset: number;
  totalReading: number;
} {
  // 游标无估读：读数必须是精度的整数倍。先量化再分解，
  // 正确处理 99.97 → 100.0 这类向下一整毫米的进位（零线对齐右侧
  // 主尺刻线时主尺读数必须随并进位；「floor + 逐格搜索对齐」的旧算法
  // 在此边界会把 99.97 误读为 99.0，误差近 1mm）。
  const totalReading = Math.round(jawPosition / precision) * precision;
  const mainScaleReading = Math.floor(totalReading + 1e-9);
  const vernierAlignment = Math.round(
    (totalReading - mainScaleReading) / precision + 1e-9
  );
  return {
    mainScaleReading,
    vernierAlignment,
    alignOffset: Math.abs(jawPosition - totalReading),
    totalReading
  };
}

export function createVernierCaliperGuideSim(
  initial: VernierCaliperGuideParams
) {
  const normalizedInitial = normalize(initial);
  let params: VernierCaliperGuideParams = { ...normalizedInitial };
  let demoTime = 0;

  function buildState(): VernierCaliperGuideState {
    const { divisions, length } = precisionConfig(params.precision);
    const reading = computeReading(params.jawPosition, params.precision);
    return {
      currentReading: reading.totalReading,
      zeroOffset: 0,
      precision: params.precision,
      mode: params.mode,
      modeName: MODES[params.mode].name,
      targetSize: MODES[params.mode].target,
      jawPosition: params.jawPosition,
      ...reading,
      vernierDivisions: divisions,
      vernierLength: length,
      showReading: params.showReading === 1,
      demo: params.demo === 1,
      demoStep: Math.floor(demoTime / DEMO_STEP_S) % DEMO_STEPS
    };
  }

  return {
    getState(): VernierCaliperGuideState {
      return buildState();
    },
    setParams(next: Partial<VernierCaliperGuideParams>): void {
      // 控件可能传入字符串或连续值，统一吸附/钳位，保证读数与分度自洽
      const merged = normalize({ ...params, ...next });
      // 演示播放中用户手动拖爪（外部写入 jawPosition）→ 退出演示，
      // 避免 step() 每帧覆盖用户操作
      if (next.jawPosition !== undefined && params.demo === 1) {
        merged.demo = 0;
      }
      if (merged.mode !== params.mode || merged.demo > params.demo) {
        demoTime = 0;
      }
      params = merged;
    },
    step(dt: number): void {
      if (params.demo !== 1) return;
      demoTime += dt;
      // 演示循环：步骤 1 内卡爪动画贴合到目标尺寸。外径从张开收拢；
      // 内径/深度反向（钳位上限即被测尺寸，只能从收拢侧出发）
      const stepIndex = Math.floor(demoTime / DEMO_STEP_S) % DEMO_STEPS;
      const target = MODES[params.mode].target;
      const from =
        params.mode === 0
          ? Math.min(JAW_MAX, target + 30)
          : Math.max(0, target - 30);
      if (stepIndex === 0) {
        params = { ...params, jawPosition: from };
      } else if (stepIndex === 1) {
        const t = (demoTime % DEMO_STEP_S) / DEMO_STEP_S;
        params = { ...params, jawPosition: from + (target - from) * t };
      } else {
        params = { ...params, jawPosition: target };
      }
    },
    reset(): void {
      params = { ...normalizedInitial };
      demoTime = 0;
    }
  };
}
