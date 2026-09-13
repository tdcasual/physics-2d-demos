import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { threeForcesConstants, type ThreeForcesState } from './scene.sim';

export type CreateThreeForcesViewOptions = {
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
  blockX: BLOCK_X,
  blockWidth: BLOCK_W,
  blockHeight: BLOCK_H,
  planeStartX: PLANE_START_X,
  planeEndX: PLANE_END_X,
  planeBaseY: PLANE_BASE_Y,
  titleY: TITLE_Y,
  formulaTop: FORMULA_TOP,
  formulaHeight: FORMULA_HEIGHT,
  statusTop: STATUS_TOP,
  statusHeight: STATUS_HEIGHT,
  valuesTop: VALUES_TOP,
  valuesHeight: VALUES_HEIGHT,
  valuesStartY: VALUES_START_Y,
  valuesRowGap: VALUES_ROW_GAP,
  gridStep: GRID_STEP,
  vectorScale: VECTOR_SCALE,
  springLeft: SPRING_LEFT,
  springWidth: SPRING_WIDTH,
  groundY: GROUND_Y
} = threeForcesConstants;
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
  wedge: string;
};
const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    panel: '#fff',
    grid: '#e8e4dc',
    ink: '#303744',
    muted: '#8b97a5',
    red: '#ef4050',
    blue: '#3285d5',
    teal: '#1f9b8f',
    gold: '#e49a1b',
    border: '#d2d9e2',
    soft: '#f0f2f5',
    wedge: '#f0eee8'
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
    soft: '#253249',
    wedge: '#273246'
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
  color: string,
  width = 4,
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
  ctx.setLineDash(dashed ? [6, 5] : []);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - ux * 13 - uy * 6, y2 - uy * 13 + ux * 6);
  ctx.lineTo(x2 - ux * 13 + uy * 6, y2 - uy * 13 - ux * 6);
  ctx.closePath();
  ctx.fill();
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
function blockPosition(state: ThreeForcesState): {
  x: number;
  y: number;
  theta: number;
} {
  const theta = (state.params.inclineAngle * Math.PI) / 180;
  const x = BLOCK_X + state.blockOffset;
  const y = PLANE_BASE_Y - (x - PLANE_START_X) * Math.tan(theta) - 30;
  return { x, y, theta };
}
function drawIncline(
  ctx: CanvasRenderingContext2D,
  state: ThreeForcesState,
  p: Palette,
  scale: number
): void {
  const theta = (state.params.inclineAngle * Math.PI) / 180;
  const endX = PLANE_START_X + (PLANE_END_X - PLANE_START_X) * Math.cos(theta);
  const endY = PLANE_BASE_Y - (PLANE_END_X - PLANE_START_X) * Math.sin(theta);
  ctx.fillStyle = p.wedge;
  ctx.beginPath();
  ctx.moveTo(PLANE_START_X, PLANE_BASE_Y);
  ctx.lineTo(endX, endY);
  ctx.lineTo(endX, PLANE_BASE_Y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(PLANE_START_X, PLANE_BASE_Y);
  ctx.lineTo(endX, endY);
  ctx.lineTo(endX, PLANE_BASE_Y);
  ctx.moveTo(PLANE_START_X - 20, PLANE_BASE_Y);
  ctx.lineTo(endX + 40, PLANE_BASE_Y);
  ctx.stroke();
  text(
    ctx,
    `${state.params.inclineAngle.toFixed(0)}°`,
    PLANE_START_X + 78,
    PLANE_BASE_Y - 18,
    p.gold,
    18 * scale,
    'center',
    700
  );
}
function drawSpring(
  ctx: CanvasRenderingContext2D,
  state: ThreeForcesState,
  p: Palette,
  scale: number
): void {
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(SPRING_LEFT, GROUND_Y);
  ctx.lineTo(SPRING_LEFT + SPRING_WIDTH, GROUND_Y);
  ctx.stroke();
  const x = SPRING_LEFT + 160 + state.params.springX * 220;
  const y = GROUND_Y - BLOCK_H / 2;
  ctx.strokeStyle = p.gold;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(SPRING_LEFT, y);
  for (let i = 1; i <= 10; i += 1) {
    const px = SPRING_LEFT + ((x - SPRING_LEFT) * i) / 10;
    const py = y + (i % 2 ? -14 : 14);
    ctx.lineTo(px, py);
  }
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.fillStyle = p.soft;
  ctx.fillRect(x, y - BLOCK_H / 2, BLOCK_W, BLOCK_H);
  ctx.strokeStyle = p.ink;
  ctx.strokeRect(x, y - BLOCK_H / 2, BLOCK_W, BLOCK_H);
  arrow(
    ctx,
    x + BLOCK_W / 2,
    y,
    x +
      BLOCK_W / 2 -
      Math.min(110, Math.max(24, state.springForce * VECTOR_SCALE)),
    y,
    p.gold,
    5
  );
  text(
    ctx,
    'F弹',
    x + BLOCK_W / 2 - 66,
    y - 30,
    p.gold,
    17 * scale,
    'center',
    700
  );
  text(
    ctx,
    `x = ${state.params.springX.toFixed(2)} m`,
    x,
    y + 46,
    p.muted,
    14 * scale
  );
}
function drawInclineBlock(
  ctx: CanvasRenderingContext2D,
  state: ThreeForcesState,
  p: Palette,
  scale: number
): void {
  drawIncline(ctx, state, p, scale);
  const { x, y, theta } = blockPosition(state);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-theta);
  ctx.fillStyle = '#9d7865';
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 3;
  ctx.fillRect(-BLOCK_W / 2, -BLOCK_H / 2, BLOCK_W, BLOCK_H);
  ctx.strokeRect(-BLOCK_W / 2, -BLOCK_H / 2, BLOCK_W, BLOCK_H);
  ctx.restore();
  const nx = -Math.sin(theta);
  const ny = -Math.cos(theta);
  const tx = Math.cos(theta);
  const ty = -Math.sin(theta);
  const startX = x;
  const startY = y;
  arrow(
    ctx,
    startX,
    startY,
    startX,
    startY + Math.min(120, state.gravity * VECTOR_SCALE),
    p.red,
    5
  );
  text(ctx, 'G', startX + 14, startY + 78, p.red, 17 * scale, 'left', 700);
  arrow(
    ctx,
    startX,
    startY,
    startX + nx * Math.min(106, state.normal * VECTOR_SCALE),
    startY + ny * Math.min(106, state.normal * VECTOR_SCALE),
    p.blue,
    5
  );
  text(
    ctx,
    'FN',
    startX + nx * 80 - 8,
    startY + ny * 80,
    p.blue,
    16 * scale,
    'center',
    700
  );
  if (state.params.tab === 'friction' && state.friction > 0) {
    arrow(
      ctx,
      startX,
      startY,
      startX + tx * Math.min(86, state.friction * VECTOR_SCALE),
      startY + ty * Math.min(86, state.friction * VECTOR_SCALE),
      p.teal,
      5
    );
    text(
      ctx,
      'f',
      startX + tx * 68,
      startY + ty * 68 - 12,
      p.teal,
      17 * scale,
      'center',
      700
    );
  }
  if (state.params.showComponents) {
    arrow(
      ctx,
      startX,
      startY,
      startX - tx * Math.min(96, state.downslope * VECTOR_SCALE),
      startY - ty * Math.min(96, state.downslope * VECTOR_SCALE),
      p.gold,
      3,
      true
    );
    arrow(
      ctx,
      startX,
      startY,
      startX + nx * Math.min(96, state.perpendicular * VECTOR_SCALE),
      startY + ny * Math.min(96, state.perpendicular * VECTOR_SCALE),
      p.muted,
      3,
      true
    );
    text(
      ctx,
      'G₁',
      startX - tx * 68,
      startY - ty * 68,
      p.gold,
      15 * scale,
      'center'
    );
    text(
      ctx,
      'G₂',
      startX + nx * 74,
      startY + ny * 74,
      p.muted,
      15 * scale,
      'center'
    );
  }
}
function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: ThreeForcesState,
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
  text(ctx, '三大性质力', x + INSET, TITLE_Y, p.ink, 20 * scale, 'left', 700);
  const tabLabel =
    state.params.tab === 'gravity'
      ? '重力'
      : state.params.tab === 'friction'
        ? '摩擦力'
        : '弹力';
  text(ctx, tabLabel, x + INSET, 92, p.red, 16 * scale, 'left', 700);
  ctx.fillStyle = p.soft;
  ctx.beginPath();
  ctx.roundRect(x + INSET, FORMULA_TOP, PANEL_W, FORMULA_HEIGHT, 10);
  ctx.fill();
  const lines =
    state.params.tab === 'gravity'
      ? ['G = mg', 'G₁ = G sinθ', 'G₂ = G cosθ']
      : state.params.tab === 'friction'
        ? [
            'f ≤ μFN',
            state.frictionMax >= state.frictionRequired
              ? '静止：f = G₁'
              : '下滑：G₁ > fmax'
          ]
        : ['F弹 = kx', 'k = 40 N/m'];
  lines.forEach((line, index) =>
    text(
      ctx,
      line,
      x + 42,
      FORMULA_TOP + 22 + index * 24,
      p.ink,
      13 * scale,
      'left',
      700
    )
  );
  ctx.fillStyle = p.soft;
  ctx.beginPath();
  ctx.roundRect(x + INSET, STATUS_TOP, PANEL_W, STATUS_HEIGHT, 10);
  ctx.fill();
  text(
    ctx,
    state.status,
    x + 42,
    STATUS_TOP + 25,
    p.teal,
    15 * scale,
    'left',
    700
  );
  text(
    ctx,
    state.params.tab === 'friction'
      ? '比较下滑分力与最大静摩擦力'
      : '矢量与数值同步更新',
    x + 42,
    STATUS_TOP + 49,
    p.muted,
    11 * scale,
    'left'
  );
  ctx.strokeStyle = p.border;
  ctx.beginPath();
  ctx.roundRect(x + INSET, VALUES_TOP, PANEL_W, VALUES_HEIGHT, 10);
  ctx.stroke();
  const rows: Array<[string, string, string]> = [
    ['重力 G', `${state.gravity.toFixed(1)} N`, p.red],
    ['支持力 FN', `${state.normal.toFixed(1)} N`, p.blue],
    ['下滑分力 G₁', `${state.downslope.toFixed(1)} N`, p.gold],
    ['摩擦力 f', `${state.friction.toFixed(1)} N`, p.teal],
    ['最大摩擦力', `${state.frictionMax.toFixed(1)} N`, p.ink],
    ['加速度 a', `${state.acceleration.toFixed(2)} m/s²`, p.ink]
  ];
  rows.forEach(([label, value, color], index) => {
    const y = VALUES_START_Y + index * VALUES_ROW_GAP;
    text(ctx, label, x + 42, y, p.ink, 12 * scale);
    text(ctx, value, x + 224, y, color, 13 * scale, 'right', 700);
  });
}
export function createThreeForcesView(
  options: CreateThreeForcesViewOptions = {}
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
  let snapshot: ThreeForcesState | null = null;
  function draw(state: ThreeForcesState): void {
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
    text(ctx, '实时受力分析', 250, 30, p.muted, 16 * scale, 'center', 700);
    if (state.params.tab === 'spring') drawSpring(ctx, state, p, scale);
    else drawInclineBlock(ctx, state, p, scale);
    drawPanel(ctx, state, p, scale);
    ctx.restore();
  }
  return {
    render(state: ThreeForcesState): void {
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
