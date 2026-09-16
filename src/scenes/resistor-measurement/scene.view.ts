import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { resistorConstants, type ResistorState } from './scene.sim';

export type CreateResistorViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

const { baseWidth: BASE_W, baseHeight: BASE_H } = resistorConstants;

type Palette = {
  bg: string;
  panel: string;
  soft: string;
  ink: string;
  muted: string;
  border: string;
  wire: string;
  flow: string;
  teal: string;
  red: string;
  gold: string;
  blue: string;
  grid: string;
  face: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#f7f4ee',
    panel: '#ffffff',
    soft: '#f1eee6',
    ink: '#2f3640',
    muted: '#7a8490',
    border: '#d5dbe1',
    wire: '#3a4450',
    flow: '#f0b429',
    teal: '#1f9d8f',
    red: '#e94b4b',
    gold: '#d99416',
    blue: '#3a7fc0',
    grid: '#e4e7e2',
    face: '#fbfaf6'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    soft: '#253249',
    ink: '#eef2f7',
    muted: '#9eabbc',
    border: '#3e4d64',
    wire: '#c2cedc',
    flow: '#ffd15c',
    teal: '#4ed9c0',
    red: '#ff707c',
    gold: '#fbbf24',
    blue: '#65b6ef',
    grid: '#2a394d',
    face: '#1a2638'
  }
};

type Pt = [number, number];

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

function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 12
): void {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function')
    ctx.roundRect(x, y, width, height, radius);
  else ctx.rect(x, y, width, height);
}

function wire(
  ctx: CanvasRenderingContext2D,
  points: Pt[],
  color: string,
  width: number,
  dashed = false
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.setLineDash(dashed ? [8, 7] : []);
  ctx.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.setLineDash([]);
}

function pathLength(points: Pt[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i += 1) {
    len += Math.hypot(
      points[i][0] - points[i - 1][0],
      points[i][1] - points[i - 1][1]
    );
  }
  return len;
}

function pointAt(points: Pt[], distance: number): Pt {
  let remain = distance;
  for (let i = 1; i < points.length; i += 1) {
    const dx = points[i][0] - points[i - 1][0];
    const dy = points[i][1] - points[i - 1][1];
    const seg = Math.hypot(dx, dy);
    if (remain <= seg) {
      const t = seg < 1e-6 ? 0 : remain / seg;
      return [points[i - 1][0] + dx * t, points[i - 1][1] + dy * t];
    }
    remain -= seg;
  }
  return points[points.length - 1];
}

function flowDots(
  ctx: CanvasRenderingContext2D,
  points: Pt[],
  phase: number,
  p: Palette,
  radius: number
): void {
  const len = pathLength(points);
  if (len < 8) return;
  const spacing = Math.max(28, len / 14);
  const offset = (((phase * 40) % spacing) + spacing) % spacing;
  ctx.fillStyle = p.flow;
  for (let d = offset; d < len; d += spacing) {
    const [x, y] = pointAt(points, d);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCircleMeter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  letter: string,
  p: Palette,
  accent: string,
  s: number
): void {
  ctx.fillStyle = p.panel;
  ctx.strokeStyle = p.wire;
  ctx.lineWidth = 3.2 * s;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  text(ctx, letter, x, y, p.ink, 22 * s, 'center', 700);
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(x - r + 3 * s, y + r - 2 * s, 5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.wire;
  ctx.beginPath();
  ctx.arc(x + r - 3 * s, y + r - 2 * s, 5 * s, 0, Math.PI * 2);
  ctx.fill();
}

function drawResistor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  p: Palette,
  s: number
): void {
  ctx.fillStyle = p.soft;
  ctx.strokeStyle = p.wire;
  ctx.lineWidth = 3.2 * s;
  rounded(ctx, x, y - height / 2, width, height, 6);
  ctx.fill();
  ctx.stroke();
  const stripeW = 5 * s;
  const colors = [p.red, p.teal, p.gold, p.blue];
  colors.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(
      x + width * (0.18 + i * 0.18),
      y - height / 2 + 2 * s,
      stripeW,
      height - 4 * s
    );
  });
}

