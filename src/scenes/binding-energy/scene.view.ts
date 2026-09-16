import { scaledSize } from '../../core/canvas-sizing';
import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  BINDING_ENERGY_DATA,
  BINDING_ENERGY_LABELED,
  BINDING_ENERGY_X_TITLE,
  BINDING_ENERGY_Y_TITLE,
  bindingEnergyAt,
  bindingEnergyConstants as C,
  chartX,
  chartY,
  clampLabelX,
  estimateLabelWidth,
  nuclideLabelAnchor,
  stageLayoutFrom,
  stageTransform,
  type BindingEnergyLabelAnchor,
  type BindingEnergyState
} from './scene.sim';

export type CreateBindingEnergyViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

type Palette = {
  bg: string;
  grid: string;
  ink: string;
  muted: string;
  red: string;
  teal: string;
  gold: string;
  ironFill: string;
  wash: string;
  selected: string;
  marker: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    grid: '#e2e7ee',
    ink: '#303744',
    muted: '#8b97a5',
    red: '#ef4050',
    teal: '#2a9d8f',
    gold: '#e6a719',
    ironFill: '#fff6d8',
    wash: 'rgba(239, 64, 80, 0.08)',
    selected: '#f4b942',
    marker: '#ffffff'
  },
  dark: {
    bg: '#101827',
    grid: '#435169',
    ink: '#eef2f7',
    muted: '#9eabbc',
    red: '#fb7185',
    teal: '#34d399',
    gold: '#fbbf24',
    ironFill: '#3f2f12',
    wash: 'rgba(251, 113, 133, 0.12)',
    selected: '#fbbf24',
    marker: '#172235'
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

function measuredWidth(
  ctx: CanvasRenderingContext2D,
  value: string,
  size: number
): number {
  const width = ctx.measureText(value).width;
  if (Number.isFinite(width) && width > 1) return width;
  return estimateLabelWidth(value, size);
}

function fillLabel(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  color: string,
  size: number,
  align: BindingEnergyLabelAnchor['align'] = 'left',
  weight = 600
): void {
  ctx.font = `${weight} ${size}px sans-serif`;
  const width = measuredWidth(ctx, value, size);
  const drawX = clampLabelX(x, width, align);
  const half = size * 0.55;
  const drawY = Math.min(
    Math.max(y, C.labelInset + half),
    C.baseHeight - C.labelInset - half
  );
  text(ctx, value, drawX, drawY, color, size, align, weight);
}

function arrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width: number,
  head: number
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
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - ux * head - uy * head * 0.45,
    y2 - uy * head + ux * head * 0.45
  );
  ctx.lineTo(
    x2 - ux * head + uy * head * 0.45,
    y2 - uy * head - ux * head * 0.45
  );
  ctx.closePath();
  ctx.fill();
}

