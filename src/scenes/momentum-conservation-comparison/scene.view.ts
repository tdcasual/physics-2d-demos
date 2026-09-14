import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  momentumComparisonConstants as C,
  type MomentumComparisonState
} from './scene.sim';

export type CreateMomentumComparisonViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

type Palette = {
  bg: string;
  panel: string;
  ink: string;
  muted: string;
  border: string;
  grid: string;
  blue: string;
  red: string;
  teal: string;
  gold: string;
  orange: string;
  green: string;
};

const V = {
  chuteStartOffsetX: 76,
  chuteStartY: 144,
  chuteControlOffsetX: 64,
  chuteControlY: 148,
  chuteCornerOffsetX: 84,
  chuteCornerY: 270,
  chuteDropY: 386,
  chuteRunLength: 400,
  chuteOriginX: 294,
  chuteOriginY: 266,
  chuteFall: 116,
  airGateStart: 260,
  airGateEnd: 720,
  pendulumGroundStart: 180,
  pendulumGroundEnd: 650,
  pendulumLength: 170,
  cartWidth: 68,
  gateTopOffset: 70,
  impulseArrowY: 76,
  panelRuleY: 88
} as const;

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#f7fafc',
    panel: '#ffffff',
    ink: '#344256',
    muted: '#8291a7',
    border: '#d6e0ec',
    grid: '#cfdae6',
    blue: '#2f7ed8',
    red: '#ef4d5e',
    teal: '#1fa88f',
    gold: '#e4a020',
    orange: '#ef9419',
    green: '#2f9f68'
  },
  dark: {
    bg: '#101a2a',
    panel: '#172538',
    ink: '#f1f5fb',
    muted: '#aab8ca',
    border: '#3d526d',
    grid: '#2a405b',
    blue: '#70adff',
    red: '#fb7185',
    teal: '#39d7b3',
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
  ctx.setLineDash(dashed ? [7, 5] : []);
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
  ctx.strokeStyle = `${p.grid}32`;
  ctx.lineWidth = 1;
  for (let x = 0; x <= C.fieldWidth; x += 54) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, C.baseHeight);
    ctx.stroke();
  }
  for (let y = 0; y <= C.baseHeight; y += 54) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(C.fieldWidth, y);
    ctx.stroke();
  }
}

