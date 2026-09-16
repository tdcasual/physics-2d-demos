import { scaledSize } from '../../core/canvas-sizing';
import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  inclineLayout,
  springLayout,
  stageLayoutFrom,
  stageTransform,
  threeForcesConstants as C,
  type ThreeForcesState
} from './scene.sim';

export type CreateThreeForcesViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

type Palette = {
  bg: string;
  grid: string;
  ink: string;
  muted: string;
  red: string;
  blue: string;
  teal: string;
  gold: string;
  wedge: string;
  wedgeStroke: string;
  block: string;
  ground: string;
  spring: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    grid: '#e4dfd4',
    ink: '#303744',
    muted: '#8b97a5',
    red: '#ef4050',
    blue: '#3285d5',
    teal: '#1f9b8f',
    gold: '#e49a1b',
    wedge: '#efebe3',
    wedgeStroke: '#8d7b6a',
    block: '#9d7865',
    ground: '#3a4450',
    spring: '#d4a017'
  },
  dark: {
    bg: '#101827',
    grid: '#435169',
    ink: '#eef2f7',
    muted: '#9eabbc',
    red: '#fb7185',
    blue: '#60a5fa',
    teal: '#34d399',
    gold: '#fbbf24',
    wedge: '#273246',
    wedgeStroke: '#c4a484',
    block: '#c4a484',
    ground: '#d5dee8',
    spring: '#fbbf24'
  }
};

function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  color: string,
  size: number,
  align: CanvasTextAlign = 'left',
  weight = 600
): void {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, radius);
    return;
  }
  ctx.rect(x, y, w, h);
}

function arrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width: number,
  dashed = false
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (length < 2) return;
  const ux = dx / length;
  const uy = dy / length;
  const head = C.arrowHead;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash(dashed ? [6, 5] : []);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - ux * head - uy * head * 0.45,
    y2 - uy * head + ux * head * 0.45
  );
  ctx.lineTo(
    x2 - ux * head + uy * head * 0.45,
    y2 - uy * head - ux * head * 0.45
  );
  ctx.closePath();
  ctx.fill();
}

function scaledLen(magnitude: number): number {
  return Math.min(
    C.maxVectorLength,
    Math.max(C.minVectorLength, Math.abs(magnitude) * C.vectorScale)
  );
}

function drawGrid(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, C.baseWidth, C.baseHeight);
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let x = 0; x <= C.baseWidth; x += C.gridStep) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, C.baseHeight);
    ctx.stroke();
  }
  for (let y = 0; y <= C.baseHeight; y += C.gridStep) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(C.baseWidth, y);
    ctx.stroke();
  }
}

function drawAngleMark(
  ctx: CanvasRenderingContext2D,
  layout: ReturnType<typeof inclineLayout>,
  angleDeg: number,
  p: Palette,
  font: (n: number) => number
): void {
  const origin = layout.baseEnd;
  const radius = C.angleArcRadius;
  ctx.strokeStyle = p.gold;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(origin.x, origin.y, radius, -layout.theta, 0);
  ctx.stroke();
  const mid = -layout.theta / 2;
  text(
    ctx,
    `${Math.round(angleDeg)}°`,
    origin.x + Math.cos(mid) * (radius + 16),
    origin.y + Math.sin(mid) * (radius + 16) - 4,
    p.gold,
    font(15),
    'center',
    700
  );
}

