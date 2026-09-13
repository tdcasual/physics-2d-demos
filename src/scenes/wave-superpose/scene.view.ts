import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  waveComponent,
  waveSuperposeConstants,
  type WaveSuperposeState
} from './scene.sim';

export type CreateWaveSuperposeViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};
type Palette = {
  bg: string;
  panel: string;
  ink: string;
  muted: string;
  grid: string;
  axis: string;
  red: string;
  blue: string;
  teal: string;
  border: string;
  pill: string;
};
const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    panel: '#ffffff',
    ink: '#303744',
    muted: '#7d8997',
    grid: '#e0e5e9',
    axis: '#5e6873',
    red: '#ef4050',
    blue: '#4d86a9',
    teal: '#159f8b',
    border: '#d8dfe5',
    pill: '#f0f2f4'
  },
  dark: {
    bg: '#0d1523',
    panel: '#172235',
    ink: '#eef2f7',
    muted: '#aab8ca',
    grid: '#2a3a4e',
    axis: '#b6c4d6',
    red: '#ff7180',
    blue: '#79b2e1',
    teal: '#4ed9c0',
    border: '#3e4d64',
    pill: '#243249'
  }
};
const {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  graphLeft: GRAPH_L,
  graphRight: GRAPH_R,
  axisY: AXIS_Y,
  graphTop: GRAPH_T,
  graphBottom: GRAPH_B,
  graphXMin: X_MIN,
  graphXMax: X_MAX,
  yMax: Y_MAX,
  cardY: CARD_Y,
  cardHeight: CARD_H,
  axisLabelY: LABEL_Y,
  pointRadius: POINT_R
} = waveSuperposeConstants;
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
function card(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  p: Palette
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 14);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}
function px(x: number): number {
  return GRAPH_L + ((x - X_MIN) / (X_MAX - X_MIN)) * (GRAPH_R - GRAPH_L);
}
function py(y: number): number {
  return AXIS_Y - (y / Y_MAX) * (AXIS_Y - GRAPH_T);
}
function drawWave(
  ctx: CanvasRenderingContext2D,
  state: WaveSuperposeState,
  p: Palette,
  which: 'left' | 'right' | 'sum',
  scale: number
): void {
  ctx.beginPath();
  for (let x = X_MIN; x <= X_MAX; x += 0.04) {
    const y1 = waveComponent(
      x,
      state.time,
      state.amplitude1,
      state.wavelength1,
      state.direction1,
      'left'
    );
    const y2 = waveComponent(
      x,
      state.time,
      state.amplitude2,
      state.wavelength2,
      state.direction2,
      'right'
    );
    const y = which === 'left' ? y1 : which === 'right' ? y2 : y1 + y2;
    if (x === X_MIN) ctx.moveTo(px(x), py(y));
    else ctx.lineTo(px(x), py(y));
  }
  ctx.strokeStyle =
    which === 'left' ? p.red : which === 'right' ? p.blue : p.teal;
  ctx.lineWidth = which === 'sum' ? 4 * scale : 3 * scale;
  if (which !== 'sum') ctx.setLineDash([10, 7]);
  ctx.stroke();
  ctx.setLineDash([]);
}
export function createWaveSuperposeView(
  options: CreateWaveSuperposeViewOptions = {}
) {
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: { mode: 'clamped', fallbackWidth: BASE_W, fallbackHeight: BASE_H },
    initialWidth: BASE_W,
    initialHeight: BASE_H,
    eagerContext: true
  });
  let snapshot: WaveSuperposeState | null = null;
  function draw(state: WaveSuperposeState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(width / BASE_W, height / BASE_H);
    const offsetX = Math.max(0, (width - BASE_W * fit) / 2);
    const offsetY = Math.max(0, (height - BASE_H * fit) / 2);
    const scale = env.contentScale() * stage.responsiveScale;
    const p = PALETTE[env.theme];
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fit, fit);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, BASE_W, BASE_H);
    text(
      ctx,
      '机械波的相遇与叠加',
      BASE_W / 2,
      32,
      p.ink,
      24 * scale,
      'center',
      700
    );
    text(
      ctx,
      '波的叠加原理（矢量和）',
      BASE_W / 2,
      62,
      p.muted,
      14 * scale,
      'center'
    );
    ctx.strokeStyle = p.grid;
    ctx.lineWidth = 1;
    for (let x = GRAPH_L; x <= GRAPH_R; x += 56) {
      ctx.beginPath();
      ctx.moveTo(x, GRAPH_T);
      ctx.lineTo(x, GRAPH_B);
      ctx.stroke();
    }
    for (let y = GRAPH_T; y <= GRAPH_B; y += 48) {
      ctx.beginPath();
      ctx.moveTo(GRAPH_L, y);
      ctx.lineTo(GRAPH_R, y);
      ctx.stroke();
    }
    ctx.strokeStyle = p.axis;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(GRAPH_L, AXIS_Y);
    ctx.lineTo(GRAPH_R, AXIS_Y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px(0), GRAPH_T);
    ctx.lineTo(px(0), GRAPH_B);
    ctx.stroke();
    drawWave(ctx, state, p, 'left', scale);
    drawWave(ctx, state, p, 'right', scale);
    drawWave(ctx, state, p, 'sum', scale);
    const pointX = px(state.observationX);
    const pointY = py(state.sum);
    ctx.fillStyle = p.teal;
    ctx.beginPath();
    ctx.arc(pointX, pointY, POINT_R, 0, Math.PI * 2);
    ctx.fill();
    text(
      ctx,
      `x=${state.observationX.toFixed(1)}`,
      pointX,
      GRAPH_B + 24,
      p.muted,
      12 * scale,
      'center'
    );
    text(ctx, 'x / m', GRAPH_R - 8, LABEL_Y, p.muted, 13 * scale, 'right');
    text(ctx, 'y / m', px(0) + 14, GRAPH_T + 10, p.muted, 13 * scale, 'left');
    card(ctx, 28, CARD_Y, 1144, CARD_H, p);
    text(
      ctx,
      '波源 1（向右传播）',
      54,
      CARD_Y + 28,
      p.red,
      18 * scale,
      'left',
      700
    );
    text(
      ctx,
      '波源 2（向左传播）',
      872,
      CARD_Y + 28,
      p.blue,
      18 * scale,
      'left',
      700
    );
    text(
      ctx,
      `t = ${state.time.toFixed(2)} s`,
      BASE_W / 2,
      CARD_Y + 28,
      p.muted,
      14 * scale,
      'center',
      600
    );
    text(
      ctx,
      `y = y₁ + y₂     ${state.sum.toFixed(2)} = ${state.y1.toFixed(2)} + ${state.y2.toFixed(2)}`,
      BASE_W / 2,
      CARD_Y + 70,
      p.ink,
      17 * scale,
      'center',
      700
    );
    text(
      ctx,
      `A₁ ${state.amplitude1.toFixed(1)} m   λ₁ ${state.wavelength1.toFixed(1)} m`,
      54,
      CARD_Y + 100,
      p.red,
      13 * scale
    );
    text(
      ctx,
      `A₂ ${state.amplitude2.toFixed(1)} m   λ₂ ${state.wavelength2.toFixed(1)} m`,
      872,
      CARD_Y + 100,
      p.blue,
      13 * scale
    );
    ctx.restore();
  }
  return {
    render(state: WaveSuperposeState) {
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
