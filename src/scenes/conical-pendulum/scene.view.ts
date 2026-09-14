import { clamp } from '../../core/math';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { getRenderTokens } from '../../platform/standards';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  conicalPendulumConstants as C,
  type ConicalPendulumState
} from './scene.sim';

export type CreateConicalPendulumViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};
type Palette = {
  bg: string;
  panel: string;
  soft: string;
  ink: string;
  muted: string;
  grid: string;
  border: string;
  blue: string;
  cyan: string;
  red: string;
  orange: string;
  green: string;
  string: string;
  ball: string;
};
const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    panel: '#ffffff',
    soft: '#f3f6f8',
    ink: '#303744',
    muted: '#7d8997',
    grid: '#e2e7eb',
    border: '#d8dfe5',
    blue: '#3e45e8',
    cyan: '#17a7c7',
    red: '#ef4050',
    orange: '#f09b20',
    green: '#16a28d',
    string: '#34404c',
    ball: '#e0444f'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    soft: '#223249',
    ink: '#eef2f7',
    muted: '#aab6c8',
    grid: '#2d3c52',
    border: '#3d4e65',
    blue: '#8390ff',
    cyan: '#4dd4e9',
    red: '#fb7185',
    orange: '#ffb340',
    green: '#4dd4c0',
    string: '#d0d7e2',
    ball: '#f05b66'
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
  radius = 14
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}
function arrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width = 4
): void {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = 12;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - head * Math.cos(angle - Math.PI / 6),
    y2 - head * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    x2 - head * Math.cos(angle + Math.PI / 6),
    y2 - head * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
}
function drawGrid(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let x = C.gridStep / 2; x < C.fieldWidth; x += C.gridStep) {
    ctx.beginPath();
    ctx.moveTo(x, C.gridTop);
    ctx.lineTo(x, C.baseHeight - 24);
    ctx.stroke();
  }
  for (let y = C.gridStep / 2; y < C.baseHeight - 24; y += C.gridStep) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(C.fieldWidth, y);
    ctx.stroke();
  }
}
function drawOrbit(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = `${p.cyan}14`;
  ctx.strokeStyle = `${p.cyan}55`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(
    C.orbitCenterX,
    C.orbitCenterY,
    C.orbitRadiusPx,
    C.orbitRadiusPx * 0.35,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = p.muted;
  ctx.beginPath();
  ctx.moveTo(C.orbitCenterX, C.pivotY);
  ctx.lineTo(C.orbitCenterX, C.orbitCenterY);
  ctx.stroke();
  ctx.setLineDash([]);
  text(
    ctx,
    '水平圆周轨道',
    C.orbitCenterX,
    C.orbitCenterY + 76,
    p.muted,
    13,
    'center',
    600
  );
}
function drawSupport(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = p.soft;
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 3;
  rounded(ctx, C.supportX, C.supportY, C.supportWidth, C.supportHeight, 5);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(C.supportX - 18, C.supportY + C.supportHeight);
  ctx.lineTo(C.supportX + C.supportWidth + 18, C.supportY + C.supportHeight);
  ctx.stroke();
  text(
    ctx,
    '悬点',
    C.supportX + C.supportWidth / 2,
    C.supportY - 18,
    p.muted,
    13,
    'center',
    600
  );
}
function drawPendulum(
  ctx: CanvasRenderingContext2D,
  state: ConicalPendulumState,
  p: Palette
): { x: number; y: number } {
  const theta = (state.theta * Math.PI) / 180;
  const radius = clamp(state.radius / 5.5, 0, 1) * C.orbitRadiusPx;
  const phase = state.phase;
  const x = C.orbitCenterX + radius * Math.cos(phase);
  const y = C.orbitCenterY + radius * 0.35 * Math.sin(phase);
  ctx.strokeStyle = p.string;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(C.pivotX, C.pivotY);
  ctx.lineTo(x, y - C.ballRadius);
  ctx.stroke();
  ctx.fillStyle = p.ball;
  ctx.beginPath();
  ctx.arc(x, y, C.ballRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `${p.ball}88`;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, '小球 m', x + 28, y + 4, p.ink, 13, 'left', 700);
  if (state.showVectors) {
    const tensionLen = clamp(state.tension * C.vectorScale, 70, 156);
    arrow(
      ctx,
      x,
      y,
      x - Math.cos(theta) * tensionLen,
      y - Math.sin(theta) * tensionLen,
      p.blue,
      4
    );
    text(
      ctx,
      'T',
      x - Math.cos(theta) * tensionLen - 14,
      y - Math.sin(theta) * tensionLen,
      p.blue,
      16,
      'center',
      700
    );
    arrow(ctx, x, y, x, y + C.gravityArrow, p.cyan, 4);
    text(ctx, 'mg', x + 14, y + C.gravityArrow, p.cyan, 15, 'left', 700);
    arrow(ctx, x, y, x - C.decompositionArrow - 16, y, p.red, 4);
    text(ctx, 'Fₙ', x - C.decompositionArrow - 32, y, p.red, 15, 'center', 700);
    arrow(ctx, x, y + 26, x - 34, y + 48, p.green, 3);
    text(ctx, 'v', x - 48, y + 54, p.green, 15, 'center', 700);
  }
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(C.pivotX, C.pivotY);
  ctx.lineTo(C.pivotX, C.orbitCenterY + 12);
  ctx.stroke();
  ctx.setLineDash([]);
  text(
    ctx,
    'h',
    C.pivotX - 16,
    (C.pivotY + C.orbitCenterY) / 2,
    p.muted,
    15,
    'right',
    700
  );
  ctx.strokeStyle = p.orange;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(C.pivotX, C.pivotY, 46, Math.PI / 2, Math.PI / 2 + theta);
  ctx.stroke();
  text(ctx, 'θ', C.pivotX + 34, C.pivotY + 30, p.orange, 15, 'center', 700);
  return { x, y };
}
function drawDecomposition(
  ctx: CanvasRenderingContext2D,
  state: ConicalPendulumState,
  p: Palette
): void {
  ctx.fillStyle = `${p.panel}ee`;
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  rounded(ctx, C.insetX, C.insetY, C.insetWidth, C.insetHeight, 13);
  ctx.fill();
  ctx.stroke();
  text(
    ctx,
    '受力正交分解',
    C.insetX + C.insetWidth / 2,
    C.insetY + 22,
    p.ink,
    16,
    'center',
    700
  );
  const x = C.insetBallX;
  const y = C.insetBallY;
  ctx.fillStyle = p.ink;
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.fill();
  const theta = (state.theta * Math.PI) / 180;
  arrow(
    ctx,
    x,
    y,
    x - C.decompositionArrow * Math.cos(theta),
    y - C.decompositionArrow * Math.sin(theta),
    p.blue,
    3
  );
  text(ctx, 'T', x - 84, y - 52, p.blue, 14, 'center', 700);
  arrow(ctx, x, y, x - C.decompositionArrow, y, p.red, 3);
  text(ctx, 'Fₙ', x - 84, y, p.red, 14, 'center', 700);
  arrow(ctx, x, y, x, y + C.decompositionArrow, p.cyan, 3);
  text(ctx, 'mg', x + 14, y + C.decompositionArrow, p.cyan, 13, 'left', 700);
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - C.decompositionArrow);
  ctx.stroke();
  ctx.setLineDash([]);
  text(ctx, 'θ', x - 18, y - 56, p.muted, 13, 'center', 700);
}
function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: ConicalPendulumState,
  p: Palette
): void {
  ctx.fillStyle = p.panel;
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5;
  rounded(ctx, C.panelX, 0, C.panelWidth, C.baseHeight, 16);
  ctx.fill();
  ctx.stroke();
  text(
    ctx,
    '圆锥摆模型',
    C.panelX + C.panelInset,
    C.panelTitleY,
    p.ink,
    23,
    'left',
    700
  );
  rounded(ctx, C.panelX + C.panelWidth - 118, 19, 92, 30, 15);
  ctx.fillStyle = `${p.red}22`;
  ctx.fill();
  text(
    ctx,
    '经典模型',
    C.panelX + C.panelWidth - 72,
    34,
    p.red,
    13,
    'center',
    700
  );
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(C.panelX + C.panelInset, C.panelRuleY);
  ctx.lineTo(C.panelX + C.panelWidth - C.panelInset, C.panelRuleY);
  ctx.stroke();
  rounded(
    ctx,
    C.panelX + C.panelInset,
    C.panelStatusY,
    C.panelWidth - C.panelInset * 2,
    C.panelStatusHeight,
    13
  );
  ctx.fillStyle = p.soft;
  ctx.fill();
  text(
    ctx,
    `h = ${state.height.toFixed(1)} m`,
    C.panelX + C.panelInset * 2,
    C.panelStatusY + 23,
    p.ink,
    16,
    'left',
    700
  );
  text(
    ctx,
    `θ = ${state.theta.toFixed(0)}°`,
    C.panelX + C.panelWidth - C.panelInset * 2,
    C.panelStatusY + 23,
    p.red,
    17,
    'right',
    700
  );
  text(
    ctx,
    '重力 mg 恒定 · 拉力水平分量提供 Fₙ',
    C.panelX + C.panelInset * 2,
    C.panelStatusY + 48,
    p.muted,
    12,
    'left',
    600
  );
  rounded(
    ctx,
    C.panelX + C.panelInset,
    C.panelReadoutY,
    C.panelWidth - C.panelInset * 2,
    C.panelReadoutHeight,
    13
  );
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(
    ctx,
    `轨道半径 r = h·tanθ    ${state.radius.toFixed(2)} m`,
    C.panelX + C.panelInset * 2,
    C.panelReadoutY + 28,
    p.ink,
    14,
    'left',
    600
  );
  text(
    ctx,
    `悬线长度 L = h/cosθ    ${state.stringLength.toFixed(2)} m`,
    C.panelX + C.panelInset * 2,
    C.panelReadoutY + 66,
    p.ink,
    14,
    'left',
    600
  );
  text(
    ctx,
    `合力/向心力 Fₙ       ${state.centripetalForce.toFixed(2)} N`,
    C.panelX + C.panelInset * 2,
    C.panelReadoutY + 112,
    p.red,
    15,
    'left',
    700
  );
  text(
    ctx,
    `绳子拉力 T             ${state.tension.toFixed(2)} N`,
    C.panelX + C.panelInset * 2,
    C.panelReadoutY + 150,
    p.red,
    15,
    'left',
    700
  );
  text(
    ctx,
    `g = ${state.g.toFixed(0)} m/s²    m = ${state.mass.toFixed(0)} kg`,
    C.panelX + C.panelInset * 2,
    C.panelReadoutY + 190,
    p.muted,
    12,
    'left',
    600
  );
  rounded(
    ctx,
    C.panelX + C.panelInset,
    C.panelFormulaY,
    C.panelWidth - C.panelInset * 2,
    C.panelFormulaHeight,
    13
  );
  ctx.fillStyle = p.soft;
  ctx.fill();
  text(
    ctx,
    '角速度  ω = √(g/h)',
    C.panelX + C.panelInset * 2,
    C.panelFormulaY + 30,
    p.ink,
    15,
    'left',
    700
  );
  text(
    ctx,
    `${state.omega.toFixed(2)} rad/s`,
    C.panelX + C.panelWidth - C.panelInset * 2,
    C.panelFormulaY + 30,
    p.red,
    15,
    'right',
    700
  );
  text(
    ctx,
    '周期    Tₚ = 2π√(h/g)',
    C.panelX + C.panelInset * 2,
    C.panelFormulaY + 72,
    p.ink,
    15,
    'left',
    700
  );
  text(
    ctx,
    `${state.period.toFixed(2)} s`,
    C.panelX + C.panelWidth - C.panelInset * 2,
    C.panelFormulaY + 72,
    p.red,
    15,
    'right',
    700
  );
  text(
    ctx,
    '线速度  v = ωr',
    C.panelX + C.panelInset * 2,
    C.panelFormulaY + 114,
    p.ink,
    15,
    'left',
    700
  );
  text(
    ctx,
    `${state.linearSpeed.toFixed(2)} m/s`,
    C.panelX + C.panelWidth - C.panelInset * 2,
    C.panelFormulaY + 114,
    p.red,
    15,
    'right',
    700
  );
  text(
    ctx,
    'Fₙ = mg·tanθ    T = mg/cosθ',
    C.panelX + C.panelInset * 2,
    C.panelFormulaY + 158,
    p.muted,
    13,
    'left',
    600
  );
  rounded(
    ctx,
    C.panelX + C.panelInset,
    C.panelHintY,
    C.panelWidth - C.panelInset * 2,
    C.panelHintHeight,
    13
  );
  ctx.fillStyle = p.soft;
  ctx.fill();
  text(
    ctx,
    '调节 h 或 θ，观察半径、受力与周期联动',
    C.panelX + C.panelInset * 2,
    C.panelHintY + 30,
    p.muted,
    12,
    'left',
    600
  );
  text(
    ctx,
    '空格：暂停 / 播放',
    C.panelX + C.panelInset * 2,
    C.panelHintY + 59,
    p.muted,
    12,
    'left',
    600
  );
}

