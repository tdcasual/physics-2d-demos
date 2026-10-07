import type { TeachingTheme } from '../../../platform/standards';
import {
  PAPER_HEIGHT_CM,
  PAPER_WIDTH_CM,
  curveY,
  type ProjectileLabState
} from '../scene.sim';

/** 白纸在原点左侧、上方留出的页边（cm），保证 O 点落在纸内。 */
export const PAPER_MARGIN_CM = 3;

/** cm ↔ 画布 px 的线性变换。 */
export type StageTransform = {
  px(xCm: number): number;
  py(yCm: number): number;
  cmX(px: number): number;
  cmY(px: number): number;
  /** 每厘米对应的 CSS px。 */
  pxPerCm: number;
  /** 画布 CSS 尺寸。 */
  width: number;
  height: number;
};

export type LabPalette = {
  text: string;
  textMuted: string;
  board: string;
  boardEdge: string;
  base: string;
  paper: string;
  paperEdge: string;
  ruler: string;
  gridMinor: string;
  gridMajor: string;
  ink: string;
  curve: string;
  point: string;
  mark: string;
  metal: string;
  metalDark: string;
  locator: string;
  plumb: string;
  plateTop: string;
  plateSide: string;
  trail: string;
  ballLight: string;
  ballDark: string;
};

export function labPalette(theme: TeachingTheme): LabPalette {
  const dark = theme === 'dark';
  return {
    text: dark ? '#e5e7eb' : '#1f2937',
    textMuted: dark ? '#9ca3af' : '#6b7280',
    board: dark ? '#5a4632' : '#d9b98a',
    boardEdge: dark ? '#3b2d1f' : '#a9844f',
    base: dark ? '#374151' : '#6b7280',
    paper: dark ? '#f1efe6' : '#fdfdf8',
    paperEdge: dark ? '#8b8674' : '#c9c5b5',
    ruler: 'rgba(250, 247, 235, 0.93)',
    gridMinor: '#d5e2ee',
    gridMajor: '#9db6cf',
    ink: '#1f2937',
    curve: '#dc2626',
    point: '#1d4ed8',
    mark: 'rgba(31, 41, 55, 0.3)',
    metal: dark ? '#9aa4b2' : '#7b8594',
    metalDark: dark ? '#6b7280' : '#4b5563',
    locator: '#f59e0b',
    plumb: '#b91c1c',
    plateTop: 'rgba(96, 165, 250, 0.78)',
    plateSide: 'rgba(37, 99, 235, 0.82)',
    trail: dark ? 'rgba(229, 231, 235, 0.55)' : 'rgba(75, 85, 99, 0.55)',
    ballLight: '#f3f4f6',
    ballDark: '#4b5563'
  };
}

export type DrawPaperInput = {
  ctx: CanvasRenderingContext2D;
  t: StageTransform;
  palette: LabPalette;
  state: ProjectileLabState;
  fontPx: number;
  /** 数据处理视图：纸铺满舞台，带毫米格与贴边刻度。 */
  analysis: boolean;
};

/** 各级格线出现所需的每厘米 px。 */
const MM_GRID_MIN_PX_PER_CM = 30;
const HALF_CM_GRID_MIN_PX_PER_CM = 12;
/** 贴边刻度逐厘米标数所需的每厘米 px。 */
const CM_LABEL_MIN_PX_PER_CM = 26;
const MAJOR_EVERY_CM = 5;
const MM_PER_CM = 10;

function strokeLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/** 白纸在画布内可见的范围（cm）。 */
function visiblePaper(t: StageTransform): {
  left: number;
  right: number;
  top: number;
  bottom: number;
} {
  return {
    left: Math.max(-PAPER_MARGIN_CM, t.cmX(0)),
    right: Math.min(PAPER_WIDTH_CM, t.cmX(t.width)),
    top: Math.max(-PAPER_MARGIN_CM, t.cmY(0)),
    bottom: Math.min(PAPER_HEIGHT_CM, t.cmY(t.height))
  };
}

