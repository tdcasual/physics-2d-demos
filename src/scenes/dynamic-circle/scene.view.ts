import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  dynamicCircleConstants,
  orbitPoint,
  type DynamicCircleState,
  type Point
} from './scene.sim';

export type CreateDynamicCircleViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

const {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  fieldLeft: FIELD_LEFT,
  fieldTop: FIELD_TOP,
  fieldBottom: FIELD_BOTTOM,
  sourceX: SOURCE_X,
  sourceY: SOURCE_Y,
  rotatingSourceX: ROTATING_SOURCE_X
} = dynamicCircleConstants;
const AXIS_LEFT = 40;
const AXIS_RIGHT = 610;
const AXIS_TOP = 40;
const AXIS_BOTTOM = 620;
const LABEL_X = 234;
const FIELD_SYMBOL_STEP = 47;
const TRAJECTORY_STEP = 1.5;
const OVERLAY_X = 25;
const OVERLAY_Y = 65;
const OVERLAY_W = 180;
const OVERLAY_H = 115;
const BOUNDARY_LABEL_W = 7 * 10;

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
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#FAF7F2',
    grid: 'rgba(52,58,64,0.15)',
    ink: '#3E2723',
    muted: '#A1887F',
    red: '#E63946',
    teal: '#009688',
    purple: '#673AB7',
    gold: '#FFB300',
    fieldStroke: '#BCAAA4',
    card: '#FAF7F2'
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
    card: '#172033'
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
  width: number,
  dashed = false
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
  ctx.setLineDash(dashed ? [5, 4] : []);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.setLineDash([]);
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

function pointInBoundary(point: Point, state: DynamicCircleState): boolean {
  const { params } = state;
  if (params.boundary === 'circle') {
    return (
      Math.hypot(point.x - params.circleX, point.y - SOURCE_Y) <= params.circleR
    );
  }
  if (params.boundary === 'triangle') {
    if (point.x < FIELD_LEFT || point.x > params.triX) return false;
    const fraction =
      (point.x - FIELD_LEFT) / Math.max(1, params.triX - FIELD_LEFT);
    return Math.abs(point.y - SOURCE_Y) <= (params.triH * fraction) / 2;
  }
  return (
    point.x >= FIELD_LEFT &&
    point.x <= params.xBound &&
    point.y >= FIELD_TOP &&
    point.y <= FIELD_BOTTOM
  );
}

