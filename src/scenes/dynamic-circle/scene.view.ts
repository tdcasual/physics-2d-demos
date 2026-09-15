import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  dynamicCircleConstants,
  insideField,
  stageLayoutFrom,
  stageTransform,
  type DynamicCircleState,
  type Point
} from './scene.sim';

export type CreateDynamicCircleViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

const C = dynamicCircleConstants;
const GUN_BODY_W = 26;
const GUN_BODY_H = 20;
const GUN_NOZZLE_W = 8;
const GUN_NOZZLE_H = 10;
const PARTICLE_R = 7.5;
const CENTER_R = 5;
const EXIT_R = 4;
const HANDLE_R = 10;
const VERTEX_R = 14;
const LABEL_PAD_Y = 25;
const BOUNDARY_LABEL_W = 70;
const BOUNDARY_LABEL_H = 20;
const CIRCLE_LABEL_W = 70;
const CIRCLE_LABEL_H = 18;
const TRI_LABEL_W = 80;
const TRI_LABEL_H = 18;
const CROSS_ARM = 4;
const DOT_R = 1.8;
const DOT_RING_R = 5;
const RULER_LABEL_X = 234;

type Palette = {
  bg: string;
  grid: string;
  ink: string;
  muted: string;
  red: string;
  teal: string;
  purple: string;
  gold: string;
  fieldStroke: string;
  card: string;
  fieldInk: string;
  handleBlue: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#FAF7F2',
    grid: 'rgba(52,58,64,0.15)',
    ink: '#3E2723',
    muted: '#8D6E63',
    red: '#E63946',
    teal: '#009688',
    purple: '#673AB7',
    gold: '#FFB300',
    fieldStroke: '#BCAAA4',
    card: '#FAF7F2',
    fieldInk: '#5D4037',
    handleBlue: '#3F51B5'
  },
  dark: {
    bg: '#0f172a',
    grid: 'rgba(148,163,184,0.16)',
    ink: '#e2e8f0',
    muted: '#94a3b8',
    red: '#fb7185',
    teal: '#2dd4bf',
    purple: '#a78bfa',
    gold: '#fbbf24',
    fieldStroke: '#64748b',
    card: '#172033',
    fieldInk: '#cbd5e1',
    handleBlue: '#818cf8'
  }
};

function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
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
  ctx.fillText(text, x, y);
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  a: Point,
  b: Point,
  color: string,
  width: number,
  dashed = false
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dashed ? [6, 4] : []);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.restore();
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  a: Point,
  b: Point,
  color: string,
  width: number
): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  if (length < 1) return;
  const ux = dx / length;
  const uy = dy / length;
  const head = Math.min(12, Math.max(7, length * 0.15));
  const wing = head * 0.5;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(b.x, b.y);
  ctx.lineTo(b.x - ux * head - uy * wing, b.y - uy * head + ux * wing);
  ctx.lineTo(b.x - ux * head + uy * wing, b.y - uy * head - ux * wing);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function path(ctx: CanvasRenderingContext2D, points: Point[]): void {
  if (points.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1)
    ctx.lineTo(points[i].x, points[i].y);
}

function drawTrajectory(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  color: string,
  width: number,
  dashed = false,
  alpha = 1
): void {
  if (points.length < 2) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash(dashed ? [5, 4] : []);
  path(ctx, points);
  ctx.stroke();
  ctx.restore();
}

