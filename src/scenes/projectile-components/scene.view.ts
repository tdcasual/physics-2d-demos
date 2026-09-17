import { scaledSize } from '../../core/canvas-sizing';
import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  projectileComponentsConstants as C,
  projectileRange,
  type ProjectileComponentsPoint,
  type ProjectileComponentsState
} from './scene.sim';

export type CreateProjectileComponentsViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

export type PlotLayout = {
  width: number;
  height: number;
  originX: number;
  originY: number;
  groundY: number;
  scale: number;
  xMax: number;
  yExtent: number;
  rs: number;
};

type Palette = {
  bg: string;
  ink: string;
  muted: string;
  grid: string;
  blue: string;
  red: string;
  teal: string;
  gold: string;
  hatch: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    ink: '#303744',
    muted: '#7c8796',
    grid: '#d7dfe7',
    blue: '#4b6ff2',
    red: '#ef4050',
    teal: '#249c8f',
    gold: '#ee950f',
    hatch: '#9aa3ad'
  },
  dark: {
    bg: '#101827',
    ink: '#eef2f7',
    muted: '#aab6c8',
    grid: '#2d3e57',
    blue: '#6d8bff',
    red: '#fb7185',
    teal: '#34d399',
    gold: '#fbbf24',
    hatch: '#6b7a8d'
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
  const head = Math.min(12, length * 0.28);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.setLineDash(dashed ? [6, 5] : []);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2 - ux * head * 0.35, y2 - uy * head * 0.35);
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

export function plotLayout(
  state: ProjectileComponentsState,
  width: number,
  height: number,
  responsiveScale = 1
): PlotLayout {
  const rs = Math.max(0.3, Math.min(1.5, responsiveScale));
  const padL = scaledSize(C.padLeft, rs, 28);
  const padR = scaledSize(C.padRight, rs, 20);
  const padT = scaledSize(C.padTop, rs, 16);
  const padB = scaledSize(C.padBottom, rs, 22);
  const range = projectileRange(state.params);
  const xMax = Math.max(range * 1.08 + 8, C.minXDomain);
  const extraBelow = Math.max(state.params.initialHeight, 45);
  const yExtent = state.params.initialHeight + extraBelow;
  const innerW = Math.max(40, width - padL - padR);
  const innerH = Math.max(40, height - padT - padB);
  const scale = Math.min(innerW / xMax, innerH / yExtent);
  const originX = padL;
  const originY = padT;
  return {
    width,
    height,
    originX,
    originY,
    groundY: originY + state.params.initialHeight * scale,
    scale,
    xMax,
    yExtent,
    rs
  };
}

export function worldToScreen(
  layout: PlotLayout,
  xMeters: number,
  yDownMeters: number
): { x: number; y: number } {
  return {
    x: layout.originX + xMeters * layout.scale,
    y: layout.originY + yDownMeters * layout.scale
  };
}

function pointScreen(
  layout: PlotLayout,
  point: Pick<ProjectileComponentsPoint, 'x' | 'verticalDisplacement'>
): { x: number; y: number } {
  return worldToScreen(layout, point.x, point.verticalDisplacement);
}

function fontSize(layout: PlotLayout, base: number, min = 9): number {
  return scaledSize(base, layout.rs, min);
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  layout: PlotLayout,
  p: Palette
): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, layout.width, layout.height);
  ctx.strokeStyle = `${p.grid}55`;
  ctx.lineWidth = 1;
  const step = C.gridMeters * layout.scale;
  if (step < 6) return;
  const xEnd = layout.originX + layout.xMax * layout.scale;
  const yEnd = layout.originY + layout.yExtent * layout.scale;
  for (
    let x = layout.originX;
    x <= xEnd + 0.5 && x < layout.width - 4;
    x += step
  ) {
    ctx.beginPath();
    ctx.moveTo(x, layout.originY);
    ctx.lineTo(x, Math.min(yEnd, layout.height - 4));
    ctx.stroke();
  }
  for (
    let y = layout.originY;
    y <= yEnd + 0.5 && y < layout.height - 4;
    y += step
  ) {
    ctx.beginPath();
    ctx.moveTo(layout.originX, y);
    ctx.lineTo(Math.min(xEnd, layout.width - 4), y);
    ctx.stroke();
  }
}