function drawChute(
  ctx: CanvasRenderingContext2D,
  state: MomentumComparisonState,
  p: Palette
): void {
  ctx.strokeStyle = '#8297a9';
  ctx.lineWidth = 18;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(C.chutePivotX - V.chuteStartOffsetX, V.chuteStartY);
  ctx.quadraticCurveTo(
    C.chutePivotX + V.chuteControlOffsetX,
    V.chuteControlY,
    C.chutePivotX + V.chuteCornerOffsetX,
    V.chuteCornerY
  );
  ctx.lineTo(C.chutePivotX + V.chuteCornerOffsetX, V.chuteDropY);
  ctx.lineTo(C.chutePivotX + V.chuteRunLength, V.chuteDropY);
  ctx.stroke();
  ctx.lineCap = 'butt';
  label(ctx, '斜槽平抛法（等时转换位移）', 28, 104, p.ink, 18, 'left', 700);
  label(ctx, 'v ∝ 水平位移', 30, 128, p.muted, 13, 'left', 600);
  const progress = state.time;
  const xA = V.chuteOriginX + progress * 220;
  const xB = V.chuteOriginX + progress * 330;
  const yA = V.chuteOriginY + Math.min(V.chuteFall, progress * V.chuteFall);
  const yB = V.chuteOriginY + Math.min(V.chuteFall, progress * V.chuteFall);
  arrow(ctx, V.chuteOriginX, V.chuteOriginY, xA, yA, `${p.blue}77`, 2, true);
  arrow(ctx, V.chuteOriginX, V.chuteOriginY, xB, yB, `${p.red}77`, 2, true);
  ctx.fillStyle = p.blue;
  ctx.beginPath();
  ctx.arc(xA, yA, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.red;
  ctx.beginPath();
  ctx.arc(xB, yB, 13, 0, Math.PI * 2);
  ctx.fill();
  label(ctx, 'm₁', xA, yA, p.panel, 11, 'center', 700);
  label(ctx, 'm₂', xB, yB, p.panel, 11, 'center', 700);
  label(ctx, 'O（投影基准点）', 292, 414, p.red, 13, 'center', 700);
  arrow(ctx, 470, V.chuteDropY, 730, V.chuteDropY, p.teal, 2);
  label(ctx, '水平距离标定', 600, 410, p.teal, 12, 'center', 600);
}

function drawAirTrack(
  ctx: CanvasRenderingContext2D,
  state: MomentumComparisonState,
  p: Palette
): void {
  label(ctx, '气垫导轨法（光电门测速度）', 28, 104, p.ink, 18, 'left', 700);
  label(ctx, 'v = d / Δt，方向取正', 30, 128, p.muted, 13, 'left', 600);
  ctx.strokeStyle = '#71869a';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(C.trackLeft, C.trackY);
  ctx.lineTo(C.trackRight, C.trackY);
  ctx.stroke();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(C.trackLeft, C.trackY - 26);
  ctx.lineTo(C.trackRight, C.trackY - 26);
  ctx.stroke();
  const phase = state.collisionProgress;
  const xA =
    C.trackLeft +
    210 +
    (state.status === '碰撞前' ? state.time * 120 : phase * 50);
  const xB =
    C.trackLeft +
    450 -
    (state.status === '碰撞前' ? state.time * 60 : phase * 42);
  const cart = (x: number, color: string, name: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x - 34, C.trackY - 44, V.cartWidth, 36);
    ctx.fillStyle = p.ink;
    ctx.beginPath();
    ctx.arc(x - 22, C.trackY - 4, 7, 0, Math.PI * 2);
    ctx.arc(x + 22, C.trackY - 4, 7, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, name, x, C.trackY - 26, p.panel, 12, 'center', 700);
  };
  cart(xA, p.blue, 'm₁');
  cart(xB, p.red, 'm₂');
  if (state.showVectors) {
    arrow(
      ctx,
      xA - 44,
      C.trackY - 60,
      xA - 44 + state.vA * 30,
      C.trackY - 60,
      p.blue,
      3
    );
    arrow(
      ctx,
      xB + 44,
      C.trackY - 60,
      xB + 44 + state.vB * 30,
      C.trackY - 60,
      p.red,
      3
    );
  }
  for (let x = V.airGateStart; x < V.airGateEnd; x += 130) {
    ctx.strokeStyle = p.gold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, C.trackY - V.gateTopOffset);
    ctx.lineTo(x, C.trackY + 26);
    ctx.stroke();
    label(ctx, '光电门', x, C.trackY + 45, p.gold, 11, 'center', 600);
  }
}

function drawPendulum(
  ctx: CanvasRenderingContext2D,
  state: MomentumComparisonState,
  p: Palette
): void {
  label(ctx, '双摆碰撞法（摆角换算速度）', 28, 104, p.ink, 18, 'left', 700);
  label(ctx, 'v ∝ √(1 − cos θ)', 30, 128, p.muted, 13, 'left', 600);
  const pivotY = 168;
  const p1x = 310;
  const p2x = 520;
  const angle = state.status === '碰撞前' ? 0.48 : 0.24;
  const swing = state.status === '碰撞中' ? 0.18 : angle;
  const bob = (x: number, theta: number, color: string, name: string) => {
    const length = V.pendulumLength;
    const bx = x + Math.sin(theta) * length;
    const by = pivotY + Math.cos(theta) * length;
    ctx.strokeStyle = p.muted;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, pivotY);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(bx, by, 18, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, name, bx, by, p.panel, 12, 'center', 700);
    ctx.fillStyle = p.ink;
    ctx.beginPath();
    ctx.arc(x, pivotY, 5, 0, Math.PI * 2);
    ctx.fill();
  };
  bob(p1x, -swing, p.blue, 'm₁');
  bob(p2x, swing, p.red, 'm₂');
  ctx.strokeStyle = `${p.gold}99`;
  ctx.setLineDash([7, 5]);
  ctx.beginPath();
  ctx.moveTo(V.pendulumGroundStart, pivotY + V.pendulumLength);
  ctx.lineTo(V.pendulumGroundEnd, pivotY + V.pendulumLength);
  ctx.stroke();
  ctx.setLineDash([]);
  label(
    ctx,
    '碰撞瞬间内力成对，外力冲量可忽略',
    420,
    400,
    p.gold,
    13,
    'center',
    600
  );
}

