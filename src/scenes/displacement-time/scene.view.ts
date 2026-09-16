import { scaledSize } from '../../core/canvas-sizing';
import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  carX,
  displacementAt,
  displacementTimeConstants as C,
  stageLayoutFrom,
  stageTransform,
  tapeTimes,
  velocityAt,
  type DisplacementTimeState
} from './scene.sim';

export type CreateDisplacementTimeViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

type Palette = {
  bg: string;
  rail: string;
  grid: string;
  ink: string;
  muted: string;
  red: string;
  blue: string;
  teal: string;
  gold: string;
  car: string;
  glass: string;
  future: string;
  posArea: string;
  accelArea: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    rail: '#d8dee6',
    grid: '#dbe2ea',
    ink: '#303744',
    muted: '#8b97a5',
    red: '#ef4050',
    blue: '#35a9db',
    teal: '#259d91',
    gold: '#f0b429',
    car: '#2b9fd6',
    glass: '#bfeaf8',
    future: '#c5ccd4',
    posArea: 'rgba(53,169,219,0.22)',
    accelArea: 'rgba(239,64,80,0.22)'
  },
  dark: {
    bg: '#101827',
    rail: '#3c4b61',
    grid: '#40516b',
    ink: '#eef2f7',
    muted: '#9eabbc',
    red: '#fb7185',
    blue: '#38bdf8',
    teal: '#4dd4c0',
    gold: '#fbbf24',
    car: '#38bdf8',
    glass: '#1e3a4c',
    future: '#64748b',
    posArea: 'rgba(56,189,248,0.22)',
    accelArea: 'rgba(251,113,133,0.22)'
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
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
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
  head = 11
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 2) return;
  const ux = dx / len;
  const uy = dy / len;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
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

function graphX(time: number): number {
  return C.graphLeft + (C.graphRight - C.graphLeft) * (time / C.maxTime);
}

function velocityY(velocity: number): number {
  const clipped = Math.max(
    -C.velocityNegMax,
    Math.min(C.velocityPosMax, velocity)
  );
  if (clipped >= 0) {
    return (
      C.velocityAxisY -
      (clipped / C.velocityPosMax) * (C.velocityAxisY - C.velocityTop)
    );
  }
  return (
    C.velocityAxisY +
    (Math.abs(clipped) / C.velocityNegMax) *
      (C.velocityBottom - C.velocityAxisY)
  );
}

function displacementY(displacement: number): number {
  const clipped = Math.max(
    -C.displacementNegMax,
    Math.min(C.displacementPosMax, displacement)
  );
  if (clipped >= 0) {
    return (
      C.displacementAxisY -
      (clipped / C.displacementPosMax) *
        (C.displacementAxisY - C.displacementTop)
    );
  }
  return (
    C.displacementAxisY +
    (Math.abs(clipped) / C.displacementNegMax) *
      (C.displacementBottom - C.displacementAxisY)
  );
}

