import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  ghostTime,
  harmonicWaveAcceleration,
  harmonicWaveConstants as C,
  harmonicWaveVelocity,
  harmonicWaveY,
  stageLayoutFrom,
  stageTransform,
  worldX,
  worldY,
  type HarmonicWaveState
} from './scene.sim';

export type CreateHarmonicWaveViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

type Palette = {
  bg: string;
  paper: string;
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
    paper: '#FFFFFF',
    axis: '#343A40',
    grid: '#E9ECEF',
    text: '#343A40',
    label: '#ADB5BD',
    wave: '#457B9D',
    ghost: '#ADB5BD',
    particle: '#343A40',
    velocity: '#2A9D8F',
    acceleration: '#E63946',
    point: '#FFD166',
    yellow: '#FFD166',
    pill: '#F8F9FA'
  },
  dark: {
    bg: '#0f172a',
    paper: '#111827',
    axis: '#cbd5e1',
    grid: '#334155',
    text: '#e2e8f0',
    label: '#94a3b8',
    wave: '#60a5fa',
    ghost: '#94a3b8',
    particle: '#cbd5e1',
    velocity: '#34d399',
    acceleration: '#fb7185',
    point: '#facc15',
    yellow: '#facc15',
    pill: '#1e293b'
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
  if (len < C.vectorMinPx) return;
  const ux = dx / len;
  const uy = dy / len;
  const head = Math.min(8, Math.max(5, len * 0.22));
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

function traceWave(
  ctx: CanvasRenderingContext2D,
  state: HarmonicWaveState,
  time: number
): void {
  const { amplitude, wavelength, period, direction } = state.params;
  ctx.beginPath();
  for (let x = 0; x <= C.xMaxMeters; x += 0.02) {
    const px = worldX(x);
    const py = worldY(
      harmonicWaveY(x, time, amplitude, wavelength, period, direction)
    );
    if (x === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
}

function drawVectors(
  ctx: CanvasRenderingContext2D,
  state: HarmonicWaveState,
  p: Palette,
  cs: number,
  x: number,
  px: number,
  py: number,
  y: number
): void {
  if (state.params.showVelocity) {
    const v = harmonicWaveVelocity(
      x,
      state.time,
      state.params.amplitude,
      state.params.wavelength,
      state.params.period,
      state.params.direction
    );
    const dy = v * C.velocityDisplayScale;
    if (Math.abs(dy) > C.vectorMinPx) {
      arrow(ctx, px, py, px, py - dy, p.velocity, 2 * cs);
    }
  }
  if (state.params.showAcceleration) {
    const a = harmonicWaveAcceleration(y, state.params.period);
    const dy = a * C.accelerationDisplayScale;
    if (Math.abs(dy) > C.vectorMinPx) {
      arrow(ctx, px, py, px, py - dy, p.acceleration, 2 * cs);
    }
  }
}

export function createHarmonicWaveView(
  options: CreateHarmonicWaveViewOptions = {}
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
  let snapshot: HarmonicWaveState | null = null;

  function draw(state: HarmonicWaveState): void {
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
    const pal = PALETTE[env.theme];
    const cs = env.contentScale() * stage.responsiveScale;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fit, fit);
    ctx.fillStyle = pal.paper;
    ctx.fillRect(0, 0, boxW, boxH);
    ctx.beginPath();
    ctx.rect(0, 0, boxW, boxH);
    ctx.clip();

    // 保留源课件的简洁标题；说明性副标题移出动画区，避免喧宾夺主。
    // 窄分栏的浮动读数可能压住舞台顶部，此时隐藏标题而保留完整波形。
    const title = '机械波：简谐横波传播状态模型';
    ctx.font = `600 ${22 * cs}px sans-serif`;
    const titleHalfWidth = ctx.measureText(title).width / 2;
    const overlayLeft =
      (width - (layout.overlayPx ?? 0) - offsetX) / Math.max(fit, 1e-6);
    const overlayTop =
      ((layout.overlayTopPx ?? 0) - offsetY) / Math.max(fit, 1e-6);
    const overlayBottom =
      ((layout.overlayTopPx ?? 0) + (layout.overlayHeightPx ?? 0) - offsetY) /
      Math.max(fit, 1e-6);
    const titleOverlapsReadout =
      layout.floatingReadout &&
      (layout.overlayPx ?? 0) > 0 &&
      C.indicatorCx + titleHalfWidth > overlayLeft &&
      C.indicatorCx - titleHalfWidth < boxW &&
      49 > overlayTop &&
      20 < overlayBottom;
    if (!titleOverlapsReadout) {
      text(ctx, title, C.indicatorCx, 35, pal.text, 22 * cs, 'center');
    }

    const ampPx = state.params.amplitude * C.yScale;
    ctx.fillStyle = pal.pill;
    ctx.strokeStyle = pal.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(
      C.indicatorCx - C.indicatorHalfWidth,
      C.indicatorCy - C.indicatorHeight / 2,
      C.indicatorWidth,
      C.indicatorHeight,
      C.indicatorRadius
    );
    ctx.fill();
    ctx.stroke();
    const right = state.params.direction === 'right';
    arrow(
      ctx,
      C.indicatorCx - C.directionArrowHalf,
      C.indicatorCy,
      C.indicatorCx + (right ? C.directionArrowHalf : -C.directionArrowHalf),
      C.indicatorCy,
      pal.wave,
      3 * cs
    );
    text(
      ctx,
      right ? '波向右传播' : '波向左传播',
      C.indicatorCx,
      C.indicatorCy + 22,
      pal.wave,
      12 * cs,
      'center'
    );

    ctx.strokeStyle = pal.grid;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(C.originX, C.originY - ampPx);
    ctx.lineTo(C.originX + C.waveWidth, C.originY - ampPx);
    ctx.moveTo(C.originX, C.originY + ampPx);
    ctx.lineTo(C.originX + C.waveWidth, C.originY + ampPx);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = pal.axis;
    ctx.lineWidth = 2 * cs;
    ctx.beginPath();
    ctx.moveTo(C.originX, C.originY);
    ctx.lineTo(C.originX + C.axisLength, C.originY);
    ctx.moveTo(C.originX, C.originY + C.yAxisHalf);
    ctx.lineTo(C.originX, C.originY - C.yAxisHalf);
    ctx.stroke();
    text(
      ctx,
      'x (m)',
      C.originX + C.xLabelOffset,
      C.originY + 5,
      pal.axis,
      14 * cs
    );
    text(
      ctx,
      'y (cm)',
      C.originX - 10,
      C.originY - C.yAxisHalf - 5,
      pal.axis,
      14 * cs,
      'right'
    );
    for (let x = 0; x <= C.xMaxMeters; x += 1) {
      const px = worldX(x);
      ctx.beginPath();
      ctx.moveTo(px, C.originY - 4);
      ctx.lineTo(px, C.originY + 4);
      ctx.stroke();
      if (x > 0)
        text(ctx, String(x), px, C.originY + 18, pal.axis, 12 * cs, 'center');
    }
    text(
      ctx,
      'A',
      C.originX - 10,
      C.originY - ampPx + 5,
      pal.label,
      12 * cs,
      'right'
    );
    text(
      ctx,
      '-A',
      C.originX - 10,
      C.originY + ampPx + 5,
      pal.label,
      12 * cs,
      'right'
    );

    if (state.params.showGhost) {
      ctx.save();
      ctx.strokeStyle = pal.ghost;
      ctx.lineWidth = 2.5 * cs;
      ctx.setLineDash([6, 4]);
      ctx.lineCap = 'round';
      traceWave(ctx, state, ghostTime(state.time, state.params.period));
      ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    ctx.strokeStyle = pal.wave;
    ctx.lineWidth = 3 * cs;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    traceWave(ctx, state, state.time);
    ctx.stroke();
    ctx.restore();

    const pointPx = worldX(state.params.pointX);
    ctx.save();
    ctx.strokeStyle = pal.yellow;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.6;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pointPx, C.originY - ampPx);
    ctx.lineTo(pointPx, C.originY + ampPx);
    ctx.stroke();
    ctx.restore();

    for (const x of C.particleXs) {
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
      drawVectors(ctx, state, pal, cs, x, px, py, y);
      ctx.fillStyle = pal.particle;
      ctx.beginPath();
      ctx.arc(px, py, C.particleRadius * cs, 0, Math.PI * 2);
      ctx.fill();
    }

    const pointPy = worldY(state.pointY);
    const onLattice = C.particleXs.some(
      (x) => Math.abs(x - state.params.pointX) < 1e-6
    );
    if (!onLattice) {
      drawVectors(
        ctx,
        state,
        pal,
        cs,
        state.params.pointX,
        pointPx,
        pointPy,
        state.pointY
      );
    }
    ctx.strokeStyle = pal.axis;
    ctx.lineWidth = 1.5 * cs;
    ctx.fillStyle = pal.point;
    ctx.beginPath();
    ctx.arc(pointPx, pointPy, C.pointRadius * cs, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    text(ctx, 'P', pointPx + 14, pointPy - 10, pal.point, 14 * cs);
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
