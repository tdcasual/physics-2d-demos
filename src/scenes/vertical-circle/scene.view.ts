import { scaledSize } from '../../core/canvas-sizing';
import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  stageLayoutFrom,
  stageTransform,
  verticalCircleConstants as C,
  type VerticalCircleState
} from './scene.sim';

export type CreateVerticalCircleViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

type Palette = {
  bg: string;
  panel: string;
  grid: string;
  ink: string;
  muted: string;
  red: string;
  blue: string;
  teal: string;
  green: string;
  gold: string;
  border: string;
  slack: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    panel: '#fff',
    grid: '#dfe4ea',
    ink: '#303744',
    muted: '#8b97a5',
    red: '#ef4050',
    blue: '#3c80a8',
    teal: '#1f9b8f',
    green: '#2f9e44',
    gold: '#e49a1b',
    border: '#c5ced8',
    slack: '#9aa7b5'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    grid: '#435169',
    ink: '#eef2f7',
    muted: '#9eabbc',
    red: '#fb7185',
    blue: '#60a5fa',
    teal: '#34d399',
    green: '#4ade80',
    gold: '#fbbf24',
    border: '#3c4b61',
    slack: '#64748b'
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
  width: number,
  head: number
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (length < 2) return;
  const ux = dx / length;
  const uy = dy / length;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
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

function scaled(
  magnitude: number,
  minLength: number,
  maxLength: number
): number {
  return Math.min(
    maxLength,
    Math.max(minLength, Math.abs(magnitude) * C.vectorScale)
  );
}

function drawGrid(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, C.baseWidth, C.baseHeight);
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let x = 0; x <= C.baseWidth; x += C.gridStep) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, C.baseHeight);
    ctx.stroke();
  }
  for (let y = 0; y <= C.baseHeight; y += C.gridStep) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(C.baseWidth, y);
    ctx.stroke();
  }
}

