import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { tirConstants, type TirState } from './scene.sim';

export type CreateTirViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};
type Palette = {
  bg: string;
  grid: string;
  card: string;
  ink: string;
  muted: string;
  axis: string;
  ray: string;
  teal: string;
  border: string;
};
const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfcfd',
    grid: '#e7edf2',
    card: '#fff',
    ink: '#303744',
    muted: '#8795a7',
    axis: '#35404a',
    ray: '#ef4050',
    teal: '#18a58a',
    border: '#d8e0e8'
  },
  dark: {
    bg: '#101827',
    grid: '#2b3b52',
    card: '#172235',
    ink: '#eef2f7',
    muted: '#aab6c8',
    axis: '#dbe5ef',
    ray: '#fb7185',
    teal: '#34d399',
    border: '#3c4b61'
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
  w: number,
  h: number,
  p: Palette
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 13);
  ctx.fillStyle = p.card;
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
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const px = -uy;
  const py = ux;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + dx, y + dy);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + dx, y + dy);
  ctx.lineTo(x + dx - ux * 14 + px * 7, y + dy - uy * 14 + py * 7);
  ctx.lineTo(x + dx - ux * 14 - px * 7, y + dy - uy * 14 - py * 7);
  ctx.closePath();
  ctx.fill();
}
function drawGrid(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, tirConstants.fieldWidth, tirConstants.baseHeight);
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let x = 0; x <= tirConstants.fieldWidth; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, tirConstants.baseHeight);
    ctx.stroke();
  }
  for (let y = 0; y <= tirConstants.baseHeight; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(tirConstants.fieldWidth, y);
    ctx.stroke();
  }
}
function pointFor(state: TirState): { x: number; y: number; theta: number } {
  const theta = state.incidentAngle;
  return {
    x: tirConstants.centerX + tirConstants.radius * Math.cos(theta),
    y: tirConstants.centerY - tirConstants.radius * Math.sin(theta),
    theta
  };
}
function drawSemicylinder(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  scale: number,
  state: TirState
): void {
  ctx.fillStyle = 'rgba(94, 164, 214, 0.18)';
  ctx.strokeStyle = p.axis;
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  ctx.moveTo(tirConstants.centerX, tirConstants.centerY - tirConstants.radius);
  ctx.arc(
    tirConstants.centerX,
    tirConstants.centerY,
    tirConstants.radius,
    -Math.PI / 2,
    Math.PI / 2
  );
  ctx.lineTo(tirConstants.centerX, tirConstants.centerY - tirConstants.radius);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = p.muted;
  ctx.setLineDash([8 * scale, 8 * scale]);
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(tirConstants.axisLeft, tirConstants.centerY);
  ctx.lineTo(tirConstants.axisRight, tirConstants.centerY);
  ctx.stroke();
  ctx.setLineDash([]);
  text(
    ctx,
    `玻璃介质 n=${state.refractiveIndex.toFixed(2)}`,
    tirConstants.centerX + 112,
    tirConstants.centerY + 12,
    p.muted,
    15 * scale,
    'center',
    700
  );
  text(
    ctx,
    'O',
    tirConstants.centerX - 12,
    tirConstants.centerY + 28,
    p.axis,
    15 * scale,
    'right',
    700
  );
}
function drawCriticalLine(
  ctx: CanvasRenderingContext2D,
  state: TirState,
  p: Palette,
  scale: number
): void {
  const y =
    tirConstants.centerY -
    tirConstants.radius * (state.criticalHeight / state.radius);
  ctx.strokeStyle = p.teal;
  ctx.lineWidth = 2 * scale;
  ctx.setLineDash([10 * scale, 8 * scale]);
  ctx.beginPath();
  ctx.moveTo(tirConstants.criticalLineLeft, y);
  ctx.lineTo(tirConstants.criticalLineRight, y);
  ctx.stroke();
  ctx.setLineDash([]);
  text(ctx, '全反射临界线（hᶜ）', 170, y - 15, p.teal, 14 * scale, 'left', 700);
}
function drawRays(
  ctx: CanvasRenderingContext2D,
  state: TirState,
  p: Palette,
  scale: number
): void {
  const point = pointFor(state);
  const rayY = point.y;
  const sourceX = tirConstants.axisLeft;
  arrow(ctx, sourceX, rayY, point.x - sourceX, 0, p.ray);
  ctx.strokeStyle = p.axis;
  ctx.lineWidth = 2 * scale;
  ctx.setLineDash([6 * scale, 7 * scale]);
  ctx.beginPath();
  ctx.moveTo(tirConstants.centerX, tirConstants.centerY);
  ctx.lineTo(point.x, point.y);
  ctx.stroke();
  ctx.setLineDash([]);
  if (state.refractedAngle == null) {
    const reflectedAngle = Math.PI + 2 * point.theta;
    arrow(
      ctx,
      point.x,
      point.y,
      tirConstants.rayLength * Math.cos(reflectedAngle),
      tirConstants.rayLength * Math.sin(reflectedAngle),
      p.ray
    );
    text(
      ctx,
      '全反射',
      point.x - 80,
      point.y + 46,
      p.ray,
      16 * scale,
      'center',
      700
    );
  } else {
    const outgoingAngle = point.theta - state.refractedAngle;
    arrow(
      ctx,
      point.x,
      point.y,
      tirConstants.rayLength * Math.cos(outgoingAngle),
      tirConstants.rayLength * Math.sin(outgoingAngle),
      p.ray
    );
    text(
      ctx,
      '折射光',
      point.x + 82,
      point.y + 38,
      p.ray,
      14 * scale,
      'center',
      700
    );
  }
  ctx.fillStyle = p.ray;
  ctx.beginPath();
  ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
  ctx.fill();
  text(
    ctx,
    `θ₁=${((state.incidentAngle * 180) / Math.PI).toFixed(1)}°`,
    point.x + 34,
    point.y - 52,
    p.ray,
    13 * scale,
    'left',
    700
  );
}
function drawReadout(
  ctx: CanvasRenderingContext2D,
  state: TirState,
  p: Palette,
  scale: number
): void {
  card(ctx, 36, 548, 740, 138, p);
  text(ctx, '实时数据', 58, 572, p.ink, 16 * scale, 'left', 700);
  const items = [
    [`临界角 θc`, `${((state.criticalAngle * 180) / Math.PI).toFixed(1)}°`],
    [`当前入射角 θ₁`, `${((state.incidentAngle * 180) / Math.PI).toFixed(1)}°`],
    [`临界高度 hᶜ`, `${state.criticalHeight.toFixed(2)} cm`],
    [
      `折射角 θ₂`,
      state.refractedAngle == null
        ? '—'
        : `${((state.refractedAngle * 180) / Math.PI).toFixed(1)}°`
    ]
  ];
  items.forEach(([label, value], index) => {
    const x = 58 + (index % 2) * 330;
    const y = 606 + Math.floor(index / 2) * 38;
    text(ctx, label, x, y, p.muted, 12 * scale, 'left', 600);
    text(
      ctx,
      value,
      x + 176,
      y,
      index === 0 || index === 2 ? p.teal : p.ink,
      15 * scale,
      'right',
      700
    );
  });
  text(
    ctx,
    state.status,
    730,
    572,
    state.refractedAngle == null ? p.ray : p.teal,
    14 * scale,
    'right',
    700
  );
}

