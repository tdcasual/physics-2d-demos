
export type DrawContext = {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  theme: 'light' | 'dark';
  responsiveScale: number;
};

export type CoordSystem = {
  originX: number;
  originY: number;
  scale: number;
};

export type WorldPoint = { x: number; y: number };

export type ScreenPoint = { x: number; y: number };
