import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  laserSpeedConstants,
  type LaserPulseState,
  type LaserSpeedState
} from './scene.sim';

export type CreateLaserSpeedViewOptions = {
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
  road: string;
  lane: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    panel: '#ffffff',
    soft: '#f4f6f8',
    grid: '#e2e8ef',
    ink: '#303744',
    muted: '#8290a3',
    border: '#d4dce5',
    blue: '#2f7dd1',
    red: '#ef4050',
    teal: '#249c8c',
    gold: '#efaF25',
    road: '#e8ecef',
    lane: '#ffffff'
  },
  dark: {
    bg: '#111827',
    panel: '#172235',
    soft: '#202d42',
    grid: '#394a63',
    ink: '#eef2f7',
    muted: '#9aa8ba',
    border: '#40516a',
    blue: '#52a9f4',
    red: '#fb7185',
    teal: '#4dd4c0',
    gold: '#fbbf24',
    road: '#273449',
    lane: '#64748b'
  }
};

const {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  fieldWidth: FIELD_W,
  graphLeft: GRAPH_LEFT,
  graphRight: GRAPH_RIGHT,
  graphTop: GRAPH_TOP,
  graphBottom: GRAPH_BOTTOM,
  roadLeft: ROAD_LEFT,
  roadRight: ROAD_RIGHT,
  roadY: ROAD_Y,
  roadHeight: ROAD_H,
  radarX: RADAR_X,
  distanceScale: DISTANCE_SCALE,
  lightSpeed: LIGHT_SPEED,
  maxTime: MAX_TIME,
  panelY: PANEL_Y,
  panelHeight: PANEL_H,
  formulaY: FORMULA_Y,
  formulaHeight: FORMULA_H,
  dividerBottom: DIVIDER_BOTTOM
} = laserSpeedConstants;

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
  ctx.lineTo(x2 - ux * 12 - uy * 5, y2 - uy * 12 + ux * 5);
  ctx.lineTo(x2 - ux * 12 + uy * 5, y2 - uy * 12 - ux * 5);
  ctx.closePath();
  ctx.fill();
}

function distanceToX(distance: number): number {
  return RADAR_X + distance * DISTANCE_SCALE;
}

function graphX(time: number): number {
  return GRAPH_LEFT + (GRAPH_RIGHT - GRAPH_LEFT) * (time / MAX_TIME);
}

function graphY(distance: number): number {
  const minDistance = 80;
  const maxDistance = 230;
  return (
    GRAPH_BOTTOM -
    ((distance - minDistance) / (maxDistance - minDistance)) *
      (GRAPH_BOTTOM - GRAPH_TOP)
  );
}