function drawField(
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
      SOURCE_Y,
      state.params.circleR,
      0,
      Math.PI * 2
    );
  } else if (state.params.boundary === 'triangle') {
    const top = SOURCE_Y - state.params.triH / 2;
    const bottom = SOURCE_Y + state.params.triH / 2;
    ctx.moveTo(FIELD_LEFT, top);
    ctx.lineTo(state.params.triX, SOURCE_Y);
    ctx.lineTo(FIELD_LEFT, bottom);
    ctx.closePath();
  } else {
    ctx.rect(
      FIELD_LEFT,
      FIELD_TOP,
      state.params.xBound - FIELD_LEFT,
      FIELD_BOTTOM - FIELD_TOP
    );
  }
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  const symbol = state.params.B >= 0 ? '×' : '·';
  ctx.save();
  ctx.globalAlpha = 0.22;
  for (
    let x = FIELD_LEFT + 15;
    x <= state.fieldBounds.right - 15;
    x += FIELD_SYMBOL_STEP
  ) {
    for (
      let y = state.fieldBounds.top + 15;
      y <= state.fieldBounds.bottom - 15;
      y += FIELD_SYMBOL_STEP
    ) {
      if (!pointInBoundary({ x, y }, state)) continue;
      drawLabel(
        ctx,
        symbol,
        x,
        y,
        p.ink,
        symbol === '×' ? 17 : 20,
        'center',
        500
      );
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
    ctx.moveTo(FIELD_LEFT - 8, y);
    ctx.lineTo(FIELD_LEFT, y);
    ctx.stroke();
    ctx.fillText(`${y}米`, LABEL_X, y + 3);
  }
  ctx.textAlign = 'center';
  for (let x = 300; x <= 600; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, SOURCE_Y);
    ctx.lineTo(x, SOURCE_Y + 8);
    ctx.stroke();
    ctx.fillText(`${x}米`, x, SOURCE_Y + 22);
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
  ctx.rotate((-angle * Math.PI) / 180);
  ctx.fillStyle = p.ink;
  ctx.strokeStyle = p.card;
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.roundRect(-26, -10, 26, 20, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = p.gold;
  ctx.beginPath();
  ctx.roundRect(0, -5, 8, 10, 1.5);
  ctx.fill();
  ctx.fillStyle = '#00C853';
  ctx.beginPath();
  ctx.arc(-16, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFormula(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.save();
  ctx.fillStyle = p.card;
  ctx.strokeStyle = '#EADEC9';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(OVERLAY_X, OVERLAY_Y, OVERLAY_W, OVERLAY_H, 12);
  ctx.fill();
  ctx.stroke();
  drawLabel(
    ctx,
    '物理学核心方程：',
    OVERLAY_X + 15,
    OVERLAY_Y + 28,
    p.ink,
    13,
    'left',
    700
  );
  drawLabel(
    ctx,
    '洛伦兹力: F = q v B',
    OVERLAY_X + 15,
    OVERLAY_Y + 54,
    p.ink,
    12,
    'left',
    500
  );
  drawLabel(
    ctx,
    '向心力: F = m v² / R',
    OVERLAY_X + 15,
    OVERLAY_Y + 76,
    p.ink,
    12,
    'left',
    500
  );
  drawLabel(
    ctx,
    '轨道半径: R = m v / q B',
    OVERLAY_X + 15,
    OVERLAY_Y + 98,
    p.red,
    12,
    'left',
    700
  );
  ctx.restore();
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
  ctx.setLineDash(dashed ? [5, 4] : []);
  path(ctx, points);
  ctx.stroke();
  ctx.restore();
}

export function createDynamicCircleView(
  options: CreateDynamicCircleViewOptions = {}
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
  let snapshot: DynamicCircleState | null = null;

  function draw(state: DynamicCircleState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    stage.ensureSized();
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(width / BASE_W, height / BASE_H);
    const offsetY = (height - BASE_H * fit) / 2;
    const p = PALETTE[env.theme];
    const contentScale = env.contentScale() * stage.responsiveScale;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(0, offsetY);
    ctx.scale(fit, fit);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, BASE_W, BASE_H);
    ctx.strokeStyle = p.grid;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(AXIS_LEFT, SOURCE_Y);
    ctx.lineTo(AXIS_RIGHT, SOURCE_Y);
    ctx.moveTo(SOURCE_X, AXIS_TOP);
    ctx.lineTo(SOURCE_X, AXIS_BOTTOM);
    ctx.stroke();
    ctx.setLineDash([]);

    drawField(ctx, state, p, contentScale);
    drawRulers(ctx, p);

    if (state.params.tab === 'rotating') {
      const center = { x: ROTATING_SOURCE_X, y: SOURCE_Y };
      ctx.save();
      ctx.strokeStyle = p.purple;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1.5 * contentScale;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.arc(center.x, center.y, state.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (state.params.tab === 'translating') {
      drawLine(
        ctx,
        { x: SOURCE_X, y: FIELD_TOP },
        { x: SOURCE_X, y: FIELD_BOTTOM },
        p.teal,
        1.5 * contentScale,
        true
      );
    }

    for (const radius of state.auxiliaryRadii) {
      const family = [];
      for (let i = 0; i <= 180; i += 1) {
        family.push(
          orbitPoint(
            state.source,
            radius,
            angleForState(state),
            state.params.B,
            i * TRAJECTORY_STEP
          )
        );
      }
      drawTrajectory(ctx, family, p.muted, 1, true, 0.25);
    }
    for (const fan of state.fanTrajectories)
      drawTrajectory(ctx, fan, p.red, 1.5, true, 0.32);
    drawTrajectory(ctx, state.trajectory, p.red, 4 * contentScale);

    if (state.params.showCenter && Number.isFinite(state.radius)) {
      drawLine(ctx, state.source, state.center, p.teal, 1 * contentScale, true);
      ctx.fillStyle = p.teal;
      ctx.beginPath();
      ctx.arc(state.center.x, state.center.y, 5, 0, Math.PI * 2);
      ctx.fill();
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
      const particle =
        state.trajectory[
          Math.min(
            state.trajectory.length - 1,
            Math.floor(state.t * 20) % state.trajectory.length
          )
        ];
      if (particle)
        drawLine(ctx, state.center, particle, p.teal, 1 * contentScale, true);
    }

    const arrowLength = state.params.tab === 'rotating' ? 55 : 65;
    const arrowAngle = state.params.tab === 'rotating' ? state.params.theta : 0;
    const arrowStart = {
      x: state.source.x + (state.params.tab === 'rotating' ? 50 : 0),
      y: state.source.y
    };
    const arrowEnd = {
      x: arrowStart.x + arrowLength * Math.cos((arrowAngle * Math.PI) / 180),
      y: arrowStart.y - arrowLength * Math.sin((arrowAngle * Math.PI) / 180)
    };
    drawArrow(ctx, arrowStart, arrowEnd, p.gold, 3 * contentScale);
    drawGun(
      ctx,
      state.source,
      state.params.tab === 'scaling' ? -90 : state.params.theta,
      p,
      contentScale
    );
    ctx.fillStyle = p.ink;
    ctx.beginPath();
    ctx.arc(state.source.x, state.source.y, 5, 0, Math.PI * 2);
    ctx.fill();

    const particle =
      state.trajectory[
        Math.min(
          state.trajectory.length - 1,
          Math.floor(state.t * 20) % state.trajectory.length
        )
      ];
    if (particle) {
      ctx.fillStyle = '#FFD700';
      ctx.strokeStyle = p.card;
      ctx.lineWidth = 1.5 * contentScale;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    if (state.params.boundary === 'straight') {
      ctx.fillStyle = p.red;
      ctx.beginPath();
      ctx.roundRect(
        state.params.xBound - BOUNDARY_LABEL_W / 2,
        FIELD_TOP - 25,
        BOUNDARY_LABEL_W,
        20,
        6
      );
      ctx.fill();
      drawLabel(
        ctx,
        '右边界',
        state.params.xBound,
        FIELD_TOP - 15,
        p.card,
        10,
        'center',
        700
      );
    } else if (state.params.boundary === 'triangle') {
      ctx.fillStyle = p.red;
      ctx.beginPath();
      ctx.arc(state.params.triX, SOURCE_Y, 14, 0, Math.PI * 2);
      ctx.fill();
      drawLabel(
        ctx,
        '顶点',
        state.params.triX,
        SOURCE_Y - 23,
        p.card,
        10,
        'center',
        700
      );
    } else {
      ctx.fillStyle = p.red;
      ctx.beginPath();
      ctx.arc(
        state.params.circleX + state.params.circleR,
        SOURCE_Y,
        10,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.fillStyle = '#3F51B5';
      ctx.beginPath();
      ctx.arc(state.params.circleX, SOURCE_Y, 10, 0, Math.PI * 2);
      ctx.fill();
      drawLabel(
        ctx,
        '圆心',
        state.params.circleX,
        SOURCE_Y - 20,
        p.card,
        9,
        'center',
        700
      );
    }

    drawFormula(ctx, p);
    drawLabel(
      ctx,
      '拖动红色控制柄或调整参数',
      BASE_W / 2,
      635,
      p.muted,
      11,
      'center',
      500
    );
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

function angleForState(state: DynamicCircleState): number {
  return state.params.tab === 'scaling' ? -90 : state.params.theta;
}
