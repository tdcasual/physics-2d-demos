import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { getResponsiveScale, scaledSize } from '../../core/canvas-sizing';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { springBallConstants as C, type SpringBallState } from './scene.sim';

export type CreateSpringBallViewOptions = {
  canvas?: HTMLCanvasElement;
  graphCanvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

type Palette = {
  bg: string;
  ink: string;
  muted: string;
  spring: string;
  ball: string;
  velocity: string;
  acceleration: string;
  equilibrium: string;
  bottom: string;
  grid: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfcfe',
    ink: '#303744',
    muted: '#8491a1',
    spring: '#39485a',
    ball: '#26a7e0',
    velocity: '#168f7f',
    acceleration: '#e34a54',
    equilibrium: '#18a86d',
    bottom: '#e34a54',
    grid: '#e7edf3'
  },
  dark: {
    bg: '#101827',
    ink: '#eef2f7',
    muted: '#a4b1c2',
    spring: '#c1cddd',
    ball: '#5ed0f5',
    velocity: '#55dfc8',
    acceleration: '#ff6971',
    equilibrium: '#53d7a4',
    bottom: '#ff8b8f',
    grid: '#2b3a4f'
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
  weight = 700
): void {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

function arrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  length: number,
  angle: number,
  color: string,
  width = 3,
  scale = 1
): void {
  const x2 = x + Math.cos(angle) * length;
  const y2 = y + Math.sin(angle) * length;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  const head = 9 * scale;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - Math.cos(angle - 0.45) * head,
    y2 - Math.sin(angle - 0.45) * head
  );
  ctx.lineTo(
    x2 - Math.cos(angle + 0.45) * head,
    y2 - Math.sin(angle + 0.45) * head
  );
  ctx.closePath();
  ctx.fill();
}

function graphSize(canvas: HTMLCanvasElement): {
  ctx: CanvasRenderingContext2D | null;
  width: number;
  height: number;
  responsiveScale: number;
} {
  const rect = canvas.getBoundingClientRect();
  const measuredWidth = Math.max(
    1,
    Math.round(rect.width || canvas.clientWidth || 1)
  );
  const measuredHeight = Math.max(
    1,
    Math.round(rect.height || canvas.clientHeight || 1)
  );
  const responsiveScale = getResponsiveScale(measuredWidth, measuredHeight);
  const width = Math.max(scaledSize(320, responsiveScale, 280), measuredWidth);
  const height = Math.max(
    scaledSize(180, responsiveScale, 160),
    measuredHeight
  );
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.dataset.responsiveScale = String(responsiveScale);
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width, height, responsiveScale };
}

function drawReferences(
  ctx: CanvasRenderingContext2D,
  state: SpringBallState,
  p: Palette,
  scale: number
): void {
  const left = C.fieldLeft + 12;
  const right = C.fieldRight - 10;
  const yFor = (value: number) =>
    Math.max(26, Math.min(C.floorY - 24, C.originY + value * C.positionScale));
  const lines = [
    { value: 0, color: p.muted, label: 'x=0' },
    { value: state.equilibriumX, color: p.equilibrium, label: 'x₀' },
    { value: state.bottomX, color: p.bottom, label: 'x底' }
  ];
  lines.forEach(({ value, color, label }) => {
    const y = yFor(value);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6 * scale;
    ctx.setLineDash([7, 7]);
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
    ctx.setLineDash([]);
    text(ctx, label, right, y - 15 * scale, color, 13 * scale, 'right', 700);
  });
}

