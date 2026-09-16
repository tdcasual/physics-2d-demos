import { scaledSize } from '../../core/canvas-sizing';
import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { bellowsConstants, type BellowsState } from './scene.sim';

export type CreateBellowsViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

const {
  baseWidth: VIEW_W,
  baseHeight: VIEW_H,
  chamberLeft: CH_L,
  chamberRight: CH_R,
  chamberTop: CH_T,
  chamberBottom: CH_B,
  pistonHalf: PISTON_HALF,
  outletX: OUT_X,
  outletTop: OUT_TOP,
  outletWidth: OUT_W,
  manifoldY: MANIFOLD_Y,
  pipeLeftX: PIPE_L,
  pipeRightX: PIPE_R,
  rodEndX: ROD_END,
  valvePortInset: PORT_INSET
} = bellowsConstants;

type Palette = {
  bg: string;
  ink: string;
  muted: string;
  red: string;
  blue: string;
  gold: string;
  pipe: string;
  piston: string;
  pistonCore: string;
  highFill: string;
  lowFill: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    ink: '#2e3540',
    muted: '#8793a2',
    red: '#ef4050',
    blue: '#3c80b1',
    gold: '#e0a31a',
    pipe: '#323b42',
    piston: '#2c333c',
    pistonCore: '#dfe4ea',
    highFill: 'rgba(239,64,80,0.20)',
    lowFill: 'rgba(60,128,177,0.12)'
  },
  dark: {
    bg: '#101827',
    ink: '#edf2f7',
    muted: '#9aa9ba',
    red: '#fb7185',
    blue: '#60a5fa',
    gold: '#fbbf24',
    pipe: '#c5d0dc',
    piston: '#d5dee8',
    pistonCore: '#243044',
    highFill: 'rgba(251,113,133,0.22)',
    lowFill: 'rgba(96,165,250,0.14)'
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
  weight = 700
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
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.rect(x, y, w, h);
}

function arrowHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ux: number,
  uy: number,
  size: number
): void {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(
    x - ux * size - uy * size * 0.55,
    y - uy * size + ux * size * 0.55
  );
  ctx.lineTo(
    x - ux * size + uy * size * 0.55,
    y - uy * size - ux * size * 0.55
  );
  ctx.closePath();
  ctx.fill();
}

function dashedPoly(
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
  color: string,
  width: number
): void {
  if (points.length < 2) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([10, 7]);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  const dx = last.x - prev.x;
  const dy = last.y - prev.y;
  const len = Math.hypot(dx, dy) || 1;
  arrowHead(ctx, last.x, last.y, dx / len, dy / len, 12);
  ctx.restore();
}

