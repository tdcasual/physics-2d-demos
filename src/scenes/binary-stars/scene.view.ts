import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  binaryStarsConstants as C,
  stageLayoutFrom,
  stageTransform,
  type BinaryStarsState
} from './scene.sim';

export type CreateBinaryStarsViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

type Palette = {
  field: string;
  stars: string;
  orbit1: string;
  orbit2: string;
  red: string;
  blue: string;
  teal: string;
  yellow: string;
  line: string;
  cm: string;
  label: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    field: '#071426',
    stars: '#9eb2cc',
    orbit1: '#9b315f',
    orbit2: '#20579d',
    red: '#f03d73',
    blue: '#347cf1',
    teal: '#19d5a2',
    yellow: '#ffc84a',
    line: '#8b9bb0',
    cm: '#f2f5fb',
    label: '#eef2f8'
  },
  dark: {
    field: '#071426',
    stars: '#8ba1bf',
    orbit1: '#e85c91',
    orbit2: '#65a2ff',
    red: '#fb7185',
    blue: '#60a5fa',
    teal: '#34d399',
    yellow: '#facc15',
    line: '#93a4bb',
    cm: '#f8fafc',
    label: '#eef2f8'
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
  head = 9
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (length < 2) return;
  const ux = dx / length;
  const uy = dy / length;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
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
  ctx.restore();
}

function drawStars(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string
): void {
  const count = Math.max(28, Math.round((width * height) / 14000));
  ctx.fillStyle = color;
  for (let i = 0; i < count; i += 1) {
    const x = ((i * 197 + 41) * 13) % Math.max(1, width);
    const y = ((i * 83 + 17) * 19) % Math.max(1, height);
    ctx.globalAlpha = 0.28 + (i % 4) * 0.16;
    ctx.beginPath();
    ctx.arc(x, y, 0.7 + (i % 3) * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawOrbit(
  ctx: CanvasRenderingContext2D,
  radius: number,
  color: string
): void {
  if (radius < 0.4) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.62;
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 8]);
  ctx.beginPath();
  ctx.arc(C.center.x, C.center.y, radius * C.orbitScale, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawTrail(
  ctx: CanvasRenderingContext2D,
  radius: number,
  theta: number,
  color: string
): void {
  const r = radius * C.orbitScale;
  if (r < 8) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.arc(C.center.x, C.center.y, r, theta - 0.62, theta);
  ctx.stroke();
  ctx.restore();
}

function starRadius(mass: number): number {
  return 12 + mass * 2.4;
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  mass: number,
  color: string,
  label: string,
  contentScale: number
): void {
  const radius = starRadius(mass);
  const gradient = ctx.createRadialGradient(
    x - 4,
    y - 5,
    2,
    x,
    y,
    radius * 1.8
  );
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.22, color);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius * 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  text(
    ctx,
    label,
    x,
    y,
    '#ffffff',
    Math.max(12, radius * 0.72) * contentScale,
    'center',
    700
  );
}

function drawCenterOfMass(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  contentScale: number
): void {
  const { x, y } = C.center;
  ctx.save();
  ctx.strokeStyle = p.cm;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 11, y);
  ctx.lineTo(x + 11, y);
  ctx.moveTo(x, y - 11);
  ctx.lineTo(x, y + 11);
  ctx.stroke();
  ctx.restore();
  text(ctx, 'O（质心）', x + 16, y + 18, p.label, 14 * contentScale);
}

export function createBinaryStarsView(
  options: CreateBinaryStarsViewOptions = {}
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
  let snapshot: BinaryStarsState | null = null;

  function draw(state: BinaryStarsState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const layout = stageLayoutFrom(stage.canvas);
    const { fit, offsetX, offsetY } = stageTransform(width, height, layout);
    const p = PALETTE[env.theme];
    const contentScale = env.contentScale() * stage.responsiveScale;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = p.field;
    ctx.fillRect(0, 0, width, height);
    drawStars(ctx, width, height, p.stars);

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fit, fit);

    drawOrbit(ctx, state.r1, p.orbit1);
    drawOrbit(ctx, state.r2, p.orbit2);
    drawTrail(ctx, state.r1, state.theta, p.red);
    drawTrail(ctx, state.r2, state.theta + Math.PI, p.blue);

    ctx.save();
    ctx.strokeStyle = p.line;
    ctx.globalAlpha = 0.75;
    ctx.setLineDash([5, 7]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(state.position1.x, state.position1.y);
    ctx.lineTo(state.position2.x, state.position2.y);
    ctx.stroke();
    ctx.restore();

    drawCenterOfMass(ctx, p, contentScale);

    if (state.params.showVectors) {
      const v1x = state.position1.x + state.velocity1.x * C.velocityScale;
      const v1y = state.position1.y + state.velocity1.y * C.velocityScale;
      const v2x = state.position2.x + state.velocity2.x * C.velocityScale;
      const v2y = state.position2.y + state.velocity2.y * C.velocityScale;
      arrow(ctx, state.position1.x, state.position1.y, v1x, v1y, p.teal, 3, 11);
      arrow(ctx, state.position2.x, state.position2.y, v2x, v2y, p.teal, 3, 11);
      text(
        ctx,
        'v₁',
        v1x + 9,
        v1y - 10,
        p.teal,
        14 * contentScale,
        'left',
        700
      );
      text(
        ctx,
        'v₂',
        v2x + 9,
        v2y - 10,
        p.teal,
        14 * contentScale,
        'left',
        700
      );

      const dx = state.position2.x - state.position1.x;
      const dy = state.position2.y - state.position1.y;
      const length = Math.hypot(dx, dy) || 1;
      const ux = dx / length;
      const uy = dy / length;
      const forceLength = Math.max(
        24,
        Math.min(72, state.force * C.forceScale)
      );
      const f1x = state.position1.x + ux * forceLength;
      const f1y = state.position1.y + uy * forceLength;
      const f2x = state.position2.x - ux * forceLength;
      const f2y = state.position2.y - uy * forceLength;
      arrow(
        ctx,
        state.position1.x,
        state.position1.y,
        f1x,
        f1y,
        p.yellow,
        3,
        11
      );
      arrow(
        ctx,
        state.position2.x,
        state.position2.y,
        f2x,
        f2y,
        p.yellow,
        3,
        11
      );
      text(
        ctx,
        'F₁',
        f1x + ux * 16,
        f1y + uy * 16,
        p.yellow,
        14 * contentScale,
        'center',
        700
      );
      text(
        ctx,
        'F₂',
        f2x - ux * 16,
        f2y - uy * 16,
        p.yellow,
        14 * contentScale,
        'center',
        700
      );
    }

    drawStar(
      ctx,
      state.position1.x,
      state.position1.y,
      state.params.m1,
      p.red,
      'm₁',
      contentScale
    );
    drawStar(
      ctx,
      state.position2.x,
      state.position2.y,
      state.params.m2,
      p.blue,
      'm₂',
      contentScale
    );
    ctx.restore();
  }

  return {
    render(state: BinaryStarsState): void {
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
