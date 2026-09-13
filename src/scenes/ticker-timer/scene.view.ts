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
  fieldWidth: FIELD_W,
  panelInset: INSET,
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
  panel: string;
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
    bg: '#ffffff',
    panel: '#ffffff',
    ink: '#303744',
    muted: '#8390a0',
    body: '#1e2733',
    bodyLight: '#2e3948',
    blue: '#3b82f6',
    red: '#e84755',
    orange: '#e77b2d',
    yellow: '#f9d55b',
    cyan: '#34bfd5',
    green: '#19a282',
    border: '#d4dce5',
    tape: '#f8fafc'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    ink: '#eef2f7',
    muted: '#a8b4c5',
    body: '#0b1220',
    bodyLight: '#1b2638',
    blue: '#76a7ff',
    red: '#ff6d75',
    orange: '#ff9d55',
    yellow: '#f5d76e',
    cyan: '#5de1eb',
    green: '#4dd4c0',
    border: '#3d4d63',
    tape: '#dce6f1'
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

function drawInstrument(
  ctx: CanvasRenderingContext2D,
  state: TickerTimerState,
  p: Palette,
  scale: number
): void {
  const bodyX = 82;
  const bodyY = 84;
  const bodyW = 676;
  const bodyH = 238;
  rounded(ctx, bodyX, bodyY, bodyW, bodyH, 20);
  ctx.fillStyle = p.body;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 3;
  ctx.stroke();
  rounded(ctx, bodyX + 22, bodyY + 22, bodyW - 44, bodyH - 44, 14);
  ctx.fillStyle = p.bodyLight;
  ctx.fill();

  const coilX = 252;
  const coilY = 122;
  const coilW = 62;
  const coilH = 76;
  for (let i = 0; i < 2; i += 1) {
    rounded(ctx, coilX + i * COIL_SPACING, coilY, coilW, coilH, 8);
    ctx.fillStyle = i === 0 ? '#ec8c37' : '#e87c2b';
    ctx.fill();
    ctx.strokeStyle = '#ffc56a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#d6dce5';
    ctx.fillRect(
      coilX + i * COIL_SPACING + 17,
      coilY - 12,
      28,
      COIL_PLATE_HEIGHT
    );
    ctx.fillStyle = p.red;
    ctx.fillRect(coilX + i * COIL_SPACING + 21, coilY + 5, 20, 12);
    ctx.fillStyle = p.blue;
    ctx.fillRect(coilX + i * COIL_SPACING + 21, coilY + COIL_LOWER_Y, 20, 12);
  }

  const wheelX = 548;
  const wheelY = 207;
  ctx.beginPath();
  ctx.arc(wheelX, wheelY, WHEEL_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = '#101927';
  ctx.fill();
  ctx.strokeStyle = '#3c4a5c';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(wheelX, wheelY, 12, 0, Math.PI * 2);
  ctx.fillStyle = '#aeb8c6';
  ctx.fill();

  ctx.strokeStyle = '#bfc9d6';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(bodyX + 22, ARM_Y);
  ctx.lineTo(wheelX, wheelY);
  ctx.stroke();
  ctx.fillStyle = '#c8d0da';
  ctx.fillRect(bodyX + 10, ARM_HEAD_Y, 34, 22);

  ctx.fillStyle = p.tape;
  ctx.fillRect(TAPE_LEFT, TAPE_STRIP_Y, TAPE_RIGHT - TAPE_LEFT, 24);
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(TAPE_LEFT, TAPE_STRIP_Y, TAPE_RIGHT - TAPE_LEFT, 24);

  const voltageOn = state.params.voltageOn;
  ctx.beginPath();
  ctx.arc(POWER_X, POWER_Y, 14, 0, Math.PI * 2);
  ctx.fillStyle = voltageOn ? p.red : '#4d5969';
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(
    ctx,
    voltageOn ? '电源已接通' : '电源未接通',
    POWER_X + 22,
    POWER_Y,
    voltageOn ? p.red : p.muted,
    14 * scale
  );
  text(ctx, 'S', 320, 234, p.blue, 15 * scale, 'center', 700);
  text(ctx, 'N', 412, 234, p.red, 15 * scale, 'center', 700);
  text(ctx, '电磁式打点计时器', 420, 302, p.muted, 13 * scale, 'center', 600);
}

function drawTapeAndReadout(
  ctx: CanvasRenderingContext2D,
  state: TickerTimerState,
  p: Palette,
  scale: number
): void {
  rounded(ctx, 32, 356, 786, 360, 16);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, '纸带测量与读数', 58, 386, p.ink, 20 * scale, 'left', 700);
  text(
    ctx,
    '相邻点时间间隔 T = 0.020 s',
    786,
    386,
    p.muted,
    13 * scale,
    'right',
    500
  );

  ctx.fillStyle = p.tape;
  ctx.fillRect(TAPE_LEFT, TAPE_Y, TAPE_RIGHT - TAPE_LEFT, TAPE_H);
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  ctx.strokeRect(TAPE_LEFT, TAPE_Y, TAPE_RIGHT - TAPE_LEFT, TAPE_H);

  ctx.save();
  ctx.beginPath();
  ctx.rect(TAPE_LEFT, TAPE_Y, TAPE_RIGHT - TAPE_LEFT, TAPE_H);
  ctx.clip();
  for (const dot of state.dots) {
    const x = TAPE_LEFT + dot.xM * 100 * VISUAL_SCALE;
    ctx.beginPath();
    ctx.arc(x, TAPE_Y + TAPE_H / 2, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = dot.index % 5 === 0 ? p.red : p.blue;
    ctx.fill();
  }
  const currentX = TAPE_LEFT + state.currentX * 100 * VISUAL_SCALE;
  ctx.strokeStyle = p.green;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(currentX, TAPE_Y - 8);
  ctx.lineTo(currentX, TAPE_Y + TAPE_H + 8);
  ctx.stroke();
  ctx.restore();

  rounded(ctx, TAPE_LEFT, RULER_Y, TAPE_RIGHT - TAPE_LEFT, RULER_H, 8);
  ctx.fillStyle = p.yellow;
  ctx.fill();
  ctx.strokeStyle = p.orange;
  ctx.lineWidth = 2;
  ctx.stroke();
  const rulerWidth = TAPE_RIGHT - TAPE_LEFT;
  const maxCm = 20;
  for (let cm = 0; cm <= maxCm; cm += 1) {
    const x = TAPE_LEFT + (cm / maxCm) * rulerWidth;
    const tickH = cm % 5 === 0 ? 28 : 14;
    ctx.strokeStyle = p.orange;
    ctx.lineWidth = cm % 5 === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x, RULER_Y);
    ctx.lineTo(x, RULER_Y + tickH);
    ctx.stroke();
    if (cm % 5 === 0)
      text(
        ctx,
        String(cm),
        x,
        RULER_Y + 46,
        p.orange,
        12 * scale,
        'center',
        700
      );
  }
  text(
    ctx,
    'cm',
    TAPE_RIGHT - 8,
    RULER_Y + 15,
    p.orange,
    12 * scale,
    'right',
    700
  );

  const cards = [
    { x: 58, label: '已记录点', value: `${state.dots.length}` },
    {
      x: 238,
      label: '中间时刻速度',
      value:
        state.averageVelocity === null
          ? '—'
          : `${state.averageVelocity.toFixed(2)} m/s`
    },
    {
      x: 466,
      label: '位移差 Δs',
      value:
        state.deltaS === null ? '—' : `${(state.deltaS * 100).toFixed(2)} cm`
    },
    {
      x: 646,
      label: '测得加速度',
      value:
        state.measuredAcceleration === null
          ? '—'
          : `${state.measuredAcceleration.toFixed(2)} m/s²`
    }
  ];
  for (const card of cards) {
    rounded(ctx, card.x, 654, card.x === 58 ? 160 : 205, 44, 8);
    ctx.fillStyle = p.bg;
    ctx.fill();
    ctx.strokeStyle = p.border;
    ctx.lineWidth = 1;
    ctx.stroke();
    text(ctx, card.label, card.x + 10, 667, p.muted, 11 * scale, 'left', 500);
    text(ctx, card.value, card.x + 10, 686, p.ink, 13 * scale, 'left', 700);
  }
  if (state.error) {
    rounded(ctx, 58, 612, 722, 32, 8);
    ctx.fillStyle = 'rgba(232,71,85,0.14)';
    ctx.fill();
    ctx.strokeStyle = p.red;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    text(ctx, state.error, 76, 628, p.red, 14 * scale, 'left', 700);
  } else {
    const status = !state.params.voltageOn
      ? '规范：先接通电源，再释放纸带'
      : !state.released
        ? '准备就绪：点击“释放纸带”开始'
        : state.finished
          ? '记录完成：可根据纸带计算 a'
          : `t = ${state.time.toFixed(2)} s · v = ${state.currentV.toFixed(2)} m/s`;
    text(
      ctx,
      status,
      58,
      628,
      state.params.voltageOn ? p.green : p.muted,
      13 * scale,
      'left',
      600
    );
  }
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: TickerTimerState,
  p: Palette,
  scale: number
): void {
  const x = FIELD_W + INSET;
  rounded(ctx, x, 44, 306, 248, 14);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text(ctx, '实验状态', x + 18, 70, p.ink, 18 * scale, 'left', 700);
  const rows = [
    ['计时器', state.params.voltageOn ? '已接通' : '未接通'],
    [
      '纸带',
      state.released ? (state.finished ? '记录完成' : '运动中') : '未释放'
    ],
    [
      '模型',
      state.params.model === 'uniform'
        ? '匀速'
        : state.params.model === 'ua'
          ? '匀加速'
          : '匀减速'
    ],
    ['加速度', `${state.params.acceleration.toFixed(1)} m/s²`]
  ];
  rows.forEach(([label, value], index) => {
    const y = 112 + index * 34;
    text(ctx, label, x + 20, y, p.muted, 13 * scale, 'left', 500);
    text(
      ctx,
      value,
      x + 274,
      y,
      index === 0 && state.params.voltageOn ? p.green : p.ink,
      13 * scale,
      'right',
      700
    );
  });
  rounded(ctx, x, 314, 306, 162, 14);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(ctx, '核心关系', x + 18, 340, p.muted, 14 * scale, 'left', 700);
  text(
    ctx,
    'vₙ = (xₙ₊₁ − xₙ₋₁) / 2T',
    x + 18,
    376,
    p.ink,
    16 * scale,
    'left',
    700
  );
  text(ctx, 'Δs = aT²', x + 18, 410, p.ink, 18 * scale, 'left', 700);
  text(
    ctx,
    '等时间打点 → 位移差反映加速度',
    x + 18,
    448,
    p.green,
    12 * scale,
    'left',
    600
  );
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
    const offsetY = (height - BASE_H * fit) / 2;
    const scale = env.contentScale() * stage.responsiveScale;
    const p = PALETTE[env.theme];
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(0, offsetY);
    ctx.scale(fit, fit);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, BASE_W, BASE_H);
    drawInstrument(ctx, state, p, scale);
    drawTapeAndReadout(ctx, state, p, scale);
    drawPanel(ctx, state, p, scale);
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
