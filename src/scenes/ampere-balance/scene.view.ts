import { scaledSize } from '../../core/canvas-sizing';
import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  ampereBalanceConstants as C,
  unit,
  type AmpereBalanceState,
  type AmpereVector
} from './scene.sim';

export type CreateAmpereBalanceViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

export type Vec2 = AmpereVector;

export type PlaneLayout = {
  top: Vec2;
  end: Vec2;
  along: Vec2;
  normal: Vec2;
  rod: Vec2;
  theta: number;
};

export type ForceArrow = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: Vec2;
  visible: boolean;
};

type Palette = {
  bg: string;
  ink: string;
  muted: string;
  border: string;
  grid: string;
  red: string;
  blue: string;
  teal: string;
  gold: string;
  brown: string;
  plane: string;
  panel: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    ink: '#303744',
    muted: '#8b97a5',
    border: '#d3dbe4',
    grid: '#e5e9ee',
    red: '#ef4050',
    blue: '#3285d5',
    teal: '#1f9b8f',
    gold: '#ee950f',
    brown: '#8e7467',
    plane: '#f0eee8',
    panel: '#ffffff'
  },
  dark: {
    bg: '#101827',
    ink: '#eef2f7',
    muted: '#9eabbc',
    border: '#3c4b61',
    grid: '#2a3b54',
    red: '#fb7185',
    blue: '#60a5fa',
    teal: '#34d399',
    gold: '#fbbf24',
    brown: '#c0a091',
    plane: '#273246',
    panel: '#172235'
  }
};

function add(origin: Vec2, dir: Vec2, scale = 1): Vec2 {
  return { x: origin.x + dir.x * scale, y: origin.y + dir.y * scale };
}

export function planeLayout(angleDeg: number): PlaneLayout {
  const theta = (angleDeg * Math.PI) / 180;
  const along = { x: Math.cos(theta), y: Math.sin(theta) };
  const normal = { x: Math.sin(theta), y: -Math.cos(theta) };
  const top = { x: C.planeTopX, y: C.planeTopY };
  const run = Math.min(
    C.planeEndX - C.planeTopX,
    (C.planeBaseY - C.planeTopY) / Math.max(0.001, Math.tan(theta))
  );
  const end = {
    x: top.x + run,
    y: top.y + run * Math.tan(theta)
  };
  const rod = {
    x: top.x + (end.x - top.x) * C.blockT,
    y: top.y + (end.y - top.y) * C.blockT
  };
  return { top, end, along, normal, rod, theta };
}

function rayToFrame(origin: Vec2, dir: Vec2, pad: number): number {
  let t = Number.POSITIVE_INFINITY;
  if (dir.x > 1e-9) t = Math.min(t, (C.baseWidth - pad - origin.x) / dir.x);
  else if (dir.x < -1e-9) t = Math.min(t, (pad - origin.x) / dir.x);
  if (dir.y > 1e-9) t = Math.min(t, (C.baseHeight - pad - origin.y) / dir.y);
  else if (dir.y < -1e-9) t = Math.min(t, (pad - origin.y) / dir.y);
  return Number.isFinite(t) ? Math.max(0, t) : 0;
}

/** One px/N for G, Fₐ, Fₙ and f需 so shaft lengths keep physical ratios. */
export function commonForceScale(state: AmpereBalanceState): number {
  const origin = planeLayout(state.params.inclineAngle).rod;
  const forces: Vec2[] = [state.weightVector, state.ampereVector];
  if (state.normalForce > C.contactEps) forces.push(state.normalVector);
  if (state.frictionRequired > C.contactEps) forces.push(state.frictionVector);
  const pad = 22;
  let scale: number = C.vectorScale;
  for (const force of forces) {
    const mag = Math.hypot(force.x, force.y);
    if (mag < 1e-9) continue;
    const reach = rayToFrame(origin, unit(force), pad);
    if (reach > 8) scale = Math.min(scale, reach / mag);
  }
  return scale;
}

function arrowGeom(
  origin: Vec2,
  vector: Vec2,
  scale: number,
  alongHint: Vec2
): ForceArrow {
  const mag = Math.hypot(vector.x, vector.y);
  const visible = mag > C.contactEps;
  const u = mag > 1e-9 ? unit(vector) : alongHint;
  const shaft = { x: u.x * mag * scale, y: u.y * mag * scale };
  const tip = add(origin, shaft);
  const perp = { x: -u.y, y: u.x };
  const label = add(add(origin, shaft, 0.72), perp, 16);
  return {
    x1: origin.x,
    y1: origin.y,
    x2: tip.x,
    y2: tip.y,
    label,
    visible
  };
}

export function forceArrows(state: AmpereBalanceState): {
  g: ForceArrow;
  fa: ForceArrow;
  fn: ForceArrow;
  friction: ForceArrow;
  layout: PlaneLayout;
  scale: number;
} {
  const layout = planeLayout(state.params.inclineAngle);
  const o = layout.rod;
  const scale = commonForceScale(state);
  const frictionOrigin = add(o, layout.normal, C.frictionLift);
  return {
    layout,
    scale,
    g: arrowGeom(o, state.weightVector, scale, { x: 0, y: 1 }),
    fa: arrowGeom(o, state.ampereVector, scale, layout.along),
    fn: arrowGeom(o, state.normalVector, scale, layout.normal),
    friction: arrowGeom(
      frictionOrigin,
      state.frictionVector,
      scale,
      layout.along
    )
  };
}

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
  width: number,
  dashed = false
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (length < 2) return;
  const ux = dx / length;
  const uy = dy / length;
  const head = 12;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash(dashed ? [7, 6] : []);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2 - ux * head * 0.35, y2 - uy * head * 0.35);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - ux * head - uy * head * 0.45,
    y2 - uy * head + ux * head * 0.45
  );
  ctx.lineTo(
    x2 - ux * head + uy * head * 0.45,
    y2 - uy * head - ux * head * 0.45
  );
  ctx.closePath();
  ctx.fill();
}

