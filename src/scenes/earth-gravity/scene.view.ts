import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { earthGravityConstants, type EarthGravityState } from './scene.sim';

export type CreateEarthGravityViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

type Palette = {
  bg: string;
  panel: string;
  soft: string;
  grid: string;
  ink: string;
  muted: string;
  border: string;
  blue: string;
  red: string;
  teal: string;
  gold: string;
  earth: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    panel: '#ffffff',
    soft: '#f2f5f7',
    grid: '#dbe3eb',
    ink: '#303744',
    muted: '#8391a3',
    border: '#d5dee7',
    blue: '#1689c5',
    red: '#ef4050',
    teal: '#269d90',
    gold: '#eaae23',
    earth: '#31aada'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    soft: '#223249',
    grid: '#3c506b',
    ink: '#eef2f7',
    muted: '#9cabbd',
    border: '#40536d',
    blue: '#55c5f4',
    red: '#fb7185',
    teal: '#4dd4c0',
    gold: '#fbbf24',
    earth: '#1684c2'
  }
};

const {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  fieldWidth: FIELD_W,
  panelX: PANEL_X,
  panelWidth: PANEL_W,
  earthDrawRadius: EARTH_R,
  vectorScale: VECTOR_SCALE,
  panelTop: PANEL_TOP,
  panelBottom: PANEL_BOTTOM,
  alphaArcRadius: ALPHA_ARC_RADIUS,
  alphaArcScale: ALPHA_ARC_SCALE,
  degreesHalfTurn: DEGREES_HALF_TURN,
  sliderInset: SLIDER_INSET,
  sliderY: SLIDER_Y,
  maxLatitude: MAX_LATITUDE
} = earthGravityConstants;

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

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 12
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
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
  const length = Math.hypot(dx, dy);
  if (length < 2) return;
  const ux = dx / length;
  const uy = dy / length;
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

function drawEarth(
  ctx: CanvasRenderingContext2D,
  state: EarthGravityState,
  p: Palette
): { x: number; y: number; cx: number; cy: number } {
  const cx = 368;
  const cy = 356;
  const theta = (state.params.latitude * Math.PI) / 180;
  const pointAngle = -0.42;
  const latitudeRadius = EARTH_R * Math.cos(theta);
  const px = cx + latitudeRadius * Math.cos(pointAngle);
  const py =
    cy -
    EARTH_R * Math.sin(theta) +
    latitudeRadius * Math.sin(pointAngle) * 0.25;
  const gradient = ctx.createRadialGradient(
    cx - 70,
    cy - 80,
    30,
    cx,
    cy,
    EARTH_R
  );
  gradient.addColorStop(0, '#b7edff');
  gradient.addColorStop(0.6, p.earth);
  gradient.addColorStop(1, '#0875b6');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, EARTH_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.blue;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = p.muted;
  ctx.setLineDash([10, 8]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - EARTH_R - 32);
  ctx.lineTo(cx, cy + EARTH_R + 32);
  ctx.moveTo(cx - EARTH_R - 32, cy);
  ctx.lineTo(cx + EARTH_R + 32, cy);
  ctx.stroke();
  ctx.setLineDash([]);
  text(ctx, 'N', cx, cy - EARTH_R - 48, p.ink, 20, 'center', 700);
  text(ctx, 'S', cx, cy + EARTH_R + 50, p.ink, 20, 'center', 700);
  text(ctx, 'O', cx - 18, cy + 23, p.ink, 22, 'center', 700);
  text(ctx, '赤道面', cx + EARTH_R + 18, cy + 4, p.muted, 16, 'left', 600);
  ctx.strokeStyle = '#55c5f4';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(
    cx,
    cy - EARTH_R * Math.sin(theta),
    latitudeRadius,
    28,
    0,
    0,
    Math.PI * 2
  );
  ctx.stroke();
  return { x: px, y: py, cx, cy };
}

