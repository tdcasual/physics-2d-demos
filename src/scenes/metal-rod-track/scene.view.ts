import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { metalRodConstants, type MetalRodState } from './scene.sim';
import { drawChargeMode } from './renderer/draw-charge';
import {
  createOcclusionWatcher,
  measureStageOcclusions,
  occlusionSignature
} from './renderer/stage-occlusion';

export type CreateMetalRodViewOptions = {
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
  border: string;
  grid: string;
  rail: string;
  rod: string;
  teal: string;
  orange: string;
  red: string;
  blue: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    panel: '#ffffff',
    ink: '#303744',
    muted: '#7d8997',
    border: '#d8dfe5',
    grid: '#dbe3e8',
    rail: '#66717c',
    rod: '#7b8794',
    teal: '#20b7d9',
    orange: '#ff7600',
    red: '#ef4050',
    blue: '#2187c9'
  },
  dark: {
    bg: '#0d1523',
    panel: '#172235',
    ink: '#eef2f7',
    muted: '#a9b8cc',
    border: '#3c4d65',
    grid: '#2a3a4e',
    rail: '#9cabbc',
    rod: '#b7c4d2',
    teal: '#40d4ee',
    orange: '#ff9a3d',
    red: '#ff7180',
    blue: '#6eb7f4'
  }
};

const {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  fieldWidth: FIELD_W,
  gridStep: GRID_STEP,
  railLeft: RAIL_LEFT,
  railRight: RAIL_RIGHT,
  railTop: RAIL_TOP,
  railBottom: RAIL_BOTTOM,
  rodWidth: ROD_W,
  rodMinX: ROD_MIN_X,
  rodMaxX: ROD_MAX_X,
  resistorX: RESISTOR_X,
  resistorY: RESISTOR_Y,
  resistorHeight: RESISTOR_H,
  loopLeft: LOOP_LEFT,
  loopRight: LOOP_RIGHT,
  loopTop: LOOP_TOP,
  loopBottom: LOOP_BOTTOM,
  infoX: INFO_X,
  infoY: INFO_Y,
  infoWidth: INFO_W,
  infoHeight: INFO_H,
  trackX: TRACK_X,
  trackY: TRACK_Y,
  trackWidth: TRACK_W,
  trackHeight: TRACK_H,
  rodLength: ROD_LENGTH
} = metalRodConstants;

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

function round(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  p: Palette
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();
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
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - 14 * Math.cos(angle - Math.PI / 6),
    y2 - 14 * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    x2 - 14 * Math.cos(angle + Math.PI / 6),
    y2 - 14 * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
}

function drawFieldMarks(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 2;
  for (let x = LOOP_LEFT + GRID_STEP; x < LOOP_RIGHT; x += GRID_STEP) {
    for (let y = LOOP_TOP + GRID_STEP; y < LOOP_BOTTOM; y += GRID_STEP) {
      ctx.beginPath();
      ctx.moveTo(x - 6, y - 6);
      ctx.lineTo(x + 6, y + 6);
      ctx.moveTo(x + 6, y - 6);
      ctx.lineTo(x - 6, y + 6);
      ctx.stroke();
    }
  }
  text(ctx, 'B ⊗', LOOP_RIGHT - 10, LOOP_TOP - 24, p.blue, 15, 'right', 700);
}

