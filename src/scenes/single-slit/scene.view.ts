import { scaledSize } from '../../core/canvas-sizing';
import { lambdaToRgb, wavelengthToColor } from '../../core/wavelength';
import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  diffractionIntensity,
  fanHalfPx,
  graphTickLabel,
  graphTickOrders,
  graphY,
  slitGapPx,
  stageLayoutFrom,
  stageTransform,
  singleSlitConstants as C,
  xToPx,
  type SingleSlitState
} from './scene.sim';

export type CreateSingleSlitViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

type Palette = {
  bg: string;
  grid: string;
  ink: string;
  muted: string;
  cyan: string;
  screen: string;
  screenInk: string;
  detector: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    grid: '#e4e9ee',
    ink: '#2c3340',
    muted: '#7d8997',
    cyan: '#1f9b8f',
    screen: '#121820',
    screenInk: '#f3f5f7',
    detector: '#2bbbad'
  },
  dark: {
    bg: '#101827',
    grid: '#435169',
    ink: '#eef2f7',
    muted: '#9eabbc',
    cyan: '#34d399',
    screen: '#070b12',
    screenInk: '#e8eef6',
    detector: '#43c6b5'
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
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, radius);
    return;
  }
  ctx.rect(x, y, w, h);
}

function waveRgba(lambda: number, alpha: number): string {
  const [r, g, b] = lambdaToRgb(lambda);
  return `rgba(${r},${g},${b},${alpha})`;
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
  const len = Math.hypot(dx, dy);
  if (len < 2) return;
  const ux = dx / len;
  const uy = dy / len;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
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
}

function drawGrid(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let x = 0; x <= C.baseWidth; x += C.gridStep) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, C.baseHeight);
    ctx.stroke();
  }
  for (let y = 0; y <= C.baseHeight; y += C.gridStep) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(C.baseWidth, y);
    ctx.stroke();
  }
}

