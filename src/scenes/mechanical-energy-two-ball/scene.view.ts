import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { twoBallConstants as C, type TwoBallState } from './scene.sim';
export type CreateTwoBallViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};
type P = {
  bg: string;
  panel: string;
  ink: string;
  muted: string;
  border: string;
  grid: string;
  red: string;
  blue: string;
  teal: string;
  gold: string;
  rod: string;
};
const PALETTE: Record<TeachingTheme, P> = {
  light: {
    bg: '#fbfcff',
    panel: '#fff',
    ink: '#303747',
    muted: '#8290a2',
    border: '#d8e1eb',
    grid: '#dce5ef',
    red: '#d43a4b',
    blue: '#2167b4',
    teal: '#1ba18b',
    gold: '#d99416',
    rod: '#5b6673'
  },
  dark: {
    bg: '#101929',
    panel: '#172538',
    ink: '#eef3fb',
    muted: '#aab8ca',
    border: '#3d526c',
    grid: '#2b4059',
    red: '#ff7686',
    blue: '#77b0ff',
    teal: '#42d9bd',
    gold: '#f7c24e',
    rod: '#9cabc0'
  }
};
const V = {
  pivotX: 330,
  pivotY: 282,
  railY: 470,
  railLeft: 120,
  railRight: 760,
  scale: 190,
  panelRuleY: 62,
  panelRight: 1248,
  cardX: 882,
  cardW: 376,
  barBaseY: 410,
  graphLeft: 900,
  graphTop: 520,
  graphRight: 1240,
  graphBottom: 710,
  mechTop: 90,
  mechBottom: 690,
  ballOffset: 60,
  barWidth: 58,
  totalBarX: 290,
  barHeight: 220,
  graphAxisOffset: 62,
  graphMarkerSpan: 260,
  markerY: 80
} as const;
function t(
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  c: string,
  z = 14,
  a: CanvasTextAlign = 'left',
  w = 600
): void {
  ctx.fillStyle = c;
  ctx.font = `${w} ${z}px sans-serif`;
  ctx.textAlign = a;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}
