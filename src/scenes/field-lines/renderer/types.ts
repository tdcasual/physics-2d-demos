/**
 * 电场线渲染共享类型
 */

export type PixelCharge = {
  x: number;
  y: number;
  q: number;
  radius: number;
};

export type FieldLinePath = {
  points: Array<{ x: number; y: number }>;
  /** 每个点对应的局部场强 */
  fieldMagnitudes: number[];
  /** 1 = 从正电荷出发, -1 = 向负电荷收敛 */
  direction: 1 | -1;
};

/** 试探点：该处的电场矢量 */
export type FieldProbe = {
  x: number;
  y: number;
  Ex: number;
  Ey: number;
  magnitude: number;
};

export type VisualConfig = {
  chargeRadius: number;
  chargeFontPx: number;
  arrowStrokeWidth: number;
  arrowSize: number;
  maxArrowLength: number;
  minArrowLength: number;
};

export type ThemeColors = {
  canvasBg: string;
  arrowColor: string;
  positiveGlow: string;
  negativeGlow: string;
  equipotential: string;
};
