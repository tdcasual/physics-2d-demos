import type { ElectrificationSnapshot } from '../scene.sim';

export type DrawContext = {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  theme: 'dark' | 'light';
  responsiveScale: number;
};

export type SceneRenderer = (
  ctx: DrawContext,
  snapshot: ElectrificationSnapshot
) => void;
