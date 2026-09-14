import { clamp } from '../../core/math';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { getRenderTokens } from '../../platform/standards';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  galileoInclineConstants as C,
  type GalileoInclineState
} from './scene.sim';

export type CreateGalileoInclineViewOptions = {
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
  road: string;
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
    blue: '#2c7de8',
    cyan: '#25a9d1',
    red: '#ef4050',
    orange: '#f2a51c',
    green: '#16a28d',
    road: '#b8c6d6',
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
    blue: '#7fb2ff',
    cyan: '#4dd4e9',
    red: '#fb7185',
    orange: '#ffb340',
    green: '#4dd4c0',
    road: '#64748b',
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
function drawEnergyMonitor(
  ctx: CanvasRenderingContext2D,
  state: GalileoInclineState,
  p: Palette
): void {
  ctx.fillStyle = `${p.panel}ee`;
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  rounded(ctx, C.energyX, C.energyY, C.energyWidth, C.energyHeight, 14);
  ctx.fill();
  ctx.stroke();
  text(
    ctx,
    '能量转化实时监测',
    C.energyX + 18,
    C.energyY + 26,
    p.ink,
    17,
    'left',
    700
  );
  const rows: Array<[string, number, string]> = [
    ['重力势能 Eₚ', state.potentialEnergy / state.totalEnergy, p.blue],
    ['动能 Eₖ', state.kineticEnergy / state.totalEnergy, p.red],
    [
      '总能量 E总',
      state.totalEnergy > 0
        ? (state.potentialEnergy + state.kineticEnergy) / state.totalEnergy
        : 0,
      p.orange
    ]
  ];
  rows.forEach(([label, ratio, color], index) => {
    const y = C.energyY + 64 + index * 34;
    text(ctx, label, C.energyX + 18, y, p.ink, 14, 'left', 600);
    ctx.fillStyle = p.soft;
    rounded(ctx, C.energyX + 144, y - 8, 142, 16, 4);
    ctx.fill();
    ctx.fillStyle = color;
    rounded(ctx, C.energyX + 144, y - 8, 142 * clamp(ratio, 0, 1), 16, 4);
    ctx.fill();
    text(
      ctx,
      `${Math.round(clamp(ratio, 0, 1) * 100)}%`,
      C.energyX + C.energyWidth - 18,
      y,
      color,
      14,
      'right',
      700
    );
  });
}
function drawTrack(
  ctx: CanvasRenderingContext2D,
  state: GalileoInclineState,
  p: Palette
): void {
  ctx.fillStyle = `${p.road}55`;
  ctx.strokeStyle = p.road;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(C.leftStartX, C.leftStartY);
  ctx.lineTo(C.bottomX, C.bottomY);
  ctx.lineTo(C.bottomX + C.rightRun, state.rightTopY);
  ctx.lineTo(C.bottomX + C.rightRun, C.bottomY);
  ctx.lineTo(C.leftStartX, C.bottomY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(C.leftStartX, C.leftStartY);
  ctx.lineTo(C.bottomX, C.bottomY);
  ctx.lineTo(C.bottomX + C.rightRun, state.rightTopY);
  ctx.stroke();
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 7]);
  ctx.beginPath();
  ctx.moveTo(C.leftStartX - 24, C.leftStartY);
  ctx.lineTo(C.bottomX + C.rightRun + 20, C.leftStartY);
  ctx.stroke();
  ctx.setLineDash([]);
  text(
    ctx,
    '释放高度等高线 h',
    C.leftStartX + 92,
    C.leftStartY - 18,
    p.orange,
    13,
    'left',
    700
  );
  text(
    ctx,
    'θ₁ = 45°',
    C.bottomX - 70,
    C.bottomY - 28,
    p.muted,
    14,
    'center',
    700
  );
  text(
    ctx,
    `θ₂ = ${state.theta2.toFixed(0)}°`,
    C.bottomX + 112,
    C.bottomY - 28,
    p.blue,
    14,
    'center',
    700
  );
  text(ctx, '最低点 B', C.bottomX, C.bottomY + 24, p.ink, 14, 'center', 700);
}
function drawBall(
  ctx: CanvasRenderingContext2D,
  state: GalileoInclineState,
  p: Palette
): void {
  const x = state.ballX;
  const y = state.ballY;
  ctx.fillStyle = p.ball;
  ctx.beginPath();
  ctx.arc(x, y, C.ballRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `${p.ball}99`;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(
    ctx,
    state.released ? '小球' : '释放点 A',
    x + 26,
    y - 4,
    p.ink,
    14,
    'left',
    700
  );
  if (state.showVectors) {
    const onLeft =
      state.segment === 'left' || (!state.released && state.position === 0);
    const angle = onLeft
      ? (C.theta1 * Math.PI) / 180
      : (state.theta2 * Math.PI) / 180;
    const normalAngle = onLeft ? -Math.PI / 2 + angle : -Math.PI / 2 + angle;
    arrow(
      ctx,
      x,
      y,
      x - Math.cos(normalAngle) * 58,
      y - Math.sin(normalAngle) * 58,
      p.blue,
      4
    );
    text(
      ctx,
      'N',
      x - Math.cos(normalAngle) * 70,
      y - Math.sin(normalAngle) * 70,
      p.blue,
      15,
      'center',
      700
    );
    arrow(ctx, x, y, x, y + C.axisLength, p.red, 4);
    text(ctx, 'G', x + 14, y + C.axisLength, p.red, 15, 'left', 700);
    arrow(ctx, x, y, x - 66, y + 20, p.orange, 4);
    text(ctx, 'Gₓ', x - 84, y + 24, p.orange, 14, 'center', 700);
  }
}
function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: GalileoInclineState,
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
    '伽利略理想实验',
    C.panelX + C.panelInset,
    C.panelTitleY,
    p.ink,
    23,
    'left',
    700
  );
  rounded(ctx, C.panelX + C.panelWidth - 126, 19, 102, 30, 15);
  ctx.fillStyle = `${p.blue}22`;
  ctx.fill();
  text(
    ctx,
    '高中物理',
    C.panelX + C.panelWidth - 75,
    34,
    p.blue,
    13,
    'center',
    700
  );
  ctx.strokeStyle = p.blue;
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
    `右侧斜面夹角 θ₂   ${state.theta2.toFixed(0)}°`,
    C.panelX + C.panelInset * 2,
    C.panelStatusY + 22,
    p.ink,
    14,
    'left',
    700
  );
  text(
    ctx,
    state.mu === 0 ? '无摩擦（理想状态）' : `动摩擦 μ = ${state.mu.toFixed(2)}`,
    C.panelX + C.panelInset * 2,
    C.panelStatusY + 45,
    state.mu === 0 ? p.green : p.red,
    13,
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
    `重力加速度 g             ${state.g.toFixed(0)} m/s²`,
    C.panelX + C.panelInset * 2,
    C.panelReadoutY + 28,
    p.ink,
    14,
    'left',
    600
  );
  text(
    ctx,
    `小球质量 m               ${state.mass.toFixed(0)} kg`,
    C.panelX + C.panelInset * 2,
    C.panelReadoutY + 58,
    p.ink,
    14,
    'left',
    600
  );
  text(
    ctx,
    `当前位置 h                ${state.height.toFixed(2)} m`,
    C.panelX + C.panelInset * 2,
    C.panelReadoutY + 95,
    p.blue,
    14,
    'left',
    700
  );
  text(
    ctx,
    `速度 v                    ${state.velocity.toFixed(2)} m/s`,
    C.panelX + C.panelInset * 2,
    C.panelReadoutY + 125,
    p.red,
    14,
    'left',
    700
  );
  text(
    ctx,
    `加速度 a                  ${state.acceleration.toFixed(2)} m/s²`,
    C.panelX + C.panelInset * 2,
    C.panelReadoutY + 155,
    p.orange,
    14,
    'left',
    700
  );
  text(
    ctx,
    state.segment === 'limit'
      ? '水平极限：永远前进'
      : state.segment === 'rest'
        ? '按“释放小球”开始'
        : '小球运动中',
    C.panelX + C.panelInset * 2,
    C.panelReadoutY + 190,
    state.segment === 'limit' ? p.green : p.muted,
    13,
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
    '理想极限  θ₂ → 0，μ → 0',
    C.panelX + C.panelInset * 2,
    C.panelFormulaY + 28,
    p.ink,
    15,
    'left',
    700
  );
  text(
    ctx,
    'a₂ = −g·sinθ₂ − μg·cosθ₂',
    C.panelX + C.panelInset * 2,
    C.panelFormulaY + 66,
    p.ink,
    14,
    'left',
    600
  );
  text(
    ctx,
    'E总 = Eₚ + Eₖ',
    C.panelX + C.panelInset * 2,
    C.panelFormulaY + 104,
    p.ink,
    14,
    'left',
    600
  );
  text(
    ctx,
    `势能 ${state.potentialEnergy.toFixed(2)} J`,
    C.panelX + C.panelInset * 2,
    C.panelFormulaY + 142,
    p.blue,
    13,
    'left',
    600
  );
  text(
    ctx,
    `动能 ${state.kineticEnergy.toFixed(2)} J`,
    C.panelX + C.panelInset * 2,
    C.panelFormulaY + 170,
    p.red,
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
    state.released ? '按 R 复位 · 空格暂停/播放' : '按“释放小球”开始',
    C.panelX + C.panelInset * 2,
    C.panelHintY + 30,
    p.muted,
    12,
    'left',
    600
  );
  text(
    ctx,
    state.showVectors ? '受力向量：开' : '受力向量：关',
    C.panelX + C.panelInset * 2,
    C.panelHintY + 58,
    p.muted,
    12,
    'left',
    600
  );
}

export function createGalileoInclineView(
  options: CreateGalileoInclineViewOptions = {}
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
  function render(state: GalileoInclineState): void {
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
    drawEnergyMonitor(ctx, state, p);
    drawTrack(ctx, state, p);
    drawBall(ctx, state, p);
    drawPanel(ctx, state, p);
    text(
      ctx,
      '空格：暂停/播放',
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
