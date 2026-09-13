import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { centripetalConstants, type CentripetalState } from './scene.sim';

export type CreateCentripetalViewOptions = {
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
  diagramX: DIAGRAM_X,
  diagramY: DIAGRAM_Y,
  diagramWidth: DIAGRAM_W,
  diagramHeight: DIAGRAM_H,
  centerX: CENTER_X,
  centerY: CENTER_Y,
  radiusScale: RADIUS_SCALE,
  graphGridStep: GRID_STEP,
  panelCardX: CARD_X,
  panelCardWidth: CARD_W,
  headerRuleY: HEADER_RULE_Y,
  formulaY: FORMULA_Y,
  formulaHeight: FORMULA_H,
  formulaSecondRowOffset: FORMULA_SECOND_ROW_OFFSET,
  controlY: CONTROL_Y,
  controlHeight: CONTROL_H,
  readoutY: READOUT_Y,
  readoutHeight: READOUT_H,
  arrowBaseSpeed: ARROW_BASE_SPEED,
  arrowBaseForce: ARROW_BASE_FORCE,
  defaultMass: DEFAULT_MASS,
  defaultRadius: DEFAULT_RADIUS,
  defaultAngularVelocity: DEFAULT_OMEGA
} = centripetalConstants;

const CIRCLE_DASH = 8;
const CIRCLE_GAP = 7;
const RIGHT_ANGLE_SIZE = 22;
const ARROW_HEAD = 12;
const BALL_RADIUS = 18;
const GRID_START = 70;
const GRID_END_X = 730;
const GRID_END_Y = 708;
const PANEL_PADDING = 16;
const READOUT_ROW_GAP = 28;

type Palette = {
  bg: string;
  panel: string;
  soft: string;
  ink: string;
  muted: string;
  border: string;
  grid: string;
  red: string;
  blue: string;
  teal: string;
  gold: string;
  purple: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    panel: '#ffffff',
    soft: '#f1f3f4',
    ink: '#303744',
    muted: '#7d8997',
    border: '#d8dfe5',
    grid: '#e6e9e7',
    red: '#ef4050',
    blue: '#2d78ad',
    teal: '#159f8b',
    gold: '#d99416',
    purple: '#7040db'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    soft: '#253249',
    ink: '#eef2f7',
    muted: '#a8b4c5',
    border: '#3e4d64',
    grid: '#2a394d',
    red: '#ff707c',
    blue: '#70b8ee',
    teal: '#4ed9c0',
    gold: '#fbbf24',
    purple: '#bb86fc'
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
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width = 4
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
    x2 - ARROW_HEAD * Math.cos(angle - Math.PI / 6),
    y2 - ARROW_HEAD * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    x2 - ARROW_HEAD * Math.cos(angle + Math.PI / 6),
    y2 - ARROW_HEAD * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
}

