import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { magneticMirrorConstants, type MagneticMirrorState } from './scene.sim';

export type CreateMagneticMirrorViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

const {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  fieldWidth: FIELD_W,
  panelWidth: PANEL_W,
  panelInset: INSET,
  dividerY: DIVIDER_Y,
  axisY: AXIS_Y,
  coilLeftX: COIL_LEFT_X,
  coilRightX: COIL_RIGHT_X,
  centerX: CENTER_X,
  halfLength: HALF_LENGTH,
  coilWidth: COIL_WIDTH,
  coilHeight: COIL_HEIGHT,
  fieldTop: FIELD_TOP,
  fieldBottom: FIELD_BOTTOM,
  weakRegionWidth: WEAK_REGION_WIDTH,
  fieldCurveInset: FIELD_CURVE_INSET,
  fieldCurveControlInset: FIELD_CURVE_CONTROL_INSET,
  orbitRadius: ORBIT_RADIUS,
  trailLength: TRAIL_LENGTH,
  fieldLineCount: FIELD_LINE_COUNT,
  lineDash: LINE_DASH,
  particleRadius: PARTICLE_RADIUS,
  arrowLength: ARROW_LENGTH,
  cardWidth: CARD_WIDTH,
  formulaCardY: FORMULA_CARD_Y,
  formulaCardHeight: FORMULA_CARD_HEIGHT,
  readoutCardY: READOUT_CARD_Y,
  readoutCardHeight: READOUT_CARD_HEIGHT,
  readoutRowHeight: READOUT_ROW_HEIGHT,
  calloutY: CALLOUT_Y,
  calloutHeight: CALLOUT_HEIGHT
} = magneticMirrorConstants;