/**
 * 毫米方格纸。格线对齐坐标原点（描迹后为 O 或 A），刻度即读数。
 * 以整数毫米计数，避免小数步长累积误差。
 */
function drawGrid(input: DrawPaperInput): void {
  const { ctx, t, palette, state } = input;
  const view = visiblePaper(t);
  if (view.right <= view.left || view.bottom <= view.top) return;
  const stepMm =
    t.pxPerCm >= MM_GRID_MIN_PX_PER_CM
      ? 1
      : t.pxPerCm >= HALF_CM_GRID_MIN_PX_PER_CM
        ? MAJOR_EVERY_CM
        : MM_PER_CM;
  const hair = Math.min(1.4, Math.max(0.5, t.pxPerCm * 0.02));
  const style = (mm: number): void => {
    const major = mm % (MAJOR_EVERY_CM * MM_PER_CM) === 0;
    const whole = mm % MM_PER_CM === 0;
    const half = mm % MAJOR_EVERY_CM === 0;
    ctx.strokeStyle = major || whole ? palette.gridMajor : palette.gridMinor;
    ctx.lineWidth = major
      ? hair * 2
      : whole
        ? hair * (stepMm === MM_PER_CM ? 0.8 : 1.3)
        : half
          ? hair
          : hair * 0.6;
    ctx.globalAlpha = major
      ? 1
      : whole
        ? stepMm === MM_PER_CM
          ? 0.45
          : 0.8
        : 1;
  };
  const origin = state.axesOrigin;
  const firstX = Math.ceil(((view.left - origin.x) * MM_PER_CM) / stepMm);
  const lastX = Math.floor(((view.right - origin.x) * MM_PER_CM) / stepMm);
  for (let n = firstX; n <= lastX; n += 1) {
    const mm = n * stepMm;
    style(mm);
    const x = t.px(origin.x + mm / MM_PER_CM);
    strokeLine(ctx, x, t.py(view.top), x, t.py(view.bottom));
  }
  const firstY = Math.ceil(((view.top - origin.y) * MM_PER_CM) / stepMm);
  const lastY = Math.floor(((view.bottom - origin.y) * MM_PER_CM) / stepMm);
  for (let n = firstY; n <= lastY; n += 1) {
    const mm = n * stepMm;
    style(mm);
    const y = t.py(origin.y + mm / MM_PER_CM);
    strokeLine(ctx, t.px(view.left), y, t.px(view.right), y);
  }
  ctx.globalAlpha = 1;
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dirX: number,
  dirY: number,
  size: number
): void {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(
    x - dirX * size - dirY * size * 0.45,
    y - dirY * size - dirX * size * 0.45
  );
  ctx.lineTo(
    x - dirX * size + dirY * size * 0.45,
    y - dirY * size + dirX * size * 0.45
  );
  ctx.closePath();
  ctx.fill();
}