function card(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  stroke: string
): void {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function')
    ctx.roundRect(x, y, w, h, C.cardRadius);
  else ctx.rect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.stroke();
}
function arrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  c: string
): void {
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.strokeStyle = c;
  ctx.fillStyle = c;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 10 * Math.cos(a - 0.5), y2 - 10 * Math.sin(a - 0.5));
  ctx.lineTo(x2 - 10 * Math.cos(a + 0.5), y2 - 10 * Math.sin(a + 0.5));
  ctx.closePath();
  ctx.fill();
}
function grid(ctx: CanvasRenderingContext2D, p: P): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, C.fieldWidth, C.baseHeight);
  ctx.strokeStyle = `${p.grid}44`;
  for (let x = 0; x <= C.fieldWidth; x += 54) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, C.baseHeight);
    ctx.stroke();
  }
  for (let y = 0; y <= C.baseHeight; y += 54) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(C.fieldWidth, y);
    ctx.stroke();
  }
}
function drawMechanism(
  ctx: CanvasRenderingContext2D,
  s: TwoBallState,
  p: P
): void {
  ctx.strokeStyle = p.rod;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(V.pivotX, V.mechTop);
  ctx.lineTo(V.pivotX, V.mechBottom);
  ctx.moveTo(V.railLeft, V.railY);
  ctx.lineTo(V.railRight, V.railY);
  ctx.stroke();
  const bx = V.pivotX + s.x * V.scale;
  const by = V.pivotY - s.y * V.scale;
  ctx.strokeStyle = '#aab4bf';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(V.pivotX, V.pivotY);
  ctx.lineTo(bx, by);
  ctx.stroke();
  ctx.fillStyle = p.red;
  ctx.beginPath();
  ctx.arc(V.pivotX, V.pivotY - V.ballOffset, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.blue;
  ctx.beginPath();
  ctx.arc(bx, V.railY, 22, 0, Math.PI * 2);
  ctx.fill();
  arrow(ctx, V.pivotX, V.pivotY - 30, V.pivotX, V.pivotY + 28, p.red);
  arrow(ctx, bx, V.railY, bx + 45, V.railY, p.blue);
  t(ctx, 'a', V.pivotX - 30, V.pivotY - V.ballOffset, p.ink, 16, 'center', 700);
  t(ctx, 'b', bx, V.railY + 35, p.ink, 16, 'center', 700);
  t(ctx, 'L₁', V.pivotX - 30, 110, p.ink, 18, 'center', 700);
  t(ctx, 'L₂', V.railRight - 28, V.railY - 26, p.ink, 18, 'center', 700);
  t(ctx, `y = ${s.y.toFixed(2)} m`, V.pivotX + 42, by, p.red, 13, 'left', 700);
  t(
    ctx,
    `x = ${s.x.toFixed(2)} m`,
    bx + 28,
    V.railY + 4,
    p.blue,
    13,
    'left',
    700
  );
}
function drawEnergy(
  ctx: CanvasRenderingContext2D,
  s: TwoBallState,
  p: P
): void {
  t(ctx, '能量组成', V.cardX + 276, 94, p.ink, 13, 'right', 700);
  const max = Math.max(s.totalEnergy, 0.1);
  const bars = [
    { label: '势能 Ep', value: s.potential, color: p.teal },
    { label: 'a 动能', value: s.kineticA, color: p.red },
    { label: 'b 动能', value: s.kineticB, color: p.blue }
  ];
  let x = V.cardX + 30;
  for (const b of bars) {
    const h = (b.value / max) * V.barHeight;
    ctx.fillStyle = b.color;
    ctx.fillRect(x, V.barBaseY - h, V.barWidth, h);
    t(ctx, b.label, x + 29, V.barBaseY + 24, p.muted, 11, 'center', 600);
    x += 82;
  }
  ctx.fillStyle = `${p.muted}55`;
  ctx.fillRect(
    V.cardX + V.totalBarX,
    V.barBaseY - V.barHeight,
    V.barWidth,
    V.barHeight
  );
  t(ctx, '总能量', V.cardX + 319, V.barBaseY + 24, p.muted, 11, 'center', 600);
  t(
    ctx,
    `E = ${s.totalEnergy.toFixed(2)} J`,
    V.cardX + 20,
    458,
    p.teal,
    14,
    'left',
    700
  );
}
function drawGraph(ctx: CanvasRenderingContext2D, s: TwoBallState, p: P): void {
  t(ctx, '速度—位置示意（v–y）', V.cardX, 500, p.ink, 16, 'left', 700);
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(V.cardX + 22, V.graphBottom);
  ctx.lineTo(V.panelRight - 18, V.graphBottom);
  ctx.moveTo(V.cardX + V.graphAxisOffset, V.graphBottom + 10);
  ctx.lineTo(V.cardX + V.graphAxisOffset, V.graphTop);
  ctx.stroke();
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i <= 60; i += 1) {
    const x = V.cardX + V.graphAxisOffset + i * 5.2;
    const y = V.graphBottom - Math.sin((i / 60) * Math.PI) * 112;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.strokeStyle = p.blue;
  ctx.beginPath();
  for (let i = 0; i <= 60; i += 1) {
    const x = V.cardX + V.graphAxisOffset + i * 5.2;
    const y = V.graphBottom - Math.sin((i / 60) * Math.PI * 0.9) * 70;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.fillStyle = p.red;
  ctx.beginPath();
  ctx.arc(
    V.cardX +
      V.graphAxisOffset +
      V.graphMarkerSpan * Math.min(1, Math.abs(s.y) / Math.max(s.length, 0.1)),
    V.graphBottom - V.markerY,
    6,
    0,
    Math.PI * 2
  );
  ctx.fill();
  t(ctx, 'a', V.panelRight - 42, V.graphTop + 18, p.red, 13, 'right', 700);
  t(ctx, 'b', V.panelRight - 42, V.graphTop + 42, p.blue, 13, 'right', 700);
}
function drawPanel(ctx: CanvasRenderingContext2D, s: TwoBallState, p: P): void {
  ctx.fillStyle = p.panel;
  ctx.fillRect(C.panelX, 0, C.panelWidth, C.baseHeight);
  t(ctx, '系统机械能守恒·双球联动', C.panelX + 24, 36, p.ink, 21, 'left', 800);
  ctx.strokeStyle = p.border;
  ctx.beginPath();
  ctx.moveTo(C.panelX + 24, V.panelRuleY);
  ctx.lineTo(V.panelRight, V.panelRuleY);
  ctx.stroke();
  card(ctx, V.cardX, 72, V.cardW, 392, p.panel, p.border);
  t(ctx, '实时运动特征', V.cardX + 22, 101, p.ink, 16, 'left', 700);
  t(
    ctx,
    `a 位置 y = ${s.y.toFixed(2)} m`,
    V.cardX + 22,
    137,
    p.red,
    14,
    'left',
    700
  );
  t(
    ctx,
    `b 位置 x = ${s.x.toFixed(2)} m`,
    V.cardX + 22,
    168,
    p.blue,
    14,
    'left',
    700
  );
  t(
    ctx,
    `a 速度 va = ${s.vA.toFixed(2)} m/s`,
    V.cardX + 22,
    206,
    p.red,
    14,
    'left',
    700
  );
  t(
    ctx,
    `b 速度 vb = ${s.vB.toFixed(2)} m/s`,
    V.cardX + 22,
    237,
    p.blue,
    14,
    'left',
    700
  );
  drawEnergy(ctx, s, p);
  card(ctx, V.cardX, 482, V.cardW, 246, p.panel, p.border);
  drawGraph(ctx, s, p);
  t(ctx, 'x² + y² = L²', V.cardX + 22, 695, p.teal, 15, 'left', 700);
}
function drawScene(ctx: CanvasRenderingContext2D, s: TwoBallState, p: P): void {
  grid(ctx, p);
  t(ctx, '系统机械能守恒·双球联动', 34, 36, p.ink, 25, 'left', 800);
  t(
    ctx,
    '轻杆约束，忽略摩擦，E 只转化不损失',
    35,
    64,
    p.muted,
    14,
    'left',
    600
  );
  drawMechanism(ctx, s, p);
  drawPanel(ctx, s, p);
}
export function createTwoBallView(options: CreateTwoBallViewOptions = {}) {
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
  let snap: TwoBallState | null = null;
  function draw(s: TwoBallState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    stage.ensureSized();
    const fit = Math.min(
      stage.cssWidth / C.baseWidth,
      stage.cssHeight / C.baseHeight
    );
    const off = (stage.cssHeight - C.baseHeight * fit) / 2;
    const responsiveScale = stage.responsiveScale;
    const p = PALETTE[env.theme];
    ctx.clearRect(0, 0, stage.cssWidth, stage.cssHeight);
    ctx.save();
    ctx.translate(0, off);
    ctx.scale(fit, fit);
    ctx.lineWidth = responsiveScale;
    drawScene(ctx, s, p);
    ctx.restore();
  }
  return {
    render(s: TwoBallState): void {
      snap = s;
      draw(s);
    },
    resize(): void {
      stage.resize();
      if (snap) draw(snap);
    },
    setTheme(theme: TeachingTheme): void {
      env.setTheme(theme);
      if (snap) draw(snap);
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints): void {
      env.setMode(mode, hints);
      if (snap) draw(snap);
    },
    dispose(): void {
      snap = null;
      stage.release();
    }
  };
}