function drawImpulseCard(
  ctx: CanvasRenderingContext2D,
  state: MomentumComparisonState,
  p: Palette
): void {
  card(
    ctx,
    28,
    C.graphTop,
    C.fieldWidth - 56,
    C.graphHeight,
    p.panel,
    p.border
  );
  label(
    ctx,
    '碰撞短时受力 / 冲量图（系统：m₁ + m₂）',
    46,
    C.graphTop + 28,
    p.ink,
    15,
    'left',
    700
  );
  const center = C.fieldWidth * 0.46;
  arrow(
    ctx,
    center - 90,
    C.graphTop + V.impulseArrowY,
    center - 30,
    C.graphTop + V.impulseArrowY,
    p.red,
    3
  );
  arrow(
    ctx,
    center + 90,
    C.graphTop + V.impulseArrowY,
    center + 30,
    C.graphTop + V.impulseArrowY,
    p.blue,
    3
  );
  ctx.fillStyle = p.blue;
  ctx.beginPath();
  ctx.arc(center - 12, C.graphTop + V.impulseArrowY, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.red;
  ctx.beginPath();
  ctx.arc(center + 12, C.graphTop + V.impulseArrowY, 15, 0, Math.PI * 2);
  ctx.fill();
  label(ctx, 'F₂₁', center - 104, C.graphTop + 62, p.red, 12, 'center', 700);
  label(ctx, 'F₁₂', center + 104, C.graphTop + 62, p.blue, 12, 'center', 700);
  label(
    ctx,
    'F₁₂ = −F₂₁（内力成对）',
    center + 210,
    C.graphTop + 52,
    p.ink,
    14,
    'left',
    600
  );
  label(
    ctx,
    `Σp 前 = ${state.totalMomentumBefore.toFixed(2)}    Σp 后 = ${state.totalMomentumAfter.toFixed(2)}`,
    center + 210,
    C.graphTop + 84,
    p.green,
    13,
    'left',
    700
  );
  label(
    ctx,
    '短时碰撞：外力冲量 ≈ 0 → Δp系统 ≈ 0',
    center + 210,
    C.graphTop + 116,
    p.muted,
    12,
    'left',
    600
  );
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: MomentumComparisonState,
  p: Palette,
  scale: number
): void {
  const x = C.panelX;
  const width = C.panelWidth;
  ctx.fillStyle = p.panel;
  ctx.fillRect(x, 0, width, C.baseHeight);
  label(ctx, '方案对比与数据', x + 24, 38, p.ink, 21 * scale, 'left', 700);
  label(
    ctx,
    state.scheme === 'chute'
      ? '斜槽平抛法'
      : state.scheme === 'airTrack'
        ? '气垫导轨法'
        : '双摆碰撞法',
    x + 26,
    66,
    p.teal,
    14 * scale,
    'left',
    700
  );
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 24, V.panelRuleY);
  ctx.lineTo(x + width - 24, V.panelRuleY);
  ctx.stroke();
  card(ctx, x + 20, 108, width - 40, 144, p.panel, p.border);
  label(ctx, '实验参数', x + 36, 134, p.ink, 15 * scale, 'left', 700);
  label(
    ctx,
    `m₁ = ${state.massA.toFixed(1)} kg`,
    x + 36,
    166,
    p.muted,
    13 * scale,
    'left',
    600
  );
  label(
    ctx,
    `m₂ = ${state.massB.toFixed(1)} kg`,
    x + 210,
    166,
    p.muted,
    13 * scale,
    'left',
    600
  );
  label(
    ctx,
    `v₁ = ${state.velocityA.toFixed(2)} m/s`,
    x + 36,
    196,
    p.blue,
    13 * scale,
    'left',
    700
  );
  label(
    ctx,
    `v₂ = ${state.velocityB.toFixed(2)} m/s`,
    x + 210,
    196,
    p.red,
    13 * scale,
    'left',
    700
  );
  label(
    ctx,
    `恢复系数 e = ${state.collision === 'elastic' ? '1.0' : state.collision === 'partial' ? '0.6' : '0.0'}`,
    x + 36,
    226,
    p.gold,
    13 * scale,
    'left',
    700
  );

  card(ctx, x + 20, 268, width - 40, 220, p.panel, p.border);
  label(ctx, '观测读数与状态转换', x + 36, 294, p.ink, 15 * scale, 'left', 700);
  label(
    ctx,
    state.measured.labelA,
    x + 36,
    326,
    p.muted,
    12 * scale,
    'left',
    600
  );
  label(
    ctx,
    state.measured.valueA.toFixed(2),
    x + 36,
    350,
    p.blue,
    18 * scale,
    'left',
    700
  );
  label(
    ctx,
    state.measured.labelB,
    x + 210,
    326,
    p.muted,
    12 * scale,
    'left',
    600
  );
  label(
    ctx,
    state.measured.valueB.toFixed(2),
    x + 210,
    350,
    p.red,
    18 * scale,
    'left',
    700
  );
  label(ctx, '碰前总动量', x + 36, 390, p.muted, 12 * scale, 'left', 600);
  label(
    ctx,
    `${state.totalMomentumBefore.toFixed(2)} kg·m/s`,
    x + width - 36,
    390,
    p.ink,
    13 * scale,
    'right',
    700
  );
  label(ctx, '碰后总动量', x + 36, 420, p.muted, 12 * scale, 'left', 600);
  label(
    ctx,
    `${state.totalMomentumAfter.toFixed(2)} kg·m/s`,
    x + width - 36,
    420,
    p.green,
    13 * scale,
    'right',
    700
  );
  card(ctx, x + 36, 442, width - 72, 32, `${p.green}12`, `${p.green}55`, 8);
  label(
    ctx,
    state.status,
    x + width / 2,
    458,
    p.green,
    14 * scale,
    'center',
    700
  );

  card(ctx, x + 20, 504, width - 40, 270, p.panel, p.border);
  label(ctx, '理论回扣', x + 36, 532, p.ink, 15 * scale, 'left', 700);
  label(
    ctx,
    'm₁v₁ + m₂v₂ = m₁v₁′ + m₂v₂′',
    x + 36,
    568,
    p.blue,
    14 * scale,
    'left',
    700
  );
  label(
    ctx,
    `Eₖ 前 = ${state.kineticEnergyBefore.toFixed(2)}`,
    x + 36,
    602,
    p.muted,
    13 * scale,
    'left',
    600
  );
  label(
    ctx,
    `Eₖ 后 = ${state.kineticEnergyAfter.toFixed(2)}`,
    x + 210,
    602,
    p.muted,
    13 * scale,
    'left',
    600
  );
  label(
    ctx,
    '三种方案都以“碰撞时间极短、外力冲量可忽略”为近似条件。',
    x + 36,
    646,
    p.muted,
    12 * scale,
    'left',
    600
  );
  label(
    ctx,
    '切换方案 → 控制变量 → 记录现象 → 回扣公式',
    x + 36,
    682,
    p.teal,
    12 * scale,
    'left',
    700
  );
  label(
    ctx,
    '弹性 e=1 · 非弹性 e=0.6 · 完全非弹性 e=0',
    x + 36,
    722,
    p.orange,
    12 * scale,
    'left',
    600
  );
  label(
    ctx,
    '重播 / 重置可重新开始一次碰撞',
    x + 36,
    754,
    p.muted,
    11 * scale,
    'left',
    600
  );
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  state: MomentumComparisonState,
  p: Palette,
  scale: number
): void {
  drawGrid(ctx, p);
  label(
    ctx,
    '验证动量守恒定律 · 多方案比较',
    28,
    34,
    p.ink,
    22 * scale,
    'left',
    700
  );
  label(
    ctx,
    '用不同实验图像测量同一条守恒关系',
    30,
    62,
    p.muted,
    13 * scale,
    'left',
    600
  );
  if (state.scheme === 'chute') drawChute(ctx, state, p);
  else if (state.scheme === 'airTrack') drawAirTrack(ctx, state, p);
  else drawPendulum(ctx, state, p);
  drawImpulseCard(ctx, state, p);
  drawPanel(ctx, state, p, scale);
}

export function createMomentumComparisonView(
  options: CreateMomentumComparisonViewOptions = {}
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
  let snapshot: MomentumComparisonState | null = null;
  function renderState(state: MomentumComparisonState): void {
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
    render(state: MomentumComparisonState): void {
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
