import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { springBallConstants, type SpringBallState } from './scene.sim';

export type CreateSpringBallViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

const {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  fieldWidth: FIELD_W,
  fieldLeft: FIELD_LEFT,
  fieldRight: FIELD_RIGHT,
  originY: ORIGIN_Y,
  floorY: FLOOR_Y,
  ballRadius: BALL_R,
  minBallCenterY: MIN_BALL_CENTER_Y,
  positionScale: POSITION_SCALE,
  equilibriumX: EQUILIBRIUM_X,
  graphX: GRAPH_X,
  graphY: GRAPH_Y,
  graphWidth: GRAPH_W,
  graphHeight: GRAPH_H,
  panelRuleY: PANEL_RULE_Y,
  readoutCardY: READOUT_Y,
  readoutCardHeight: READOUT_H,
  formulaCardY: FORMULA_Y,
  formulaCardHeight: FORMULA_H,
  springCenterX: SPRING_CENTER_X,
  springBaseX: SPRING_BASE_X,
  springBaseWidth: SPRING_BASE_WIDTH,
  springBaseY: SPRING_BASE_Y,
  springFloorX: SPRING_FLOOR_X,
  springFloorWidth: SPRING_FLOOR_WIDTH,
  springFloorEdgeLeft: SPRING_FLOOR_EDGE_LEFT,
  springFloorEdgeRight: SPRING_FLOOR_EDGE_RIGHT
} = springBallConstants;

type Palette = {
  bg: string;
  panel: string;
  ink: string;
  muted: string;
  spring: string;
  blue: string;
  green: string;
  red: string;
  purple: string;
  orange: string;
  border: string;
  grid: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#ffffff',
    panel: '#ffffff',
    ink: '#303744',
    muted: '#8390a0',
    spring: '#334155',
    blue: '#26a7e0',
    green: '#18a86d',
    red: '#ef3c46',
    purple: '#9333ea',
    orange: '#ef9412',
    border: '#d4dce5',
    grid: '#edf1f4'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    ink: '#eef2f7',
    muted: '#a8b4c5',
    spring: '#b7c4d4',
    blue: '#5ed0f5',
    green: '#53d7a4',
    red: '#ff6971',
    purple: '#c084fc',
    orange: '#ffc34d',
    border: '#3d4d63',
    grid: '#26364b'
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

function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 12
): void {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function')
    ctx.roundRect(x, y, width, height, radius);
  else ctx.rect(x, y, width, height);
}

function arrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  length: number,
  angle: number,
  color: string
): void {
  const x2 = x + Math.cos(angle) * length;
  const y2 = y + Math.sin(angle) * length;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - Math.cos(angle - 0.45) * 10,
    y2 - Math.sin(angle - 0.45) * 10
  );
  ctx.lineTo(
    x2 - Math.cos(angle + 0.45) * 10,
    y2 - Math.sin(angle + 0.45) * 10
  );
  ctx.closePath();
  ctx.fill();
}