function drawAxes(
  ctx: CanvasRenderingContext2D,
  layout: PlotLayout,
  p: Palette
): void {
  const xEnd = Math.min(
    layout.originX + layout.xMax * layout.scale,
    layout.width - 10
  );
  const yEnd = Math.min(
    layout.originY + layout.yExtent * layout.scale,
    layout.height - 8
  );
  const tick = fontSize(layout, 12, 9);
  arrow(ctx, layout.originX, layout.originY, xEnd, layout.originY, p.ink, 2.4);
  arrow(ctx, layout.originX, layout.originY, layout.originX, yEnd, p.ink, 2.4);
  text(ctx, 'x', xEnd + 10, layout.originY - 12, p.ink, tick, 'center', 700);
  text(ctx, 'y', layout.originX - 14, yEnd + 2, p.ink, tick, 'center', 700);
  text(
    ctx,
    '0',
    layout.originX - 12,
    layout.originY - 12,
    p.muted,
    tick,
    'center'
  );
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(layout.originX, layout.groundY);
  ctx.lineTo(Math.min(xEnd, layout.width - 12), layout.groundY);
  ctx.stroke();
  const hatch = scaledSize(7, layout.rs, 5);
  ctx.strokeStyle = p.hatch;
  ctx.lineWidth = 1.4;
  for (
    let x = layout.originX + 8;
    x < Math.min(xEnd, layout.width - 16);
    x += 9
  ) {
    ctx.beginPath();
    ctx.moveTo(x, layout.groundY);
    ctx.lineTo(x - 5, layout.groundY + hatch);
    ctx.stroke();
  }
  const label = fontSize(layout, 11, 8);
  const stepPx = C.gridMeters * layout.scale;
  if (stepPx >= 18) {
    for (
      let meters = C.gridMeters;
      meters < layout.xMax - 2;
      meters += C.gridMeters
    ) {
      const x = layout.originX + meters * layout.scale;
      if (x > xEnd - 18) break;
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x, layout.originY - 4);
      ctx.lineTo(x, layout.originY + 4);
      ctx.stroke();
      text(
        ctx,
        String(meters),
        x,
        layout.originY - 12,
        p.muted,
        label,
        'center'
      );
    }
    for (
      let meters = C.gridMeters;
      meters < layout.yExtent - 2;
      meters += C.gridMeters
    ) {
      const y = layout.originY + meters * layout.scale;
      if (y > yEnd - 10) break;
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(layout.originX - 4, y);
      ctx.lineTo(layout.originX + 4, y);
      ctx.stroke();
      text(
        ctx,
        String(meters),
        layout.originX - 10,
        y,
        p.muted,
        label,
        'right'
      );
    }
  }
}

function drawTrajectory(
  ctx: CanvasRenderingContext2D,
  state: ProjectileComponentsState,
  layout: PlotLayout,
  p: Palette
): void {
  if (!state.params.showTrajectory) return;
  ctx.strokeStyle = p.teal;
  ctx.lineWidth = scaledSize(4, layout.rs, 2.4);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let index = 0; index <= C.trajectorySamples; index += 1) {
    const t = (state.flightTime * index) / C.trajectorySamples;
    const pos = worldToScreen(
      layout,
      state.params.speed * t,
      0.5 * state.params.gravity * t * t
    );
    if (index === 0) ctx.moveTo(pos.x, pos.y);
    else ctx.lineTo(pos.x, pos.y);
  }
  ctx.stroke();
}

