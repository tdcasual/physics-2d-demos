import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  alternatingElectricFieldConstants,
  alternatingElectricFieldSample,
  type AlternatingElectricFieldState
} from './scene.sim';

export type CreateAlternatingElectricFieldViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

const {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  fieldWidth: FIELD_W,
  panelX: PANEL_X,
  panelWidth: PANEL_W,
  panelInset: PANEL_INSET,
  plateLeft: PLATE_LEFT,
  plateRight: PLATE_RIGHT,
  plateTop: PLATE_TOP,
  plateBottom: PLATE_BOTTOM,
  axisY: AXIS_Y,
  graphLeft: GRAPH_LEFT,
  graphWidth: GRAPH_W,
  graphTop: GRAPH_TOP,
  graphHeight: GRAPH_H,
  graphGap: GRAPH_GAP,
  displayDuration: DISPLAY_DURATION,
  titleY: TITLE_Y,
  panelRuleY: PANEL_RULE_Y,
  metricsCardY: METRICS_Y,
  metricsCardHeight: METRICS_H,
  formulaCardY: FORMULA_Y,
  formulaCardHeight: FORMULA_H,
  cardRadius: CARD_RADIUS
} = alternatingElectricFieldConstants;

const GRID_ALPHA = '30';
const DASH = 7;
const GAP = 6;

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
  teal: string;
  gold: string;
  green: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfcfe',
    panel: '#ffffff',
    ink: '#303b4d',
    muted: '#78869b',
    border: '#d5deea',
    grid: '#d4deea',
    soft: '#f0f4f8',
    blue: '#2f7ed8',
    red: '#f05252',
    teal: '#1eaa91',
    gold: '#ef9616',
    green: '#31a66b'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    ink: '#eef4fb',
    muted: '#a9b7ca',
    border: '#40506a',
    grid: '#2c3d58',
    soft: '#223149',
    blue: '#67a6ff',
    red: '#fb7185',
    teal: '#38d6b3',
    gold: '#fbbf24',
    green: '#63d995'
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
  radius: number = CARD_RADIUS
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
  width = 3,
  dashed = false
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
  ctx.setLineDash(dashed ? [DASH, GAP] : []);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - ux * 10 - uy * 5, y2 - uy * 10 + ux * 5);
  ctx.lineTo(x2 - ux * 10 + uy * 5, y2 - uy * 10 - ux * 5);
  ctx.closePath();
  ctx.fill();
}

function drawGrid(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, FIELD_W, BASE_H);
  ctx.strokeStyle = `${p.grid}${GRID_ALPHA}`;
  ctx.lineWidth = 1;
  for (let x = 0; x <= FIELD_W; x += 54) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, BASE_H);
    ctx.stroke();
  }
}

function drawPlates(
  ctx: CanvasRenderingContext2D,
  state: AlternatingElectricFieldState,
  p: Palette
): void {
  ctx.fillStyle = p.red;
  ctx.fillRect(PLATE_LEFT - 9, PLATE_TOP, 18, PLATE_BOTTOM - PLATE_TOP);
  ctx.fillStyle = p.blue;
  ctx.fillRect(PLATE_RIGHT - 9, PLATE_TOP, 18, PLATE_BOTTOM - PLATE_TOP);
  text(ctx, '极板 A', PLATE_LEFT, PLATE_TOP - 26, p.red, 16, 'center', 700);
  text(ctx, '极板 B', PLATE_RIGHT, PLATE_TOP - 26, p.blue, 16, 'center', 700);
  for (let y = PLATE_TOP + 28; y < PLATE_BOTTOM - 10; y += 34) {
    text(ctx, '+', PLATE_LEFT, y, p.panel, 16, 'center', 700);
    text(ctx, '−', PLATE_RIGHT, y, p.panel, 16, 'center', 700);
  }
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 7]);
  ctx.beginPath();
  ctx.moveTo(28, AXIS_Y);
  ctx.lineTo(FIELD_W - 22, AXIS_Y);
  ctx.stroke();
  ctx.setLineDash([]);
  if (state.params.showFieldLines) {
    const direction = state.fieldSign > 0 ? 1 : -1;
    for (let y = PLATE_TOP + 34; y < PLATE_BOTTOM - 18; y += 42) {
      const start = direction > 0 ? PLATE_LEFT + 25 : PLATE_RIGHT - 25;
      const end = direction > 0 ? PLATE_RIGHT - 25 : PLATE_LEFT + 25;
      arrow(ctx, start, y, end, y, p.blue, 2);
    }
  }
  text(
    ctx,
    `UBA = ${state.voltage > 0 ? '+' : '−'}${Math.abs(state.voltage).toFixed(0)} V`,
    (PLATE_LEFT + PLATE_RIGHT) / 2,
    PLATE_BOTTOM + 30,
    state.fieldSign > 0 ? p.red : p.blue,
    13,
    'center',
    700
  );
}