type Palette = {
  bg: string;
  panel: string;
  grid: string;
  ink: string;
  muted: string;
  blue: string;
  orange: string;
  gold: string;
  green: string;
  cyan: string;
  red: string;
  magenta: string;
  border: string;
  soft: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    panel: '#ffffff',
    grid: '#e2e8f0',
    ink: '#283548',
    muted: '#748296',
    blue: '#78b8f2',
    orange: '#f08325',
    gold: '#e5ab27',
    green: '#159f8d',
    cyan: '#04a8d6',
    red: '#ef3948',
    magenta: '#ba4ad4',
    border: '#d3dce6',
    soft: '#f2f5f8'
  },
  dark: {
    bg: '#0f172a',
    panel: '#172235',
    grid: '#34445d',
    ink: '#eef2f7',
    muted: '#a3b1c4',
    blue: '#78b8f2',
    orange: '#fb923c',
    gold: '#fbbf24',
    green: '#42d0be',
    cyan: '#38c8f1',
    red: '#fb7185',
    magenta: '#d58aea',
    border: '#3d4d63',
    soft: '#243248'
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

function arrowLine(
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
  ctx.lineTo(x2 - ux * 14 - uy * 6, y2 - uy * 14 + ux * 6);
  ctx.lineTo(x2 - ux * 14 + uy * 6, y2 - uy * 14 - ux * 6);
  ctx.closePath();
  ctx.fill();
}

function drawFieldLines(
  ctx: CanvasRenderingContext2D,
  state: MagneticMirrorState,
  p: Palette
): void {
  if (!state.params.showField) return;
  ctx.strokeStyle = p.blue;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([LINE_DASH, LINE_DASH]);
  for (let i = 0; i < FIELD_LINE_COUNT; i += 1) {
    const offset = (i - (FIELD_LINE_COUNT - 1) / 2) * 44;
    ctx.beginPath();
    ctx.moveTo(COIL_LEFT_X - FIELD_CURVE_INSET, AXIS_Y + offset * 0.76);
    ctx.bezierCurveTo(
      COIL_LEFT_X + FIELD_CURVE_CONTROL_INSET,
      AXIS_Y + offset,
      COIL_RIGHT_X - FIELD_CURVE_CONTROL_INSET,
      AXIS_Y + offset,
      COIL_RIGHT_X + FIELD_CURVE_INSET,
      AXIS_Y + offset * 0.76
    );
    ctx.stroke();
  }
  ctx.setLineDash([]);
  arrowLine(
    ctx,
    CENTER_X - 92,
    AXIS_Y - 2,
    CENTER_X - 18,
    AXIS_Y - 2,
    p.blue,
    2
  );
  arrowLine(
    ctx,
    CENTER_X + 18,
    AXIS_Y - 2,
    CENTER_X + 92,
    AXIS_Y - 2,
    p.blue,
    2
  );
}

function drawCoil(
  ctx: CanvasRenderingContext2D,
  x: number,
  p: Palette,
  scale: number
): void {
  ctx.strokeStyle = p.orange;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.ellipse(x, AXIS_Y, COIL_WIDTH, COIL_HEIGHT / 2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = p.gold;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(
    x,
    AXIS_Y,
    COIL_WIDTH + 12,
    COIL_HEIGHT / 2 + 14,
    0,
    0,
    Math.PI * 2
  );
  ctx.stroke();
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(
    x,
    AXIS_Y,
    COIL_WIDTH - 7,
    COIL_HEIGHT / 2 - 18,
    0,
    0,
    Math.PI * 2
  );
  ctx.stroke();
  text(ctx, '强磁场', x, FIELD_TOP - 24, p.orange, 13 * scale, 'center', 700);
}

function drawParticle(
  ctx: CanvasRenderingContext2D,
  state: MagneticMirrorState,
  p: Palette,
  scale: number
): void {
  const x = CENTER_X + state.position * HALF_LENGTH;
  const phase = state.time * 9;
  ctx.strokeStyle = p.gold;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i <= TRAIL_LENGTH; i += 2) {
    const px = x - TRAIL_LENGTH + i;
    const local = (i / TRAIL_LENGTH) * Math.PI * 5 + phase;
    const amplitude = ORBIT_RADIUS * (0.5 + Math.abs(state.position) * 0.55);
    const py = AXIS_Y + Math.sin(local) * amplitude;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.fillStyle = p.red;
  ctx.beginPath();
  ctx.arc(x, AXIS_Y, PARTICLE_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.panel;
  ctx.beginPath();
  ctx.arc(x, AXIS_Y, 3, 0, Math.PI * 2);
  ctx.fill();

  if (state.params.showVelocity) {
    const direction = state.parallelSpeed >= 0 ? 1 : -1;
    arrowLine(ctx, x, AXIS_Y, x + direction * ARROW_LENGTH, AXIS_Y, p.green, 4);
    text(
      ctx,
      'v∥',
      x + direction * (ARROW_LENGTH - 18),
      AXIS_Y - 18,
      p.green,
      15 * scale,
      'center',
      700
    );
    arrowLine(ctx, x, AXIS_Y, x, AXIS_Y + 72, p.cyan, 4);
    text(ctx, 'v⊥', x + 15, AXIS_Y + 48, p.cyan, 15 * scale, 'left', 700);
    arrowLine(ctx, x, AXIS_Y, x - direction * 54, AXIS_Y + 56, p.red, 4);
    text(
      ctx,
      'v',
      x - direction * 54,
      AXIS_Y + 72,
      p.red,
      15 * scale,
      'center',
      700
    );
  }
  if (state.params.showForce) {
    arrowLine(ctx, x, AXIS_Y, x - 58, AXIS_Y - 38, p.magenta, 4);
    text(ctx, 'F', x - 66, AXIS_Y - 46, p.magenta, 15 * scale, 'center', 700);
  }
}

function drawFieldRegion(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  scale: number
): void {
  ctx.fillStyle = p.soft;
  ctx.beginPath();
  ctx.roundRect(
    CENTER_X - WEAK_REGION_WIDTH / 2,
    FIELD_TOP - 20,
    WEAK_REGION_WIDTH,
    FIELD_BOTTOM - FIELD_TOP + 40,
    12
  );
  ctx.fill();
  text(
    ctx,
    '中间瓶腹区域（弱磁场）',
    CENTER_X,
    FIELD_BOTTOM + 38,
    p.muted,
    14 * scale,
    'center',
    700
  );
  text(
    ctx,
    '左端线圈（强磁场）',
    COIL_LEFT_X,
    FIELD_BOTTOM + 38,
    p.ink,
    14 * scale,
    'center',
    700
  );
  text(
    ctx,
    '右端线圈（强磁场）',
    COIL_RIGHT_X,
    FIELD_BOTTOM + 38,
    p.ink,
    14 * scale,
    'center',
    700
  );
  text(
    ctx,
    '磁镜反射边界',
    COIL_LEFT_X,
    FIELD_BOTTOM + 60,
    p.red,
    12 * scale,
    'center'
  );
  text(
    ctx,
    '磁镜反射边界',
    COIL_RIGHT_X,
    FIELD_BOTTOM + 60,
    p.red,
    12 * scale,
    'center'
  );
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: MagneticMirrorState,
  p: Palette,
  scale: number
): void {
  const x = FIELD_W;
  ctx.fillStyle = p.panel;
  ctx.fillRect(x, 0, PANEL_W, BASE_H);
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, BASE_H);
  ctx.stroke();
  text(ctx, '磁镜与磁约束', x + INSET, 38, p.ink, 19 * scale, 'left', 700);
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + INSET, DIVIDER_Y);
  ctx.lineTo(x + CARD_WIDTH + INSET, DIVIDER_Y);
  ctx.stroke();

  ctx.fillStyle = p.soft;
  ctx.beginPath();
  ctx.roundRect(x + INSET, FORMULA_CARD_Y, CARD_WIDTH, FORMULA_CARD_HEIGHT, 12);
  ctx.fill();
  text(
    ctx,
    '物理关系',
    x + INSET + 18,
    FORMULA_CARD_Y + 22,
    p.muted,
    13 * scale,
    'left',
    700
  );
  text(
    ctx,
    'F = q(v × B)',
    x + INSET + 18,
    FORMULA_CARD_Y + 54,
    p.ink,
    16 * scale,
    'left',
    700
  );
  text(
    ctx,
    'Eₖ = ½mv² = 常量',
    x + INSET + 18,
    FORMULA_CARD_Y + 86,
    p.green,
    14 * scale,
    'left',
    700
  );
  text(
    ctx,
    'd = v∥T',
    x + INSET + 18,
    FORMULA_CARD_Y + 112,
    p.cyan,
    14 * scale,
    'left',
    700
  );

  ctx.fillStyle = p.soft;
  ctx.beginPath();
  ctx.roundRect(x + INSET, READOUT_CARD_Y, CARD_WIDTH, READOUT_CARD_HEIGHT, 12);
  ctx.fill();
  const rows: Array<[string, string, string]> = [
    ['轴向位置 x', `${(state.position * 23.4).toFixed(2)} cm`, p.ink],
    ['轴向速度 v∥', `${state.parallelSpeed.toFixed(2)} 米/秒`, p.green],
    ['垂直速度 v⊥', `${state.perpendicularSpeed.toFixed(2)} 米/秒`, p.cyan],
    ['轨迹螺距 d', `${state.pitchDistance.toFixed(2)} cm`, p.gold],
    ['动能 Eₖ', `${state.energy.toFixed(2)} 焦耳`, p.red],
    ['磁矩 μ', `${state.magneticMoment.toFixed(3)}`, p.blue]
  ];
  rows.forEach(([label, value, color], index) => {
    const y = READOUT_CARD_Y + 18 + index * READOUT_ROW_HEIGHT;
    text(ctx, label, x + INSET + 18, y, p.muted, 12 * scale);
    text(
      ctx,
      value,
      x + INSET + CARD_WIDTH - 18,
      y,
      color,
      12 * scale,
      'right',
      700
    );
  });

  ctx.fillStyle = '#e7f4f1';
  ctx.beginPath();
  ctx.roundRect(x + INSET, CALLOUT_Y, CARD_WIDTH, CALLOUT_HEIGHT, 12);
  ctx.fill();
  const modeText: Record<MirrorModeKey, [string, string]> = {
    trajectory: ['两端强、中间弱', '粒子在磁镜间往返'],
    velocity: ['B 增大 → v⊥ 增大', 'v∥ 随之减小'],
    force: ['洛伦兹力垂直 v', '磁场力不做功'],
    summary: ['动能与磁矩保持', '磁镜实现无接触约束']
  };
  const [lineOne, lineTwo] = modeText[state.params.mode];
  text(
    ctx,
    lineOne,
    x + INSET + 18,
    CALLOUT_Y + 30,
    p.green,
    14 * scale,
    'left',
    700
  );
  text(
    ctx,
    lineTwo,
    x + INSET + 18,
    CALLOUT_Y + 64,
    p.green,
    14 * scale,
    'left',
    700
  );
  text(
    ctx,
    state.status,
    x + INSET + 18,
    CALLOUT_Y + 100,
    p.muted,
    12 * scale,
    'left'
  );
  text(
    ctx,
    `Rₘ = ${state.params.mirrorRatio.toFixed(1)}`,
    x + INSET + 18,
    CALLOUT_Y + 124,
    p.blue,
    12 * scale,
    'left',
    700
  );
}

type MirrorModeKey = MagneticMirrorState['params']['mode'];

export function createMagneticMirrorView(
  options: CreateMagneticMirrorViewOptions = {}
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
  let snapshot: MagneticMirrorState | null = null;

  function draw(state: MagneticMirrorState): void {
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
    drawFieldRegion(ctx, p, scale);
    drawFieldLines(ctx, state, p);
    drawCoil(ctx, COIL_LEFT_X, p, scale);
    drawCoil(ctx, COIL_RIGHT_X, p, scale);
    ctx.strokeStyle = p.muted;
    ctx.lineWidth = 2;
    ctx.setLineDash([LINE_DASH, LINE_DASH]);
    ctx.beginPath();
    ctx.moveTo(COIL_LEFT_X - FIELD_CURVE_INSET, AXIS_Y);
    ctx.lineTo(COIL_RIGHT_X + FIELD_CURVE_INSET, AXIS_Y);
    ctx.stroke();
    ctx.setLineDash([]);
    text(
      ctx,
      'x（磁瓶中心轴）',
      COIL_RIGHT_X + 66,
      AXIS_Y - 4,
      p.muted,
      12 * scale,
      'left'
    );
    drawParticle(ctx, state, p, scale);
    drawPanel(ctx, state, p, scale);
    ctx.restore();
  }

  return {
    render(state: MagneticMirrorState): void {
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
