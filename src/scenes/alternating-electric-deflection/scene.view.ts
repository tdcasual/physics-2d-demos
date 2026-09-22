import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  alternatingElectricDeflectionConstants,
  type AlternatingElectricDeflectionState
} from './scene.sim';

export type CreateAlternatingElectricDeflectionViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

const C = alternatingElectricDeflectionConstants;
const GRAPH_RIGHT = C.graphLeft + C.graphWidth + C.graphGap;
const GRID_STEP = 54;
const GRID_ALPHA = '32';
const DASH = 7;

type Palette = {
  bg: string;
  panel: string;
  ink: string;
  muted: string;
  border: string;
  grid: string;
  teal: string;
  red: string;
  blue: string;
  gold: string;
  orange: string;
  green: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#f7fafc',
    panel: '#ffffff',
    ink: '#344256',
    muted: '#8291a7',
    border: '#d6e0ec',
    grid: '#cfdae6',
    teal: '#1eaa91',
    red: '#f04f5f',
    blue: '#347fd2',
    gold: '#e69a20',
    orange: '#f59b16',
    green: '#2f9f68'
  },
  dark: {
    bg: '#101a2a',
    panel: '#172538',
    ink: '#f1f5fb',
    muted: '#aab8ca',
    border: '#3d526d',
    grid: '#2a405b',
    teal: '#39d7b3',
    red: '#fb7185',
    blue: '#6baaff',
    gold: '#f9c24a',
    orange: '#ffbd4a',
    green: '#64d999'
  }
};

function label(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  color: string,
  size = 14,
  align: CanvasTextAlign = 'left',
  weight = 600
): void {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

function card(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  stroke: string,
  radius: number = C.cardRadius
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function arrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width = 3,
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
  ctx.setLineDash(dashed ? [DASH, 5] : []);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - ux * 10 - uy * 5, y2 - uy * 10 + ux * 5);
  ctx.lineTo(x2 - ux * 10 + uy * 5, y2 - uy * 10 - ux * 5);
  ctx.closePath();
  ctx.fill();
}

function drawGrid(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, C.fieldWidth, C.baseHeight);
  ctx.strokeStyle = `${p.grid}${GRID_ALPHA}`;
  ctx.lineWidth = 1;
  for (let x = 0; x <= C.fieldWidth; x += GRID_STEP) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, C.baseHeight);
    ctx.stroke();
  }
  for (let y = 0; y <= C.baseHeight; y += GRID_STEP) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(C.fieldWidth, y);
    ctx.stroke();
  }
}

function drawPlates(
  ctx: CanvasRenderingContext2D,
  state: AlternatingElectricDeflectionState,
  p: Palette
): void {
  const plateWidth = C.plateRight - C.plateLeft;
  ctx.fillStyle = '#8fa2b8';
  ctx.fillRect(C.plateLeft, C.plateTop, plateWidth, 16);
  ctx.fillRect(C.plateLeft, C.plateBottom, plateWidth, 16);
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 1;
  ctx.strokeRect(C.plateLeft, C.plateTop, plateWidth, 16);
  ctx.strokeRect(C.plateLeft, C.plateBottom, plateWidth, 16);
  for (let x = C.plateLeft + 28; x < C.plateRight - 12; x += 74) {
    label(
      ctx,
      state.fieldSign > 0 ? '+' : '−',
      x,
      C.plateTop + 8,
      p.red,
      16,
      'center',
      700
    );
    label(
      ctx,
      state.fieldSign > 0 ? '−' : '+',
      x,
      C.plateBottom + 8,
      p.blue,
      16,
      'center',
      700
    );
  }
  label(
    ctx,
    '上极板',
    C.plateLeft - 20,
    C.plateTop + 8,
    p.ink,
    15,
    'right',
    700
  );
  label(
    ctx,
    '下极板',
    C.plateLeft - 20,
    C.plateBottom + 8,
    p.ink,
    15,
    'right',
    700
  );
  label(
    ctx,
    `偏转电压：${state.fieldSign > 0 ? '+U₀' : '−U₀'}（${state.fieldSign > 0 ? '上正下负' : '上负下正'}）`,
    (C.plateLeft + C.plateRight) / 2,
    C.plateTop - 24,
    state.fieldSign > 0 ? p.red : p.blue,
    15,
    'center',
    700
  );
  const arrowX = C.plateLeft + plateWidth * 0.28;
  const direction = state.fieldSign > 0 ? 1 : -1;
  for (let x = arrowX; x < C.plateRight - 16; x += 108) {
    arrow(ctx, x, C.axisY - 55, x, C.axisY + 42 * direction, p.blue, 2);
  }
  ctx.strokeStyle = p.muted;
  ctx.setLineDash([7, 7]);
  ctx.beginPath();
  ctx.moveTo(C.axisStartX, C.axisY);
  ctx.lineTo(C.fieldWidth - 18, C.axisY);
  ctx.stroke();
  ctx.setLineDash([]);
  label(ctx, '入射线 y = 0', 80, C.axisY + 34, p.muted, 13, 'left', 600);
  label(
    ctx,
    'd',
    C.plateRight + 28,
    (C.plateTop + C.plateBottom) / 2,
    p.muted,
    14,
    'left',
    700
  );
}

