import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { bellowsConstants, type BellowsState } from './scene.sim';

export type CreateBellowsViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

const {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  fieldWidth: FIELD_W,
  chamberLeft: CHAMBER_LEFT,
  chamberRight: CHAMBER_RIGHT,
  chamberTop: CHAMBER_TOP,
  chamberBottom: CHAMBER_BOTTOM,
  pipeTop: PIPE_TOP,
  pipeBottom: PIPE_BOTTOM,
  panelDividerY: PANEL_DIVIDER_Y,
  actionBoxX: ACTION_BOX_X,
  actionBoxY: ACTION_BOX_Y,
  actionBoxWidth: ACTION_BOX_WIDTH,
  actionBoxHeight: ACTION_BOX_HEIGHT,
  actionTextX: ACTION_TEXT_X,
  stateTextX: STATE_TEXT_X,
  monitorY: MONITOR_Y,
  cardLeftX: CARD_LEFT_X,
  cardRightX: CARD_RIGHT_X,
  cardTopY: CARD_TOP_Y,
  cardBottomY: CARD_BOTTOM_Y,
  cardWidth: CARD_WIDTH,
  cardHeight: CARD_HEIGHT,
  cardTextOffsetX: CARD_TEXT_OFFSET_X,
  mechanismTop: MECHANISM_TOP,
  mechanismWidth: MECHANISM_WIDTH,
  mechanismHeight: MECHANISM_HEIGHT,
  pipeLeftX: PIPE_LEFT_X,
  valvePipeX: VALVE_PIPE_X,
  pipeRightX: PIPE_RIGHT_X,
  outletY: OUTLET_Y
} = bellowsConstants;

type Palette = {
  bg: string;
  ink: string;
  muted: string;
  red: string;
  blue: string;
  yellow: string;
  green: string;
  border: string;
  panel: string;
  soft: string;
  pipe: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    ink: '#2e3540',
    muted: '#8793a2',
    red: '#ef4050',
    blue: '#3c80b1',
    yellow: '#ffb812',
    green: '#1ca456',
    border: '#d6dce4',
    panel: '#ffffff',
    soft: '#f3f5f7',
    pipe: '#323b42'
  },
  dark: {
    bg: '#101827',
    ink: '#edf2f7',
    muted: '#9aa9ba',
    red: '#fb7185',
    blue: '#60a5fa',
    yellow: '#facc15',
    green: '#34d399',
    border: '#3c4b61',
    panel: '#172235',
    soft: '#243249',
    pipe: '#bdc8d5'
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
  width = 4
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 2) return;
  const ux = dx / len;
  const uy = dy / len;
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
  ctx.lineTo(x2 - ux * 14 - uy * 7, y2 - uy * 14 + ux * 7);
  ctx.lineTo(x2 - ux * 14 + uy * 7, y2 - uy * 14 - ux * 7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawValve(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  open: boolean,
  p: Palette,
  side: 'red' | 'blue'
): void {
  ctx.fillStyle = open ? (side === 'red' ? '#ffe8ea' : '#e4f0fb') : p.panel;
  ctx.strokeStyle = open ? (side === 'red' ? p.red : p.blue) : p.pipe;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(x - 18, y - 11, 36, 22, 5);
  ctx.fill();
  ctx.stroke();
  text(ctx, label, x, y - 28, p.ink, 13, 'center', 700);
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: BellowsState,
  p: Palette,
  scale: number
): void {
  const x = FIELD_W;
  ctx.fillStyle = p.panel;
  ctx.fillRect(x, 0, BASE_W - FIELD_W, BASE_H);
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, BASE_H);
  ctx.stroke();
  text(ctx, '双动式风箱原理', x + 25, 36, p.ink, 20 * scale, 'left', 700);
  ctx.strokeStyle = p.border;
  ctx.beginPath();
  ctx.moveTo(x + 25, PANEL_DIVIDER_Y);
  ctx.lineTo(BASE_W - 25, PANEL_DIVIDER_Y);
  ctx.stroke();
  text(ctx, '当前机械动作', x + 25, 103, p.ink, 15 * scale, 'left', 700);
  ctx.fillStyle = p.soft;
  ctx.roundRect(
    x + ACTION_BOX_X,
    ACTION_BOX_Y,
    ACTION_BOX_WIDTH,
    ACTION_BOX_HEIGHT,
    7
  );
  ctx.fill();
  text(
    ctx,
    state.direction === 'left' ? '← 向左推动' : '向右拉回 →',
    x + ACTION_TEXT_X,
    103,
    p.blue,
    15 * scale,
    'center',
    700
  );
  text(ctx, '左侧气室状态：', x + 25, 153, p.ink, 13 * scale);
  text(
    ctx,
    state.leftPressure === 'high' ? '● 压缩升压' : '● 扩大降压',
    x + STATE_TEXT_X,
    153,
    state.leftPressure === 'high' ? p.red : p.blue,
    13 * scale,
    'left',
    700
  );
  text(ctx, '右侧气室状态：', x + 25, 187, p.ink, 13 * scale);
  text(
    ctx,
    state.rightPressure === 'high' ? '● 压缩升压' : '● 扩大降压',
    x + STATE_TEXT_X,
    187,
    state.rightPressure === 'high' ? p.red : p.blue,
    13 * scale,
    'left',
    700
  );
  text(
    ctx,
    '气动单向阀联动监测',
    x + 25,
    MONITOR_Y,
    p.ink,
    15 * scale,
    'left',
    700
  );
  const cards = [
    ['排气阀 C', state.valves.C, CARD_LEFT_X, CARD_TOP_Y, 'red'],
    ['排气阀 D', state.valves.D, CARD_RIGHT_X, CARD_TOP_Y, 'red'],
    ['进气阀 A', state.valves.A, CARD_LEFT_X, CARD_BOTTOM_Y, 'blue'],
    ['进气阀 B', state.valves.B, CARD_RIGHT_X, CARD_BOTTOM_Y, 'blue']
  ] as const;
  for (const [label, open, dx, dy, side] of cards) {
    ctx.fillStyle = open ? (side === 'red' ? '#fff0f0' : '#edf6ff') : p.panel;
    ctx.strokeStyle = open ? (side === 'red' ? p.red : p.blue) : p.border;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x + dx, dy, CARD_WIDTH, CARD_HEIGHT, 10);
    ctx.fill();
    ctx.stroke();
    text(
      ctx,
      label,
      x + dx + CARD_TEXT_OFFSET_X,
      dy + 24,
      p.muted,
      12 * scale,
      'center'
    );
    text(
      ctx,
      open
        ? side === 'red'
          ? '被推开（排气）'
          : '被推开（吸气）'
        : '受压闭合',
      x + dx + CARD_TEXT_OFFSET_X,
      dy + 50,
      open ? (side === 'red' ? p.red : p.blue) : p.muted,
      13 * scale,
      'center',
      700
    );
  }
  ctx.fillStyle = p.soft;
  ctx.roundRect(x + 25, MECHANISM_TOP, MECHANISM_WIDTH, MECHANISM_HEIGHT, 10);
  ctx.fill();
  text(ctx, '核心机制', x + 40, 486, p.ink, 14 * scale, 'left', 700);
  text(ctx, '压缩端排气，扩张端进气。', x + 40, 513, p.ink, 13 * scale);
  text(ctx, '往复运动，持续出风。', x + 40, 539, p.ink, 13 * scale);
  text(ctx, 'SPACE 暂停 / 继续', x + 150, 604, p.muted, 12 * scale, 'center');
}

