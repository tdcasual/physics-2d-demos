import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  boundedMagneticConstants,
  type BoundedMagneticState,
  type Point
} from './scene.sim';

export type CreateBoundedMagneticViewOptions = {
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
  field: string;
  path: string;
  particle: string;
  red: string;
  teal: string;
  border: string;
};
const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    panel: '#ffffff',
    ink: '#303744',
    muted: '#7d8997',
    grid: '#dde5ea',
    field: '#dff2f7',
    path: '#467fa4',
    particle: '#ef4050',
    red: '#ef4050',
    teal: '#159f8b',
    border: '#d8dfe5'
  },
  dark: {
    bg: '#0d1523',
    panel: '#172235',
    ink: '#eef2f7',
    muted: '#aab8ca',
    grid: '#2a3a4e',
    field: '#16364a',
    path: '#79b2e1',
    particle: '#ff7180',
    red: '#ff7180',
    teal: '#4ed9c0',
    border: '#3e4d64'
  }
};
const {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  fieldWidth: FIELD_W,
  fieldLeft: FIELD_L,
  fieldRight: FIELD_R,
  fieldTop: FIELD_T,
  fieldBottom: FIELD_B,
  fieldCenterX: CX,
  fieldCenterY: CY,
  gridStep: GRID_STEP,
  particleRadius: PARTICLE_R,
  vectorLength: VECTOR_LENGTH,
  infoX: INFO_X,
  infoY: INFO_Y,
  infoWidth: INFO_W,
  infoHeight: INFO_H,
  cardX: CARD_X,
  cardY: CARD_Y,
  cardWidth: CARD_W,
  cardHeight: CARD_H
} = boundedMagneticConstants;
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
  w: number,
  h: number,
  p: Palette
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}
function arrow(
  ctx: CanvasRenderingContext2D,
  start: Point,
  end: Point,
  color: string,
  width: number
): void {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(
    end.x - 13 * Math.cos(angle - Math.PI / 6),
    end.y - 13 * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    end.x - 13 * Math.cos(angle + Math.PI / 6),
    end.y - 13 * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
}
function drawShape(
  ctx: CanvasRenderingContext2D,
  state: BoundedMagneticState,
  p: Palette
): void {
  ctx.save();
  ctx.fillStyle = `${p.field}aa`;
  ctx.strokeStyle = p.path;
  ctx.lineWidth = 3;
  if (state.shape === 'circle') {
    ctx.beginPath();
    ctx.arc(CX, CY, state.fieldSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (state.shape === 'triangle') {
    ctx.beginPath();
    ctx.moveTo(CX, CY - state.fieldSize);
    ctx.lineTo(CX - state.fieldSize * 0.88, CY + state.fieldSize * 0.5);
    ctx.lineTo(CX + state.fieldSize * 0.88, CY + state.fieldSize * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillRect(CX, FIELD_T, FIELD_R - CX, FIELD_B - FIELD_T);
    ctx.beginPath();
    ctx.moveTo(CX, FIELD_T);
    ctx.lineTo(CX, FIELD_B);
    ctx.stroke();
  }
  for (let x = FIELD_L + GRID_STEP; x < FIELD_R; x += GRID_STEP)
    for (let y = FIELD_T + GRID_STEP; y < FIELD_B; y += GRID_STEP) {
      if (
        state.shape === 'circle' &&
        Math.hypot(x - CX, y - CY) > state.fieldSize
      )
        continue;
      ctx.strokeStyle = p.muted;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - 5, y - 5);
      ctx.lineTo(x + 5, y + 5);
      ctx.moveTo(x + 5, y - 5);
      ctx.lineTo(x - 5, y + 5);
      ctx.stroke();
    }
  ctx.restore();
}
export function createBoundedMagneticView(
  options: CreateBoundedMagneticViewOptions = {}
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
  let snapshot: BoundedMagneticState | null = null;
  function draw(state: BoundedMagneticState): void {
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
    ctx.fillRect(0, 0, FIELD_W, BASE_H);
    text(
      ctx,
      '带电粒子在有界磁场中的运动',
      560,
      32,
      p.ink,
      22 * scale,
      'center',
      700
    );
    text(
      ctx,
      '边界形状改变，轨迹随之偏转',
      560,
      60,
      p.muted,
      13 * scale,
      'center'
    );
    drawShape(ctx, state, p);
    round(ctx, INFO_X, INFO_Y, INFO_W, INFO_H, p);
    text(
      ctx,
      '有界磁场',
      INFO_X + 20,
      INFO_Y + 26,
      p.ink,
      16 * scale,
      'left',
      700
    );
    text(
      ctx,
      state.shape === 'circle'
        ? '圆形磁场'
        : state.shape === 'triangle'
          ? '正三角形磁场'
          : '半无界直线',
      INFO_X + 20,
      INFO_Y + 58,
      p.teal,
      14 * scale
    );
    text(
      ctx,
      state.model === 'standard'
        ? '标准模型'
        : state.model === 'rotate'
          ? '旋转圆模型'
          : '缩放圆模型',
      INFO_X + 20,
      INFO_Y + 88,
      p.muted,
      13 * scale
    );
    text(
      ctx,
      'B ⊗',
      INFO_X + 198,
      INFO_Y + 88,
      p.path,
      13 * scale,
      'left',
      700
    );
    ctx.strokeStyle = p.path;
    ctx.lineWidth = 4;
    ctx.beginPath();
    state.trajectory.forEach((point, index) =>
      index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)
    );
    ctx.stroke();
    if (state.trajectory.length > 1) {
      const last = state.trajectory.at(-1)!;
      const prev = state.trajectory.at(-2)!;
      arrow(ctx, prev, last, p.path, 3);
    }
    ctx.fillStyle = p.particle;
    ctx.beginPath();
    ctx.arc(state.position.x, state.position.y, PARTICLE_R, 0, Math.PI * 2);
    ctx.fill();
    if (state.showVectors) {
      const vEnd = {
        x: state.position.x + Math.cos(state.velocityAngle) * VECTOR_LENGTH,
        y: state.position.y + Math.sin(state.velocityAngle) * VECTOR_LENGTH
      };
      const fEnd = {
        x: state.position.x + Math.cos(state.forceAngle) * VECTOR_LENGTH,
        y: state.position.y + Math.sin(state.forceAngle) * VECTOR_LENGTH
      };
      arrow(ctx, state.position, vEnd, p.teal, 4);
      arrow(ctx, state.position, fEnd, p.red, 4);
      text(ctx, 'v', vEnd.x + 12, vEnd.y, p.teal, 16 * scale, 'center', 700);
      text(ctx, 'F', fEnd.x + 12, fEnd.y, p.red, 16 * scale, 'center', 700);
    }
    round(ctx, CARD_X, CARD_Y, CARD_W, CARD_H, p);
    text(
      ctx,
      state.status,
      CARD_X + 24,
      CARD_Y + 28,
      p.teal,
      18 * scale,
      'left',
      700
    );
    text(
      ctx,
      `偏转圆心角 Δθ = ${state.deflectionAngle.toFixed(1)}°`,
      CARD_X + 240,
      CARD_Y + 28,
      p.ink,
      14 * scale
    );
    text(
      ctx,
      `轨道半径 r = ${state.orbitRadius.toFixed(1)}    t = ${state.time.toFixed(2)} s`,
      CARD_X + 24,
      CARD_Y + 64,
      p.muted,
      14 * scale
    );
    text(ctx, 'qvB = mv²/r', CARD_X + 540, CARD_Y + 64, p.path, 14 * scale);
    ctx.restore();
  }
  return {
    render(state: BoundedMagneticState) {
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