function drawRheostat(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  position: number,
  p: Palette,
  s: number
): { sliderX: number } {
  ctx.strokeStyle = p.wire;
  ctx.lineWidth = 2.6 * s;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width, y);
  ctx.stroke();
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 10 * s;
  ctx.beginPath();
  ctx.moveTo(x + 16 * s, y);
  ctx.lineTo(x + width - 16 * s, y);
  ctx.stroke();
  const sliderX = x + 16 * s + position * (width - 32 * s);
  ctx.strokeStyle = p.gold;
  ctx.lineWidth = 3.4 * s;
  ctx.beginPath();
  ctx.moveTo(x + 16 * s, y);
  ctx.lineTo(sliderX, y);
  ctx.stroke();
  ctx.fillStyle = p.teal;
  rounded(ctx, sliderX - 11 * s, y - 20 * s, 22 * s, 18 * s, 4);
  ctx.fill();
  ctx.fillStyle = p.wire;
  ctx.beginPath();
  ctx.arc(x, y, 6 * s, 0, Math.PI * 2);
  ctx.arc(x + width, y, 6 * s, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, 'A', x - 14 * s, y, p.ink, 11 * s, 'right', 700);
  text(ctx, 'B', x + width + 14 * s, y, p.ink, 11 * s, 'left', 700);
  return { sliderX };
}

function drawSource(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  p: Palette,
  s: number
): void {
  ctx.fillStyle = p.soft;
  ctx.strokeStyle = p.wire;
  ctx.lineWidth = 3.2 * s;
  rounded(ctx, x - w / 2, y - h / 2, w, h, 10);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 6 * s;
  ctx.beginPath();
  ctx.moveTo(x - 28 * s, y - 16 * s);
  ctx.lineTo(x - 28 * s, y + 16 * s);
  ctx.stroke();
  ctx.strokeStyle = p.wire;
  ctx.lineWidth = 6 * s;
  ctx.beginPath();
  ctx.moveTo(x + 24 * s, y - 13 * s);
  ctx.lineTo(x + 24 * s, y + 13 * s);
  ctx.stroke();
  text(ctx, '+', x - 46 * s, y - 20 * s, p.red, 16 * s, 'center', 700);
  text(ctx, '−', x + 46 * s, y - 20 * s, p.ink, 16 * s, 'center', 700);
}

function drawAnalogMeter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  value: number,
  max: number,
  letter: string,
  p: Palette,
  s: number
): void {
  ctx.fillStyle = p.panel;
  ctx.strokeStyle = p.wire;
  ctx.lineWidth = 3.4 * s;
  rounded(ctx, x - w / 2, y - h / 2, w, h, 12);
  ctx.fill();
  ctx.stroke();
  const cx = x;
  const cy = y + h * 0.22;
  const r = w * 0.38;
  ctx.fillStyle = p.face;
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, 0);
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.4 * s;
  ctx.stroke();
  const t = Math.max(0, Math.min(1, value / max));
  const ang = Math.PI + t * Math.PI;
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 2.4 * s;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(ang) * r * 0.82, cy + Math.sin(ang) * r * 0.82);
  ctx.stroke();
  ctx.fillStyle = p.ink;
  ctx.beginPath();
  ctx.arc(cx, cy, 4 * s, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, letter, cx, y - h / 2 + 16 * s, p.muted, 12 * s, 'center', 700);
}

