import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { precisionToolConstants, type PrecisionToolState } from './scene.sim';

export type CreatePrecisionToolViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

type Palette = {
  bg: string;
  soft: string;
  ink: string;
  muted: string;
  border: string;
  metal: string;
  metalHi: string;
  metalEdge: string;
  tick: string;
  accent: string;
  blue: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#f7f8fa',
    soft: '#edf1f4',
    ink: '#2c3544',
    muted: '#7a8694',
    border: '#d5dde4',
    metal: '#dce3e8',
    metalHi: '#f4f7f9',
    metalEdge: '#7c8996',
    tick: '#3a4552',
    accent: '#e23b4a',
    blue: '#2b9ccf'
  },
  dark: {
    bg: '#101827',
    soft: '#1c2a3d',
    ink: '#eef2f7',
    muted: '#a8b4c5',
    border: '#3d4d63',
    metal: '#8ea0b4',
    metalHi: '#c5d2e0',
    metalEdge: '#d4dce5',
    tick: '#eef2f7',
    accent: '#ffb84d',
    blue: '#5ed0f5'
  }
};

function label(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  color: string,
  size: number,
  align: CanvasTextAlign = 'left',
  weight = 650
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
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function')
    ctx.roundRect(x, y, width, height, radius);
  else ctx.rect(x, y, width, height);
}

function metalFill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  p: Palette,
  vertical = false
): void {
  const g = vertical
    ? ctx.createLinearGradient(x, y, x + w, y)
    : ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, p.metalHi);
  g.addColorStop(0.45, p.metal);
  g.addColorStop(1, p.metalEdge);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

function layout(width: number, height: number, scale: number) {
  const pad = 16 * scale;
  const zoomH = Math.max(height * 0.34, 88 * scale);
  const zoomY = height - pad - zoomH;
  const top = pad;
  const instrumentH = Math.max(72 * scale, zoomY - top - 14 * scale);
  return {
    pad,
    top,
    instrumentH,
    zoomX: pad,
    zoomY,
    zoomW: width - pad * 2,
    zoomH,
    left: pad,
    right: width - pad,
    width,
    height,
    scale
  };
}

function drawZoomFrame(
  ctx: CanvasRenderingContext2D,
  box: ReturnType<typeof layout>,
  p: Palette,
  title: string
): void {
  rounded(ctx, box.zoomX, box.zoomY, box.zoomW, box.zoomH, 10 * box.scale);
  ctx.fillStyle = p.soft;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = Math.max(1, 1.4 * box.scale);
  ctx.stroke();
  label(
    ctx,
    title,
    box.zoomX + 12 * box.scale,
    box.zoomY + 16 * box.scale,
    p.accent,
    13 * box.scale,
    'left',
    700
  );
}

