export type TeachingMode = 'normal' | 'presentation';
export type TeachingTheme = 'dark' | 'light';

export type RightStageReadability = {
  primaryFontPx: number;
  secondaryFontPx: number;
  majorStrokePx: number;
  minorStrokePx: number;
  markerRadiusPx: number;
};

export type TeachingStandards = {
  viewport: {
    width: number;
    height: number;
  };
  bodyFontPx: number;
  controlFontPx: number;
  headingFontPx: number;
  strokePx: number;
  pointRadiusPx: number;
  rightStage: RightStageReadability;
};

const BASE_VIEWPORT = { width: 1920, height: 1080 } as const;

const TOKENS: Record<TeachingMode, Omit<TeachingStandards, 'viewport'>> = {
  normal: {
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
  },
  presentation: {
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
  }
};

export function getTeachingStandards(mode: TeachingMode): TeachingStandards {
  const token = TOKENS[mode];
  return {
    viewport: {
      width: BASE_VIEWPORT.width,
      height: BASE_VIEWPORT.height
    },
    ...token
  };
}
