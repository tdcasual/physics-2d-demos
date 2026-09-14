import { clamp } from '../../core/math';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { getRenderTokens } from '../../platform/standards';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  electrostaticShieldingConstants as C,
  type ElectrostaticShieldingState
} from './scene.sim';

export type CreateElectrostaticShieldingViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};
type Palette = {
  bg: string;
  grid: string;
  ink: string;
  muted: string;
  border: string;
  metal: string;
  metalEdge: string;
  red: string;
  teal: string;
  orange: string;
  green: string;
  card: string;
};
const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfcfd',
    grid: '#e8edf1',
    ink: '#28313b',
    muted: '#82909d',
    border: '#68737d',
    metal: '#cbd2d8',
    metalEdge: '#67727d',
    red: '#ef4050',
    teal: '#2ca69a',
    orange: '#efb24b',
    green: '#2f9f95',
    card: '#ffffff'
  },
  dark: {
    bg: '#101923',
    grid: '#1c2a35',
    ink: '#edf3f7',
    muted: '#a0b0bb',
    border: '#9aacb7',
    metal: '#53616c',
    metalEdge: '#a7b4bd',
    red: '#ff5b6a',
    teal: '#48cbbd',
    orange: '#ffc15c',
    green: '#55c6b6',
    card: '#172631'
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
  const head = 11;
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
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, C.baseWidth, C.baseHeight);
  ctx.fillStyle = p.grid;
  for (let y = 12; y < C.baseHeight; y += C.gridStep)
    for (let x = 12; x < C.baseWidth; x += C.gridStep) {
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
}
function drawExternalField(
  ctx: CanvasRenderingContext2D,
  state: ElectrostaticShieldingState,
  p: Palette
): void {
  if (!state.externalField) return;
  const alpha = Math.max(0.25, state.fieldSettled);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = p.orange;
  ctx.lineWidth = 2.5;
  ctx.setLineDash([12, 9]);
  const ys = [96, 190, 286, 388, 490, 586, 680];
  for (const y of ys) {
    ctx.beginPath();
    ctx.moveTo(C.fieldStartX, y);
    ctx.bezierCurveTo(
      C.fieldControlLeftX,
      y,
      C.fieldControlNearX,
      y - (y - C.shellCenterY) * 0.42,
      C.fieldCenterX,
      y - (y - C.shellCenterY) * 0.18
    );
    ctx.bezierCurveTo(
      C.fieldControlFarX,
      y + (y - C.shellCenterY) * 0.18,
      C.fieldControlRightX,
      y,
      C.fieldEndX,
      y
    );
    ctx.stroke();
  }
  ctx.restore();
}
function drawChargedPlate(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.save();
  ctx.shadowColor = `${p.red}66`;
  ctx.shadowBlur = 16;
  ctx.fillStyle = p.red;
  rounded(ctx, 22, 84, 24, 592, 12);
  ctx.fill();
  ctx.restore();
  for (const y of [132, 258, 384, 510, 636])
    text(ctx, '+', 34, y, '#fff', 21, 'center', 700);
  text(ctx, 'E₀', 74, C.shellCenterY + 4, p.red, 20, 'left', 700);
}
function drawGround(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.strokeStyle = p.green;
  ctx.fillStyle = p.green;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(C.shellCenterX, C.shellCenterY + C.shellOuterRadius);
  ctx.lineTo(C.shellCenterX, C.groundY - 18);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(
    C.shellCenterX,
    C.shellCenterY + C.shellOuterRadius,
    7,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.lineWidth = 4;
  for (const [x1, x2, y] of [
    [C.shellCenterX - 34, C.shellCenterX + 34, C.groundY],
    [C.shellCenterX - 22, C.shellCenterX + 22, C.groundY + 12],
    [C.shellCenterX - 10, C.shellCenterX + 10, C.groundY + 24]
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
  }
  text(
    ctx,
    '大地 (V=0)',
    C.shellCenterX + 42,
    C.groundY - 4,
    p.green,
    16,
    'left',
    700
  );
}
function drawOuterCharges(
  ctx: CanvasRenderingContext2D,
  state: ElectrostaticShieldingState,
  p: Palette
): void {
  const showPolarization = state.externalField && state.fieldSettled > 0.08;
  if (!showPolarization && state.outerNetCharge === 0) return;
  const count = 8;
  const leftAlpha = showPolarization
    ? Math.min(1, state.fieldSettled + 0.18)
    : 0.72;
  for (let index = 0; index < count; index += 1) {
    const angle = Math.PI * (0.64 + index * 0.105);
    const x = C.shellCenterX + Math.cos(angle) * (C.shellOuterRadius + 12);
    const y = C.shellCenterY + Math.sin(angle) * (C.shellOuterRadius + 12);
    ctx.globalAlpha = leftAlpha;
    ctx.fillStyle = p.teal;
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, '−', x, y + 1, '#fff', 16, 'center', 700);
  }
  if (showPolarization && !state.grounded)
    for (let index = 0; index < 5; index += 1) {
      const angle = Math.PI * (-0.36 + index * 0.18);
      const x = C.shellCenterX + Math.cos(angle) * (C.shellOuterRadius + 12);
      const y = C.shellCenterY + Math.sin(angle) * (C.shellOuterRadius + 12);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = p.red;
      ctx.beginPath();
      ctx.arc(x, y, 11, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, '+', x, y + 1, '#fff', 15, 'center', 700);
    }
  ctx.globalAlpha = 1;
}
function drawShell(
  ctx: CanvasRenderingContext2D,
  state: ElectrostaticShieldingState,
  p: Palette
): void {
  const cx = C.shellCenterX;
  const cy = C.shellCenterY;
  ctx.save();
  ctx.shadowColor = `${p.border}55`;
  ctx.shadowBlur = 18;
  ctx.fillStyle = p.metal;
  ctx.strokeStyle = p.metalEdge;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, C.shellOuterRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = p.card;
  ctx.strokeStyle = p.metalEdge;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, C.shellInnerRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (state.showGaussian) {
    ctx.strokeStyle = `${p.green}cc`;
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 6]);
    ctx.beginPath();
    ctx.arc(cx, cy, C.shellInnerRadius - 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    text(
      ctx,
      '高斯面  Σq=0',
      cx - 98,
      cy - C.shellInnerRadius - 18,
      p.green,
      15,
      'left',
      700
    );
  }
  if (state.cavityCharge && state.cavityChargeValue > 0) {
    ctx.strokeStyle = `${p.red}aa`;
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 6]);
    for (let index = 0; index < 16; index += 1) {
      const angle = (index / 16) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(
        cx + Math.cos(angle) * (C.shellInnerRadius - 13),
        cy + Math.sin(angle) * (C.shellInnerRadius - 13)
      );
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.fillStyle = p.red;
    ctx.shadowColor = `${p.red}88`;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(cx, cy, 23, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    text(ctx, '+', cx, cy - 1, '#fff', 24, 'center', 700);
    text(
      ctx,
      `+${state.cavityChargeValue.toFixed(1)}q`,
      cx + 34,
      cy - 24,
      p.red,
      18,
      'left',
      700
    );
    for (let index = 0; index < 16; index += 1) {
      const angle = (index / 16) * Math.PI * 2;
      const x = cx + Math.cos(angle) * (C.shellInnerRadius - 6);
      const y = cy + Math.sin(angle) * (C.shellInnerRadius - 6);
      ctx.fillStyle = p.teal;
      ctx.beginPath();
      ctx.arc(x, y, 11, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, '−', x, y + 1, '#fff', 14, 'center', 700);
    }
  }
  text(
    ctx,
    '金属导体壳层',
    cx - 58,
    cy - C.shellOuterRadius + 12,
    p.muted,
    14,
    'left',
    700
  );
}
function drawProbe(
  ctx: CanvasRenderingContext2D,
  state: ElectrostaticShieldingState,
  p: Palette
): void {
  if (!state.showProbe) return;
  const x = state.probeX;
  const y = state.probeY;
  const active = state.measuredField > 0;
  ctx.save();
  ctx.fillStyle = `${p.teal}18`;
  ctx.strokeStyle = `${p.teal}66`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.arc(x, y, 23, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
  arrow(
    ctx,
    x,
    y,
    x + (active ? 58 : 18),
    y - (active ? 22 : 0),
    active ? p.red : p.muted,
    4
  );
  text(ctx, 'E', x + 68, y - 24, active ? p.red : p.muted, 20, 'left', 700);
  text(ctx, state.region, x - 12, y + 50, p.ink, 14, 'center', 700);
  text(
    ctx,
    `${state.measuredField.toFixed(2)} V/m`,
    x + 28,
    y + 72,
    active ? p.red : p.teal,
    17,
    'center',
    700
  );
}
function drawHUD(
  ctx: CanvasRenderingContext2D,
  state: ElectrostaticShieldingState,
  p: Palette
): void {
  text(ctx, '静电平衡与屏蔽', 34, 34, p.ink, 21, 'left', 700);
  text(
    ctx,
    state.grounded ? '接地：V = 0' : '孤立导体',
    34,
    62,
    state.grounded ? p.green : p.muted,
    14,
    'left',
    700
  );
  const x = 40;
  const y = 704;
  const w = 620;
  const h = 38;
  ctx.fillStyle = `${p.card}ee`;
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1;
  rounded(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();
  text(
    ctx,
    state.showGaussian
      ? '导体内部 E = 0   ·   高斯面内 Σq = 0'
      : '导体内部 E = 0',
    x + 18,
    y + h / 2,
    p.ink,
    15,
    'left',
    700
  );
  text(
    ctx,
    state.status,
    C.baseWidth - 34,
    y + h / 2,
    p.teal,
    14,
    'right',
    700
  );
}

export function createElectrostaticShieldingView(
  options: CreateElectrostaticShieldingViewOptions = {}
) {
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode,
    demoHints: options.demoHints
  });
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
  function render(state: ElectrostaticShieldingState): void {
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
    drawGrid(ctx, p);
    drawExternalField(ctx, state, p);
    drawChargedPlate(ctx, p);
    drawShell(ctx, state, p);
    drawOuterCharges(ctx, state, p);
    if (state.grounded) drawGround(ctx, p);
    drawProbe(ctx, state, p);
    drawHUD(ctx, state, p);
    text(
      ctx,
      `E₀ = ${state.externalFieldStrength.toFixed(2)} V/m`,
      82,
      C.shellCenterY + 34,
      p.muted,
      tokens.controlFontPx / scale,
      'left',
      600
    );
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  function toBasePoint(
    clientX: number,
    clientY: number
  ): { x: number; y: number } | null {
    stage.ensureSized();
    const canvas = stage.canvas;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const scale =
      Math.min(width / C.baseWidth, height / C.baseHeight) *
      Math.min(1, stage.responsiveScale);
    const offsetX = (width - C.baseWidth * scale) / 2;
    const offsetY = (height - C.baseHeight * scale) / 2;
    return {
      x: clamp((clientX - rect.left - offsetX) / scale, 0, C.baseWidth),
      y: clamp((clientY - rect.top - offsetY) / scale, 0, C.baseHeight)
    };
  }
  return {
    render,
    resize() {
      stage.resize();
    },
    toBasePoint,
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
