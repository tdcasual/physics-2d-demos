import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  diagramFitScale,
  forceCompositionConstants,
  inclineGeometry,
  stageLayoutFrom,
  stageTransform,
  type ForceCompositionState,
  type Vector
} from './scene.sim';

export type CreateForceCompositionViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

const {
  stageWidth: STAGE_W,
  stageHeight: STAGE_H,
  drawWidth: DRAW_W,
  origin: ORIGIN,
  vectorScale: VECTOR_SCALE
} = forceCompositionConstants;
const HANDLE_RADIUS = 10;
const SYNTH_ARC_R = 35;
const RANGE_ARC_R = 30;
const ORTHO_ARC_R = 25;
const WEDGE_ARC_R = 40;

type Palette = {
  bg: string;
  grid: string;
  ink: string;
  muted: string;
  red: string;
  blue: string;
  teal: string;
  fx: string;
  fy: string;
  wedge: string;
  wedgeStroke: string;
  proj: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#FAF7F2',
    grid: 'rgba(52,58,64,0.15)',
    ink: '#343A40',
    muted: '#64748B',
    red: '#E63946',
    blue: '#1E88E5',
    teal: '#2A9D8F',
    fx: '#D62828',
    fy: '#0077B6',
    wedge: 'rgba(255,245,157,0.3)',
    wedgeStroke: '#8D6E63',
    proj: '#334155'
  },
  dark: {
    bg: '#0f172a',
    grid: 'rgba(148,163,184,0.14)',
    ink: '#e2e8f0',
    muted: '#94a3b8',
    red: '#fb7185',
    blue: '#60a5fa',
    teal: '#34d399',
    fx: '#f87171',
    fy: '#38bdf8',
    wedge: 'rgba(250,204,21,0.16)',
    wedgeStroke: '#c4a484',
    proj: '#94a3b8'
  }
};

function drawArrow(
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
  if (length < 0.5) return;
  const ux = dx / length;
  const uy = dy / length;
  const head = Math.min(14, Math.max(6, width * 4.8));
  const wing = head * 0.48;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dashed ? [5, 5] : []);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - ux * head - uy * wing, y2 - uy * head + ux * wing);
  ctx.lineTo(x2 - ux * head + uy * wing, y2 - uy * head - ux * wing);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function scaledEndpoint(v: Vector, fit: number): { x: number; y: number } {
  return {
    x: ORIGIN.x + v.x * VECTOR_SCALE * fit,
    y: ORIGIN.y - v.y * VECTOR_SCALE * fit
  };
}