function drawSpring(
  ctx: CanvasRenderingContext2D,
  state: SpringBallState,
  p: Palette,
  scale: number
): void {
  const cx = C.fieldLeft + C.springCenterX;
  const radius = C.ballRadius * scale;
  const ballY = Math.max(
    C.minBallCenterY,
    Math.min(
      C.floorY - radius - 8 * scale,
      C.originY + state.x * C.positionScale
    )
  );
  const naturalTop = C.originY + radius + 8 * scale;
  const springTop =
    state.stage === 'free-fall' ? naturalTop : ballY + radius + 8 * scale;
  const springBottom = C.floorY - 28;
  const length = Math.max(42, springBottom - springTop);
  const coils = 14;
  const step = length / coils;
  ctx.strokeStyle = p.spring;
  ctx.lineWidth = 5 * scale;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, springTop);
  for (let i = 0; i < coils; i += 1) {
    ctx.lineTo(
      cx + (i % 2 === 0 ? -26 : 26) * scale,
      springTop + step * (i + 0.5)
    );
    ctx.lineTo(cx, springTop + step * (i + 1));
  }
  ctx.stroke();
  ctx.fillStyle = p.spring;
  ctx.fillRect(
    cx - (C.springBaseWidth * scale) / 2,
    C.floorY - 30 * scale,
    C.springBaseWidth * scale,
    12 * scale
  );
  ctx.fillRect(
    C.fieldLeft + C.springFloorX,
    C.floorY - 18 * scale,
    C.springFloorWidth * scale,
    8 * scale
  );
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(C.fieldLeft + C.springFloorEdgeLeft, C.floorY - 10);
  ctx.lineTo(C.fieldLeft + C.springFloorEdgeRight, C.floorY - 10);
  ctx.stroke();
  const glow = ctx.createRadialGradient(
    cx - 7 * scale,
    ballY - 8 * scale,
    4 * scale,
    cx,
    ballY,
    radius * 1.35
  );
  glow.addColorStop(0, '#ffffff');
  glow.addColorStop(0.18, p.ball);
  glow.addColorStop(1, p.ball);
  ctx.beginPath();
  ctx.arc(cx, ballY, radius, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2 * scale;
  ctx.stroke();
  text(ctx, 'm', cx, ballY + 1 * scale, '#ffffff', 16 * scale, 'center', 800);
  if (state.stage === 'free-fall' || Math.abs(state.velocity) > 0.05) {
    const vAngle =
      state.stage === 'free-fall' || state.velocity >= 0
        ? Math.PI / 2
        : -Math.PI / 2;
    arrow(
      ctx,
      cx + 34 * scale,
      ballY,
      46 * scale,
      vAngle,
      p.velocity,
      3.2 * scale,
      scale
    );
    text(
      ctx,
      'v',
      cx + 48 * scale,
      ballY + (vAngle > 0 ? 32 : -32) * scale,
      p.velocity,
      15 * scale,
      'center',
      800
    );
  }
  const aAngle = state.acceleration >= 0 ? Math.PI / 2 : -Math.PI / 2;
  arrow(
    ctx,
    cx - 34 * scale,
    ballY,
    40 * scale,
    aAngle,
    p.acceleration,
    3.2 * scale,
    scale
  );
  text(
    ctx,
    'a',
    cx - 49 * scale,
    ballY + (aAngle > 0 ? 29 : -29) * scale,
    p.acceleration,
    15 * scale,
    'center',
    800
  );
}

function drawAnimation(
  ctx: CanvasRenderingContext2D,
  state: SpringBallState,
  p: Palette,
  scale: number
): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, C.baseWidth, C.baseHeight);
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let y = C.fieldTop; y <= C.floorY - 30; y += 60) {
    ctx.beginPath();
    ctx.moveTo(C.fieldLeft, y);
    ctx.lineTo(C.fieldRight, y);
    ctx.stroke();
  }
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 1.7 * scale;
  ctx.beginPath();
  ctx.moveTo(C.fieldLeft + 24, C.fieldTop);
  ctx.lineTo(C.fieldLeft + 24, C.floorY - 18);
  ctx.stroke();
  text(
    ctx,
    'x',
    C.fieldLeft + 24,
    C.fieldTop - 18 * scale,
    p.ink,
    14 * scale,
    'center',
    800
  );
  for (let y = C.fieldTop + 20; y < C.floorY - 20; y += 40) {
    ctx.beginPath();
    ctx.moveTo(C.fieldLeft + 18, y);
    ctx.lineTo(C.fieldLeft + 30, y);
    ctx.stroke();
  }
  drawReferences(ctx, state, p, scale);
  drawSpring(ctx, state, p, scale);
}

