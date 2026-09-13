import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { cyclotronConstants, type CyclotronState } from './scene.sim';

export type CreateCyclotronViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

const {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  center: CENTER,
  deeRadius: R
} = cyclotronConstants;

type Palette = {
  bg: string;
  panel: string;
  ink: string;
  muted: string;
  red: string;
  blue: string;
  teal: string;
  bField: string;
  deeTop: string;
  deeBottom: string;
  deeStroke: string;
  border: string;
  yellow: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#FAF7F2',
    panel: '#FFFFFF',
    ink: '#2B3035',
    muted: '#868E96',
    red: '#E63946',
    blue: '#4CC9F0',
    teal: '#2A9D8F',
    bField: '#ADB5BD',
    deeTop: 'rgba(255,245,242,0.92)',
    deeBottom: 'rgba(233,236,239,0.72)',
    deeStroke: '#6C757D',
    border: '#DEE2E6',
    yellow: '#FFC857'
  },
  dark: {
    bg: '#0f172a',
    panel: '#111827',
    ink: '#e2e8f0',
    muted: '#94a3b8',
    red: '#fb7185',
    blue: '#67e8f9',
    teal: '#34d399',
    bField: '#94a3b8',
    deeTop: 'rgba(127,29,29,0.34)',
    deeBottom: 'rgba(71,85,105,0.42)',
    deeStroke: '#94a3b8',
    border: '#334155',
    yellow: '#facc15'
  }
};

function label(
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

function arrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width: number
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;
  const ux = dx / len;
  const uy = dy / len;
  const head = Math.min(10, Math.max(6, len * 0.24));
  ctx.save();
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

function drawDee(
  ctx: CanvasRenderingContext2D,
  top: boolean,
  fill: string,
  stroke: string
): void {
  const y = CENTER.y + (top ? -10 : 10);
  ctx.beginPath();
  ctx.moveTo(CENTER.x - R, y);
  ctx.lineTo(CENTER.x + R, y);
  ctx.arc(CENTER.x, y, R, 0, Math.PI, top);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawMagneticXs(ctx: CanvasRenderingContext2D, color: string): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.1;
  for (let x = CENTER.x - R + 24; x <= CENTER.x + R - 24; x += 38) {
    for (let y = CENTER.y - R + 24; y <= CENTER.y + R - 24; y += 38) {
      const d = Math.hypot(x - CENTER.x, y - CENTER.y);
      if (d > R - 18 || Math.abs(y - CENTER.y) < 18) continue;
      ctx.beginPath();
      ctx.moveTo(x - 5, y - 5);
      ctx.lineTo(x + 5, y + 5);
      ctx.moveTo(x + 5, y - 5);
      ctx.lineTo(x - 5, y + 5);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawSource(ctx: CanvasRenderingContext2D, p: Palette): void {
  const x = 56;
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x + 28, CENTER.y);
  ctx.lineTo(CENTER.x - R, CENTER.y);
  ctx.moveTo(x - 28, CENTER.y);
  ctx.lineTo(28, CENTER.y);
  ctx.stroke();
  ctx.fillStyle = p.panel;
  ctx.beginPath();
  ctx.arc(x, CENTER.y, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.deeStroke;
  ctx.stroke();
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 15, CENTER.y);
  ctx.bezierCurveTo(
    x - 10,
    CENTER.y - 13,
    x - 2,
    CENTER.y - 13,
    x + 3,
    CENTER.y
  );
  ctx.bezierCurveTo(
    x + 8,
    CENTER.y + 13,
    x + 14,
    CENTER.y + 13,
    x + 16,
    CENTER.y
  );
  ctx.stroke();
  label(ctx, 'U~', x - 3, CENTER.y + 45, p.ink, 14, 'center');
}

function drawField(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  topPositive: boolean
): void {
  for (let x = CENTER.x - R + 35; x <= CENTER.x + R - 35; x += 72) {
    const from = topPositive ? CENTER.y - 22 : CENTER.y + 22;
    const to = topPositive ? CENTER.y + 22 : CENTER.y - 22;
    arrow(ctx, x, from, x, to, p.blue, 2);
  }
}

export function createCyclotronView(options: CreateCyclotronViewOptions = {}) {
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
  let snapshot: CyclotronState | null = null;

  function draw(state: CyclotronState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(width / BASE_W, height / BASE_H);
    const offsetY = (height - BASE_H * fit) / 2;
    const p = PALETTE[env.theme];
    const cs = env.contentScale() * stage.responsiveScale;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(0, offsetY);
    ctx.scale(fit, fit);
    drawDee(ctx, true, p.deeTop, p.deeStroke);
    drawDee(ctx, false, p.deeBottom, p.deeStroke);
    drawMagneticXs(ctx, p.bField);
    ctx.strokeStyle = p.panel;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(CENTER.x - R, CENTER.y);
    ctx.lineTo(CENTER.x + R, CENTER.y);
    ctx.stroke();
    ctx.strokeStyle = p.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(CENTER.x - R, CENTER.y);
    ctx.lineTo(CENTER.x + R, CENTER.y);
    ctx.stroke();
    drawSource(ctx, p);
    if (state.params.showField) drawField(ctx, p, state.topPositive);

    state.orbits.forEach((orbit, index) => {
      ctx.save();
      ctx.strokeStyle =
        index <= state.crossings ? p.red : 'rgba(230,57,70,0.34)';
      ctx.lineWidth = (index === state.crossings ? 3 : 1.7) * cs;
      ctx.beginPath();
      ctx.arc(
        CENTER.x,
        CENTER.y,
        orbit.radius,
        orbit.startAngle,
        orbit.endAngle,
        orbit.endAngle < orbit.startAngle
      );
      ctx.stroke();
      ctx.restore();
    });

    const particle = state.position;
    ctx.save();
    ctx.shadowColor = p.red;
    ctx.shadowBlur = 12;
    ctx.fillStyle = p.red;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, 7 * cs, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    arrow(
      ctx,
      particle.x,
      particle.y,
      particle.x + Math.cos(state.velocityAngle) * 30,
      particle.y + Math.sin(state.velocityAngle) * 30,
      p.yellow,
      2.5 * cs
    );
    label(
      ctx,
      state.topPositive ? '+' : '−',
      CENTER.x,
      CENTER.y - R + 24,
      p.red,
      18,
      'center'
    );
    label(
      ctx,
      state.topPositive ? '−' : '+',
      CENTER.x,
      CENTER.y + R - 24,
      p.ink,
      18,
      'center'
    );
    label(
      ctx,
      'B ×',
      CENTER.x + R - 42,
      CENTER.y - R + 24,
      p.bField,
      13,
      'center'
    );
    label(ctx, 'Space 暂停', BASE_W / 2, BASE_H - 18, p.muted, 12, 'center');
    ctx.restore();
  }

  return {
    render(state: CyclotronState): void {
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
