import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  harmonicWaveConstants,
  harmonicWaveY,
  harmonicWaveVelocity,
  harmonicWaveAcceleration,
  type HarmonicWaveState
} from './scene.sim';

export type CreateHarmonicWaveViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

const {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  graphLeft: GRAPH_LEFT,
  graphTop: GRAPH_TOP,
  axisY: AXIS_Y,
  xScale: X_SCALE,
  yScale: Y_SCALE,
  graphRight: GRAPH_RIGHT,
  indicatorHalfWidth: INDICATOR_HALF_WIDTH,
  indicatorWidth: INDICATOR_WIDTH,
  indicatorHeight: INDICATOR_HEIGHT,
  indicatorY: INDICATOR_Y,
  indicatorRadius: INDICATOR_RADIUS,
  directionArrowHalf: DIRECTION_ARROW_HALF,
  directionArrowY: DIRECTION_ARROW_Y,
  directionTextY: DIRECTION_TEXT_Y,
  amplitudePixels: AMPLITUDE_PIXELS,
  axisEnd: AXIS_END,
  xLabelX: X_LABEL_X,
  velocityClamp: VELOCITY_CLAMP,
  legendY: LEGEND_Y,
  legendX1: LEGEND_X_1,
  legendX2: LEGEND_X_2,
  legendX3: LEGEND_X_3,
  legendX4: LEGEND_X_4,
  hintY: HINT_Y
} = harmonicWaveConstants;

type Palette = {
  bg: string;
  axis: string;
  grid: string;
  text: string;
  label: string;
  wave: string;
  ghost: string;
  particle: string;
  velocity: string;
  acceleration: string;
  point: string;
  yellow: string;
  pill: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#FAF7F2',
    axis: '#343A40',
    grid: '#E9ECEF',
    text: '#343A40',
    label: '#6C757D',
    wave: '#457B9D',
    ghost: '#ADB5BD',
    particle: '#343A40',
    velocity: '#2A9D8F',
    acceleration: '#E63946',
    point: '#FFC107',
    yellow: '#FFD166',
    pill: '#F8F9FA'
  },
  dark: {
    bg: '#0f172a',
    axis: '#cbd5e1',
    grid: '#334155',
    text: '#e2e8f0',
    label: '#94a3b8',
    wave: '#60a5fa',
    ghost: '#94a3b8',
    particle: '#cbd5e1',
    velocity: '#34d399',
    acceleration: '#fb7185',
    point: '#fbbf24',
    yellow: '#facc15',
    pill: '#1e293b'
  }
};

function worldX(x: number): number {
  return GRAPH_LEFT + x * X_SCALE;
}

function worldY(y: number): number {
  return AXIS_Y - y * Y_SCALE;
}

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
  const head = Math.min(11, Math.max(6, len * 0.24));
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