function drawForces(
  ctx: CanvasRenderingContext2D,
  state: EarthGravityState,
  point: { x: number; y: number; cx: number; cy: number },
  p: Palette
): void {
  if (!state.params.showForces) return;
  const theta = (state.params.latitude * Math.PI) / 180;
  const uM = { x: -Math.cos(theta), y: Math.sin(theta) };
  const mLength = state.gravitationalForce * VECTOR_SCALE;
  const cLength = state.centripetalForce * VECTOR_SCALE * 80;
  const fmx = point.x + uM.x * mLength;
  const fmy = point.y + uM.y * mLength;
  const fcx = point.x - cLength;
  const fcy = point.y;
  const gX = point.x + (fmx - fcx) * 0.88;
  const gY = point.y + (fmy - fcy) * 0.88;
  arrow(ctx, point.x, point.y, fmx, fmy, p.blue, 5);
  text(ctx, 'F万', fmx + 10, fmy - 10, p.blue, 18, 'left', 700);
  arrow(ctx, point.x, point.y, fcx, fcy, p.teal, 5);
  text(ctx, 'F向', fcx + 6, fcy - 16, p.teal, 18, 'left', 700);
  arrow(ctx, point.x, point.y, gX, gY, p.red, 5);
  text(ctx, 'G', gX + 8, gY + 10, p.red, 19, 'left', 700);
  if (state.params.showComponents) {
    ctx.strokeStyle = p.gold;
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fmx, fmy);
    ctx.lineTo(gX, gY);
    ctx.stroke();
    ctx.setLineDash([]);
    text(
      ctx,
      'G = F万 − F向',
      point.x - 10,
      point.y + 78,
      p.gold,
      16,
      'center',
      700
    );
  }
  ctx.strokeStyle = p.gold;
  ctx.setLineDash([7, 6]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(point.cx, point.y);
  ctx.lineTo(point.x, point.y);
  ctx.stroke();
  ctx.setLineDash([]);
  text(
    ctx,
    'r',
    (point.cx + point.x) / 2,
    point.y - 14,
    p.teal,
    17,
    'center',
    700
  );
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(
    point.x,
    point.y,
    ALPHA_ARC_RADIUS,
    Math.PI + 0.2,
    Math.PI +
      0.2 +
      ((state.angle * Math.PI) / DEGREES_HALF_TURN) * ALPHA_ARC_SCALE
  );
  ctx.stroke();
  text(ctx, 'α', point.x - 44, point.y + 31, p.teal, 19, 'center', 700);
}

function metric(
  ctx: CanvasRenderingContext2D,
  y: number,
  label: string,
  value: string,
  color: string,
  p: Palette
): void {
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PANEL_X + 20, y + 38);
  ctx.lineTo(PANEL_X + PANEL_W - 20, y + 38);
  ctx.stroke();
  text(ctx, label, PANEL_X + 22, y + 15, color, 18, 'left', 700);
  ctx.fillStyle = p.panel;
  ctx.strokeStyle = p.border;
  roundedRect(ctx, PANEL_X + PANEL_W - 170, y, 148, 32, 8);
  ctx.fill();
  ctx.stroke();
  text(ctx, value, PANEL_X + PANEL_W - 96, y + 16, p.ink, 17, 'center', 700);
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: EarthGravityState,
  p: Palette
): void {
  ctx.fillStyle = p.panel;
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1;
  roundedRect(ctx, PANEL_X, PANEL_TOP, PANEL_W, PANEL_BOTTOM - PANEL_TOP, 16);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = p.red;
  roundedRect(ctx, PANEL_X + 28, PANEL_TOP + 38, 8, 38, 4);
  ctx.fill();
  text(
    ctx,
    '万有引力与重力解构',
    PANEL_X + 52,
    PANEL_TOP + 57,
    p.ink,
    24,
    'left',
    700
  );
  ctx.fillStyle = p.soft;
  roundedRect(ctx, PANEL_X + 28, PANEL_TOP + 102, PANEL_W - 56, 94, 12);
  ctx.fill();
  text(ctx, '教学提示', PANEL_X + 48, PANEL_TOP + 126, p.gold, 15, 'left', 700);
  text(
    ctx,
    '向心力被夸大显示，便于观察',
    PANEL_X + 48,
    PANEL_TOP + 153,
    p.ink,
    14,
    'left',
    500
  );
  text(
    ctx,
    'F万 = G + F向 的矢量关系。',
    PANEL_X + 48,
    PANEL_TOP + 176,
    p.ink,
    14,
    'left',
    500
  );
  ctx.fillStyle = p.soft;
  roundedRect(ctx, PANEL_X + 28, PANEL_TOP + 214, PANEL_W - 56, 72, 12);
  ctx.fill();
  text(
    ctx,
    '所在纬度 θ',
    PANEL_X + 48,
    PANEL_TOP + 238,
    p.ink,
    18,
    'left',
    700
  );
  text(
    ctx,
    `${state.params.latitude.toFixed(1)}°`,
    PANEL_X + PANEL_W - 48,
    PANEL_TOP + 238,
    p.blue,
    21,
    'right',
    700
  );
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(PANEL_X + SLIDER_INSET, PANEL_TOP + SLIDER_Y);
  ctx.lineTo(PANEL_X + PANEL_W - SLIDER_INSET, PANEL_TOP + SLIDER_Y);
  ctx.stroke();
  ctx.fillStyle = p.blue;
  ctx.beginPath();
  ctx.arc(
    PANEL_X +
      SLIDER_INSET +
      (PANEL_W - SLIDER_INSET * 2) * (state.params.latitude / MAX_LATITUDE),
    PANEL_TOP + SLIDER_Y,
    10,
    0,
    Math.PI * 2
  );
  ctx.fill();
  metric(
    ctx,
    PANEL_TOP + 308,
    '万有引力 F万',
    `${state.gravitationalForce.toFixed(4)} N`,
    p.blue,
    p
  );
  metric(
    ctx,
    PANEL_TOP + 365,
    '向心力 F向',
    `${state.centripetalForce.toFixed(4)} N`,
    p.teal,
    p
  );
  metric(
    ctx,
    PANEL_TOP + 422,
    '重力 G',
    `${state.weight.toFixed(4)} N`,
    p.red,
    p
  );
  metric(
    ctx,
    PANEL_TOP + 479,
    '引力重力偏角 α',
    `${state.angle.toFixed(3)}°`,
    p.teal,
    p
  );
  ctx.fillStyle = p.soft;
  roundedRect(ctx, PANEL_X + 28, PANEL_TOP + 548, PANEL_W - 56, 128, 12);
  ctx.fill();
  text(
    ctx,
    '核心考点推导',
    PANEL_X + 48,
    PANEL_TOP + 575,
    p.ink,
    18,
    'left',
    700
  );
  text(
    ctx,
    'r = R cos θ',
    PANEL_X + 48,
    PANEL_TOP + 610,
    p.ink,
    16,
    'left',
    600
  );
  text(
    ctx,
    'F向 = mω²r',
    PANEL_X + 48,
    PANEL_TOP + 637,
    p.teal,
    16,
    'left',
    600
  );
  text(
    ctx,
    'F万 = G + F向',
    PANEL_X + 48,
    PANEL_TOP + 664,
    p.red,
    16,
    'left',
    600
  );
}

