import type { VtIntegralSnapshot } from '../scene.sim';

export type DrawContext = {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  theme: 'dark' | 'light';
  responsiveScale: number;
};

export type SceneRenderer = (
  ctx: DrawContext,
  snapshot: VtIntegralSnapshot
) => void;

export type AxisConfig = {
  x: number;
  y: number;
  width: number;
  height: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  xLabel?: string;
  yLabel?: string;
};