export function createHarmonicWaveView(
  options: CreateHarmonicWaveViewOptions = {}
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
  let snapshot: HarmonicWaveState | null = null;

  function drawWave(
    ctx: CanvasRenderingContext2D,
    state: HarmonicWaveState,
    p: Palette,
    cs: number
  ): void {
    const { amplitude, wavelength, period, direction } = state.params;
    const dir = direction === 'right' ? 1 : -1;
    const path = (time: number): void => {
      ctx.beginPath();
      for (let x = 0; x <= 8; x += 0.02) {
        const px = worldX(x);
        const py = worldY(
          harmonicWaveY(x, time, amplitude, wavelength, period, direction)
        );
        if (x === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    };
    if (state.params.showGhost) {
      ctx.save();
      ctx.strokeStyle = p.ghost;
      ctx.lineWidth = 2 * cs;
      ctx.setLineDash([6, 4]);
      path(state.time + 0.2 * dir);
      ctx.restore();
    }
    ctx.save();
    ctx.strokeStyle = p.wave;
    ctx.lineWidth = 3 * cs;
    ctx.lineCap = 'round';
    path(state.time);
    ctx.restore();
  }

  function draw(state: HarmonicWaveState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(width / BASE_W, height / BASE_H);
    const offsetX = (width - BASE_W * fit) / 2;
    const offsetY = (height - BASE_H * fit) / 2;
    const p = PALETTE[env.theme];
    const cs = env.contentScale() * stage.responsiveScale;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fit, fit);
    text(ctx, '简谐横波', BASE_W / 2, 28, p.text, 22 * cs, 'center');
    text(ctx, '传播方向与质点振动', BASE_W / 2, 57, p.label, 14 * cs, 'center');
    ctx.fillStyle = p.pill;
    ctx.strokeStyle = p.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(
      BASE_W / 2 - INDICATOR_HALF_WIDTH,
      INDICATOR_Y,
      INDICATOR_WIDTH,
      INDICATOR_HEIGHT,
      INDICATOR_RADIUS
    );
    ctx.fill();
    ctx.stroke();
    const directionRight = state.params.direction === 'right';
    arrow(
      ctx,
      BASE_W / 2 - DIRECTION_ARROW_HALF,
      DIRECTION_ARROW_Y,
      BASE_W / 2 +
        (directionRight ? DIRECTION_ARROW_HALF : -DIRECTION_ARROW_HALF),
      DIRECTION_ARROW_Y,
      p.wave,
      3 * cs
    );
    text(
      ctx,
      directionRight ? '波向右传播' : '波向左传播',
      BASE_W / 2,
      DIRECTION_TEXT_Y,
      p.wave,
      12 * cs,
      'center'
    );

    const graphBottom = AXIS_Y + AMPLITUDE_PIXELS;
    ctx.strokeStyle = p.grid;
    ctx.lineWidth = 1;
    for (const y of [AXIS_Y - AMPLITUDE_PIXELS, AXIS_Y + AMPLITUDE_PIXELS]) {
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(GRAPH_LEFT, y);
      ctx.lineTo(GRAPH_RIGHT, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.strokeStyle = p.axis;
    ctx.lineWidth = 2 * cs;
    ctx.beginPath();
    ctx.moveTo(GRAPH_LEFT, AXIS_Y);
    ctx.lineTo(AXIS_END, AXIS_Y);
    ctx.moveTo(GRAPH_LEFT, graphBottom);
    ctx.lineTo(GRAPH_LEFT, GRAPH_TOP);
    ctx.stroke();
    text(ctx, 'x (m)', X_LABEL_X, AXIS_Y + 4, p.axis, 14 * cs);
    text(
      ctx,
      'y (cm)',
      GRAPH_LEFT - 8,
      GRAPH_TOP - 12,
      p.axis,
      14 * cs,
      'right'
    );
    for (let x = 0; x <= 8; x += 1) {
      const px = worldX(x);
      ctx.beginPath();
      ctx.moveTo(px, AXIS_Y - 4);
      ctx.lineTo(px, AXIS_Y + 4);
      ctx.stroke();
      if (x > 0)
        text(ctx, String(x), px, AXIS_Y + 20, p.axis, 13 * cs, 'center');
    }
    text(
      ctx,
      'A',
      GRAPH_LEFT - 12,
      AXIS_Y - AMPLITUDE_PIXELS,
      p.label,
      12 * cs,
      'right'
    );
    text(
      ctx,
      '-A',
      GRAPH_LEFT - 12,
      AXIS_Y + AMPLITUDE_PIXELS,
      p.label,
      12 * cs,
      'right'
    );
    drawWave(ctx, state, p, cs);

    const particleXs = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    for (const x of particleXs) {
      const y = harmonicWaveY(
        x,
        state.time,
        state.params.amplitude,
        state.params.wavelength,
        state.params.period,
        state.params.direction
      );
      const px = worldX(x);
      const py = worldY(y);
      ctx.fillStyle = p.particle;
      ctx.beginPath();
      ctx.arc(px, py, 5 * cs, 0, Math.PI * 2);
      ctx.fill();
      if (state.params.showVelocity) {
        const v = harmonicWaveVelocity(
          x,
          state.time,
          state.params.amplitude,
          state.params.wavelength,
          state.params.period,
          state.params.direction
        );
        arrow(
          ctx,
          px,
          py,
          px,
          py - Math.max(-VELOCITY_CLAMP, Math.min(VELOCITY_CLAMP, v * 2)),
          p.velocity,
          2.2 * cs
        );
      }
      if (state.params.showAcceleration) {
        const a = harmonicWaveAcceleration(y, state.params.period);
        arrow(
          ctx,
          px,
          py,
          px,
          py - Math.max(-VELOCITY_CLAMP, Math.min(VELOCITY_CLAMP, a * 0.9)),
          p.acceleration,
          2.2 * cs
        );
      }
    }

    const pointPx = worldX(state.params.pointX);
    const pointPy = worldY(state.pointY);
    ctx.save();
    ctx.strokeStyle = p.yellow;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pointPx, AXIS_Y - AMPLITUDE_PIXELS);
    ctx.lineTo(pointPx, AXIS_Y + AMPLITUDE_PIXELS);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = p.point;
    ctx.lineWidth = 2.5 * cs;
    ctx.fillStyle = p.point;
    ctx.beginPath();
    ctx.arc(pointPx, pointPy, 8 * cs, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    text(ctx, 'P', pointPx + 15, pointPy - 10, p.point, 15 * cs);

    text(ctx, '● 介质质点', LEGEND_X_1, LEGEND_Y, p.label, 12 * cs);
    text(ctx, '↑ 振动速度 v', LEGEND_X_2, LEGEND_Y, p.velocity, 12 * cs);
    text(ctx, '↑ 加速度 a', LEGEND_X_3, LEGEND_Y, p.acceleration, 12 * cs);
    if (state.params.showGhost)
      text(ctx, '··· Δt 波形', LEGEND_X_4, LEGEND_Y, p.ghost, 12 * cs);
    text(
      ctx,
      '拖动 P 或调节参数 · Space 暂停',
      BASE_W / 2,
      HINT_Y,
      p.label,
      12 * cs,
      'center'
    );
    ctx.restore();
  }

  return {
    render(state: HarmonicWaveState): void {
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
