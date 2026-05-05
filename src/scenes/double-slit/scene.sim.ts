/**
 * 双缝干涉 — 物理模拟
 *
 * 管理实验状态：步骤、波长、双缝间距、播放状态、动画时间
 */

export type DoubleSlitParams = {
  step: number;           // 1–6
  lambda: number;         // 波长 400–700 nm
  slitDistance: number;   // 20–60 (px)
  isPlaying: boolean;
  activeInstrument: 'caliper' | 'micrometer'; // 步骤6当前高亮仪器
  showInstrumentReadout: boolean; // 步骤6是否显示仪器读数
  micrometerOffset: number; // 螺旋测微仪零位偏移 (mm)
  stripeOffset: number; // 螺旋测微仪条纹偏移 (px)
};

export type DoubleSlitState = {
  params: DoubleSlitParams;
  time: number;
};

/** 物理常数：双缝到屏幕距离 (m) */
export const PHYSICAL_L = 0.2;

/** 物理常数：slitDistance 每单位对应的物理米数 (1单位 = 0.01mm) */
export const PHYSICAL_D_SCALE = 0.01e-3;

/** 像素比例：1px = 0.01mm */
export const PIXEL_TO_MM = 0.01;

/**
 * 严格物理公式计算屏幕上条纹间距（像素）
 * Δx = λL/d
 */
export function computeFringeSpacingPx(lambda: number, slitDistance: number): number {
  const d = slitDistance * PHYSICAL_D_SCALE;    // 双缝间距 (m)
  const lambdaM = lambda * 1e-9;                // 波长 (m)
  const deltaXM = (lambdaM * PHYSICAL_L) / d;   // 条纹间距 (m)
  return deltaXM / (PIXEL_TO_MM * 1e-3);        // 转换为像素
}

/** 波长(nm) → 波纹像素间距
 *  按固定比例放大：gap = lambda / 15，使短波长（紫色）区域不再密集眼花
 */
export function lambdaToGap(lambda: number): number {
  return lambda / 15;
}

/** 波长(nm) → [R, G, B] */
export function lambdaToRgb(lambda: number): [number, number, number] {
  let r: number, g: number, b: number;
  if (lambda < 440) {
    r = 120 + (lambda - 400) * 3.375;
    g = 0;
    b = 255;
  } else if (lambda < 490) {
    r = 0;
    g = (lambda - 440) * 5.1;
    b = 255;
  } else if (lambda < 510) {
    r = 0;
    g = 255;
    b = 255 - (lambda - 490) * 12.75;
  } else if (lambda < 570) {
    r = (lambda - 510) * 4.25;
    g = 255;
    b = 0;
  } else if (lambda < 590) {
    r = 255;
    g = 255;
    b = (lambda - 570) * 12.75;
  } else if (lambda < 620) {
    r = 255;
    g = 255 - (lambda - 590) * 8.5;
    b = 0;
  } else {
    r = 255;
    g = 0;
    b = 0;
  }
  return [Math.round(Math.max(0, Math.min(255, r))), Math.round(Math.max(0, Math.min(255, g))), Math.round(Math.max(0, Math.min(255, b)))];
}

/** 波长(nm) → hex 颜色 */
export function wavelengthToColor(lambda: number): string {
  const [r, g, b] = lambdaToRgb(lambda);
  return `rgb(${r},${g},${b})`;
}

export const STEPS = [
  { id: 1, title: '光源与透镜', desc: '光源发出特定波长的光，为了提高穿过狭缝的光强，使用凸透镜将光线汇聚，使其尽可能多地集中打在单缝上。' },
  { id: 2, title: '单缝衍射', desc: '光波经过单缝时发生衍射，原本的光束变成了以单缝为中心的半圆形向外扩散的波（相干光源）。' },
  { id: 3, title: '双缝波前分裂', desc: '衍射波到达双缝，惠更斯原理使得两个缝隙成为两个振动步调完全一致的新波源（相干波源）。' },
  { id: 4, title: '空间干涉与叠加', desc: '在遮光筒中，两列波相互叠加。波峰遇波峰加强（亮带），波峰遇波谷抵消（暗带）。' },
  { id: 5, title: '毛玻璃上的条纹', desc: '干涉图样打在毛玻璃上，形成明暗相间的干涉条纹。右侧曲线表示光强分布。' },
  { id: 6, title: '目镜观察', desc: '通过目镜放大观察干涉条纹，并利用测微尺测量条纹间距。条纹间距与波长成正比，与双缝间距成反比。' }
];

export function createDoubleSlitSim(initial: DoubleSlitParams) {
  let params: DoubleSlitParams = { ...initial };
  let time = 0;

  function getState(): DoubleSlitState {
    return {
      params: { ...params },
      time
    };
  }

  function setParams(next: Partial<DoubleSlitParams>): DoubleSlitParams {
    params = { ...params, ...next };
    return params;
  }

  function reset(): void {
    params = { ...initial };
    time = 0;
  }

  function step(_dt: number): void {
    if (params.isPlaying) {
      time += 1.5;
    }
  }

  return { getState, setParams, reset, step };
}
