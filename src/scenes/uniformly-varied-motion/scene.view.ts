import { scaledSize } from '../../core/canvas-sizing';
import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  stageLayoutFrom,
  stageTransform,
  uvtAreaSegments,
  uvtCarX,
  uvtConstants as C,
  uvtVelocity,
  type UvtState
} from './scene.sim';

export type CreateUvtViewOptions = {
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
  teal: string;
  blue: string;
  car: string;
  glass: string;
  future: string;
  posArea: string;
  negArea: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    rail: '#d4dae3',
    grid: '#d9dee5',
    ink: '#303744',
    muted: '#8b97a5',
    red: '#ef4050',
    teal: '#1f9b8f',
    blue: '#3c80a8',
    car: '#2a3038',
    glass: '#f3f5f8',
    future: '#c5ccd4',
    posArea: 'rgba(60,128,168,0.22)',
    negArea: 'rgba(239,64,80,0.22)'
  },
  dark: {
    bg: '#101827',
    rail: '#3c4b61',
    grid: '#435169',
    ink: '#eef2f7',
    muted: '#9eabbc',
    red: '#fb7185',
    teal: '#34d399',
    blue: '#60a5fa',
    car: '#d5dee8',
    glass: '#243044',
    future: '#64748b',
    posArea: 'rgba(96,165,250,0.22)',
    negArea: 'rgba(251,113,133,0.22)'
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
  return C.graphLeft + (C.graphRight - C.graphLeft) * (time / C.graphMaxT);
}

function graphY(velocity: number): number {
  const clipped = Math.max(-C.graphMaxV, Math.min(C.graphMaxV, velocity));
  return C.graphAxisY - (clipped / C.graphMaxV) * (C.graphAxisY - C.graphTop);
}

function drawTrack(
  ctx: CanvasRenderingContext2D,
  state: UvtState,
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
  arrow(
    ctx,
    C.trackStartX + 8,
    C.trackY,
    C.trackEndX,
    C.trackY,
    p.ink,
    1.6,
    10
  );
  text(ctx, 'x (m)', C.trackEndX, C.trackY + 22, p.ink, font(13), 'right');
  text(ctx, '0', C.trackOriginX, C.trackY + 22, p.ink, font(13), 'center');
  ctx.fillStyle = p.ink;
  ctx.beginPath();
  ctx.arc(C.trackOriginX, C.trackY, 3, 0, Math.PI * 2);
  ctx.fill();

  const x = uvtCarX(state.displacement);
  const y = C.trackY;
  const bodyW = C.carBodyWidth;
  const bodyH = C.carBodyHeight;
  ctx.fillStyle = p.car;
  rounded(ctx, x - bodyW / 2, y - bodyH, bodyW, bodyH, 6);
  ctx.fill();
  ctx.fillStyle = p.glass;
  rounded(ctx, x - 16, y - bodyH + 5, 32, 12, 4);
  ctx.fill();
  ctx.fillStyle = p.car;
  ctx.beginPath();
  ctx.arc(x - 18, y, 7, 0, Math.PI * 2);
  ctx.arc(x + 18, y, 7, 0, Math.PI * 2);
  ctx.fill();

  const vSign = Math.sign(state.velocity);
  if (vSign !== 0) {
    const vLen = Math.max(16, Math.min(72, Math.abs(state.velocity) * 3.4));
    const vY = y - bodyH - C.carVelocityOffsetY;
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
  const aSign = Math.sign(state.params.acceleration);
  if (aSign !== 0) {
    const aLen = Math.max(
      18,
      Math.min(64, Math.abs(state.params.acceleration) * 14)
    );
    const aY = y - bodyH - C.carAccelOffsetY;
    arrow(ctx, x, aY, x + aSign * aLen, aY, p.teal, 4, 11);
    text(
      ctx,
      'a',
      x + aSign * (aLen + 14),
      aY,
      p.teal,
      font(16),
      'center',
      700
    );
  }
}

function drawGraph(
  ctx: CanvasRenderingContext2D,
  state: UvtState,
  p: Palette,
  font: (n: number) => number
): void {
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let i = 0; i <= C.graphMaxT; i += 1) {
    const x = graphX(i);
    ctx.beginPath();
    ctx.moveTo(x, C.graphTop);
    ctx.lineTo(x, C.graphBottom);
    ctx.stroke();
    if (i !== 0) {
      text(ctx, `${i}`, x, C.graphAxisY + 16, p.ink, font(11), 'center');
    }
  }
  for (let i = -4; i <= 4; i += 1) {
    const v = i * 10;
    const y = graphY(v);
    ctx.beginPath();
    ctx.moveTo(C.graphLeft, y);
    ctx.lineTo(C.graphRight, y);
    ctx.stroke();
    if (v !== 0) {
      text(ctx, `${v}`, C.graphLeft - 10, y, p.ink, font(11), 'right');
    }
  }

  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(C.graphLeft, C.graphBottom);
  ctx.lineTo(C.graphLeft, C.graphTop);
  ctx.stroke();
  arrow(
    ctx,
    C.graphLeft,
    C.graphBottom,
    C.graphLeft,
    C.graphTop - 8,
    p.ink,
    1.8,
    9
  );
  ctx.beginPath();
  ctx.moveTo(C.graphLeft, C.graphAxisY);
  ctx.lineTo(C.graphRight, C.graphAxisY);
  ctx.stroke();
  arrow(
    ctx,
    C.graphLeft,
    C.graphAxisY,
    C.graphRight + 8,
    C.graphAxisY,
    p.ink,
    1.8,
    9
  );
  text(
    ctx,
    'v (m/s)',
    C.graphLeft - 8,
    C.graphTop - 16,
    p.ink,
    font(12),
    'left'
  );
  text(ctx, 't (s)', C.graphRight + 18, C.graphAxisY, p.ink, font(12), 'left');
  text(ctx, '0', C.graphLeft - 10, C.graphAxisY, p.ink, font(11), 'right');

  const v0 = state.params.v0;
  const acc = state.params.acceleration;
  const tNow = state.time;
  const vNow = state.velocity;

  if (state.params.showArea) {
    for (const segment of uvtAreaSegments(v0, acc, tNow)) {
      ctx.fillStyle = segment.sign > 0 ? p.posArea : p.negArea;
      ctx.beginPath();
      segment.points.forEach((pt, index) => {
        const x = graphX(pt.t);
        const y = graphY(pt.v);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
    }
  }

  const vEnd = uvtVelocity(v0, acc, C.graphMaxT);
  ctx.strokeStyle = p.future;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(graphX(0), graphY(v0));
  ctx.lineTo(graphX(C.graphMaxT), graphY(vEnd));
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = p.red;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(graphX(0), graphY(v0));
  ctx.lineTo(graphX(tNow), graphY(vNow));
  ctx.stroke();

  ctx.fillStyle = p.red;
  ctx.beginPath();
  ctx.arc(graphX(tNow), graphY(vNow), 6, 0, Math.PI * 2);
  ctx.fill();
}

export function createUvtView(options: CreateUvtViewOptions = {}) {
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
  let snapshot: UvtState | null = null;

  function draw(state: UvtState): void {
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
    drawTrack(ctx, state, p, font);
    drawGraph(ctx, state, p, font);
    ctx.restore();
  }

  return {
    render(state: UvtState): void {
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