function drawIncline(
  ctx: CanvasRenderingContext2D,
  state: ThreeForcesState,
  p: Palette,
  font: (n: number) => number
): void {
  const layout = inclineLayout(state.params.inclineAngle, state.blockS);
  const groundLeft = layout.baseEnd.x - C.stopperWidth * 2;
  const groundRight = layout.rightAngle.x + 36;
  ctx.strokeStyle = p.ground;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(groundLeft, C.planeBaseY);
  ctx.lineTo(groundRight, C.planeBaseY);
  ctx.stroke();

  ctx.fillStyle = p.wedge;
  ctx.strokeStyle = p.wedgeStroke;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(layout.baseEnd.x, layout.baseEnd.y);
  ctx.lineTo(layout.rightAngle.x, layout.rightAngle.y);
  ctx.lineTo(layout.topEnd.x, layout.topEnd.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(layout.baseEnd.x, layout.baseEnd.y);
  ctx.lineTo(layout.topEnd.x, layout.topEnd.y);
  ctx.stroke();

  const postX = layout.baseEnd.x - C.stopperWidth * 0.7;
  ctx.fillStyle = p.block;
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2;
  rounded(
    ctx,
    postX,
    C.planeBaseY - C.stopperHeight,
    C.stopperWidth,
    C.stopperHeight,
    4
  );
  ctx.fill();
  ctx.stroke();

  if (state.blockS > 0.02) {
    const start = inclineLayout(state.params.inclineAngle, 0).foot;
    ctx.strokeStyle = p.teal;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 6]);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(layout.foot.x, layout.foot.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.save();
  ctx.translate(layout.blockCenter.x, layout.blockCenter.y);
  ctx.rotate(layout.blockRotation);
  ctx.fillStyle = p.block;
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2.4;
  rounded(
    ctx,
    -C.blockWidth / 2,
    -C.blockHeight / 2,
    C.blockWidth,
    C.blockHeight,
    6
  );
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  drawAngleMark(ctx, layout, state.params.inclineAngle, p, font);
  drawInclineVectors(ctx, state, layout, p, font);
}

function labelNear(
  ctx: CanvasRenderingContext2D,
  value: string,
  from: { x: number; y: number },
  dir: { x: number; y: number },
  length: number,
  color: string,
  size: number,
  nudgeX = 0,
  nudgeY = 0
): void {
  const mag = Math.hypot(dir.x, dir.y) || 1;
  text(
    ctx,
    value,
    from.x + (dir.x / mag) * (length + 14) + nudgeX,
    from.y + (dir.y / mag) * (length + 14) + nudgeY,
    color,
    size,
    'center',
    700
  );
}

function drawInclineVectors(
  ctx: CanvasRenderingContext2D,
  state: ThreeForcesState,
  layout: ReturnType<typeof inclineLayout>,
  p: Palette,
  font: (n: number) => number
): void {
  const origin = layout.blockCenter;
  const gLen = scaledLen(state.gravity);
  arrow(ctx, origin.x, origin.y, origin.x, origin.y + gLen, p.red, 4.2);
  text(
    ctx,
    'G',
    origin.x + 14,
    origin.y + gLen * 0.62,
    p.red,
    font(16),
    'left',
    700
  );

  const nLen = scaledLen(state.normal);
  arrow(
    ctx,
    origin.x,
    origin.y,
    origin.x + layout.outwardNormal.x * nLen,
    origin.y + layout.outwardNormal.y * nLen,
    p.blue,
    4.2
  );
  labelNear(
    ctx,
    'FN',
    origin,
    layout.outwardNormal,
    nLen,
    p.blue,
    font(15),
    -6,
    -2
  );

  if (state.friction > 0.05) {
    const fLen = scaledLen(state.friction);
    arrow(
      ctx,
      origin.x,
      origin.y,
      origin.x + layout.upslope.x * fLen,
      origin.y + layout.upslope.y * fLen,
      p.teal,
      3.6
    );
    labelNear(ctx, 'Ff', origin, layout.upslope, fLen, p.teal, font(15), 0, -8);
  }

  if (state.params.showComponents) {
    const g1Len = scaledLen(state.downslope);
    const g2Len = scaledLen(state.perpendicular);
    arrow(
      ctx,
      origin.x,
      origin.y,
      origin.x + layout.downslope.x * g1Len,
      origin.y + layout.downslope.y * g1Len,
      p.gold,
      2.4,
      true
    );
    arrow(
      ctx,
      origin.x,
      origin.y,
      origin.x + layout.inwardNormal.x * g2Len,
      origin.y + layout.inwardNormal.y * g2Len,
      p.muted,
      2.4,
      true
    );
    labelNear(ctx, 'G₁', origin, layout.downslope, g1Len, p.gold, font(14));
    labelNear(ctx, 'G₂', origin, layout.inwardNormal, g2Len, p.muted, font(14));
  }
}

function drawSpring(
  ctx: CanvasRenderingContext2D,
  state: ThreeForcesState,
  p: Palette,
  font: (n: number) => number
): void {
  const layout = springLayout(state.springDisplacement);
  const groundLeft = layout.wallX - 36;
  const groundRight = layout.blockCenter.x + C.blockWidth;
  ctx.strokeStyle = p.ground;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(groundLeft, layout.groundY);
  ctx.lineTo(groundRight + 28, layout.groundY);
  ctx.stroke();

  ctx.fillStyle = p.ink;
  rounded(
    ctx,
    layout.wallX - C.springWallWidth,
    layout.groundY - C.springWallHeight,
    C.springWallWidth,
    C.springWallHeight,
    3
  );
  ctx.fill();

  const y = layout.blockCenter.y;
  const startX = layout.wallX;
  const endX = layout.springEndX;
  ctx.strokeStyle = p.spring;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(startX, y);
  const coils = C.coilCount;
  const span = endX - startX;
  for (let i = 1; i < coils; i += 1) {
    const px = startX + (span * i) / coils;
    const py = y + (i % 2 === 0 ? -C.coilAmp : C.coilAmp);
    ctx.lineTo(px, py);
  }
  ctx.lineTo(endX, y);
  ctx.stroke();

  ctx.setLineDash([4, 5]);
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(layout.equilibriumX, layout.groundY - C.blockHeight - 18);
  ctx.lineTo(layout.equilibriumX, layout.groundY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.save();
  ctx.translate(layout.blockCenter.x, layout.blockCenter.y);
  ctx.fillStyle = p.block;
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2.4;
  rounded(
    ctx,
    -C.blockWidth / 2,
    -C.blockHeight / 2,
    C.blockWidth,
    C.blockHeight,
    6
  );
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  if (Math.abs(state.springForce) > 0.05) {
    const forceLen = scaledLen(Math.abs(state.springForce));
    const dir = state.springForce >= 0 ? 1 : -1;
    const arrowY = y - C.blockHeight / 2 - 16;
    const startX = layout.blockCenter.x;
    arrow(ctx, startX, arrowY, startX + dir * forceLen, arrowY, p.gold, 4);
    text(
      ctx,
      'F弹',
      startX + dir * (forceLen + 16),
      arrowY - 12,
      p.gold,
      font(16),
      'center',
      700
    );
  }

  if (state.params.showComponents) {
    const x0 = layout.equilibriumX;
    const x1 = layout.blockCenter.x;
    const markY = layout.groundY + 22;
    ctx.strokeStyle = p.muted;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x0, markY - 6);
    ctx.lineTo(x0, markY + 6);
    ctx.moveTo(x1, markY - 6);
    ctx.lineTo(x1, markY + 6);
    ctx.moveTo(x0, markY);
    ctx.lineTo(x1, markY);
    ctx.stroke();
    text(ctx, 'x', (x0 + x1) / 2, markY + 14, p.muted, font(14), 'center');
  }
}

export function createThreeForcesView(
  options: CreateThreeForcesViewOptions = {}
) {
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: {
      mode: 'clamped',
      fallbackWidth: C.baseWidth,
      fallbackHeight: C.baseHeight
    },
    initialWidth: C.baseWidth,
    initialHeight: C.baseHeight,
    eagerContext: true
  });
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  let snapshot: ThreeForcesState | null = null;
  let parentObserved = false;
  let panelObserved = false;
  let drawing = false;
  const overlayObservers: Array<{ disconnect(): void }> = [];

  function paint(state: ThreeForcesState): void {
    if (drawing) return;
    drawing = true;
    try {
      draw(state);
    } finally {
      drawing = false;
    }
  }

  function redraw(): void {
    if (snapshot) paint(snapshot);
  }

  function watchOverlay(): void {
    if (!stage.canvas) return;
    const parent = stage.canvas.parentElement;
    if (!parent) return;
    if (!parentObserved && typeof ResizeObserver !== 'undefined') {
      parentObserved = true;
      const resize = new ResizeObserver(() => redraw());
      resize.observe(parent);
      overlayObservers.push(resize);
    }
    if (panelObserved) return;
    const panel = parent.querySelector(
      '.teaching-readout-panel, .srgb-readout-panel, .readout-panel'
    );
    if (!(panel instanceof HTMLElement)) return;
    panelObserved = true;
    if (typeof ResizeObserver !== 'undefined') {
      const resize = new ResizeObserver(() => redraw());
      resize.observe(panel);
      overlayObservers.push(resize);
    }
    if (typeof MutationObserver !== 'undefined') {
      const mutate = new MutationObserver(() => redraw());
      mutate.observe(panel, {
        attributes: true,
        attributeFilter: ['class', 'style']
      });
      overlayObservers.push(mutate);
    }
  }

  function draw(state: ThreeForcesState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const layout = stageLayoutFrom(stage.canvas);
    const { fit, offsetX, offsetY } = stageTransform(width, height, layout);
    const p = PALETTE[env.theme];
    const rs = stage.responsiveScale;
    const typeScale = env.fontScale() * Math.min(env.contentScale(), 1.25);
    const font = (base: number): number =>
      scaledSize(base * typeScale, Math.max(rs, 0.3), 11) / Math.max(fit, 0.05);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fit, fit);
    drawGrid(ctx, p);
    if (state.params.tab === 'spring') drawSpring(ctx, state, p, font);
    else drawIncline(ctx, state, p, font);
    ctx.restore();
    watchOverlay();
  }

  return {
    render(state: ThreeForcesState): void {
      snapshot = state;
      stage.ensureSized();
      paint(state);
    },
    resize(): void {
      stage.resize();
      if (snapshot) paint(snapshot);
    },
    setTheme(theme: TeachingTheme): void {
      env.setTheme(theme);
      if (snapshot) paint(snapshot);
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints): void {
      env.setMode(mode, hints);
      if (snapshot) paint(snapshot);
    },
    dispose(): void {
      snapshot = null;
      overlayObservers.forEach((observer) => observer.disconnect());
      overlayObservers.length = 0;
      stage.release();
    }
  };
}