function drawTrack(
  ctx: CanvasRenderingContext2D,
  state: DisplacementTimeState,
  p: Palette,
  font: (n: number) => number
): void {
  ctx.strokeStyle = p.rail;
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(C.trackStartX, C.trackY);
  ctx.lineTo(C.trackEndX, C.trackY);
  ctx.stroke();

  const { v0, acceleration } = state.params;
  for (const mark of tapeTimes(state.time)) {
    const x = carX(displacementAt(v0, acceleration, mark));
    ctx.fillStyle = p.muted;
    ctx.beginPath();
    ctx.arc(x, C.trackY, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }

  arrow(
    ctx,
    C.trackStartX + 8,
    C.trackY + 28,
    C.trackEndX,
    C.trackY + 28,
    p.ink,
    1.6,
    10
  );
  text(
    ctx,
    'x',
    C.trackEndX + 16,
    C.trackY + 28,
    p.ink,
    font(15),
    'center',
    700
  );
  text(ctx, '0', C.trackOriginX, C.trackY + 44, p.ink, font(12), 'center');
  text(
    ctx,
    '−50m',
    C.trackOriginX - 50 * C.trackScale,
    C.trackY + 44,
    p.muted,
    font(12),
    'center'
  );
  text(
    ctx,
    '50m',
    C.trackOriginX + 50 * C.trackScale,
    C.trackY + 44,
    p.muted,
    font(12),
    'center'
  );
  ctx.fillStyle = p.ink;
  ctx.beginPath();
  ctx.arc(C.trackOriginX, C.trackY + 28, 2.4, 0, Math.PI * 2);
  ctx.fill();

  const x = carX(state.displacement);
  const y = C.trackY;
  const bodyW = C.carWidth;
  const bodyH = C.carHeight;
  ctx.fillStyle = p.car;
  rounded(ctx, x - bodyW / 2, y - bodyH, bodyW, bodyH, 6);
  ctx.fill();
  ctx.fillStyle = p.glass;
  rounded(ctx, x - 16, y - bodyH - 10, 32, 12, 4);
  ctx.fill();
  ctx.fillStyle = p.ink;
  ctx.beginPath();
  ctx.arc(x - 16, y + 2, 7, 0, Math.PI * 2);
  ctx.arc(x + 16, y + 2, 7, 0, Math.PI * 2);
  ctx.fill();

  const vSign = Math.sign(state.velocity);
  if (vSign !== 0) {
    const vLen = Math.max(16, Math.min(72, Math.abs(state.velocity) * 3.1));
    const vY = y - bodyH - 16;
    const vStart = x + vSign * (bodyW / 2);
    arrow(ctx, vStart, vY, vStart + vSign * vLen, vY, p.red, 4, 11);
    text(
      ctx,
      'v',
      vStart + vSign * (vLen + 14),
      vY,
      p.red,
      font(16),
      'center',
      700
    );
  }
}

function drawAxes(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  font: (n: number) => number
): void {
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let i = 1; i <= C.maxTime; i += 1) {
    const x = graphX(i);
    ctx.beginPath();
    ctx.moveTo(x, C.velocityTop);
    ctx.lineTo(x, C.velocityBottom);
    ctx.moveTo(x, C.displacementTop);
    ctx.lineTo(x, C.displacementBottom);
    ctx.stroke();
    text(ctx, `${i}`, x, C.velocityBottom + 14, p.muted, font(11), 'center');
  }
  for (const v of [-20, 20, 40]) {
    const y = velocityY(v);
    ctx.beginPath();
    ctx.moveTo(C.graphLeft, y);
    ctx.lineTo(C.graphRight, y);
    ctx.stroke();
    text(ctx, `${v}`, C.graphLeft - 10, y, p.muted, font(11), 'right');
  }
  for (const xVal of [-40, 40, 80, 120]) {
    const y = displacementY(xVal);
    ctx.beginPath();
    ctx.moveTo(C.graphLeft, y);
    ctx.lineTo(C.graphRight, y);
    ctx.stroke();
    text(ctx, `${xVal}`, C.graphLeft - 10, y, p.muted, font(11), 'right');
  }

  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  arrow(
    ctx,
    C.graphLeft,
    C.velocityBottom,
    C.graphLeft,
    C.velocityTop - 8,
    p.ink,
    1.8,
    9
  );
  arrow(
    ctx,
    C.graphLeft,
    C.velocityAxisY,
    C.graphRight + 8,
    C.velocityAxisY,
    p.ink,
    1.8,
    9
  );
  arrow(
    ctx,
    C.graphLeft,
    C.displacementBottom,
    C.graphLeft,
    C.displacementTop - 8,
    p.ink,
    1.8,
    9
  );
  arrow(
    ctx,
    C.graphLeft,
    C.displacementAxisY,
    C.graphRight + 8,
    C.displacementAxisY,
    p.ink,
    1.8,
    9
  );
  text(
    ctx,
    'v',
    C.graphLeft - 16,
    C.velocityTop - 6,
    p.ink,
    font(15),
    'center',
    700
  );
  text(
    ctx,
    'x',
    C.graphLeft - 16,
    C.displacementTop - 6,
    p.ink,
    font(15),
    'center',
    700
  );
  text(
    ctx,
    't',
    C.graphRight + 18,
    C.velocityAxisY,
    p.ink,
    font(14),
    'left',
    700
  );
  text(
    ctx,
    't',
    C.graphRight + 18,
    C.displacementAxisY,
    p.ink,
    font(14),
    'left',
    700
  );
  text(ctx, '0', C.graphLeft - 10, C.velocityAxisY, p.muted, font(11), 'right');
  text(
    ctx,
    '0',
    C.graphLeft - 10,
    C.displacementAxisY,
    p.muted,
    font(11),
    'right'
  );
}

function drawArea(
  ctx: CanvasRenderingContext2D,
  state: DisplacementTimeState,
  p: Palette,
  font: (n: number) => number
): void {
  const tNow = state.time;
  if (!state.params.showArea || tNow <= 1e-3) return;
  const v0 = state.params.v0;
  const vNow = state.velocity;
  const x0 = graphX(0);
  const xt = graphX(tNow);
  const axisY = C.velocityAxisY;
  const yV0 = velocityY(v0);
  const yNow = velocityY(vNow);
  const width = xt - x0;
  if (width < 2) return;

  ctx.fillStyle = p.posArea;
  ctx.fillRect(x0, Math.min(axisY, yV0), width, Math.abs(yV0 - axisY));

  if (Math.abs(vNow - v0) > 1e-6) {
    ctx.fillStyle = p.accelArea;
    ctx.beginPath();
    ctx.moveTo(x0, yV0);
    ctx.lineTo(xt, yNow);
    ctx.lineTo(xt, yV0);
    ctx.closePath();
    ctx.fill();
  }

  ctx.strokeStyle = p.blue;
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(x0, yV0);
  ctx.lineTo(xt, yV0);
  ctx.stroke();
  ctx.setLineDash([]);

  if (Math.abs(yV0 - axisY) > 12 && width > 36) {
    text(
      ctx,
      'v₀t',
      (x0 + xt) / 2,
      (axisY + yV0) / 2,
      p.blue,
      font(13),
      'center',
      700
    );
  }
  if (Math.abs(yNow - yV0) > 12 && width > 48) {
    text(
      ctx,
      '½at²',
      (x0 + xt) / 2 + 18,
      (yV0 + yNow) / 2,
      p.red,
      font(13),
      'center',
      700
    );
  }
}

