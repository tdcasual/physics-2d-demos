import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { uvtConstants, type UvtState } from './scene.sim';

export type CreateUvtViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};
const {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  fieldWidth: FIELD_W,
  graphLeft: GRAPH_LEFT,
  graphRight: GRAPH_RIGHT,
  graphTop: GRAPH_TOP,
  graphBottom: GRAPH_BOTTOM,
  graphMaxT: GRAPH_MAX_T,
  graphMaxV: GRAPH_MAX_V,
  trackY: TRACK_Y,
  trackEndX: TRACK_END_X,
  carBodyWidth: CAR_BODY_WIDTH,
  formulaTop: FORMULA_TOP,
  panelWidth: PANEL_WIDTH,
  formulaHeight: FORMULA_HEIGHT,
  readoutTop: READOUT_TOP,
  readoutHeight: READOUT_HEIGHT
} = uvtConstants;
type Palette = {
  bg: string;
  panel: string;
  grid: string;
  ink: string;
  muted: string;
  red: string;
  blue: string;
  teal: string;
  border: string;
  soft: string;
};
const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    panel: '#fff',
    grid: '#d9dee5',
    ink: '#303744',
    muted: '#8b97a5',
    red: '#ef4050',
    blue: '#3c80a8',
    teal: '#1f9b8f',
    border: '#d2d9e2',
    soft: '#f0f2f5'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    grid: '#435169',
    ink: '#eef2f7',
    muted: '#9eabbc',
    red: '#fb7185',
    blue: '#60a5fa',
    teal: '#34d399',
    border: '#3c4b61',
    soft: '#253249'
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
  width = 4
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
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - ux * 13 - uy * 6, y2 - uy * 13 + ux * 6);
  ctx.lineTo(x2 - ux * 13 + uy * 6, y2 - uy * 13 - ux * 6);
  ctx.closePath();
  ctx.fill();
}
function drawCar(
  ctx: CanvasRenderingContext2D,
  state: UvtState,
  p: Palette,
  scale: number
): void {
  const x = 290 + Math.max(-120, Math.min(120, state.displacement * 4));
  const y = 106;
  ctx.fillStyle = p.ink;
  ctx.roundRect(x - 34, y - 22, CAR_BODY_WIDTH, 28, 6);
  ctx.fill();
  ctx.fillStyle = p.panel;
  ctx.roundRect(x - 20, y - 35, 40, 18, 6);
  ctx.fill();
  ctx.fillStyle = p.ink;
  ctx.beginPath();
  ctx.arc(x - 22, y + 8, 8, 0, Math.PI * 2);
  ctx.arc(x + 22, y + 8, 8, 0, Math.PI * 2);
  ctx.fill();
  const vLen = Math.max(12, Math.min(76, Math.abs(state.velocity) * 4));
  arrow(
    ctx,
    x,
    y - 30,
    x + Math.sign(state.velocity || 1) * vLen,
    y - 30,
    p.red,
    4
  );
  text(
    ctx,
    'v',
    x + Math.sign(state.velocity || 1) * (vLen + 12),
    y - 30,
    p.red,
    17 * scale,
    'center',
    700
  );
  arrow(
    ctx,
    x,
    y - 54,
    x +
      Math.sign(state.params.acceleration || 1) *
        Math.max(18, Math.min(70, Math.abs(state.params.acceleration) * 14)),
    y - 54,
    p.teal,
    4
  );
  text(
    ctx,
    'a',
    x + Math.sign(state.params.acceleration || 1) * 42,
    y - 54,
    p.teal,
    17 * scale,
    'center',
    700
  );
}
function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: UvtState,
  p: Palette,
  scale: number
): void {
  const x = FIELD_W;
  ctx.fillStyle = p.panel;
  ctx.fillRect(x, 0, BASE_W - FIELD_W, BASE_H);
  ctx.strokeStyle = p.border;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, BASE_H);
  ctx.stroke();
  text(ctx, '匀变速直线运动', x + 28, 38, p.ink, 20 * scale, 'left', 700);
  text(ctx, '初速度 v₀', x + 28, 92, p.ink, 15 * scale);
  text(
    ctx,
    `${state.params.v0.toFixed(0)} m/s`,
    x + 224,
    92,
    p.ink,
    16 * scale,
    'right',
    700
  );
  text(ctx, '加速度 a', x + 28, 147, p.ink, 15 * scale);
  text(
    ctx,
    `${state.params.acceleration.toFixed(0)} m/s²`,
    x + 224,
    147,
    p.ink,
    16 * scale,
    'right',
    700
  );
  ctx.fillStyle = p.soft;
  ctx.roundRect(x + 24, FORMULA_TOP, PANEL_WIDTH, FORMULA_HEIGHT, 10);
  ctx.fill();
  text(ctx, 'v = v₀ + at', x + 142, 211, p.ink, 16 * scale, 'center');
  text(ctx, 'x = v₀t + ½at²', x + 142, 238, p.ink, 16 * scale, 'center');
  ctx.strokeStyle = p.border;
  ctx.roundRect(x + 24, READOUT_TOP, PANEL_WIDTH, READOUT_HEIGHT, 10);
  ctx.stroke();
  text(ctx, '时间 t', x + 44, 318, p.ink, 15 * scale);
  text(
    ctx,
    `${state.time.toFixed(2)} s`,
    x + 240,
    318,
    p.ink,
    16 * scale,
    'right',
    700
  );
  text(ctx, '速度 v', x + 44, 356, p.ink, 15 * scale);
  text(
    ctx,
    `${state.velocity.toFixed(2)} m/s`,
    x + 240,
    356,
    p.red,
    16 * scale,
    'right',
    700
  );
  text(ctx, '位移 x', x + 44, 394, p.ink, 15 * scale);
  text(
    ctx,
    `${state.displacement.toFixed(2)} m`,
    x + 240,
    394,
    p.blue,
    16 * scale,
    'right',
    700
  );
  text(
    ctx,
    state.stopped ? '瞬时静止' : '运动中',
    x + 142,
    420,
    state.stopped ? p.teal : p.muted,
    13 * scale,
    'center',
    700
  );
}
export function createUvtView(options: CreateUvtViewOptions = {}) {
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: { mode: 'clamped', fallbackWidth: BASE_W, fallbackHeight: BASE_H },
    initialWidth: BASE_W,
    initialHeight: BASE_H,
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
    const fit = Math.min(width / BASE_W, height / BASE_H);
    const offsetY = (height - BASE_H * fit) / 2;
    const p = PALETTE[env.theme];
    const scale = env.contentScale() * stage.responsiveScale;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(0, offsetY);
    ctx.scale(fit, fit);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, FIELD_W, BASE_H);
    text(ctx, '真实物理空间位移演示', 320, 26, p.muted, 15 * scale, 'center');
    ctx.strokeStyle = p.grid;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(45, TRACK_Y);
    ctx.lineTo(TRACK_END_X, TRACK_Y);
    ctx.stroke();
    arrow(ctx, 55, TRACK_Y, TRACK_END_X, TRACK_Y, p.ink, 2);
    text(ctx, 'x（m）', 600, 148, p.ink, 14 * scale, 'right');
    text(ctx, '0', 310, 149, p.ink, 13 * scale, 'center');
    drawCar(ctx, state, p, scale);
    text(
      ctx,
      '速度 - 时间图像（v-t）',
      320,
      184,
      p.muted,
      17 * scale,
      'center',
      700
    );
    ctx.strokeStyle = p.grid;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i += 1) {
      const x = GRAPH_LEFT + (GRAPH_RIGHT - GRAPH_LEFT) * (i / GRAPH_MAX_T);
      ctx.beginPath();
      ctx.moveTo(x, GRAPH_TOP);
      ctx.lineTo(x, GRAPH_BOTTOM);
      ctx.stroke();
      text(ctx, `${i}`, x, GRAPH_BOTTOM + 18, p.ink, 11 * scale, 'center');
    }
    for (let i = -4; i <= 4; i += 1) {
      const v = i * 10;
      const y =
        GRAPH_TOP +
        (GRAPH_BOTTOM - GRAPH_TOP) * ((GRAPH_MAX_V - v) / (GRAPH_MAX_V * 2));
      ctx.beginPath();
      ctx.moveTo(GRAPH_LEFT, y);
      ctx.lineTo(GRAPH_RIGHT, y);
      ctx.stroke();
      text(ctx, `${v}`, GRAPH_LEFT - 12, y, p.ink, 11 * scale, 'right');
    }
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(GRAPH_LEFT, GRAPH_TOP - 8);
    ctx.lineTo(GRAPH_LEFT, GRAPH_BOTTOM);
    ctx.lineTo(GRAPH_RIGHT + 8, GRAPH_BOTTOM);
    ctx.stroke();
    const toY = (v: number) =>
      GRAPH_TOP +
      (GRAPH_BOTTOM - GRAPH_TOP) * ((GRAPH_MAX_V - v) / (GRAPH_MAX_V * 2));
    const pointX =
      GRAPH_LEFT + (GRAPH_RIGHT - GRAPH_LEFT) * (state.time / GRAPH_MAX_T);
    ctx.strokeStyle = p.red;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= 40; i += 1) {
      const t = GRAPH_MAX_T * (i / 40);
      const x = GRAPH_LEFT + (GRAPH_RIGHT - GRAPH_LEFT) * (i / 40);
      const y = toY(state.params.v0 + state.params.acceleration * t);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    if (state.params.showArea) {
      ctx.fillStyle = 'rgba(60,128,168,0.16)';
      ctx.beginPath();
      ctx.moveTo(GRAPH_LEFT, GRAPH_BOTTOM);
      ctx.lineTo(pointX, GRAPH_BOTTOM);
      ctx.lineTo(pointX, toY(state.velocity));
      ctx.lineTo(GRAPH_LEFT, toY(state.params.v0));
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = p.red;
    ctx.beginPath();
    ctx.arc(pointX, toY(state.velocity), 7, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, 'v = v₀ + at', 320, 602, p.muted, 14 * scale, 'center');
    drawPanel(ctx, state, p, scale);
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