function drawTrajectory(
  ctx: CanvasRenderingContext2D,
  state: AlternatingElectricDeflectionState,
  p: Palette
): void {
  const span = C.plateRight - C.plateLeft;
  const verticalScale = 120 / Math.max(0.8, state.positionScale);
  const toPoint = (point: { x: number; y: number }) => ({
    x: C.plateLeft + point.x * span,
    y: C.axisY + point.y * verticalScale
  });
  if (state.params.showGhosts) {
    ctx.strokeStyle = `${p.blue}55`;
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 6]);
    ctx.beginPath();
    state.trajectory.forEach((point, index) => {
      const next = toPoint(point);
      if (index === 0) ctx.moveTo(next.x, next.y);
      else ctx.lineTo(next.x, next.y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }
  const currentCount = Math.max(
    1,
    Math.min(
      state.trajectory.length,
      Math.round(state.flightFraction * (state.trajectory.length - 1)) + 1
    )
  );
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 4;
  ctx.beginPath();
  state.trajectory.slice(0, currentCount).forEach((point, index) => {
    const next = toPoint(point);
    if (index === 0) ctx.moveTo(next.x, next.y);
    else ctx.lineTo(next.x, next.y);
  });
  ctx.stroke();
  const sample = toPoint(state.trajectory[currentCount - 1]);
  ctx.fillStyle = `${p.red}33`;
  ctx.beginPath();
  ctx.arc(sample.x, sample.y, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.red;
  ctx.beginPath();
  ctx.arc(sample.x, sample.y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.panel;
  ctx.lineWidth = 2;
  ctx.stroke();
  label(
    ctx,
    state.params.charge === 'positive' ? '+q' : '−q',
    sample.x,
    sample.y,
    p.panel,
    11,
    'center',
    700
  );
  if (state.params.showVectors) {
    const velocityDirection = state.velocityY >= 0 ? 1 : -1;
    arrow(
      ctx,
      sample.x,
      sample.y - 24,
      sample.x + 56,
      sample.y - 24,
      p.teal,
      3
    );
    arrow(
      ctx,
      sample.x,
      sample.y,
      sample.x,
      sample.y + velocityDirection * 36,
      p.teal,
      3
    );
    arrow(
      ctx,
      sample.x + 18,
      sample.y + 22,
      sample.x + 18,
      sample.y + (state.acceleration >= 0 ? 62 : -18),
      p.orange,
      3
    );
    label(ctx, 'v', sample.x + 66, sample.y - 24, p.teal, 13, 'left', 700);
    label(
      ctx,
      'F',
      sample.x + 30,
      sample.y + (state.acceleration >= 0 ? 66 : -22),
      p.orange,
      13,
      'left',
      700
    );
  }
  label(
    ctx,
    `x = ${(state.positionX * 100).toFixed(0)}% L`,
    sample.x,
    sample.y + 42,
    p.ink,
    12,
    'center',
    700
  );
}

function drawVoltageGraph(
  ctx: CanvasRenderingContext2D,
  state: AlternatingElectricDeflectionState,
  p: Palette,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  card(ctx, x, y, width, height, p.panel, p.border, 10);
  label(
    ctx,
    '极板交变电压 U-t（方波）',
    x + 14,
    y + 18,
    p.ink,
    14,
    'left',
    700
  );
  const left = x + 42;
  const right = x + width - 16;
  const top = y + 42;
  const bottom = y + height - 20;
  const mid = (top + bottom) / 2;
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, mid);
  ctx.lineTo(right, mid);
  ctx.stroke();
  const duration = state.params.flightDuration;
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 3;
  ctx.beginPath();
  const steps = 80;
  for (let index = 0; index <= steps; index += 1) {
    const t = (duration * index) / steps;
    const phaseTime = state.params.releasePhase * state.params.period + t;
    const phase = (((phaseTime / state.params.period) % 1) + 1) % 1;
    const sign = phase < 0.5 ? 1 : -1;
    const px = left + (t / duration) * (right - left);
    const py = mid - sign * (height * 0.24);
    if (index === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  const cursor = left + (state.time / duration) * (right - left);
  ctx.strokeStyle = `${p.gold}dd`;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(cursor, top);
  ctx.lineTo(cursor, bottom);
  ctx.stroke();
  ctx.setLineDash([]);
  label(ctx, '+U₀', left - 8, mid - height * 0.24, p.red, 11, 'right', 700);
  label(ctx, '−U₀', left - 8, mid + height * 0.24, p.blue, 11, 'right', 700);
  label(ctx, 't / T', right, bottom + 2, p.muted, 11, 'right', 600);
}

function drawVelocityGraph(
  ctx: CanvasRenderingContext2D,
  state: AlternatingElectricDeflectionState,
  p: Palette,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  card(ctx, x, y, width, height, p.panel, p.border, 10);
  label(
    ctx,
    '竖直分速度 vᵧ-t（面积 = 位移）',
    x + 14,
    y + 18,
    p.ink,
    14,
    'left',
    700
  );
  const left = x + 42;
  const right = x + width - 16;
  const top = y + 42;
  const bottom = y + height - 20;
  const mid = (top + bottom) / 2;
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, mid);
  ctx.lineTo(right, mid);
  ctx.stroke();
  const maxVelocity = Math.max(1, state.velocityScale);
  ctx.strokeStyle = p.teal;
  ctx.lineWidth = 3;
  ctx.beginPath();
  state.trajectory.forEach((point, index) => {
    const px = left + point.x * (right - left);
    const py = mid - (point.velocityY / maxVelocity) * (height * 0.36);
    if (index === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();
  const cursor = left + state.positionX * (right - left);
  ctx.strokeStyle = `${p.gold}dd`;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(cursor, top);
  ctx.lineTo(cursor, bottom);
  ctx.stroke();
  ctx.setLineDash([]);
  label(ctx, '+vₘ', left - 8, top + 10, p.teal, 11, 'right', 700);
  label(ctx, '0', left - 8, mid, p.muted, 11, 'right', 600);
  label(ctx, 't / T', right, bottom + 2, p.muted, 11, 'right', 600);
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: AlternatingElectricDeflectionState,
  p: Palette,
  scale: number
): void {
  const x = C.panelX;
  const width = C.panelWidth;
  ctx.fillStyle = p.panel;
  ctx.fillRect(x, 0, width, C.baseHeight);
  label(ctx, '参数调节与时序控制', x + 26, 42, p.ink, 20 * scale, 'left', 700);
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 26, C.panelRuleY);
  ctx.lineTo(x + width - 26, C.panelRuleY);
  ctx.stroke();
  card(ctx, x + 22, 96, width - 44, 188, p.panel, p.border);
  label(ctx, '释放时刻 t₀ / T', x + 38, 122, p.ink, 15 * scale, 'left', 700);
  label(
    ctx,
    `${state.params.releasePhase.toFixed(2)} T`,
    x + width - 38,
    122,
    p.teal,
    16 * scale,
    'right',
    700
  );
  const barLeft = x + 40;
  const barRight = x + width - 40;
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(barLeft, C.timelineY);
  ctx.lineTo(barRight, C.timelineY);
  ctx.stroke();
  ctx.strokeStyle = p.teal;
  ctx.beginPath();
  ctx.moveTo(barLeft, C.timelineY);
  ctx.lineTo(
    barLeft + state.params.releasePhase * (barRight - barLeft),
    C.timelineY
  );
  ctx.stroke();
  ctx.lineCap = 'butt';
  ['0', 'T/4', 'T/2', '3T/4', 'T'].forEach((value, index) => {
    label(
      ctx,
      value,
      barLeft + (index / 4) * (barRight - barLeft),
      183,
      p.muted,
      11,
      'center',
      600
    );
  });
  label(ctx, '电荷电性：', x + 38, 220, p.muted, 13 * scale, 'left', 600);
  label(
    ctx,
    state.params.charge === 'positive' ? '正电荷 +q' : '负电荷 −q',
    x + 150,
    220,
    p.teal,
    14 * scale,
    'left',
    700
  );
  label(
    ctx,
    '0 / T/4 / T/2 / 3T/4  可用顶部快捷键切换',
    x + 38,
    255,
    p.muted,
    11 * scale,
    'left',
    600
  );

  card(ctx, x + 22, 300, width - 44, 204, p.panel, p.border);
  label(ctx, '实时运动学量', x + 38, 326, p.ink, 16 * scale, 'left', 700);
  const rows: Array<[string, string, string]> = [
    ['飞行时间 τ', `${state.time.toFixed(2)} T`, p.ink],
    [
      '即时电压 U',
      `${state.voltage >= 0 ? '+' : '−'}U₀`,
      state.voltage >= 0 ? p.red : p.blue
    ],
    [
      '竖直速度 vᵧ',
      `${(state.velocityY / Math.max(1e-9, state.velocityScale)).toFixed(2)} vₘ`,
      p.teal
    ],
    [
      '竖直位移 y',
      `${(state.positionY / Math.max(1e-9, state.positionScale)).toFixed(3)} a₀T²`,
      p.ink
    ],
    ['水平位移 x', `${(state.positionX * 100).toFixed(0)}% L`, p.ink]
  ];
  rows.forEach(([name, value, color], index) => {
    const rowY = 358 + index * 27;
    label(ctx, name, x + 38, rowY, p.muted, 13 * scale, 'left', 600);
    label(ctx, value, x + width - 38, rowY, color, 14 * scale, 'right', 700);
  });

  card(ctx, x + 22, 520, width - 44, 274, p.panel, p.border);
  label(
    ctx,
    '分段研究 · 从受力到轨迹',
    x + 38,
    546,
    p.ink,
    16 * scale,
    'left',
    700
  );
  label(
    ctx,
    'a₀ = |q|U₀/(md)    vₘ = a₀T/2',
    x + 38,
    580,
    p.ink,
    13 * scale,
    'left',
    600
  );
  label(
    ctx,
    '水平匀速，竖直方向按 T/2 换向',
    x + 38,
    605,
    p.muted,
    12 * scale,
    'left',
    600
  );
  card(ctx, x + 38, 628, width - 76, 70, `${p.green}12`, `${p.green}55`, 9);
  label(ctx, state.status, x + 52, 648, p.green, 15 * scale, 'left', 700);
  label(
    ctx,
    state.status === '往复振动'
      ? '半周期加速、半周期减速'
      : '力的方向决定加速度方向',
    x + 52,
    676,
    p.muted,
    12 * scale,
    'left',
    600
  );
  label(
    ctx,
    '误判：力的方向决定加速度，不决定速度。',
    x + 38,
    728,
    p.orange,
    12 * scale,
    'left',
    600
  );
  label(
    ctx,
    '拖动时间轴或切换释放时刻，观察 U-t 与 vᵧ-t 同步。',
    x + 38,
    758,
    p.muted,
    11 * scale,
    'left',
    600
  );
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  state: AlternatingElectricDeflectionState,
  p: Palette,
  scale: number
): void {
  drawGrid(ctx, p);
  label(
    ctx,
    '带电粒子在交变电场中的偏转',
    28,
    34,
    p.ink,
    22 * scale,
    'left',
    700
  );
  label(
    ctx,
    '周期性分段法 · 偏转与振动规律',
    30,
    62,
    p.muted,
    13 * scale,
    'left',
    600
  );
  drawPlates(ctx, state, p);
  drawTrajectory(ctx, state, p);
  drawVoltageGraph(
    ctx,
    state,
    p,
    C.graphLeft,
    C.graphTop,
    C.graphWidth,
    C.graphHeight
  );
  drawVelocityGraph(
    ctx,
    state,
    p,
    GRAPH_RIGHT,
    C.graphTop,
    C.graphWidth,
    C.graphHeight
  );
  drawPanel(ctx, state, p, scale);
}

export function createAlternatingElectricDeflectionView(
  options: CreateAlternatingElectricDeflectionViewOptions = {}
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
  let snapshot: AlternatingElectricDeflectionState | null = null;
  function renderState(state: AlternatingElectricDeflectionState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    stage.ensureSized();
    const fit = Math.min(
      stage.cssWidth / C.baseWidth,
      stage.cssHeight / C.baseHeight
    );
    const offsetY = (stage.cssHeight - C.baseHeight * fit) / 2;
    const scale = env.contentScale() * stage.responsiveScale;
    ctx.clearRect(0, 0, stage.cssWidth, stage.cssHeight);
    ctx.save();
    ctx.translate(0, offsetY);
    ctx.scale(fit, fit);
    drawScene(ctx, state, PALETTE[env.theme], scale);
    ctx.restore();
  }
  return {
    render(state: AlternatingElectricDeflectionState): void {
      snapshot = state;
      renderState(state);
    },
    resize(): void {
      stage.resize();
      if (snapshot) renderState(snapshot);
    },
    setTheme(theme: TeachingTheme): void {
      env.setTheme(theme);
      if (snapshot) renderState(snapshot);
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints): void {
      env.setMode(mode, hints);
      if (snapshot) renderState(snapshot);
    },
    dispose(): void {
      snapshot = null;
      stage.release();
    }
  };
}