function unitVector(x: number, y: number): { x: number; y: number } {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

function drawBackground(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = p.panel;
  ctx.fillRect(DIAGRAM_X, DIAGRAM_Y, DIAGRAM_W, DIAGRAM_H);
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(DIAGRAM_X, DIAGRAM_Y, DIAGRAM_W, DIAGRAM_H);
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let x = GRID_START; x <= GRID_END_X; x += GRID_STEP) {
    ctx.beginPath();
    ctx.moveTo(x, DIAGRAM_Y);
    ctx.lineTo(x, GRID_END_Y);
    ctx.stroke();
  }
  for (let y = GRID_START; y <= GRID_END_Y; y += GRID_STEP) {
    ctx.beginPath();
    ctx.moveTo(DIAGRAM_X, y);
    ctx.lineTo(GRID_END_X, y);
    ctx.stroke();
  }
  ctx.strokeStyle = p.border;
  ctx.setLineDash([CIRCLE_DASH, CIRCLE_GAP]);
  ctx.beginPath();
  ctx.moveTo(CENTER_X, DIAGRAM_Y);
  ctx.lineTo(CENTER_X, GRID_END_Y);
  ctx.moveTo(DIAGRAM_X, CENTER_Y);
  ctx.lineTo(GRID_END_X, CENTER_Y);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawMotion(
  ctx: CanvasRenderingContext2D,
  state: CentripetalState,
  p: Palette
): void {
  const radius = state.params.radius * RADIUS_SCALE;
  const x = CENTER_X + radius * Math.cos(state.angle);
  const y = CENTER_Y + radius * Math.sin(state.angle);
  const radial = unitVector(CENTER_X - x, CENTER_Y - y);
  const tangent = { x: -radial.y, y: radial.x };
  const speedReference = DEFAULT_OMEGA * DEFAULT_RADIUS;
  const forceReference =
    DEFAULT_MASS * DEFAULT_OMEGA * DEFAULT_OMEGA * DEFAULT_RADIUS;
  const speedLength = Math.max(
    ARROW_BASE_SPEED * (state.speed / speedReference),
    ARROW_BASE_SPEED * 0.45
  );
  const forceLength = Math.max(
    ARROW_BASE_FORCE * (state.centripetalForce / forceReference),
    ARROW_BASE_FORCE * 0.45
  );

  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 3;
  ctx.setLineDash([CIRCLE_DASH, CIRCLE_GAP]);
  ctx.beginPath();
  ctx.arc(CENTER_X, CENTER_Y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(CENTER_X, CENTER_Y);
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.fillStyle = p.ink;
  ctx.beginPath();
  ctx.arc(CENTER_X, CENTER_Y, 9, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, 'O', CENTER_X, CENTER_Y - 20, p.muted, 13, 'center', 700);

  arrow(
    ctx,
    x,
    y,
    x + tangent.x * speedLength,
    y + tangent.y * speedLength,
    p.blue,
    5
  );
  text(
    ctx,
    'v',
    x + tangent.x * (speedLength + 18),
    y + tangent.y * (speedLength + 18),
    p.blue,
    18,
    'center',
    700
  );
  arrow(
    ctx,
    x,
    y,
    x + radial.x * forceLength,
    y + radial.y * forceLength,
    p.red,
    5
  );
  text(
    ctx,
    'Fₙ',
    x + radial.x * (forceLength + 18),
    y + radial.y * (forceLength + 18),
    p.red,
    17,
    'center',
    700
  );

  const markerStart = { x: x + tangent.x * 14, y: y + tangent.y * 14 };
  const markerCorner = {
    x: markerStart.x + radial.x * RIGHT_ANGLE_SIZE,
    y: markerStart.y + radial.y * RIGHT_ANGLE_SIZE
  };
  const markerEnd = {
    x: x + radial.x * RIGHT_ANGLE_SIZE,
    y: y + radial.y * RIGHT_ANGLE_SIZE
  };
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(markerStart.x, markerStart.y);
  ctx.lineTo(markerCorner.x, markerCorner.y);
  ctx.lineTo(markerEnd.x, markerEnd.y);
  ctx.stroke();
  ctx.fillStyle = p.teal;
  ctx.beginPath();
  ctx.arc(x, y, BALL_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.blue;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, 'm', x, y, '#ffffff', 17, 'center', 700);
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  state: CentripetalState,
  p: Palette
): void {
  drawBackground(ctx, p);
  text(
    ctx,
    '圆周运动动力学分析',
    DIAGRAM_X + PANEL_PADDING,
    DIAGRAM_Y + 28,
    p.ink,
    20,
    'left',
    700
  );
  drawMotion(ctx, state, p);
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: CentripetalState,
  p: Palette
): void {
  ctx.fillStyle = p.panel;
  ctx.fillRect(FIELD_W, 0, BASE_W - FIELD_W, BASE_H);
  text(
    ctx,
    '圆周运动动力学分析',
    PANEL_X + PANEL_PADDING,
    38,
    p.ink,
    20,
    'left',
    700
  );
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PANEL_X + PANEL_PADDING, HEADER_RULE_Y);
  ctx.lineTo(PANEL_X + PANEL_W - PANEL_PADDING, HEADER_RULE_Y);
  ctx.stroke();

  rounded(ctx, CARD_X, FORMULA_Y, CARD_W, FORMULA_H, 12);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  ctx.fillStyle = `${p.red}16`;
  ctx.fillRect(
    CARD_X + PANEL_PADDING,
    FORMULA_Y + PANEL_PADDING,
    CARD_W - PANEL_PADDING * 2,
    46
  );
  text(
    ctx,
    'Fₙ = m·ω²·r',
    CARD_X + CARD_W / 2,
    FORMULA_Y + 39,
    p.red,
    20,
    'center',
    700
  );
  ctx.fillStyle = `${p.blue}14`;
  ctx.fillRect(
    CARD_X + PANEL_PADDING,
    FORMULA_Y + FORMULA_SECOND_ROW_OFFSET,
    CARD_W - PANEL_PADDING * 2,
    46
  );
  text(
    ctx,
    'v = ω·r    aₙ = ω²·r',
    CARD_X + CARD_W / 2,
    FORMULA_Y + 99,
    p.ink,
    18,
    'center',
    700
  );

  rounded(ctx, CARD_X, CONTROL_Y, CARD_W, CONTROL_H, 12);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(
    ctx,
    '系统参数',
    CARD_X + PANEL_PADDING,
    CONTROL_Y + 26,
    p.ink,
    17,
    'left',
    700
  );
  const params: Array<[string, string, string]> = [
    ['质点质量 m', `${state.params.mass.toFixed(1)} kg`, p.blue],
    ['轨道半径 r', `${state.params.radius.toFixed(1)} m`, p.blue],
    ['角速度 ω', `${state.params.angularVelocity.toFixed(1)} rad/s`, p.blue]
  ];
  params.forEach(([label, value, color], index) => {
    const y = CONTROL_Y + 74 + index * READOUT_ROW_GAP * 2;
    text(ctx, label, CARD_X + PANEL_PADDING, y, p.muted, 13, 'left', 600);
    text(
      ctx,
      value,
      CARD_X + CARD_W - PANEL_PADDING,
      y,
      color,
      15,
      'right',
      700
    );
    ctx.strokeStyle = p.grid;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(CARD_X + PANEL_PADDING, y + READOUT_ROW_GAP);
    ctx.lineTo(CARD_X + CARD_W - PANEL_PADDING, y + READOUT_ROW_GAP);
    ctx.stroke();
    ctx.lineCap = 'butt';
  });

  rounded(ctx, CARD_X, READOUT_Y, CARD_W, READOUT_H, 12);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(
    ctx,
    '实时状态监测',
    CARD_X + PANEL_PADDING,
    READOUT_Y + 26,
    p.ink,
    17,
    'left',
    700
  );
  const readings: Array<[string, string, string]> = [
    ['向心力 Fₙ', `${state.centripetalForce.toFixed(2)} N`, p.red],
    ['线速度 v', `${state.speed.toFixed(2)} m/s`, p.blue],
    [
      '向心加速度 aₙ',
      `${state.centripetalAcceleration.toFixed(2)} m/s²`,
      p.ink
    ],
    ['运动周期 T', `${state.period.toFixed(2)} s`, p.ink]
  ];
  readings.forEach(([label, value, color], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = CARD_X + PANEL_PADDING + column * (CARD_W / 2 - 4);
    const y = READOUT_Y + 68 + row * 62;
    rounded(ctx, x, y, CARD_W / 2 - 24, 48, 8);
    ctx.fillStyle = p.soft;
    ctx.fill();
    text(ctx, label, x + 12, y + 15, p.muted, 11, 'left', 600);
    text(ctx, value, x + 12, y + 36, color, 16, 'left', 700);
  });
}

export function createCentripetalView(
  options: CreateCentripetalViewOptions = {}
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
  let snapshot: CentripetalState | null = null;
  function draw(state: CentripetalState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(width / BASE_W, height / BASE_H);
    const offsetY = (height - BASE_H * fit) / 2;
    const responsiveScale = stage.responsiveScale;
    const p = PALETTE[env.theme];
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(0, offsetY);
    ctx.scale(fit, fit);
    ctx.lineWidth = responsiveScale;
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, BASE_W, BASE_H);
    drawScene(ctx, state, p);
    drawPanel(ctx, state, p);
    ctx.restore();
  }
  return {
    render(state: CentripetalState): void {
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