export function createTirView(options: CreateTirViewOptions = {}) {
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: {
      mode: 'clamped',
      fallbackWidth: tirConstants.baseWidth,
      fallbackHeight: tirConstants.baseHeight
    },
    initialWidth: tirConstants.baseWidth,
    initialHeight: tirConstants.baseHeight,
    eagerContext: true
  });
  let snapshot: TirState | null = null;
  function draw(state: TirState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(
      width / tirConstants.baseWidth,
      height / tirConstants.baseHeight
    );
    const offsetX = Math.max(0, (width - tirConstants.baseWidth * fit) / 2);
    const offsetY = Math.max(0, (height - tirConstants.baseHeight * fit) / 2);
    const scale = env.contentScale() * stage.responsiveScale;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fit, fit);
    const palette = PALETTE[env.theme];
    drawGrid(ctx, palette);
    text(ctx, '半圆柱光路分析', 28, 38, palette.ink, 24 * scale, 'left', 700);
    drawSemicylinder(ctx, palette, scale, state);
    drawCriticalLine(ctx, state, palette, scale);
    drawRays(ctx, state, palette, scale);
    drawReadout(ctx, state, palette, scale);
    text(
      ctx,
      '调节入射高度，比较 θ₁ 与 θc',
      36,
      724,
      palette.muted,
      14 * scale,
      'left',
      600
    );
    ctx.restore();
  }
  return {
    render(state: TirState) {
      snapshot = state;
      stage.ensureSized();
      draw(state);
    },
    resize() {
      stage.resize();
      if (snapshot) draw(snapshot);
    },
    setTheme(theme: TeachingTheme) {
      env.setTheme(theme);
      if (snapshot) draw(snapshot);
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints) {
      env.setMode(mode, hints);
      if (snapshot) draw(snapshot);
    },
    dispose() {
      snapshot = null;
      stage.release();
    }
  };
}
