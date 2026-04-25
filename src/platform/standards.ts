/**
 * 教学渲染标准
 * 提供按缩放比例计算的字体、线条、标记尺寸标准
 */

/** 教学模式 */
export type TeachingMode = 'normal' | 'presentation';
/** 教学主题 */
export type TeachingTheme = 'dark' | 'light';

/** 右舞台可读性指标 */
export type RightStageReadability = {
  primaryFontPx: number;
  secondaryFontPx: number;
  majorStrokePx: number;
  minorStrokePx: number;
  markerRadiusPx: number;
};

/** 完整教学渲染标准 */
export type TeachingStandards = {
  viewport: { width: number; height: number };
  bodyFontPx: number;
  controlFontPx: number;
  headingFontPx: number;
  strokePx: number;
  pointRadiusPx: number;
  rightStage: RightStageReadability;
};

const BASE_VIEWPORT = { width: 1920, height: 1080 } as const;

/** 标准模式基准 tokens（scale = 1.0） */
const BASE_TOKENS: Omit<TeachingStandards, 'viewport'> = {
  bodyFontPx: 28,
  controlFontPx: 26,
  headingFontPx: 46,
  strokePx: 5,
  pointRadiusPx: 10,
  rightStage: {
    primaryFontPx: 36,
    secondaryFontPx: 30,
    majorStrokePx: 6,
    minorStrokePx: 5,
    markerRadiusPx: 12
  }
};

/** 兼容旧接口：保留原始 presentation tokens（无 scale 参数时使用） */
const LEGACY_PRESENTATION_TOKENS: Omit<TeachingStandards, 'viewport'> = {
  bodyFontPx: 42,
  controlFontPx: 38,
  headingFontPx: 64,
  strokePx: 9,
  pointRadiusPx: 16,
  rightStage: {
    primaryFontPx: 56,
    secondaryFontPx: 46,
    majorStrokePx: 11,
    minorStrokePx: 9,
    markerRadiusPx: 20
  }
};

/**
 * 根据缩放倍率生成渲染标准
 * @param scale - 缩放倍率（1.0 = 标准模式）
 */
export function getRenderTokens(scale: number = 1.0): TeachingStandards {
  const s = Math.max(0.5, scale);
  const round = (v: number) => Math.max(1, Math.round(v * s));
  return {
    viewport: {
      width: BASE_VIEWPORT.width,
      height: BASE_VIEWPORT.height
    },
    bodyFontPx: round(BASE_TOKENS.bodyFontPx),
    controlFontPx: round(BASE_TOKENS.controlFontPx),
    headingFontPx: round(BASE_TOKENS.headingFontPx),
    strokePx: Math.max(1, BASE_TOKENS.strokePx * s),
    pointRadiusPx: round(BASE_TOKENS.pointRadiusPx),
    rightStage: {
      primaryFontPx: round(BASE_TOKENS.rightStage.primaryFontPx),
      secondaryFontPx: round(BASE_TOKENS.rightStage.secondaryFontPx),
      majorStrokePx: Math.max(1, BASE_TOKENS.rightStage.majorStrokePx * s),
      minorStrokePx: Math.max(1, BASE_TOKENS.rightStage.minorStrokePx * s),
      markerRadiusPx: round(BASE_TOKENS.rightStage.markerRadiusPx)
    }
  };
}

/**
 * 兼容旧接口：根据模式获取教学标准
 * @param mode - 演示模式
 * @param scale - 可选自定义缩放倍率（presentation 模式下生效）
 * @deprecated 新场景建议使用 getRenderTokens(scale)
 */
export function getTeachingStandards(
  mode: TeachingMode,
  scale?: number
): TeachingStandards {
  if (mode === 'presentation' && scale === undefined) {
    // 无 scale 参数时保留旧行为（兼容未改造场景和测试）
    return {
      viewport: BASE_VIEWPORT,
      ...LEGACY_PRESENTATION_TOKENS
    };
  }
  const effectiveScale = mode === 'presentation' ? (scale ?? 1.5) : 1.0;
  return getRenderTokens(effectiveScale);
}