function drawSpring(
  ctx: CanvasRenderingContext2D,
  state: SpringBallState,
  p: Palette
): void {
  const contactY = ORIGIN_Y;
  const ballY = Math.max(
    MIN_BALL_CENTER_Y,
    ORIGIN_Y + state.x * POSITION_SCALE - BALL_R
  );
  const bottomY = FLOOR_Y - 26;
  const startY = contactY + BALL_R;
  const endY = Math.min(bottomY, Math.max(startY + 36, ballY + BALL_R + 30));
  ctx.strokeStyle = p.spring;
  ctx.lineWidth = 5;
  ctx.beginPath();
  const coils = 14;
  const step = (endY - startY) / coils;
  ctx.moveTo(FIELD_LEFT + SPRING_CENTER_X, startY);
  for (let i = 0; i < coils; i += 1) {
    ctx.lineTo(
      FIELD_LEFT + SPRING_CENTER_X + (i % 2 === 0 ? -26 : 26),
      startY + step * (i + 0.5)
    );
    ctx.lineTo(FIELD_LEFT + SPRING_CENTER_X, startY + step * (i + 1));
  }
  ctx.stroke();
  ctx.fillStyle = p.spring;
  ctx.fillRect(
    FIELD_LEFT + SPRING_BASE_X,
    FLOOR_Y - SPRING_BASE_Y,
    SPRING_BASE_WIDTH,
    12
  );
  ctx.fillRect(
    FIELD_LEFT + SPRING_FLOOR_X,
    FLOOR_Y - 18,
    SPRING_FLOOR_WIDTH,
    8
  );
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(FIELD_LEFT + SPRING_FLOOR_EDGE_LEFT, FLOOR_Y - 10);
  ctx.lineTo(FIELD_LEFT + SPRING_FLOOR_EDGE_RIGHT, FLOOR_Y - 10);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(FIELD_LEFT + SPRING_CENTER_X, ballY, BALL_R, 0, Math.PI * 2);
  ctx.fillStyle = p.blue;
  ctx.fill();
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, 'm', FIELD_LEFT + 258, ballY, '#ffffff', 17, 'center', 700);
  ctx.strokeStyle = p.muted;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(FIELD_LEFT + 42, contactY);
  ctx.lineTo(FIELD_RIGHT - 40, contactY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = p.green;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(FIELD_LEFT + 42, ORIGIN_Y + EQUILIBRIUM_X * POSITION_SCALE);
  ctx.lineTo(FIELD_RIGHT - 40, ORIGIN_Y + EQUILIBRIUM_X * POSITION_SCALE);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = p.red;
  ctx.beginPath();
  ctx.moveTo(FIELD_LEFT + 42, ORIGIN_Y + state.bottomX * POSITION_SCALE);
  ctx.lineTo(FIELD_RIGHT - 40, ORIGIN_Y + state.bottomX * POSITION_SCALE);
  ctx.stroke();
  text(
    ctx,
    '原长位置 x=0',
    FIELD_RIGHT - 40,
    contactY - 18,
    p.muted,
    13,
    'right',
    600
  );
  text(
    ctx,
    '平衡位置 x₀',
    FIELD_RIGHT - 40,
    ORIGIN_Y + EQUILIBRIUM_X * POSITION_SCALE - 18,
    p.green,
    13,
    'right',
    700
  );
  text(
    ctx,
    '最低点·对称点',
    FIELD_RIGHT - 40,
    ORIGIN_Y + state.bottomX * POSITION_SCALE - 18,
    p.red,
    13,
    'right',
    700
  );
  if (state.stage === 'free-fall')
    arrow(ctx, FIELD_LEFT + 258, ballY + BALL_R, 50, Math.PI / 2, p.red);
  if (state.stage !== 'free-fall') {
    const vAngle = state.velocity >= 0 ? Math.PI / 2 : -Math.PI / 2;
    arrow(ctx, FIELD_LEFT + 258, ballY, 52, vAngle, p.blue);
    text(
      ctx,
      'v',
      FIELD_LEFT + 290,
      ballY + (state.velocity >= 0 ? 30 : -30),
      p.blue,
      15,
      'left',
      700
    );
  }
  const accelAngle = state.acceleration >= 0 ? Math.PI / 2 : -Math.PI / 2;
  arrow(ctx, FIELD_LEFT + 258 - 42, ballY, 42, accelAngle, p.red);
  text(
    ctx,
    `a=${state.acceleration.toFixed(1)} m/s²`,
    FIELD_LEFT + 30,
    ballY - 30,
    p.red,
    13,
    'left',
    700
  );
}