function drawParticle(
  ctx: CanvasRenderingContext2D,
  state: AlternatingElectricFieldState,
  p: Palette
): void {
  const span = PLATE_RIGHT - PLATE_LEFT - 50;
  const bounded = Math.max(-14, Math.min(14, state.position));
  const x = (PLATE_LEFT + PLATE_RIGHT) / 2 + (bounded / 14) * (span / 2);
  ctx.fillStyle = `${p.teal}35`;
  ctx.beginPath();
  ctx.arc(x, AXIS_Y, 25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.teal;
  ctx.beginPath();
  ctx.arc(x, AXIS_Y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.panel;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(
    ctx,
    state.params.charge === 'electron' ? 'e⁻' : '+q',
    x,
    AXIS_Y,
    p.panel,
    11,
    'center',
    700
  );
  const velocityDirection = state.velocity >= 0 ? 1 : -1;
  if (state.params.showVelocityVector) {
    const speed = Math.min(92, 24 + Math.abs(state.velocity) * 6);
    arrow(
      ctx,
      x,
      AXIS_Y - 22,
      x + velocityDirection * speed,
      AXIS_Y - 22,
      p.teal,
      3
    );
    arrow(
      ctx,
      x,
      AXIS_Y + 34,
      x + (state.acceleration >= 0 ? 48 : -48),
      AXIS_Y + 34,
      p.red,
      3
    );
    text(
      ctx,
      'v',
      x + velocityDirection * (speed + 12),
      AXIS_Y - 42,
      p.teal,
      13,
      'center',
      700
    );
    text(
      ctx,
      'a',
      x + (state.acceleration >= 0 ? 56 : -56),
      AXIS_Y + 53,
      p.red,
      13,
      'center',
      700
    );
  }
  text(
    ctx,
    `x = ${state.position.toFixed(1)} mm`,
    x,
    AXIS_Y + 72,
    p.ink,
    12,
    'center',
    700
  );
}

function drawGraph(
  ctx: CanvasRenderingContext2D,
  state: AlternatingElectricFieldState,
  p: Palette,
  index: number,
  title: string,
  color: string,
  value: (sample: ReturnType<typeof alternatingElectricFieldSample>) => number,
  suffix: string
): void {
  const y = GRAPH_TOP + index * (GRAPH_H + GRAPH_GAP);
  rounded(ctx, GRAPH_LEFT, y, GRAPH_W, GRAPH_H, 8);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1;
  ctx.stroke();
  const samples = [];
  let maxAbs = 1;
  for (let sampleIndex = 0; sampleIndex <= 80; sampleIndex += 1) {
    const time = (DISPLAY_DURATION * sampleIndex) / 80;
    const sample = alternatingElectricFieldSample(state.params, time);
    const number = value(sample);
    samples.push({ time, number });
    maxAbs = Math.max(maxAbs, Math.abs(number));
  }
  const mid = y + GRAPH_H / 2;
  ctx.strokeStyle = `${p.grid}${GRID_ALPHA}`;
  ctx.lineWidth = 1;
  for (let grid = 1; grid < 5; grid += 1) {
    const x = GRAPH_LEFT + (GRAPH_W * grid) / 5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + GRAPH_H);
    ctx.stroke();
  }
  ctx.strokeStyle = p.ink;
  ctx.beginPath();
  ctx.moveTo(GRAPH_LEFT, mid);
  ctx.lineTo(GRAPH_LEFT + GRAPH_W, mid);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  samples.forEach((sample, sampleIndex) => {
    const x = GRAPH_LEFT + (sample.time / DISPLAY_DURATION) * GRAPH_W;
    const yValue = mid - (sample.number / maxAbs) * (GRAPH_H * 0.38);
    if (sampleIndex === 0) ctx.moveTo(x, yValue);
    else ctx.lineTo(x, yValue);
  });
  ctx.stroke();
  const cursorX = GRAPH_LEFT + (state.time / DISPLAY_DURATION) * GRAPH_W;
  ctx.strokeStyle = `${p.gold}aa`;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(cursorX, y);
  ctx.lineTo(cursorX, y + GRAPH_H);
  ctx.stroke();
  ctx.setLineDash([]);
  text(ctx, title, GRAPH_LEFT + 12, y + 16, p.ink, 14, 'left', 700);
  text(ctx, suffix, GRAPH_LEFT + GRAPH_W - 12, y + 16, color, 12, 'right', 700);
  text(
    ctx,
    't / s',
    GRAPH_LEFT + GRAPH_W - 10,
    y + GRAPH_H - 12,
    p.muted,
    11,
    'right',
    600
  );
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: AlternatingElectricFieldState,
  p: Palette,
  scale: number
): void {
  const x = PANEL_X + PANEL_INSET;
  const width = PANEL_W - PANEL_INSET * 2;
  ctx.fillStyle = p.panel;
  ctx.fillRect(PANEL_X, 0, PANEL_W, BASE_H);
  text(ctx, '交变电场运动', x, TITLE_Y, p.ink, 22 * scale, 'left', 700);
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, PANEL_RULE_Y);
  ctx.lineTo(x + width, PANEL_RULE_Y);
  ctx.stroke();
  rounded(ctx, x, METRICS_Y, width, METRICS_H);
  ctx.fillStyle = p.soft;
  ctx.fill();
  text(ctx, '实时读数', x + 14, METRICS_Y + 24, p.ink, 16 * scale, 'left', 700);
  const rows = [
    ['相位 φ', `${(state.phase * 360).toFixed(0)}°`, p.gold],
    [
      '场电压 UBA',
      `${state.voltage > 0 ? '+' : '−'}${Math.abs(state.voltage).toFixed(0)} V`,
      p.blue
    ],
    ['加速度 a', `${state.acceleration.toFixed(2)} a₀`, p.red],
    ['速度 v', `${state.velocity.toFixed(2)} v₀`, p.teal],
    ['位置 x', `${state.position.toFixed(1)} mm`, p.ink],
    [
      '电荷',
      state.params.charge === 'electron' ? '电子 −q' : '正离子 +q',
      p.green
    ]
  ] as const;
  rows.forEach(([label, value, color], rowIndex) => {
    const y = METRICS_Y + 55 + rowIndex * 34;
    text(ctx, label, x + 14, y, p.muted, 13 * scale, 'left', 600);
    text(ctx, value, x + width - 14, y, color, 13 * scale, 'right', 700);
    if (rowIndex < rows.length - 1) {
      ctx.strokeStyle = p.border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 12, y + 16);
      ctx.lineTo(x + width - 12, y + 16);
      ctx.stroke();
    }
  });
  rounded(ctx, x, FORMULA_Y, width, FORMULA_H);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(
    ctx,
    '分段运动关系',
    x + 14,
    FORMULA_Y + 24,
    p.green,
    15 * scale,
    'left',
    700
  );
  text(
    ctx,
    'E = UBA / d',
    x + 14,
    FORMULA_Y + 58,
    p.ink,
    15 * scale,
    'left',
    600
  );
  text(
    ctx,
    'a = qE / m',
    x + 14,
    FORMULA_Y + 88,
    p.ink,
    15 * scale,
    'left',
    600
  );
  text(
    ctx,
    'Δv = ∫ a dt',
    x + 14,
    FORMULA_Y + 118,
    p.red,
    15 * scale,
    'left',
    700
  );
  text(
    ctx,
    'x = ∫ v dt',
    x + 14,
    FORMULA_Y + 148,
    p.teal,
    15 * scale,
    'left',
    700
  );
  text(
    ctx,
    '方波：每 T/2 反向',
    x + 14,
    FORMULA_Y + 186,
    p.muted,
    12 * scale,
    'left',
    600
  );
  text(
    ctx,
    `U₀ = ${state.params.voltageAmplitude.toFixed(0)} V · T = ${state.params.period.toFixed(1)} s`,
    x + 14,
    FORMULA_Y + 212,
    p.muted,
    12 * scale,
    'left',
    600
  );
}

