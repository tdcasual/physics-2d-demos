import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  ringPendulumConstants as C,
  type RingPendulumState
} from './scene.sim';

export type CreateRingPendulumViewOptions = {
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
  violet: string;
};
const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf6',
    panel: '#f7f4ec',
    ink: '#303747',
    muted: '#8c929b',
    border: '#d9d2c5',
    grid: '#e8e0d4',
    blue: '#2b89df',
    red: '#ec3d4c',
    teal: '#1aa38c',
    gold: '#eba914',
    violet: '#8b54dc'
  },
  dark: {
    bg: '#101929',
    panel: '#172538',
    ink: '#eef3fb',
    muted: '#aab8ca',
    border: '#3d526c',
    grid: '#2b4059',
    blue: '#77b0ff',
    red: '#ff7686',
    teal: '#42d9bd',
    gold: '#f7c24e',
    violet: '#b18bff'
  }
};
const V = {
  railY: 250,
  railLeft: 54,
  railRight: 790,
  ringBaseX: 420,
  ringW: 120,
  ringH: 52,
  ringRadius: 12,
  pivotY: 276,
  pivotOffsetY: 26,
  lengthScale: 148,
  trailRadius: 220,
  graphTop: 78,
  panelRuleY: 62,
  panelRight: 1258,
  cardX: 850,
  cardW: 392,
  statY: 122,
  paramCardY: 156,
  paramCardH: 250,
  checkX: 874,
  checkGap: 36,
  realtimeCardY: 430,
  realtimeCardH: 156,
  energyCardY: 610,
  energyCardH: 188,
  forceLength: 70,
  forceGap: 36,
  arrowWidth: 4,
  comLineTop: 88,
  comLineBottom: 700,
  energyBarStartX: 190,
  energyBarWidth: 165
} as const;
function text(
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
  if (typeof ctx.roundRect === 'function')
    ctx.roundRect(x, y, width, height, radius);
  else ctx.rect(x, y, width, height);
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
  color: string
): void {
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = V.arrowWidth;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 10 * Math.cos(a - 0.5), y2 - 10 * Math.sin(a - 0.5));
  ctx.lineTo(x2 - 10 * Math.cos(a + 0.5), y2 - 10 * Math.sin(a + 0.5));
  ctx.closePath();
  ctx.fill();
}
function drawGrid(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, C.fieldWidth, C.baseHeight);
  ctx.strokeStyle = `${p.grid}aa`;
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
function drawMechanism(
  ctx: CanvasRenderingContext2D,
  state: RingPendulumState,
  p: Palette
): void {
  const ringX = V.ringBaseX + state.ringPosition * 90;
  const pivotX = ringX;
  const ballX = pivotX + Math.sin(state.theta) * state.length * V.lengthScale;
  const ballY = V.pivotY + Math.cos(state.theta) * state.length * V.lengthScale;
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(V.railLeft, V.railY);
  ctx.lineTo(V.railRight, V.railY);
  ctx.stroke();
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 2;
  for (let x = V.railLeft + 70; x < V.railRight; x += 120) {
    ctx.beginPath();
    ctx.moveTo(x, V.railY - 14);
    ctx.lineTo(x, V.railY + 14);
    ctx.stroke();
  }
  if (state.showTrail) {
    ctx.strokeStyle = `${p.red}aa`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(
      pivotX,
      V.pivotY,
      state.length * V.lengthScale,
      0.18,
      Math.PI - 0.18
    );
    ctx.stroke();
  }
  card(
    ctx,
    ringX - V.ringW / 2,
    V.railY - V.ringH / 2,
    V.ringW,
    V.ringH,
    p.blue,
    '#1d5da4',
    V.ringRadius
  );
  ctx.fillStyle = p.panel;
  ctx.beginPath();
  ctx.arc(ringX, V.railY, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1d5da4';
  ctx.lineWidth = 3;
  ctx.stroke();
  text(
    ctx,
    `M = ${state.ringMass.toFixed(1)} kg`,
    ringX,
    V.railY - 54,
    p.blue,
    16,
    'center',
    800
  );
  ctx.strokeStyle = '#8d8580';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(pivotX, V.pivotY);
  ctx.lineTo(ballX, ballY);
  ctx.stroke();
  ctx.fillStyle = p.red;
  ctx.beginPath();
  ctx.arc(ballX, ballY, 25, 0, Math.PI * 2);
  ctx.fill();
  text(
    ctx,
    `m = ${state.ballMass.toFixed(1)} kg`,
    ballX,
    ballY + 42,
    p.red,
    15,
    'center',
    800
  );
  ctx.strokeStyle = `${p.gold}bb`;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(V.ringBaseX, V.comLineTop);
  ctx.lineTo(V.ringBaseX, V.comLineBottom);
  ctx.stroke();
  ctx.setLineDash([]);
  text(
    ctx,
    '质心水平恒线（X = 0）',
    V.ringBaseX + 12,
    100,
    p.gold,
    15,
    'left',
    700
  );
  if (state.showForces) {
    arrow(ctx, ballX, ballY, ballX, ballY + V.forceLength, p.teal);
    text(ctx, 'Fg', ballX + 20, ballY + V.forceGap, p.teal, 14, 'left', 800);
    arrow(
      ctx,
      ballX,
      ballY,
      ballX - (ballX - pivotX) * 0.45,
      ballY - (ballY - V.pivotY) * 0.45,
      p.violet
    );
    text(ctx, 'FT', ballX - 42, ballY - 28, p.violet, 14, 'right', 800);
  }
  text(
    ctx,
    `θ = ${((state.theta * 180) / Math.PI).toFixed(1)}°`,
    V.ringBaseX + 160,
    720,
    p.red,
    16,
    'left',
    700
  );
}
function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: RingPendulumState,
  p: Palette
): void {
  ctx.fillStyle = p.panel;
  ctx.fillRect(C.panelX, 0, C.panelWidth, C.baseHeight);
  text(ctx, '动量守恒·圆环摆球', C.panelX + 26, 36, p.ink, 22, 'left', 800);
  ctx.strokeStyle = p.border;
  ctx.beginPath();
  ctx.moveTo(C.panelX + 26, V.panelRuleY);
  ctx.lineTo(V.panelRight, V.panelRuleY);
  ctx.stroke();
  card(ctx, V.cardX, 82, V.cardW, 62, p.panel, p.border);
  text(
    ctx,
    `运行时间 t：${state.time.toFixed(2)} s`,
    V.cardX + 22,
    V.statY,
    p.ink,
    15,
    'left',
    700
  );
  card(ctx, V.cardX, V.paramCardY, V.cardW, V.paramCardH, p.panel, p.border);
  text(
    ctx,
    '物理参数调节',
    V.cardX + 22,
    V.paramCardY + 28,
    p.ink,
    17,
    'left',
    700
  );
  text(
    ctx,
    `圆环质量 M    ${state.ringMass.toFixed(1)} kg`,
    V.cardX + 22,
    V.paramCardY + 70,
    p.blue,
    14,
    'left',
    700
  );
  text(
    ctx,
    `摆球质量 m    ${state.ballMass.toFixed(1)} kg`,
    V.cardX + 22,
    V.paramCardY + 110,
    p.red,
    14,
    'left',
    700
  );
  text(
    ctx,
    `摆线长度 L    ${state.length.toFixed(1)} m`,
    V.cardX + 22,
    V.paramCardY + 150,
    p.gold,
    14,
    'left',
    700
  );
  text(
    ctx,
    `释放角度 θ    ${((state.angle * 180) / Math.PI).toFixed(1)}°`,
    V.cardX + 22,
    V.paramCardY + 190,
    p.violet,
    14,
    'left',
    700
  );
  text(
    ctx,
    state.showForces ? '✓ 显示受力分析' : '○ 隐藏受力分析',
    V.cardX + 22,
    V.paramCardY + 226,
    state.showForces ? p.teal : p.muted,
    14,
    'left',
    600
  );
  card(
    ctx,
    V.cardX,
    V.realtimeCardY,
    V.cardW,
    V.realtimeCardH,
    p.panel,
    p.border
  );
  text(
    ctx,
    '实时状态数据',
    V.cardX + 22,
    V.realtimeCardY + 28,
    p.ink,
    17,
    'left',
    700
  );
  text(
    ctx,
    `摆角 θ  ${((state.theta * 180) / Math.PI).toFixed(1)}°`,
    V.cardX + 22,
    V.realtimeCardY + 70,
    p.red,
    15,
    'left',
    700
  );
  text(
    ctx,
    `圆环速度 vM  ${state.ringVelocity.toFixed(2)} m/s`,
    V.cardX + 22,
    V.realtimeCardY + 104,
    p.blue,
    15,
    'left',
    700
  );
  text(
    ctx,
    `摆球速度 vm  ${state.ballVelocity.toFixed(2)} m/s`,
    V.cardX + 220,
    V.realtimeCardY + 70,
    p.blue,
    15,
    'left',
    700
  );
  text(
    ctx,
    `水平动量 Px  ${state.horizontalMomentum.toFixed(3)}`,
    V.cardX + 220,
    V.realtimeCardY + 104,
    p.teal,
    15,
    'left',
    700
  );
  card(ctx, V.cardX, V.energyCardY, V.cardW, V.energyCardH, p.panel, p.border);
  text(
    ctx,
    '能量转化与守恒',
    V.cardX + 22,
    V.energyCardY + 28,
    p.ink,
    17,
    'left',
    700
  );
  const max = Math.max(state.totalEnergy, 0.1);
  const bars = [
    { label: '圆环动能 EkM', value: state.ringKinetic, color: p.blue },
    { label: '摆球动能 Ekm', value: state.ballKinetic, color: p.red },
    { label: '重力势能 Ep', value: state.potential, color: p.gold }
  ];
  bars.forEach((bar, i) => {
    const y = V.energyCardY + 64 + i * 36;
    text(ctx, bar.label, V.cardX + 22, y, p.muted, 13, 'left', 600);
    ctx.fillStyle = `${p.border}aa`;
    ctx.fillRect(V.cardX + V.energyBarStartX, y - 8, V.energyBarWidth, 16);
    ctx.fillStyle = bar.color;
    ctx.fillRect(
      V.cardX + V.energyBarStartX,
      y - 8,
      (bar.value / max) * V.energyBarWidth,
      16
    );
    text(
      ctx,
      `${bar.value.toFixed(2)} J`,
      V.panelRight - 22,
      y,
      p.ink,
      13,
      'right',
      700
    );
  });
  text(
    ctx,
    `总机械能 E = ${state.totalEnergy.toFixed(2)} J`,
    V.cardX + 22,
    V.energyCardY + 170,
    p.ink,
    15,
    'left',
    800
  );
}
function drawScene(
  ctx: CanvasRenderingContext2D,
  state: RingPendulumState,
  p: Palette
): void {
  drawGrid(ctx, p);
  text(
    ctx,
    '动量守恒与圆环摆球模型',
    C.fieldWidth / 2,
    34,
    p.ink,
    25,
    'center',
    800
  );
  text(
    ctx,
    'Pₓ = 0  ·  Eₚ + Eₖ = 常量',
    C.fieldWidth / 2,
    68,
    p.muted,
    15,
    'center',
    600
  );
  drawMechanism(ctx, state, p);
  drawPanel(ctx, state, p);
  text(
    ctx,
    '空格键：暂停 / 继续',
    C.fieldWidth / 2,
    C.baseHeight - 24,
    p.muted,
    14,
    'center',
    600
  );
}
export function createRingPendulumView(
  options: CreateRingPendulumViewOptions = {}
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
  let snapshot: RingPendulumState | null = null;
  function draw(state: RingPendulumState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    stage.ensureSized();
    const fit = Math.min(
      stage.cssWidth / C.baseWidth,
      stage.cssHeight / C.baseHeight
    );
    const offsetY = (stage.cssHeight - C.baseHeight * fit) / 2;
    const responsiveScale = stage.responsiveScale;
    const p = PALETTE[env.theme];
    ctx.clearRect(0, 0, stage.cssWidth, stage.cssHeight);
    ctx.save();
    ctx.translate(0, offsetY);
    ctx.scale(fit, fit);
    ctx.lineWidth = responsiveScale;
    drawScene(ctx, state, p);
    ctx.restore();
  }
  return {
    render(state: RingPendulumState): void {
      snapshot = state;
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
