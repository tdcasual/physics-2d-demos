import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  mechanicalEnergyConstants,
  type MechanicalEnergyState
} from './scene.sim';

export type CreateMechanicalEnergyViewOptions = {
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
  panelInset: INSET,
  apparatusTitleY: TITLE_Y,
  tapeTopY: TAPE_TOP,
  tapeBottomY: TAPE_BOTTOM,
  tapeX: TAPE_X,
  rulerY: RULER_Y,
  rulerWidth: RULER_W,
  rulerHeight: RULER_H,
  graphX: GRAPH_X,
  graphWidth: GRAPH_W,
  graphHeight: GRAPH_H,
  graphTop: GRAPH_TOP,
  panelRuleY: PANEL_RULE_Y,
  coreCardY: CORE_Y,
  coreCardHeight: CORE_H,
  parameterCardY: PARAM_Y,
  parameterCardHeight: PARAM_H,
  actionCardY: ACTION_Y,
  actionCardHeight: ACTION_H,
  tableCardY: TABLE_Y,
  tableCardHeight: TABLE_H,
  rowGap: ROW_GAP,
  tapeSpacing: TAPE_SPACING,
  tapeDotRadius: TAPE_DOT_RADIUS,
  gridStep: GRID_STEP,
  standX: STAND_X,
  standTop: STAND_TOP,
  standHeight: STAND_HEIGHT,
  deviceX: DEVICE_X,
  deviceY: DEVICE_Y,
  deviceWidth: DEVICE_W,
  deviceHeight: DEVICE_H,
  deviceTopX: DEVICE_TOP_X,
  deviceTopY: DEVICE_TOP_Y,
  deviceTopWidth: DEVICE_TOP_W,
  wheelX: WHEEL_X,
  wheelY: WHEEL_Y,
  ropeRedStartX: ROPE_RED_START_X,
  ropeRedStartY: ROPE_RED_START_Y,
  ropeRedEndX: ROPE_RED_END_X,
  ropeRedEndY: ROPE_RED_END_Y,
  ropeBlackStartX: ROPE_BLACK_START_X,
  ropeBlackStartY: ROPE_BLACK_START_Y,
  ropeBlackEndX: ROPE_BLACK_END_X,
  ropeBlackEndY: ROPE_BLACK_END_Y,
  weightBlockWidth: WEIGHT_BLOCK_W,
  weightBlockHeight: WEIGHT_BLOCK_H,
  baseX: BASE_X,
  baseY: BASE_Y,
  apparatusBaseWidth: APPARATUS_BASE_W,
  footX: FOOT_X,
  footY: FOOT_Y,
  footWidth: FOOT_W,
  rulerX: RULER_X,
  rulerLabelX: RULER_LABEL_X,
  tableColumnOffsets: TABLE_COLUMN_OFFSETS
} = mechanicalEnergyConstants;

const CARD_RADIUS = 12;

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
  gold: string;
  teal: string;
  dark: string;
};
const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    panel: '#fff',
    ink: '#303744',
    muted: '#8b97a5',
    border: '#d3dbe4',
    grid: '#e5e9ee',
    soft: '#f1f4f7',
    blue: '#3977a8',
    red: '#ef4050',
    gold: '#ef9b1a',
    teal: '#2a7c91',
    dark: '#253249'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    ink: '#eef2f7',
    muted: '#aab6c8',
    border: '#3c4b61',
    grid: '#2d3e57',
    soft: '#253249',
    blue: '#60a5fa',
    red: '#fb7185',
    gold: '#fbbf24',
    teal: '#34d399',
    dark: '#e6edf5'
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
  height: number
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, CARD_RADIUS);
}
function drawGrid(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, FIELD_W, BASE_H);
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let x = 0; x <= FIELD_W; x += GRID_STEP) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, BASE_H);
    ctx.stroke();
  }
  for (let y = 0; y <= BASE_H; y += GRID_STEP) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(FIELD_W, y);
    ctx.stroke();
  }
}