function drawBackground(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, C.baseWidth, C.baseHeight);
}

function isAirSide(point: Vec2, layout: PlaneLayout): boolean {
  const relX = point.x - layout.top.x;
  const relY = point.y - layout.top.y;
  return relX * layout.normal.x + relY * layout.normal.y > 18;
}

function drawField(
  ctx: CanvasRenderingContext2D,
  state: AmpereBalanceState,
  p: Palette
): void {
  const dir = state.fieldVector;
  const mag = Math.hypot(dir.x, dir.y);
  if (mag < 1e-6 || state.params.magneticField < 0.05) return;
  const layout = planeLayout(state.params.inclineAngle);
  const half = C.fieldArrowLength * 0.5;
  for (
    let x = C.fieldPad;
    x < C.baseWidth - C.fieldPad;
    x += C.fieldColumnGap
  ) {
    for (let y = C.fieldPad; y < C.planeBaseY - 24; y += C.fieldRowGap) {
      if (!isAirSide({ x, y }, layout)) continue;
      arrow(
        ctx,
        x - dir.x * half,
        y - dir.y * half,
        x + dir.x * half,
        y + dir.y * half,
        p.blue,
        2.4,
        true
      );
    }
  }
}

function drawIncline(
  ctx: CanvasRenderingContext2D,
  layout: PlaneLayout,
  angle: number,
  p: Palette,
  font: (n: number) => number
): void {
  ctx.fillStyle = p.plane;
  ctx.beginPath();
  ctx.moveTo(layout.top.x, layout.top.y);
  ctx.lineTo(layout.end.x, layout.end.y);
  ctx.lineTo(layout.end.x, C.planeBaseY);
  ctx.lineTo(layout.top.x, C.planeBaseY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(layout.top.x, layout.top.y);
  ctx.lineTo(layout.end.x, layout.end.y);
  ctx.lineTo(layout.end.x + 28, C.planeBaseY);
  ctx.moveTo(layout.top.x - 20, C.planeBaseY);
  ctx.lineTo(layout.end.x + 40, C.planeBaseY);
  ctx.stroke();
  const footX = layout.end.x - 48;
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(footX, C.planeBaseY, 28, -Math.PI, -Math.PI + layout.theta, false);
  ctx.stroke();
  text(
    ctx,
    `θ = ${angle.toFixed(0)}°`,
    footX + 36,
    C.planeBaseY - 22,
    p.red,
    font(15),
    'left',
    700
  );
}

function drawForces(
  ctx: CanvasRenderingContext2D,
  state: AmpereBalanceState,
  p: Palette,
  font: (n: number) => number
): void {
  const arrows = forceArrows(state);
  const { layout } = arrows;
  const rod = layout.rod;
  const drawOne = (
    geom: ForceArrow,
    color: string,
    label: string,
    dashed = false
  ) => {
    if (!geom.visible) return;
    arrow(
      ctx,
      geom.x1,
      geom.y1,
      geom.x2,
      geom.y2,
      color,
      dashed ? 3.5 : 5,
      dashed
    );
    text(
      ctx,
      label,
      geom.label.x,
      geom.label.y,
      color,
      font(16),
      'center',
      700
    );
  };
  drawOne(arrows.g, p.brown, 'G');
  if (!state.detached) drawOne(arrows.fn, p.teal, 'Fₙ');
  drawOne(arrows.fa, p.red, 'Fₐ');
  if (arrows.friction.visible && state.frictionRequired > C.contactEps) {
    drawOne(arrows.friction, p.gold, 'f需', true);
  }
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 1.8;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(rod.x, rod.y);
  ctx.lineTo(
    rod.x + layout.along.x * C.axisDashLength,
    rod.y + layout.along.y * C.axisDashLength
  );
  ctx.stroke();
  ctx.setLineDash([]);
  text(
    ctx,
    '+x',
    rod.x + layout.along.x * C.axisLabelDistance,
    rod.y + layout.along.y * C.axisLabelDistance,
    p.muted,
    font(12),
    'center'
  );

  ctx.fillStyle = p.panel;
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(rod.x, rod.y, C.blockRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  text(
    ctx,
    state.params.currentDirection === 'out' ? '⊙' : '⊗',
    rod.x,
    rod.y,
    p.red,
    font(20),
    'center',
    700
  );
}

export function createAmpereBalanceView(
  options: CreateAmpereBalanceViewOptions = {}
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
  let snapshot: AmpereBalanceState | null = null;
  function draw(state: AmpereBalanceState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(width / C.baseWidth, height / C.baseHeight);
    const offsetX = (width - C.baseWidth * fit) / 2;
    const offsetY = (height - C.baseHeight * fit) / 2;
    const rs = stage.responsiveScale;
    const typeScale = env.fontScale() * Math.min(env.contentScale(), 1.25);
    const font = (base: number): number =>
      scaledSize(base * typeScale, Math.max(rs, 0.3), 10) / Math.max(fit, 0.05);
    const p = PALETTE[env.theme];
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fit, fit);
    drawBackground(ctx, p);
    drawField(ctx, state, p);
    const layout = planeLayout(state.params.inclineAngle);
    drawIncline(ctx, layout, state.params.inclineAngle, p, font);
    drawForces(ctx, state, p, font);
    ctx.restore();
  }
  return {
    render(state: AmpereBalanceState): void {
      snapshot = state;
      stage.ensureSized();
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
