import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  forceCompositionConstants,
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
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  origin: ORIGIN,
  vectorScale: VECTOR_SCALE
} = forceCompositionConstants;
const WEDGE_POINTS = [
  { x: 140, y: 480 },
  { x: 480, y: 480 },
  { x: 140, y: 283 }
] as const;
const BLOCK_WIDTH = 7 * 10;
const BLOCK_HEIGHT = 36;

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
    wedgeStroke: '#8D6E63'
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
    wedgeStroke: '#c4a484'
  }
};

function format(value: number): string {
  return value.toFixed(1);
}

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
  const head = Math.min(12, Math.max(7, length * 0.12));
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

function endpoint(v: Vector): { x: number; y: number } {
  return {
    x: ORIGIN.x + v.x * VECTOR_SCALE,
    y: ORIGIN.y - v.y * VECTOR_SCALE
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
  ctx.fillStyle = color;
  ctx.font = `600 ${size}px sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

function drawAngle(
  ctx: CanvasRenderingContext2D,
  angle: number,
  radius: number,
  color: string
): void {
  const theta = (angle * Math.PI) / 180;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 2]);
  ctx.beginPath();
  ctx.arc(ORIGIN.x, ORIGIN.y, radius, 0, -theta, true);
  ctx.stroke();
  ctx.setLineDash([]);
  drawLabel(
    ctx,
    `${format(angle)}°`,
    ORIGIN.x + (radius + 16) * Math.cos(theta / 2),
    ORIGIN.y - (radius + 16) * Math.sin(theta / 2),
    color,
    12,
    'center'
  );
  ctx.restore();
}

export function createForceCompositionView(
  options: CreateForceCompositionViewOptions = {}
) {
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: { mode: 'clamped', fallbackWidth: BASE_W, fallbackHeight: BASE_H },
    initialWidth: BASE_W,
    initialHeight: BASE_H,
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
    cs: number
  ): void {
    const a = endpoint(state.f1);
    const b = endpoint(state.f2);
    const r = endpoint(state.resultant);
    ctx.fillStyle = p.ink;
    ctx.beginPath();
    ctx.arc(ORIGIN.x, ORIGIN.y, 5, 0, Math.PI * 2);
    ctx.fill();
    drawLabel(ctx, 'O', ORIGIN.x - 15, ORIGIN.y + 14, p.ink, 14);
    drawArrow(ctx, ORIGIN.x, ORIGIN.y, a.x, a.y, p.red, 3 * cs);
    drawArrow(ctx, ORIGIN.x, ORIGIN.y, b.x, b.y, p.blue, 3 * cs);
    drawArrow(ctx, ORIGIN.x, ORIGIN.y, r.x, r.y, p.teal, 4 * cs);
    if (state.params.rule === 'triangle') {
      drawArrow(ctx, a.x, a.y, r.x, r.y, p.blue, 2.5 * cs, true);
      drawArrow(ctx, ORIGIN.x, ORIGIN.y, r.x, r.y, p.teal, 4 * cs);
    } else {
      drawArrow(ctx, a.x, a.y, r.x, r.y, p.blue, 1.5 * cs, true);
      drawArrow(ctx, b.x, b.y, r.x, r.y, p.red, 1.5 * cs, true);
    }
    drawAngle(ctx, state.params.angle, 52, p.muted);
    drawLabel(
      ctx,
      `F₁ ${format(state.params.f1)} N`,
      a.x + 8,
      a.y + 12,
      p.red,
      14
    );
    drawLabel(
      ctx,
      `F₂ ${format(state.params.f2)} N`,
      b.x + 8,
      b.y - 12,
      p.blue,
      14
    );
    drawLabel(
      ctx,
      `F合 ${format(Math.hypot(state.resultant.x, state.resultant.y))} N`,
      r.x + 8,
      r.y - 12,
      p.teal,
      15
    );
  }

  function renderRange(
    ctx: CanvasRenderingContext2D,
    state: ForceCompositionState,
    p: Palette,
    cs: number
  ): void {
    const a = endpoint(state.f1);
    const b = endpoint(state.f2);
    const r = endpoint(state.resultant);
    ctx.fillStyle = p.ink;
    ctx.beginPath();
    ctx.arc(ORIGIN.x, ORIGIN.y, 5, 0, Math.PI * 2);
    ctx.fill();
    drawLabel(ctx, 'O', ORIGIN.x - 15, ORIGIN.y + 14, p.ink, 14);
    drawArrow(ctx, ORIGIN.x, ORIGIN.y, a.x, a.y, p.red, 3 * cs);
    drawArrow(ctx, ORIGIN.x, ORIGIN.y, b.x, b.y, p.blue, 3 * cs);
    drawArrow(ctx, ORIGIN.x, ORIGIN.y, r.x, r.y, p.teal, 4 * cs);
    drawArrow(ctx, a.x, a.y, r.x, r.y, p.blue, 1 * cs, true);
    drawArrow(ctx, b.x, b.y, r.x, r.y, p.red, 1 * cs, true);
    drawAngle(ctx, state.params.angle, 52, p.muted);
    drawLabel(
      ctx,
      `F₁ ${format(state.params.f1)} N`,
      a.x - 5,
      a.y + 15,
      p.red,
      13
    );
    drawLabel(
      ctx,
      `F₂ ${format(state.params.f2)} N`,
      b.x + 8,
      b.y - 12,
      p.blue,
      13
    );
    drawLabel(
      ctx,
      `F合 ${format(Math.hypot(state.resultant.x, state.resultant.y))} N`,
      r.x + 8,
      r.y - 12,
      p.teal,
      14
    );
  }

  function renderOrthogonal(
    ctx: CanvasRenderingContext2D,
    state: ForceCompositionState,
    p: Palette,
    cs: number
  ): void {
    drawArrow(ctx, 80, ORIGIN.y, 520, ORIGIN.y, p.ink, 1.5 * cs);
    drawArrow(ctx, ORIGIN.x, 570, ORIGIN.x, 130, p.ink, 1.5 * cs);
    drawLabel(ctx, 'x', 530, ORIGIN.y + 2, p.ink, 14);
    drawLabel(ctx, 'y', ORIGIN.x, 115, p.ink, 14, 'center');
    drawLabel(ctx, 'O', ORIGIN.x - 15, ORIGIN.y + 14, p.ink, 14);
    const f = endpoint({ x: state.fx.x, y: state.fy.y });
    const fx = endpoint(state.fx);
    const fy = endpoint(state.fy);
    drawArrow(ctx, ORIGIN.x, ORIGIN.y, fx.x, fx.y, p.fx, 3.5 * cs);
    drawArrow(ctx, ORIGIN.x, ORIGIN.y, fy.x, fy.y, p.fy, 3.5 * cs);
    drawArrow(ctx, ORIGIN.x, ORIGIN.y, f.x, f.y, p.teal, 4 * cs);
    drawArrow(ctx, fx.x, fx.y, f.x, f.y, p.fy, 1, true);
    drawArrow(ctx, fy.x, fy.y, f.x, f.y, p.fx, 1, true);
    drawAngle(ctx, state.params.orthogonalAngle, 44, p.muted);
    drawLabel(
      ctx,
      `F ${format(state.params.orthogonalF)} N`,
      f.x + 8,
      f.y - 12,
      p.teal,
      14
    );
    drawLabel(ctx, `Fx ${format(state.fx.x)} N`, fx.x + 8, fx.y + 14, p.fx, 13);
    drawLabel(ctx, `Fy ${format(state.fy.y)} N`, fy.x + 8, fy.y - 10, p.fy, 13);
  }

  function renderEffect(
    ctx: CanvasRenderingContext2D,
    state: ForceCompositionState,
    p: Palette,
    cs: number
  ): void {
    const theta = (state.params.inclineAngle * Math.PI) / 180;
    ctx.fillStyle = p.wedge;
    ctx.strokeStyle = p.wedgeStroke;
    ctx.lineWidth = 2 * cs;
    ctx.beginPath();
    ctx.moveTo(WEDGE_POINTS[0].x, WEDGE_POINTS[0].y);
    ctx.lineTo(WEDGE_POINTS[1].x, WEDGE_POINTS[1].y);
    ctx.lineTo(WEDGE_POINTS[2].x, WEDGE_POINTS[2].y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    const center = { x: 245, y: 390 };
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(theta);
    ctx.fillStyle = p.wedgeStroke;
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 2 * cs;
    ctx.beginPath();
    ctx.rect(-BLOCK_WIDTH / 2, -BLOCK_HEIGHT / 2, BLOCK_WIDTH, BLOCK_HEIGHT);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    const drawFrom = (v: Vector, color: string, width: number): void => {
      const e = {
        x: center.x + v.x * VECTOR_SCALE,
        y: center.y - v.y * VECTOR_SCALE
      };
      drawArrow(ctx, center.x, center.y, e.x, e.y, color, width * cs);
    };
    drawFrom(state.g1, p.blue, 3.5);
    drawFrom(state.g2, p.teal, 3.5);
    drawFrom(state.gravityVector, p.red, 4);
    drawLabel(
      ctx,
      `G ${format(state.params.gravity)} N`,
      center.x + 10,
      center.y + state.params.gravity * 1.5,
      p.red,
      14
    );
    drawLabel(
      ctx,
      `G₁ ${format(Math.hypot(state.g1.x, state.g1.y))} N`,
      center.x + state.g1.x * 1.2,
      center.y - state.g1.y * 1.2,
      p.blue,
      13
    );
    drawLabel(
      ctx,
      `G₂ ${format(Math.hypot(state.g2.x, state.g2.y))} N`,
      center.x - 70,
      center.y + 8,
      p.teal,
      13
    );
    drawLabel(
      ctx,
      `θ ${format(state.params.inclineAngle)}°`,
      170,
      450,
      p.wedgeStroke,
      12
    );
  }

  function draw(state: ForceCompositionState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(width / BASE_W, height / BASE_H);
    // 原参考 SVG 的动画区从左边缘开始（0–620），不居中到右侧面板下方。
    // 这样浮动读数不会遮住作用点和矢量端点。
    const offsetX = 0;
    const offsetY = (height - BASE_H * fit) / 2;
    const p = PALETTE[env.theme];
    const cs = env.contentScale() * stage.responsiveScale;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fit, fit);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, BASE_W, BASE_H);
    ctx.strokeStyle = p.grid;
    ctx.lineWidth = 1;
    for (let x = 0; x <= BASE_W; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, BASE_H);
      ctx.stroke();
    }
    for (let y = 0; y <= BASE_H; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(BASE_W, y);
      ctx.stroke();
    }
    if (state.params.tab === 'synthesis') renderSynthesis(ctx, state, p, cs);
    else if (state.params.tab === 'range') renderRange(ctx, state, p, cs);
    else if (state.params.tab === 'orthogonal')
      renderOrthogonal(ctx, state, p, cs);
    else renderEffect(ctx, state, p, cs);
    drawLabel(
      ctx,
      '拖动端点或调整参数',
      BASE_W / 2,
      625,
      p.muted,
      12,
      'center'
    );
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
