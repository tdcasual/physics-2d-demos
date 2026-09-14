import { clamp } from '../../core/math';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { getRenderTokens } from '../../platform/standards';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  chargedSuperpositionConstants as C,
  chargedParticleLabels,
  type ChargedSuperpositionState
} from './scene.sim';

export type CreateChargedSuperpositionViewOptions = {
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
  plate: string;
  glow: string;
};
const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#0e1722',
    panel: '#ffffff',
    soft: '#e9eef2',
    ink: '#e8eef5',
    muted: '#97a8b8',
    grid: '#263642',
    border: '#455764',
    blue: '#6ea9dc',
    cyan: '#4fd2ed',
    red: '#f04c5c',
    orange: '#ffcd58',
    green: '#3fc5ad',
    plate: '#ccd7e1',
    glow: '#f04c5c'
  },
  dark: {
    bg: '#0e1722',
    panel: '#172331',
    soft: '#223445',
    ink: '#e8eef5',
    muted: '#97a8b8',
    grid: '#263642',
    border: '#455764',
    blue: '#6ea9dc',
    cyan: '#4fd2ed',
    red: '#f04c5c',
    orange: '#ffcd58',
    green: '#3fc5ad',
    plate: '#ccd7e1',
    glow: '#f04c5c'
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
  radius = 12
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
  width = 3
): void {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = 10;
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
  for (let x = 0; x < C.baseWidth; x += C.gridStep) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, C.baseHeight);
    ctx.stroke();
  }
  for (let y = C.gridTop; y < C.baseHeight; y += C.gridStep) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(C.baseWidth, y);
    ctx.stroke();
  }
}
function drawAccelerator(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 3;
  ctx.strokeRect(
    C.accelStartX,
    C.plateTopY - 18,
    C.accelEndX - C.accelStartX,
    C.plateBottomY - C.plateTopY + 36
  );
  ctx.fillStyle = p.plate;
  ctx.fillRect(
    C.accelStartX + 12,
    C.plateTopY,
    12,
    C.plateBottomY - C.plateTopY
  );
  ctx.fillRect(C.accelEndX - 24, C.plateTopY, 12, C.plateBottomY - C.plateTopY);
  for (let y = C.plateTopY + 22; y < C.plateBottomY; y += C.fieldArrowStep)
    arrow(ctx, C.accelStartX + 46, y, C.accelEndX - 42, y, `${p.blue}88`, 2);
  text(ctx, '+', C.accelStartX - 4, C.centerY - 80, p.red, 23, 'center', 700);
  text(ctx, '−', C.accelStartX - 4, C.centerY + 80, p.cyan, 23, 'center', 700);
  text(
    ctx,
    '加速区',
    C.accelStartX + 60,
    C.plateBottomY + 32,
    p.muted,
    13,
    'center',
    600
  );
}
function drawDeflector(
  ctx: CanvasRenderingContext2D,
  state: ChargedSuperpositionState,
  p: Palette
): void {
  ctx.fillStyle = p.plate;
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 3;
  rounded(
    ctx,
    C.plateStartX,
    C.plateTopY,
    C.plateEndX - C.plateStartX,
    C.plateHeight,
    5
  );
  ctx.fill();
  ctx.stroke();
  rounded(
    ctx,
    C.plateStartX,
    C.plateBottomY - C.plateHeight,
    C.plateEndX - C.plateStartX,
    C.plateHeight,
    5
  );
  ctx.fill();
  ctx.stroke();
  text(
    ctx,
    '+',
    C.plateStartX + 150,
    C.plateTopY - 22,
    p.red,
    23,
    'center',
    700
  );
  text(
    ctx,
    '−',
    C.plateStartX + 150,
    C.plateBottomY + 22,
    p.cyan,
    23,
    'center',
    700
  );
  for (let x = C.plateStartX + 30; x < C.plateEndX - 20; x += C.fieldArrowStep)
    arrow(
      ctx,
      x,
      C.plateTopY + C.plateHeight + 28,
      x,
      C.plateBottomY - C.plateHeight - 28,
      `${p.blue}99`,
      2
    );
  text(
    ctx,
    '偏转区',
    C.plateStartX + 100,
    C.plateBottomY + 32,
    p.muted,
    13,
    'center',
    600
  );
}
function drawScreen(
  ctx: CanvasRenderingContext2D,
  state: ChargedSuperpositionState,
  p: Palette
): void {
  ctx.fillStyle = `${p.green}33`;
  ctx.strokeStyle = p.green;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(C.screenX, C.screenTop);
  ctx.lineTo(C.screenX, C.screenBottom);
  ctx.stroke();
  ctx.lineWidth = 1;
  for (let y = C.screenTop + 24; y < C.screenBottom; y += C.fieldArrowStep) {
    ctx.strokeStyle = `${p.green}88`;
    ctx.beginPath();
    ctx.moveTo(C.screenX - 12, y);
    ctx.lineTo(C.screenX + 12, y);
    ctx.stroke();
  }
  ctx.strokeStyle = `${p.green}cc`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(C.screenX - 20, C.centerY);
  ctx.lineTo(C.screenX + 20, C.centerY);
  ctx.stroke();
  text(ctx, 'O（原点）', C.screenX + 24, C.centerY - 2, p.ink, 14, 'left', 600);
  const hitY = C.centerY + state.screenOffsetPx;
  ctx.fillStyle = p.green;
  ctx.beginPath();
  ctx.arc(C.screenX, hitY, 6, 0, Math.PI * 2);
  ctx.fill();
}
function drawTrajectory(
  ctx: CanvasRenderingContext2D,
  state: ChargedSuperpositionState,
  p: Palette
): void {
  const pathEndX = Math.min(state.particleX, C.screenX);
  const exitRatio = clamp(
    (C.plateEndX - C.plateStartX) / (C.screenX - C.plateStartX),
    0,
    1
  );
  const exitY = C.centerY + state.screenOffsetPx * exitRatio * exitRatio;
  const plateMidX = (C.plateStartX + C.plateEndX) / 2;
  const screenHitY = C.centerY + state.screenOffsetPx;
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 5;
  ctx.shadowColor = p.glow;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  for (let x = C.particleStartX; x <= pathEndX; x += 6) {
    const ratio = clamp(
      (x - C.plateStartX) / (C.screenX - C.plateStartX),
      0,
      1
    );
    const y = C.centerY + state.screenOffsetPx * ratio * ratio;
    if (x === C.particleStartX) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
  // The outgoing tangent's reverse extension is anchored at the plate midpoint.
  ctx.setLineDash([8, 8]);
  ctx.strokeStyle = p.orange;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(plateMidX, C.centerY);
  ctx.lineTo(C.plateEndX, exitY);
  ctx.stroke();
  // Continue the straight outgoing ray to the screen as a quiet guide line.
  ctx.strokeStyle = `${p.muted}aa`;
  ctx.beginPath();
  ctx.moveTo(C.plateEndX, exitY);
  ctx.lineTo(C.screenX, screenHitY);
  ctx.stroke();
  ctx.setLineDash([]);
  const x = state.particleX;
  const y = state.particleY;
  ctx.fillStyle = p.red;
  ctx.shadowColor = p.glow;
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(x, y, C.particleRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  text(
    ctx,
    chargedParticleLabels[state.particle].label,
    x + 16,
    y - 18,
    p.ink,
    13,
    'left',
    600
  );
}
function drawHUD(
  ctx: CanvasRenderingContext2D,
  state: ChargedSuperpositionState,
  p: Palette
): void {
  text(
    ctx,
    '带电粒子加速与偏转叠加',
    C.baseWidth / 2,
    30,
    p.ink,
    20,
    'center',
    700
  );
  text(
    ctx,
    `U₁ = ${state.accelVoltage.toFixed(0)} V`,
    C.accelStartX + 44,
    188,
    p.muted,
    13,
    'left',
    600
  );
  text(
    ctx,
    `U₂ = ${state.deflectVoltage.toFixed(0)} V`,
    C.plateEndX - 130,
    188,
    p.muted,
    13,
    'left',
    600
  );
  text(
    ctx,
    `Y = ${state.screenOffsetMm.toFixed(1)} mm`,
    C.screenX - 14,
    C.centerY + state.screenOffsetPx + 28,
    p.green,
    14,
    'right',
    700
  );
  text(
    ctx,
    '按空格暂停 · 调节 U₂ 观察反向延长线',
    C.baseWidth / 2,
    C.baseHeight - 24,
    p.muted,
    13,
    'center',
    500
  );
}
function drawInfoPanel(
  ctx: CanvasRenderingContext2D,
  state: ChargedSuperpositionState,
  p: Palette
): void {
  const x = 26;
  const y = 542;
  const w = 340;
  const h = 166;
  ctx.fillStyle = `${p.panel}f2`;
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5;
  rounded(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.stroke();
  text(ctx, '系统传感器数据', x + 18, y + 24, p.ink, 16, 'left', 700);
  text(
    ctx,
    `粒子：${chargedParticleLabels[state.particle].label}`,
    x + 18,
    y + 55,
    p.ink,
    13,
    'left',
    600
  );
  text(
    ctx,
    `打屏偏移 Y   ${state.screenOffsetMm.toFixed(1)} mm`,
    x + 18,
    y + 84,
    p.red,
    14,
    'left',
    700
  );
  text(
    ctx,
    `出射角       ${state.exitAngleDeg.toFixed(1)}°`,
    x + 18,
    y + 112,
    p.blue,
    13,
    'left',
    600
  );
  text(ctx, state.status, x + w - 18, y + 55, p.green, 13, 'right', 700);
  text(
    ctx,
    '比荷变化不改变轨迹偏移',
    x + 18,
    y + 140,
    p.muted,
    12,
    'left',
    500
  );
}

export function createChargedSuperpositionView(
  options: CreateChargedSuperpositionViewOptions = {}
) {
  const canvas = options.canvas ?? document.createElement('canvas');
  const env = createViewEnvironment({
    theme: options.theme ?? 'dark',
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
  function render(state: ChargedSuperpositionState): void {
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
    drawAccelerator(ctx, p);
    drawDeflector(ctx, state, p);
    drawScreen(ctx, state, p);
    drawTrajectory(ctx, state, p);
    drawInfoPanel(ctx, state, p);
    drawHUD(ctx, state, p);
    text(
      ctx,
      `q/m = ${(state.chargeMassRatio / 1e8).toFixed(2)}×10⁸ C/kg`,
      22,
      512,
      p.muted,
      tokens.controlFontPx / scale,
      'left',
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