export function createConicalPendulumView(
  options: CreateConicalPendulumViewOptions = {}
) {
  const canvas = options.canvas ?? document.createElement('canvas');
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode,
    demoHints: options.demoHints
  });
  const stage = createCanvasViewport({
    canvas,
    sizing: {
      mode: 'clamped',
      fallbackWidth: C.baseWidth,
      fallbackHeight: C.baseHeight
    },
    initialWidth: C.baseWidth,
    initialHeight: C.baseHeight,
    eagerContext: true
  });
  function render(state: ConicalPendulumState): void {
    stage.ensureSized();
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const scale =
      Math.min(width / C.baseWidth, height / C.baseHeight) *
      Math.min(1, stage.responsiveScale);
    const offsetX = (width - C.baseWidth * scale) / 2;
    const offsetY = (height - C.baseHeight * scale) / 2;
    const tokens = getRenderTokens(scale);
    const p = PALETTE[env.theme];
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
    ctx.clearRect(0, 0, C.baseWidth, C.baseHeight);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, C.baseWidth, C.baseHeight);
    drawGrid(ctx, p);
    drawOrbit(ctx, p);
    drawSupport(ctx, p);
    drawPendulum(ctx, state, p);
    drawDecomposition(ctx, state, p);
    drawPanel(ctx, state, p);
    text(
      ctx,
      '按下空格暂停/恢复演示',
      C.fieldWidth - 24,
      C.baseHeight - 18,
      p.muted,
      tokens.controlFontPx / scale,
      'right',
      500
    );
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  return {
    render,
    resize() {
      stage.resize();
    },
    setTheme(theme: TeachingTheme) {
      env.setTheme(theme);
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints) {
      env.setMode(mode, hints);
    },
    dispose() {
      stage.release();
    }
  };
}