function drawCircuit(
  ctx: CanvasRenderingContext2D,
  state: ResistorState,
  p: Palette,
  s: number
): void {
  const source = { x: 480, y: 610 };
  const analogV = { x: 168, y: 610 };
  const analogA = { x: 792, y: 610 };
  const rheostat = { x: 250, y: 430, w: 380 };
  const rx = { x: 430, y: 268, w: 132, h: 34 };
  const meterA = { x: 250, y: 268, r: 36 };
  const meterV = { x: 548, y: 132, r: 36 };
  const busL = 108;
  const busR = 820;
  const rxRight = rx.x + rx.w;
  const sliderX =
    rheostat.x + 16 * s + state.params.rheostatPosition * (rheostat.w - 32 * s);
  const lw = 4.2 * s;

  const main: Pt[] = [
    [source.x - 78, source.y],
    [busL, source.y],
    [busL, meterA.y],
    [meterA.x - meterA.r, meterA.y],
    [meterA.x + meterA.r, meterA.y],
    [rx.x, rx.y],
    [rxRight, rx.y],
    [busR, rx.y],
    [busR, source.y],
    [source.x + 78, source.y]
  ];
  wire(ctx, main, p.wire, lw);

  const rheoFeed: Pt[] = [
    [busL, source.y],
    [busL, rheostat.y],
    [rheostat.x, rheostat.y]
  ];
  wire(ctx, rheoFeed, p.wire, lw);

  if (state.params.circuitMode === 'divider') {
    wire(
      ctx,
      [
        [rheostat.x + rheostat.w, rheostat.y],
        [busR, rheostat.y],
        [busR, source.y]
      ],
      p.wire,
      lw
    );
    wire(
      ctx,
      [
        [sliderX, rheostat.y],
        [sliderX, rx.y + 72],
        [rx.x, rx.y + 72],
        [rx.x, rx.y]
      ],
      p.teal,
      3.2 * s,
      true
    );
  } else {
    wire(
      ctx,
      [
        [sliderX, rheostat.y],
        [sliderX, rx.y + 72],
        [rx.x, rx.y + 72],
        [rx.x, rx.y]
      ],
      p.gold,
      lw
    );
  }

  const vLeft = state.params.meterMode === 'internal' ? meterA.x + 8 : rx.x;
  wire(
    ctx,
    [
      [vLeft, rx.y],
      [vLeft, meterV.y + meterV.r],
      [meterV.x - 18, meterV.y + meterV.r]
    ],
    p.blue,
    2.4 * s,
    true
  );
  wire(
    ctx,
    [
      [rxRight, rx.y],
      [rxRight, meterV.y + meterV.r],
      [meterV.x + 18, meterV.y + meterV.r]
    ],
    p.blue,
    2.4 * s,
    true
  );

  flowDots(ctx, main, state.flowPhase, p, 3.4 * s);

  drawRheostat(
    ctx,
    rheostat.x,
    rheostat.y,
    rheostat.w,
    state.params.rheostatPosition,
    p,
    s
  );
  drawResistor(ctx, rx.x, rx.y, rx.w, rx.h, p, s);
  drawCircleMeter(ctx, meterA.x, meterA.y, meterA.r, 'A', p, p.red, s);
  drawCircleMeter(ctx, meterV.x, meterV.y, meterV.r, 'V', p, p.blue, s);
  drawSource(ctx, source.x, source.y, 148, 58, p, s);
  drawAnalogMeter(
    ctx,
    analogV.x,
    analogV.y,
    168,
    118,
    state.voltageMeasured,
    Math.max(6, state.params.supplyVoltage),
    'V',
    p,
    s
  );
  drawAnalogMeter(
    ctx,
    analogA.x,
    analogA.y,
    168,
    118,
    state.measuredCurrent,
    1,
    'A',
    p,
    s
  );

  text(
    ctx,
    '电压表',
    meterV.x,
    meterV.y - meterV.r - 14 * s,
    p.ink,
    13 * s,
    'center',
    700
  );
  text(
    ctx,
    '电流表',
    meterA.x,
    meterA.y - meterA.r - 14 * s,
    p.ink,
    13 * s,
    'center',
    700
  );
  text(
    ctx,
    '待测电阻 Rx',
    rx.x + rx.w / 2,
    rx.y - 28 * s,
    p.ink,
    13 * s,
    'center',
    700
  );
  text(
    ctx,
    '滑动变阻器 R',
    rheostat.x + rheostat.w / 2,
    rheostat.y + 28 * s,
    p.muted,
    13 * s,
    'center',
    700
  );
  text(
    ctx,
    '直流电源 E',
    source.x,
    source.y + 44 * s,
    p.muted,
    13 * s,
    'center',
    700
  );
}

export function createResistorView(options: CreateResistorViewOptions = {}) {
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
  let snapshot: ResistorState | null = null;
  function draw(state: ResistorState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(width / BASE_W, height / BASE_H);
    const offsetX = (width - BASE_W * fit) / 2;
    const offsetY = (height - BASE_H * fit) / 2;
    const s =
      env.contentScale() * Math.max(0.85, Math.min(1.2, stage.responsiveScale));
    const p = PALETTE[env.theme];
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fit, fit);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, BASE_W, BASE_H);
    ctx.strokeStyle = p.grid;
    ctx.lineWidth = 1;
    for (let x = 24; x <= BASE_W - 24; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, 24);
      ctx.lineTo(x, BASE_H - 24);
      ctx.stroke();
    }
    for (let y = 24; y <= BASE_H - 24; y += 28) {
      ctx.beginPath();
      ctx.moveTo(24, y);
      ctx.lineTo(BASE_W - 24, y);
      ctx.stroke();
    }
    drawCircuit(ctx, state, p, s);
    ctx.restore();
  }
  return {
    render(state: ResistorState): void {
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
    },
    reset(): void {
      snapshot = null;
    }
  };
}