export function createEarthGravityView(
  options: CreateEarthGravityViewOptions = {}
) {
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: { mode: 'clamped', fallbackWidth: BASE_W, fallbackHeight: BASE_H },
    initialWidth: BASE_W,
    initialHeight: BASE_H,
    eagerContext: true
  });
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode,
    demoHints: options.demoHints
  });
  let snapshot: EarthGravityState | null = null;
  let lastKey: string | null = null;

  function draw(next: EarthGravityState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const responsiveScale = stage.responsiveScale;
    const s =
      Math.min(width / BASE_W, height / BASE_H) * Math.min(1, responsiveScale);
    const ox = (width - BASE_W * s) / 2;
    const oy = (height - BASE_H * s) / 2;
    const p = PALETTE[env.theme];
    ctx.setTransform(s, 0, 0, s, ox, oy);
    ctx.clearRect(0, 0, BASE_W, BASE_H);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, BASE_W, BASE_H);
    text(
      ctx,
      '地球表面：三力矢量关系',
      FIELD_W / 2,
      28,
      p.ink,
      22,
      'center',
      700
    );
    const point = drawEarth(ctx, next, p);
    ctx.fillStyle = p.panel;
    ctx.strokeStyle = p.border;
    ctx.lineWidth = 1;
    roundedRect(ctx, 24, 56, FIELD_W - 48, 44, 10);
    ctx.fill();
    ctx.stroke();
    text(
      ctx,
      '球体模型：忽略地球扁率，只保留自转影响',
      FIELD_W / 2,
      78,
      p.muted,
      14,
      'center',
      500
    );
    drawForces(ctx, next, point, p);
    ctx.fillStyle = p.red;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    drawPanel(ctx, next, p);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  return {
    render(next: EarthGravityState): void {
      snapshot = next;
      const key = `${next.time.toFixed(3)}|${env.theme}|${env.mode}|${stage.cssWidth}x${stage.cssHeight}|${next.params.latitude}|${next.params.mass}|${next.params.showForces}|${next.params.showComponents}`;
      if (key === lastKey) return;
      lastKey = key;
      draw(next);
    },
    resize(): void {
      stage.resize();
      lastKey = null;
      if (snapshot) draw(snapshot);
    },
    setTheme(nextTheme: TeachingTheme): void {
      env.setTheme(nextTheme);
      lastKey = null;
      if (snapshot) draw(snapshot);
    },
    setMode(nextMode: TeachingMode, hints?: DemoRenderHints): void {
      env.setMode(nextMode, hints);
      lastKey = null;
      if (snapshot) draw(snapshot);
    },
    dispose(): void {
      snapshot = null;
      stage.release();
    }
  };
}