function drawField(
  ctx: CanvasRenderingContext2D,
  state: AlternatingElectricFieldState,
  p: Palette,
  scale: number
): void {
  drawGrid(ctx, p);
  text(
    ctx,
    '带电粒子在交变电场中的运动',
    26,
    TITLE_Y,
    p.ink,
    22 * scale,
    'left',
    700
  );
  text(
    ctx,
    '方波换向，轨迹与三张图同步',
    28,
    TITLE_Y + 27,
    p.muted,
    13 * scale,
    'left',
    600
  );
  text(
    ctx,
    `UBA = ±${state.params.voltageAmplitude.toFixed(0)} V · T = ${state.params.period.toFixed(1)} s`,
    28,
    98,
    p.blue,
    14 * scale,
    'left',
    700
  );
  drawPlates(ctx, state, p);
  drawParticle(ctx, state, p);
  drawGraph(
    ctx,
    state,
    p,
    0,
    'a-t',
    p.red,
    (sample) => sample.acceleration / sample.accelerationMagnitude,
    'a / a₀'
  );
  drawGraph(
    ctx,
    state,
    p,
    1,
    'v-t',
    p.teal,
    (sample) => sample.velocity / Math.max(1, sample.velocityScale),
    'v / v₀'
  );
  drawGraph(
    ctx,
    state,
    p,
    2,
    'x-t',
    p.blue,
    (sample) => sample.position,
    'x / mm'
  );
  drawPanel(ctx, state, p, scale);
}

export function createAlternatingElectricFieldView(
  options: CreateAlternatingElectricFieldViewOptions = {}
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
  let snapshot: AlternatingElectricFieldState | null = null;
  function draw(state: AlternatingElectricFieldState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(width / BASE_W, height / BASE_H);
    const offsetY = (height - BASE_H * fit) / 2;
    const scale = env.contentScale() * stage.responsiveScale;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(0, offsetY);
    ctx.scale(fit, fit);
    drawField(ctx, state, PALETTE[env.theme], scale);
    ctx.restore();
  }
  return {
    render(state: AlternatingElectricFieldState): void {
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