function drawAxes(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  font: (n: number) => number
): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, C.baseWidth, C.baseHeight);

  const ironX = chartX(C.ironA);
  ctx.fillStyle = p.wash;
  ctx.fillRect(
    chartX(0),
    C.chartTop,
    ironX - chartX(0),
    C.chartBottom - C.chartTop
  );

  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let a = 0; a <= C.axisMaxA; a += C.gridStepX) {
    const x = chartX(a);
    ctx.beginPath();
    ctx.moveTo(x, C.chartTop);
    ctx.lineTo(x, C.chartBottom);
    ctx.stroke();
    if (a !== 0 && a < C.axisMaxA) {
      text(ctx, `${a}`, x, C.chartBottom + 16, p.ink, font(11), 'center');
    }
  }
  for (let e = 0; e <= 8; e += C.gridStepY) {
    const y = chartY(e);
    ctx.beginPath();
    ctx.moveTo(C.chartLeft, y);
    ctx.lineTo(C.chartRight, y);
    ctx.stroke();
    text(ctx, `${e}`, C.chartLeft - 10, y, p.muted, font(11), 'right');
  }

  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(C.chartLeft, C.chartBottom);
  ctx.lineTo(C.chartLeft, C.chartTop);
  ctx.stroke();
  arrow(
    ctx,
    C.chartLeft,
    C.chartBottom,
    C.chartLeft,
    C.chartTop - 8,
    p.ink,
    1.8,
    9
  );
  ctx.beginPath();
  ctx.moveTo(C.chartLeft, C.chartBottom);
  ctx.lineTo(C.chartRight, C.chartBottom);
  ctx.stroke();
  arrow(
    ctx,
    C.chartLeft,
    C.chartBottom,
    C.chartRight + 8,
    C.chartBottom,
    p.ink,
    1.8,
    9
  );
  text(ctx, '0', C.chartLeft - 10, C.chartBottom, p.ink, font(11), 'right');
  const titleSize = font(13);
  const titleX = C.chartLeft + 8;
  const titleLine2 = C.chartTop - 16;
  const titleLine1 = titleLine2 - titleSize * 1.2;
  fillLabel(
    ctx,
    BINDING_ENERGY_Y_TITLE[0],
    titleX,
    titleLine1,
    p.ink,
    titleSize,
    'left',
    700
  );
  fillLabel(
    ctx,
    BINDING_ENERGY_Y_TITLE[1],
    titleX,
    titleLine2,
    p.ink,
    titleSize,
    'left',
    700
  );
  fillLabel(
    ctx,
    BINDING_ENERGY_X_TITLE,
    C.chartRight,
    C.chartBottom + 30,
    p.ink,
    font(13),
    'right',
    700
  );

  ctx.strokeStyle = p.gold;
  ctx.lineWidth = 1.4;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(ironX, C.chartBottom);
  ctx.lineTo(ironX, chartY(C.ironBinding));
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawCurve(ctx: CanvasRenderingContext2D, p: Palette): void {
  const gradient = ctx.createLinearGradient(
    chartX(C.aMin),
    0,
    chartX(C.aMax),
    0
  );
  gradient.addColorStop(0, p.red);
  gradient.addColorStop(C.ironA / C.axisMaxA, p.gold);
  gradient.addColorStop(1, p.teal);
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let a = C.aMin; a <= C.aMax; a += 1) {
    const x = chartX(a);
    const y = chartY(bindingEnergyAt(a));
    if (a === C.aMin) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawNuclides(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  font: (n: number) => number
): void {
  for (const point of BINDING_ENERGY_DATA) {
    const labeled = (BINDING_ENERGY_LABELED as readonly string[]).includes(
      point.symbol
    );
    if (!labeled && point.A !== C.ironA) continue;
    const x = chartX(point.A);
    const y = chartY(point.binding);
    const iron = point.A === C.ironA;
    ctx.fillStyle = iron ? p.ironFill : p.marker;
    ctx.strokeStyle = iron ? p.gold : p.teal;
    ctx.lineWidth = iron ? 3.5 : 2;
    ctx.beginPath();
    ctx.arc(x, y, iron ? C.ironRadius : C.pointRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (!labeled) continue;
    const anchor = nuclideLabelAnchor(point.symbol);
    fillLabel(
      ctx,
      point.symbol,
      x + anchor.dx,
      y + anchor.dy,
      p.ink,
      font(iron ? 13 : 12),
      anchor.align,
      700
    );
  }
}

function drawRegions(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  font: (n: number) => number
): void {
  ctx.setLineDash([7, 6]);
  arrow(ctx, chartX(16), chartY(6.4), chartX(48), chartY(8.45), p.red, 2.2, 10);
  arrow(
    ctx,
    chartX(210),
    chartY(6.35),
    chartX(78),
    chartY(8.35),
    p.teal,
    2.2,
    10
  );
  ctx.setLineDash([]);
  fillLabel(
    ctx,
    '聚变',
    chartX(32),
    chartY(5.15),
    p.red,
    font(13),
    'center',
    700
  );
  fillLabel(
    ctx,
    '裂变',
    chartX(155),
    chartY(6.2),
    p.teal,
    font(13),
    'center',
    700
  );
}

function drawSelection(
  ctx: CanvasRenderingContext2D,
  state: BindingEnergyState,
  p: Palette,
  font: (n: number) => number
): void {
  const a = state.cursorA;
  const x = chartX(a);
  const y = chartY(bindingEnergyAt(a));
  ctx.fillStyle = p.selected;
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(x, y, C.selectedRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const labeled = BINDING_ENERGY_DATA.filter((point) =>
    (BINDING_ENERGY_LABELED as readonly string[]).includes(point.symbol)
  );
  if (labeled.some((point) => Math.abs(point.A - a) <= 6)) return;
  fillLabel(
    ctx,
    `A=${Math.round(a)}`,
    x,
    y - 20,
    p.ink,
    font(12),
    'center',
    700
  );
}

export function createBindingEnergyView(
  options: CreateBindingEnergyViewOptions = {}
) {
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: {
      mode: 'clamped',
      fallbackWidth: C.baseWidth,
      fallbackHeight: C.baseHeight
    },
    initialWidth: C.baseWidth,
    initialHeight: C.baseHeight,
    eagerContext: true
  });
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  let snapshot: BindingEnergyState | null = null;

  function draw(state: BindingEnergyState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const layout = stageLayoutFrom(stage.canvas);
    const { fit, offsetX, offsetY } = stageTransform(width, height, layout);
    const palette = PALETTE[env.theme];
    const rs = stage.responsiveScale;
    const typeScale = env.fontScale() * Math.min(env.contentScale(), 1.25);
    const font = (base: number): number =>
      scaledSize(base * typeScale, Math.max(rs, 0.3), 11) / Math.max(fit, 0.05);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fit, fit);
    drawAxes(ctx, palette, font);
    drawCurve(ctx, palette);
    if (state.params.showRegions) drawRegions(ctx, palette, font);
    drawNuclides(ctx, palette, font);
    drawSelection(ctx, state, palette, font);
    ctx.restore();
  }

  return {
    render(state: BindingEnergyState): void {
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