function drawCaliper(
  ctx: CanvasRenderingContext2D,
  state: PrecisionToolState,
  p: Palette,
  box: ReturnType<typeof layout>
): void {
  const s = box.scale;
  const span = precisionToolConstants.scaleSpanMm;
  const beamY = box.top + box.instrumentH * 0.42;
  const beamH = 28 * s;
  const beamX = box.left + 36 * s;
  const beamW = box.right - beamX - 8 * s;
  const pxPerMm = beamW / span;
  const zeroX = beamX;
  const jawGap = state.totalReading * pxPerMm;
  const slideX = zeroX + jawGap;

  ctx.fillStyle = p.metal;
  ctx.beginPath();
  ctx.moveTo(box.left + 8 * s, beamY - 18 * s);
  ctx.lineTo(box.left + 48 * s, box.top + 8 * s);
  ctx.lineTo(box.left + 48 * s + 30 * s, box.top + 8 * s);
  ctx.lineTo(box.left + 48 * s + 10 * s, beamY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = p.metalEdge;
  ctx.stroke();

  metalFill(ctx, beamX, beamY, beamW, beamH, p);
  ctx.strokeStyle = p.metalEdge;
  ctx.strokeRect(beamX, beamY, beamW, beamH);

  ctx.strokeStyle = p.tick;
  for (let mm = 0; mm <= span; mm += 1) {
    const x = zeroX + mm * pxPerMm;
    const major = mm % 5 === 0;
    const th = major ? 16 * s : 9 * s;
    ctx.lineWidth = major ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x, beamY + beamH);
    ctx.lineTo(x, beamY + beamH - th);
    ctx.stroke();
    if (major)
      label(ctx, String(mm), x, beamY - 10 * s, p.ink, 12 * s, 'center', 700);
  }

  const slideW = Math.max(72 * s, state.vernierLength * pxPerMm + 18 * s);
  metalFill(ctx, slideX, beamY - 6 * s, slideW, beamH + 22 * s, p);
  ctx.strokeStyle = p.metalEdge;
  ctx.strokeRect(slideX, beamY - 6 * s, slideW, beamH + 22 * s);

  const vernierPitch = (state.vernierLength / state.divisions) * pxPerMm;
  ctx.strokeStyle = p.tick;
  for (let i = 0; i <= state.divisions; i += 1) {
    const x = slideX + 8 * s + i * vernierPitch;
    const major = i % 5 === 0 || i === state.divisions;
    ctx.lineWidth = i === state.alignmentIndex ? 2.4 : 1;
    ctx.beginPath();
    ctx.moveTo(x, beamY + beamH + 16 * s);
    ctx.lineTo(x, beamY + beamH + 16 * s - (major ? 14 * s : 9 * s));
    ctx.stroke();
    if (major)
      label(
        ctx,
        String(i),
        x,
        beamY + beamH + 24 * s,
        i === state.alignmentIndex ? p.accent : p.muted,
        10 * s,
        'center',
        650
      );
  }

  ctx.fillStyle = p.metalEdge;
  ctx.fillRect(zeroX - 8 * s, beamY - 38 * s, 10 * s, 38 * s);
  ctx.fillRect(slideX - 4 * s, beamY - 38 * s, 10 * s, 38 * s);
  ctx.strokeStyle = p.metalEdge;
  ctx.lineWidth = 4 * s;
  ctx.beginPath();
  ctx.moveTo(zeroX - 3 * s, beamY - 38 * s);
  ctx.lineTo(zeroX - 3 * s, box.top + 10 * s);
  ctx.lineTo(zeroX + 14 * s, box.top + 4 * s);
  ctx.moveTo(slideX + 1 * s, beamY - 38 * s);
  ctx.lineTo(slideX + 1 * s, box.top + 10 * s);
  ctx.lineTo(slideX - 16 * s, box.top + 4 * s);
  ctx.stroke();

  if (state.params.showGuides) {
    ctx.strokeStyle = p.accent;
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(slideX + 8 * s, beamY - 8 * s);
    ctx.lineTo(slideX + 8 * s, beamY + beamH + 18 * s);
    ctx.stroke();
  }

  label(ctx, '主尺', beamX + 6 * s, beamY + beamH + 36 * s, p.muted, 12 * s);
  label(
    ctx,
    '游标',
    slideX + slideW * 0.5,
    beamY + beamH + 36 * s,
    p.accent,
    12 * s,
    'center',
    700
  );

  drawZoomFrame(ctx, box, p, '放大观察区');
  const midY = box.zoomY + box.zoomH * 0.58;
  const center = box.zoomX + box.zoomW * 0.42;
  const spacing = Math.min(28 * s, box.zoomW / 16);
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(box.zoomX + 14 * s, midY);
  ctx.lineTo(box.zoomX + box.zoomW - 14 * s, midY);
  ctx.stroke();
  const alignShift = (state.alignmentIndex % 5) * 0.12 * spacing;
  for (let k = -6; k <= 8; k += 1) {
    const xMain = center + k * spacing;
    const h = k === 0 ? 36 * s : 22 * s;
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = k === 0 ? 3 : 1.6;
    ctx.beginPath();
    ctx.moveTo(xMain, midY - h);
    ctx.lineTo(xMain, midY);
    ctx.stroke();
    const xV = center + k * spacing * (1 - state.precision) + alignShift;
    ctx.strokeStyle = k === 0 ? p.accent : p.tick;
    ctx.lineWidth = k === 0 ? 3 : 1.4;
    ctx.beginPath();
    ctx.moveTo(xV, midY);
    ctx.lineTo(xV, midY + h * 0.9);
    ctx.stroke();
  }
  if (state.params.showGuides) {
    ctx.strokeStyle = p.accent;
    ctx.setLineDash([5 * s, 5 * s]);
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(center, box.zoomY + 28 * s);
    ctx.lineTo(center, box.zoomY + box.zoomH - 10 * s);
    ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, '对齐', center + 10 * s, box.zoomY + 32 * s, p.accent, 12 * s);
  }
}

