/**
 * 双缝干涉 — 物理模拟
 *
 * 管理实验状态：步骤、波长、双缝间距、播放状态、动画时间
 */

export type LightMode = 'mono' | 'white';
export type FilterColor =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'violet';
export type ViewMode = 'crosshair' | 'fringe';

export type DoubleSlitParams = {
  step: number; // 1–6
  lambda: number; // 波长 400–700 nm
  slitDistance: number; // 16–43 (px)
  isPlaying: boolean;
  activeInstrument: 'caliper' | 'micrometer'; // 步骤6当前高亮仪器
  showInstrumentReadout: boolean; // 步骤6是否显示仪器读数
  micrometerOffset: number; // 螺旋测微仪零位偏移 (mm)
  stripeOffset: number; // 螺旋测微仪十字准星位移 (mm)
  crosshairAngle?: number; // 分划板旋转角度 (0-90)
  viewMode?: ViewMode; // 目镜观测模式：crosshair=分划板移动，fringe=条纹移动
  L?: number; // 缝屏距离 (m), 默认 0.7
  lightMode?: LightMode; // 光源模式，默认 'mono'
  filterColor?: FilterColor | null; // 滤光片颜色，默认 null
};

export type DoubleSlitState = {
  params: DoubleSlitParams;
  time: number;
};

/** 物理常数：双缝到屏幕距离默认值 (m) */
export const DEFAULT_L = 0.7;

/** 物理常数：slitDistance 每单位对应的物理米数 (1单位 = 0.01mm) */
export const PHYSICAL_D_SCALE = 0.01e-3;

/**
 * 计算真实条纹间距 (mm)
 * Δx = λL/d
 */
export function computeRealDeltaXmm(
  lambda: number,
  slitDistance: number,
  L: number = DEFAULT_L
): number {
  const d = slitDistance * PHYSICAL_D_SCALE;
  const lambdaM = lambda * 1e-9;
  return ((lambdaM * L) / d) * 1000;
}

/**
 * 根据测得的条纹间距反算波长 (nm)
 * λ = dΔx/L
 */
export function computeWavelengthNm(
  deltaXmm: number,
  slitDistance: number,
  L: number = DEFAULT_L
): number {
  const d = slitDistance * PHYSICAL_D_SCALE;
  const deltaXM = deltaXmm * 1e-3;
  return ((d * deltaXM) / L) * 1e9;
}

export function validateWavelength(
  inputNm: number,
  actualNm: number,
  tolerancePct = 5
): { ok: boolean; errorPct: number } {
  const errorPct =
    actualNm === 0
      ? inputNm === 0
        ? 0
        : Number.POSITIVE_INFINITY
      : (Math.abs(inputNm - actualNm) / Math.abs(actualNm)) * 100;
  return {
    ok: Number.isFinite(errorPct) && errorPct <= tolerancePct + 1e-12,
    errorPct
  };
}

/** 主画布像素比例：1px = 0.01mm */
export const PIXEL_TO_MM = 0.01;

/**
 * 条纹间距（主画布像素）
 * 用于 scene.view.ts 绘制干涉图样
 */
export function computeFringeSpacingPx(
  lambda: number,
  slitDistance: number,
  L: number = DEFAULT_L
): number {
  return computeRealDeltaXmm(lambda, slitDistance, L) / PIXEL_TO_MM;
}

/** 螺旋测微仪目镜条纹缩放：每 mm 物理条纹间距对应的视觉像素 */
const MICROMETER_STRIPE_SCALE = 31;
/** 游标卡尺目镜中条纹视觉缩放基数 (1cm读数对应像素) */
const CALIPER_UNIT_PX = 96;

/**
 * 根据物理条纹间距计算螺旋测微仪目镜中的条纹像素间距
 * stripeSpacingVisual = realDeltaXmm * SCALE
 */
export function computeMicrometerStripePx(realDeltaXmm: number): number {
  return realDeltaXmm * MICROMETER_STRIPE_SCALE;
}

/**
 * 根据物理条纹间距计算螺旋测微仪的 crosshairSpeed
 * crosshairSpeed = stripeSpacingVisual / realDeltaXmm = SCALE (常数)
 */
export function computeMicrometerSpeed(_realDeltaXmm: number): number {
  return MICROMETER_STRIPE_SCALE;
}

