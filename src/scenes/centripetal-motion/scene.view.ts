import { scaledSize } from '../../core/canvas-sizing';
import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  centripetalConstants as C,
  radialInwardUnit,
  tangentUnit,
  type CentripetalState,
  type Vec2
} from './scene.sim';

export type CreateCentripetalViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

export type Size = { w: number; h: number };

export type Box = { x: number; y: number; w: number; h: number };

export type LabelMetrics = {
  v: Size;
  fn: Size;
  o: Size;
};

export type GeomOptions = {
  metrics?: LabelMetrics;
  markerSize?: number;
};

export type MotionGeom = {
  center: Vec2;
  ball: Vec2;
  radiusPx: number;
  ballRadius: number;
  radial: Vec2;
  tangent: Vec2;
  speedLength: number;
  forceLength: number;
  speedStart: Vec2;
  speedTip: Vec2;
  forceStart: Vec2;
  forceTip: Vec2;
  speedLabel: Vec2;
  forceLabel: Vec2;
  hubLabel: Vec2;
  speedBox: Box;
  forceBox: Box;
  hubBox: Box;
  marker: { a: Vec2; corner: Vec2; b: Vec2; size: number };
  speedCapped: boolean;
  forceCapped: boolean;
  speedFloored: boolean;
  forceFloored: boolean;
};

type Palette = {
  bg: string;
  ink: string;
  muted: string;
  border: string;
  grid: string;
  red: string;
  blue: string;
  teal: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    ink: '#303744',
    muted: '#7d8997',
    border: '#d8dfe5',
    grid: '#e6e9e7',
    red: '#ef4050',
    blue: '#2d78ad',
    teal: '#159f8b'
  },
  dark: {
    bg: '#101827',
    ink: '#eef2f7',
    muted: '#a8b4c5',
    border: '#3e4d64',
    grid: '#2a394d',
    red: '#ff707c',
    blue: '#70b8ee',
    teal: '#4ed9c0'
  }
};

function add(origin: Vec2, dir: Vec2, scale = 1): Vec2 {
  return { x: origin.x + dir.x * scale, y: origin.y + dir.y * scale };
}

function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function boxFrom(center: Vec2, size: Size): Box {
  return { x: center.x, y: center.y, w: size.w, h: size.h };
}

export function boxesOverlap(a: Box, b: Box, pad = 3): boolean {
  return (
    Math.abs(a.x - b.x) * 2 < a.w + b.w + pad * 2 &&
    Math.abs(a.y - b.y) * 2 < a.h + b.h + pad * 2
  );
}

export function boxHitsCircle(
  box: Box,
  circle: Vec2,
  radius: number,
  pad = 3
): boolean {
  const nearestX = Math.min(
    box.x + box.w / 2,
    Math.max(box.x - box.w / 2, circle.x)
  );
  const nearestY = Math.min(
    box.y + box.h / 2,
    Math.max(box.y - box.h / 2, circle.y)
  );
  return dist({ x: nearestX, y: nearestY }, circle) < radius + pad;
}

export function boxInFrame(box: Box, pad = C.framePad): boolean {
  return (
    box.x - box.w / 2 >= pad &&
    box.x + box.w / 2 <= C.baseWidth - pad &&
    box.y - box.h / 2 >= pad &&
    box.y + box.h / 2 <= C.baseHeight - pad
  );
}

/** Conservative glyph boxes from design-space font sizes (center-baseline labels). */
export function metricsFromFonts(
  v: number,
  fn: number,
  o: number
): LabelMetrics {
  return {
    v: { w: v * 1.1, h: v * 1.25 },
    fn: { w: fn * 2.05, h: fn * 1.25 },
    o: { w: o * 1.15, h: o * 1.25 }
  };
}

export function labelMetricsForViewport(
  width: number,
  height: number
): LabelMetrics {
  const fit = Math.min(width / C.baseWidth, height / C.baseHeight);
  const rs = Math.max(0.3, Math.min(1.5, Math.min(width, height) / 400));
  const font = (base: number): number =>
    Math.max(10, base * rs) / Math.max(fit, 0.05);
  return metricsFromFonts(font(17), font(16), font(13));
}

export function markerSizeForViewport(
  width: number,
  height: number,
  radiusPx: number
): number {
  const fit = Math.min(width / C.baseWidth, height / C.baseHeight);
  const desired = Math.max(C.markerSize, 14 / Math.max(fit, 0.2));
  const cap = (radiusPx - C.hubRadius - 8) / Math.SQRT2;
  return Math.max(C.ballRadius + C.markerMinPeek, Math.min(desired, cap));
}

