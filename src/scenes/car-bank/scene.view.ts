import type { DemoRenderHints } from '../../platform/demo-profile';
import { clamp } from '../../core/math';
import { getRenderTokens } from '../../platform/standards';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { carBankConstants as C, type CarBankState } from './scene.sim';

export type CreateCarBankViewOptions = {
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
  car: string;
};
const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    panel: '#fff',
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
    road: '#c6ced6',
    car: '#4d65ee'
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
    road: '#64748b',
    car: '#7184ff'
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
function drawTrackInset(
  ctx: CanvasRenderingContext2D,
  state: CarBankState,
  p: Palette
): void {
  ctx.fillStyle = `${p.panel}dd`;
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  rounded(
    ctx,
    C.trackInsetX,
    C.trackInsetY,
    C.trackInsetWidth,
    C.trackInsetHeight,
    12
  );
  ctx.fill();
  ctx.stroke();
  text(
    ctx,
    '俯视轨迹剖面',
    C.trackInsetX + 14,
    C.trackInsetY + 18,
    p.ink,
    13,
    'left',
    700
  );
  const cx = C.trackInsetX + C.trackInsetWidth * 0.52;
  const cy = C.trackInsetY + C.trackInsetHeight * 0.57;
  ctx.strokeStyle = p.muted;
  ctx.setLineDash([5, 5]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, C.trackRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = p.orange;
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, '圆心', cx + 10, cy - 10, p.muted, 11, 'left', 500);
  const carAngle = state.angleRad;
  const px = cx + Math.cos(carAngle) * C.trackRadius;
  const py = cy + Math.sin(carAngle) * C.trackRadius;
  ctx.fillStyle = p.car;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(carAngle + Math.PI / 2);
  ctx.fillRect(-12, -6, 24, 12);
  ctx.restore();
  arrow(
    ctx,
    px,
    py,
    px - Math.cos(carAngle) * 24,
    py - Math.sin(carAngle) * 24,
    p.orange,
    3
  );
  text(
    ctx,
    'Fₙ',
    px - Math.cos(carAngle) * 32,
    py - Math.sin(carAngle) * 32,
    p.orange,
    11,
    'center',
    700
  );
}
function drawRoad(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = `${p.road}55`;
  ctx.strokeStyle = p.road;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(C.rampLeft, C.rampBottom);
  ctx.lineTo(C.rampRight, C.rampBottom);
  ctx.lineTo(C.rampRight, C.rampTop);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(C.rampLeft + 20, C.rampBottom - 12);
  ctx.lineTo(C.rampRight - 8, C.rampTop + 14);
  ctx.stroke();
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(C.rampLeft, C.rampBottom);
  ctx.lineTo(C.rampRight, C.rampTop);
  ctx.stroke();
  ctx.setLineDash([]);
}
function drawCar(
  ctx: CanvasRenderingContext2D,
  state: CarBankState,
  p: Palette
): void {
  const theta = (state.bankAngle * Math.PI) / 180;
  const x = C.carX + Math.cos(state.angleRad) * 4;
  const y = C.carY + Math.sin(state.angleRad) * 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-theta);
  ctx.fillStyle = p.car;
  rounded(ctx, -C.carWidth / 2, -C.carHeight / 2, C.carWidth, C.carHeight, 9);
  ctx.fill();
  ctx.fillStyle = p.soft;
  rounded(ctx, -24, -12, 48, 16, 5);
  ctx.fill();
  ctx.fillStyle = p.ink;
  ctx.beginPath();
  ctx.arc(-28, 20, 9, 0, Math.PI * 2);
  ctx.arc(28, 20, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  text(ctx, '汽车', x, y - 40, p.ink, 14, 'center', 700);
}
function drawAxes(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.strokeStyle = `${p.muted}aa`;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(C.carX, C.carY + 12);
  ctx.lineTo(C.carX - C.axisLength, C.carY + 12);
  ctx.moveTo(C.carX, C.carY + 12);
  ctx.lineTo(C.carX, C.carY - C.axisLength);
  ctx.stroke();
  ctx.setLineDash([]);
  text(
    ctx,
    'x（向心）',
    C.carX - C.axisLength - 6,
    C.carY + 12,
    p.muted,
    12,
    'right',
    600
  );
  text(
    ctx,
    'y',
    C.carX + 12,
    C.carY - C.axisLength - 6,
    p.muted,
    12,
    'left',
    600
  );
}
function drawVectors(
  ctx: CanvasRenderingContext2D,
  state: CarBankState,
  p: Palette
): void {
  if (!state.showVectors) return;
  const x = C.carX;
  const y = C.carY;
  const scale = C.arrowScale;
  const nLen = Math.min(
    C.arrowMax,
    Math.max(C.arrowMin, state.normalForce * scale)
  );
  const gLen = 92;
  const fLen = Math.min(
    C.arrowMax,
    Math.max(C.arrowMin, state.frictionForce * scale)
  );
  const fcLen = Math.min(
    C.arrowMax,
    Math.max(C.arrowMin, state.centripetalForce * scale)
  );
  const theta = (state.bankAngle * Math.PI) / 180;
  arrow(
    ctx,
    x,
    y,
    x - Math.sin(theta) * nLen,
    y - Math.cos(theta) * nLen,
    p.cyan,
    4
  );
  text(
    ctx,
    'N',
    x - Math.sin(theta) * nLen - 14,
    y - Math.cos(theta) * nLen,
    p.cyan,
    16,
    'center',
    700
  );
  arrow(ctx, x, y, x, y + gLen, p.blue, 4);
  text(ctx, 'G', x + 14, y + gLen, p.blue, 16, 'left', 700);
  const frictionSign = state.frictionDirection === '沿路面向下' ? 1 : -1;
  const fx = x + frictionSign * Math.cos(theta) * fLen;
  const fy = y + frictionSign * Math.sin(theta) * fLen;
  if (state.frictionDirection !== '无需摩擦') {
    arrow(ctx, x, y, fx, fy, p.red, 4);
    text(ctx, 'f', fx + 12, fy, p.red, 16, 'left', 700);
  }
  arrow(ctx, x, y + 12, x - fcLen, y + 12, p.orange, 4);
  text(ctx, 'Fₙ', x - fcLen - 18, y + 12, p.orange, 16, 'center', 700);
  ctx.strokeStyle = p.orange;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 42, Math.PI + 0.1, Math.PI * 1.5 - theta);
  ctx.stroke();
  text(ctx, 'θ', x - 38, y - 38, p.orange, 14, 'center', 700);
}
function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: CarBankState,
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
    '弯道受力正交分析系统',
    C.panelX + C.panelWidth / 2,
    C.panelTitleY,
    p.ink,
    22,
    'center',
    700
  );
  ctx.strokeStyle = p.border;
  ctx.beginPath();
  ctx.moveTo(C.panelX + C.panelInset, C.panelRuleY);
  ctx.lineTo(C.panelX + C.panelWidth - C.panelInset, C.panelRuleY);
  ctx.stroke();
  const statusColor = state.safe ? p.green : p.red;
  const trendColor = state.trend === '临界状态' ? p.green : p.red;
  rounded(
    ctx,
    C.panelX + C.panelInset,
    C.panelStatusY,
    C.panelWidth - C.panelInset * 2,
    C.panelStatusHeight,
    13
  );
  ctx.fillStyle = `${statusColor}22`;
  ctx.fill();
  ctx.strokeStyle = `${statusColor}88`;
  ctx.stroke();
  text(
    ctx,
    state.safe ? '安全区' : '超出摩擦极限',
    C.panelX + C.panelInset * 2,
    C.panelStatusY + 23,
    statusColor,
    18,
    'left',
    700
  );
  text(
    ctx,
    state.trend,
    C.panelX + C.panelWidth - C.panelInset * 2,
    C.panelStatusY + 23,
    trendColor,
    13,
    'right',
    600
  );
  text(
    ctx,
    `v = ${state.speed.toFixed(1)} m/s   θ = ${state.bankAngle.toFixed(0)}°`,
    C.panelX + C.panelInset * 2,
    C.panelStatusY + 49,
    p.muted,
    13,
    'left',
    600
  );
  const barX = C.panelX + C.panelInset * 2;
  const barY = C.panelStatusY + 59;
  const barWidth = C.panelWidth - C.panelInset * 4;
  const halfSafe = state.criticalSpeed * 0.22;
  const safeStart = clamp(
    (state.criticalSpeed - halfSafe - C.speedMin) / (C.speedMax - C.speedMin),
    0,
    1
  );
  const safeEnd = clamp(
    (state.criticalSpeed + halfSafe - C.speedMin) / (C.speedMax - C.speedMin),
    0,
    1
  );
  rounded(ctx, barX, barY, barWidth, 8, 4);
  ctx.fillStyle = `${p.red}66`;
  ctx.fill();
  rounded(
    ctx,
    barX + barWidth * safeStart,
    barY,
    barWidth * (safeEnd - safeStart),
    8,
    4
  );
  ctx.fillStyle = `${p.green}aa`;
  ctx.fill();
  ctx.fillStyle = trendColor;
  ctx.beginPath();
  ctx.arc(
    barX +
      barWidth *
        clamp((state.speed - C.speedMin) / (C.speedMax - C.speedMin), 0, 1),
    barY + 4,
    6,
    0,
    Math.PI * 2
  );
  ctx.fill();
  rounded(
    ctx,
    C.panelX + C.panelInset,
    C.panelReadoutY,
    C.panelWidth - C.panelInset * 2,
    C.panelReadoutHeight,
    13
  );
  ctx.fillStyle = p.soft;
  ctx.fill();
  text(
    ctx,
    `无摩擦临界速度  v₀  ${state.criticalSpeed.toFixed(1)} m/s`,
    C.panelX + C.panelInset * 2,
    C.panelReadoutY + 25,
    p.ink,
    14,
    'left',
    700
  );
  text(
    ctx,
    `当前需静摩擦力  f  ${(state.frictionForce / 1000).toFixed(2)} kN`,
    C.panelX + C.panelInset * 2,
    C.panelReadoutY + 62,
    state.frictionForce > state.frictionLimit ? p.red : p.ink,
    14,
    'left',
    700
  );
  text(
    ctx,
    state.frictionDirection,
    C.panelX + C.panelWidth - C.panelInset * 2,
    C.panelReadoutY + 62,
    p.muted,
    12,
    'right',
    600
  );
  text(
    ctx,
    `路面总支持力  N  ${(state.normalForce / 1000).toFixed(1)} kN`,
    C.panelX + C.panelInset * 2,
    C.panelReadoutY + 99,
    p.ink,
    14,
    'left',
    700
  );
  text(
    ctx,
    `实际向心力  Fₙ  ${(state.centripetalForce / 1000).toFixed(1)} kN`,
    C.panelX + C.panelInset * 2,
    C.panelReadoutY + 136,
    p.orange,
    14,
    'left',
    700
  );
  rounded(
    ctx,
    C.panelX + C.panelInset,
    C.panelEquationY,
    C.panelWidth - C.panelInset * 2,
    C.panelEquationHeight,
    13
  );
  ctx.fillStyle = '#101827';
  ctx.fill();
  text(
    ctx,
    '水平投影：N·sinθ + f·cosθ = Fₙ',
    C.panelX + C.panelInset * 2,
    C.panelEquationY + 44,
    '#f7f8fa',
    14,
    'left',
    600
  );
  text(
    ctx,
    '竖直投影：N·cosθ − f·sinθ = G',
    C.panelX + C.panelInset * 2,
    C.panelEquationY + 88,
    '#f7f8fa',
    14,
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
    '速度偏高 → 离心趋势；速度偏低 → 向心趋势',
    C.panelX + C.panelInset * 2,
    C.panelHintY + 30,
    p.muted,
    12,
    'left',
    600
  );
  text(
    ctx,
    `摩擦裕度  ${(Math.max(0, 1 - state.frictionRatio) * 100).toFixed(0)}%`,
    C.panelX + C.panelInset * 2,
    C.panelHintY + 67,
    state.safe ? p.green : p.red,
    15,
    'left',
    700
  );
}

export function createCarBankView(options: CreateCarBankViewOptions = {}) {
  const canvas = options.canvas ?? document.createElement('canvas');
  const env = createViewEnvironment({
    theme: options.theme ?? 'dark',
    mode: options.mode ?? 'normal',
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
  function render(state: CarBankState): void {
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
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
    ctx.clearRect(0, 0, C.baseWidth, C.baseHeight);
    const p = PALETTE[env.theme];
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, C.baseWidth, C.baseHeight);
    drawGrid(ctx, p);
    drawTrackInset(ctx, state, p);
    drawRoad(ctx, p);
    drawCar(ctx, state, p);
    drawAxes(ctx, p);
    drawVectors(ctx, state, p);
    drawPanel(ctx, state, p);
    text(
      ctx,
      '空格：暂停 / 播放',
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
