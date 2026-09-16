import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { tickerTimerConstants, type TickerTimerState } from './scene.sim';

export type CreateTickerTimerViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

const {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  tapeLeft: TAPE_LEFT,
  tapeRight: TAPE_RIGHT,
  tapeY: TAPE_Y,
  tapeHeight: TAPE_H,
  rulerY: RULER_Y,
  rulerHeight: RULER_H,
  visualScale: VISUAL_SCALE,
  coilSpacing: COIL_SPACING,
  coilPlateHeight: COIL_PLATE_HEIGHT,
  coilLowerY: COIL_LOWER_Y,
  wheelRadius: WHEEL_RADIUS,
  armY: ARM_Y,
  armHeadY: ARM_HEAD_Y,
  tapeStripY: TAPE_STRIP_Y,
  powerX: POWER_X,
  powerY: POWER_Y
} = tickerTimerConstants;

type Palette = {
  bg: string;
  ink: string;
  muted: string;
  body: string;
  bodyLight: string;
  blue: string;
  red: string;
  orange: string;
  yellow: string;
  cyan: string;
  green: string;
  border: string;
  tape: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#f8fafc',
    ink: '#273142',
    muted: '#738196',
    body: '#1e2733',
    bodyLight: '#2e3948',
    blue: '#3b82f6',
    red: '#e84755',
    orange: '#e77b2d',
    yellow: '#f9d55b',
    cyan: '#34bfd5',
    green: '#19a282',
    border: '#cbd5e1',
    tape: '#fffdf4'
  },
  dark: {
    bg: '#0c1422',
    ink: '#eef2f7',
    muted: '#a8b4c5',
    body: '#090f1b',
    bodyLight: '#1b2638',
    blue: '#76a7ff',
    red: '#ff6d75',
    orange: '#ff9d55',
    yellow: '#f5d76e',
    cyan: '#5de1eb',
    green: '#4dd4c0',
    border: '#3d4d63',
    tape: '#e7edf5'
  }
};

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

