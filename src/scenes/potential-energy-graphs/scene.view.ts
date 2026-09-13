import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { potentialGraphConstants, type PotentialGraphState } from './scene.sim';

export type CreatePotentialGraphViewOptions = {
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
  fieldLeft: FIELD_LEFT,
  fieldRight: FIELD_RIGHT,
  fieldTop: FIELD_TOP,
  fieldBottom: FIELD_BOTTOM,
  lineY: LINE_Y,
  lineLeft: LINE_LEFT,
  lineRight: LINE_RIGHT,
  phiGraphX: PHI_X,
  phiGraphY: PHI_Y,
  phiGraphWidth: PHI_W,
  phiGraphHeight: PHI_H,
  eGraphX: E_X,
  eGraphY: E_Y,
  eGraphWidth: E_W,
  eGraphHeight: E_H,
  graphLeft: GRAPH_LEFT,
  graphRight: GRAPH_RIGHT,
  phiTop: PHI_TOP,
  phiBottom: PHI_BOTTOM,
  eTop: E_TOP,
  eBottom: E_BOTTOM,
  xMin: X_MIN,
  xMax: X_MAX,
  phiMin: PHI_MIN,
  phiMax: PHI_MAX,
  eMin: E_MIN,
  eMax: E_MAX,
  graphGridStep: GRID_STEP,
  probeRadius: PROBE_RADIUS,
  electrodeWidth: ELECTRODE_W,
  electrodeHalfHeight: ELECTRODE_HALF_H,
  cardX: CARD_X,
  cardWidth: CARD_W,
  headerRuleY: HEADER_RULE_Y,
  readoutY: READOUT_Y,
  readoutHeight: READOUT_H,
  summaryY: SUMMARY_Y,
  summaryHeight: SUMMARY_H,
  notesY: NOTES_Y,
  notesHeight: NOTES_H,
  tangentSpan: TANGENT_SPAN
} = potentialGraphConstants;
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
  wire: string;
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
    blue: '#2d82d0',
    teal: '#23a99a',
    gold: '#d99416',
    purple: '#7b34c7',
    wire: '#3e4854'
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
    blue: '#65b6ef',
    teal: '#4ed9c0',
    gold: '#fbbf24',
    purple: '#bb86fc',
    wire: '#c2cedc'
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
function xToPx(x: number): number {
  return (
    GRAPH_LEFT + ((x - X_MIN) / (X_MAX - X_MIN)) * (GRAPH_RIGHT - GRAPH_LEFT)
  );
}
function phiToPx(phi: number): number {
  return (
    PHI_BOTTOM -
    ((phi - PHI_MIN) / (PHI_MAX - PHI_MIN)) * (PHI_BOTTOM - PHI_TOP)
  );
}
function eToPx(field: number): number {
  return E_BOTTOM - ((field - E_MIN) / (E_MAX - E_MIN)) * (E_BOTTOM - E_TOP);
}
function drawAxes(
  ctx: CanvasRenderingContext2D,
  top: number,
  bottom: number,
  p: Palette,
  label: string
): void {
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(GRAPH_LEFT, bottom);
  ctx.lineTo(GRAPH_RIGHT + 12, bottom);
  ctx.moveTo(GRAPH_LEFT, bottom);
  ctx.lineTo(GRAPH_LEFT, top - 10);
  ctx.stroke();
  text(ctx, label, FIELD_LEFT + 8, top - 20, p.blue, 15, 'left', 700);
  text(ctx, 'x / m', GRAPH_RIGHT + 18, bottom, p.ink, 12, 'left', 700);
  text(ctx, '0', GRAPH_LEFT - 10, bottom + 4, p.muted, 10, 'right', 600);
  text(ctx, '10', GRAPH_RIGHT, bottom + 16, p.muted, 10, 'center', 600);
}
function drawGrid(
  ctx: CanvasRenderingContext2D,
  top: number,
  bottom: number,
  p: Palette
): void {
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let x = GRAPH_LEFT; x <= GRAPH_RIGHT; x += GRID_STEP) {
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
  }
  for (let y = top; y <= bottom; y += GRID_STEP) {
    ctx.beginPath();
    ctx.moveTo(GRAPH_LEFT, y);
    ctx.lineTo(GRAPH_RIGHT, y);
    ctx.stroke();
  }
}
function drawFieldLine(
  ctx: CanvasRenderingContext2D,
  state: PotentialGraphState,
  p: Palette
): void {
  ctx.strokeStyle = p.wire;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(LINE_LEFT, LINE_Y);
  ctx.lineTo(LINE_RIGHT, LINE_Y);
  ctx.stroke();
  ctx.fillStyle = p.red;
  ctx.fillRect(
    LINE_LEFT,
    LINE_Y - ELECTRODE_HALF_H,
    ELECTRODE_W,
    ELECTRODE_HALF_H * 2
  );
  ctx.fillStyle = p.blue;
  ctx.fillRect(
    LINE_RIGHT - ELECTRODE_W,
    LINE_Y - ELECTRODE_HALF_H,
    ELECTRODE_W,
    ELECTRODE_HALF_H * 2
  );
  const probeX = xToPx(state.probePosition);
  ctx.fillStyle = state.params.probeCharge > 0 ? p.red : p.blue;
  ctx.beginPath();
  ctx.arc(probeX, LINE_Y, PROBE_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  text(
    ctx,
    state.params.probeCharge > 0 ? '+q' : '−q',
    probeX,
    LINE_Y,
    '#ffffff',
    12,
    'center',
    700
  );
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = p.teal;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(probeX, LINE_Y + PROBE_RADIUS);
  ctx.lineTo(probeX, PHI_TOP);
  ctx.stroke();
  ctx.setLineDash([]);
  text(
    ctx,
    '理想化一维静电场（数值模型）',
    FIELD_LEFT + 4,
    FIELD_TOP - 4,
    p.ink,
    16,
    'left',
    700
  );
  text(
    ctx,
    `x=${state.probePosition.toFixed(2)} m`,
    LINE_RIGHT,
    FIELD_TOP - 4,
    p.teal,
    13,
    'right',
    700
  );
}
function drawPhiGraph(
  ctx: CanvasRenderingContext2D,
  state: PotentialGraphState,
  p: Palette
): void {
  rounded(ctx, PHI_X, PHI_Y, PHI_W, PHI_H, 12);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  drawGrid(ctx, PHI_TOP, PHI_BOTTOM, p);
  drawAxes(ctx, PHI_TOP, PHI_BOTTOM, p, 'φ / V');
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let i = 0; i <= 100; i += 1) {
    const x = X_MIN + ((X_MAX - X_MIN) * i) / 100;
    const y = phiToPx(potentialAtForView(state, x));
    if (i === 0) ctx.moveTo(xToPx(x), y);
    else ctx.lineTo(xToPx(x), y);
  }
  ctx.stroke();
  const probeX = xToPx(state.probePosition);
  const probeY = phiToPx(state.potential);
  if (state.params.showTangent) {
    const x1 = Math.max(X_MIN, state.probePosition - TANGENT_SPAN);
    const x2 = Math.min(X_MAX, state.probePosition + TANGENT_SPAN);
    ctx.strokeStyle = p.teal;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(
      xToPx(x1),
      phiToPx(state.potential + state.slope * (x1 - state.probePosition))
    );
    ctx.lineTo(
      xToPx(x2),
      phiToPx(state.potential + state.slope * (x2 - state.probePosition))
    );
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.fillStyle = p.red;
  ctx.beginPath();
  ctx.arc(probeX, probeY, 7, 0, Math.PI * 2);
  ctx.fill();
  text(
    ctx,
    `k=${state.slope.toFixed(2)} V/m`,
    probeX + 16,
    probeY - 18,
    p.teal,
    12,
    'left',
    700
  );
}
function potentialAtForView(state: PotentialGraphState, x: number): number {
  const s = state.params.scenario;
  if (s === 'point') return 10 - 1.4 * x;
  if (s === 'dipole') return 8 / (x + 1) - 8 / (11 - x);
  if (x < 3) return 10 - 3 * x;
  if (x < 7) return 1 + 2 * (x - 3);
  return 9 - 1.5 * (x - 7);
}
function drawEGraph(
  ctx: CanvasRenderingContext2D,
  state: PotentialGraphState,
  p: Palette
): void {
  rounded(ctx, E_X, E_Y, E_W, E_H, 12);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  drawGrid(ctx, E_TOP, E_BOTTOM, p);
  drawAxes(ctx, E_TOP, E_BOTTOM, p, 'E / (V·m⁻¹)');
  const zeroY = eToPx(0);
  if (state.params.showArea) {
    ctx.fillStyle = `${p.blue}33`;
    ctx.beginPath();
    ctx.moveTo(xToPx(X_MIN), zeroY);
    for (let i = 0; i <= 50; i += 1) {
      const x = X_MIN + ((state.probePosition - X_MIN) * i) / 50;
      ctx.lineTo(xToPx(x), eToPx(fieldForView(state, x)));
    }
    ctx.lineTo(xToPx(state.probePosition), zeroY);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = p.blue;
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let i = 0; i <= 100; i += 1) {
    const x = X_MIN + ((X_MAX - X_MIN) * i) / 100;
    const y = eToPx(fieldForView(state, x));
    if (i === 0) ctx.moveTo(xToPx(x), y);
    else ctx.lineTo(xToPx(x), y);
  }
  ctx.stroke();
  const probeX = xToPx(state.probePosition);
  ctx.fillStyle = p.blue;
  ctx.beginPath();
  ctx.arc(probeX, eToPx(state.field), 7, 0, Math.PI * 2);
  ctx.fill();
  text(
    ctx,
    `∫E dx = φ₁−φ₂`,
    FIELD_LEFT + 16,
    E_TOP + 18,
    p.blue,
    12,
    'left',
    700
  );
}
function fieldForView(state: PotentialGraphState, x: number): number {
  const s = state.params.scenario;
  if (s === 'point') return 1.4;
  if (s === 'dipole') return 8 / (x + 1) ** 2 + 8 / (11 - x) ** 2;
  if (x < 3) return 3;
  if (x < 7) return -2;
  return 1.5;
}
function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: PotentialGraphState,
  p: Palette
): void {
  ctx.fillStyle = p.panel;
  ctx.fillRect(FIELD_W, 0, BASE_W - FIELD_W, BASE_H);
  text(ctx, '电势图象', PANEL_X + 18, 38, p.ink, 20, 'left', 700);
  ctx.strokeStyle = p.teal;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PANEL_X + 18, HEADER_RULE_Y);
  ctx.lineTo(PANEL_X + PANEL_W - 22, HEADER_RULE_Y);
  ctx.stroke();
  rounded(ctx, CARD_X, READOUT_Y, CARD_W, READOUT_H, 12);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(ctx, '探针物理量', CARD_X + 16, READOUT_Y + 22, p.teal, 15, 'left', 700);
  const rows = [
    ['位置 x', `${state.probePosition.toFixed(2)} m`, p.ink],
    ['电势 φ', `${state.potential.toFixed(2)} V`, p.red],
    [
      '场强 E',
      `${state.field >= 0 ? '+' : ''}${state.field.toFixed(2)} V/m`,
      p.blue
    ],
    ['电势能 Ep', `${state.potentialEnergy.toFixed(2)} μJ`, p.purple],
    [
      '静电力 F',
      `${state.force >= 0 ? '+' : ''}${state.force.toFixed(2)} μN`,
      p.red
    ]
  ];
  rows.forEach(([label, value, color], index) => {
    const y = READOUT_Y + 50 + index * 24;
    text(ctx, label, CARD_X + 16, y, p.muted, 12, 'left', 600);
    text(ctx, value, CARD_X + CARD_W - 16, y, color, 13, 'right', 700);
  });
  rounded(ctx, CARD_X, SUMMARY_Y, CARD_W, SUMMARY_H, 12);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(ctx, '读图结论', CARD_X + 16, SUMMARY_Y + 22, p.blue, 15, 'left', 700);
  text(ctx, 'E = −dφ/dx', CARD_X + 16, SUMMARY_Y + 60, p.ink, 18, 'left', 700);
  text(
    ctx,
    '斜率越负，+x 方向场强越大',
    CARD_X + 16,
    SUMMARY_Y + 88,
    p.muted,
    12,
    'left',
    600
  );
  text(
    ctx,
    'Ep = qφ，F = qE',
    CARD_X + 16,
    SUMMARY_Y + 122,
    p.purple,
    16,
    'left',
    700
  );
  text(
    ctx,
    state.status,
    CARD_X + 16,
    SUMMARY_Y + 150,
    state.params.probeCharge > 0 ? p.red : p.blue,
    12,
    'left',
    600
  );
  rounded(ctx, CARD_X, NOTES_Y, CARD_W, NOTES_H, 12);
  ctx.fillStyle = p.soft;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(ctx, '面积与能量', CARD_X + 16, NOTES_Y + 24, p.gold, 15, 'left', 700);
  text(
    ctx,
    'E-x 有向面积 = 电势差',
    CARD_X + 16,
    NOTES_Y + 62,
    p.ink,
    14,
    'left',
    600
  );
  text(
    ctx,
    '正电荷到高电势处 Ep 增大',
    CARD_X + 16,
    NOTES_Y + 94,
    p.muted,
    12,
    'left',
    600
  );
  text(
    ctx,
    '负电荷的能量变化相反',
    CARD_X + 16,
    NOTES_Y + 122,
    p.muted,
    12,
    'left',
    600
  );
  text(
    ctx,
    state.params.autoRun ? '探针自动扫描中' : '拖动位置滑块观察',
    CARD_X + 16,
    NOTES_Y + 172,
    p.teal,
    12,
    'left',
    600
  );
}
export function createPotentialGraphView(
  options: CreatePotentialGraphViewOptions = {}
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
  function draw(state: PotentialGraphState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(width / BASE_W, height / BASE_H);
    const offsetY = (height - BASE_H * fit) / 2;
    const responsiveScale = stage.responsiveScale;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(0, offsetY);
    ctx.scale(fit, fit);
    const p = PALETTE[env.theme];
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, BASE_W, BASE_H);
    ctx.strokeStyle = p.grid;
    ctx.lineWidth = responsiveScale;
    for (let x = FIELD_LEFT; x <= FIELD_RIGHT; x += 42) {
      ctx.beginPath();
      ctx.moveTo(x, FIELD_TOP);
      ctx.lineTo(x, FIELD_BOTTOM);
      ctx.stroke();
    }
    for (let y = FIELD_TOP; y <= FIELD_BOTTOM; y += 42) {
      ctx.beginPath();
      ctx.moveTo(FIELD_LEFT, y);
      ctx.lineTo(FIELD_RIGHT, y);
      ctx.stroke();
    }
    drawFieldLine(ctx, state, p);
    drawPhiGraph(ctx, state, p);
    drawEGraph(ctx, state, p);
    drawPanel(ctx, state, p);
    ctx.restore();
  }
  let snapshot: PotentialGraphState | null = null;
  return {
    render(state: PotentialGraphState): void {
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