function drawLaserAndSlit(
  ctx: CanvasRenderingContext2D,
  state: SingleSlitState,
  p: Palette,
  font: (n: number) => number
): void {
  const accent = wavelengthToColor(state.params.lambda);
  const laserLeft = C.centerX - C.laserWidth / 2;
  const laserTop = C.laserY - C.laserHeight / 2;
  ctx.fillStyle = p.ink;
  rounded(ctx, laserLeft, laserTop, C.laserWidth, C.laserHeight, 8);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(C.centerX, laserTop + C.laserHeight, C.laserAperture, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(C.centerX, laserTop + C.laserHeight + 2);
  ctx.lineTo(C.centerX, C.slitY - C.slitBarHeight);
  ctx.stroke();
  text(
    ctx,
    '激光器',
    laserLeft - 10,
    C.laserY,
    p.muted,
    font(13),
    'right',
    650
  );

  ctx.fillStyle = p.ink;
  ctx.fillRect(0, C.slitY - C.slitBarHeight / 2, C.baseWidth, C.slitBarHeight);
  const gap = slitGapPx(state.params.slitWidth);
  ctx.fillStyle = p.bg;
  ctx.fillRect(
    C.centerX - gap,
    C.slitY - C.slitBarHeight,
    gap * 2,
    C.slitBarHeight * 2
  );
  const glow = ctx.createLinearGradient(
    C.centerX,
    C.slitY,
    C.centerX,
    C.slitY + 18
  );
  glow.addColorStop(0, waveRgba(state.params.lambda, 0.55));
  glow.addColorStop(1, waveRgba(state.params.lambda, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(C.centerX - gap, C.slitY, gap * 2, 16);
  text(ctx, '单缝 a', C.centerX, C.slitY - 22, p.ink, font(13), 'center', 700);

  const fan = fanHalfPx(state.firstMinimum);
  const screenTop = C.screenY - C.screenHeight / 2;
  const beam = ctx.createLinearGradient(
    C.centerX,
    C.slitY,
    C.centerX,
    screenTop
  );
  beam.addColorStop(0, waveRgba(state.params.lambda, 0.32));
  beam.addColorStop(1, waveRgba(state.params.lambda, 0.05));
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(C.centerX - gap * 0.4, C.slitY);
  ctx.lineTo(C.centerX - fan, screenTop);
  ctx.lineTo(C.centerX + fan, screenTop);
  ctx.lineTo(C.centerX + gap * 0.4, C.slitY);
  ctx.closePath();
  ctx.fill();

  const dimX = C.graphRight + 18;
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(dimX - 6, C.slitY);
  ctx.lineTo(dimX + 6, C.slitY);
  ctx.moveTo(dimX - 6, screenTop);
  ctx.lineTo(dimX + 6, screenTop);
  ctx.moveTo(dimX, C.slitY);
  ctx.lineTo(dimX, screenTop);
  ctx.stroke();
  text(
    ctx,
    'L',
    dimX + 12,
    (C.slitY + screenTop) / 2,
    p.muted,
    font(13),
    'left',
    700
  );
}

function drawScreen(
  ctx: CanvasRenderingContext2D,
  state: SingleSlitState,
  p: Palette,
  font: (n: number) => number
): void {
  const screenTop = C.screenY - C.screenHeight / 2;
  const screenLeft = C.screenInset;
  const screenWidth = C.baseWidth - C.screenInset * 2;
  ctx.fillStyle = p.screen;
  rounded(ctx, screenLeft, screenTop, screenWidth, C.screenHeight, 4);
  ctx.fill();

  for (
    let x = screenLeft;
    x < screenLeft + screenWidth;
    x += C.screenBandStep
  ) {
    const intensity = diffractionIntensity(
      (x - C.centerX) / C.pxPerMm,
      state.params.lambda,
      state.params.slitWidth,
      state.params.distance
    );
    ctx.fillStyle = waveRgba(state.params.lambda, 0.05 + intensity * 0.9);
    ctx.fillRect(x, screenTop, C.screenBandStep + 1, C.screenHeight);
  }

  text(
    ctx,
    '探测光屏',
    screenLeft + 16,
    C.screenY,
    p.screenInk,
    font(12),
    'left',
    700
  );
  text(
    ctx,
    '衍射图样',
    screenLeft + screenWidth - 16,
    C.screenY,
    p.screenInk,
    font(12),
    'right',
    700
  );
}

function drawDetector(
  ctx: CanvasRenderingContext2D,
  state: SingleSlitState,
  p: Palette,
  font: (n: number) => number
): void {
  const detectorX = clampPx(xToPx(state.params.detectorX));
  const screenTop = C.screenY - C.screenHeight / 2;
  const screenBottom = C.screenY + C.screenHeight / 2;
  const graphPointY = graphY(state.intensity);

  ctx.strokeStyle = p.detector;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(C.centerX, C.slitY);
  ctx.lineTo(detectorX, C.screenY);
  ctx.stroke();

  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(detectorX, screenBottom);
  ctx.lineTo(detectorX, graphPointY);
  ctx.stroke();
  ctx.setLineDash([]);

  if (Math.abs(state.params.detectorX) > 0.4) {
    const radius = 36;
    const start = Math.PI / 2;
    const sweep = Math.atan2(detectorX - C.centerX, C.screenY - C.slitY);
    ctx.strokeStyle = p.detector;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(C.centerX, C.slitY, radius, start, start - sweep, sweep > 0);
    ctx.stroke();
    text(
      ctx,
      'θ',
      C.centerX + Math.sign(state.params.detectorX) * (radius + 14),
      C.slitY + 28,
      p.detector,
      font(14),
      'center',
      700
    );
  }

  ctx.fillStyle = p.detector;
  ctx.beginPath();
  ctx.arc(detectorX, screenTop + 2, C.detectorRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(detectorX, screenTop + 2, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(detectorX, screenBottom);
  ctx.lineTo(detectorX - 6, screenBottom + 10);
  ctx.lineTo(detectorX + 6, screenBottom + 10);
  ctx.closePath();
  ctx.fillStyle = p.detector;
  ctx.fill();
  let detectorAlign: CanvasTextAlign = 'center';
  let detectorLabelX = detectorX;
  if (detectorX > C.centerX + 140) {
    detectorAlign = 'right';
    detectorLabelX = detectorX - 8;
  } else if (detectorX < C.centerX - 140) {
    detectorAlign = 'left';
    detectorLabelX = detectorX + 8;
  }
  text(
    ctx,
    '探测器',
    detectorLabelX,
    screenTop - 18,
    p.detector,
    font(12),
    detectorAlign,
    700
  );

  ctx.fillStyle = p.detector;
  ctx.beginPath();
  ctx.arc(detectorX, graphPointY, C.graphPointRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(detectorX, graphPointY, 3.2, 0, Math.PI * 2);
  ctx.fill();
}

function clampPx(px: number): number {
  return Math.max(C.graphLeft, Math.min(C.graphRight, px));
}

function drawGraph(
  ctx: CanvasRenderingContext2D,
  state: SingleSlitState,
  p: Palette,
  font: (n: number) => number
): void {
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = C.graphTop + ((C.graphBottom - C.graphTop) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(C.graphLeft, y);
    ctx.lineTo(C.graphRight, y);
    ctx.stroke();
  }

  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(C.graphLeft, C.graphBottom);
  ctx.lineTo(C.graphRight, C.graphBottom);
  ctx.moveTo(C.centerX, C.graphBottom);
  ctx.lineTo(C.centerX, C.graphTop);
  ctx.stroke();
  arrow(
    ctx,
    C.centerX,
    C.graphBottom,
    C.centerX,
    C.graphTop - 8,
    p.ink,
    1.6,
    8
  );
  text(
    ctx,
    'I/I₀',
    C.centerX + 14,
    C.graphTop - 6,
    p.ink,
    font(12),
    'left',
    700
  );
  text(
    ctx,
    'x',
    C.graphRight + 14,
    C.graphBottom,
    p.ink,
    font(12),
    'left',
    700
  );

  for (const order of graphTickOrders(state.firstMinimum)) {
    const x = xToPx(order * state.firstMinimum);
    if (x < C.graphLeft + 8 || x > C.graphRight - 8) continue;
    text(
      ctx,
      graphTickLabel(order),
      x,
      C.graphBottom + 18,
      p.muted,
      font(11),
      'center'
    );
  }

  ctx.beginPath();
  state.samples.forEach((sample, index) => {
    const x = xToPx(sample.x);
    const y = graphY(sample.intensity);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.lineTo(C.graphRight, C.graphBottom);
  ctx.lineTo(C.graphLeft, C.graphBottom);
  ctx.closePath();
  const fill = ctx.createLinearGradient(0, C.graphTop, 0, C.graphBottom);
  fill.addColorStop(0, waveRgba(state.params.lambda, 0.22));
  fill.addColorStop(1, waveRgba(state.params.lambda, 0));
  ctx.fillStyle = fill;
  ctx.fill();

  ctx.beginPath();
  state.samples.forEach((sample, index) => {
    const x = xToPx(sample.x);
    const y = graphY(sample.intensity);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = wavelengthToColor(state.params.lambda);
  ctx.lineWidth = 2.8;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

export function createSingleSlitView(
  options: CreateSingleSlitViewOptions = {}
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
  let snapshot: SingleSlitState | null = null;
  let parentObserved = false;
  let panelObserved = false;
  let drawing = false;
  let redrawFrame: number | null = null;
  let lastObservedSize = '';
  const overlayObservers: Array<{ disconnect(): void }> = [];

  function paint(state: SingleSlitState): void {
    if (drawing) return;
    drawing = true;
    try {
      draw(state);
    } finally {
      drawing = false;
    }
  }

  function redraw(): void {
    if (!snapshot) return;
    if (typeof requestAnimationFrame !== 'function') {
      paint(snapshot);
      return;
    }
    if (redrawFrame !== null) return;
    redrawFrame = requestAnimationFrame(() => {
      redrawFrame = null;
      if (snapshot) paint(snapshot);
    });
  }

  function scheduleOverlayRedraw(): void {
    const canvas = stage.canvas;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) {
      redraw();
      return;
    }
    const panel = parent.querySelector(
      '.teaching-readout-panel, .srgb-readout-panel, .readout-panel'
    );
    const cr = canvas.getBoundingClientRect();
    const rr =
      panel instanceof HTMLElement ? panel.getBoundingClientRect() : null;
    const values = [
      cr.width,
      cr.height,
      rr?.left ?? -1,
      rr?.top ?? -1,
      rr?.width ?? -1,
      rr?.height ?? -1
    ].map((value) => Math.round(value * 10) / 10);
    const nextSize = values.join('|');
    if (nextSize === lastObservedSize) return;
    lastObservedSize = nextSize;
    redraw();
  }

  function watchOverlay(): void {
    if (!stage.canvas) return;
    const parent = stage.canvas.parentElement;
    if (!parent) return;
    if (!parentObserved && typeof ResizeObserver !== 'undefined') {
      parentObserved = true;
      const resize = new ResizeObserver(() => scheduleOverlayRedraw());
      resize.observe(parent);
      overlayObservers.push(resize);
    }
    if (panelObserved) return;
    const panel = parent.querySelector(
      '.teaching-readout-panel, .srgb-readout-panel, .readout-panel'
    );
    if (!(panel instanceof HTMLElement)) return;
    panelObserved = true;
    if (typeof ResizeObserver !== 'undefined') {
      const resize = new ResizeObserver(() => scheduleOverlayRedraw());
      resize.observe(panel);
      overlayObservers.push(resize);
    }
    if (typeof MutationObserver !== 'undefined') {
      const mutate = new MutationObserver(() => scheduleOverlayRedraw());
      mutate.observe(panel, {
        attributes: true,
        attributeFilter: ['class', 'style']
      });
      overlayObservers.push(mutate);
    }
  }

  function draw(state: SingleSlitState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const layout = stageLayoutFrom(stage.canvas);
    const { fit, offsetX, offsetY } = stageTransform(width, height, layout);
    const palette = PALETTE[env.theme];
    const rs = stage.responsiveScale;
    const typeScale = env.fontScale() * Math.min(env.contentScale(), 1.25);
    const font = (base: number): number =>
      scaledSize(base * typeScale, Math.max(rs, 0.3), 11) / Math.max(fit, 0.05);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fit, fit);
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, C.baseWidth, C.baseHeight);
    drawGrid(ctx, palette);
    drawLaserAndSlit(ctx, state, palette, font);
    drawScreen(ctx, state, palette, font);
    drawGraph(ctx, state, palette, font);
    drawDetector(ctx, state, palette, font);
    ctx.restore();
    watchOverlay();
  }

  return {
    render(state: SingleSlitState): void {
      snapshot = state;
      stage.ensureSized();
      paint(state);
    },
    resize(): void {
      stage.resize();
      if (snapshot) paint(snapshot);
    },
    setTheme(theme: TeachingTheme): void {
      env.setTheme(theme);
      if (snapshot) paint(snapshot);
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints): void {
      env.setMode(mode, hints);
      if (snapshot) paint(snapshot);
    },
    dispose(): void {
      snapshot = null;
      if (redrawFrame !== null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(redrawFrame);
        redrawFrame = null;
      }
      overlayObservers.forEach((observer) => observer.disconnect());
      overlayObservers.length = 0;
      stage.release();
    }
  };
}
