/* eslint-disable @typescript-eslint/no-unused-vars */
import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { variableWorkConstants, type VariableWorkState } from './scene.sim';
export type CreateVariableWorkViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};
const {
  baseWidth: BW,
  baseHeight: BH,
  fieldWidth: FW,
  panelX: PX,
  panelWidth: PW,
  panelInset: INSET,
  trackY: TRACK_Y,
  cartX: CART_X,
  cartY: CART_Y,
  cartWidth: CART_W,
  cartHeight: CART_H,
  trackStart: TRACK_START,
  trackEnd: TRACK_END,
  graphY: GRAPH_Y,
  graphLeft: GL,
  graphTitleY: GTY,
  graphAxisX: GAX,
  graphAxisY: GAY,
  graphXWidth: GXW,
  graphPLeft: GPL,
  graphPWidth: GPW,
  panelRuleY: PRY,
  modelCardY: MCY,
  modelCardHeight: MCH,
  paramCardY: PCY,
  paramCardHeight: PCH,
  readoutCardY: RCY,
  readoutCardHeight: RCH,
  hintCardY: HCY,
  hintCardHeight: HCH
} = variableWorkConstants;
const CARD_R = 12;
const GRID_STEP = 64;
type Palette = {
  bg: string;
  panel: string;
  ink: string;
  muted: string;
  border: string;
  grid: string;
  soft: string;
  blue: string;
  red: string;
  orange: string;
  teal: string;
};
const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    panel: '#fff',
    ink: '#303744',
    muted: '#8b97a5',
    border: '#d3dbe4',
    grid: '#e5e9ee',
    soft: '#f1f4f7',
    blue: '#3285d5',
    red: '#ef4050',
    orange: '#ee950f',
    teal: '#2a9f91'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    ink: '#eef2f7',
    muted: '#aab6c8',
    border: '#3c4b61',
    grid: '#2d3e57',
    soft: '#253249',
    blue: '#60a5fa',
    red: '#fb7185',
    orange: '#fbbf24',
    teal: '#34d399'
  }
};
function text(
  ctx: CanvasRenderingContext2D,
  v: string,
  x: number,
  y: number,
  c: string,
  s: number,
  a: CanvasTextAlign = 'left',
  w = 600
): void {
  ctx.fillStyle = c;
  ctx.font = `${w} ${s}px sans-serif`;
  ctx.textAlign = a;
  ctx.textBaseline = 'middle';
  ctx.fillText(v, x, y);
}
function box(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, CARD_R);
}
function drawGraph(
  ctx: CanvasRenderingContext2D,
  state: VariableWorkState,
  p: Palette,
  scale: number
): void {
  const x0 = GAX;
  const y0 = GAY;
  const xScale = GXW / 10;
  const yScale = 7;
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0, GRAPH_Y);
  ctx.lineTo(x0, y0);
  ctx.lineTo(x0 + GXW, y0);
  ctx.stroke();
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let i = 0; i <= 40; i += 1) {
    const x = (i / 40) * 10;
    const y =
      state.params.mode === 'linear'
        ? state.params.k * x
        : state.params.mode === 'power'
          ? 10 / (x + 0.4)
          : x < 3
            ? state.params.k * x
            : state.params.k * 3 - state.params.k * 0.5 * (x - 3);
    const px = x0 + x * xScale;
    const py = y0 - y * yScale;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  if (state.rectangles.length) {
    const width = (xScale * state.x) / Math.max(1, state.rectangles.length);
    state.rectangles.forEach((r, i) => {
      const px = x0 + r.x * xScale;
      const py = y0 - r.height * yScale;
      ctx.fillStyle = `${p.orange}42`;
      ctx.fillRect(px, py, width, r.height * yScale);
      ctx.strokeStyle = p.orange;
      ctx.strokeRect(px, py, width, r.height * yScale);
    });
  }
  text(ctx, 'F / N', x0 - 18, GRAPH_Y + 8, p.muted, 13 * scale, 'center');
  text(ctx, 'x / m', x0 + GXW - 16, y0 + 20, p.muted, 13 * scale, 'center');
  text(ctx, '外力-位移图象与面积积分', GL, GTY, p.ink, 16 * scale, 'left', 700);
}
function drawPowerGraph(
  ctx: CanvasRenderingContext2D,
  state: VariableWorkState,
  p: Palette,
  scale: number
): void {
  const x0 = GPL;
  const y0 = GAY;
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0, GRAPH_Y);
  ctx.lineTo(x0, y0);
  ctx.lineTo(x0 + GPW, y0);
  ctx.stroke();
  ctx.strokeStyle = p.orange;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x0 + GPW * 0.75, y0 - state.power * 2);
  ctx.stroke();
  ctx.strokeStyle = p.blue;
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(x0, y0 - 20);
  ctx.lineTo(x0 + GPW * 0.75, y0 - state.velocity * 8);
  ctx.stroke();
  ctx.setLineDash([]);
  text(ctx, '功率与速度', GPL, GTY, p.ink, 16 * scale, 'left', 700);
  text(ctx, 'P / W', GPL + 16, GRAPH_Y + 8, p.orange, 13 * scale, 'left', 700);
  text(
    ctx,
    'v / (m/s)',
    GPL + GPW - 12,
    GRAPH_Y + 8,
    p.blue,
    13 * scale,
    'right',
    700
  );
  text(
    ctx,
    `橙色面积 = 功 W = ${state.work.toFixed(2)} J`,
    GPL + 30,
    GAY - 26,
    p.orange,
    13 * scale,
    'left',
    700
  );
}
function drawField(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, FW, BH);
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let x = 0; x <= FW; x += GRID_STEP) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, BH);
    ctx.stroke();
  }
  for (let y = 0; y <= BH; y += GRID_STEP) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(FW, y);
    ctx.stroke();
  }
}
function drawTop(
  ctx: CanvasRenderingContext2D,
  state: VariableWorkState,
  p: Palette,
  scale: number
): void {
  text(
    ctx,
    `物理运动仿真模型：${state.params.mode === 'linear' ? '线性外力做功（F = kx）' : state.params.mode === 'power' ? '恒功率加速' : '分段渐减力'}`,
    34,
    40,
    p.ink,
    20 * scale,
    'left',
    700
  );
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(TRACK_START, TRACK_Y);
  ctx.lineTo(TRACK_END, TRACK_Y);
  ctx.stroke();
  ctx.fillStyle = p.blue;
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 3;
  ctx.fillRect(CART_X, CART_Y, CART_W, CART_H);
  ctx.strokeRect(CART_X, CART_Y, CART_W, CART_H);
  ctx.fillStyle = p.panel;
  ctx.beginPath();
  ctx.arc(CART_X + 24, CART_Y + CART_H, 14, 0, Math.PI * 2);
  ctx.arc(CART_X + CART_W - 24, CART_Y + CART_H, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  text(
    ctx,
    `m = ${state.params.mass.toFixed(1)} kg`,
    CART_X + CART_W / 2,
    CART_Y + 48,
    p.panel,
    15 * scale,
    'center',
    700
  );
  text(
    ctx,
    `F = ${state.force.toFixed(1)} N`,
    CART_X + CART_W + 22,
    CART_Y + 28,
    p.red,
    16 * scale,
    'left',
    700
  );
  text(
    ctx,
    `v = ${state.velocity.toFixed(1)} m/s`,
    CART_X + CART_W / 2,
    CART_Y - 20,
    p.blue,
    15 * scale,
    'center',
    700
  );
  drawGraph(ctx, state, p, scale);
  drawPowerGraph(ctx, state, p, scale);
}
function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: VariableWorkState,
  p: Palette,
  scale: number
): void {
  ctx.fillStyle = p.panel;
  ctx.fillRect(PX, 0, BW - PX, BH);
  text(ctx, '变力做功物理模型', PX + INSET, 42, p.ink, 20 * scale, 'left', 700);
  ctx.strokeStyle = p.border;
  ctx.beginPath();
  ctx.moveTo(PX + INSET, PRY);
  ctx.lineTo(PX + PW - INSET, PRY);
  ctx.stroke();
  box(ctx, PX + INSET, MCY, PW - INSET * 2, MCH);
  ctx.fillStyle = p.soft;
  ctx.fill();
  text(
    ctx,
    '模型：F(x)、P(t) 与速度联动',
    PX + INSET + 16,
    MCY + 24,
    p.ink,
    16 * scale,
    'left',
    700
  );
  text(
    ctx,
    'W = ∫F dx       P = Fv',
    PX + INSET + 16,
    MCY + 56,
    p.blue,
    16 * scale,
    'left',
    700
  );
  box(ctx, PX + INSET, PCY, PW - INSET * 2, PCH);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(
    ctx,
    `m = ${state.params.mass.toFixed(1)} kg`,
    PX + INSET + 16,
    PCY + 30,
    p.ink,
    14 * scale,
    'left'
  );
  text(
    ctx,
    `k = ${state.params.k.toFixed(1)} N/m`,
    PX + INSET + 16,
    PCY + 62,
    p.ink,
    14 * scale,
    'left'
  );
  text(
    ctx,
    `微元 n = ${state.params.microsteps || '关闭'}`,
    PX + INSET + 16,
    PCY + 94,
    p.orange,
    14 * scale,
    'left',
    700
  );
  text(
    ctx,
    `x = ${state.x.toFixed(2)} m`,
    PX + INSET + 16,
    PCY + 126,
    p.blue,
    14 * scale,
    'left',
    700
  );
  box(ctx, PX + INSET, RCY, PW - INSET * 2, RCH);
  ctx.fillStyle = p.soft;
  ctx.fill();
  const rows: Array<[string, string, string]> = [
    ['即时外力 F', `${state.force.toFixed(2)} N`, p.red],
    ['即时速度 v', `${state.velocity.toFixed(2)} m/s`, p.blue],
    ['即时功率 P', `${state.power.toFixed(2)} W`, p.orange],
    ['累计做功 W', `${state.work.toFixed(2)} J`, p.teal],
    ['动能增量 ΔEₖ', `${state.kineticGain.toFixed(2)} J`, p.ink]
  ];
  rows.forEach(([label, value, color], index) => {
    const y = RCY + 28 + index * 34;
    text(ctx, label, PX + INSET + 16, y, p.ink, 13 * scale, 'left');
    text(ctx, value, PX + PW - INSET - 16, y, color, 14 * scale, 'right', 700);
  });
  box(ctx, PX + INSET, HCY, PW - INSET * 2, HCH);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(
    ctx,
    '图象下方面积 = 功 W',
    PX + INSET + 16,
    HCY + 28,
    p.teal,
    14 * scale,
    'left',
    700
  );
  text(
    ctx,
    '微元矩形越多，逼近越好',
    PX + INSET + 16,
    HCY + 62,
    p.muted,
    13 * scale,
    'left'
  );
}
export function createVariableWorkView(
  options: CreateVariableWorkViewOptions = {}
) {
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: { mode: 'clamped', fallbackWidth: BW, fallbackHeight: BH },
    initialWidth: BW,
    initialHeight: BH,
    eagerContext: true
  });
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  let snapshot: VariableWorkState | null = null;
  function draw(state: VariableWorkState) {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(width / BW, height / BH);
    const offsetY = (height - BH * fit) / 2;
    const scale = env.contentScale() * stage.responsiveScale;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(0, offsetY);
    ctx.scale(fit, fit);
    const p = PALETTE[env.theme];
    drawField(ctx, p);
    drawTop(ctx, state, p, scale);
    drawPanel(ctx, state, p, scale);
    ctx.restore();
  }
  return {
    render(state: VariableWorkState) {
      snapshot = state;
      stage.ensureSized();
      draw(state);
    },
    resize() {
      stage.resize();
      if (snapshot) draw(snapshot);
    },
    setTheme(theme: TeachingTheme) {
      env.setTheme(theme);
      if (snapshot) draw(snapshot);
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints) {
      env.setMode(mode, hints);
      if (snapshot) draw(snapshot);
    },
    dispose() {
      snapshot = null;
      stage.release();
    }
  };
}