function drawGraph(
  ctx: CanvasRenderingContext2D,
  state: SpringBallState,
  width: number,
  height: number,
  p: Palette,
  scale: number
): void {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, width, height);
  const left = 48;
  const right = width - 20;
  const top = 20;
  const bottom = height - 34;
  const tMax = Math.max(1.6, state.contactTime + 1.05);
  const xMin = Math.min(-0.08, -state.params.releaseHeight - 0.08);
  const xMax = Math.max(0.72, state.bottomX + 0.08);
  const px = (t: number) =>
    left + Math.max(0, Math.min(1, t / tMax)) * (right - left);
  const py = (x: number) =>
    bottom -
    ((Math.max(xMin, Math.min(xMax, x)) - xMin) / (xMax - xMin)) *
      (bottom - top);
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const x = left + ((right - left) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
  }
  [0, state.equilibriumX, state.bottomX].forEach((value, index) => {
    ctx.strokeStyle =
      index === 0 ? p.muted : index === 1 ? p.equilibrium : p.bottom;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(left, py(value));
    ctx.lineTo(right, py(value));
    ctx.stroke();
    ctx.setLineDash([]);
  });
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(left, bottom);
  ctx.lineTo(right, bottom);
  ctx.moveTo(left, bottom);
  ctx.lineTo(left, top);
  ctx.stroke();
  const points =
    state.history.length > 0
      ? state.history
      : [{ t: 0, x: -state.params.releaseHeight }];
  ctx.strokeStyle = p.ball;
  ctx.lineWidth = 2.5 * scale;
  ctx.beginPath();
  points.forEach((point, index) => {
    const x = px(point.t);
    const y = py(point.x);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  text(ctx, 'x / m', left, top - 6 * scale, p.ink, 12 * scale, 'left', 700);
  text(
    ctx,
    't / s',
    right,
    bottom + 20 * scale,
    p.ink,
    12 * scale,
    'right',
    700
  );
  text(
    ctx,
    'x₀',
    right - 4,
    py(state.equilibriumX) - 11 * scale,
    p.equilibrium,
    11 * scale,
    'right',
    700
  );
  text(
    ctx,
    'x底',
    right - 4,
    py(state.bottomX) - 11 * scale,
    p.bottom,
    11 * scale,
    'right',
    700
  );
}

export function createSpringBallView(
  options: CreateSpringBallViewOptions = {}
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
  let graphCanvas = options.graphCanvas ?? null;
  let graphCtx: CanvasRenderingContext2D | null = null;
  let graphWidth = scaledSize(640, 1);
  let graphHeight = scaledSize(240, 1);
  let graphResponsiveScale = 1;
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  let snapshot: SpringBallState | null = null;
  function resizeGraph(): void {
    if (!graphCanvas) return;
    const sized = graphSize(graphCanvas);
    graphCtx = sized.ctx;
    graphWidth = sized.width;
    graphHeight = sized.height;
    graphResponsiveScale = sized.responsiveScale;
  }
  function draw(state: SpringBallState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(width / C.baseWidth, height / C.baseHeight);
    const offsetX = (width - C.baseWidth * fit) / 2;
    const offsetY = (height - C.baseHeight * fit) / 2;
    const scale = Math.min(1, env.contentScale() * stage.responsiveScale);
    const p = PALETTE[env.theme];
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fit, fit);
    drawAnimation(ctx, state, p, scale);
    ctx.restore();
    if (graphCanvas) {
      if (!graphCtx) resizeGraph();
      if (graphCtx)
        drawGraph(
          graphCtx,
          state,
          graphWidth,
          graphHeight,
          p,
          Math.min(1, graphResponsiveScale)
        );
    }
  }
  if (graphCanvas) resizeGraph();
  return {
    render(state: SpringBallState): void {
      snapshot = state;
      stage.ensureSized();
      draw(state);
    },
    resize(): void {
      stage.resize();
      resizeGraph();
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
    attachGraphCanvas(canvas: HTMLCanvasElement): void {
      graphCanvas = canvas;
      resizeGraph();
      if (snapshot) draw(snapshot);
    },
    dispose(): void {
      snapshot = null;
      stage.release();
      graphCanvas = null;
      graphCtx = null;
    },
    reset(): void {
      snapshot = null;
    }
  };
}