function drawPulse(
  ctx: CanvasRenderingContext2D,
  pulse: LaserPulseState,
  time: number,
  color: string,
  p: Palette
): void {
  if (time < pulse.emissionTime || time > pulse.returnTime) return;
  const half = pulse.hitTime - pulse.emissionTime;
  const carX = distanceToX(pulse.hitDistance);
  const radarY = ROAD_Y + ROAD_H / 2 - 2;
  const carY = radarY - 4;
  let x = RADAR_X;
  if (time <= pulse.hitTime) {
    x = RADAR_X + (carX - RADAR_X) * ((time - pulse.emissionTime) / half);
  } else {
    x = carX + (RADAR_X - carX) * ((time - pulse.hitTime) / half);
  }
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 4;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(RADAR_X, radarY);
  ctx.lineTo(x, carY);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(x, carY, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  text(
    ctx,
    time <= pulse.hitTime ? '发射' : '回波',
    x,
    radarY - 20,
    color,
    13,
    'center',
    700
  );
  if (time >= pulse.hitTime - 0.03 && time <= pulse.hitTime + 0.03) {
    ctx.strokeStyle = p.gold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(carX, carY, 15, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawCar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  p: Palette
): void {
  ctx.save();
  ctx.fillStyle = '#2e3d58';
  roundedRect(ctx, x - 34, y - 13, 68, 26, 8);
  ctx.fill();
  ctx.fillStyle = '#65b5da';
  ctx.beginPath();
  ctx.moveTo(x - 22, y - 13);
  ctx.lineTo(x - 11, y - 26);
  ctx.lineTo(x + 17, y - 26);
  ctx.lineTo(x + 28, y - 13);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1c2738';
  ctx.beginPath();
  ctx.arc(x - 21, y + 14, 8, 0, Math.PI * 2);
  ctx.arc(x + 21, y + 14, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.red;
  ctx.fillRect(x - 35, y - 3, 5, 7);
  ctx.restore();
}

function drawRoad(
  ctx: CanvasRenderingContext2D,
  state: LaserSpeedState,
  p: Palette
): void {
  ctx.fillStyle = p.road;
  ctx.fillRect(ROAD_LEFT, ROAD_Y, ROAD_RIGHT - ROAD_LEFT, ROAD_H);
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  ctx.strokeRect(ROAD_LEFT, ROAD_Y, ROAD_RIGHT - ROAD_LEFT, ROAD_H);
  ctx.strokeStyle = p.lane;
  ctx.lineWidth = 6;
  ctx.setLineDash([24, 22]);
  ctx.beginPath();
  ctx.moveTo(ROAD_LEFT, ROAD_Y + ROAD_H / 2);
  ctx.lineTo(ROAD_RIGHT, ROAD_Y + ROAD_H / 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#566274';
  ctx.beginPath();
  ctx.arc(RADAR_X, ROAD_Y + ROAD_H / 2, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d9e7ef';
  ctx.beginPath();
  ctx.arc(RADAR_X + 4, ROAD_Y + ROAD_H / 2 - 2, 8, -0.6, 0.6);
  ctx.fill();
  text(ctx, '测速仪', RADAR_X, ROAD_Y + ROAD_H + 25, p.ink, 15, 'center');
  const carX = Math.min(ROAD_RIGHT - 38, distanceToX(state.carDistance));
  drawCar(ctx, carX, ROAD_Y + ROAD_H / 2 + 3, p);
  if (state.params.showVectors) {
    arrow(
      ctx,
      carX - 36,
      ROAD_Y + ROAD_H + 46,
      carX + 50,
      ROAD_Y + ROAD_H + 46,
      p.blue,
      4
    );
    text(
      ctx,
      `v = ${state.params.velocity.toFixed(0)} m/s`,
      carX + 10,
      ROAD_Y + ROAD_H + 67,
      p.blue,
      14,
      'center'
    );
  }
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(RADAR_X, ROAD_Y + ROAD_H + 42);
  ctx.lineTo(ROAD_RIGHT - 12, ROAD_Y + ROAD_H + 42);
  ctx.stroke();
  arrow(
    ctx,
    ROAD_RIGHT - 44,
    ROAD_Y + ROAD_H + 42,
    ROAD_RIGHT - 12,
    ROAD_Y + ROAD_H + 42,
    p.ink,
    2
  );
  text(
    ctx,
    'x (m)',
    ROAD_RIGHT - 4,
    ROAD_Y + ROAD_H + 42,
    p.ink,
    15,
    'left',
    500
  );
  text(ctx, 'x = 0', RADAR_X, ROAD_Y + ROAD_H + 62, p.muted, 13, 'center', 500);
  text(
    ctx,
    '光速已缩放：c = 200 m/s',
    FIELD_W - 20,
    384,
    p.muted,
    13,
    'right',
    500
  );
}

function drawGraph(
  ctx: CanvasRenderingContext2D,
  state: LaserSpeedState,
  p: Palette
): void {
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i += 1) {
    const x = GRAPH_LEFT + ((GRAPH_RIGHT - GRAPH_LEFT) * i) / 5;
    ctx.beginPath();
    ctx.moveTo(x, GRAPH_TOP);
    ctx.lineTo(x, GRAPH_BOTTOM);
    ctx.stroke();
  }
  for (let i = 0; i <= 5; i += 1) {
    const y = GRAPH_TOP + ((GRAPH_BOTTOM - GRAPH_TOP) * i) / 5;
    ctx.beginPath();
    ctx.moveTo(GRAPH_LEFT, y);
    ctx.lineTo(GRAPH_RIGHT, y);
    ctx.stroke();
  }
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(GRAPH_LEFT, GRAPH_BOTTOM);
  ctx.lineTo(GRAPH_RIGHT + 18, GRAPH_BOTTOM);
  ctx.moveTo(GRAPH_LEFT, GRAPH_BOTTOM);
  ctx.lineTo(GRAPH_LEFT, GRAPH_TOP - 18);
  ctx.stroke();
  arrow(
    ctx,
    GRAPH_RIGHT - 4,
    GRAPH_BOTTOM,
    GRAPH_RIGHT + 18,
    GRAPH_BOTTOM,
    p.ink,
    2
  );
  arrow(ctx, GRAPH_LEFT, GRAPH_TOP + 4, GRAPH_LEFT, GRAPH_TOP - 18, p.ink, 2);
  text(ctx, 't (s)', GRAPH_RIGHT + 24, GRAPH_BOTTOM, p.ink, 15, 'left', 500);
  text(ctx, 'x (m)', GRAPH_LEFT - 8, GRAPH_TOP - 22, p.ink, 15, 'right', 500);
  ctx.strokeStyle = p.blue;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(graphX(0), graphY(state.params.initialDistance));
  ctx.lineTo(
    graphX(MAX_TIME),
    graphY(state.params.initialDistance + state.params.velocity * MAX_TIME)
  );
  ctx.stroke();
  const snapshots = [
    { pulse: state.pulse1, color: p.red, label: 'x₁', timeLabel: 't₁' },
    { pulse: state.pulse2, color: p.teal, label: 'x₂', timeLabel: 't₂' }
  ];
  ctx.setLineDash([7, 6]);
  for (const item of snapshots) {
    const gx = graphX(item.pulse.hitTime);
    const gy = graphY(item.pulse.hitDistance);
    ctx.strokeStyle = item.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(gx, GRAPH_BOTTOM);
    ctx.lineTo(gx, gy);
    ctx.moveTo(GRAPH_LEFT, gy);
    ctx.lineTo(gx, gy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = p.panel;
    ctx.beginPath();
    ctx.arc(gx, gy, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = item.color;
    ctx.lineWidth = 3;
    ctx.stroke();
    text(ctx, item.label, GRAPH_LEFT - 10, gy, item.color, 16, 'right', 700);
    text(
      ctx,
      item.timeLabel,
      gx,
      GRAPH_BOTTOM + 22,
      item.color,
      14,
      'center',
      700
    );
    ctx.setLineDash([7, 6]);
  }
  ctx.setLineDash([]);
  text(
    ctx,
    `Δt = ${state.realInterval.toFixed(2)} s`,
    GRAPH_LEFT + 12,
    GRAPH_TOP + 18,
    p.ink,
    14,
    'left',
    500
  );
}

function drawMetricCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
  color: string,
  p: Palette
): void {
  ctx.fillStyle = p.panel;
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1;
  roundedRect(ctx, x, y, width, 46, 9);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 5, 46);
  text(ctx, label, x + 16, y + 15, p.muted, 12, 'left', 500);
  text(ctx, value, x + 16, y + 33, color, 18, 'left', 700);
}

function drawBottom(
  ctx: CanvasRenderingContext2D,
  state: LaserSpeedState,
  p: Palette
): void {
  ctx.fillStyle = p.panel;
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1;
  roundedRect(ctx, 16, PANEL_Y, 376, PANEL_H, 14);
  ctx.fill();
  ctx.stroke();
  roundedRect(ctx, 406, PANEL_Y, 376, PANEL_H, 14);
  ctx.fill();
  ctx.stroke();
  roundedRect(ctx, 796, PANEL_Y, 388, PANEL_H, 14);
  ctx.fill();
  ctx.stroke();
  text(ctx, '测量数据记录', 34, PANEL_Y + 21, p.ink, 18, 'left', 700);
  text(ctx, '两次位置快照', 424, PANEL_Y + 21, p.ink, 18, 'left', 700);
  text(ctx, '测速公式', 814, PANEL_Y + 21, p.ink, 18, 'left', 700);
  drawMetricCard(
    ctx,
    30,
    PANEL_Y + 42,
    163,
    '脉冲①往返 Δt₁',
    `${state.pulse1.returnTime.toFixed(2)} s`,
    p.red,
    p
  );
  drawMetricCard(
    ctx,
    207,
    PANEL_Y + 42,
    163,
    '位置 x₁',
    `${state.pulse1.hitDistance.toFixed(1)} m`,
    p.red,
    p
  );
  drawMetricCard(
    ctx,
    420,
    PANEL_Y + 42,
    163,
    '脉冲②往返 Δt₂',
    `${(state.pulse2.returnTime - state.pulse2.emissionTime).toFixed(2)} s`,
    p.teal,
    p
  );
  drawMetricCard(
    ctx,
    597,
    PANEL_Y + 42,
    163,
    '位置 x₂',
    `${state.pulse2.hitDistance.toFixed(1)} m`,
    p.teal,
    p
  );
  text(ctx, 't₁ = Δt₁ / 2', 814, PANEL_Y + 52, p.red, 15, 'left', 600);
  text(ctx, 't₂ = ΔT + Δt₂ / 2', 814, PANEL_Y + 77, p.teal, 15, 'left', 600);
  text(
    ctx,
    `v = Δx / Δt = ${state.inferredVelocity.toFixed(1)} m/s`,
    814,
    PANEL_Y + 103,
    p.blue,
    18,
    'left',
    700
  );
}

function drawFormulaStrip(
  ctx: CanvasRenderingContext2D,
  state: LaserSpeedState,
  p: Palette
): void {
  ctx.fillStyle = p.soft;
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1;
  roundedRect(ctx, 16, FORMULA_Y, BASE_W - 32, FORMULA_H, 14);
  ctx.fill();
  ctx.stroke();
  text(ctx, '关键点', 35, FORMULA_Y + 25, p.gold, 16, 'left', 700);
  text(
    ctx,
    '汽车真实耗时 Δt ≠ 发射间隔 ΔT',
    115,
    FORMULA_Y + 25,
    p.ink,
    16,
    'left',
    600
  );
  text(
    ctx,
    `Δx = x₂ − x₁ = ${state.measuredDistance.toFixed(1)} m`,
    35,
    FORMULA_Y + 62,
    p.ink,
    15,
    'left',
    500
  );
  text(
    ctx,
    `Δt = t₂ − t₁ = ${state.realInterval.toFixed(2)} s`,
    390,
    FORMULA_Y + 62,
    p.ink,
    15,
    'left',
    500
  );
  text(
    ctx,
    `c = ${LIGHT_SPEED} m/s（动画缩放）`,
    760,
    FORMULA_Y + 62,
    p.muted,
    15,
    'left',
    500
  );
}

export function createLaserSpeedView(
  options: CreateLaserSpeedViewOptions = {}
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
  let snapshot: LaserSpeedState | null = null;
  let lastKey: string | null = null;

  function draw(next: LaserSpeedState): void {
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
      '实景空间模型（俯视视角）',
      FIELD_W / 2,
      30,
      p.ink,
      22,
      'center',
      700
    );
    text(
      ctx,
      '位移—时间（x-t）运动图象分析',
      (GRAPH_LEFT + GRAPH_RIGHT) / 2,
      30,
      p.ink,
      22,
      'center',
      700
    );
    ctx.strokeStyle = p.border;
    ctx.setLineDash([7, 7]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(FIELD_W, 14);
    ctx.lineTo(FIELD_W, DIVIDER_BOTTOM);
    ctx.stroke();
    ctx.setLineDash([]);
    drawRoad(ctx, next, p);
    if (next.params.showPulses) {
      drawPulse(ctx, next.pulse1, next.time, p.red, p);
      drawPulse(ctx, next.pulse2, next.time, p.teal, p);
    }
    drawGraph(ctx, next, p);
    drawBottom(ctx, next, p);
    drawFormulaStrip(ctx, next, p);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  return {
    render(next: LaserSpeedState): void {
      snapshot = next;
      const key = `${next.time.toFixed(3)}|${env.theme}|${env.mode}|${stage.cssWidth}x${stage.cssHeight}|${next.params.showPulses}|${next.params.showVectors}`;
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