function drawGraphs(
  ctx: CanvasRenderingContext2D,
  state: DisplacementTimeState,
  p: Palette,
  font: (n: number) => number
): void {
  drawAxes(ctx, p, font);
  drawArea(ctx, state, p, font);

  const { v0, acceleration } = state.params;
  const tNow = state.time;
  const vNow = state.velocity;
  const vEnd = velocityAt(v0, acceleration, C.maxTime);

  ctx.strokeStyle = p.future;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(graphX(tNow), velocityY(vNow));
  ctx.lineTo(graphX(C.maxTime), velocityY(vEnd));
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(graphX(tNow), displacementY(state.displacement));
  for (let i = 0; i <= C.curveSamples; i += 1) {
    const t = C.maxTime * (i / C.curveSamples);
    if (t <= tNow) continue;
    ctx.lineTo(graphX(t), displacementY(displacementAt(v0, acceleration, t)));
  }
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = p.red;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(graphX(0), velocityY(v0));
  ctx.lineTo(graphX(tNow), velocityY(vNow));
  ctx.stroke();

  ctx.strokeStyle = p.teal;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  const steps = Math.max(2, Math.round((tNow / C.maxTime) * C.curveSamples));
  for (let i = 0; i <= steps; i += 1) {
    const t = tNow * (i / steps);
    const x = graphX(t);
    const y = displacementY(displacementAt(v0, acceleration, t));
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  const cursorX = graphX(tNow);
  ctx.strokeStyle = p.gold;
  ctx.lineWidth = C.cursorWidth;
  ctx.setLineDash([7, 6]);
  ctx.beginPath();
  ctx.moveTo(cursorX, C.velocityTop - 18);
  ctx.lineTo(cursorX, C.displacementBottom + 10);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = p.bg;
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cursorX, velocityY(vNow), 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = p.teal;
  ctx.beginPath();
  ctx.arc(cursorX, displacementY(state.displacement), 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

export function createDisplacementTimeView(
  options: CreateDisplacementTimeViewOptions = {}
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
  let snapshot: DisplacementTimeState | null = null;
  let redrawFrame: number | null = null;
  let watched = false;
  const observers: Array<{ disconnect(): void }> = [];

  function draw(state: DisplacementTimeState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const layout = stageLayoutFrom(stage.canvas);
    const { fit, offsetX, offsetY, scaleX } = stageTransform(
      width,
      height,
      layout
    );
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
    ctx.scale(fit * scaleX, fit);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, C.baseWidth, C.baseHeight);
    drawTrack(ctx, state, p, font);
    drawGraphs(ctx, state, p, font);
    ctx.restore();
    watchOverlay();
  }

  function scheduleRedraw(): void {
    if (!snapshot) return;
    if (typeof requestAnimationFrame !== 'function') {
      draw(snapshot);
      return;
    }
    if (redrawFrame !== null) return;
    redrawFrame = requestAnimationFrame(() => {
      redrawFrame = null;
      if (snapshot) draw(snapshot);
    });
  }

  function watchOverlay(): void {
    if (watched || !stage.canvas) return;
    const parent = stage.canvas.parentElement;
    if (!parent) return;
    watched = true;
    if (typeof ResizeObserver !== 'undefined') {
      const resize = new ResizeObserver(() => scheduleRedraw());
      resize.observe(parent);
      const panel = parent.querySelector(
        '.teaching-readout-panel, .srgb-readout-panel, .readout-panel'
      );
      if (panel instanceof HTMLElement) resize.observe(panel);
      observers.push(resize);
    }
    if (typeof MutationObserver !== 'undefined') {
      const mutate = new MutationObserver(() => scheduleRedraw());
      mutate.observe(parent, {
        attributes: true,
        subtree: true,
        attributeFilter: ['class', 'style']
      });
      observers.push(mutate);
    }
  }

  return {
    render(state: DisplacementTimeState): void {
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
      if (redrawFrame !== null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(redrawFrame);
        redrawFrame = null;
      }
      observers.forEach((observer) => observer.disconnect());
      observers.length = 0;
      watched = false;
      stage.release();
    }
  };
}