function drawAxes(input: DrawPaperInput): void {
  const { ctx, t, palette, state, fontPx, analysis } = input;
  const origin = state.axesOrigin;
  const xEnd = PAPER_WIDTH_CM - 0.6;
  const yEnd = PAPER_HEIGHT_CM - 0.6;
  const arrow = Math.min(fontPx * 0.8, Math.max(4, t.pxPerCm * 0.7));

  ctx.strokeStyle = palette.ink;
  ctx.fillStyle = palette.ink;
  ctx.lineWidth = Math.min(1.6, Math.max(1, t.pxPerCm * 0.07));
  strokeLine(ctx, t.px(origin.x), t.py(origin.y), t.px(xEnd), t.py(origin.y));
  strokeLine(ctx, t.px(origin.x), t.py(origin.y), t.px(origin.x), t.py(yEnd));
  drawArrow(ctx, t.px(xEnd), t.py(origin.y), 1, 0, arrow);
  drawArrow(ctx, t.px(origin.x), t.py(yEnd), 0, 1, arrow);

  ctx.font = `${fontPx}px ui-sans-serif, sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  if (state.params.recordOrigin) {
    ctx.fillText(
      'O',
      t.px(origin.x) - fontPx * 0.3,
      t.py(origin.y) - fontPx * 0.15
    );
  }
  ctx.fillText('x', t.px(xEnd), t.py(origin.y) - fontPx * 0.35);
  ctx.textAlign = 'left';
  ctx.fillText('y', t.px(origin.x) + fontPx * 0.4, t.py(yEnd));
  if (analysis) return;

  // 实验视图：沿坐标轴每 10 cm 标一个数。数据处理视图改用贴边刻度。
  const tickFont = fontPx * 0.8;
  ctx.font = `${tickFont}px ui-sans-serif, sans-serif`;
  const every = MAJOR_EVERY_CM * 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  for (let n = every; origin.x + n < xEnd - 3; n += every) {
    ctx.fillText(
      String(n),
      t.px(origin.x + n),
      t.py(origin.y) - tickFont * 0.2
    );
  }
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let n = every; origin.y + n < yEnd - 1; n += every) {
    ctx.fillText(
      String(n),
      t.px(origin.x) - tickFont * 0.3,
      t.py(origin.y + n)
    );
  }
}

function drawCurve(input: DrawPaperInput): void {
  const { ctx, t, palette, state, analysis } = input;
  const curve = state.curve;
  if (!curve) return;
  // 未记录抛出点时，曲线只画在落点覆盖的那一段。
  const xStart = state.params.recordOrigin
    ? 0
    : Math.max(0, state.axesOrigin.x - 1);
  let xMax = PAPER_WIDTH_CM - 1;
  while (xMax > xStart && curveY(curve, xMax) > PAPER_HEIGHT_CM - 1) {
    xMax -= 0.25;
  }
  const xEnd = xStart + (xMax - xStart) * state.traceProgress;
  if (xEnd <= xStart) return;
  const samples = analysis ? 240 : 48;
  ctx.strokeStyle = palette.curve;
  ctx.lineWidth = analysis
    ? Math.min(1.4, Math.max(1, t.pxPerCm * 0.1))
    : Math.max(1.2, t.pxPerCm * 0.1);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i <= samples; i += 1) {
    const x = xStart + ((xEnd - xStart) * i) / samples;
    const y = curveY(curve, x);
    if (i === 0) ctx.moveTo(t.px(x), t.py(y));
    else ctx.lineTo(t.px(x), t.py(y));
  }
  ctx.stroke();
}

/** 测量点：一个小实心点加字母，不遮挡格线。 */
function drawMeasurePoints(input: DrawPaperInput): void {
  const { ctx, t, palette, state, fontPx, analysis } = input;
  if (state.traceProgress < 1) return;
  const r = analysis ? 2.2 : Math.max(2, t.pxPerCm * 0.18);
  ctx.font = `600 ${fontPx}px ui-sans-serif, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = palette.point;
  for (const point of state.measurePoints) {
    const x = t.px(point.x);
    const y = t.py(point.y);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(point.label, x + fontPx * 0.5, y - fontPx * 0.35);
  }
}

/**
 * 贴在画布上边与左边的刻度带：数字是相对坐标原点的厘米数。
 * 无论平移到哪里，当前视野的读数刻度都在。
 */