function drawFieldShape(
  ctx: CanvasRenderingContext2D,
  state: DynamicCircleState,
  p: Palette,
  scale: number
): void {
  ctx.save();
  ctx.fillStyle = 'rgba(62,39,35,0.02)';
  ctx.strokeStyle = p.fieldStroke;
  ctx.lineWidth = scale;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  if (state.params.boundary === 'circle') {
    ctx.arc(
      state.params.circleX,
      state.params.circleY,
      state.params.circleR,
      0,
      Math.PI * 2
    );
  } else if (state.params.boundary === 'triangle') {
    const top = C.sourceY - state.params.triH / 2;
    const bottom = C.sourceY + state.params.triH / 2;
    ctx.moveTo(C.fieldLeft, top);
    ctx.lineTo(state.params.triX, C.sourceY);
    ctx.lineTo(C.fieldLeft, bottom);
    ctx.closePath();
  } else {
    ctx.rect(
      C.fieldLeft,
      C.fieldTop,
      state.params.xBound - C.fieldLeft,
      C.fieldBottom - C.fieldTop
    );
  }
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawFieldSymbols(
  ctx: CanvasRenderingContext2D,
  state: DynamicCircleState,
  p: Palette,
  scale: number
): void {
  if (Math.abs(state.params.B) < C.fieldEps) return;
  ctx.save();
  ctx.globalAlpha = 0.22;
  const inward = state.params.B > 0;
  for (
    let x = C.fieldLeft + C.fieldSymbolInset;
    x <= C.axisRight;
    x += C.fieldSymbolStep
  ) {
    for (let y = 60; y <= 600; y += C.fieldSymbolStep) {
      if (!insideField({ x, y }, state.params)) continue;
      ctx.save();
      ctx.translate(x, y);
      if (inward) {
        ctx.strokeStyle = p.fieldInk;
        ctx.lineWidth = 1.2 * scale;
        ctx.beginPath();
        ctx.moveTo(-CROSS_ARM, -CROSS_ARM);
        ctx.lineTo(CROSS_ARM, CROSS_ARM);
        ctx.moveTo(CROSS_ARM, -CROSS_ARM);
        ctx.lineTo(-CROSS_ARM, CROSS_ARM);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.fieldInk;
        ctx.strokeStyle = p.fieldInk;
        ctx.lineWidth = 0.8 * scale;
        ctx.beginPath();
        ctx.arc(0, 0, DOT_R * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 0, DOT_RING_R * scale, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
  ctx.restore();
}

function drawRulers(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = p.muted;
  ctx.fillStyle = p.muted;
  ctx.lineWidth = 1;
  ctx.font = '700 9px sans-serif';
  ctx.textAlign = 'end';
  ctx.textBaseline = 'middle';
  for (let y = 100; y <= 550; y += 50) {
    ctx.beginPath();
    ctx.moveTo(C.fieldLeft - 8, y);
    ctx.lineTo(C.fieldLeft, y);
    ctx.stroke();
    ctx.fillText(`${y}米`, RULER_LABEL_X, y + 3);
  }
  ctx.textAlign = 'center';
  for (let x = 300; x <= 600; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, C.sourceY);
    ctx.lineTo(x, C.sourceY + 8);
    ctx.stroke();
    ctx.fillText(`${x}米`, x, C.sourceY + 22);
  }
  ctx.restore();
}

function drawGun(
  ctx: CanvasRenderingContext2D,
  source: Point,
  angle: number,
  p: Palette,
  scale: number
): void {
  ctx.save();
  ctx.translate(source.x, source.y);
  ctx.rotate((angle * Math.PI) / 180);
  ctx.fillStyle = p.ink;
  ctx.strokeStyle = p.card;
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.roundRect(-GUN_BODY_W, -GUN_BODY_H / 2, GUN_BODY_W, GUN_BODY_H, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = p.gold;
  ctx.beginPath();
  ctx.roundRect(0, -GUN_NOZZLE_H / 2, GUN_NOZZLE_W, GUN_NOZZLE_H, 1.5);
  ctx.fill();
  ctx.fillStyle = '#00C853';
  ctx.beginPath();
  ctx.arc(-16, 0, 3 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawChip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  label: string,
  p: Palette,
  scale: number
): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x - width / 2, y - height / 2, width, height, 6);
  ctx.fill();
  drawLabel(ctx, label, x, y, p.card, 9 * Math.max(0.85, scale), 'center', 700);
}

export function createDynamicCircleView(
  options: CreateDynamicCircleViewOptions = {}
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
  let snapshot: DynamicCircleState | null = null;

  function draw(state: DynamicCircleState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    stage.ensureSized();
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const layout = stageLayoutFrom(stage.canvas);
    const { fit, offsetX, offsetY, boxW, boxH } = stageTransform(
      width,
      height,
      layout
    );
    const p = PALETTE[env.theme];
    const contentScale = env.contentScale() * stage.responsiveScale;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fit, fit);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, boxW, boxH);
    ctx.strokeStyle = p.grid;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(C.axisLeft, C.sourceY);
    ctx.lineTo(C.axisRight, C.sourceY);
    ctx.moveTo(C.fieldLeft, C.axisTop);
    ctx.lineTo(C.fieldLeft, C.axisBottom);
    ctx.stroke();
    ctx.setLineDash([]);

    drawFieldShape(ctx, state, p, contentScale);
    drawFieldSymbols(ctx, state, p, contentScale);
    drawRulers(ctx, p);

    if (
      state.params.tab === 'rotating' &&
      Number.isFinite(state.radius) &&
      state.radius < 1000
    ) {
      ctx.save();
      ctx.strokeStyle = p.purple;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1.5 * contentScale;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.arc(C.rotatingSourceX, C.sourceY, state.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (state.params.tab === 'translating' && state.center) {
      drawLine(
        ctx,
        { x: state.center.x, y: C.fieldTop },
        { x: state.center.x, y: C.fieldBottom },
        p.teal,
        1.5 * contentScale,
        true
      );
    }

    const auxColor =
      state.params.tab === 'rotating'
        ? p.purple
        : state.params.tab === 'translating'
          ? p.teal
          : p.muted;
    for (const family of state.auxiliaryTrajectories)
      drawTrajectory(ctx, family, auxColor, 1.2 * contentScale, true, 0.45);
    for (const fan of state.fanTrajectories)
      drawTrajectory(ctx, fan, p.red, 1.5 * contentScale, true, 0.32);
    drawTrajectory(ctx, state.trajectory, p.red, 4 * contentScale);

    if (state.params.showCenter && state.center) {
      drawLine(ctx, state.source, state.center, p.teal, 1 * contentScale, true);
      ctx.fillStyle = p.teal;
      ctx.strokeStyle = p.card;
      ctx.lineWidth = 1.5 * contentScale;
      ctx.beginPath();
      ctx.arc(state.center.x, state.center.y, CENTER_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      drawLabel(
        ctx,
        '圆心 O',
        state.center.x + 8,
        state.center.y + 4,
        p.teal,
        10,
        'left',
        700
      );
      if (state.exitPoint) {
        drawLine(
          ctx,
          state.exitPoint,
          state.center,
          p.teal,
          1 * contentScale,
          true
        );
        ctx.fillStyle = p.red;
        ctx.beginPath();
        ctx.arc(state.exitPoint.x, state.exitPoint.y, EXIT_R, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    drawArrow(
      ctx,
      state.velocityFrom,
      state.velocityTo,
      p.gold,
      3 * contentScale
    );
    if (state.params.tab === 'rotating') {
      ctx.save();
      ctx.fillStyle = p.gold;
      ctx.globalAlpha = 0.15;
      ctx.strokeStyle = p.gold;
      ctx.lineWidth = 1.5 * contentScale;
      ctx.beginPath();
      ctx.arc(state.velocityTo.x, state.velocityTo.y, VERTEX_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.stroke();
      ctx.restore();
    }
    drawGun(ctx, state.source, state.launchAngle, p, contentScale);
    ctx.fillStyle = p.ink;
    ctx.strokeStyle = p.card;
    ctx.lineWidth = 1.5 * contentScale;
    ctx.beginPath();
    ctx.arc(state.source.x, state.source.y, CENTER_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFD700';
    ctx.strokeStyle = p.card;
    ctx.lineWidth = 1.5 * contentScale;
    ctx.beginPath();
    ctx.arc(state.particle.x, state.particle.y, PARTICLE_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (state.params.boundary === 'straight') {
      drawLine(
        ctx,
        { x: state.params.xBound, y: C.fieldTop },
        { x: state.params.xBound, y: C.fieldBottom },
        p.red,
        2.5 * contentScale,
        true
      );
      drawChip(
        ctx,
        state.params.xBound,
        C.fieldTop - LABEL_PAD_Y + BOUNDARY_LABEL_H / 2,
        BOUNDARY_LABEL_W,
        BOUNDARY_LABEL_H,
        p.red,
        '右边界',
        p,
        contentScale
      );
    } else if (state.params.boundary === 'triangle') {
      ctx.save();
      ctx.strokeStyle = p.red;
      ctx.lineWidth = 2 * contentScale;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(C.fieldLeft, C.sourceY - state.params.triH / 2);
      ctx.lineTo(state.params.triX, C.sourceY);
      ctx.lineTo(C.fieldLeft, C.sourceY + state.params.triH / 2);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = 'rgba(230,57,70,0.2)';
      ctx.strokeStyle = p.red;
      ctx.lineWidth = 1.5 * contentScale;
      ctx.beginPath();
      ctx.arc(state.params.triX, C.sourceY, VERTEX_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = p.red;
      ctx.beginPath();
      ctx.arc(state.params.triX, C.sourceY, HANDLE_R / 2, 0, Math.PI * 2);
      ctx.fill();
      drawChip(
        ctx,
        state.params.triX,
        C.sourceY - 21,
        TRI_LABEL_W,
        TRI_LABEL_H,
        p.red,
        '三角形顶点',
        p,
        contentScale
      );
    } else {
      ctx.save();
      ctx.strokeStyle = p.red;
      ctx.lineWidth = 2 * contentScale;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.arc(
        state.params.circleX,
        state.params.circleY,
        state.params.circleR,
        0,
        Math.PI * 2
      );
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = 'rgba(63,81,181,0.2)';
      ctx.strokeStyle = p.handleBlue;
      ctx.lineWidth = 1.5 * contentScale;
      ctx.beginPath();
      ctx.arc(
        state.params.circleX,
        state.params.circleY,
        VERTEX_R,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = p.handleBlue;
      ctx.beginPath();
      ctx.arc(
        state.params.circleX,
        state.params.circleY,
        HANDLE_R / 2,
        0,
        Math.PI * 2
      );
      ctx.fill();
      drawChip(
        ctx,
        state.params.circleX,
        state.params.circleY - 21,
        CIRCLE_LABEL_W,
        CIRCLE_LABEL_H,
        p.handleBlue,
        '磁场圆心',
        p,
        contentScale
      );
      const rx = state.params.circleX + state.params.circleR;
      const ry = state.params.circleY;
      ctx.fillStyle = 'rgba(230,57,70,0.2)';
      ctx.strokeStyle = p.red;
      ctx.beginPath();
      ctx.arc(rx, ry, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = p.red;
      ctx.beginPath();
      ctx.arc(rx, ry, 4.5, 0, Math.PI * 2);
      ctx.fill();
      drawChip(
        ctx,
        rx,
        ry + 23,
        CIRCLE_LABEL_W,
        CIRCLE_LABEL_H,
        p.red,
        '半径调节',
        p,
        contentScale
      );
    }

    ctx.restore();
  }

  return {
    render(state: DynamicCircleState): void {
      snapshot = state;
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