function drawCircuit(
  ctx: CanvasRenderingContext2D,
  state: MetalRodState,
  p: Palette,
  scale: number
): void {
  const rodX =
    ROD_MIN_X + (state.position / ROD_LENGTH) * (ROD_MAX_X - ROD_MIN_X);
  ctx.strokeStyle = p.rail;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(RAIL_LEFT, RAIL_TOP);
  ctx.lineTo(rodX, RAIL_TOP);
  ctx.moveTo(rodX, RAIL_BOTTOM);
  ctx.lineTo(RAIL_RIGHT, RAIL_BOTTOM);
  ctx.moveTo(RAIL_RIGHT, RAIL_TOP);
  ctx.lineTo(RAIL_RIGHT, RAIL_BOTTOM);
  ctx.moveTo(RAIL_LEFT, RAIL_TOP);
  ctx.lineTo(RAIL_LEFT, RESISTOR_Y - RESISTOR_H / 2);
  ctx.moveTo(RAIL_LEFT, RESISTOR_Y + RESISTOR_H / 2);
  ctx.lineTo(RAIL_LEFT, RAIL_BOTTOM);
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.strokeStyle = p.teal;
  ctx.lineWidth = 4;
  ctx.setLineDash([16, 14]);
  ctx.beginPath();
  ctx.moveTo(RAIL_LEFT, RAIL_TOP);
  ctx.lineTo(rodX, RAIL_TOP);
  ctx.moveTo(rodX, RAIL_BOTTOM);
  ctx.lineTo(RAIL_RIGHT, RAIL_BOTTOM);
  ctx.moveTo(RAIL_RIGHT, RAIL_TOP);
  ctx.lineTo(RAIL_RIGHT, RAIL_BOTTOM);
  ctx.moveTo(RAIL_LEFT, RAIL_TOP);
  ctx.lineTo(RAIL_LEFT, RESISTOR_Y - RESISTOR_H / 2);
  ctx.moveTo(RAIL_LEFT, RESISTOR_Y + RESISTOR_H / 2);
  ctx.lineTo(RAIL_LEFT, RAIL_BOTTOM);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  ctx.strokeRect(RESISTOR_X - 13, RESISTOR_Y - RESISTOR_H / 2, 26, RESISTOR_H);
  text(ctx, 'R', RESISTOR_X - 27, RESISTOR_Y, p.ink, 18 * scale, 'right', 700);
  const gradient = ctx.createLinearGradient(
    rodX - ROD_W,
    RAIL_TOP,
    rodX + ROD_W,
    RAIL_TOP
  );
  gradient.addColorStop(0, p.rod);
  gradient.addColorStop(0.5, p.panel);
  gradient.addColorStop(1, p.rod);
  ctx.fillStyle = gradient;
  ctx.fillRect(
    rodX - ROD_W,
    RAIL_TOP - 22,
    ROD_W * 2,
    RAIL_BOTTOM - RAIL_TOP + 44
  );
  ctx.strokeStyle = p.rail;
  ctx.lineWidth = 2;
  ctx.strokeRect(
    rodX - ROD_W,
    RAIL_TOP - 22,
    ROD_W * 2,
    RAIL_BOTTOM - RAIL_TOP + 44
  );
  const vectorY = (RAIL_TOP + RAIL_BOTTOM) / 2;
  const vectorStart = rodX + 44;
  const velocityLength = Math.max(34, Math.min(92, state.velocity * 4));
  arrow(
    ctx,
    vectorStart,
    vectorY,
    vectorStart + velocityLength,
    vectorY,
    p.teal,
    4
  );
  text(
    ctx,
    'v',
    vectorStart + velocityLength + 16,
    vectorY - 12,
    p.teal,
    18 * scale,
    'center',
    700
  );
  arrow(
    ctx,
    rodX - 44,
    vectorY + 56,
    rodX - 44 - Math.max(30, Math.min(84, state.magneticForce * 50)),
    vectorY + 56,
    p.orange,
    4
  );
  text(ctx, 'Fₐ', rodX - 82, vectorY + 32, p.orange, 17 * scale, 'center', 700);
  if (state.mode === 'pull') {
    arrow(ctx, rodX + 42, vectorY - 58, rodX + 42 + 58, vectorY - 58, p.red, 4);
    text(ctx, 'F', rodX + 112, vectorY - 72, p.red, 17 * scale, 'center', 700);
  }
  text(
    ctx,
    'ΔS 增大 → 产生 E',
    RAIL_LEFT + 142,
    RAIL_BOTTOM + 48,
    p.blue,
    15 * scale,
    'left',
    600
  );
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  state: MetalRodState,
  p: Palette,
  scale: number
): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, FIELD_W, BASE_H);
  round(ctx, TRACK_X, TRACK_Y, TRACK_W, TRACK_H, 16, p);
  drawFieldMarks(ctx, p);
  text(ctx, '单轨金属棒切割磁感线', 366, 30, p.ink, 24 * scale, 'left', 700);
  text(
    ctx,
    '右手定则 · 安培力与阻尼',
    366,
    60,
    p.muted,
    13 * scale,
    'left',
    600
  );
  round(ctx, INFO_X, INFO_Y, INFO_W, INFO_H, 14, p);
  text(
    ctx,
    '核心法则',
    INFO_X + 20,
    INFO_Y + 26,
    p.ink,
    16 * scale,
    'left',
    700
  );
  text(
    ctx,
    '右手定则：B、v、I',
    INFO_X + 20,
    INFO_Y + 58,
    p.teal,
    13 * scale,
    'left',
    600
  );
  text(
    ctx,
    '左手定则：Fₐ 与 v 相反',
    INFO_X + 20,
    INFO_Y + 86,
    p.orange,
    13 * scale,
    'left',
    600
  );
  text(
    ctx,
    state.mode === 'pull' ? '恒定拉力加速' : '初速度阻尼滑行',
    INFO_X + 20,
    INFO_Y + 118,
    p.muted,
    13 * scale,
    'left',
    600
  );
  drawCircuit(ctx, state, p, scale);
  round(ctx, 34, 592, 736, 92, 12, p);
  text(
    ctx,
    state.status,
    56,
    618,
    state.mode === 'pull' ? p.red : p.teal,
    18 * scale,
    'left',
    700
  );
  text(
    ctx,
    `E = BLv = ${state.emf.toFixed(2)} V`,
    56,
    650,
    p.ink,
    14 * scale,
    'left',
    600
  );
  text(
    ctx,
    `I = E/R = ${state.current.toFixed(2)} A`,
    300,
    650,
    p.blue,
    14 * scale,
    'left',
    600
  );
  text(
    ctx,
    `Fₐ = ${state.magneticForce.toFixed(2)} N`,
    548,
    650,
    p.orange,
    14 * scale,
    'left',
    600
  );
}