function clampLabel(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.min(DRAW_W - 12, Math.max(12, x)),
    y: Math.min(STAGE_H - 16, Math.max(16, y))
  };
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  size: number,
  align: CanvasTextAlign = 'left'
): void {
  const p = clampLabel(x, y);
  ctx.fillStyle = color;
  ctx.font = `bold ${size}px sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, p.x, p.y);
}

function drawOriginAngle(
  ctx: CanvasRenderingContext2D,
  angle: number,
  radius: number,
  color: string,
  dashed: boolean
): void {
  const theta = (angle * Math.PI) / 180;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash(dashed ? [3, 2] : []);
  ctx.beginPath();
  ctx.arc(ORIGIN.x, ORIGIN.y, radius, 0, -theta, true);
  ctx.stroke();
  ctx.setLineDash([]);
  const labelR = radius + 14;
  drawLabel(
    ctx,
    'θ',
    ORIGIN.x + labelR * Math.cos(theta / 2),
    ORIGIN.y - labelR * Math.sin(theta / 2),
    color,
    12,
    'center'
  );
  ctx.restore();
}

function drawHandle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string
): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.arc(x, y, HANDLE_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, HANDLE_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function labelBeyond(
  ctx: CanvasRenderingContext2D,
  text: string,
  from: { x: number; y: number },
  tip: { x: number; y: number },
  color: string,
  size: number
): void {
  const dx = tip.x - from.x;
  const dy = tip.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  drawLabel(
    ctx,
    text,
    tip.x + (dx / len) * 16,
    tip.y + (dy / len) * 16,
    color,
    size
  );
}

export function createForceCompositionView(
  options: CreateForceCompositionViewOptions = {}
) {
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: {
      mode: 'clamped',
      fallbackWidth: STAGE_W,
      fallbackHeight: STAGE_H
    },
    initialWidth: STAGE_W,
    initialHeight: STAGE_H,
    eagerContext: true
  });
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  let snapshot: ForceCompositionState | null = null;

  function renderSynthesis(
    ctx: CanvasRenderingContext2D,
    state: ForceCompositionState,
    p: Palette,
    fit: number
  ): void {
    const a = scaledEndpoint(state.f1, fit);
    const b = scaledEndpoint(state.f2, fit);
    const r = scaledEndpoint(state.resultant, fit);
    ctx.fillStyle = p.ink;
    ctx.beginPath();
    ctx.arc(ORIGIN.x, ORIGIN.y, 5, 0, Math.PI * 2);
    ctx.fill();
    drawLabel(ctx, 'O', ORIGIN.x - 15, ORIGIN.y + 15, p.ink, 14);
    drawArrow(ctx, ORIGIN.x, ORIGIN.y, a.x, a.y, p.red, 3);
    drawArrow(ctx, ORIGIN.x, ORIGIN.y, b.x, b.y, p.blue, 3);
    drawArrow(ctx, ORIGIN.x, ORIGIN.y, r.x, r.y, p.teal, 4);
    if (state.params.rule === 'triangle') {
      drawArrow(ctx, a.x, a.y, r.x, r.y, p.blue, 2.5, true);
      drawLabel(
        ctx,
        'F₂′',
        (a.x + r.x) / 2 + 8,
        (a.y + r.y) / 2 - 8,
        p.blue,
        13
      );
    } else {
      drawArrow(ctx, a.x, a.y, r.x, r.y, p.blue, 1.5, true);
      drawArrow(ctx, b.x, b.y, r.x, r.y, p.red, 1.5, true);
    }
    drawOriginAngle(ctx, state.params.angle, SYNTH_ARC_R, p.muted, true);
    labelBeyond(ctx, 'F₁', ORIGIN, a, p.red, 14);
    labelBeyond(ctx, 'F₂', ORIGIN, b, p.blue, 14);
    labelBeyond(ctx, 'F合', ORIGIN, r, p.teal, 15);
    drawHandle(ctx, a.x, a.y, p.red);
    drawHandle(ctx, b.x, b.y, p.blue);
  }

  function renderRange(
    ctx: CanvasRenderingContext2D,
    state: ForceCompositionState,
    p: Palette,
    fit: number
  ): void {
    const a = scaledEndpoint(state.f1, fit);
    const b = scaledEndpoint(state.f2, fit);
    const r = scaledEndpoint(state.resultant, fit);
    ctx.fillStyle = p.ink;
    ctx.beginPath();
    ctx.arc(ORIGIN.x, ORIGIN.y, 5, 0, Math.PI * 2);
    ctx.fill();
    drawLabel(ctx, 'O', ORIGIN.x - 15, ORIGIN.y + 15, p.ink, 14);
    drawArrow(ctx, ORIGIN.x, ORIGIN.y, a.x, a.y, p.red, 3);
    drawArrow(ctx, ORIGIN.x, ORIGIN.y, b.x, b.y, p.blue, 3);
    drawArrow(ctx, ORIGIN.x, ORIGIN.y, r.x, r.y, p.teal, 4);
    drawArrow(ctx, a.x, a.y, r.x, r.y, p.blue, 1, true);
    drawArrow(ctx, b.x, b.y, r.x, r.y, p.red, 1, true);
    drawOriginAngle(ctx, state.params.angle, RANGE_ARC_R, p.muted, true);
    labelBeyond(ctx, 'F₁', ORIGIN, a, p.red, 13);
    labelBeyond(ctx, 'F₂', ORIGIN, b, p.blue, 13);
    labelBeyond(ctx, 'F合', ORIGIN, r, p.teal, 14);
  }

  function renderOrthogonal(
    ctx: CanvasRenderingContext2D,
    state: ForceCompositionState,
    p: Palette,
    fit: number
  ): void {
    drawArrow(ctx, 80, ORIGIN.y, 520, ORIGIN.y, p.ink, 1.5);
    drawArrow(ctx, ORIGIN.x, 570, ORIGIN.x, 130, p.ink, 1.5);
    drawLabel(ctx, 'x', 530, ORIGIN.y + 2, p.ink, 14);
    drawLabel(ctx, 'y', ORIGIN.x, 115, p.ink, 14, 'center');
    drawLabel(ctx, 'O', ORIGIN.x - 15, ORIGIN.y + 15, p.ink, 14);
    const f = scaledEndpoint({ x: state.fx.x, y: state.fy.y }, fit);
    const fx = scaledEndpoint(state.fx, fit);
    const fy = scaledEndpoint(state.fy, fit);
    drawArrow(ctx, ORIGIN.x, ORIGIN.y, fx.x, fx.y, p.fx, 3.5);
    drawArrow(ctx, ORIGIN.x, ORIGIN.y, fy.x, fy.y, p.fy, 3.5);
    drawArrow(ctx, ORIGIN.x, ORIGIN.y, f.x, f.y, p.teal, 4);
    drawArrow(ctx, fx.x, fx.y, f.x, f.y, p.proj, 1, true);
    drawArrow(ctx, fy.x, fy.y, f.x, f.y, p.proj, 1, true);
    drawOriginAngle(
      ctx,
      state.params.orthogonalAngle,
      ORTHO_ARC_R,
      p.muted,
      false
    );
    labelBeyond(ctx, 'F', ORIGIN, f, p.teal, 14);
    labelBeyond(ctx, 'Fx', ORIGIN, fx, p.fx, 13);
    labelBeyond(ctx, 'Fy', ORIGIN, fy, p.fy, 13);
    drawHandle(ctx, f.x, f.y, p.teal);
  }

  function renderEffect(
    ctx: CanvasRenderingContext2D,
    state: ForceCompositionState,
    p: Palette
  ): void {
    const geo = inclineGeometry(state.params.inclineAngle);
    ctx.fillStyle = p.wedge;
    ctx.strokeStyle = p.wedgeStroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(geo.rightAngle.x, geo.rightAngle.y);
    ctx.lineTo(geo.baseEnd.x, geo.baseEnd.y);
    ctx.lineTo(geo.topEnd.x, geo.topEnd.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    const center = geo.blockCenter;
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(geo.blockRotation);
    ctx.fillStyle = p.wedgeStroke;
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(
        -geo.blockWidth / 2,
        -geo.blockHeight / 2,
        geo.blockWidth,
        geo.blockHeight,
        4
      );
    } else {
      ctx.rect(
        -geo.blockWidth / 2,
        -geo.blockHeight / 2,
        geo.blockWidth,
        geo.blockHeight
      );
    }
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    const drawFrom = (v: Vector, color: string, width: number): void => {
      const e = {
        x: center.x + v.x * VECTOR_SCALE,
        y: center.y - v.y * VECTOR_SCALE
      };
      drawArrow(ctx, center.x, center.y, e.x, e.y, color, width);
    };
    drawFrom(state.g1, p.blue, 3.5);
    drawFrom(state.g2, p.teal, 3.5);
    drawFrom(state.gravityVector, p.red, 4);
    const gTip = {
      x: center.x,
      y: center.y + state.params.gravity * VECTOR_SCALE
    };
    const g1Tip = {
      x: center.x + state.g1.x * VECTOR_SCALE,
      y: center.y - state.g1.y * VECTOR_SCALE
    };
    const g2Tip = {
      x: center.x + state.g2.x * VECTOR_SCALE,
      y: center.y - state.g2.y * VECTOR_SCALE
    };
    labelBeyond(ctx, 'G', center, gTip, p.red, 14);
    labelBeyond(ctx, 'G₁', center, g1Tip, p.blue, 13);
    labelBeyond(ctx, 'G₂', center, g2Tip, p.teal, 13);
    const corner = geo.baseEnd;
    ctx.save();
    ctx.strokeStyle = p.wedgeStroke;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(
      corner.x,
      corner.y,
      WEDGE_ARC_R,
      Math.PI,
      Math.PI + geo.theta,
      false
    );
    ctx.stroke();
    ctx.restore();
    const bisect = geo.theta / 2;
    drawLabel(
      ctx,
      'θ',
      corner.x - (WEDGE_ARC_R + 14) * Math.cos(bisect),
      corner.y - (WEDGE_ARC_R + 14) * Math.sin(bisect),
      p.wedgeStroke,
      12,
      'center'
    );
  }

  function draw(state: ForceCompositionState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    if (!Number.isFinite(stage.responsiveScale)) return;
    const layout = stageLayoutFrom(stage.canvas);
    const { fit, offsetX, offsetY, boxW, boxH } = stageTransform(
      width,
      height,
      layout
    );
    const p = PALETTE[env.theme];
    const contentFit = diagramFitScale(state);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fit, fit);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, boxW, boxH);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, DRAW_W, STAGE_H);
    ctx.clip();
    ctx.strokeStyle = p.grid;
    ctx.lineWidth = 1;
    for (let x = 0; x <= DRAW_W; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, STAGE_H);
      ctx.stroke();
    }
    for (let y = 0; y <= STAGE_H; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(DRAW_W, y);
      ctx.stroke();
    }
    ctx.restore();
    if (state.params.tab === 'synthesis')
      renderSynthesis(ctx, state, p, contentFit);
    else if (state.params.tab === 'range')
      renderRange(ctx, state, p, contentFit);
    else if (state.params.tab === 'orthogonal')
      renderOrthogonal(ctx, state, p, contentFit);
    else renderEffect(ctx, state, p);
    ctx.restore();
  }

  return {
    render(state: ForceCompositionState): void {
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
