import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { accelForceConstants, type AccelForceState } from './scene.sim';
export type CreateAccelForceViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};
const {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  fieldWidth: FIELD_W,
  trackY: TRACK_Y,
  cartX: CART_X,
  trackLeft: TRACK_LEFT,
  trackRight: TRACK_RIGHT,
  graphLeft: GRAPH_LEFT,
  graphRight: GRAPH_RIGHT,
  graphTop: GRAPH_TOP,
  graphBottom: GRAPH_BOTTOM,
  panelWidth: PANEL_W,
  panelInset: INSET,
  gridStep: GRID_STEP,
  graphMaxAccel: MAX_A,
  hangerYOffset: HANGER_Y_OFFSET,
  formulaBoxY: FORMULA_BOX_Y
} = accelForceConstants;
type Palette = {
  bg: string;
  panel: string;
  grid: string;
  ink: string;
  muted: string;
  red: string;
  blue: string;
  teal: string;
  gold: string;
  border: string;
  soft: string;
};
const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    panel: '#fff',
    grid: '#dce4ea',
    ink: '#303744',
    muted: '#8190a0',
    red: '#ef4050',
    blue: '#3278bc',
    teal: '#2a9d8f',
    gold: '#e6a719',
    border: '#d2d9e2',
    soft: '#f0f2f5'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    grid: '#435169',
    ink: '#eef2f7',
    muted: '#9eabbc',
    red: '#fb7185',
    blue: '#60a5fa',
    teal: '#34d399',
    gold: '#fbbf24',
    border: '#3c4b61',
    soft: '#253249'
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
function arrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const n = Math.hypot(dx, dy);
  if (n < 2) return;
  const ux = dx / n;
  const uy = dy / n;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 4;
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
function drawGraph(
  ctx: CanvasRenderingContext2D,
  state: AccelForceState,
  p: Palette,
  scale: number
): void {
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let x = GRAPH_LEFT; x <= GRAPH_RIGHT; x += GRID_STEP) {
    ctx.beginPath();
    ctx.moveTo(x, GRAPH_TOP);
    ctx.lineTo(x, GRAPH_BOTTOM);
    ctx.stroke();
  }
  for (let y = 0; y <= MAX_A; y += 0.5) {
    const py = GRAPH_BOTTOM - ((GRAPH_BOTTOM - GRAPH_TOP) * y) / MAX_A;
    ctx.beginPath();
    ctx.moveTo(GRAPH_LEFT, py);
    ctx.lineTo(GRAPH_RIGHT, py);
    ctx.stroke();
    text(ctx, y.toFixed(1), GRAPH_LEFT - 10, py, p.muted, 10 * scale, 'right');
  }
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(GRAPH_LEFT, GRAPH_BOTTOM);
  ctx.lineTo(GRAPH_RIGHT + 10, GRAPH_BOTTOM);
  ctx.moveTo(GRAPH_LEFT, GRAPH_BOTTOM);
  ctx.lineTo(GRAPH_LEFT, GRAPH_TOP - 8);
  ctx.stroke();
  text(
    ctx,
    state.params.mode === 'force' ? 'F / N' : '1/M / kg⁻¹',
    GRAPH_RIGHT,
    GRAPH_BOTTOM + 20,
    p.ink,
    12 * scale,
    'right',
    700
  );
  text(
    ctx,
    'a / m·s⁻²',
    GRAPH_LEFT,
    GRAPH_TOP - 20,
    p.ink,
    12 * scale,
    'left',
    700
  );
  ctx.strokeStyle = p.teal;
  ctx.lineWidth = 3;
  ctx.beginPath();
  state.samples.forEach((sample, index) => {
    const x = GRAPH_LEFT + ((GRAPH_RIGHT - GRAPH_LEFT) * index) / 7;
    const y =
      GRAPH_BOTTOM -
      ((GRAPH_BOTTOM - GRAPH_TOP) * Math.min(MAX_A, sample.y)) / MAX_A;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}
function drawExperiment(
  ctx: CanvasRenderingContext2D,
  state: AccelForceState,
  p: Palette,
  scale: number
): void {
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(TRACK_LEFT, TRACK_Y);
  ctx.lineTo(TRACK_RIGHT, TRACK_Y);
  ctx.stroke();
  const x = CART_X + state.position;
  ctx.fillStyle = p.blue;
  ctx.fillRect(x - 42, TRACK_Y - 32, 84 * scale, 32 * scale);
  ctx.fillStyle = p.panel;
  ctx.fillRect(x - 28, TRACK_Y - 48, 56 * scale, 16 * scale);
  ctx.fillStyle = p.ink;
  ctx.beginPath();
  ctx.arc(x - 24, TRACK_Y + 5, 8, 0, Math.PI * 2);
  ctx.arc(x + 24, TRACK_Y + 5, 8, 0, Math.PI * 2);
  ctx.fill();
  text(
    ctx,
    `M=${state.params.cartMass.toFixed(2)} kg`,
    x,
    TRACK_Y - 16,
    p.panel,
    12 * scale,
    'center',
    700
  );
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(x + 42, TRACK_Y - 16);
  ctx.lineTo(TRACK_RIGHT - 20, TRACK_Y + 40);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = p.gold;
  ctx.beginPath();
  ctx.arc(
    TRACK_RIGHT - 20,
    TRACK_Y + HANGER_Y_OFFSET,
    18 * scale,
    0,
    Math.PI * 2
  );
  ctx.fill();
  text(
    ctx,
    `m=${state.params.hangerMass.toFixed(2)}`,
    TRACK_RIGHT - 20,
    TRACK_Y + 56,
    p.ink,
    10 * scale,
    'center',
    700
  );
  arrow(ctx, x + 46, TRACK_Y - 16, x + 120, TRACK_Y - 16, p.blue);
  text(
    ctx,
    `F=${state.force.toFixed(3)} N`,
    x + 130,
    TRACK_Y - 36,
    p.blue,
    13 * scale,
    'center',
    700
  );
  text(
    ctx,
    '打点计时器',
    TRACK_LEFT + 40,
    TRACK_Y - 48,
    p.muted,
    13 * scale,
    'center'
  );
  text(
    ctx,
    state.status,
    310,
    305,
    state.params.balanced ? p.teal : p.red,
    13 * scale,
    'center',
    700
  );
}
function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: AccelForceState,
  p: Palette,
  scale: number
): void {
  const x = FIELD_W;
  ctx.fillStyle = p.panel;
  ctx.fillRect(x, 0, BASE_W - FIELD_W, BASE_H);
  ctx.strokeStyle = p.border;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, BASE_H);
  ctx.stroke();
  text(ctx, '探究 a 与 F、M', x + INSET, 38, p.ink, 19 * scale, 'left', 700);
  ctx.fillStyle = p.soft;
  ctx.beginPath();
  ctx.roundRect(
    x + INSET,
    FORMULA_BOX_Y,
    PANEL_W * scale,
    82 * scale,
    10 * scale
  );
  ctx.fill();
  text(ctx, 'F = Ma', x + 42, 134, p.ink, 16 * scale, 'left', 700);
  text(
    ctx,
    state.params.mode === 'force' ? 'a ∝ F' : 'a ∝ 1/M',
    x + 42,
    164,
    p.teal,
    16 * scale,
    'left',
    700
  );
  const rows: Array<[string, string, string]> = [
    ['拉力 F', `${state.force.toFixed(3)} N`, p.blue],
    ['理论加速度', `${state.acceleration.toFixed(2)} m/s²`, p.teal],
    ['瞬时速度', `${state.velocity.toFixed(2)} m/s`, p.ink],
    ['时间 t', `${state.time.toFixed(2)} s`, p.ink]
  ];
  rows.forEach(([label, value, color], index) => {
    const y = 232 + index * 34;
    text(ctx, label, x + 42, y, p.muted, 13 * scale);
    text(ctx, value, x + 224, y, color, 13 * scale, 'right', 700);
  });
  text(ctx, '纸带逐差：Δs = a(Δt)²', x + INSET, 404, p.muted, 12 * scale);
  text(
    ctx,
    '平衡摩擦后，a = F/M',
    x + INSET,
    438,
    p.teal,
    13 * scale,
    'left',
    700
  );
}
export function createAccelForceView(
  options: CreateAccelForceViewOptions = {}
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
  let snapshot: AccelForceState | null = null;
  function draw(state: AccelForceState): void {
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
    ctx.fillRect(0, 0, FIELD_W, BASE_H);
    drawExperiment(ctx, state, p, scale);
    drawGraph(ctx, state, p, scale);
    drawPanel(ctx, state, p, scale);
    ctx.restore();
  }
  return {
    render(state: AccelForceState): void {
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
