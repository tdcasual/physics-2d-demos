import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { wavelengthToColor } from '../../core/wavelength';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  singleSlitConstants,
  diffractionIntensity,
  type SingleSlitState
} from './scene.sim';

export type CreateSingleSlitViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onDetectorChange?: (detectorX: number) => void;
};

const {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  fieldWidth: FIELD_W,
  panelWidth: PANEL_W,
  panelInset: INSET,
  dividerY: DIVIDER_Y,
  gridStep: GRID_STEP,
  laserX: LASER_X,
  laserY: LASER_Y,
  slitY: SLIT_Y,
  screenY: SCREEN_Y,
  screenHeight: SCREEN_HEIGHT,
  graphTop: GRAPH_TOP,
  graphBottom: GRAPH_BOTTOM,
  graphLeft: GRAPH_LEFT,
  graphRight: GRAPH_RIGHT,
  graphAxisTick: GRAPH_TICK,
  slitBarHeight: SLIT_BAR_HEIGHT,
  slitGap: SLIT_GAP,
  screenBandStep: SCREEN_BAND_STEP,
  detectorRadius: DETECTOR_RADIUS,
  detectorMin: DETECTOR_MIN,
  detectorMax: DETECTOR_MAX,
  detectorPixelsPerMm: DETECTOR_PX_PER_MM,
  lineDash: LINE_DASH,
  cardWidth: CARD_WIDTH,
  cardHeight: CARD_HEIGHT,
  formulaCardY: FORMULA_CARD_Y,
  formulaCardHeight: FORMULA_CARD_HEIGHT,
  readoutCardY: READOUT_CARD_Y,
  readoutRowHeight: READOUT_ROW_HEIGHT,
  calloutY: CALLOUT_Y,
  calloutHeight: CALLOUT_HEIGHT
} = singleSlitConstants;

const FIELD_CENTER_X = LASER_X;

type Palette = {
  bg: string;
  panel: string;
  grid: string;
  ink: string;
  muted: string;
  red: string;
  cyan: string;
  blue: string;
  border: string;
  soft: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    panel: '#ffffff',
    grid: '#e0e7ed',
    ink: '#303744',
    muted: '#7d8997',
    red: '#f03434',
    cyan: '#2a9d8f',
    blue: '#4f86aa',
    border: '#d4dce4',
    soft: '#f1f4f6'
  },
  dark: {
    bg: '#0f172a',
    panel: '#172235',
    grid: '#34445d',
    ink: '#eef2f7',
    muted: '#9eabbc',
    red: '#fb5a52',
    cyan: '#43c6b5',
    blue: '#79b4dc',
    border: '#3d4d63',
    soft: '#233148'
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

function alphaColor(color: string, alpha: number): string {
  return color.replace('rgb(', 'rgba(').replace(')', `,${alpha})`);
}

function drawGrid(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let x = 0; x <= FIELD_W; x += GRID_STEP) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, BASE_H);
    ctx.stroke();
  }
  for (let y = 0; y <= BASE_H; y += GRID_STEP) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(FIELD_W, y);
    ctx.stroke();
  }
}

