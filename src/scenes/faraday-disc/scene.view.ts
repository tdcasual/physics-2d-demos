import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { faradayConstants, type FaradayState } from './scene.sim';

export type CreateFaradayViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

const {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  discCenter: CENTER,
  discRadius: R,
  ringCount: RINGS,
  fieldLeft: FIELD_LEFT,
  fieldTop: FIELD_TOP,
  fieldRight: FIELD_RIGHT,
  fieldBottom: FIELD_BOTTOM,
  circuitX: CIRCUIT_X,
  subtitleY: SUBTITLE_Y,
  fieldSymbolStartX: FIELD_SYMBOL_START_X,
  fieldSymbolEndX: FIELD_SYMBOL_END_X,
  fieldSymbolStartY: FIELD_SYMBOL_START_Y,
  fieldSymbolEndY: FIELD_SYMBOL_END_Y,
  fieldSymbolStepX: FIELD_SYMBOL_STEP_X,
  fieldSymbolStepY: FIELD_SYMBOL_STEP_Y,
  arrowForwardX: ARROW_FORWARD_X,
  arrowUpY: ARROW_UP_Y,
  arrowBackX: ARROW_BACK_X,
  velocityLabelX: VELOCITY_LABEL_X,
  velocityLabelY: VELOCITY_LABEL_Y,
  forceLabelX: FORCE_LABEL_X,
  angularLabelY: ANGULAR_LABEL_Y,
  wireTop: WIRE_TOP,
  wireBottom: WIRE_BOTTOM,
  wireSwitchBottom: WIRE_SWITCH_BOTTOM,
  wireBulbTop: WIRE_BULB_TOP,
  switchLeft: SWITCH_LEFT,
  switchTop: SWITCH_TOP,
  switchWidth: SWITCH_WIDTH,
  switchHeight: SWITCH_HEIGHT,
  switchTitleY: SWITCH_TITLE_Y,
  switchStatusY: SWITCH_STATUS_Y,
  bulbLeft: BULB_LEFT,
  bulbTop: BULB_TOP,
  bulbWidth: BULB_WIDTH,
  bulbHeight: BULB_HEIGHT,
  bulbTitleY: BULB_TITLE_Y,
  bulbStatusY: BULB_STATUS_Y,
  meterY: METER_Y,
  meterTitleY: METER_TITLE_Y,
  meterLabelY: METER_LABEL_Y,
  readoutY: READOUT_Y,
  readoutEmfX: READOUT_EMF_X,
  readoutCurrentX: READOUT_CURRENT_X
} = faradayConstants;

type Palette = {
  bg: string;
  ink: string;
  muted: string;
  blue: string;
  red: string;
  green: string;
  orange: string;
  disc: string;
  discDark: string;
  field: string;
  panel: string;
  border: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#FAF7F2',
    ink: '#24324a',
    muted: '#6c7a90',
    blue: '#228be6',
    red: '#e63946',
    green: '#20a05a',
    orange: '#f08c00',
    disc: '#f6a21a',
    discDark: '#b95e08',
    field: '#dbeafe',
    panel: '#ffffff',
    border: '#d9e2ec'
  },
  dark: {
    bg: '#0f172a',
    ink: '#e2e8f0',
    muted: '#94a3b8',
    blue: '#60a5fa',
    red: '#fb7185',
    green: '#34d399',
    orange: '#fbbf24',
    disc: '#d97706',
    discDark: '#92400e',
    field: '#172554',
    panel: '#111827',
    border: '#334155'
  }
};

