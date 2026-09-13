import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { precisionToolConstants, type PrecisionToolState } from './scene.sim';

export type CreatePrecisionToolViewOptions = {
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
  scaleY: SCALE_Y,
  scaleHeight: SCALE_H,
  scaleSpanMm: SCALE_SPAN,
  zoomY: ZOOM_Y,
  zoomHeight: ZOOM_H,
  zoomX: ZOOM_X,
  zoomWidth: ZOOM_W,
  cardX: CARD_X,
  cardWidth: CARD_W,
  headerRuleY: HEADER_RULE_Y,
  readoutY: READOUT_Y,
  readoutHeight: READOUT_H,
  formulaY: FORMULA_Y,
  formulaHeight: FORMULA_H,
  detailY: DETAIL_Y,
  detailHeight: DETAIL_H,
  micrometerDivisions: MICROMETER_DIVISIONS,
  caliperBodyInset: CALIPER_BODY_INSET,
  caliperBodyTopOffset: CALIPER_BODY_TOP_OFFSET,
  caliperBodyHeight: CALIPER_BODY_HEIGHT,
  caliperJawInset: CALIPER_JAW_INSET,
  caliperJawTopOffset: CALIPER_JAW_TOP_OFFSET,
  caliperJawHeight: CALIPER_JAW_HEIGHT,
  caliperTipTopOffset: CALIPER_TIP_TOP_OFFSET,
  caliperTipReach: CALIPER_TIP_REACH,
  caliperUpperTipInset: CALIPER_UPPER_TIP_INSET,
  caliperCursorLineTopOffset: CALIPER_CURSOR_LINE_TOP_OFFSET,
  zoomCenterLineOffset: ZOOM_CENTER_LINE_OFFSET,
  zoomPrimaryTickHeight: ZOOM_PRIMARY_TICK_HEIGHT,
  micrometerZoomMajorHeight: MICROMETER_ZOOM_MAJOR_HEIGHT
} = precisionToolConstants;

