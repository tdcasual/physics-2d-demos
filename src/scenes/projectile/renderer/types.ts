export type DrawContext = {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  theme: 'light' | 'dark';
  responsiveScale: number;
  /** 演示模式内容放大系数（normal=1） */
  contentScale: number;
};

export type CoordSystem = {
  originX: number;
  originY: number;
  scale: number;
};

export type WorldPoint = { x: number; y: number };

export type ScreenPoint = { x: number; y: number };