function text(
  ctx: CanvasRenderingContext2D,
  value: string,
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
  ctx.fillText(value, x, y);
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
  if (len < 2) return;
  const ux = dx / len;
  const uy = dy / len;
  const head = Math.min(12, Math.max(7, len * 0.22));
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

export function createFaradayView(options: CreateFaradayViewOptions = {}) {
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: {
      mode: 'clamped',
      fallbackWidth: BASE_W,
      fallbackHeight: BASE_H
    },
    initialWidth: BASE_W,
    initialHeight: BASE_H,
    eagerContext: true
  });
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  let snapshot: FaradayState | null = null;

  function draw(state: FaradayState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(width / BASE_W, height / BASE_H);
    const offsetY = (height - BASE_H * fit) / 2;
    const palette = PALETTE[env.theme];
    const contentScale = env.contentScale() * stage.responsiveScale;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(0, offsetY);
    ctx.scale(fit, fit);

    text(
      ctx,
      '法拉第圆盘发电机',
      BASE_W / 2,
      30,
      palette.ink,
      22 * contentScale,
      'center'
    );
    text(
      ctx,
      '转动切割磁感线 · 动生电动势',
      BASE_W / 2,
      SUBTITLE_Y,
      palette.muted,
      14 * contentScale,
      'center'
    );

    ctx.fillStyle = palette.field;
    ctx.strokeStyle = palette.blue;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.roundRect(
      FIELD_LEFT,
      FIELD_TOP,
      FIELD_RIGHT - FIELD_LEFT,
      FIELD_BOTTOM - FIELD_TOP,
      14
    );
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    text(
      ctx,
      `B = ${state.params.B.toFixed(1)} T  ${state.params.field === 'into' ? '⊗' : '⊙'}`,
      FIELD_LEFT + 18,
      FIELD_TOP + 24,
      palette.blue,
      15 * contentScale
    );
    for (
      let x = FIELD_LEFT + FIELD_SYMBOL_START_X;
      x <= FIELD_RIGHT - FIELD_SYMBOL_END_X;
      x += FIELD_SYMBOL_STEP_X
    ) {
      for (
        let y = FIELD_TOP + FIELD_SYMBOL_START_Y;
        y <= FIELD_BOTTOM - FIELD_SYMBOL_END_Y;
        y += FIELD_SYMBOL_STEP_Y
      ) {
        text(
          ctx,
          state.params.field === 'into' ? '⊗' : '⊙',
          x,
          y,
          palette.blue,
          17 * contentScale,
          'center'
        );
      }
    }

    ctx.save();
    ctx.translate(CENTER.x, CENTER.y);
    ctx.rotate(state.angle * 0.12);
    ctx.fillStyle = palette.disc;
    ctx.strokeStyle = palette.discDark;
    ctx.lineWidth = 3 * contentScale;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    for (let i = 0; i < RINGS; i += 1) {
      ctx.strokeStyle = 'rgba(255,239,180,0.55)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(0, 0, R * (0.25 + i * 0.18), 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let i = 0; i < 12; i += 1) {
      const angle = (i / 12) * Math.PI * 2;
      ctx.strokeStyle = 'rgba(255,244,190,0.55)';
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 22, Math.sin(angle) * 22);
      ctx.lineTo(Math.cos(angle) * (R - 4), Math.sin(angle) * (R - 4));
      ctx.stroke();
    }
    ctx.restore();

    ctx.fillStyle = palette.panel;
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 2 * contentScale;
    ctx.beginPath();
    ctx.arc(CENTER.x, CENTER.y, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = palette.ink;
    ctx.beginPath();
    ctx.arc(CENTER.x, CENTER.y, 7, 0, Math.PI * 2);
    ctx.fill();
    text(
      ctx,
      'A',
      CENTER.x + 42,
      CENTER.y + 32,
      palette.blue,
      15 * contentScale
    );
    text(
      ctx,
      'B',
      CENTER.x + 35,
      CENTER.y - R + 10,
      palette.red,
      15 * contentScale
    );

    const px = CENTER.x;
    const py = CENTER.y - R;
    arrow(
      ctx,
      px,
      py,
      px + ARROW_FORWARD_X,
      py,
      palette.green,
      3 * contentScale
    );
    arrow(ctx, px, py, px, py - ARROW_UP_Y, palette.red, 3 * contentScale);
    arrow(ctx, px, py, px - ARROW_BACK_X, py, palette.blue, 3 * contentScale);
    text(
      ctx,
      'v = ωr',
      px - VELOCITY_LABEL_X,
      py - VELOCITY_LABEL_Y,
      palette.green,
      14 * contentScale,
      'center'
    );
    text(
      ctx,
      'F洛',
      px + FORCE_LABEL_X,
      py + 18,
      palette.blue,
      14 * contentScale
    );
    text(
      ctx,
      'ω',
      px - 18,
      py - ANGULAR_LABEL_Y,
      palette.red,
      16 * contentScale
    );

    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 3 * contentScale;
    ctx.beginPath();
    ctx.moveTo(CENTER.x - R, CENTER.y);
    ctx.lineTo(CENTER.x - R - 28, CENTER.y);
    ctx.lineTo(CENTER.x - R - 28, WIRE_TOP);
    ctx.lineTo(CIRCUIT_X, WIRE_TOP);
    ctx.lineTo(CIRCUIT_X, WIRE_SWITCH_BOTTOM);
    ctx.moveTo(CENTER.x + R, CENTER.y);
    ctx.lineTo(CENTER.x + R + 28, CENTER.y);
    ctx.lineTo(CENTER.x + R + 28, WIRE_BOTTOM);
    ctx.lineTo(CIRCUIT_X, WIRE_BOTTOM);
    ctx.lineTo(CIRCUIT_X, WIRE_BULB_TOP);
    ctx.stroke();

    ctx.fillStyle = palette.panel;
    ctx.strokeStyle = palette.border;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(
      CIRCUIT_X - SWITCH_LEFT,
      SWITCH_TOP,
      SWITCH_WIDTH,
      SWITCH_HEIGHT,
      14
    );
    ctx.fill();
    ctx.stroke();
    text(
      ctx,
      'S',
      CIRCUIT_X,
      SWITCH_TITLE_Y,
      palette.ink,
      16 * contentScale,
      'center'
    );
    text(
      ctx,
      state.params.closed ? '闭合' : '断开',
      CIRCUIT_X,
      SWITCH_STATUS_Y,
      state.params.closed ? palette.green : palette.red,
      13 * contentScale,
      'center'
    );

    ctx.fillStyle = palette.panel;
    ctx.beginPath();
    ctx.roundRect(CIRCUIT_X - BULB_LEFT, BULB_TOP, BULB_WIDTH, BULB_HEIGHT, 14);
    ctx.fill();
    ctx.stroke();
    text(
      ctx,
      '灯泡',
      CIRCUIT_X,
      BULB_TITLE_Y,
      palette.orange,
      16 * contentScale,
      'center'
    );
    text(
      ctx,
      state.params.closed ? '发光' : '熄灭',
      CIRCUIT_X,
      BULB_STATUS_Y,
      state.params.closed ? palette.green : palette.muted,
      13 * contentScale,
      'center'
    );

    ctx.fillStyle = palette.panel;
    ctx.beginPath();
    ctx.arc(CIRCUIT_X, METER_Y, 47, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    text(
      ctx,
      'G',
      CIRCUIT_X,
      METER_TITLE_Y,
      palette.ink,
      22 * contentScale,
      'center'
    );
    text(
      ctx,
      '检流计',
      CIRCUIT_X,
      METER_LABEL_Y,
      palette.muted,
      13 * contentScale,
      'center'
    );

    text(
      ctx,
      `E = ½BωR² = ${state.emf.toFixed(2)} V`,
      READOUT_EMF_X,
      READOUT_Y,
      palette.ink,
      14 * contentScale
    );
    text(
      ctx,
      `I = ${state.current.toFixed(2)} A · ${state.polarity}`,
      READOUT_CURRENT_X,
      READOUT_Y,
      palette.green,
      14 * contentScale
    );
    ctx.restore();
  }

  return {
    render(state: FaradayState): void {
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