function label(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  color: string,
  size: number,
  align: CanvasTextAlign = 'left',
  weight = 650
): void {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

function drawInstrument(
  ctx: CanvasRenderingContext2D,
  state: TickerTimerState,
  p: Palette,
  scale: number
): void {
  const bodyX = 84;
  const bodyY = 72;
  const bodyW = 680;
  const bodyH = 252;

  rounded(ctx, bodyX, bodyY, bodyW, bodyH, 20);
  ctx.fillStyle = p.body;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 3;
  ctx.stroke();
  rounded(ctx, bodyX + 20, bodyY + 20, bodyW - 40, bodyH - 40, 14);
  ctx.fillStyle = p.bodyLight;
  ctx.fill();

  // Electromagnetic core and the two contrasting coils.
  const coilX = 252;
  const coilY = 116;
  const coilW = 62;
  const coilH = 82;
  for (let i = 0; i < 2; i += 1) {
    const x = coilX + i * COIL_SPACING;
    rounded(ctx, x, coilY, coilW, coilH, 8);
    ctx.fillStyle = i === 0 ? '#e98635' : '#d96d2b';
    ctx.fill();
    ctx.strokeStyle = '#ffc56a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#d6dce5';
    ctx.fillRect(x + 17, coilY - 12, 28, COIL_PLATE_HEIGHT);
    ctx.fillStyle = p.red;
    ctx.fillRect(x + 21, coilY + 5, 20, 12);
    ctx.fillStyle = p.blue;
    ctx.fillRect(x + 21, coilY + COIL_LOWER_Y, 20, 12);
  }

  // Rocker arm and wheel move subtly with the released tape.
  const motion = state.released ? Math.sin(state.time * 42) * 0.045 : 0;
  const wheelX = 548;
  const wheelY = 208;
  ctx.save();
  ctx.translate(wheelX, wheelY);
  ctx.rotate(motion);
  ctx.beginPath();
  ctx.arc(0, 0, WHEEL_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = '#101927';
  ctx.fill();
  ctx.strokeStyle = '#53647a';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fillStyle = '#b9c4d2';
  ctx.fill();
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-WHEEL_RADIUS + 10, 0);
  ctx.lineTo(WHEEL_RADIUS - 10, 0);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = '#c7d0dc';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(bodyX + 22, ARM_Y);
  ctx.lineTo(wheelX, wheelY);
  ctx.stroke();
  ctx.fillStyle = '#c8d0da';
  ctx.fillRect(bodyX + 10, ARM_HEAD_Y, 34, 22);

  // Paper path through the instrument.
  ctx.fillStyle = p.tape;
  ctx.fillRect(TAPE_LEFT, TAPE_STRIP_Y, TAPE_RIGHT - TAPE_LEFT, 24);
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(TAPE_LEFT, TAPE_STRIP_Y, TAPE_RIGHT - TAPE_LEFT, 24);
  ctx.strokeStyle = p.cyan;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(TAPE_LEFT + 8, TAPE_STRIP_Y + 12);
  ctx.lineTo(TAPE_RIGHT - 8, TAPE_STRIP_Y + 12);
  ctx.stroke();

  // Short labels only; values and experiment copy belong to the framework.
  label(ctx, 'S', 320, 238, p.blue, 15 * scale, 'center', 750);
  label(ctx, 'N', 412, 238, p.red, 15 * scale, 'center', 750);
  label(ctx, '打点', 690, 112, p.muted, 14 * scale, 'right', 650);
  label(ctx, '电源', POWER_X, POWER_Y + 28, p.muted, 12 * scale, 'center', 600);
  ctx.beginPath();
  ctx.arc(POWER_X, POWER_Y, 12, 0, Math.PI * 2);
  ctx.fillStyle = state.params.voltageOn ? p.green : '#566274';
  ctx.shadowColor = state.params.voltageOn ? p.green : 'transparent';
  ctx.shadowBlur = state.params.voltageOn ? 14 : 0;
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawTape(
  ctx: CanvasRenderingContext2D,
  state: TickerTimerState,
  p: Palette,
  scale: number
): void {
  const tapeWidth = TAPE_RIGHT - TAPE_LEFT;
  ctx.fillStyle = p.tape;
  ctx.fillRect(TAPE_LEFT, TAPE_Y, tapeWidth, TAPE_H);
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  ctx.strokeRect(TAPE_LEFT, TAPE_Y, tapeWidth, TAPE_H);

  ctx.save();
  ctx.beginPath();
  ctx.rect(TAPE_LEFT, TAPE_Y, tapeWidth, TAPE_H);
  ctx.clip();
  for (const dot of state.dots) {
    const x = TAPE_LEFT + dot.xM * 100 * VISUAL_SCALE;
    ctx.beginPath();
    ctx.arc(
      x,
      TAPE_Y + TAPE_H / 2,
      dot.index % 5 === 0 ? 5 : 3.5,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = dot.index % 5 === 0 ? p.red : p.blue;
    ctx.fill();
  }
  const currentX = Math.max(
    TAPE_LEFT,
    Math.min(TAPE_RIGHT, TAPE_LEFT + state.currentX * 100 * VISUAL_SCALE)
  );
  ctx.strokeStyle = p.green;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(currentX, TAPE_Y - 12);
  ctx.lineTo(currentX, TAPE_Y + TAPE_H + 12);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  rounded(ctx, TAPE_LEFT, RULER_Y, tapeWidth, RULER_H, 8);
  ctx.fillStyle = p.yellow;
  ctx.fill();
  ctx.strokeStyle = p.orange;
  ctx.lineWidth = 2;
  ctx.stroke();
  for (let cm = 0; cm <= 20; cm += 1) {
    const x = TAPE_LEFT + (cm / 20) * tapeWidth;
    const tickH = cm % 5 === 0 ? 28 : 14;
    ctx.strokeStyle = p.orange;
    ctx.lineWidth = cm % 5 === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x, RULER_Y);
    ctx.lineTo(x, RULER_Y + tickH);
    ctx.stroke();
    if (cm % 5 === 0)
      label(
        ctx,
        String(cm),
        x,
        RULER_Y + 43,
        p.orange,
        12 * scale,
        'center',
        700
      );
  }
  label(
    ctx,
    'cm',
    TAPE_RIGHT - 8,
    RULER_Y + 15,
    p.orange,
    12 * scale,
    'right',
    700
  );
  label(ctx, '纸带', TAPE_LEFT, TAPE_Y - 18, p.muted, 13 * scale, 'left', 600);
}

export function createTickerTimerView(
  options: CreateTickerTimerViewOptions = {}
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
  let snapshot: TickerTimerState | null = null;

  function draw(state: TickerTimerState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(width / BASE_W, height / BASE_H);
    const offsetX = (width - BASE_W * fit) / 2;
    const offsetY = (height - BASE_H * fit) / 2;
    const scale = env.contentScale() * stage.responsiveScale;
    const p = PALETTE[env.theme];
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fit, fit);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, BASE_W, BASE_H);
    drawInstrument(ctx, state, p, scale);
    drawTape(ctx, state, p, scale);
    ctx.restore();
  }

  return {
    render(state: TickerTimerState): void {
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
