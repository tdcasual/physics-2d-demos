import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  velocitySelectorConstants as C,
  type VelocitySelectorState
} from './scene.sim';

export type CreateVelocitySelectorViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

const GRID_STEP = 54;
const GRID_ALPHA = '32';

type Palette = {
  bg: string;
  panel: string;
  ink: string;
  muted: string;
  border: string;
  grid: string;
  red: string;
  blue: string;
  teal: string;
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
    red: '#f04f5f',
    blue: '#3b82b5',
    teal: '#1fa88f',
    gold: '#e5a022',
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
    red: '#fb7185',
    blue: '#70b4ed',
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

function drawMagneticField(ctx: CanvasRenderingContext2D, p: Palette): void {
  const left = C.channelLeft + 28;
  const right = C.channelRight - 22;
  for (let x = left; x <= right; x += 58) {
    for (let y = C.fieldTop + 36; y <= C.fieldBottom - 26; y += 54) {
      ctx.strokeStyle = `${p.blue}99`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = p.blue;
      ctx.beginPath();
      ctx.arc(x, y, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  label(
    ctx,
    'B ⊙（垂直纸面向外）',
    C.channelRight - 10,
    C.fieldTop + 20,
    p.blue,
    13,
    'right',
    700
  );
}

function drawPlates(
  ctx: CanvasRenderingContext2D,
  state: VelocitySelectorState,
  p: Palette
): void {
  const width = C.channelRight - C.channelLeft;
  ctx.fillStyle = `${p.blue}dd`;
  ctx.fillRect(C.channelLeft, C.topPlateY, width, 18);
  ctx.fillStyle = `${p.red}dd`;
  ctx.fillRect(C.channelLeft, C.bottomPlateY, width, 18);
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 1;
  ctx.strokeRect(C.channelLeft, C.topPlateY, width, 18);
  ctx.strokeRect(C.channelLeft, C.bottomPlateY, width, 18);
  for (let x = C.channelLeft + 32; x < C.channelRight - 20; x += 62) {
    label(ctx, '−', x, C.topPlateY + 9, p.panel, 16, 'center', 700);
    label(ctx, '+', x, C.bottomPlateY + 9, p.panel, 16, 'center', 700);
  }
  label(
    ctx,
    '上极板（−）',
    C.channelLeft - 18,
    C.topPlateY + 9,
    p.ink,
    14,
    'right',
    700
  );
  label(
    ctx,
    '下极板（+）',
    C.channelLeft - 18,
    C.bottomPlateY + 9,
    p.ink,
    14,
    'right',
    700
  );
  if (state.params.showField) {
    for (let x = C.channelLeft + 64; x < C.channelRight - 32; x += 112) {
      arrow(ctx, x, C.bottomPlateY - 24, x, C.topPlateY + 42, p.red, 2);
    }
  }
  label(ctx, 'E ↑', C.channelLeft + 18, C.axisY - 62, p.red, 14, 'left', 700);
}

function drawTrajectory(
  ctx: CanvasRenderingContext2D,
  state: VelocitySelectorState,
  p: Palette
): void {
  const span = C.channelRight - C.channelLeft;
  const toPoint = (point: { x: number; y: number }) => ({
    x: C.channelLeft + point.x * span,
    y: C.axisY - point.y * C.deflectionScale
  });
  ctx.strokeStyle = `${p.muted}cc`;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 7]);
  ctx.beginPath();
  ctx.moveTo(C.channelLeft, C.axisY);
  ctx.lineTo(C.channelRight, C.axisY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = p.teal;
  ctx.lineWidth = 4;
  ctx.beginPath();
  state.trajectory.forEach((point, index) => {
    const next = toPoint(point);
    if (index === 0) ctx.moveTo(next.x, next.y);
    else ctx.lineTo(next.x, next.y);
  });
  ctx.stroke();
  const particle = state.particlePosition;
  ctx.fillStyle = `${p.teal}3f`;
  ctx.beginPath();
  ctx.arc(particle.x, particle.y, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.teal;
  ctx.beginPath();
  ctx.arc(particle.x, particle.y, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.panel;
  ctx.lineWidth = 2;
  ctx.stroke();
  label(
    ctx,
    state.params.charge === 'positive' ? '+q' : '−q',
    particle.x,
    particle.y,
    p.panel,
    11,
    'center',
    700
  );
  if (state.params.showVectors) {
    const electricLength = 34 + Math.abs(state.electricForce) * 18;
    const magneticLength = 34 + Math.abs(state.magneticForce) * 18;
    const signE = state.electricForce >= 0 ? -1 : 1;
    const signB = state.magneticForce >= 0 ? -1 : 1;
    arrow(
      ctx,
      particle.x,
      particle.y,
      particle.x,
      particle.y + signE * electricLength,
      p.red,
      3
    );
    arrow(
      ctx,
      particle.x + 18,
      particle.y,
      particle.x + 18,
      particle.y + signB * magneticLength,
      p.blue,
      3
    );
    label(
      ctx,
      'Fₑ',
      particle.x - 12,
      particle.y + signE * (electricLength + 14),
      p.red,
      12,
      'right',
      700
    );
    label(
      ctx,
      'Fᴮ',
      particle.x + 30,
      particle.y + signB * (magneticLength + 14),
      p.blue,
      12,
      'left',
      700
    );
  }
  arrow(
    ctx,
    particle.x - 58,
    particle.y - 28,
    particle.x + 4,
    particle.y - 28,
    p.gold,
    3
  );
  label(ctx, 'v₀', particle.x - 68, particle.y - 28, p.gold, 13, 'right', 700);
  label(
    ctx,
    `x = ${(state.progress * 100).toFixed(0)}% L`,
    particle.x,
    particle.y + 40,
    p.ink,
    12,
    'center',
    700
  );
}

function drawReadoutPanel(
  ctx: CanvasRenderingContext2D,
  state: VelocitySelectorState,
  p: Palette,
  scale: number
): void {
  const x = C.panelX;
  const width = C.panelWidth;
  ctx.fillStyle = p.panel;
  ctx.fillRect(x, 0, width, C.baseHeight);
  label(ctx, '速度选择器', x + 26, 40, p.ink, 22 * scale, 'left', 700);
  label(
    ctx,
    '正交电磁场 · 受力平衡',
    x + 28,
    67,
    p.muted,
    13 * scale,
    'left',
    600
  );
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 26, C.panelRuleY);
  ctx.lineTo(x + width - 26, C.panelRuleY);
  ctx.stroke();
  card(ctx, x + 22, 108, width - 44, 96, p.panel, p.border);
  label(ctx, '电场强度 E（向上）', x + 40, 135, p.ink, 15 * scale, 'left', 700);
  label(
    ctx,
    `${state.params.electricField.toFixed(1)} E₀`,
    x + width - 40,
    135,
    p.red,
    16 * scale,
    'right',
    700
  );
  card(ctx, x + 22, 216, width - 44, 96, p.panel, p.border);
  label(
    ctx,
    '磁感应强度 B（向外）',
    x + 40,
    243,
    p.ink,
    15 * scale,
    'left',
    700
  );
  label(
    ctx,
    `${state.params.magneticField.toFixed(1)} B₀`,
    x + width - 40,
    243,
    p.blue,
    16 * scale,
    'right',
    700
  );
  card(ctx, x + 22, 324, width - 44, 96, `${p.teal}0c`, p.teal, 10);
  label(ctx, '入射速度 v₀', x + 40, 351, p.ink, 15 * scale, 'left', 700);
  label(
    ctx,
    `${state.params.initialSpeed.toFixed(2)} v₀*`,
    x + width - 40,
    351,
    p.teal,
    16 * scale,
    'right',
    700
  );
  label(
    ctx,
    `匹配速度 E/B = ${state.balanceSpeed.toFixed(2)} v₀*`,
    x + 40,
    391,
    p.muted,
    12 * scale,
    'left',
    600
  );

  card(ctx, x + 22, 438, width - 44, 208, p.panel, p.border);
  label(ctx, '实时动力学数据', x + 40, 466, p.ink, 16 * scale, 'left', 700);
  const rows: Array<[string, string, string]> = [
    ['电场力 Fₑ', `${state.electricForce.toFixed(2)} F₀`, p.red],
    ['洛伦兹力 Fᴮ', `${state.magneticForce.toFixed(2)} F₀`, p.blue],
    [
      '合外力 ΣFᵧ',
      `${state.netForce.toFixed(2)} F₀`,
      state.status === '速度匹配' ? p.green : p.orange
    ],
    ['竖直偏移 y', `${state.deflection.toFixed(3)} d`, p.ink]
  ];
  rows.forEach(([name, value, color], index) => {
    const rowY = 500 + index * 32;
    label(ctx, name, x + 40, rowY, p.muted, 13 * scale, 'left', 600);
    label(ctx, value, x + width - 40, rowY, color, 14 * scale, 'right', 700);
  });
  card(ctx, x + 38, 562, width - 76, 54, `${p.green}13`, `${p.green}66`, 9);
  label(
    ctx,
    state.status,
    x + width / 2,
    589,
    state.status === '速度匹配' ? p.green : p.orange,
    16 * scale,
    'center',
    700
  );

  card(ctx, x + 22, 666, width - 44, 128, p.panel, p.border);
  label(ctx, '判据', x + 40, 692, p.ink, 15 * scale, 'left', 700);
  label(
    ctx,
    'v = E / B  →  Fₑ + Fᴮ = 0',
    x + 40,
    722,
    p.ink,
    14 * scale,
    'left',
    600
  );
  label(
    ctx,
    '调节 v₀，观察“超速下偏 / 龟速上偏”',
    x + 40,
    752,
    p.muted,
    12 * scale,
    'left',
    600
  );
  label(
    ctx,
    '重播 / 重置可重新发射粒子',
    x + 40,
    778,
    p.muted,
    11 * scale,
    'left',
    600
  );
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  state: VelocitySelectorState,
  p: Palette,
  scale: number
): void {
  drawGrid(ctx, p);
  label(
    ctx,
    '速度选择器（正交电磁场）',
    28,
    34,
    p.ink,
    22 * scale,
    'left',
    700
  );
  label(
    ctx,
    '只有 v = E/B 的粒子沿中心线直穿',
    30,
    62,
    p.muted,
    13 * scale,
    'left',
    600
  );
  drawMagneticField(ctx, p);
  drawPlates(ctx, state, p);
  drawTrajectory(ctx, state, p);
  drawReadoutPanel(ctx, state, p, scale);
}

export function createVelocitySelectorView(
  options: CreateVelocitySelectorViewOptions = {}
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
  let snapshot: VelocitySelectorState | null = null;
  function renderState(state: VelocitySelectorState): void {
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
    render(state: VelocitySelectorState): void {
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
