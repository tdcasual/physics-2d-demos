import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  diagramFitScale,
  parallelogramConstants as C,
  stageLayoutFrom,
  stageTransform,
  type ParallelogramState,
  type Vector
} from './scene.sim';

export type CreateParallelogramViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

type Palette = {
  bg: string;
  paper: string;
  ink: string;
  muted: string;
  red: string;
  blue: string;
  green: string;
  orange: string;
  pin: string;
  pinRim: string;
  band: string;
  hook: string;
  ruler: string;
  rulerInk: string;
  square: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#e8dfd0',
    paper: '#fffcf7',
    ink: '#334155',
    muted: '#8a97a8',
    red: '#ef4b3e',
    blue: '#2b97dc',
    green: '#15a66d',
    orange: '#ec8a14',
    pin: '#e7b84a',
    pinRim: '#c48a1c',
    band: '#f0a12a',
    hook: '#efc15a',
    ruler: '#f7f4ee',
    rulerInk: '#5b6570',
    square: '#e8923a'
  },
  dark: {
    bg: '#0f172a',
    paper: '#182235',
    ink: '#e5e7eb',
    muted: '#94a3b8',
    red: '#fb7185',
    blue: '#60a5fa',
    green: '#34d399',
    orange: '#fbbf24',
    pin: '#e7b84a',
    pinRim: '#b45309',
    band: '#f59e0b',
    hook: '#fbbf24',
    ruler: '#1f2937',
    rulerInk: '#cbd5e1',
    square: '#f59e0b'
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

function pointOf(vector: Vector, scale: number): { x: number; y: number } {
  return {
    x: C.origin.x + vector.x * scale,
    y: C.origin.y + vector.y * scale
  };
}

function arrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width: number,
  dashed = false,
  dashOffset = 0
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (length < 2) return;
  const ux = dx / length;
  const uy = dy / length;
  const head = Math.min(13, Math.max(7, length * 0.12));
  const shrink = head * 0.82;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash(dashed ? [6, 5] : []);
  ctx.lineDashOffset = dashed ? dashOffset : 0;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2 - ux * shrink, y2 - uy * shrink);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - ux * head - uy * head * 0.48,
    y2 - uy * head + ux * head * 0.48
  );
  ctx.lineTo(
    x2 - ux * head + uy * head * 0.48,
    y2 - uy * head - ux * head * 0.48
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  palette: Palette
): void {
  ctx.save();
  ctx.fillStyle = 'rgba(40, 50, 62, 0.16)';
  ctx.beginPath();
  ctx.ellipse(
    x + 1.2,
    y + 2.4,
    C.pinRadius * 0.72,
    C.pinRadius * 0.38,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.fillStyle = palette.pin;
  ctx.strokeStyle = palette.pinRim;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(x, y, C.pinRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.arc(x - 2.2, y - 2.4, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHook(
  ctx: CanvasRenderingContext2D,
  palette: Palette,
  cs: number
): void {
  const { x, y } = C.hook;
  ctx.save();
  ctx.strokeStyle = palette.pinRim;
  ctx.lineWidth = 2 * cs;
  ctx.beginPath();
  ctx.moveTo(x, y - 16);
  ctx.lineTo(x, y - 4);
  ctx.stroke();
  ctx.fillStyle = palette.pinRim;
  ctx.beginPath();
  ctx.arc(x, y - 18, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = palette.hook;
  ctx.strokeStyle = palette.pinRim;
  ctx.lineWidth = 2.2 * cs;
  ctx.beginPath();
  ctx.arc(x, y + 6, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = palette.paper;
  ctx.beginPath();
  ctx.arc(x, y + 7, 5.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBand(
  ctx: CanvasRenderingContext2D,
  palette: Palette,
  cs: number
): void {
  ctx.save();
  ctx.strokeStyle = palette.band;
  ctx.lineWidth = 5 * cs;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(C.hook.x, C.hook.y + 18);
  ctx.lineTo(C.origin.x, C.origin.y);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 236, 180, 0.45)';
  ctx.lineWidth = 1.6 * cs;
  ctx.beginPath();
  ctx.moveTo(C.hook.x - 1.4, C.hook.y + 18);
  ctx.lineTo(C.origin.x - 1.4, C.origin.y);
  ctx.stroke();
  ctx.restore();
}

function drawOrigin(
  ctx: CanvasRenderingContext2D,
  palette: Palette,
  cs: number
): void {
  ctx.save();
  ctx.strokeStyle = palette.red;
  ctx.lineWidth = 1.2 * cs;
  ctx.setLineDash([3, 3]);
  for (let i = 0; i < 8; i += 1) {
    const a = (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(
      C.origin.x + Math.cos(a) * (C.pointRadius + 2),
      C.origin.y + Math.sin(a) * (C.pointRadius + 2)
    );
    ctx.lineTo(
      C.origin.x + Math.cos(a) * (C.pointRadius + 7),
      C.origin.y + Math.sin(a) * (C.pointRadius + 7)
    );
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.fillStyle = palette.paper;
  ctx.strokeStyle = palette.orange;
  ctx.lineWidth = 3 * cs;
  ctx.beginPath();
  ctx.arc(C.origin.x, C.origin.y, C.pointRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = palette.orange;
  ctx.beginPath();
  ctx.arc(C.origin.x, C.origin.y, 4, 0, Math.PI * 2);
  ctx.fill();
  text(
    ctx,
    'O',
    C.origin.x - 18,
    C.origin.y + 26,
    palette.red,
    15 * cs,
    'right',
    700
  );
  ctx.restore();
}

function drawRuler(
  ctx: CanvasRenderingContext2D,
  palette: Palette,
  cs: number
): void {
  const { x, y, width, height, angle } = C.ruler;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((angle * Math.PI) / 180);
  ctx.fillStyle = 'rgba(40, 50, 62, 0.08)';
  ctx.beginPath();
  ctx.roundRect(3, 3, width, height, 8);
  ctx.fill();
  ctx.fillStyle = palette.ruler;
  ctx.strokeStyle = palette.muted;
  ctx.lineWidth = 1.4 * cs;
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, 8);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = palette.rulerInk;
  ctx.fillStyle = palette.rulerInk;
  ctx.lineWidth = 1;
  const start = 14;
  const span = width - 28;
  ctx.beginPath();
  ctx.moveTo(start, height * 0.62);
  ctx.lineTo(start + span, height * 0.62);
  ctx.stroke();
  for (let i = 0; i <= 20; i += 1) {
    const tx = start + (i / 20) * span;
    const tall = i % 5 === 0;
    ctx.beginPath();
    ctx.moveTo(tx, height * 0.62);
    ctx.lineTo(tx, height * 0.62 - (tall ? 12 : 7));
    ctx.stroke();
    if (i % 5 === 0) {
      text(ctx, String(i), tx, 11, palette.rulerInk, 9 * cs, 'center', 500);
    }
  }
  text(ctx, 'cm', width - 16, height - 10, palette.muted, 9 * cs, 'right', 500);
  ctx.restore();
}

function drawSetSquare(
  ctx: CanvasRenderingContext2D,
  palette: Palette,
  cs: number
): void {
  const { x, y, size, angle } = C.setSquare;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((angle * Math.PI) / 180);
  ctx.strokeStyle = palette.square;
  ctx.fillStyle = 'rgba(232, 146, 58, 0.08)';
  ctx.lineWidth = 2.4 * cs;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(0, size);
  ctx.lineTo(size, size);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(18, size - 18);
  ctx.lineTo(size - 38, size - 18);
  ctx.lineTo(18, 38);
  ctx.closePath();
  ctx.stroke();
  ctx.strokeStyle = palette.square;
  ctx.lineWidth = 1 * cs;
  for (let i = 0; i <= 10; i += 1) {
    const t = 18 + ((size - 38 - 18) * i) / 10;
    const mark = i % 5 === 0 ? 10 : 6;
    ctx.beginPath();
    ctx.moveTo(t, size - 18);
    ctx.lineTo(t, size - 18 + mark);
    ctx.stroke();
  }
  text(
    ctx,
    '10',
    size * 0.42,
    size - 4,
    palette.square,
    10 * cs,
    'center',
    600
  );
  ctx.restore();
}

function labelBeside(
  from: { x: number; y: number },
  to: { x: number; y: number },
  side: number,
  dist: number
): { x: number; y: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  return {
    x: from.x + dx * 0.62 + (-dy / len) * side * dist,
    y: from.y + dy * 0.62 + (dx / len) * side * dist
  };
}

export function createParallelogramView(
  options: CreateParallelogramViewOptions = {}
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
  let snapshot: ParallelogramState | null = null;

  function draw(state: ParallelogramState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const layout = stageLayoutFrom(stage.canvas);
    const { fit, offsetX, offsetY, boxW, boxH } = stageTransform(
      width,
      height,
      layout
    );
    const palette = PALETTE[env.theme];
    const cs = env.contentScale() * stage.responsiveScale;
    const scale = C.vectorScale * diagramFitScale(state);
    const f1 = pointOf(state.f1, scale);
    const f2 = pointOf(state.f2, scale);
    const r = pointOf(state.resultant, scale);
    const m = pointOf(state.measured, scale);
    const dash = -state.time * 22;
    const showParallelogram = state.params.stage !== 'components';
    const showMeasured = state.params.stage === 'compare';

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fit, fit);

    ctx.save();
    ctx.shadowColor = 'rgba(48, 40, 28, 0.16)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = palette.paper;
    ctx.beginPath();
    ctx.roundRect(0, 0, boxW, boxH, 18);
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.roundRect(0, 0, boxW, boxH, 18);
    ctx.strokeStyle = 'rgba(120, 100, 70, 0.18)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(0, 0, boxW, boxH, 18);
    ctx.clip();

    drawPin(ctx, C.pinInset, C.pinInset, palette);
    drawPin(ctx, boxW - C.pinInset, C.pinInset, palette);
    drawPin(ctx, C.pinInset, boxH - C.pinInset, palette);
    drawPin(ctx, boxW - C.pinInset, boxH - C.pinInset, palette);

    ctx.strokeStyle = palette.muted;
    ctx.lineWidth = 1.2 * cs;
    ctx.setLineDash([7, 6]);
    ctx.beginPath();
    ctx.moveTo(C.origin.x, C.axisTop);
    ctx.lineTo(C.origin.x, C.axisBottom);
    ctx.stroke();
    ctx.setLineDash([]);

    drawHook(ctx, palette, cs);
    drawBand(ctx, palette, cs);
    drawOrigin(ctx, palette, cs);

    const ang1 = Math.atan2(state.f1.y, state.f1.x);
    const ang2 = Math.atan2(state.f2.y, state.f2.x);
    ctx.save();
    ctx.strokeStyle = palette.muted;
    ctx.lineWidth = 1.4 * cs;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(C.origin.x, C.origin.y, C.arcRadius, ang1, ang2, true);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    const bisectX = state.f1.x / (Math.hypot(state.f1.x, state.f1.y) || 1);
    const bisectY = state.f1.y / (Math.hypot(state.f1.x, state.f1.y) || 1);
    const bisectX2 = state.f2.x / (Math.hypot(state.f2.x, state.f2.y) || 1);
    const bisectY2 = state.f2.y / (Math.hypot(state.f2.x, state.f2.y) || 1);
    const bx = bisectX + bisectX2;
    const by = bisectY + bisectY2;
    const bl = Math.hypot(bx, by) || 1;
    text(
      ctx,
      'θ',
      C.origin.x + (bx / bl) * (C.arcRadius + 14),
      C.origin.y + (by / bl) * (C.arcRadius + 14),
      palette.muted,
      13 * cs,
      'center'
    );

    if (showParallelogram) {
      arrow(ctx, f1.x, f1.y, r.x, r.y, palette.blue, 1.6 * cs, true, dash);
      arrow(ctx, f2.x, f2.y, r.x, r.y, palette.red, 1.6 * cs, true, dash);
      arrow(ctx, C.origin.x, C.origin.y, r.x, r.y, palette.green, 4 * cs);
    }
    arrow(ctx, C.origin.x, C.origin.y, f1.x, f1.y, palette.red, 3 * cs);
    arrow(ctx, C.origin.x, C.origin.y, f2.x, f2.y, palette.blue, 3 * cs);
    if (showMeasured) {
      arrow(ctx, C.origin.x, C.origin.y, m.x, m.y, palette.orange, 2.4 * cs);
    }

    const l1 = labelBeside(C.origin, f1, 1, C.labelOffset);
    const l2 = labelBeside(C.origin, f2, -1, C.labelOffset);
    text(ctx, 'F₁', l1.x, l1.y, palette.red, 14 * cs, 'center', 700);
    text(ctx, 'F₂', l2.x, l2.y, palette.blue, 14 * cs, 'center', 700);
    if (showParallelogram) {
      text(ctx, 'F', r.x + 8, r.y + 18, palette.green, 14 * cs, 'left', 700);
    }
    if (showMeasured) {
      text(ctx, 'F′', m.x + 8, m.y + 36, palette.orange, 14 * cs, 'left', 700);
    }

    drawRuler(ctx, palette, cs);
    drawSetSquare(ctx, palette, cs);

    ctx.restore();
    ctx.restore();
  }

  return {
    render(state: ParallelogramState): void {
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