export function createBellowsView(options: CreateBellowsViewOptions = {}) {
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
  let snapshot: BellowsState | null = null;

  function draw(state: BellowsState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(width / BASE_W, height / BASE_H);
    const offsetY = (height - BASE_H * fit) / 2;
    const p = PALETTE[env.theme];
    const scale = env.contentScale() * stage.responsiveScale;
    const pistonX = state.pistonX;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(0, offsetY);
    ctx.scale(fit, fit);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, FIELD_W, BASE_H);
    ctx.fillStyle = p.panel;
    ctx.fillRect(
      CHAMBER_LEFT,
      CHAMBER_TOP,
      CHAMBER_RIGHT - CHAMBER_LEFT,
      CHAMBER_BOTTOM - CHAMBER_TOP
    );
    ctx.fillStyle =
      state.leftPressure === 'high'
        ? 'rgba(239,64,80,0.18)'
        : 'rgba(60,128,177,0.12)';
    ctx.fillRect(
      CHAMBER_LEFT + 6,
      CHAMBER_TOP + 6,
      pistonX - CHAMBER_LEFT - 6,
      CHAMBER_BOTTOM - CHAMBER_TOP - 12
    );
    ctx.fillStyle =
      state.rightPressure === 'high'
        ? 'rgba(239,64,80,0.18)'
        : 'rgba(60,128,177,0.12)';
    ctx.fillRect(
      pistonX + 8,
      CHAMBER_TOP + 6,
      CHAMBER_RIGHT - pistonX - 8,
      CHAMBER_BOTTOM - CHAMBER_TOP - 12
    );
    ctx.strokeStyle = p.pipe;
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(CHAMBER_LEFT, CHAMBER_TOP);
    ctx.lineTo(CHAMBER_LEFT, PIPE_TOP);
    ctx.lineTo(PIPE_LEFT_X, PIPE_TOP);
    ctx.lineTo(VALVE_PIPE_X, PIPE_TOP - 36);
    ctx.lineTo(VALVE_PIPE_X, OUTLET_Y);
    ctx.moveTo(CHAMBER_RIGHT, CHAMBER_TOP);
    ctx.lineTo(CHAMBER_RIGHT, PIPE_TOP);
    ctx.lineTo(PIPE_RIGHT_X, PIPE_TOP);
    ctx.lineTo(PIPE_RIGHT_X, PIPE_TOP - 36);
    ctx.lineTo(PIPE_RIGHT_X, OUTLET_Y);
    ctx.moveTo(CHAMBER_LEFT, CHAMBER_BOTTOM);
    ctx.lineTo(CHAMBER_LEFT, PIPE_BOTTOM);
    ctx.lineTo(PIPE_LEFT_X, PIPE_BOTTOM);
    ctx.moveTo(CHAMBER_RIGHT, CHAMBER_BOTTOM);
    ctx.lineTo(CHAMBER_RIGHT, PIPE_BOTTOM);
    ctx.lineTo(PIPE_RIGHT_X, PIPE_BOTTOM);
    ctx.stroke();
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(CHAMBER_LEFT, CHAMBER_TOP);
    ctx.lineTo(pistonX, CHAMBER_TOP);
    ctx.moveTo(CHAMBER_LEFT, CHAMBER_BOTTOM);
    ctx.lineTo(pistonX, CHAMBER_BOTTOM);
    ctx.moveTo(pistonX, CHAMBER_TOP);
    ctx.lineTo(CHAMBER_RIGHT, CHAMBER_TOP);
    ctx.moveTo(pistonX, CHAMBER_BOTTOM);
    ctx.lineTo(CHAMBER_RIGHT, CHAMBER_BOTTOM);
    ctx.stroke();
    ctx.fillStyle = p.pipe;
    ctx.fillRect(
      pistonX - 12,
      CHAMBER_TOP - 5,
      24,
      CHAMBER_BOTTOM - CHAMBER_TOP + 10
    );
    ctx.fillStyle = p.bg;
    ctx.fillRect(
      pistonX - 5,
      CHAMBER_TOP + 8,
      10,
      CHAMBER_BOTTOM - CHAMBER_TOP - 16
    );
    drawValve(
      ctx,
      CHAMBER_LEFT + 32,
      CHAMBER_TOP,
      'C',
      state.valves.C,
      p,
      'red'
    );
    drawValve(
      ctx,
      CHAMBER_RIGHT - 32,
      CHAMBER_TOP,
      'D',
      state.valves.D,
      p,
      'red'
    );
    drawValve(
      ctx,
      CHAMBER_LEFT + 32,
      CHAMBER_BOTTOM,
      'A',
      state.valves.A,
      p,
      'blue'
    );
    drawValve(
      ctx,
      CHAMBER_RIGHT - 32,
      CHAMBER_BOTTOM,
      'B',
      state.valves.B,
      p,
      'blue'
    );
    text(ctx, '出口', 255, 55, p.red, 20 * scale, 'center', 700);
    text(
      ctx,
      'A',
      CHAMBER_LEFT + 32,
      CHAMBER_BOTTOM + 44,
      p.ink,
      14 * scale,
      'center',
      700
    );
    text(
      ctx,
      'B',
      CHAMBER_RIGHT - 32,
      CHAMBER_BOTTOM + 44,
      p.ink,
      14 * scale,
      'center',
      700
    );
    if (state.params.showFlow) {
      ctx.save();
      ctx.setLineDash([10, 8]);
      if (state.direction === 'left') {
        arrow(ctx, CHAMBER_LEFT + 46, CHAMBER_TOP - 46, 250, 92, p.red, 4);
        arrow(
          ctx,
          CHAMBER_RIGHT - 46,
          CHAMBER_BOTTOM + 70,
          420,
          CHAMBER_BOTTOM + 18,
          p.blue,
          4
        );
      } else {
        arrow(ctx, CHAMBER_RIGHT - 46, CHAMBER_TOP - 46, 420, 92, p.red, 4);
        arrow(
          ctx,
          CHAMBER_LEFT + 46,
          CHAMBER_BOTTOM + 70,
          225,
          CHAMBER_BOTTOM + 18,
          p.blue,
          4
        );
      }
      ctx.restore();
    }
    text(
      ctx,
      state.direction === 'left' ? '左推排气中…' : '右拉排气中…',
      290,
      540,
      p.blue,
      18 * scale,
      'center',
      700
    );
    text(
      ctx,
      '手动牵引活塞（观察气阀闭合）',
      25,
      590,
      p.ink,
      16 * scale,
      'left',
      700
    );
    drawPanel(ctx, state, p, scale);
    ctx.restore();
  }

  return {
    render(state: BellowsState): void {
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
