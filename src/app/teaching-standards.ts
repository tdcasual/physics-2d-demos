export type TeachingMode = 'normal' | 'presentation';

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
};

const BASE_VIEWPORT = { width: 1920, height: 1080 } as const;

const TOKENS: Record<TeachingMode, Omit<TeachingStandards, 'viewport'>> = {
  normal: {
    bodyFontPx: 20,
    controlFontPx: 20,
    headingFontPx: 36,
    strokePx: 2,
    pointRadiusPx: 6
  },
  presentation: {
    bodyFontPx: 30,
    controlFontPx: 28,
    headingFontPx: 52,
    strokePx: 4,
    pointRadiusPx: 10
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
