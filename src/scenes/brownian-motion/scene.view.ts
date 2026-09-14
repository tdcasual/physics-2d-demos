import { getRenderTokens } from '../../platform/standards';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { brownianConstants as C, type BrownianState } from './scene.sim';

export type CreateBrownianViewOptions = {
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
  molecule: string;
  particle: string;
  trail: string;
  force: string;
  card: string;
};
const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#ffffff',
    grid: '#dfe6eb',
    ink: '#303944',
    muted: '#8995a0',
    border: '#36414c',
    molecule: '#6ca6bf',
    particle: '#f6a23a',
    trail: '#f06b72',
    force: '#ef4451',
    card: '#ffffff'
  },
  dark: {
    bg: '#101923',
    grid: '#2a3b46',
    ink: '#eef3f7',
    muted: '#a1b2bc',
    border: '#c1cbd0',
    molecule: '#77bdd5',
    particle: '#ffb44d',
    trail: '#ff7880',
    force: '#ff5d6a',
    card: '#1b2a34'
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
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, C.baseWidth, C.baseHeight);
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  ctx.setLineDash([8, 10]);
  ctx.beginPath();
  ctx.moveTo(C.chamberCenterX, 26);
  ctx.lineTo(C.chamberCenterX, C.baseHeight - 26);
  ctx.moveTo(24, C.chamberCenterY);
  ctx.lineTo(C.baseWidth - 24, C.chamberCenterY);
  ctx.stroke();
  ctx.setLineDash([]);
}
function moleculePoint(index: number): { x: number; y: number } {
  let value = (index + 1) * C.moleculeSeedMultiplier;
  value = (value ^ (value >>> 16)) >>> 0;
  const angle = (value / C.moleculeUintScale) * Math.PI * 2;
  const radius =
    Math.sqrt(
      ((value * C.moleculeHashMultiplier + C.moleculeHashIncrement) >>> 0) /
        C.moleculeUintScale
    ) *
    (C.chamberRadius - 16);
  return {
    x: C.chamberCenterX + Math.cos(angle) * radius,
    y: C.chamberCenterY + Math.sin(angle) * radius
  };
}
function drawChamber(ctx: CanvasRenderingContext2D, p: Palette): void {
  const gradient = ctx.createRadialGradient(
    C.chamberCenterX - 90,
    C.chamberCenterY - 120,
    20,
    C.chamberCenterX,
    C.chamberCenterY,
    C.chamberRadius
  );
  gradient.addColorStop(0, `${p.card}ff`);
  gradient.addColorStop(1, `${p.grid}45`);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(C.chamberCenterX, C.chamberCenterY, C.chamberRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 5;
  ctx.stroke();
}
function drawMolecules(
  ctx: CanvasRenderingContext2D,
  state: BrownianState,
  p: Palette
): void {
  if (!state.showMolecules) return;
  ctx.fillStyle = p.molecule;
  ctx.globalAlpha = 0.86;
  for (let index = 0; index < C.moleculeCount; index += 1) {
    const base = moleculePoint(index);
    const phase = state.time * (1.3 + (index % 9) * 0.07) + index * 0.23;
    const x = base.x + Math.sin(phase) * (1.5 + state.temperature * 0.03);
    const y =
      base.y + Math.cos(phase * 1.17) * (1.5 + state.temperature * 0.03);
    ctx.beginPath();
    ctx.arc(x, y, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
function drawTrail(
  ctx: CanvasRenderingContext2D,
  state: BrownianState,
  p: Palette
): void {
  if (!state.showTrail || state.trail.length < 2) return;
  ctx.strokeStyle = p.trail;
  ctx.globalAlpha = 0.82;
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 7]);
  ctx.beginPath();
  state.trail.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}
function drawParticle(
  ctx: CanvasRenderingContext2D,
  state: BrownianState,
  p: Palette
): void {
  const radius = 12 + state.particleRadius * 0.65;
  const gradient = ctx.createRadialGradient(
    state.particleX - radius * 0.35,
    state.particleY - radius * 0.4,
    2,
    state.particleX,
    state.particleY,
    radius
  );
  gradient.addColorStop(0, '#ffd16a');
  gradient.addColorStop(1, p.particle);
  ctx.fillStyle = gradient;
  ctx.shadowColor = `${p.particle}99`;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(state.particleX, state.particleY, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}
function drawForce(
  ctx: CanvasRenderingContext2D,
  state: BrownianState,
  p: Palette
): void {
  if (!state.showForce) return;
  const scale = 48 + state.netForce * 22;
  arrow(
    ctx,
    state.particleX,
    state.particleY,
    state.particleX + state.forceX * scale,
    state.particleY + state.forceY * scale,
    p.force,
    5
  );
  text(
    ctx,
    'F合',
    state.particleX + state.forceX * scale + 14,
    state.particleY + state.forceY * scale - 8,
    p.force,
    16,
    'left',
    700
  );
}
function drawHUD(
  ctx: CanvasRenderingContext2D,
  state: BrownianState,
  p: Palette
): void {
  text(ctx, '布朗运动微观机制', 34, 34, p.ink, 22, 'left', 700);
  text(ctx, '显微镜视野', 34, 63, p.muted, 14, 'left', 600);
  const x = 42;
  const y = C.baseHeight - 78;
  const w = 610;
  const h = 44;
  ctx.fillStyle = `${p.card}ed`;
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();
  text(
    ctx,
    `v̄ = ${state.molecularSpeed.toFixed(2)} a.u.   ·   撞击 ${state.instantCollisions} 次/帧`,
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
    p.force,
    14,
    'right',
    700
  );
}
export function createBrownianView(options: CreateBrownianViewOptions = {}) {
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
  function render(state: BrownianState): void {
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
    const p = PALETTE[env.theme];
    const tokens = getRenderTokens(scale);
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
    ctx.clearRect(0, 0, C.baseWidth, C.baseHeight);
    drawGrid(ctx, p);
    drawChamber(ctx, p);
    drawMolecules(ctx, state, p);
    drawTrail(ctx, state, p);
    drawParticle(ctx, state, p);
    drawForce(ctx, state, p);
    drawHUD(ctx, state, p);
    text(
      ctx,
      `r = ${state.particleRadius.toFixed(0)} μm`,
      C.baseWidth - 38,
      C.baseHeight - 32,
      p.muted,
      tokens.controlFontPx / scale,
      'right',
      600
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
