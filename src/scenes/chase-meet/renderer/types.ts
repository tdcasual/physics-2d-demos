import type { ChaseMeetSnapshot } from '../scene.sim';
import type { StageDom } from './view-utils';

export type DrawContext = {
  snapshot: ChaseMeetSnapshot;
  theme: 'light' | 'dark';
};

export type MotionDrawContext = DrawContext & {
  ctx: CanvasRenderingContext2D;
  cssW: number;
  cssH: number;
  visualScale: number;
};

export type GraphDrawContext = DrawContext & {
  xCtx: CanvasRenderingContext2D;
  vCtx: CanvasRenderingContext2D;
  xW: number;
  xH: number;
  vW: number;
  vH: number;
  visualScale: number;
};