function drawRulers(input: DrawPaperInput): void {
  const { ctx, t, palette, state, fontPx } = input;
  const origin = state.axesOrigin;
  const view = visiblePaper(t);
  const band = fontPx * 1.5;
  const side = fontPx * 2.3;
  const every =
    t.pxPerCm >= CM_LABEL_MIN_PX_PER_CM
      ? 1
      : t.pxPerCm * MAJOR_EVERY_CM >= fontPx * 2.2
        ? MAJOR_EVERY_CM
        : MAJOR_EVERY_CM * 2;
  const tickFont = fontPx * 0.85;

  ctx.fillStyle = palette.ruler;
  ctx.fillRect(0, 0, t.width, band);
  ctx.fillRect(0, 0, side, t.height);
  ctx.strokeStyle = palette.paperEdge;
  ctx.lineWidth = 1;
  strokeLine(ctx, 0, band, t.width, band);
  strokeLine(ctx, side, 0, side, t.height);

  ctx.fillStyle = palette.ink;
  ctx.strokeStyle = palette.ink;
  ctx.font = `${tickFont}px ui-sans-serif, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const firstX = Math.ceil((view.left - origin.x) / every);
  const lastX = Math.floor((view.right - origin.x) / every);
  for (let n = firstX; n <= lastX; n += 1) {
    const x = t.px(origin.x + n * every);
    if (x < side + tickFont) continue;
    ctx.fillText(String(n * every), x, band * 0.45);
    strokeLine(ctx, x, band * 0.82, x, band);
  }
  ctx.textAlign = 'right';
  const firstY = Math.ceil((view.top - origin.y) / every);
  const lastY = Math.floor((view.bottom - origin.y) / every);
  for (let n = firstY; n <= lastY; n += 1) {
    const y = t.py(origin.y + n * every);
    if (y < band + tickFont * 0.6) continue;
    ctx.fillText(String(n * every), side * 0.8, y);
    strokeLine(ctx, side * 0.86, y, side, y);
  }
  ctx.fillStyle = palette.ruler;
  ctx.fillRect(0, 0, side, band);
  ctx.fillStyle = palette.textMuted;
  ctx.textAlign = 'center';
  ctx.fillText('cm', side / 2, band * 0.45);
}

/** 白纸：方格、落点；描迹后叠加坐标轴、轨迹与测量点。 */
export function drawPaper(input: DrawPaperInput): void {
  const { ctx, t, palette, state, fontPx, analysis } = input;
  const left = t.px(-PAPER_MARGIN_CM);
  const top = t.py(-PAPER_MARGIN_CM);
  const width = t.px(PAPER_WIDTH_CM) - left;
  const height = t.py(PAPER_HEIGHT_CM) - top;

  ctx.fillStyle = palette.paper;
  ctx.fillRect(left, top, width, height);
  drawGrid(input);
  ctx.strokeStyle = palette.paperEdge;
  ctx.lineWidth = Math.min(1.5, Math.max(1, t.pxPerCm * 0.05));
  ctx.strokeRect(left, top, width, height);

  if (state.traced) {
    drawAxes(input);
    drawCurve(input);
  } else if (state.params.recordOrigin) {
    // 实验前在白纸上记下抛出点 O（小球在槽口时球心的位置）。
    const r = Math.max(2, t.pxPerCm * 0.35);
    ctx.strokeStyle = palette.ink;
    ctx.fillStyle = palette.ink;
    ctx.lineWidth = Math.max(1, t.pxPerCm * 0.06);
    strokeLine(ctx, t.px(0) - r, t.py(0), t.px(0) + r, t.py(0));
    strokeLine(ctx, t.px(0), t.py(0) - r, t.px(0), t.py(0) + r);
    ctx.font = `${fontPx}px ui-sans-serif, sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('O', t.px(0) - fontPx * 0.3, t.py(0) - fontPx * 0.15);
  }

  // 复写纸落点。数据处理视图里画成淡色小点，不挡读数。
  const markR = analysis
    ? Math.min(3.5, Math.max(1.6, t.pxPerCm * 0.12))
    : Math.max(1.6, t.pxPerCm * 0.2);
  ctx.fillStyle = analysis ? palette.mark : palette.ink;
  for (const mark of state.marks) {
    ctx.beginPath();
    ctx.arc(t.px(mark.x), t.py(mark.y), markR, 0, Math.PI * 2);
    ctx.fill();
  }

  if (state.traced) drawMeasurePoints(input);
  if (analysis && state.traced) drawRulers(input);
}
