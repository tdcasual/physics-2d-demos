import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  faradayConstants as C,
  stageLayoutFrom,
  stageTransform,
  type FaradayState
} from './scene.sim';

export type CreateFaradayViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

type Palette = {
  bg: string;
  paper: string;
  ink: string;
  muted: string;
  blue: string;
  blueSoft: string;
  red: string;
  green: string;
  orange: string;
  fieldFill: string;
  fieldStroke: string;
  discHi: string;
  disc: string;
  discMid: string;
  discDark: string;
  discRim: string;
  discRing: string;
  discSpoke: string;
  hub: string;
  wire: string;
  card: string;
  cardLine: string;
  brush: string;
  glow: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#FAF7F2',
    paper: '#FFFFFF',
    ink: '#24324a',
    muted: '#6c7a90',
    blue: '#2b7de9',
    blueSoft: '#d7e8fb',
    red: '#e63946',
    green: '#12b886',
    orange: '#f08c00',
    fieldFill: 'rgba(219, 234, 254, 0.55)',
    fieldStroke: '#74a7e8',
    discHi: '#f6d48a',
    disc: '#e8a23a',
    discMid: '#d07c16',
    discDark: '#b45c0b',
    discRim: '#8d4308',
    discRing: 'rgba(255, 236, 190, 0.55)',
    discSpoke: 'rgba(255, 244, 214, 0.62)',
    hub: '#f4f7fb',
    wire: '#2c3a4d',
    card: '#ffffff',
    cardLine: '#d7e0ea',
    brush: '#2b3038',
    glow: '#ffe566'
  },
  dark: {
    bg: '#0f172a',
    paper: '#111827',
    ink: '#e2e8f0',
    muted: '#94a3b8',
    blue: '#60a5fa',
    blueSoft: '#1e3a5f',
    red: '#fb7185',
    green: '#34d399',
    orange: '#fbbf24',
    fieldFill: 'rgba(30, 58, 95, 0.55)',
    fieldStroke: '#60a5fa',
    discHi: '#f3c56a',
    disc: '#d97706',
    discMid: '#b45309',
    discDark: '#92400e',
    discRim: '#78350f',
    discRing: 'rgba(253, 230, 138, 0.28)',
    discSpoke: 'rgba(254, 243, 199, 0.32)',
    hub: '#1f2937',
    wire: '#cbd5e1',
    card: '#1e293b',
    cardLine: '#334155',
    brush: '#0f172a',
    glow: '#fde68a'
  }
};

type Pt = { x: number; y: number };

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
  width: number
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 2) return;
  const ux = dx / len;
  const uy = dy / len;
  const head = Math.min(11, Math.max(7, len * 0.22));
  ctx.save();
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
  ctx.restore();
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
  ctx.roundRect(x, y, w, h, r);
}

