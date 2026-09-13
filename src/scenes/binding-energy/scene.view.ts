import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { bindingEnergyConstants, type BindingEnergyState } from './scene.sim';
export type CreateBindingEnergyViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};
const {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  fieldWidth: FIELD_W,
  chartLeft: LEFT,
  chartRight: RIGHT,
  chartTop: TOP,
  chartBottom: BOTTOM,
  panelWidth: PANEL_W,
  panelInset: INSET,
  titleY: TITLE_Y,
  formulaTop: FORMULA_TOP,
  formulaHeight: FORMULA_HEIGHT,
  valuesTop: VALUES_TOP,
  valuesHeight: VALUES_HEIGHT,
  valuesStartY: VALUES_START_Y,
  valuesRowGap: VALUES_ROW_GAP,
  gridStepX: GRID_X,
  gridStepY: GRID_Y,
  pointRadius: POINT_R,
  ironA: IRON_A
} = bindingEnergyConstants;
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
    blue: '#3c80a8',
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
function drawArrow(
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
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 7]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - ux * 12 - uy * 6, y2 - uy * 12 + ux * 6);
  ctx.lineTo(x2 - ux * 12 + uy * 6, y2 - uy * 12 - ux * 6);
  ctx.closePath();
  ctx.fill();
}
function chartX(A: number): number {
  return LEFT + (RIGHT - LEFT) * (A / 250);
}
function chartY(E: number): number {
  return BOTTOM - (BOTTOM - TOP) * (E / 9);
}
function drawChart(
  ctx: CanvasRenderingContext2D,
  state: BindingEnergyState,
  p: Palette,
  scale: number
): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, FIELD_W, BASE_H);
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let x = LEFT; x <= RIGHT; x += GRID_X) {
    ctx.beginPath();
    ctx.moveTo(x, TOP);
    ctx.lineTo(x, BOTTOM);
    ctx.stroke();
  }
  for (let y = 0; y <= 9; y += GRID_Y) {
    const py = chartY(y);
    ctx.beginPath();
    ctx.moveTo(LEFT, py);
    ctx.lineTo(RIGHT, py);
    ctx.stroke();
    text(ctx, `${y}`, LEFT - 14, py, p.muted, 11 * scale, 'right');
  }
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(LEFT, BOTTOM);
  ctx.lineTo(RIGHT + 12, BOTTOM);
  ctx.moveTo(LEFT, BOTTOM);
  ctx.lineTo(LEFT, TOP - 12);
  ctx.stroke();
  text(ctx, '质量数 A', RIGHT, BOTTOM + 24, p.ink, 14 * scale, 'right', 700);
  text(
    ctx,
    '比结合能 E/A (MeV)',
    LEFT - 8,
    TOP - 28,
    p.ink,
    15 * scale,
    'left',
    700
  );
  const points = [
    { A: 1, E: 0 },
    { A: 4, E: 7.07 },
    { A: 12, E: 7.68 },
    { A: 16, E: 7.98 },
    { A: 40, E: 8.55 },
    { A: 56, E: 8.79 },
    { A: 89, E: 8.63 },
    { A: 140, E: 8.42 },
    { A: 238, E: 7.57 }
  ];
  ctx.strokeStyle = p.gold;
  ctx.lineWidth = 4;
  ctx.beginPath();
  points.forEach((point, index) => {
    const x = chartX(point.A);
    const y = chartY(point.E);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  points.forEach((point) => {
    ctx.fillStyle = point.A === IRON_A ? p.gold : p.panel;
    ctx.strokeStyle = point.A === IRON_A ? p.gold : p.teal;
    ctx.lineWidth = point.A === IRON_A ? 4 : 2;
    ctx.beginPath();
    ctx.arc(
      chartX(point.A),
      chartY(point.E),
      point.A === IRON_A ? 13 : POINT_R,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.stroke();
    if ([4, 16, IRON_A, 89, 238].includes(point.A))
      text(
        ctx,
        point.A === IRON_A ? 'Fe-56' : point.A === 238 ? 'U-238' : `${point.A}`,
        chartX(point.A),
        chartY(point.E) - 18,
        p.ink,
        12 * scale,
        'center',
        700
      );
  });
  const currentX = chartX(state.point.A);
  const currentY = chartY(state.point.binding);
  ctx.fillStyle = p.red;
  ctx.beginPath();
  ctx.arc(currentX, currentY, POINT_R + 3, 0, Math.PI * 2);
  ctx.fill();
  text(
    ctx,
    state.point.symbol,
    currentX,
    currentY - 22,
    p.red,
    13 * scale,
    'center',
    700
  );
  if (state.params.showRegions) {
    drawArrow(ctx, chartX(235), chartY(7.55), chartX(62), chartY(8.7), p.teal);
    text(
      ctx,
      '裂变释放能量',
      chartX(168),
      chartY(8.1),
      p.teal,
      14 * scale,
      'center',
      700
    );
    drawArrow(ctx, chartX(15), chartY(7.2), chartX(53), chartY(8.7), p.red);
    text(
      ctx,
      '聚变释放能量',
      chartX(33),
      chartY(7.8),
      p.red,
      14 * scale,
      'center',
      700
    );
  }
}
function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: BindingEnergyState,
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
  text(
    ctx,
    '原子核比结合能',
    x + INSET,
    TITLE_Y + 24,
    p.blue,
    20 * scale,
    'left',
    700
  );
  text(ctx, state.point.symbol, x + INSET, 86, p.ink, 18 * scale, 'left', 700);
  ctx.fillStyle = p.soft;
  ctx.beginPath();
  ctx.roundRect(x + INSET, FORMULA_TOP, PANEL_W, FORMULA_HEIGHT, 10);
  ctx.fill();
  text(
    ctx,
    'E = A × (E/A)',
    x + 42,
    FORMULA_TOP + 28,
    p.ink,
    15 * scale,
    'left',
    700
  );
  text(
    ctx,
    `≈ ${state.total.toFixed(1)} MeV`,
    x + 42,
    FORMULA_TOP + 58,
    p.teal,
    15 * scale,
    'left',
    700
  );
  ctx.strokeStyle = p.border;
  ctx.beginPath();
  ctx.roundRect(x + INSET, VALUES_TOP, PANEL_W, VALUES_HEIGHT, 10);
  ctx.stroke();
  const rows: Array<[string, string, string]> = [
    ['核素名称', state.point.name, p.ink],
    ['质量数 A', `${state.point.A}`, p.ink],
    ['比结合能', `${state.point.binding.toFixed(2)} MeV`, p.teal],
    ['状态', state.status, p.gold]
  ];
  rows.forEach(([label, value, color], index) => {
    const y = VALUES_START_Y + index * VALUES_ROW_GAP;
    text(ctx, label, x + 42, y, p.muted, 13 * scale);
    text(ctx, value, x + 224, y, color, 13 * scale, 'right', 700);
  });
  text(ctx, '铁附近最稳定', x + INSET, 520, p.muted, 13 * scale);
}
export function createBindingEnergyView(
  options: CreateBindingEnergyViewOptions = {}
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
  let snapshot: BindingEnergyState | null = null;
  function draw(state: BindingEnergyState): void {
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
    drawChart(ctx, state, PALETTE[env.theme], scale);
    drawPanel(ctx, state, PALETTE[env.theme], scale);
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
