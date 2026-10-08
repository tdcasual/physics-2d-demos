import type { VtIntegralSnapshot } from '../scene.sim';

export type DrawContext = {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  theme: 'dark' | 'light';
  responsiveScale: number;
  /** 演示模式内容放大系数（normal=1，presentation=renderHints.contentScale） */
  contentScale: number;
  /**
   * 读数浮层在画布 CSS 坐标系中的遮挡矩形（无遮挡 / 移动端 tab 布局为
   * null）。各子场景布局据此让开标题、图例与绘图区。
   */
  occlusion?: Box | null;
};

/** 画布 CSS 坐标系中的轴对齐矩形 */
export type Box = { left: number; top: number; right: number; bottom: number };

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