function drawLaserAndSlit(
  ctx: CanvasRenderingContext2D,
  state: SingleSlitState,
  p: Palette,
  scale: number
): void {
  const accent = wavelengthToColor(state.params.lambda);
  ctx.fillStyle = p.ink;
  ctx.beginPath();
  ctx.roundRect(LASER_X - 24, LASER_Y - 22, 48, 42, 8);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(LASER_X, LASER_Y + 20, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(LASER_X, LASER_Y + 25);
  ctx.lineTo(LASER_X, SLIT_Y - SLIT_BAR_HEIGHT);
  ctx.stroke();
  text(ctx, '激光器', LASER_X - 6, LASER_Y - 34, p.muted, 14 * scale, 'right');

  ctx.fillStyle = p.ink;
  ctx.fillRect(0, SLIT_Y - SLIT_BAR_HEIGHT / 2, FIELD_W, SLIT_BAR_HEIGHT);
  ctx.fillStyle = p.bg;
  ctx.fillRect(
    LASER_X - SLIT_GAP,
    SLIT_Y - SLIT_BAR_HEIGHT,
    SLIT_GAP * 2,
    SLIT_BAR_HEIGHT * 2
  );
  text(
    ctx,
    '单缝（宽 a）',
    LASER_X - 3,
    SLIT_Y - 24,
    p.ink,
    14 * scale,
    'center'
  );

  const beam = ctx.createLinearGradient(LASER_X, SLIT_Y, FIELD_W, SCREEN_Y);
  beam.addColorStop(0, alphaColor(accent, 0.27));
  beam.addColorStop(1, alphaColor(accent, 0));
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(LASER_X - SLIT_GAP, SLIT_Y);
  ctx.lineTo(FIELD_W, SCREEN_Y - SCREEN_HEIGHT / 2);
  ctx.lineTo(FIELD_W, SCREEN_Y + SCREEN_HEIGHT / 2);
  ctx.lineTo(LASER_X + SLIT_GAP, SLIT_Y);
  ctx.closePath();
  ctx.fill();
}

function drawScreen(
  ctx: CanvasRenderingContext2D,
  state: SingleSlitState,
  p: Palette,
  scale: number
): void {
  const screenTop = SCREEN_Y - SCREEN_HEIGHT / 2;
  ctx.fillStyle = '#121820';
  ctx.fillRect(0, screenTop, FIELD_W, SCREEN_HEIGHT);
  for (let x = 0; x < FIELD_W; x += SCREEN_BAND_STEP) {
    const xMm = (x - FIELD_CENTER_X) / DETECTOR_PX_PER_MM;
    const intensity = diffractionIntensity(
      xMm,
      state.params.lambda,
      state.params.slitWidth,
      state.params.distance
    );
    ctx.fillStyle = `rgba(255,56,42,${0.06 + intensity * 0.88})`;
    ctx.fillRect(x, screenTop, SCREEN_BAND_STEP + 1, SCREEN_HEIGHT);
  }
  text(ctx, '探测光屏', 38, SCREEN_Y, '#f3f5f7', 14 * scale, 'left', 700);
  text(
    ctx,
    '衍射图样',
    FIELD_W - 36,
    SCREEN_Y,
    '#f3f5f7',
    14 * scale,
    'right',
    700
  );

  const detectorX = Math.max(
    20,
    Math.min(
      FIELD_W - 20,
      FIELD_CENTER_X + state.params.detectorX * DETECTOR_PX_PER_MM
    )
  );
  ctx.strokeStyle = p.cyan;
  ctx.lineWidth = 2;
  ctx.setLineDash([LINE_DASH, LINE_DASH]);
  ctx.beginPath();
  ctx.moveTo(detectorX, SCREEN_Y + SCREEN_HEIGHT / 2);
  ctx.lineTo(detectorX, GRAPH_BOTTOM);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = p.cyan;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(LASER_X, SLIT_Y);
  ctx.lineTo(detectorX, SCREEN_Y);
  ctx.stroke();
  ctx.fillStyle = p.cyan;
  ctx.beginPath();
  ctx.arc(detectorX, SCREEN_Y - 14, DETECTOR_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.panel;
  ctx.beginPath();
  ctx.arc(detectorX, SCREEN_Y - 14, 5, 0, Math.PI * 2);
  ctx.fill();
  text(
    ctx,
    '探测器',
    detectorX,
    SCREEN_Y - 44,
    p.cyan,
    14 * scale,
    'center',
    700
  );
  text(
    ctx,
    `x = ${state.params.detectorX.toFixed(2)} mm`,
    detectorX,
    SCREEN_Y + SCREEN_HEIGHT / 2 + 28,
    p.muted,
    12 * scale,
    'center'
  );
  text(
    ctx,
    `θ = ${state.angle.toFixed(3)}°`,
    detectorX + 20,
    SLIT_Y + 44,
    p.cyan,
    12 * scale,
    'left',
    700
  );
}

function drawGraph(
  ctx: CanvasRenderingContext2D,
  state: SingleSlitState,
  p: Palette,
  scale: number
): void {
  const first = Math.max(1, state.firstMinimum);
  const range = first * singleSlitConstants.graphRangeMultiplier;
  const graphWidth = GRAPH_RIGHT - GRAPH_LEFT;
  const xFor = (x: number): number =>
    GRAPH_LEFT + ((x + range) / (range * 2)) * graphWidth;
  const yFor = (intensity: number): number =>
    GRAPH_BOTTOM - intensity * (GRAPH_BOTTOM - GRAPH_TOP);

  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = GRAPH_TOP + ((GRAPH_BOTTOM - GRAPH_TOP) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(GRAPH_LEFT, y);
    ctx.lineTo(GRAPH_RIGHT, y);
    ctx.stroke();
  }
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(GRAPH_LEFT, GRAPH_BOTTOM);
  ctx.lineTo(GRAPH_RIGHT, GRAPH_BOTTOM);
  ctx.moveTo(FIELD_CENTER_X, GRAPH_BOTTOM);
  ctx.lineTo(FIELD_CENTER_X, GRAPH_TOP);
  ctx.stroke();
  text(
    ctx,
    '相对光强 I/I₀',
    GRAPH_LEFT,
    GRAPH_TOP - 22,
    p.ink,
    12 * scale,
    'left',
    700
  );
  text(
    ctx,
    '位置 x / mm',
    GRAPH_RIGHT,
    GRAPH_BOTTOM + 20,
    p.ink,
    12 * scale,
    'right',
    700
  );
  text(
    ctx,
    '0',
    FIELD_CENTER_X,
    GRAPH_BOTTOM + 20,
    p.muted,
    10 * scale,
    'center'
  );
  for (const tick of [-2, -1, 1, 2]) {
    const x = xFor(tick * first);
    if (x > GRAPH_LEFT && x < GRAPH_RIGHT) {
      text(
        ctx,
        `${tick}x₁`,
        x,
        GRAPH_BOTTOM + 20,
        p.muted,
        10 * scale,
        'center'
      );
    }
  }
  for (let i = 0; i <= 4; i += 1) {
    text(
      ctx,
      (1 - i / 4).toFixed(1),
      GRAPH_LEFT - GRAPH_TICK,
      GRAPH_TOP + ((GRAPH_BOTTOM - GRAPH_TOP) * i) / 4,
      p.muted,
      10 * scale,
      'right'
    );
  }

  ctx.beginPath();
  state.samples.forEach((sample, index) => {
    const x = xFor(sample.x);
    const y = yFor(sample.intensity);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.lineTo(GRAPH_RIGHT, GRAPH_BOTTOM);
  ctx.lineTo(GRAPH_LEFT, GRAPH_BOTTOM);
  ctx.closePath();
  const fill = ctx.createLinearGradient(0, GRAPH_TOP, 0, GRAPH_BOTTOM);
  fill.addColorStop(0, '#f0343433');
  fill.addColorStop(1, '#f0343400');
  ctx.fillStyle = fill;
  ctx.fill();

  ctx.beginPath();
  state.samples.forEach((sample, index) => {
    const x = xFor(sample.x);
    const y = yFor(sample.intensity);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 3;
  ctx.stroke();

  const selectedGraphX = Math.max(
    GRAPH_LEFT,
    Math.min(GRAPH_RIGHT, xFor(state.params.detectorX))
  );
  ctx.strokeStyle = p.cyan;
  ctx.lineWidth = 2;
  ctx.setLineDash([LINE_DASH, LINE_DASH]);
  ctx.beginPath();
  ctx.moveTo(selectedGraphX, GRAPH_TOP);
  ctx.lineTo(selectedGraphX, GRAPH_BOTTOM);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = p.cyan;
  ctx.beginPath();
  ctx.arc(selectedGraphX, yFor(state.intensity), 7, 0, Math.PI * 2);
  ctx.fill();
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: SingleSlitState,
  p: Palette,
  scale: number
): void {
  const x = FIELD_W;
  ctx.fillStyle = p.panel;
  ctx.fillRect(x, 0, PANEL_W, BASE_H);
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, BASE_H);
  ctx.stroke();
  text(ctx, '单缝衍射条纹分布', x + INSET, 38, p.ink, 19 * scale, 'left', 700);
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + INSET, DIVIDER_Y);
  ctx.lineTo(x + CARD_WIDTH + INSET, DIVIDER_Y);
  ctx.stroke();

  ctx.fillStyle = p.soft;
  ctx.beginPath();
  ctx.roundRect(x + INSET, FORMULA_CARD_Y, CARD_WIDTH, FORMULA_CARD_HEIGHT, 12);
  ctx.fill();
  text(
    ctx,
    '小角近似',
    x + INSET + 18,
    FORMULA_CARD_Y + 22,
    p.muted,
    13 * scale,
    'left',
    700
  );
  text(
    ctx,
    'I/I₀ = (sinβ/β)²',
    x + INSET + 18,
    FORMULA_CARD_Y + 54,
    p.ink,
    16 * scale,
    'left',
    700
  );
  text(
    ctx,
    'β = πa sinθ / λ',
    x + INSET + 18,
    FORMULA_CARD_Y + 86,
    p.cyan,
    14 * scale,
    'left',
    700
  );

  ctx.fillStyle = p.soft;
  ctx.beginPath();
  ctx.roundRect(x + INSET, READOUT_CARD_Y, CARD_WIDTH, CARD_HEIGHT, 12);
  ctx.fill();
  const rows: Array<[string, string, string]> = [
    ['波长 λ', `${state.params.lambda} nm`, p.red],
    ['缝宽 a', `${state.params.slitWidth.toFixed(2)} mm`, p.blue],
    ['缝屏距 L', `${state.params.distance.toFixed(1)} m`, p.blue],
    ['衍射角 θ', `${state.angle.toFixed(3)}°`, p.cyan],
    ['第一暗纹 x₁', `${state.firstMinimum.toFixed(2)} mm`, p.ink],
    ['中央明纹 Δx', `${state.centralWidth.toFixed(2)} mm`, p.ink]
  ];
  rows.forEach(([label, value, color], index) => {
    const y = READOUT_CARD_Y + 20 + index * READOUT_ROW_HEIGHT;
    text(ctx, label, x + INSET + 18, y, p.muted, 12 * scale);
    text(
      ctx,
      value,
      x + INSET + CARD_WIDTH - 18,
      y,
      color,
      12 * scale,
      'right',
      700
    );
  });

  ctx.fillStyle = '#e7f4f1';
  ctx.beginPath();
  ctx.roundRect(x + INSET, CALLOUT_Y, CARD_WIDTH, CALLOUT_HEIGHT, 12);
  ctx.fill();
  text(
    ctx,
    '结论',
    x + INSET + 18,
    CALLOUT_Y + 20,
    p.ink,
    13 * scale,
    'left',
    700
  );
  text(
    ctx,
    '波长越长，条纹越宽',
    x + INSET + 18,
    CALLOUT_Y + 52,
    p.cyan,
    14 * scale,
    'left',
    700
  );
  text(
    ctx,
    '狭缝越窄，衍射越明显',
    x + INSET + 18,
    CALLOUT_Y + 84,
    p.cyan,
    14 * scale,
    'left',
    700
  );
  text(
    ctx,
    state.status,
    x + INSET + 18,
    CALLOUT_Y + 112,
    p.muted,
    11 * scale,
    'left'
  );
}

export function createSingleSlitView(
  options: CreateSingleSlitViewOptions = {}
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
  let snapshot: SingleSlitState | null = null;
  let dragging = false;

  function detectorFromEvent(event: PointerEvent): number | null {
    const canvas = stage.canvas;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const localX = ((event.clientX - rect.left) / rect.width) * BASE_W;
    const localY = ((event.clientY - rect.top) / rect.height) * BASE_H;
    if (localX > FIELD_W || Math.abs(localY - SCREEN_Y) > SCREEN_HEIGHT)
      return null;
    return Math.max(
      DETECTOR_MIN,
      Math.min(DETECTOR_MAX, (localX - FIELD_CENTER_X) / DETECTOR_PX_PER_MM)
    );
  }

  function handlePointerDown(event: PointerEvent): void {
    const value = detectorFromEvent(event);
    if (value === null) return;
    dragging = true;
    stage.canvas?.setPointerCapture(event.pointerId);
    options.onDetectorChange?.(value);
  }

  function handlePointerMove(event: PointerEvent): void {
    if (!dragging) return;
    const value = detectorFromEvent(event);
    if (value !== null) options.onDetectorChange?.(value);
  }

  function handlePointerUp(event: PointerEvent): void {
    dragging = false;
    stage.canvas?.releasePointerCapture(event.pointerId);
  }

  stage.canvas?.addEventListener('pointerdown', handlePointerDown);
  stage.canvas?.addEventListener('pointermove', handlePointerMove);
  stage.canvas?.addEventListener('pointerup', handlePointerUp);
  stage.canvas?.addEventListener('pointercancel', handlePointerUp);

  function draw(state: SingleSlitState): void {
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
    drawGrid(ctx, p);
    drawLaserAndSlit(ctx, state, p, scale);
    drawScreen(ctx, state, p, scale);
    drawGraph(ctx, state, p, scale);
    drawPanel(ctx, state, p, scale);
    ctx.restore();
  }

  return {
    render(state: SingleSlitState): void {
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
      stage.canvas?.removeEventListener('pointerdown', handlePointerDown);
      stage.canvas?.removeEventListener('pointermove', handlePointerMove);
      stage.canvas?.removeEventListener('pointerup', handlePointerUp);
      stage.canvas?.removeEventListener('pointercancel', handlePointerUp);
      snapshot = null;
      stage.release();
    }
  };
}
