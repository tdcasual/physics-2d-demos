import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  semicylinderStandardConstants as C,
  type SemicylinderStandardState
} from './scene.sim';

export type CreateSemicylinderStandardViewOptions = {
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
  glass: string;
  glassEdge: string;
  normal: string;
  incident: string;
  refracted: string;
  critical: string;
  panel: string;
  axis: string;
};
const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfcfd',
    grid: '#e7edf2',
    ink: '#253858',
    muted: '#8696aa',
    border: '#d4dce5',
    glass: '#dff1f7b8',
    glassEdge: '#4d86a8',
    normal: '#9cabbc',
    incident: '#ee3f50',
    refracted: '#1685c7',
    critical: '#16a58b',
    panel: '#ffffff',
    axis: '#7d8da0'
  },
  dark: {
    bg: '#101827',
    grid: '#27384f',
    ink: '#edf4ff',
    muted: '#a8b6c8',
    border: '#3e4d64',
    glass: '#244a62b8',
    glassEdge: '#75b9df',
    normal: '#7b8ca2',
    incident: '#ff707c',
    refracted: '#70b9f0',
    critical: '#4ed9c0',
    panel: '#172235',
    axis: '#9cafc4'
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
function card(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  p: Palette
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, C.cardRadius);
  ctx.fillStyle = `${p.panel}ed`;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}
function arrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dx: number,
  dy: number,
  color: string
): void {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + dx, y + dy);
  ctx.stroke();
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  ctx.beginPath();
  ctx.moveTo(x + dx, y + dy);
  ctx.lineTo(x + dx - ux * 16 + uy * 8, y + dy - uy * 16 - ux * 8);
  ctx.lineTo(x + dx - ux * 16 - uy * 8, y + dy - uy * 16 + ux * 8);
  ctx.closePath();
  ctx.fill();
}
function drawGrid(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, C.baseWidth, C.baseHeight);
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let x = 28; x < C.baseWidth; x += C.gridStep) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, C.baseHeight);
    ctx.stroke();
  }
  for (let y = 28; y < C.baseHeight; y += C.gridStep) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(C.baseWidth, y);
    ctx.stroke();
  }
}
function drawHeader(
  ctx: CanvasRenderingContext2D,
  state: SemicylinderStandardState,
  p: Palette
): void {
  text(ctx, '光的折射与全反射', 36, 34, p.ink, 25, 'left', 700);
  text(ctx, '半圆柱体 · 标准法线', 36, 64, p.muted, 15, 'left', 600);
  card(ctx, C.panelX, C.panelY, C.panelWidth, C.statusCardHeight, p);
  text(
    ctx,
    state.status,
    C.panelX + 24,
    C.panelY + 30,
    state.status === '全反射'
      ? p.incident
      : state.status === '临界角'
        ? p.critical
        : p.refracted,
    22,
    'left',
    700
  );
  text(
    ctx,
    `θ₁ ${state.incidentAngle.toFixed(1)}°  /  C ${state.criticalAngle.toFixed(1)}°`,
    C.panelX + 24,
    C.panelY + 68,
    p.muted,
    15,
    'left',
    600
  );
  text(
    ctx,
    state.status === '全反射'
      ? 'θ₁ > C'
      : state.status === '临界角'
        ? 'θ₁ = C'
        : 'θ₁ < C',
    C.panelX + C.panelWidth - 24,
    C.panelY + 48,
    p.ink,
    18,
    'right',
    700
  );
}
function drawSemicylinder(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = p.glass;
  ctx.beginPath();
  ctx.moveTo(C.centerX - C.radius, C.centerY);
  ctx.arc(C.centerX, C.centerY, C.radius, Math.PI, 0, false);
  ctx.lineTo(C.centerX - C.radius, C.centerY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = p.glassEdge;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(C.centerX - C.radius, C.centerY);
  ctx.arc(C.centerX, C.centerY, C.radius, Math.PI, 0, false);
  ctx.lineTo(C.centerX - C.radius, C.centerY);
  ctx.stroke();
  ctx.strokeStyle = p.axis;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(C.interfaceLeft, C.centerY);
  ctx.lineTo(C.interfaceRight, C.centerY);
  ctx.stroke();
  text(
    ctx,
    '玻璃 n',
    C.centerX + 136,
    C.centerY - 126,
    p.refracted,
    18,
    'center',
    700
  );
  text(
    ctx,
    '空气',
    C.centerX + 154,
    C.centerY + 96,
    p.muted,
    17,
    'center',
    700
  );
  text(ctx, 'O', C.centerX + 14, C.centerY + 20, p.ink, 18, 'left', 700);
}
function drawNormal(
  ctx: CanvasRenderingContext2D,
  state: SemicylinderStandardState,
  p: Palette
): void {
  if (!state.showNormal) return;
  ctx.strokeStyle = p.normal;
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.moveTo(C.centerX, C.centerY - C.normalLength / 2);
  ctx.lineTo(C.centerX, C.centerY + C.normalLength / 2);
  ctx.stroke();
  ctx.setLineDash([]);
  text(
    ctx,
    '法线',
    C.centerX + 16,
    C.centerY - C.normalLength / 2 + 18,
    p.normal,
    14,
    'left',
    600
  );
}
function drawRays(
  ctx: CanvasRenderingContext2D,
  state: SemicylinderStandardState,
  p: Palette
): void {
  const theta = (state.incidentAngle * Math.PI) / 180;
  const incidentDx = -Math.sin(theta) * C.rayLength;
  const incidentDy = -Math.cos(theta) * C.rayLength;
  const incidentColor = state.status === '临界角' ? p.critical : p.incident;
  arrow(ctx, C.centerX, C.centerY, incidentDx, incidentDy, incidentColor);
  text(
    ctx,
    `θ₁ ${state.incidentAngle.toFixed(1)}°`,
    C.centerX + incidentDx * 0.62 - 18,
    C.centerY + incidentDy * 0.62,
    incidentColor,
    15,
    'center',
    700
  );
  if (state.refractedAngle != null) {
    const refractedTheta = (state.refractedAngle * Math.PI) / 180;
    const refractedDx = Math.sin(refractedTheta) * C.refractedRayLength;
    const refractedDy = Math.cos(refractedTheta) * C.refractedRayLength;
    arrow(ctx, C.centerX, C.centerY, refractedDx, refractedDy, p.refracted);
    text(
      ctx,
      `θ₂ ${state.refractedAngle.toFixed(1)}°`,
      C.centerX + refractedDx * 0.62 + 18,
      C.centerY + refractedDy * 0.62,
      p.refracted,
      15,
      'center',
      700
    );
  } else {
    const reflectedDx = Math.sin(theta) * C.rayLength;
    const reflectedDy = -Math.cos(theta) * C.rayLength;
    arrow(ctx, C.centerX, C.centerY, reflectedDx, reflectedDy, p.critical);
    text(
      ctx,
      state.status === '临界角' ? '沿界面' : '反射光',
      C.centerX + reflectedDx * 0.58 + 22,
      C.centerY + reflectedDy * 0.58,
      p.critical,
      15,
      'center',
      700
    );
  }
  if (state.autoRun) {
    const pulseT = state.pulse;
    const pulseX =
      C.centerX +
      (state.refractedAngle != null
        ? Math.sin((state.refractedAngle * Math.PI) / 180) *
          C.refractedRayLength
        : Math.sin(theta) * C.rayLength) *
        pulseT;
    const pulseY =
      C.centerY +
      (state.refractedAngle != null
        ? Math.cos((state.refractedAngle * Math.PI) / 180) *
          C.refractedRayLength
        : -Math.cos(theta) * C.rayLength) *
        pulseT;
    ctx.fillStyle = state.refractedAngle != null ? p.refracted : p.critical;
    ctx.beginPath();
    ctx.arc(pulseX, pulseY, C.pulseRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}
function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: SemicylinderStandardState,
  p: Palette
): void {
  card(ctx, C.panelX, C.formulaCardY, C.panelWidth, C.formulaCardHeight, p);
  text(
    ctx,
    '斯涅尔定律',
    C.panelX + 24,
    C.formulaCardY + 28,
    p.ink,
    19,
    'left',
    700
  );
  text(
    ctx,
    'n · sin θ₁ = sin θ₂',
    C.panelX + 24,
    C.formulaCardY + 76,
    p.refracted,
    22,
    'left',
    700
  );
  text(
    ctx,
    `θ₂ = ${state.refractedAngle == null ? '—' : `${state.refractedAngle.toFixed(1)}°`}`,
    C.panelX + 24,
    C.formulaCardY + 122,
    p.ink,
    16,
    'left',
    600
  );
  text(
    ctx,
    `sin θ₂ = ${state.sinRefracted.toFixed(2)}`,
    C.panelX + 194,
    C.formulaCardY + 122,
    p.muted,
    15,
    'left',
    600
  );
  card(ctx, C.panelX, C.metricsCardY, C.panelWidth, C.metricsCardHeight, p);
  text(
    ctx,
    `n  ${state.refractiveIndex.toFixed(2)}`,
    C.panelX + 24,
    C.metricsCardY + 32,
    p.ink,
    17,
    'left',
    700
  );
  text(
    ctx,
    `θ₁  ${state.incidentAngle.toFixed(1)}°`,
    C.panelX + 200,
    C.metricsCardY + 32,
    p.incident,
    17,
    'left',
    700
  );
  text(
    ctx,
    `临界角 C  ${state.criticalAngle.toFixed(1)}°`,
    C.panelX + 24,
    C.metricsCardY + 76,
    p.critical,
    17,
    'left',
    700
  );
  text(
    ctx,
    state.status === '全反射'
      ? '界面无折射光'
      : state.status === '临界角'
        ? '折射光沿界面'
        : `折射角  ${state.refractedAngle?.toFixed(1)}°`,
    C.panelX + 24,
    C.metricsCardY + 126,
    state.status === '全反射' ? p.incident : p.refracted,
    17,
    'left',
    700
  );
}
function drawFooter(
  ctx: CanvasRenderingContext2D,
  state: SemicylinderStandardState,
  p: Palette
): void {
  card(ctx, C.panelX, C.noteCardY, C.panelWidth, C.noteCardHeight, p);
  text(
    ctx,
    '入射角 ≥ 临界角 → 全反射',
    C.panelX + 24,
    C.noteCardY + 34,
    p.ink,
    17,
    'left',
    700
  );
  text(
    ctx,
    '法线是角度基准',
    C.panelX + 24,
    C.noteCardY + 76,
    p.muted,
    15,
    'left',
    600
  );
  text(
    ctx,
    `t = ${state.time.toFixed(2)} s`,
    C.panelX + C.panelWidth - 24,
    C.noteCardY + 112,
    p.muted,
    14,
    'right',
    600
  );
}
function drawScene(
  ctx: CanvasRenderingContext2D,
  state: SemicylinderStandardState,
  p: Palette
): void {
  drawGrid(ctx, p);
  drawHeader(ctx, state, p);
  drawSemicylinder(ctx, p);
  drawNormal(ctx, state, p);
  drawRays(ctx, state, p);
  drawPanel(ctx, state, p);
  drawFooter(ctx, state, p);
}

export function createSemicylinderStandardView(
  options: CreateSemicylinderStandardViewOptions = {}
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
  function render(state: SemicylinderStandardState): void {
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
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
    drawScene(ctx, state, PALETTE[env.theme]);
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