type Palette = {
  bg: string;
  panel: string;
  soft: string;
  ink: string;
  muted: string;
  border: string;
  metal: string;
  metalEdge: string;
  tick: string;
  accent: string;
  blue: string;
  red: string;
  grid: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    panel: '#ffffff',
    soft: '#edf1f3',
    ink: '#303744',
    muted: '#7d8997',
    border: '#d8dfe5',
    metal: '#d9e0e5',
    metalEdge: '#7c8996',
    tick: '#3f4a56',
    accent: '#ef4050',
    blue: '#2d9ed0',
    red: '#ef4050',
    grid: '#e6e9e7'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    soft: '#26364b',
    ink: '#eef2f7',
    muted: '#a8b4c5',
    border: '#3d4d63',
    metal: '#94a3b8',
    metalEdge: '#d4dce5',
    tick: '#eef2f7',
    accent: '#ffb84d',
    blue: '#5ed0f5',
    red: '#ff6971',
    grid: '#2b3b52'
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

function modeLabel(state: PrecisionToolState): string {
  if (state.params.mode === 'caliper10') return '游标卡尺 · 10 分度';
  if (state.params.mode === 'caliper20') return '游标卡尺 · 20 分度';
  if (state.params.mode === 'caliper50') return '游标卡尺 · 50 分度';
  return '螺旋测微器';
}

function drawScale(
  ctx: CanvasRenderingContext2D,
  state: PrecisionToolState,
  p: Palette
): void {
  const pxPerMm = (FIELD_RIGHT - FIELD_LEFT) / SCALE_SPAN;
  const jawX = FIELD_LEFT + state.actualSize * pxPerMm;
  ctx.fillStyle = p.metal;
  ctx.strokeStyle = p.metalEdge;
  ctx.lineWidth = 2;
  ctx.fillRect(FIELD_LEFT, SCALE_Y, FIELD_RIGHT - FIELD_LEFT, SCALE_H);
  ctx.strokeRect(FIELD_LEFT, SCALE_Y, FIELD_RIGHT - FIELD_LEFT, SCALE_H);
  ctx.strokeStyle = p.tick;
  for (let mm = 0; mm <= SCALE_SPAN; mm += 1) {
    const x = FIELD_LEFT + mm * pxPerMm;
    const tickHeight = mm % 5 === 0 ? 19 : 11;
    ctx.lineWidth = mm % 5 === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x, SCALE_Y + SCALE_H);
    ctx.lineTo(x, SCALE_Y + SCALE_H - tickHeight);
    ctx.stroke();
    text(ctx, String(mm), x, SCALE_Y - 14, p.ink, 14, 'center', 700);
  }
  ctx.fillStyle = p.soft;
  ctx.strokeStyle = p.metalEdge;
  ctx.lineWidth = 2;
  ctx.fillRect(
    FIELD_LEFT + CALIPER_BODY_INSET,
    SCALE_Y - CALIPER_BODY_TOP_OFFSET,
    Math.max(70, jawX - FIELD_LEFT - CALIPER_BODY_INSET),
    CALIPER_BODY_HEIGHT
  );
  ctx.strokeRect(
    FIELD_LEFT + CALIPER_BODY_INSET,
    SCALE_Y - CALIPER_BODY_TOP_OFFSET,
    Math.max(70, jawX - FIELD_LEFT - CALIPER_BODY_INSET),
    CALIPER_BODY_HEIGHT
  );
  ctx.fillStyle = p.metalEdge;
  ctx.fillRect(
    FIELD_LEFT + CALIPER_JAW_INSET,
    SCALE_Y - CALIPER_JAW_TOP_OFFSET,
    16,
    CALIPER_JAW_HEIGHT
  );
  ctx.fillRect(
    jawX - 8,
    SCALE_Y - CALIPER_JAW_TOP_OFFSET,
    16,
    CALIPER_JAW_HEIGHT
  );
  ctx.strokeStyle = p.metalEdge;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(FIELD_LEFT + 36, SCALE_Y - CALIPER_JAW_TOP_OFFSET);
  ctx.lineTo(FIELD_LEFT + 36, SCALE_Y - CALIPER_TIP_TOP_OFFSET);
  ctx.lineTo(FIELD_LEFT + CALIPER_UPPER_TIP_INSET, SCALE_Y - CALIPER_TIP_REACH);
  ctx.moveTo(jawX, SCALE_Y - CALIPER_JAW_TOP_OFFSET);
  ctx.lineTo(jawX, SCALE_Y - CALIPER_TIP_TOP_OFFSET);
  ctx.lineTo(jawX - 24, SCALE_Y - CALIPER_TIP_REACH);
  ctx.stroke();
  ctx.fillStyle = p.red;
  ctx.beginPath();
  ctx.arc((FIELD_LEFT + jawX) / 2, SCALE_Y - 36, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(jawX, SCALE_Y - CALIPER_CURSOR_LINE_TOP_OFFSET);
  ctx.lineTo(jawX, SCALE_Y + SCALE_H + 22);
  ctx.stroke();
  text(ctx, '主尺', FIELD_LEFT + 20, SCALE_Y + 54, p.muted, 13, 'left', 600);
  text(ctx, '游标', jawX, SCALE_Y + 54, p.accent, 13, 'center', 700);
}

function drawZoom(
  ctx: CanvasRenderingContext2D,
  state: PrecisionToolState,
  p: Palette
): void {
  rounded(ctx, ZOOM_X, ZOOM_Y, ZOOM_W, ZOOM_H, 12);
  ctx.fillStyle = p.soft;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text(
    ctx,
    '放大观察区 · 精准对齐',
    ZOOM_X + 20,
    ZOOM_Y + 24,
    p.red,
    16,
    'left',
    700
  );
  const center = ZOOM_X + ZOOM_W * 0.52;
  const spacing = ZOOM_W / Math.max(10, state.divisions * 0.42);
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ZOOM_X + 18, ZOOM_Y + ZOOM_CENTER_LINE_OFFSET);
  ctx.lineTo(ZOOM_X + ZOOM_W - 18, ZOOM_Y + ZOOM_CENTER_LINE_OFFSET);
  ctx.stroke();
  for (let k = -6; k <= 6; k += 1) {
    const x = center + k * spacing;
    const height = k === 0 ? ZOOM_PRIMARY_TICK_HEIGHT : 48;
    ctx.strokeStyle = k === 0 && state.params.showGuides ? p.accent : p.ink;
    ctx.lineWidth = k === 0 ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(x, ZOOM_Y + ZOOM_CENTER_LINE_OFFSET - height / 2);
    ctx.lineTo(x, ZOOM_Y + ZOOM_CENTER_LINE_OFFSET + height / 2);
    ctx.stroke();
  }
  if (state.params.showGuides) {
    ctx.strokeStyle = p.red;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(center, ZOOM_Y + 42);
    ctx.lineTo(center, ZOOM_Y + ZOOM_H - 16);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  text(
    ctx,
    `第 ${state.alignmentIndex} 格对齐`,
    center,
    ZOOM_Y + 148,
    p.accent,
    14,
    'center',
    700
  );
}

function drawMicrometer(
  ctx: CanvasRenderingContext2D,
  state: PrecisionToolState,
  p: Palette
): void {
  const sleeveX = FIELD_LEFT + 54;
  const sleeveY = 274;
  const sleeveW = 430;
  const sleeveH = 64;
  const thimbleX = sleeveX + sleeveW - 18;
  const thimbleW = 160;
  ctx.fillStyle = p.metal;
  ctx.strokeStyle = p.metalEdge;
  ctx.lineWidth = 3;
  rounded(ctx, sleeveX, sleeveY, sleeveW, sleeveH, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = p.metalEdge;
  ctx.beginPath();
  ctx.moveTo(thimbleX, sleeveY - 26);
  ctx.lineTo(thimbleX + thimbleW, sleeveY - 26);
  ctx.lineTo(thimbleX + thimbleW, sleeveY + sleeveH + 26);
  ctx.lineTo(thimbleX, sleeveY + sleeveH + 26);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  const pxPerMm = 42;
  const windowStart = Math.max(0, Math.floor(state.actualSize) - 2);
  for (let mm = windowStart; mm <= windowStart + 8; mm += 1) {
    const x = sleeveX + (mm - windowStart) * pxPerMm;
    ctx.strokeStyle = p.tick;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, sleeveY + 4);
    ctx.lineTo(x, sleeveY + 28);
    ctx.stroke();
    text(ctx, String(mm), x, sleeveY - 15, p.ink, 13, 'center', 700);
    const half = x + pxPerMm / 2;
    ctx.beginPath();
    ctx.moveTo(half, sleeveY + sleeveH - 4);
    ctx.lineTo(half, sleeveY + sleeveH - 26);
    ctx.stroke();
  }
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(sleeveX, sleeveY + sleeveH / 2);
  ctx.lineTo(thimbleX + 22, sleeveY + sleeveH / 2);
  ctx.stroke();
  const tickSpacing = (thimbleW - 36) / 10;
  for (let k = 0; k <= 10; k += 1) {
    const x = thimbleX + 18 + k * tickSpacing;
    ctx.strokeStyle =
      k === Math.round(state.fineReading / 5) ? p.accent : p.tick;
    ctx.lineWidth = k === Math.round(state.fineReading / 5) ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(x, sleeveY + sleeveH / 2 - 24);
    ctx.lineTo(x, sleeveY + sleeveH / 2 + 24);
    ctx.stroke();
  }
  text(
    ctx,
    '固定刻度',
    sleeveX + 12,
    sleeveY + sleeveH + 48,
    p.muted,
    14,
    'left',
    600
  );
  text(
    ctx,
    '微分筒',
    thimbleX + thimbleW / 2,
    sleeveY + sleeveH + 48,
    p.accent,
    14,
    'center',
    700
  );
  rounded(ctx, ZOOM_X, ZOOM_Y, ZOOM_W, ZOOM_H, 12);
  ctx.fillStyle = p.soft;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(
    ctx,
    '螺纹传动：转一圈，螺杆前进 0.5 mm',
    ZOOM_X + 20,
    ZOOM_Y + 28,
    p.blue,
    16,
    'left',
    700
  );
  const startX = ZOOM_X + 42;
  const endX = ZOOM_X + ZOOM_W - 42;
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(startX, ZOOM_Y + ZOOM_CENTER_LINE_OFFSET);
  ctx.lineTo(endX, ZOOM_Y + ZOOM_CENTER_LINE_OFFSET);
  ctx.stroke();
  for (let i = 0; i <= MICROMETER_DIVISIONS; i += 1) {
    const x = startX + ((endX - startX) * i) / MICROMETER_DIVISIONS;
    const h = i % 5 === 0 ? MICROMETER_ZOOM_MAJOR_HEIGHT : 30;
    ctx.strokeStyle = i === state.fineReading ? p.accent : p.ink;
    ctx.lineWidth = i === state.fineReading ? 4 : 1.5;
    ctx.beginPath();
    ctx.moveTo(x, ZOOM_Y + ZOOM_CENTER_LINE_OFFSET - h / 2);
    ctx.lineTo(x, ZOOM_Y + ZOOM_CENTER_LINE_OFFSET + h / 2);
    ctx.stroke();
  }
  text(
    ctx,
    `微分筒 ${state.fineReading} 格`,
    endX,
    ZOOM_Y + 148,
    p.accent,
    14,
    'right',
    700
  );
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: PrecisionToolState,
  p: Palette,
  scale: number
): void {
  ctx.fillStyle = p.panel;
  ctx.fillRect(FIELD_W, 0, BASE_W - FIELD_W, BASE_H);
  text(ctx, '测量工具', PANEL_X + 18, 38, p.ink, 21 * scale, 'left', 700);
  ctx.strokeStyle = p.blue;
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
  text(
    ctx,
    modeLabel(state),
    CARD_X + 16,
    READOUT_Y + 22,
    p.blue,
    15 * scale,
    'left',
    700
  );
  const rows = [
    ['真实尺寸', `${state.actualSize.toFixed(2)} mm`, p.ink],
    ['主尺读数', `${state.mainScaleReading.toFixed(2)} mm`, p.ink],
    [
      state.params.mode === 'micrometer' ? '微分筒读数' : '对齐格数',
      state.params.mode === 'micrometer'
        ? `${state.fineReading} 格`
        : `${state.alignmentIndex} 格`,
      p.accent
    ],
    ['最终读数', `${state.totalReading.toFixed(2)} mm`, p.red]
  ];
  rows.forEach(([label, value, color], index) => {
    const y = READOUT_Y + 50 + index * 24;
    text(ctx, label, CARD_X + 16, y, p.muted, 13 * scale, 'left', 600);
    text(ctx, value, CARD_X + CARD_W - 16, y, color, 15 * scale, 'right', 700);
  });
  rounded(ctx, CARD_X, FORMULA_Y, CARD_W, FORMULA_H, 12);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(
    ctx,
    '读数关系',
    CARD_X + 16,
    FORMULA_Y + 22,
    p.muted,
    14 * scale,
    'left',
    700
  );
  if (state.params.mode === 'micrometer') {
    text(
      ctx,
      '主尺 + 微分筒 × 0.01 mm',
      CARD_X + 16,
      FORMULA_Y + 54,
      p.ink,
      15 * scale,
      'left',
      700
    );
    text(
      ctx,
      '0.5 mm ÷ 50 格 = 0.01 mm',
      CARD_X + 16,
      FORMULA_Y + 84,
      p.blue,
      14 * scale,
      'left',
      600
    );
    text(
      ctx,
      `转动约 ${state.drumRotation.toFixed(2)} 圈`,
      CARD_X + 16,
      FORMULA_Y + 110,
      p.accent,
      13 * scale,
      'left',
      600
    );
  } else {
    text(
      ctx,
      '主尺 + 对齐格 × 分度值',
      CARD_X + 16,
      FORMULA_Y + 54,
      p.ink,
      15 * scale,
      'left',
      700
    );
    text(
      ctx,
      `1 mm − 1 格 = ${state.precision.toFixed(2)} mm`,
      CARD_X + 16,
      FORMULA_Y + 84,
      p.blue,
      14 * scale,
      'left',
      600
    );
    text(
      ctx,
      state.status,
      CARD_X + 16,
      FORMULA_Y + 110,
      p.accent,
      13 * scale,
      'left',
      600
    );
  }
  rounded(ctx, CARD_X, DETAIL_Y, CARD_W, DETAIL_H, 12);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(
    ctx,
    state.params.showReading ? '读数解析已显示' : '读数解析已隐藏',
    CARD_X + 16,
    DETAIL_Y + 24,
    state.params.showReading ? p.blue : p.muted,
    15 * scale,
    'left',
    700
  );
  text(
    ctx,
    state.params.showGuides ? '红线：基准 / 对齐提示' : '提示线已隐藏',
    CARD_X + 16,
    DETAIL_Y + 54,
    state.params.showGuides ? p.red : p.muted,
    13 * scale,
    'left',
    600
  );
  text(
    ctx,
    '拖动滑片或旋钮改变读数',
    CARD_X + 16,
    DETAIL_Y + 86,
    p.muted,
    13 * scale,
    'left',
    600
  );
}

export function createPrecisionToolView(
  options: CreatePrecisionToolViewOptions = {}
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
  let snapshot: PrecisionToolState | null = null;
  function draw(state: PrecisionToolState): void {
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
    ctx.strokeStyle = p.grid;
    ctx.lineWidth = 1;
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
    if (state.params.mode === 'micrometer') drawMicrometer(ctx, state, p);
    else {
      drawScale(ctx, state, p);
      drawZoom(ctx, state, p);
    }
    drawPanel(ctx, state, p, scale);
    ctx.restore();
  }
  return {
    render(state: PrecisionToolState): void {
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