function drawMicrometer(
  ctx: CanvasRenderingContext2D,
  state: PrecisionToolState,
  p: Palette,
  box: ReturnType<typeof layout>
): void {
  const s = box.scale;
  const C = precisionToolConstants;
  const frameY = box.top + 8 * s;
  const frameH = box.instrumentH - 16 * s;
  const anvilX = box.left + 22 * s;
  const sleeveX = box.left + box.width * 0.28;
  const sleeveY = frameY + frameH * 0.38;
  const sleeveH = 36 * s;
  const sleeveW = box.width * 0.38;
  const gap = Math.min(state.totalReading * 18 * s, 48 * s);

  ctx.strokeStyle = p.metalEdge;
  ctx.lineWidth = 10 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(anvilX, sleeveY + sleeveH * 0.5);
  ctx.arc(
    anvilX + 36 * s,
    sleeveY + sleeveH * 0.5,
    36 * s,
    Math.PI * 0.85,
    Math.PI * 1.15,
    true
  );
  ctx.stroke();

  ctx.fillStyle = p.metalEdge;
  ctx.fillRect(anvilX + 28 * s, sleeveY + 8 * s, 10 * s, sleeveH - 16 * s);
  ctx.fillRect(
    anvilX + 42 * s + gap,
    sleeveY + 8 * s,
    10 * s,
    sleeveH - 16 * s
  );

  metalFill(ctx, sleeveX, sleeveY, sleeveW, sleeveH, p, true);
  ctx.strokeStyle = p.metalEdge;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(sleeveX, sleeveY, sleeveW, sleeveH);

  const pxPerHalf = 22 * s;
  const windowStart = Math.max(
    0,
    Math.floor(state.mainScaleReading / C.micrometerPitchMm) - 2
  );
  ctx.strokeStyle = p.tick;
  for (let i = 0; i <= 8; i += 1) {
    const halfMm = (windowStart + i) * C.micrometerPitchMm;
    const x = sleeveX + 12 * s + i * pxPerHalf;
    const upper = i % 2 === 0;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    if (upper) {
      ctx.moveTo(x, sleeveY + 3 * s);
      ctx.lineTo(x, sleeveY + 16 * s);
    } else {
      ctx.moveTo(x, sleeveY + sleeveH - 3 * s);
      ctx.lineTo(x, sleeveY + sleeveH - 16 * s);
    }
    ctx.stroke();
    if (upper)
      label(
        ctx,
        String(Math.round(halfMm)),
        x,
        sleeveY - 10 * s,
        p.ink,
        11 * s,
        'center',
        700
      );
  }

  ctx.strokeStyle = p.accent;
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(sleeveX + 8 * s, sleeveY + sleeveH * 0.5);
  ctx.lineTo(sleeveX + sleeveW - 4 * s, sleeveY + sleeveH * 0.5);
  ctx.stroke();

  const thimbleX = sleeveX + sleeveW - 8 * s;
  const thimbleW = Math.min(96 * s, box.right - thimbleX - 8 * s);
  const g = ctx.createLinearGradient(
    thimbleX,
    sleeveY - 14 * s,
    thimbleX + thimbleW,
    sleeveY - 14 * s
  );
  g.addColorStop(0, p.metalHi);
  g.addColorStop(1, p.metalEdge);
  ctx.fillStyle = g;
  rounded(ctx, thimbleX, sleeveY - 14 * s, thimbleW, sleeveH + 28 * s, 8 * s);
  ctx.fill();
  ctx.strokeStyle = p.metalEdge;
  ctx.stroke();

  const vis = 10;
  const tickSpace = (thimbleW - 16 * s) / vis;
  const centerTick = 5;
  for (let k = 0; k <= vis; k += 1) {
    const idx =
      (state.fineReading - centerTick + k + C.micrometerDivisions) %
      C.micrometerDivisions;
    const x = thimbleX + 8 * s + k * tickSpace;
    const major = idx % 5 === 0;
    ctx.strokeStyle = k === centerTick ? p.accent : p.tick;
    ctx.lineWidth = k === centerTick ? 2.4 : 1.2;
    ctx.beginPath();
    ctx.moveTo(x, sleeveY + sleeveH * 0.5 - (major ? 16 * s : 10 * s));
    ctx.lineTo(x, sleeveY + sleeveH * 0.5 + (major ? 16 * s : 10 * s));
    ctx.stroke();
    if (major)
      label(
        ctx,
        String(idx),
        x,
        sleeveY + sleeveH + 22 * s,
        k === centerTick ? p.accent : p.muted,
        10 * s,
        'center',
        650
      );
  }

  label(ctx, '固定刻度', sleeveX, sleeveY + sleeveH + 28 * s, p.muted, 12 * s);
  label(
    ctx,
    '微分筒',
    thimbleX + thimbleW * 0.5,
    sleeveY + sleeveH + 28 * s,
    p.accent,
    12 * s,
    'center',
    700
  );

  drawZoomFrame(ctx, box, p, '放大观察区');
  const midY = box.zoomY + box.zoomH * 0.58;
  const startX = box.zoomX + 20 * s;
  const endX = box.zoomX + box.zoomW - 20 * s;
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(startX, midY);
  ctx.lineTo(endX, midY);
  ctx.stroke();
  const n = C.micrometerDivisions;
  for (let i = 0; i <= n; i += 1) {
    const x = startX + ((endX - startX) * i) / n;
    const major = i % 5 === 0;
    const h = major ? 22 * s : 12 * s;
    ctx.strokeStyle = i === state.fineReading ? p.accent : p.ink;
    ctx.lineWidth = i === state.fineReading ? 2.6 : 1.1;
    ctx.beginPath();
    ctx.moveTo(x, midY - h);
    ctx.lineTo(x, midY + h);
    ctx.stroke();
  }
  if (state.params.showGuides) {
    const x = startX + ((endX - startX) * state.fineReading) / n;
    ctx.strokeStyle = p.accent;
    ctx.setLineDash([5 * s, 5 * s]);
    ctx.beginPath();
    ctx.moveTo(x, box.zoomY + 28 * s);
    ctx.lineTo(x, box.zoomY + box.zoomH - 10 * s);
    ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, '对齐', x + 8 * s, box.zoomY + 32 * s, p.accent, 12 * s);
  }
}

export function createPrecisionToolView(
  options: CreatePrecisionToolViewOptions = {}
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
  let snapshot: PrecisionToolState | null = null;

  function draw(state: PrecisionToolState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const scale = env.contentScale() * stage.responsiveScale;
    const p = PALETTE[env.theme];
    const box = layout(width, height, scale);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, width, height);
    if (state.params.mode === 'micrometer') drawMicrometer(ctx, state, p, box);
    else drawCaliper(ctx, state, p, box);
  }

  return {
    render(state: PrecisionToolState): void {
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
    },
    reset(): void {
      snapshot = null;
    }
  };
}