/**
 * 根据物理条纹间距计算游标卡尺目镜中的条纹像素间距
 * fringeSpacingVisual = realDeltaXcm * UNIT_PX
 */
export function computeCaliperFringePx(realDeltaXmm: number): number {
  return (realDeltaXmm / 10) * CALIPER_UNIT_PX;
}

/** 波长(nm) → 波纹像素间距
 *  gap = lambda / 28，控制波纹密度：约 10 条波前可见
 */
export function lambdaToGap(lambda: number): number {
  return lambda / 14;
}

// ── 白光与滤光片 ──

export const FILTERS: Record<
  FilterColor,
  { label: string; center: number; range: [number, number] }
> = {
  red: { label: '红', center: 660, range: [620, 700] },
  orange: { label: '橙', center: 600, range: [590, 620] },
  yellow: { label: '黄', center: 580, range: [570, 590] },
  green: { label: '绿', center: 530, range: [500, 560] },
  blue: { label: '蓝', center: 470, range: [430, 500] },
  violet: { label: '紫', center: 415, range: [400, 430] }
};

export const WHITE_LAMBDAS = [430, 500, 550, 600, 660];

export function isWhiteLight(params: DoubleSlitParams): boolean {
  return params.lightMode === 'white';
}

export function getActiveWavelengths(params: DoubleSlitParams): number[] {
  if (params.lightMode !== 'white') return [params.lambda];
  if (params.filterColor && FILTERS[params.filterColor]) {
    const f = FILTERS[params.filterColor];
    const lambdas: number[] = [];
    for (let l = f.range[0]; l <= f.range[1]; l += 10) lambdas.push(l);
    return lambdas.length ? lambdas : [f.center];
  }
  return WHITE_LAMBDAS;
}

export function getEffectiveLambda(params: DoubleSlitParams): number {
  if (params.lightMode !== 'white') return params.lambda;
  if (params.filterColor && FILTERS[params.filterColor])
    return FILTERS[params.filterColor].center;
  return 550;
}

export { lambdaToRgb, wavelengthToColor } from '../../core/wavelength';

export const STEPS = [
  {
    id: 1,
    title: '光源与透镜',
    desc: '光源发出特定波长的光，为了提高穿过狭缝的光强，使用凸透镜将光线汇聚，使其尽可能多地集中打在单缝上。'
  },
  {
    id: 2,
    title: '单缝衍射',
    desc: '光波经过单缝时发生衍射，原本的光束变成了以单缝为中心的半圆形向外扩散的波（相干光源）。'
  },
  {
    id: 3,
    title: '双缝波前分裂',
    desc: '衍射波到达双缝，惠更斯原理使得两个缝隙成为两个振动步调完全一致的新波源（相干波源）。'
  },
  {
    id: 4,
    title: '空间干涉与叠加',
    desc: '在遮光筒中，两列波相互叠加。波峰遇波峰加强（亮带），波峰遇波谷抵消（暗带）。'
  },
  {
    id: 5,
    title: '毛玻璃上的条纹',
    desc: '干涉图样打在毛玻璃上，形成明暗相间的干涉条纹。右侧曲线表示光强分布。'
  },
  {
    id: 6,
    title: '目镜观察',
    desc: '通过目镜放大观察干涉条纹，并利用测微尺测量条纹间距。条纹间距与波长成正比，与双缝间距成反比。'
  }
];

export function createDoubleSlitSim(initial: DoubleSlitParams) {
  let params: DoubleSlitParams = {
    lightMode: 'mono',
    filterColor: null,
    ...initial
  };
  let time = 0;
  let _stateCache: DoubleSlitState | null = null;

  function getState(): DoubleSlitState {
    if (_stateCache) return _stateCache;
    _stateCache = {
      params: { ...params },
      time
    };
    return _stateCache;
  }

  function setParams(next: Partial<DoubleSlitParams>): DoubleSlitParams {
    params = { ...params, ...next };
    _stateCache = null;
    return params;
  }

  function reset(): void {
    params = { ...initial };
    time = 0;
    _stateCache = null;
  }

  function step(dt: number): void {
    if (params.isPlaying) {
      time += dt * 12.0;
      _stateCache = null;
    }
  }

  return { getState, setParams, reset, step };
}
