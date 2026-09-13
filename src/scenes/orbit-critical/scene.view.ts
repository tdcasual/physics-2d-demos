import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { orbitCriticalConstants, type OrbitCriticalState } from './scene.sim';

export type CreateOrbitCriticalViewOptions = {
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
  ring: string;
  ball: string;
  blue: string;
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
    grid: '#e1e5e8',
    ring: '#454e57',
    ball: '#f59e0b',
    blue: '#2589df',
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
    ring: '#aab7c8',
    ball: '#fbbf24',
    blue: '#70b2f5',
    red: '#ff7180',
    teal: '#4ed9c0',
    border: '#3e4d64'
  }
};
const {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  fieldWidth: FIELD_W,
  centerX: CX,
  centerY: CY,
  orbitRadius: ORBIT_R,
  circleLeft: CIRCLE_L,
  circleRight: CIRCLE_R,
  circleTop: CIRCLE_T,
  circleBottom: CIRCLE_B,
  cardX: CARD_X,
  cardY: CARD_Y,
  cardWidth: CARD_W,
  cardHeight: CARD_H,
  gridStep: GRID_STEP,
  vectorScale: VECTOR_SCALE
} = orbitCriticalConstants;
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
    x2 - 13 * Math.cos(angle - Math.PI / 6),
    y2 - 13 * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    x2 - 13 * Math.cos(angle + Math.PI / 6),
    y2 - 13 * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
}
export function createOrbitCriticalView(
  options: CreateOrbitCriticalViewOptions = {}
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
  let snapshot: OrbitCriticalState | null = null;
  function draw(state: OrbitCriticalState): void {
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
      '圆周运动不脱离轨道',
      FIELD_W / 2,
      32,
      p.ink,
      24 * scale,
      'center',
      700
    );
    text(
      ctx,
      '最高点临界速度与约束力',
      FIELD_W / 2,
      62,
      p.muted,
      14 * scale,
      'center'
    );
    ctx.strokeStyle = p.grid;
    ctx.lineWidth = 1;
    for (let x = CIRCLE_L; x <= CIRCLE_R; x += GRID_STEP) {
      ctx.beginPath();
      ctx.moveTo(x, CIRCLE_T);
      ctx.lineTo(x, CIRCLE_B);
      ctx.stroke();
    }
    for (let y = CIRCLE_T; y <= CIRCLE_B; y += GRID_STEP) {
      ctx.beginPath();
      ctx.moveTo(CIRCLE_L, y);
      ctx.lineTo(CIRCLE_R, y);
      ctx.stroke();
    }
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = p.muted;
    ctx.beginPath();
    ctx.moveTo(CIRCLE_L, CY);
    ctx.lineTo(CIRCLE_R, CY);
    ctx.stroke();
    ctx.setLineDash([]);
    text(ctx, '最高点', CIRCLE_L + 12, CIRCLE_T - 18, p.muted, 13 * scale);
    text(ctx, '等高线', CIRCLE_L + 12, CY - 18, p.muted, 13 * scale);
    ctx.strokeStyle = p.ring;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(CX, CY, ORBIT_R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = p.border;
    ctx.lineWidth = 14;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(CX, CY, ORBIT_R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    const pointX = state.x;
    const pointY = state.y;
    ctx.fillStyle = p.ball;
    ctx.beginPath();
    ctx.arc(pointX, pointY, 16, 0, Math.PI * 2);
    ctx.fill();
    const radialX = CX - pointX;
    const radialY = CY - pointY;
    const radialLength = Math.hypot(radialX, radialY) || 1;
    const tangentX = -radialY / radialLength;
    const tangentY = radialX / radialLength;
    if (state.showVectors) {
      arrow(
        ctx,
        pointX,
        pointY,
        pointX + tangentX * Math.min(110, state.speed * VECTOR_SCALE),
        pointY + tangentY * Math.min(110, state.speed * VECTOR_SCALE),
        p.teal,
        4
      );
      arrow(
        ctx,
        pointX,
        pointY,
        pointX + (radialX / radialLength) * 90,
        pointY + (radialY / radialLength) * 90,
        p.blue,
        4
      );
      arrow(
        ctx,
        pointX,
        pointY,
        pointX - (radialX / radialLength) * 72,
        pointY - (radialY / radialLength) * 72,
        p.red,
        4
      );
      text(
        ctx,
        'v',
        pointX + tangentX * 100,
        pointY + tangentY * 100,
        p.teal,
        18 * scale,
        'center',
        700
      );
      text(
        ctx,
        'Fₙ',
        pointX + (radialX / radialLength) * 105,
        pointY + (radialY / radialLength) * 105,
        p.blue,
        16 * scale,
        'center',
        700
      );
      text(
        ctx,
        'G',
        pointX - (radialX / radialLength) * 86,
        pointY - (radialY / radialLength) * 86,
        p.red,
        16 * scale,
        'center',
        700
      );
    }
    card(ctx, CARD_X, CARD_Y, CARD_W, CARD_H, p);
    text(
      ctx,
      state.model === 'rope' ? '绳模型' : '杆模型',
      CARD_X + 24,
      CARD_Y + 26,
      state.model === 'rope' ? p.teal : p.blue,
      18 * scale,
      'left',
      700
    );
    text(
      ctx,
      state.status,
      CARD_X + 188,
      CARD_Y + 26,
      state.status.includes('脱轨') ? p.red : p.teal,
      18 * scale,
      'left',
      700
    );
    text(
      ctx,
      `v = ${state.speed.toFixed(2)} m/s    Fₙ = ${state.normalForce.toFixed(2)} N    aᵣ = ${(state.speed ** 2 / state.radius).toFixed(2)} m/s²`,
      CARD_X + 24,
      CARD_Y + 60,
      p.ink,
      14 * scale
    );
    text(
      ctx,
      `临界底速 √(5gR) = ${state.criticalBottomSpeed.toFixed(2)} m/s`,
      CARD_X + 24,
      CARD_Y + 82,
      p.muted,
      13 * scale
    );
    ctx.restore();
  }
  return {
    render(state: OrbitCriticalState) {
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