function drawGraph(
  ctx: CanvasRenderingContext2D,
  state: SpringBallState,
  p: Palette
): void {
  rounded(ctx, GRAPH_X - 18, GRAPH_Y - 58, GRAPH_W + 36, GRAPH_H + 102, 14);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text(
    ctx,
    '实时位置—时间（x–t）图',
    GRAPH_X,
    GRAPH_Y - 34,
    p.ink,
    18,
    'left',
    700
  );
  ctx.fillStyle = p.grid;
  ctx.fillRect(GRAPH_X, GRAPH_Y, GRAPH_W, GRAPH_H);
  ctx.strokeStyle = p.border;
  ctx.strokeRect(GRAPH_X, GRAPH_Y, GRAPH_W, GRAPH_H);
  ctx.strokeStyle = p.green;
  ctx.setLineDash([6, 6]);
  const eqY = GRAPH_Y + GRAPH_H * 0.56;
  ctx.beginPath();
  ctx.moveTo(GRAPH_X, eqY);
  ctx.lineTo(GRAPH_X + GRAPH_W, eqY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = p.blue;
  ctx.lineWidth = 3;
  ctx.beginPath();
  const points =
    state.history.length > 0
      ? state.history
      : [{ t: 0, x: -state.params.releaseHeight }];
  points.forEach((point, index) => {
    const px = GRAPH_X + Math.min(1, point.t / 1.6) * GRAPH_W;
    const py =
      GRAPH_Y +
      GRAPH_H * 0.18 +
      Math.min(1.1, Math.max(-0.1, (point.x + 0.1) / 0.95)) * GRAPH_H * 0.72;
    if (index === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();
  text(ctx, 'x / m', GRAPH_X + 8, GRAPH_Y + 14, p.muted, 12, 'left', 600);
  text(
    ctx,
    't / s',
    GRAPH_X + GRAPH_W - 8,
    GRAPH_Y + GRAPH_H + 26,
    p.muted,
    12,
    'right',
    600
  );
  text(ctx, '平衡 x₀', GRAPH_X + 10, eqY - 13, p.green, 12, 'left', 600);
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: SpringBallState,
  p: Palette,
  scale: number
): void {
  const x = FIELD_W + 26;
  ctx.fillStyle = p.panel;
  ctx.fillRect(FIELD_W, 0, BASE_W - FIELD_W, BASE_H);
  ctx.strokeStyle = p.blue;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, PANEL_RULE_Y);
  ctx.lineTo(BASE_W - 24, PANEL_RULE_Y);
  ctx.stroke();
  text(ctx, '动力学参数', x, 38, p.ink, 21 * scale, 'left', 700);
  rounded(ctx, x, READOUT_Y, 500, READOUT_H, 12);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  const readouts = [
    {
      label: '运动阶段',
      value:
        state.stage === 'free-fall'
          ? '自由落体'
          : state.stage === 'bottom'
            ? '最低点'
            : '接触压缩',
      x: x + 16,
      y: READOUT_Y + 18
    },
    {
      label: '小球速度 v',
      value: `${state.velocity.toFixed(2)} m/s`,
      x: x + 260,
      y: READOUT_Y + 18
    },
    {
      label: '瞬时加速度 a',
      value: `${state.acceleration.toFixed(2)} m/s²`,
      x: x + 16,
      y: READOUT_Y + 56
    },
    {
      label: '弹簧力 / 合力',
      value: `${state.springForce.toFixed(1)} / ${state.netForce.toFixed(1)} N`,
      x: x + 260,
      y: READOUT_Y + 56
    }
  ];
  readouts.forEach((item) => {
    text(ctx, item.label, item.x, item.y, p.muted, 12 * scale, 'left', 500);
    text(
      ctx,
      item.value,
      item.x,
      item.y + 17,
      item.label === '运动阶段' ? p.blue : p.ink,
      14 * scale,
      'left',
      700
    );
  });
  rounded(ctx, x, FORMULA_Y, 500, FORMULA_H, 12);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(
    ctx,
    '关键关系',
    x + 16,
    FORMULA_Y + 24,
    p.muted,
    14 * scale,
    'left',
    700
  );
  text(
    ctx,
    'x₀ = mg/k = 0.25 m',
    x + 16,
    FORMULA_Y + 56,
    p.ink,
    16 * scale,
    'left',
    700
  );
  text(
    ctx,
    state.params.releaseHeight === 0
      ? 'h=0：最低点 x=2x₀，|a|=g'
      : `当前最低点 x=${state.bottomX.toFixed(2)} m`,
    x + 16,
    FORMULA_Y + 80,
    p.red,
    15 * scale,
    'left',
    700
  );
  text(
    ctx,
    '接触后以平衡位置为中心做简谐运动',
    x + 16,
    FORMULA_Y + 108,
    p.green,
    13 * scale,
    'left',
    600
  );
}

export function createSpringBallView(
  options: CreateSpringBallViewOptions = {}
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
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  let snapshot: SpringBallState | null = null;
  function draw(state: SpringBallState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(width / BASE_W, height / BASE_H);
    const offsetY = (height - BASE_H * fit) / 2;
    const scale = env.contentScale() * stage.responsiveScale;
    const p = PALETTE[env.theme];
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(0, offsetY);
    ctx.scale(fit, fit);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, BASE_W, BASE_H);
    drawSpring(ctx, state, p);
    drawPanel(ctx, state, p, scale);
    drawGraph(ctx, state, p);
    ctx.restore();
  }
  return {
    render(state: SpringBallState): void {
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
    },
    reset(): void {
      snapshot = null;
    }
  };
}