function drawApparatus(
  ctx: CanvasRenderingContext2D,
  state: MechanicalEnergyState,
  p: Palette,
  scale: number
): void {
  text(
    ctx,
    '实验装置区（机械能守恒模型）',
    30,
    TITLE_Y,
    p.ink,
    22 * scale,
    'left',
    700
  );
  ctx.fillStyle = p.dark;
  ctx.fillRect(STAND_X, STAND_TOP, 20, STAND_HEIGHT);
  ctx.fillStyle = p.blue;
  ctx.fillRect(DEVICE_X, DEVICE_Y, DEVICE_W, DEVICE_H);
  ctx.fillStyle = p.ink;
  ctx.fillRect(DEVICE_TOP_X, DEVICE_TOP_Y, DEVICE_TOP_W, 18);
  ctx.fillStyle = p.soft;
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(WHEEL_X, WHEEL_Y, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = p.red;
  ctx.beginPath();
  ctx.arc(WHEEL_X, WHEEL_Y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(ROPE_RED_START_X, ROPE_RED_START_Y);
  ctx.lineTo(ROPE_RED_END_X, ROPE_RED_END_Y);
  ctx.stroke();
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(ROPE_BLACK_START_X, ROPE_BLACK_START_Y);
  ctx.lineTo(ROPE_BLACK_END_X, ROPE_BLACK_END_Y);
  ctx.stroke();
  for (let index = 0; index < state.tapeDots.length; index += 1) {
    const y = TAPE_TOP + index * TAPE_SPACING;
    ctx.fillStyle = index % 2 === 0 ? p.ink : p.red;
    ctx.beginPath();
    ctx.arc(TAPE_X, y, TAPE_DOT_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = p.gold;
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2;
  ctx.fillRect(TAPE_X - 22, TAPE_BOTTOM, WEIGHT_BLOCK_W, WEIGHT_BLOCK_H);
  ctx.strokeRect(TAPE_X - 22, TAPE_BOTTOM, WEIGHT_BLOCK_W, WEIGHT_BLOCK_H);
  text(ctx, 'm', TAPE_X, TAPE_BOTTOM + 30, p.ink, 18 * scale, 'center', 700);
  ctx.fillStyle = p.dark;
  ctx.fillRect(BASE_X, BASE_Y, APPARATUS_BASE_W, 20);
  ctx.fillRect(FOOT_X, FOOT_Y, FOOT_W, 18);
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  ctx.fillStyle = p.soft;
  ctx.fillRect(RULER_X, RULER_Y, RULER_W, RULER_H);
  ctx.strokeRect(RULER_X, RULER_Y, RULER_W, RULER_H);
  for (let centimeter = 0; centimeter <= 20; centimeter += 1) {
    const x = RULER_X + 2 + centimeter * 30;
    ctx.strokeStyle = p.ink;
    ctx.beginPath();
    ctx.moveTo(x, RULER_Y);
    ctx.lineTo(x, RULER_Y + (centimeter % 5 === 0 ? 26 : 16));
    ctx.stroke();
    if (centimeter % 5 === 0)
      text(ctx, `${centimeter}`, x, RULER_Y + 38, p.ink, 12 * scale, 'center');
  }
  text(
    ctx,
    '左右拖拽下方刻度尺读取 h',
    RULER_LABEL_X,
    RULER_Y - 12,
    p.muted,
    13 * scale,
    'center'
  );
  drawEnergyGraph(ctx, state, p, scale);
}

function drawEnergyGraph(
  ctx: CanvasRenderingContext2D,
  state: MechanicalEnergyState,
  p: Palette,
  scale: number
): void {
  text(
    ctx,
    '图像分析：v²/2 - h 关系图',
    GRAPH_X,
    GRAPH_TOP - 12,
    p.ink,
    16 * scale,
    'left',
    700
  );
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(GRAPH_X, GRAPH_TOP);
  ctx.lineTo(GRAPH_X, GRAPH_TOP + GRAPH_H);
  ctx.lineTo(GRAPH_X + GRAPH_W, GRAPH_TOP + GRAPH_H);
  ctx.stroke();
  const maxH = Math.max(0.2, state.graphPoints.at(-1)?.height ?? 0.2);
  const maxV = Math.max(0.2, state.graphPoints.at(-1)?.halfV2 ?? 0.2);
  ctx.strokeStyle = p.blue;
  ctx.lineWidth = 3;
  ctx.beginPath();
  state.graphPoints.forEach((point, index) => {
    const x = GRAPH_X + (point.height / maxH) * (GRAPH_W - 34);
    const y = GRAPH_TOP + GRAPH_H - (point.halfV2 / maxV) * (GRAPH_H - 18);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  state.graphPoints.forEach((point) => {
    const x = GRAPH_X + (point.height / maxH) * (GRAPH_W - 34);
    const y = GRAPH_TOP + GRAPH_H - (point.halfV2 / maxV) * (GRAPH_H - 18);
    ctx.fillStyle = p.red;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
  text(
    ctx,
    'h',
    GRAPH_X + GRAPH_W - 16,
    GRAPH_TOP + GRAPH_H + 6,
    p.muted,
    12 * scale,
    'center'
  );
  text(ctx, 'v²/2', GRAPH_X - 18, GRAPH_TOP + 4, p.muted, 12 * scale, 'center');
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: MechanicalEnergyState,
  p: Palette,
  scale: number
): void {
  ctx.fillStyle = p.panel;
  ctx.fillRect(PANEL_X, 0, BASE_W - PANEL_X, BASE_H);
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PANEL_X, 0);
  ctx.lineTo(PANEL_X, BASE_H);
  ctx.stroke();
  text(
    ctx,
    '验证机械能守恒定律',
    PANEL_X + INSET,
    TITLE_Y,
    p.ink,
    20 * scale,
    'left',
    700
  );
  ctx.strokeStyle = p.border;
  ctx.beginPath();
  ctx.moveTo(PANEL_X + INSET, PANEL_RULE_Y);
  ctx.lineTo(PANEL_X + PANEL_W - INSET, PANEL_RULE_Y);
  ctx.stroke();
  rounded(ctx, PANEL_X + INSET, CORE_Y, PANEL_W - INSET * 2, CORE_H);
  ctx.fillStyle = p.soft;
  ctx.fill();
  text(
    ctx,
    '核心原理与参数',
    PANEL_X + INSET + 16,
    CORE_Y + 22,
    p.ink,
    17 * scale,
    'left',
    700
  );
  text(
    ctx,
    'ΔEₚ = mgh    ΔEₖ = ½mv²',
    PANEL_X + INSET + 16,
    CORE_Y + 52,
    p.blue,
    15 * scale,
    'left',
    700
  );
  text(
    ctx,
    '阻力使 a < g，机械能产生耗散',
    PANEL_X + INSET + 16,
    CORE_Y + 82,
    p.muted,
    13 * scale,
    'left'
  );
  rounded(ctx, PANEL_X + INSET, PARAM_Y, PANEL_W - INSET * 2, PARAM_H);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(
    ctx,
    `实验环境：${state.params.environment === 'ideal' ? '只有重力' : '包含摩擦阻力'}`,
    PANEL_X + INSET + 16,
    PARAM_Y + 24,
    p.ink,
    16 * scale,
    'left',
    700
  );
  text(
    ctx,
    `阻力 ${state.params.resistance.toFixed(2)}    a = ${state.acceleration.toFixed(2)} m/s²`,
    PANEL_X + INSET + 16,
    PARAM_Y + 54,
    p.gold,
    14 * scale,
    'left',
    700
  );
  text(
    ctx,
    `m = ${state.params.mass.toFixed(1)} kg    g = ${state.params.gravity.toFixed(2)} m/s²`,
    PANEL_X + INSET + 16,
    PARAM_Y + 84,
    p.ink,
    13 * scale,
    'left'
  );
  text(
    ctx,
    `T₀ = ${state.params.pointPeriod.toFixed(2)} s（每隔一个点取样）`,
    PANEL_X + INSET + 16,
    PARAM_Y + 114,
    p.blue,
    13 * scale,
    'left',
    700
  );
  text(
    ctx,
    '释放重锤后记录 A–E 计数点',
    PANEL_X + INSET + 16,
    PARAM_Y + 144,
    p.muted,
    12 * scale,
    'left'
  );
  rounded(ctx, PANEL_X + INSET, ACTION_Y, PANEL_W - INSET * 2, ACTION_H);
  ctx.fillStyle = p.soft;
  ctx.fill();
  text(
    ctx,
    state.params.autoRun ? '自动演示中' : '点击“释放重锤”开始',
    PANEL_X + INSET + 16,
    ACTION_Y + 28,
    p.red,
    15 * scale,
    'left',
    700
  );
  text(
    ctx,
    '纸带数据与能量表同步更新',
    PANEL_X + INSET + 16,
    ACTION_Y + 56,
    p.muted,
    12 * scale,
    'left'
  );
  rounded(ctx, PANEL_X + INSET, TABLE_Y, PANEL_W - INSET * 2, TABLE_H);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(
    ctx,
    '分析数据表',
    PANEL_X + INSET + 16,
    TABLE_Y + 22,
    p.ink,
    17 * scale,
    'left',
    700
  );
  const headers = ['点', 'h (cm)', 'v (m/s)', 'ΔEₚ (J)', 'ΔEₖ (J)'];
  headers.forEach((header, index) =>
    text(
      ctx,
      header,
      PANEL_X + INSET + TABLE_COLUMN_OFFSETS[index],
      TABLE_Y + 54,
      p.muted,
      11 * scale,
      'center',
      700
    )
  );
  state.points.forEach((point, index) => {
    const y = TABLE_Y + 84 + index * ROW_GAP;
    const values = [
      point.label,
      (point.height * 100).toFixed(2),
      point.speed.toFixed(3),
      point.potentialLoss.toFixed(3),
      point.kineticGain.toFixed(3)
    ];
    values.forEach((value, valueIndex) =>
      text(
        ctx,
        value,
        PANEL_X + INSET + TABLE_COLUMN_OFFSETS[valueIndex],
        y,
        valueIndex === 3 ? p.blue : valueIndex === 4 ? p.red : p.ink,
        12 * scale,
        'center',
        700
      )
    );
  });
  text(
    ctx,
    state.params.environment === 'ideal'
      ? '实验结论：ΔEₚ ≈ ΔEₖ，机械能守恒'
      : '实验结论：ΔEₚ > ΔEₖ，存在能量耗散',
    PANEL_X + INSET + 16,
    TABLE_Y + TABLE_H - 18,
    state.params.environment === 'ideal' ? p.teal : p.red,
    13 * scale,
    'left',
    700
  );
}

export function createMechanicalEnergyView(
  options: CreateMechanicalEnergyViewOptions = {}
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
  let snapshot: MechanicalEnergyState | null = null;
  function draw(state: MechanicalEnergyState): void {
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
    drawGrid(ctx, p);
    drawApparatus(ctx, state, p, scale);
    drawPanel(ctx, state, p, scale);
    ctx.restore();
  }
  return {
    render(state: MechanicalEnergyState) {
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
