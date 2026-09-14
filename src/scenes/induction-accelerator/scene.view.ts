import { getRenderTokens } from '../../platform/standards';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  inductionAcceleratorConstants as C,
  type InductionAcceleratorState
} from './scene.sim';
export type CreateInductionAcceleratorViewOptions = {
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
  core: string;
  teal: string;
  red: string;
  blue: string;
  card: string;
};
const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#ffffff',
    grid: '#e2e7eb',
    ink: '#303944',
    muted: '#82909d',
    border: '#b7c0c8',
    core: '#d9dfe3',
    teal: '#48b6ad',
    red: '#ef4755',
    blue: '#49bfe4',
    card: '#ffffff'
  },
  dark: {
    bg: '#101923',
    grid: '#253440',
    ink: '#eef3f7',
    muted: '#a3b2bc',
    border: '#71818c',
    core: '#33434d',
    teal: '#60d2c3',
    red: '#ff6170',
    blue: '#63d4ef',
    card: '#1b2b35'
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
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let x = 22; x < C.baseWidth; x += C.gridStep) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, C.baseHeight);
    ctx.stroke();
  }
  for (let y = 22; y < C.baseHeight; y += C.gridStep) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(C.baseWidth, y);
    ctx.stroke();
  }
}
function drawMagnet(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = `${p.core}88`;
  ctx.beginPath();
  ctx.arc(C.centerX, C.centerY, C.orbitRadius + 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = p.core;
  ctx.beginPath();
  ctx.arc(C.centerX, C.centerY, C.coreRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 3;
  ctx.stroke();
}
function drawFieldMarks(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = p.border;
  ctx.globalAlpha = 0.85;
  for (
    let x = C.centerX - C.fieldMarkExtent;
    x <= C.centerX + C.fieldMarkExtent;
    x += C.fieldMarkStep
  )
    for (
      let y = C.centerY - C.fieldMarkExtent;
      y <= C.centerY + C.fieldMarkExtent;
      y += C.fieldMarkStep
    ) {
      if (Math.hypot(x - C.centerX, y - C.centerY) > C.coreRadius - 18)
        continue;
      text(ctx, '×', x, y, p.border, 21, 'center', 700);
    }
  ctx.globalAlpha = 1;
}
function drawCircularFields(
  ctx: CanvasRenderingContext2D,
  state: InductionAcceleratorState,
  p: Palette
): void {
  ctx.strokeStyle = p.teal;
  ctx.lineWidth = 2.5;
  ctx.setLineDash([C.ringDash, C.ringDash]);
  for (const radius of [C.innerRingRadius, C.orbitRadius]) {
    ctx.beginPath();
    ctx.arc(C.centerX, C.centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  for (const radius of [C.innerRingRadius, C.orbitRadius])
    for (let index = 0; index < 8; index += 1) {
      const angle =
        (index / 8) * Math.PI * 2 + state.time * 0.2 * state.fieldDirection;
      const x1 = C.centerX + Math.cos(angle) * radius;
      const y1 = C.centerY + Math.sin(angle) * radius;
      const x2 =
        C.centerX + Math.cos(angle + 0.16 * state.fieldDirection) * radius;
      const y2 =
        C.centerY + Math.sin(angle + 0.16 * state.fieldDirection) * radius;
      arrow(ctx, x1, y1, x2, y2, p.teal, 2);
    }
}
function drawElectron(
  ctx: CanvasRenderingContext2D,
  state: InductionAcceleratorState,
  p: Palette
): void {
  const x = C.centerX + Math.cos(state.angle) * C.orbitRadius;
  const y = C.centerY + Math.sin(state.angle) * C.orbitRadius;
  ctx.fillStyle = '#397da4';
  ctx.shadowColor = `${p.blue}99`;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(x, y, C.particleRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  text(ctx, 'e⁻', x + 16, y + 18, p.ink, 17, 'left', 700);
  if (!state.showVectors) return;
  const tangent = {
    x: -Math.sin(state.angle) * state.fieldDirection,
    y: Math.cos(state.angle) * state.fieldDirection
  };
  arrow(ctx, x, y, x + tangent.x * 58, y + tangent.y * 58, p.red, 4);
  text(
    ctx,
    'v',
    x + tangent.x * 72,
    y + tangent.y * 72,
    p.red,
    18,
    'center',
    700
  );
  arrow(ctx, x, y, x - tangent.x * 44, y - tangent.y * 44, p.blue, 4);
  text(
    ctx,
    'F电',
    x - tangent.x * 58,
    y - tangent.y * 58,
    p.blue,
    16,
    'center',
    700
  );
  const radial = {
    x: (C.centerX - x) / C.orbitRadius,
    y: (C.centerY - y) / C.orbitRadius
  };
  arrow(ctx, x, y, x + radial.x * 66, y + radial.y * 66, p.ink, 4);
  text(
    ctx,
    'F洛',
    x + radial.x * 82,
    y + radial.y * 82,
    p.ink,
    16,
    'center',
    700
  );
}
function drawHUD(
  ctx: CanvasRenderingContext2D,
  state: InductionAcceleratorState,
  p: Palette
): void {
  text(ctx, '电子感应加速器', 32, 34, p.ink, 23, 'left', 700);
  text(
    ctx,
    `ΔB/Δt = ${state.dBdt.toFixed(1)} T/s`,
    32,
    64,
    p.red,
    15,
    'left',
    700
  );
  const x = 36;
  const y = C.baseHeight - 72;
  const w = 650;
  const h = 42;
  ctx.fillStyle = `${p.card}ed`;
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();
  text(
    ctx,
    `B内均 = ${state.innerB.toFixed(2)} T   ·   B轨 = ${state.orbitB.toFixed(2)} T   ·   B轨 = ½ B内均`,
    x + 16,
    y + h / 2,
    p.ink,
    14,
    'left',
    700
  );
  text(
    ctx,
    state.status,
    C.baseWidth - 30,
    y + h / 2,
    p.teal,
    14,
    'right',
    700
  );
}
export function createInductionAcceleratorView(
  options: CreateInductionAcceleratorViewOptions = {}
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
  function render(state: InductionAcceleratorState): void {
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
    drawMagnet(ctx, p);
    drawFieldMarks(ctx, p);
    drawCircularFields(ctx, state, p);
    drawElectron(ctx, state, p);
    drawHUD(ctx, state, p);
    text(
      ctx,
      `v = ${(state.speed / 1e7).toFixed(2)} ×10⁷ m/s`,
      C.baseWidth - 30,
      C.baseHeight - 34,
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