function drawOrbit(
  ctx: CanvasRenderingContext2D,
  state: VerticalCircleState,
  p: Palette,
  font: (n: number) => number
): void {
  const tick = C.orbitRadius * 0.08;
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(C.centerX, C.centerY - C.orbitRadius - tick);
  ctx.lineTo(C.centerX, C.centerY + C.orbitRadius + tick);
  ctx.moveTo(C.centerX - C.orbitRadius - tick, C.centerY);
  ctx.lineTo(C.centerX + C.orbitRadius + tick, C.centerY);
  ctx.stroke();

  if (state.params.showPath) {
    ctx.strokeStyle = p.muted;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([7, 7]);
    ctx.beginPath();
    ctx.arc(C.centerX, C.centerY, C.orbitRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  const label = font(13);
  text(
    ctx,
    '0°（最高点）',
    C.centerX,
    C.centerY - C.orbitRadius - tick - 10,
    p.muted,
    label,
    'center',
    700
  );
  text(
    ctx,
    '±180°（最低点）',
    C.centerX,
    C.centerY + C.orbitRadius + tick + 12,
    p.muted,
    label,
    'center',
    700
  );
  text(
    ctx,
    '−90°',
    C.centerX - C.orbitRadius - tick - 18,
    C.centerY,
    p.muted,
    label,
    'center',
    700
  );
  text(
    ctx,
    '90°',
    C.centerX + C.orbitRadius + tick + 16,
    C.centerY,
    p.muted,
    label,
    'center',
    700
  );
}

function drawConstraint(
  ctx: CanvasRenderingContext2D,
  state: VerticalCircleState,
  p: Palette,
  font: (n: number) => number
): void {
  const { x, y } = state.position;
  const slack = state.params.model === 'rope' && state.constraintForce < -0.01;
  ctx.strokeStyle = slack ? p.slack : p.ink;
  ctx.lineWidth = state.params.model === 'rod' ? 6 : 4.5;
  ctx.setLineDash(slack ? [5, 5] : []);
  ctx.beginPath();
  ctx.moveTo(C.centerX, C.centerY);
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.setLineDash([]);

  const mx = (C.centerX + x) / 2;
  const my = (C.centerY + y) / 2;
  const nx = (C.centerY - y) / C.orbitRadius;
  const ny = (x - C.centerX) / C.orbitRadius;
  text(ctx, 'R', mx + nx * 14, my + ny * 14, p.muted, font(13), 'center', 700);

  const angle = state.angle * (Math.PI / 180);
  const arcR = C.orbitRadius * 0.22;
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(
    C.centerX,
    C.centerY,
    arcR,
    -Math.PI / 2,
    -Math.PI / 2 + angle,
    angle < 0
  );
  ctx.stroke();
  const mid = -Math.PI / 2 + angle / 2;
  text(
    ctx,
    'θ',
    C.centerX + Math.cos(mid) * (arcR + 12),
    C.centerY + Math.sin(mid) * (arcR + 12),
    p.muted,
    font(14),
    'center',
    700
  );
}

function drawPivot(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = p.border;
  ctx.beginPath();
  ctx.arc(C.centerX, C.centerY, C.pivotRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.panel;
  ctx.beginPath();
  ctx.arc(C.centerX, C.centerY, C.pivotHub, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(C.centerX, C.centerY, C.pivotHub * 0.45, 0, Math.PI * 2);
  ctx.stroke();
}

function drawBall(
  ctx: CanvasRenderingContext2D,
  state: VerticalCircleState,
  p: Palette
): void {
  const { x, y } = state.position;
  const gradient = ctx.createRadialGradient(
    x - 6,
    y - 7,
    2,
    x,
    y,
    C.ballRadius
  );
  gradient.addColorStop(0, '#f7fbff');
  gradient.addColorStop(0.42, p.muted);
  gradient.addColorStop(1, p.ink);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, C.ballRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 1.6;
  ctx.stroke();
}

function drawVectors(
  ctx: CanvasRenderingContext2D,
  state: VerticalCircleState,
  p: Palette,
  font: (n: number) => number
): void {
  if (!state.params.showVectors) return;
  const { x, y } = state.position;
  const angle = state.angle * (Math.PI / 180);
  const inwardX = (C.centerX - x) / C.orbitRadius;
  const inwardY = (C.centerY - y) / C.orbitRadius;
  const tangentX = Math.cos(angle);
  const tangentY = Math.sin(angle);
  const gLen = C.gravityLength;
  const minL = C.minVectorLength;
  const maxL = C.maxVectorLength;
  const label = font(14);

  const grLen = scaled(state.gravityRadial, 12, maxL);
  const gtLen = scaled(state.gravityTangential, 12, maxL);
  const grX = Math.sign(state.gravityRadial || 1) * grLen * inwardX;
  const grY = Math.sign(state.gravityRadial || 1) * grLen * inwardY;
  const gtX = Math.sign(state.gravityTangential || 1) * gtLen * tangentX;
  const gtY = Math.sign(state.gravityTangential || 1) * gtLen * tangentY;

  ctx.save();
  ctx.setLineDash([5, 4]);
  ctx.strokeStyle = p.green;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + grX, y + grY);
  ctx.lineTo(x + grX + gtX, y + grY + gtY);
  ctx.lineTo(x + gtX, y + gtY);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
  if (Math.abs(state.gravityRadial) > 0.05) {
    arrow(ctx, x, y, x + grX, y + grY, p.green, 2, 8);
    text(
      ctx,
      'G_r',
      x + grX * 0.55 + gtX * 0.12,
      y + grY * 0.55 + gtY * 0.12,
      p.green,
      font(12),
      'center',
      700
    );
  }
  if (Math.abs(state.gravityTangential) > 0.05) {
    arrow(ctx, x, y, x + gtX, y + gtY, p.green, 2, 8);
    text(
      ctx,
      'G_t',
      x + gtX * 0.62,
      y + gtY * 0.62,
      p.green,
      font(12),
      'center',
      700
    );
  }

  arrow(ctx, x, y, x, y + gLen, p.teal, 4.5, 11);
  text(ctx, 'G', x - 16, y + gLen + 12, p.teal, label, 'center', 700);

  const fnLen = scaled(state.normalForce, minL, maxL);
  arrow(ctx, x, y, x + inwardX * fnLen, y + inwardY * fnLen, p.gold, 4.5, 11);
  text(
    ctx,
    'Fₙ',
    x + inwardX * (fnLen + 16),
    y + inwardY * (fnLen + 16),
    p.gold,
    label,
    'center',
    700
  );

  const slack = state.params.model === 'rope' && state.constraintForce < -0.01;
  if (!slack && Math.abs(state.constraintForce) > 0.05) {
    const tSign = Math.sign(state.constraintForce);
    const tLen = scaled(state.constraintForce, minL, maxL);
    arrow(
      ctx,
      x,
      y,
      x + tSign * inwardX * tLen,
      y + tSign * inwardY * tLen,
      p.red,
      4.2,
      11
    );
    text(
      ctx,
      'T',
      x + tSign * inwardX * (tLen * 0.55) - tangentX * 16,
      y + tSign * inwardY * (tLen * 0.55) - tangentY * 16,
      p.red,
      label,
      'center',
      700
    );
  }

  if (state.speed > 0.05) {
    const vSign = state.sense;
    const vLen = scaled(state.speed, minL, maxL);
    arrow(
      ctx,
      x,
      y,
      x + vSign * tangentX * vLen,
      y + vSign * tangentY * vLen,
      p.blue,
      4.2,
      11
    );
    text(
      ctx,
      'v',
      x + vSign * tangentX * (vLen + 14),
      y + vSign * tangentY * (vLen + 14),
      p.blue,
      label,
      'center',
      700
    );
  }
}

export function createVerticalCircleView(
  options: CreateVerticalCircleViewOptions = {}
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
  let snapshot: VerticalCircleState | null = null;
  let parentObserved = false;
  let panelObserved = false;
  let drawing = false;
  const overlayObservers: Array<{ disconnect(): void }> = [];

  function paint(state: VerticalCircleState): void {
    if (drawing) return;
    drawing = true;
    try {
      draw(state);
    } finally {
      drawing = false;
    }
  }

  function redraw(): void {
    if (snapshot) paint(snapshot);
  }

  function watchOverlay(): void {
    if (!stage.canvas) return;
    const parent = stage.canvas.parentElement;
    if (!parent) return;
    if (!parentObserved && typeof ResizeObserver !== 'undefined') {
      parentObserved = true;
      const resize = new ResizeObserver(() => redraw());
      resize.observe(parent);
      overlayObservers.push(resize);
    }
    if (panelObserved) return;
    const panel = parent.querySelector(
      '.teaching-readout-panel, .srgb-readout-panel, .readout-panel'
    );
    if (!(panel instanceof HTMLElement)) return;
    panelObserved = true;
    if (typeof ResizeObserver !== 'undefined') {
      const resize = new ResizeObserver(() => redraw());
      resize.observe(panel);
      overlayObservers.push(resize);
    }
    if (typeof MutationObserver !== 'undefined') {
      const mutate = new MutationObserver(() => redraw());
      mutate.observe(panel, {
        attributes: true,
        attributeFilter: ['class', 'style']
      });
      overlayObservers.push(mutate);
    }
  }

  function draw(state: VerticalCircleState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const layout = stageLayoutFrom(stage.canvas);
    const { fit, offsetX, offsetY } = stageTransform(width, height, layout);
    const p = PALETTE[env.theme];
    const rs = stage.responsiveScale;
    const typeScale = env.fontScale() * Math.min(env.contentScale(), 1.25);
    const font = (base: number): number =>
      scaledSize(base * typeScale, Math.max(rs, 0.3), 11) / Math.max(fit, 0.05);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fit, fit);
    drawGrid(ctx, p);
    drawOrbit(ctx, state, p, font);
    drawConstraint(ctx, state, p, font);
    drawPivot(ctx, p);
    drawVectors(ctx, state, p, font);
    drawBall(ctx, state, p);
    ctx.restore();
  }

  return {
    render(state: VerticalCircleState): void {
      snapshot = state;
      stage.ensureSized();
      watchOverlay();
      paint(state);
    },
    resize(): void {
      stage.resize();
      if (snapshot) paint(snapshot);
    },
    setTheme(theme: TeachingTheme): void {
      env.setTheme(theme);
      if (snapshot) paint(snapshot);
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints): void {
      env.setMode(mode, hints);
      if (snapshot) paint(snapshot);
    },
    dispose(): void {
      snapshot = null;
      for (const observer of overlayObservers) observer.disconnect();
      overlayObservers.length = 0;
      parentObserved = false;
      panelObserved = false;
      stage.release();
    }
  };
}