/**
 * Distance along `dir` from `origin` to the padded design frame.
 * Safety cap for the velocity arrow so it stays on the stage.
 */
export function rayToFrame(origin: Vec2, dir: Vec2, pad = C.framePad): number {
  let t = Number.POSITIVE_INFINITY;
  if (dir.x > 1e-9) t = Math.min(t, (C.baseWidth - pad - origin.x) / dir.x);
  else if (dir.x < -1e-9) t = Math.min(t, (pad - origin.x) / dir.x);
  if (dir.y > 1e-9) t = Math.min(t, (C.baseHeight - pad - origin.y) / dir.y);
  else if (dir.y < -1e-9) t = Math.min(t, (pad - origin.y) / dir.y);
  return Number.isFinite(t) ? Math.max(0, t) : 0;
}

function unit(x: number, y: number): Vec2 {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

function park(from: Vec2, dir: Vec2, size: Size, clearance: number): Vec2 {
  const need = clearance + Math.hypot(size.w, size.h) / 2 + 8;
  return add(from, dir, need);
}

function offsetGrid(
  along: Vec2,
  perp: Vec2,
  alongs: number[],
  perps: number[]
): Vec2[] {
  const out: Vec2[] = [];
  for (const a of alongs) {
    for (const p of perps) {
      out.push({ x: along.x * a + perp.x * p, y: along.y * a + perp.y * p });
    }
  }
  return out;
}

function boxClear(
  box: Box,
  ball: Vec2,
  ballRadius: number,
  center: Vec2,
  others: Box[],
  hubPad: number | null
): boolean {
  if (!boxInFrame(box)) return false;
  if (boxHitsCircle(box, ball, ballRadius, 4)) return false;
  if (hubPad !== null && boxHitsCircle(box, center, C.hubRadius, hubPad)) {
    return false;
  }
  return others.every((other) => !boxesOverlap(box, other, 4));
}

/**
 * Pick O, v and Fₙ together. Every candidate is re-checked against the
 * full obstacle set after the others are chosen — no single move is kept
 * if it collides.
 */
function pickLabelCenters(
  center: Vec2,
  ball: Vec2,
  ballRadius: number,
  radial: Vec2,
  tangent: Vec2,
  speedTip: Vec2,
  forceTip: Vec2,
  forceStart: Vec2,
  forceLength: number,
  metrics: LabelMetrics
): { hub: Vec2; speed: Vec2; force: Vec2 } {
  const outward = { x: -radial.x, y: -radial.y };
  const back = { x: -tangent.x, y: -tangent.y };
  const hubOff = C.hubRadius + metrics.o.h * 0.5 + 8;
  const oCands = [
    add(center, radial, hubOff),
    add(center, tangent, hubOff),
    add(center, back, hubOff),
    add(center, outward, hubOff + 4)
  ];
  const ballClear = ballRadius + 4;
  const vCands = [
    park(speedTip, tangent, metrics.v, 4),
    park(speedTip, outward, metrics.v, 4),
    park(ball, tangent, metrics.v, ballClear),
    park(
      ball,
      unit(tangent.x + outward.x, tangent.y + outward.y),
      metrics.v,
      ballClear
    ),
    park(ball, outward, metrics.v, ballClear),
    park(ball, back, metrics.v, ballClear),
    ...offsetGrid(
      tangent,
      outward,
      [14, 22, 30, 8, 38, -10],
      [0, 16, -16, 26, -26, 36, -36]
    ).map((d) => ({ x: speedTip.x + d.x, y: speedTip.y + d.y }))
  ];
  const mid = add(forceStart, radial, Math.max(8, forceLength * 0.45));
  const fnCands = [
    park(mid, tangent, metrics.fn, 4),
    park(mid, back, metrics.fn, 4),
    park(forceTip, tangent, metrics.fn, 4),
    park(forceTip, back, metrics.fn, 4),
    park(ball, outward, metrics.fn, ballClear),
    park(
      ball,
      unit(outward.x + tangent.x, outward.y + tangent.y),
      metrics.fn,
      ballClear
    ),
    park(
      ball,
      unit(outward.x + back.x, outward.y + back.y),
      metrics.fn,
      ballClear
    ),
    park(ball, tangent, metrics.fn, ballClear),
    park(ball, back, metrics.fn, ballClear),
    ...offsetGrid(
      tangent,
      outward,
      [16, 26, -16, -26, 36, 8],
      [0, 14, -14, 24, -24, 34, -34]
    ).map((d) => ({ x: forceTip.x + d.x, y: forceTip.y + d.y }))
  ];

  for (const hub of oCands) {
    const hubBox = boxFrom(hub, metrics.o);
    if (!boxClear(hubBox, ball, ballRadius, center, [], 1)) continue;
    for (const speed of vCands) {
      const speedBox = boxFrom(speed, metrics.v);
      if (!boxClear(speedBox, ball, ballRadius, center, [hubBox], 6)) continue;
      for (const force of fnCands) {
        const forceBox = boxFrom(force, metrics.fn);
        if (
          !boxClear(forceBox, ball, ballRadius, center, [hubBox, speedBox], 6)
        ) {
          continue;
        }
        return { hub, speed, force };
      }
    }
  }

  return {
    hub: oCands[0],
    speed: add(speedTip, tangent, 18),
    force: add(mid, tangent, 22)
  };
}

export function labelsAreSafe(geom: MotionGeom): boolean {
  const { speedBox, forceBox, hubBox, ball, ballRadius, center } = geom;
  if (!boxInFrame(speedBox) || !boxInFrame(forceBox) || !boxInFrame(hubBox)) {
    return false;
  }
  if (boxesOverlap(speedBox, forceBox, 4)) return false;
  if (boxesOverlap(speedBox, hubBox, 4)) return false;
  if (boxesOverlap(forceBox, hubBox, 4)) return false;
  if (boxHitsCircle(speedBox, ball, ballRadius, 4)) return false;
  if (boxHitsCircle(forceBox, ball, ballRadius, 4)) return false;
  if (boxHitsCircle(hubBox, ball, ballRadius, 4)) return false;
  if (boxHitsCircle(speedBox, center, C.hubRadius, 6)) return false;
  if (boxHitsCircle(forceBox, center, C.hubRadius, 6)) return false;
  if (boxHitsCircle(hubBox, center, C.hubRadius, 2)) return false;
  return true;
}

/**
 * Pixel geometry for the orbit, v / Fₙ shafts, right-angle mark, and labels.
 *
 * Teaching window (m=2, r=2.5, ω=1→2): shafts are strictly proportional,
 * so visible v doubles and Fₙ quadruples. Safety limits are only for
 * other legal extrema: Fₙ is capped before the hub; v is capped before
 * the frame; a 4 px floor applies only when Fₙ is a fraction of a newton.
 */
export function motionGeom(
  state: CentripetalState,
  options: GeomOptions = {}
): MotionGeom {
  const { angle } = state;
  const radial = radialInwardUnit(angle);
  const tangent = tangentUnit(angle);
  const radiusPx = state.params.radius * C.radiusScale;
  const center = { x: C.centerX, y: C.centerY };
  const ball = {
    x: center.x + radiusPx * Math.cos(angle),
    y: center.y + radiusPx * Math.sin(angle)
  };
  const ballRadius = C.ballRadius;
  const speedStart = add(ball, tangent, ballRadius);
  const forceStart = add(ball, radial, ballRadius);

  const proportionalSpeed = state.speed * C.speedPxPerUnit;
  const proportionalForce = state.centripetalForce * C.forcePxPerUnit;
  const speedRoom = Math.max(
    0,
    rayToFrame(speedStart, tangent) - C.speedClearance
  );
  const forceRoom = Math.max(
    0,
    radiusPx - ballRadius - C.hubRadius - C.forceClearance
  );

  const speedFloored = proportionalSpeed < C.minVisibleArrow;
  const forceFloored = proportionalForce < C.minVisibleArrow;
  let speedLength = speedFloored ? C.minVisibleArrow : proportionalSpeed;
  let forceLength = forceFloored ? C.minVisibleArrow : proportionalForce;
  const speedCapped = speedLength > speedRoom;
  const forceCapped = forceLength > forceRoom;
  if (speedCapped) speedLength = speedRoom;
  if (forceCapped) forceLength = forceRoom;

  const speedTip = add(speedStart, tangent, speedLength);
  const forceTip = add(forceStart, radial, forceLength);
  const cap = (radiusPx - C.hubRadius - 8) / Math.SQRT2;
  const size = Math.max(
    ballRadius + C.markerMinPeek,
    Math.min(options.markerSize ?? C.markerSize, cap)
  );
  const marker = {
    a: add(ball, tangent, size),
    b: add(ball, radial, size),
    corner: add(add(ball, tangent, size), radial, size),
    size
  };

  const metrics = options.metrics ?? labelMetricsForViewport(390, 294);
  const picked = pickLabelCenters(
    center,
    ball,
    ballRadius,
    radial,
    tangent,
    speedTip,
    forceTip,
    forceStart,
    forceLength,
    metrics
  );

  return {
    center,
    ball,
    radiusPx,
    ballRadius,
    radial,
    tangent,
    speedLength,
    forceLength,
    speedStart,
    speedTip,
    forceStart,
    forceTip,
    speedLabel: picked.speed,
    forceLabel: picked.force,
    hubLabel: picked.hub,
    speedBox: boxFrom(picked.speed, metrics.v),
    forceBox: boxFrom(picked.force, metrics.fn),
    hubBox: boxFrom(picked.hub, metrics.o),
    marker,
    speedCapped,
    forceCapped,
    speedFloored,
    forceFloored
  };
}

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
  head: number
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (length < 2) return;
  const ux = dx / length;
  const uy = dy / length;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2 - ux * head * 0.35, y2 - uy * head * 0.35);
  ctx.stroke();
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