function card(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  p: Palette
): void {
  ctx.save();
  ctx.shadowColor = 'rgba(36, 50, 74, 0.1)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 2;
  rounded(ctx, x, y, w, h, 14);
  ctx.fillStyle = p.card;
  ctx.fill();
  ctx.restore();
  rounded(ctx, x, y, w, h, 14);
  ctx.strokeStyle = p.cardLine;
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

function drawFieldMark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  into: boolean,
  color: string,
  size: number
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.stroke();
  if (into) {
    const a = size * 0.52;
    ctx.beginPath();
    ctx.moveTo(x - a, y - a);
    ctx.lineTo(x + a, y + a);
    ctx.moveTo(x + a, y - a);
    ctx.lineTo(x - a, y + a);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(x, y, size * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawTitle(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  cs: number
): void {
  const x = 24;
  const y = 16;
  const width = C.titleWidth * cs;
  const height = C.titleHeight * cs;
  card(ctx, x, y, width, height, p);
  text(
    ctx,
    '法拉第圆盘发电机实验装置',
    x + 14,
    y + height / 2,
    p.ink,
    14 * cs,
    'left',
    700
  );
}

function drawField(
  ctx: CanvasRenderingContext2D,
  state: FaradayState,
  p: Palette,
  cs: number
): void {
  const w = C.fieldRight - C.fieldLeft;
  const h = C.fieldBottom - C.fieldTop;
  rounded(ctx, C.fieldLeft, C.fieldTop, w, h, C.fieldRadius);
  ctx.fillStyle = p.fieldFill;
  ctx.fill();
  ctx.setLineDash([8, 6]);
  ctx.strokeStyle = p.fieldStroke;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.setLineDash([]);

  const into = state.params.field === 'into';
  const cx = C.discCenter.x;
  const cy = C.discCenter.y;
  const clear = C.discRadius + 18;
  const alpha = 0.35 + 0.55 * (state.params.B / C.bMax);
  ctx.save();
  ctx.globalAlpha = alpha;
  for (
    let x = C.fieldLeft + 36;
    x <= C.fieldRight - 20;
    x += C.fieldSymbolStepX
  ) {
    for (
      let y = C.fieldTop + 48;
      y <= C.fieldBottom - 22;
      y += C.fieldSymbolStepY
    ) {
      if (Math.hypot(x - cx, y - cy) < clear) continue;
      drawFieldMark(ctx, x, y, into, p.blue, C.fieldSymbolSize);
    }
  }
  ctx.restore();

  const dir = into ? '垂直纸面向里' : '垂直纸面向外';
  text(
    ctx,
    `B = ${state.params.B.toFixed(1)} T  ${dir}`,
    (C.fieldLeft + C.fieldRight) / 2,
    C.fieldCaptionY,
    p.blue,
    14 * cs,
    'center',
    700
  );
}

function drawDisc(
  ctx: CanvasRenderingContext2D,
  state: FaradayState,
  p: Palette
): void {
  const { x, y } = C.discCenter;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(state.angle * C.visualAngleScale);
  const g = ctx.createRadialGradient(
    -C.discRadius * 0.28,
    -C.discRadius * 0.34,
    12,
    0,
    0,
    C.discRadius
  );
  g.addColorStop(0, p.discHi);
  g.addColorStop(0.42, p.disc);
  g.addColorStop(0.78, p.discMid);
  g.addColorStop(1, p.discDark);
  ctx.beginPath();
  ctx.arc(0, 0, C.discRadius, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = p.discRim;
  ctx.stroke();

  ctx.strokeStyle = p.discRing;
  ctx.lineWidth = 1.25;
  for (let i = 1; i <= C.ringCount; i += 1) {
    ctx.beginPath();
    ctx.arc(0, 0, (C.discRadius * i) / (C.ringCount + 1), 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.strokeStyle = p.discSpoke;
  ctx.lineWidth = 1.35;
  ctx.lineCap = 'round';
  for (let i = 0; i < C.spokeCount; i += 1) {
    const a = (i / C.spokeCount) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * C.spokeInner, Math.sin(a) * C.spokeInner);
    ctx.lineTo(
      Math.cos(a) * (C.discRadius - 6),
      Math.sin(a) * (C.discRadius - 6)
    );
    ctx.stroke();
  }
  ctx.restore();
}

function drawHub(
  ctx: CanvasRenderingContext2D,
  state: FaradayState,
  p: Palette,
  cs: number
): void {
  const { x, y } = C.discCenter;
  ctx.save();
  ctx.fillStyle = p.hub;
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, C.hubRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = p.brush;
  ctx.beginPath();
  ctx.arc(x, y, C.pivotRadius, 0, Math.PI * 2);
  ctx.fill();
  const minus = !state.rimPositive;
  text(
    ctx,
    minus ? 'A −' : 'A +',
    x + C.hubRadius + 14,
    y + 18,
    minus ? p.blue : p.red,
    13 * cs,
    'left',
    700
  );
  text(ctx, '电刷 A', x + C.hubRadius + 14, y + 34, p.muted, 11 * cs);
  ctx.restore();
}

function drawBrushB(
  ctx: CanvasRenderingContext2D,
  state: FaradayState,
  p: Palette,
  cs: number
): void {
  const x = C.discCenter.x;
  const y = C.discCenter.y - C.discRadius;
  ctx.save();
  ctx.fillStyle = p.brush;
  rounded(
    ctx,
    x - C.brushWidth / 2,
    y - C.brushHeight,
    C.brushWidth,
    C.brushHeight + 6,
    3
  );
  ctx.fill();
  ctx.fillStyle = state.rimPositive ? p.red : p.blue;
  ctx.beginPath();
  ctx.arc(x + 18, y - 16, 7, 0, Math.PI * 2);
  ctx.fill();
  text(
    ctx,
    state.rimPositive ? '+' : '−',
    x + 18,
    y - 16,
    '#fff',
    12 * cs,
    'center',
    800
  );
  text(ctx, '电刷 B', x + 30, y - 16, p.red, 13 * cs, 'left', 700);
  ctx.restore();
}

function drawOmega(
  ctx: CanvasRenderingContext2D,
  state: FaradayState,
  p: Palette,
  cs: number
): void {
  const { x, y } = C.discCenter;
  const r = C.discRadius + 26;
  const cw = state.params.rotation === 'cw';
  const start = cw ? (-Math.PI * 2) / 3 : -Math.PI / 6;
  const end = cw ? -Math.PI / 6 : (-Math.PI * 2) / 3;
  ctx.save();
  ctx.strokeStyle = p.green;
  ctx.fillStyle = p.green;
  ctx.lineWidth = 2.4 * cs;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y, r, start, end, true);
  ctx.stroke();
  const ex = x + r * Math.cos(end);
  const ey = y + r * Math.sin(end);
  const tang = end - Math.PI / 2;
  const hx = Math.cos(tang);
  const hy = Math.sin(tang);
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(ex - hx * 10 - hy * 5, ey - hy * 10 + hx * 5);
  ctx.lineTo(ex - hx * 10 + hy * 5, ey - hy * 10 - hx * 5);
  ctx.closePath();
  ctx.fill();
  text(
    ctx,
    cw ? 'ω 顺时针' : 'ω 逆时针',
    x - r - 8,
    y - 8,
    p.green,
    13 * cs,
    'right',
    700
  );
  ctx.restore();
}

function drawPointP(
  ctx: CanvasRenderingContext2D,
  state: FaradayState,
  p: Palette,
  cs: number
): void {
  const px = C.discCenter.x;
  const py = C.discCenter.y - C.discRadius;
  ctx.save();
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(C.discCenter.x, C.discCenter.y);
  ctx.lineTo(px, py);
  ctx.stroke();

  const vLen = 54;
  const fLen = 48;
  const vx = state.velocityRight ? vLen : -vLen;
  const fy = state.forceOutward ? -fLen : fLen;
  arrow(ctx, px, py, px + vx, py, p.green, 2.8 * cs);
  arrow(ctx, px, py, px, py + fy, p.orange, 2.8 * cs);
  text(
    ctx,
    'v',
    px + vx * 0.55,
    py + (state.velocityRight ? 16 : -16),
    p.green,
    14 * cs,
    'center',
    700
  );
  text(ctx, 'F洛', px + 16, py + fy * 0.55, p.orange, 13 * cs, 'left', 700);
  text(ctx, 'P', px - 16, py - 18, p.ink, 14 * cs, 'right', 800);
  ctx.restore();
}

function drawRadius(
  ctx: CanvasRenderingContext2D,
  state: FaradayState,
  p: Palette,
  cs: number
): void {
  const { x, y } = C.discCenter;
  const a = (Math.PI * 3) / 4;
  const r = C.discRadius;
  const x2 = x + r * Math.cos(a);
  const y2 = y + r * Math.sin(a);
  ctx.save();
  ctx.strokeStyle = p.blue;
  ctx.lineWidth = 1.8;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.setLineDash([]);
  text(
    ctx,
    `R = ${state.params.radius.toFixed(2)} m`,
    x2 - 8,
    y2 + 16,
    p.blue,
    13 * cs,
    'right',
    600
  );
  ctx.restore();
}

function polyline(ctx: CanvasRenderingContext2D, pts: Pt[]): void {
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
}

function wireSegments(state: FaradayState): { live: Pt[][]; idle: Pt[][] } {
  const cx = C.discCenter.x;
  const cy = C.discCenter.y;
  const bx = C.circuitX;
  const brushTop = cy - C.discRadius - C.brushHeight;
  const switchTop = C.switchY;
  const switchBot = C.switchY + C.switchH;
  const bulbTop = C.bulbY;
  const bulbBot = C.bulbY + C.bulbH;
  const meterTop = C.meterCy - C.meterR;
  const meterBot = C.meterCy + C.meterR;
  const top: Pt[] = [
    { x: cx, y: brushTop },
    { x: cx, y: C.wireTopY },
    { x: bx, y: C.wireTopY },
    { x: bx, y: switchTop }
  ];
  const mid: Pt[] = [
    { x: bx, y: switchBot },
    { x: bx, y: bulbTop }
  ];
  const lower: Pt[] = [
    { x: bx, y: bulbBot },
    { x: bx, y: meterTop }
  ];
  const back: Pt[] = [
    { x: bx, y: meterBot },
    { x: bx, y: C.wireBottomY },
    { x: cx, y: C.wireBottomY },
    { x: cx, y: cy + C.hubRadius }
  ];
  if (state.params.closed) {
    return { live: [top, mid, lower, back], idle: [] };
  }
  return { live: [], idle: [top, mid, lower, back] };
}

function pathLength(pts: Pt[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i += 1) {
    len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  return len;
}

function pointAlong(pts: Pt[], s: number): Pt | null {
  if (pts.length < 2) return null;
  let remain = s;
  for (let i = 1; i < pts.length; i += 1) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    const seg = Math.hypot(dx, dy);
    if (remain <= seg) {
      const t = seg <= 1e-6 ? 0 : remain / seg;
      return { x: pts[i - 1].x + dx * t, y: pts[i - 1].y + dy * t };
    }
    remain -= seg;
  }
  return pts[pts.length - 1];
}

function drawWires(
  ctx: CanvasRenderingContext2D,
  state: FaradayState,
  p: Palette,
  cs: number
): void {
  const { live, idle } = wireSegments(state);
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = p.wire;
  ctx.lineWidth = 3.2 * cs;
  idle.forEach((seg) => polyline(ctx, seg));
  if (live.length) {
    ctx.strokeStyle = state.bulbOn ? p.orange : p.wire;
    live.forEach((seg) => polyline(ctx, seg));
  }
  ctx.restore();
}

function drawCurrent(
  ctx: CanvasRenderingContext2D,
  state: FaradayState,
  p: Palette
): void {
  if (!state.bulbOn || state.currentSign === 0) return;
  const { live } = wireSegments(state);
  const speed = 48 + 90 * Math.min(1, state.current / 0.4);
  const phase = (state.time * speed) % 28;
  ctx.save();
  ctx.fillStyle = state.currentSign > 0 ? p.orange : p.blue;
  for (const seg of live) {
    const len = pathLength(seg);
    for (let s = phase; s < len; s += 28) {
      const at =
        state.currentSign > 0 ? pointAlong(seg, s) : pointAlong(seg, len - s);
      if (!at) continue;
      ctx.beginPath();
      ctx.arc(at.x, at.y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawSwitch(
  ctx: CanvasRenderingContext2D,
  state: FaradayState,
  p: Palette,
  cs: number
): void {
  const x = C.circuitX - C.circuitW / 2;
  card(ctx, x, C.switchY, C.circuitW, C.switchH, p);
  text(
    ctx,
    '开关 S',
    C.circuitX,
    C.switchY + 16,
    p.ink,
    13 * cs,
    'center',
    700
  );
  const y = C.switchY + 42;
  const left = C.circuitX - 28;
  const right = C.circuitX + 28;
  ctx.strokeStyle = p.wire;
  ctx.fillStyle = p.wire;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(left, y, 4, 0, Math.PI * 2);
  ctx.arc(right, y, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = state.params.closed ? p.green : p.red;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(left, y);
  if (state.params.closed) ctx.lineTo(right, y);
  else ctx.lineTo(right - 6, y - 16);
  ctx.stroke();
  text(
    ctx,
    state.params.closed ? '闭合' : '断开',
    C.circuitX,
    C.switchY + C.switchH - 12,
    state.params.closed ? p.green : p.red,
    12 * cs,
    'center'
  );
}

function drawBulb(
  ctx: CanvasRenderingContext2D,
  state: FaradayState,
  p: Palette,
  cs: number
): void {
  const x = C.circuitX - C.circuitW / 2;
  card(ctx, x, C.bulbY, C.circuitW, C.bulbH, p);
  text(ctx, '灯泡', C.circuitX, C.bulbY + 16, p.ink, 13 * cs, 'center', 700);
  const bx = C.circuitX;
  const by = C.bulbY + 52;
  if (state.bulbOn) {
    const glow = ctx.createRadialGradient(bx, by - 6, 2, bx, by - 6, 28);
    glow.addColorStop(0, p.glow);
    glow.addColorStop(1, 'rgba(255, 229, 102, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(bx, by - 6, 28, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  ctx.fillStyle = state.bulbOn ? p.glow : p.hub;
  ctx.strokeStyle = p.wire;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(bx, by - 8, 14, Math.PI * 1.15, Math.PI * 1.85, true);
  ctx.quadraticCurveTo(bx + 12, by + 8, bx + 6, by + 10);
  ctx.lineTo(bx - 6, by + 10);
  ctx.quadraticCurveTo(bx - 12, by + 8, bx - 12, by - 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = p.muted;
  rounded(ctx, bx - 7, by + 10, 14, 6, 2);
  ctx.fill();
  ctx.restore();
}

function drawMeter(
  ctx: CanvasRenderingContext2D,
  state: FaradayState,
  p: Palette,
  cs: number
): void {
  const x = C.circuitX;
  const y = C.meterCy;
  ctx.save();
  ctx.shadowColor = 'rgba(36, 50, 74, 0.1)';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(x, y, C.meterR, 0, Math.PI * 2);
  ctx.fillStyle = p.card;
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(x, y, C.meterR, 0, Math.PI * 2);
  ctx.strokeStyle = p.cardLine;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, C.meterR - 8, Math.PI * 0.72, Math.PI * 0.28);
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  text(ctx, '−G', x - 28, y + 18, p.muted, 11 * cs, 'center');
  text(ctx, '+G', x + 28, y + 18, p.muted, 11 * cs, 'center');
  text(ctx, 'G', x, y + 8, p.ink, 16 * cs, 'center', 800);
  const max = 1.05;
  const defl = max * Math.tanh(state.current / 0.35) * (state.currentSign || 0);
  const needle = -Math.PI / 2 + defl;
  const nr = C.meterR - 18;
  arrow(
    ctx,
    x,
    y,
    x + nr * Math.cos(needle),
    y + nr * Math.sin(needle),
    p.red,
    2.2 * cs
  );
  ctx.fillStyle = p.ink;
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, '检流计', x, y + C.meterR + 14, p.muted, 12 * cs, 'center');
}

export function createFaradayView(options: CreateFaradayViewOptions = {}) {
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
  let snapshot: FaradayState | null = null;

  function draw(state: FaradayState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const layout = stageLayoutFrom(stage.canvas);
    const { fit, offsetX, offsetY, boxW, boxH } = stageTransform(
      width,
      height,
      layout
    );
    const p = PALETTE[env.theme];
    const cs = env.contentScale() * stage.responsiveScale;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fit, fit);
    rounded(ctx, 0, 0, boxW, boxH, 22);
    ctx.fillStyle = p.paper;
    ctx.fill();
    ctx.save();
    rounded(ctx, 0, 0, boxW, boxH, 22);
    ctx.clip();

    drawTitle(ctx, p, cs);
    drawField(ctx, state, p, cs);
    drawDisc(ctx, state, p);
    drawRadius(ctx, state, p, cs);
    drawOmega(ctx, state, p, cs);
    drawWires(ctx, state, p, cs);
    drawHub(ctx, state, p, cs);
    drawBrushB(ctx, state, p, cs);
    drawPointP(ctx, state, p, cs);
    drawSwitch(ctx, state, p, cs);
    drawBulb(ctx, state, p, cs);
    drawMeter(ctx, state, p, cs);
    drawCurrent(ctx, state, p);
    ctx.restore();
    ctx.restore();
  }

  return {
    render(state: FaradayState): void {
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