function drawCorrespondence(
  ctx: CanvasRenderingContext2D,
  layout: PlotLayout,
  pos: { x: number; y: number },
  p: Palette,
  strong: boolean
): void {
  ctx.setLineDash([2, 4]);
  ctx.lineWidth = strong ? 1.4 : 1;
  ctx.strokeStyle = p.blue;
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
  ctx.lineTo(pos.x, layout.originY);
  ctx.stroke();
  ctx.strokeStyle = p.red;
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
  ctx.lineTo(layout.originX, pos.y);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawBall(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha = 1
): void {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawStrobe(
  ctx: CanvasRenderingContext2D,
  state: ProjectileComponentsState,
  layout: PlotLayout,
  p: Palette
): void {
  const r = scaledSize(C.pointRadius, layout.rs, 4);
  const sr = scaledSize(C.shadowRadius, layout.rs, 3.5);
  const label = fontSize(layout, 11, 8);
  state.points.forEach((point) => {
    const pos = pointScreen(layout, point);
    const isNow = Math.abs(point.time - state.time) < 0.04;
    if (state.params.showStrobe || isNow) {
      drawCorrespondence(ctx, layout, pos, p, isNow);
    }
    if (state.params.showShadows) {
      drawBall(ctx, pos.x, layout.originY, sr, p.blue, isNow ? 0.95 : 0.35);
      drawBall(ctx, layout.originX, pos.y, sr, p.red, isNow ? 0.95 : 0.35);
    }
    if (state.params.showStrobe) {
      ctx.strokeStyle = p.gold;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      drawBall(ctx, pos.x, pos.y, r, p.gold, isNow ? 1 : 0.82);
      const ly = pos.y < layout.originY + 16 ? pos.y + 14 : pos.y - 14;
      text(
        ctx,
        `${point.time.toFixed(1)}s`,
        pos.x + 8,
        ly,
        p.gold,
        label,
        'left',
        700
      );
    }
  });
}

export type VectorMarks = {
  origin: { x: number; y: number };
  vxTip: { x: number; y: number };
  vyTip: { x: number; y: number };
  vTip: { x: number; y: number };
  vxLabel: { x: number; y: number };
  vyLabel: { x: number; y: number };
  vLabel: { x: number; y: number };
};

function clampCoord(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function vectorMarks(
  state: ProjectileComponentsState,
  layout: PlotLayout
): VectorMarks | null {
  if (!state.params.showVectors) return null;
  const pos = worldToScreen(layout, state.x, state.verticalDisplacement);
  const fs = fontSize(layout, 13, 9);
  const edge = 8;
  const labelRoom = fs * 1.8;
  const roomX = Math.max(16, layout.width - pos.x - edge - labelRoom);
  const roomY = Math.max(16, layout.height - pos.y - edge - labelRoom);
  const k = Math.min(
    state.vx > 1e-6 ? roomX / state.vx : 1e9,
    state.vy > 1e-6 ? roomY / state.vy : 1e9,
    scaledSize(5.2, layout.rs, 3.2)
  );
  const hx = Math.max(12, state.vx * k);
  const hy = Math.max(12, state.vy * k);
  let vxLabel = { x: pos.x + hx + 8, y: pos.y - 10 };
  let vyLabel = { x: pos.x - 8, y: pos.y + hy + 12 };
  let vLabel = { x: pos.x + hx + 10, y: pos.y + hy + 4 };
  if (vxLabel.x > layout.width - edge) {
    vxLabel = { x: pos.x + hx * 0.55, y: pos.y - fs - 4 };
  }
  if (vyLabel.y > layout.height - edge) {
    vyLabel = { x: pos.x - fs * 1.4, y: pos.y + hy * 0.55 };
  }
  if (vLabel.x > layout.width - edge || vLabel.y > layout.height - edge) {
    vLabel = { x: pos.x + hx * 0.55, y: pos.y + hy * 0.55 };
  }
  const fit = (point: { x: number; y: number }) => ({
    x: clampCoord(point.x, edge, layout.width - edge),
    y: clampCoord(point.y, edge, layout.height - edge)
  });
  return {
    origin: pos,
    vxTip: { x: pos.x + hx, y: pos.y },
    vyTip: { x: pos.x, y: pos.y + hy },
    vTip: { x: pos.x + hx, y: pos.y + hy },
    vxLabel: fit(vxLabel),
    vyLabel: fit(vyLabel),
    vLabel: fit(vLabel)
  };
}

function drawVectors(
  ctx: CanvasRenderingContext2D,
  state: ProjectileComponentsState,
  layout: PlotLayout,
  p: Palette
): void {
  const marks = vectorMarks(state, layout);
  if (!marks) return;
  const { origin: pos, vxTip, vyTip, vTip, vxLabel, vyLabel, vLabel } = marks;
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 1.3;
  ctx.strokeRect(
    Math.min(pos.x, vxTip.x),
    Math.min(pos.y, vyTip.y),
    Math.abs(vxTip.x - pos.x),
    Math.abs(vyTip.y - pos.y)
  );
  ctx.setLineDash([]);
  arrow(ctx, pos.x, pos.y, vxTip.x, vxTip.y, p.blue, 3.4);
  arrow(ctx, pos.x, pos.y, vyTip.x, vyTip.y, p.red, 3.4);
  arrow(ctx, pos.x, pos.y, vTip.x, vTip.y, p.teal, 3.6);
  const fs = fontSize(layout, 13, 9);
  text(ctx, 'vₓ', vxLabel.x, vxLabel.y, p.blue, fs, 'left', 700);
  text(ctx, 'vᵧ', vyLabel.x, vyLabel.y, p.red, fs, 'right', 700);
  text(ctx, 'v', vLabel.x, vLabel.y, p.teal, fs, 'left', 700);
}

function drawCurrent(
  ctx: CanvasRenderingContext2D,
  state: ProjectileComponentsState,
  layout: PlotLayout,
  p: Palette
): void {
  const pos = worldToScreen(layout, state.x, state.verticalDisplacement);
  const radius = scaledSize(C.currentRadius, layout.rs, 7);
  if (state.params.showShadows) {
    drawBall(
      ctx,
      pos.x,
      layout.originY,
      scaledSize(C.shadowRadius, layout.rs, 4),
      p.blue,
      1
    );
    drawBall(
      ctx,
      layout.originX,
      pos.y,
      scaledSize(C.shadowRadius, layout.rs, 4),
      p.red,
      1
    );
  }
  drawCorrespondence(ctx, layout, pos, p, true);
  ctx.fillStyle = p.gold;
  ctx.strokeStyle = p.gold;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

export function createProjectileComponentsView(
  options: CreateProjectileComponentsViewOptions = {}
) {
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: { mode: 'clamped', fallbackWidth: 800, fallbackHeight: 600 },
    eagerContext: true
  });
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  let snapshot: ProjectileComponentsState | null = null;

  function draw(state: ProjectileComponentsState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(width / C.baseWidth, height / C.baseHeight);
    const offsetX = (width - C.baseWidth * fit) / 2;
    const offsetY = (height - C.baseHeight * fit) / 2;
    const layout = plotLayout(
      state,
      C.fieldWidth,
      C.baseHeight,
      stage.responsiveScale
    );
    const p = PALETTE[env.theme];
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fit, fit);
    drawGrid(ctx, layout, p);
    drawAxes(ctx, layout, p);
    drawTrajectory(ctx, state, layout, p);
    drawStrobe(ctx, state, layout, p);
    drawVectors(ctx, state, layout, p);
    drawCurrent(ctx, state, layout, p);
    ctx.restore();
  }

  return {
    render(state: ProjectileComponentsState): void {
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