function drawFlap(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  open: boolean,
  kind: 'exhaust' | 'intake',
  side: 'left' | 'right',
  p: Palette
): void {
  ctx.save();
  ctx.translate(x, y);
  if (open && kind === 'exhaust') {
    ctx.rotate(side === 'left' ? -1.05 : 1.05);
  } else if (open && kind === 'intake') {
    ctx.rotate(side === 'left' ? 0.7 : -0.7);
  }
  ctx.fillStyle = p.gold;
  ctx.strokeStyle = p.pipe;
  ctx.lineWidth = 1.5;
  rounded(ctx, -16, -5, 32, 10, 3);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawHousing(ctx: CanvasRenderingContext2D, p: Palette): void {
  const outL = OUT_X - OUT_W / 2;
  const outR = OUT_X + OUT_W / 2;
  ctx.strokeStyle = p.pipe;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 10;
  rounded(ctx, CH_L, CH_T, CH_R - CH_L, CH_B - CH_T, 12);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(PIPE_L, CH_T);
  ctx.lineTo(PIPE_L, MANIFOLD_Y);
  ctx.lineTo(outL, MANIFOLD_Y);
  ctx.lineTo(outL, OUT_TOP);
  ctx.moveTo(PIPE_R, CH_T);
  ctx.lineTo(PIPE_R, MANIFOLD_Y);
  ctx.lineTo(outR, MANIFOLD_Y);
  ctx.lineTo(outR, OUT_TOP);
  ctx.stroke();
  ctx.fillStyle = p.gold;
  for (const [x, y] of [
    [CH_L, CH_T],
    [CH_R, CH_T],
    [CH_L, CH_B],
    [CH_R, CH_B]
  ] as const) {
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPressure(
  ctx: CanvasRenderingContext2D,
  state: BellowsState,
  p: Palette,
  font: (n: number) => number
): void {
  const inset = 7;
  const top = CH_T + inset;
  const height = CH_B - CH_T - inset * 2;
  const pistonL = state.pistonX - PISTON_HALF;
  const pistonR = state.pistonX + PISTON_HALF;
  ctx.fillStyle = state.leftPressure === 'high' ? p.highFill : p.lowFill;
  ctx.fillRect(CH_L + inset, top, Math.max(4, pistonL - CH_L - inset), height);
  ctx.fillStyle = state.rightPressure === 'high' ? p.highFill : p.lowFill;
  ctx.fillRect(pistonR, top, Math.max(4, CH_R - inset - pistonR), height);
  const leftMid = (CH_L + pistonL) / 2;
  const rightMid = (pistonR + CH_R) / 2;
  // Keep labels above the horizontal piston rod. When a stroke makes one
  // chamber narrow, use a compact label so the status remains legible.
  const labelY = CH_T + 62;
  const leftLabel = pistonL - CH_L < 150;
  const rightLabel = CH_R - pistonR < 150;
  if (state.leftPressure === 'high') {
    text(
      ctx,
      leftLabel ? '高压' : '排气高压',
      leftMid,
      labelY,
      p.red,
      font(leftLabel ? 17 : 16),
      'center',
      700
    );
  } else {
    text(
      ctx,
      leftLabel ? '低压' : '进气低压',
      leftMid,
      labelY,
      p.blue,
      font(leftLabel ? 17 : 15),
      'center',
      600
    );
  }
  if (state.rightPressure === 'high') {
    text(
      ctx,
      rightLabel ? '高压' : '排气高压',
      rightMid,
      labelY,
      p.red,
      font(rightLabel ? 17 : 16),
      'center',
      700
    );
  } else {
    text(
      ctx,
      rightLabel ? '低压' : '进气低压',
      rightMid,
      labelY,
      p.blue,
      font(rightLabel ? 17 : 15),
      'center',
      600
    );
  }
}

function drawPiston(
  ctx: CanvasRenderingContext2D,
  pistonX: number,
  p: Palette
): void {
  const bodyW = PISTON_HALF * 2;
  const bodyH = CH_B - CH_T + 12;
  const y = CH_T - 6;
  ctx.fillStyle = p.piston;
  rounded(ctx, pistonX - PISTON_HALF, y, bodyW, bodyH, 4);
  ctx.fill();
  ctx.fillStyle = p.pistonCore;
  ctx.fillRect(pistonX - 4, y + 14, 8, bodyH - 28);
  ctx.fillStyle = p.piston;
  const midY = (CH_T + CH_B) / 2;
  rounded(ctx, pistonX, midY - 6, ROD_END - pistonX, 12, 4);
  ctx.fill();
}

function drawValves(
  ctx: CanvasRenderingContext2D,
  state: BellowsState,
  p: Palette,
  font: (n: number) => number
): void {
  const c = { x: CH_L + PORT_INSET, y: CH_T };
  const d = { x: CH_R - PORT_INSET, y: CH_T };
  const a = { x: CH_L + PORT_INSET, y: CH_B };
  const b = { x: CH_R - PORT_INSET, y: CH_B };
  drawFlap(ctx, c.x, c.y, state.valves.C, 'exhaust', 'left', p);
  drawFlap(ctx, d.x, d.y, state.valves.D, 'exhaust', 'right', p);
  drawFlap(ctx, a.x, a.y, state.valves.A, 'intake', 'left', p);
  drawFlap(ctx, b.x, b.y, state.valves.B, 'intake', 'right', p);
  text(ctx, 'C', c.x - 28, c.y - 18, p.ink, font(15), 'center');
  text(ctx, 'D', d.x + 28, d.y - 18, p.ink, font(15), 'center');
  text(ctx, 'A', a.x, a.y + 28, p.ink, font(15), 'center');
  text(ctx, 'B', b.x, b.y + 28, p.ink, font(15), 'center');
}

function drawFlow(
  ctx: CanvasRenderingContext2D,
  state: BellowsState,
  p: Palette
): void {
  const outL = OUT_X - OUT_W / 2;
  const outR = OUT_X + OUT_W / 2;
  const mouth = OUT_TOP + 8;
  if (state.direction === 'left') {
    dashedPoly(
      ctx,
      [
        { x: CH_L + PORT_INSET, y: CH_T - 8 },
        { x: PIPE_L, y: MANIFOLD_Y + 10 },
        { x: outL + 8, y: MANIFOLD_Y + 10 },
        { x: OUT_X, y: mouth }
      ],
      p.red,
      3.5
    );
    dashedPoly(
      ctx,
      [
        { x: CH_R - PORT_INSET, y: CH_B + 56 },
        { x: CH_R - PORT_INSET, y: CH_B + 8 }
      ],
      p.blue,
      3.5
    );
  } else {
    dashedPoly(
      ctx,
      [
        { x: CH_R - PORT_INSET, y: CH_T - 8 },
        { x: PIPE_R, y: MANIFOLD_Y + 10 },
        { x: outR - 8, y: MANIFOLD_Y + 10 },
        { x: OUT_X, y: mouth }
      ],
      p.red,
      3.5
    );
    dashedPoly(
      ctx,
      [
        { x: CH_L + PORT_INSET, y: CH_B + 56 },
        { x: CH_L + PORT_INSET, y: CH_B + 8 }
      ],
      p.blue,
      3.5
    );
  }
}

export function createBellowsView(options: CreateBellowsViewOptions = {}) {
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: { mode: 'clamped', fallbackWidth: VIEW_W, fallbackHeight: VIEW_H },
    initialWidth: VIEW_W,
    initialHeight: VIEW_H,
    eagerContext: true
  });
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  let snapshot: BellowsState | null = null;

  function draw(state: BellowsState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const p = PALETTE[env.theme];
    const fit = Math.min(width / VIEW_W, height / VIEW_H);
    const ox = (width - VIEW_W * fit) / 2;
    const oy = (height - VIEW_H * fit) / 2;
    const rs = stage.responsiveScale;
    const typeScale = env.fontScale() * Math.min(env.contentScale(), 1.25);
    const font = (base: number): number =>
      scaledSize(base * typeScale, Math.max(rs, 0.3), 11) / Math.max(fit, 0.05);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(fit, fit);
    drawPressure(ctx, state, p, font);
    drawHousing(ctx, p);
    drawPiston(ctx, state.pistonX, p);
    drawValves(ctx, state, p, font);
    if (state.params.showFlow) drawFlow(ctx, state, p);
    text(ctx, '出风口', OUT_X, OUT_TOP - 16, p.red, font(18), 'center', 700);
    ctx.restore();
  }

  return {
    render(state: BellowsState): void {
      snapshot = state;
      stage.ensureSized();
      draw(state);
    },
    resize(): void {
      stage.resize();
      if (snapshot) draw(snapshot);
    },
    setTheme(theme: TeachingTheme): void {
      env.setTheme(theme);
      if (snapshot) draw(snapshot);
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints): void {
      env.setMode(mode, hints);
      if (snapshot) draw(snapshot);
    },
    dispose(): void {
      snapshot = null;
      stage.release();
    }
  };
}