function drawBackground(ctx: CanvasRenderingContext2D, p: Palette): void {
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
  ctx.strokeStyle = p.border;
  ctx.setLineDash([8, 7]);
  ctx.beginPath();
  ctx.moveTo(C.centerX, 0);
  ctx.lineTo(C.centerX, C.baseHeight);
  ctx.moveTo(0, C.centerY);
  ctx.lineTo(C.baseWidth, C.centerY);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawMotion(
  ctx: CanvasRenderingContext2D,
  state: CentripetalState,
  p: Palette,
  font: (n: number) => number,
  viewport: { width: number; height: number }
): void {
  const g = motionGeom(state, {
    metrics: metricsFromFonts(font(17), font(16), font(13)),
    markerSize: markerSizeForViewport(
      viewport.width,
      viewport.height,
      state.params.radius * C.radiusScale
    )
  });
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 7]);
  ctx.beginPath();
  ctx.arc(g.center.x, g.center.y, g.radiusPx, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(g.center.x, g.center.y);
  ctx.lineTo(g.ball.x, g.ball.y);
  ctx.stroke();

  ctx.fillStyle = p.ink;
  ctx.beginPath();
  ctx.arc(g.center.x, g.center.y, C.hubRadius, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, 'O', g.hubLabel.x, g.hubLabel.y, p.muted, font(13), 'center', 700);

  arrow(
    ctx,
    g.forceStart.x,
    g.forceStart.y,
    g.forceTip.x,
    g.forceTip.y,
    p.red,
    5,
    C.arrowHead
  );
  arrow(
    ctx,
    g.speedStart.x,
    g.speedStart.y,
    g.speedTip.x,
    g.speedTip.y,
    p.blue,
    5,
    C.arrowHead
  );

  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(g.marker.a.x, g.marker.a.y);
  ctx.lineTo(g.marker.corner.x, g.marker.corner.y);
  ctx.lineTo(g.marker.b.x, g.marker.b.y);
  ctx.stroke();

  ctx.fillStyle = p.teal;
  ctx.beginPath();
  ctx.arc(g.ball.x, g.ball.y, g.ballRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.blue;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, 'm', g.ball.x, g.ball.y, '#ffffff', font(16), 'center', 700);
  text(
    ctx,
    'v',
    g.speedLabel.x,
    g.speedLabel.y,
    p.blue,
    font(17),
    'center',
    700
  );
  text(
    ctx,
    'Fₙ',
    g.forceLabel.x,
    g.forceLabel.y,
    p.red,
    font(16),
    'center',
    700
  );
}

export function createCentripetalView(
  options: CreateCentripetalViewOptions = {}
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
  let snapshot: CentripetalState | null = null;
  function draw(state: CentripetalState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(width / C.baseWidth, height / C.baseHeight);
    const offsetX = (width - C.baseWidth * fit) / 2;
    const offsetY = (height - C.baseHeight * fit) / 2;
    const rs = stage.responsiveScale;
    const typeScale = env.fontScale() * Math.min(env.contentScale(), 1.25);
    const font = (base: number): number =>
      scaledSize(base * typeScale, Math.max(rs, 0.3), 10) / Math.max(fit, 0.05);
    const p = PALETTE[env.theme];
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fit, fit);
    drawBackground(ctx, p);
    drawMotion(ctx, state, p, font, { width, height });
    ctx.restore();
  }
  return {
    render(state: CentripetalState): void {
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