export function createMetalRodView(options: CreateMetalRodViewOptions = {}) {
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
  let snapshot: MetalRodState | null = null;
  const canvas = options.canvas ?? null;
  let lastOcclusionKey = '';
  // 浮层（读数面板 / 播放条）变化时重绘：暂停状态下也能及时避让
  const occlusionWatcher = createOcclusionWatcher(
    () => canvas,
    () => {
      if (!snapshot || snapshot.mode !== 'charge') return;
      const key = occlusionSignature(
        measureStageOcclusions(canvas, stage.cssWidth, stage.cssHeight)
      );
      if (key !== lastOcclusionKey) draw(snapshot);
    }
  );
  function draw(state: MetalRodState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    if (state.mode === 'charge') {
      occlusionWatcher.watch();
      const occlusions = measureStageOcclusions(canvas, width, height);
      lastOcclusionKey = occlusionSignature(occlusions);
      drawChargeMode({
        ctx,
        width,
        height,
        theme: env.theme,
        responsiveScale: stage.responsiveScale,
        contentScale: env.contentScale(),
        occlusions,
        state
      });
      return;
    }
    const fit = Math.min(width / BASE_W, height / BASE_H);
    const offsetX = Math.max(0, (width - BASE_W * fit) / 2);
    const offsetY = Math.max(0, (height - BASE_H * fit) / 2);
    const scale = env.contentScale() * stage.responsiveScale;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fit, fit);
    drawScene(ctx, state, PALETTE[env.theme], scale);
    ctx.restore();
  }
  return {
    render(state: MetalRodState) {
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
      occlusionWatcher.dispose();
      stage.release();
    }
  };
}
