import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { magneticMirrorConstants, type MagneticMirrorState } from './scene.sim';

export type MagneticMirrorStageLayout = {
  floatingReadout: boolean;
  overlayLeftPx?: number;
  overlayWidthPx?: number;
  overlayTopPx?: number;
  overlayHeightPx?: number;
};

type StagePose = { fit: number; offsetX: number; offsetY: number };

export type CreateMagneticMirrorViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

const {
  baseHeight: BASE_H,
  fieldWidth: FIELD_W,
  axisY: AXIS_Y,
  coilLeftX: COIL_LEFT_X,
  coilRightX: COIL_RIGHT_X,
  centerX: CENTER_X,
  halfLength: HALF_LENGTH,
  coilWidth: COIL_WIDTH,
  coilHeight: COIL_HEIGHT,
  fieldTop: FIELD_TOP,
  fieldBottom: FIELD_BOTTOM,
  weakRegionWidth: WEAK_REGION_WIDTH,
  fieldCurveInset: FIELD_CURVE_INSET,
  fieldCurveControlInset: FIELD_CURVE_CONTROL_INSET,
  orbitRadius: ORBIT_RADIUS,
  trailLength: TRAIL_LENGTH,
  fieldLineCount: FIELD_LINE_COUNT,
  lineDash: LINE_DASH,
  particleRadius: PARTICLE_RADIUS,
  arrowLength: ARROW_LENGTH
} = magneticMirrorConstants;

type Palette = {
  bg: string;
  panel: string;
  grid: string;
  ink: string;
  muted: string;
  blue: string;
  orange: string;
  gold: string;
  green: string;
  cyan: string;
  red: string;
  magenta: string;
  border: string;
  soft: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    panel: '#ffffff',
    grid: '#e2e8f0',
    ink: '#283548',
    muted: '#748296',
    blue: '#78b8f2',
    orange: '#f08325',
    gold: '#e5ab27',
    green: '#159f8d',
    cyan: '#04a8d6',
    red: '#ef3948',
    magenta: '#ba4ad4',
    border: '#d3dce6',
    soft: '#f2f5f8'
  },
  dark: {
    bg: '#0f172a',
    panel: '#172235',
    grid: '#34445d',
    ink: '#eef2f7',
    muted: '#a3b1c4',
    blue: '#78b8f2',
    orange: '#fb923c',
    gold: '#fbbf24',
    green: '#42d0be',
    cyan: '#38c8f1',
    red: '#fb7185',
    magenta: '#d58aea',
    border: '#3d4d63',
    soft: '#243248'
  }
};

function containStage(
  width: number,
  height: number,
  boxW: number,
  boxH: number,
  offsetY = 0
): StagePose {
  const fit = Math.min(width / boxW, height / boxH);
  const stageW = boxW * fit;
  const stageH = boxH * fit;
  return {
    fit,
    offsetX: Math.max(0, (width - stageW) / 2),
    offsetY: offsetY + Math.max(0, (height - stageH) / 2)
  };
}

function hasFloatingReadout(canvas?: Element | null): boolean {
  const anchor = canvas ?? document.body;
  if (
    anchor.closest('.mobile-stack-layout, [data-testid="mobile-stack-layout"]')
  ) {
    return false;
  }
  if (
    anchor.closest('.split-right-shell, [data-testid="split-right-layout"]')
  ) {
    return true;
  }
  const panel = document.querySelector(
    '.teaching-readout-panel, .srgb-readout-panel, .readout-panel'
  );
  if (panel instanceof HTMLElement && canvas?.parentElement) {
    const position = getComputedStyle(panel).position;
    return (
      (position === 'absolute' || position === 'fixed') &&
      panel.parentElement === canvas.parentElement
    );
  }
  return true;
}

export function magneticMirrorStageLayoutFrom(
  canvas?: Element | null
): MagneticMirrorStageLayout {
  if (!hasFloatingReadout(canvas)) return { floatingReadout: false };
  let overlayTopPx = 0;
  let overlayHeightPx = 0;
  let overlayLeftPx = 0;
  let overlayWidthPx = 0;
  if (canvas instanceof HTMLElement) {
    const panel = canvas.parentElement?.querySelector(
      '.teaching-readout-panel, .srgb-readout-panel, .readout-panel'
    );
    if (panel instanceof HTMLElement) {
      const cr = canvas.getBoundingClientRect();
      const rr = panel.getBoundingClientRect();
      if (
        rr.left < cr.right &&
        rr.right > cr.left &&
        rr.top < cr.bottom &&
        rr.bottom > cr.top
      ) {
        const top = Math.max(rr.top, cr.top);
        const bottom = Math.min(rr.bottom, cr.bottom);
        overlayLeftPx = Math.max(0, rr.left - cr.left);
        overlayWidthPx = Math.max(
          0,
          Math.min(rr.right, cr.right) - Math.max(rr.left, cr.left)
        );
        overlayTopPx = Math.max(0, top - cr.top);
        overlayHeightPx = Math.max(0, bottom - top);
      }
    }
  }
  return {
    floatingReadout: true,
    ...(overlayWidthPx > 0 ? { overlayLeftPx, overlayWidthPx } : {}),
    ...(overlayHeightPx > 0 ? { overlayTopPx, overlayHeightPx } : {})
  };
}

export function magneticMirrorStageTransform(
  cssWidth: number,
  cssHeight: number,
  layout: MagneticMirrorStageLayout
): StagePose & { boxW: number; boxH: number; floatingReadout: boolean } {
  const width = Math.max(1, cssWidth);
  const height = Math.max(1, cssHeight);
  const boxW = FIELD_W;
  const boxH = BASE_H;
  if (!layout.floatingReadout) {
    return {
      ...containStage(width, height, boxW, boxH),
      boxW,
      boxH,
      floatingReadout: false
    };
  }
  const gap = 16;
  const panelLeft = layout.overlayLeftPx;
  const panelWidth = layout.overlayWidthPx;
  const top = layout.overlayTopPx;
  const panelHeight = layout.overlayHeightPx;
  if (
    typeof top === 'number' &&
    typeof panelHeight === 'number' &&
    panelHeight > 0
  ) {
    const panelTop = Math.max(0, Math.min(height, top));
    const panelBottom = Math.max(panelTop, Math.min(height, top + panelHeight));
    const candidates: StagePose[] = [];
    if (
      typeof panelLeft === 'number' &&
      typeof panelWidth === 'number' &&
      panelWidth > 0
    ) {
      const leftWidth = panelLeft - gap;
      const rightStart = panelLeft + panelWidth + gap;
      const rightWidth = width - rightStart;
      if (leftWidth > 1)
        candidates.push(containStage(leftWidth, height, boxW, boxH));
      if (rightWidth > 1) {
        candidates.push({
          ...containStage(rightWidth, height, boxW, boxH),
          offsetX:
            rightStart + containStage(rightWidth, height, boxW, boxH).offsetX
        });
      }
    }
    const aboveHeight = panelTop - gap;
    if (aboveHeight > 1)
      candidates.push(containStage(width, aboveHeight, boxW, boxH));
    const belowHeight = height - panelBottom - gap;
    if (belowHeight > 1) {
      candidates.push(
        containStage(width, belowHeight, boxW, boxH, panelBottom + gap)
      );
    }
    if (candidates.length > 0) {
      const chosen = candidates.reduce((best, candidate) =>
        candidate.fit > best.fit ? candidate : best
      );
      return { ...chosen, boxW, boxH, floatingReadout: true };
    }
  }
  const fallback = containStage(width, height, boxW, boxH);
  return { ...fallback, boxW, boxH, floatingReadout: true };
}

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

function arrowLine(
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
  const length = Math.hypot(dx, dy);
  if (length < 2) return;
  const ux = dx / length;
  const uy = dy / length;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - ux * 14 - uy * 6, y2 - uy * 14 + ux * 6);
  ctx.lineTo(x2 - ux * 14 + uy * 6, y2 - uy * 14 - ux * 6);
  ctx.closePath();
  ctx.fill();
}

function drawFieldLines(
  ctx: CanvasRenderingContext2D,
  state: MagneticMirrorState,
  p: Palette
): void {
  if (!state.params.showField) return;
  ctx.strokeStyle = p.blue;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([LINE_DASH, LINE_DASH]);
  for (let i = 0; i < FIELD_LINE_COUNT; i += 1) {
    const offset = (i - (FIELD_LINE_COUNT - 1) / 2) * 44;
    ctx.beginPath();
    ctx.moveTo(COIL_LEFT_X - FIELD_CURVE_INSET, AXIS_Y + offset * 0.76);
    ctx.bezierCurveTo(
      COIL_LEFT_X + FIELD_CURVE_CONTROL_INSET,
      AXIS_Y + offset,
      COIL_RIGHT_X - FIELD_CURVE_CONTROL_INSET,
      AXIS_Y + offset,
      COIL_RIGHT_X + FIELD_CURVE_INSET,
      AXIS_Y + offset * 0.76
    );
    ctx.stroke();
  }
  ctx.setLineDash([]);
  arrowLine(
    ctx,
    CENTER_X - 92,
    AXIS_Y - 2,
    CENTER_X - 18,
    AXIS_Y - 2,
    p.blue,
    2
  );
  arrowLine(
    ctx,
    CENTER_X + 18,
    AXIS_Y - 2,
    CENTER_X + 92,
    AXIS_Y - 2,
    p.blue,
    2
  );
}

function drawCoil(
  ctx: CanvasRenderingContext2D,
  x: number,
  p: Palette,
  scale: number
): void {
  ctx.strokeStyle = p.orange;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.ellipse(x, AXIS_Y, COIL_WIDTH, COIL_HEIGHT / 2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = p.gold;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(
    x,
    AXIS_Y,
    COIL_WIDTH + 12,
    COIL_HEIGHT / 2 + 14,
    0,
    0,
    Math.PI * 2
  );
  ctx.stroke();
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(
    x,
    AXIS_Y,
    COIL_WIDTH - 7,
    COIL_HEIGHT / 2 - 18,
    0,
    0,
    Math.PI * 2
  );
  ctx.stroke();
  text(ctx, '强磁场', x, FIELD_TOP - 24, p.orange, 13 * scale, 'center', 700);
}

function drawParticle(
  ctx: CanvasRenderingContext2D,
  state: MagneticMirrorState,
  p: Palette,
  scale: number
): void {
  const x = CENTER_X + state.position * HALF_LENGTH;
  const phase = state.time * 9 * state.fieldRatio;
  const amplitude =
    ORBIT_RADIUS * (state.gyroRadius / Math.max(state.speed, 1e-9));
  ctx.strokeStyle = p.gold;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i <= TRAIL_LENGTH; i += 2) {
    const px = x - TRAIL_LENGTH + i;
    const local = (i / TRAIL_LENGTH) * Math.PI * 5 + phase;
    const py = AXIS_Y + Math.sin(local) * amplitude;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.fillStyle = p.red;
  ctx.beginPath();
  ctx.arc(x, AXIS_Y, PARTICLE_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.panel;
  ctx.beginPath();
  ctx.arc(x, AXIS_Y, 3, 0, Math.PI * 2);
  ctx.fill();

  if (state.params.showVelocity) {
    const direction = state.parallelSpeed >= 0 ? 1 : -1;
    arrowLine(ctx, x, AXIS_Y, x + direction * ARROW_LENGTH, AXIS_Y, p.green, 4);
    text(
      ctx,
      'v∥',
      x + direction * (ARROW_LENGTH - 18),
      AXIS_Y - 18,
      p.green,
      15 * scale,
      'center',
      700
    );
    arrowLine(ctx, x, AXIS_Y, x, AXIS_Y + 72, p.cyan, 4);
    text(ctx, 'v⊥', x + 15, AXIS_Y + 48, p.cyan, 15 * scale, 'left', 700);
    arrowLine(ctx, x, AXIS_Y, x - direction * 54, AXIS_Y + 56, p.red, 4);
    text(
      ctx,
      'v',
      x - direction * 54,
      AXIS_Y + 72,
      p.red,
      15 * scale,
      'center',
      700
    );
  }
  if (state.params.showForce) {
    arrowLine(ctx, x, AXIS_Y, x - 58, AXIS_Y - 38, p.magenta, 4);
    text(ctx, 'F', x - 66, AXIS_Y - 46, p.magenta, 15 * scale, 'center', 700);
  }
}

function drawFieldRegion(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  scale: number
): void {
  ctx.fillStyle = p.soft;
  ctx.beginPath();
  ctx.roundRect(
    CENTER_X - WEAK_REGION_WIDTH / 2,
    FIELD_TOP - 20,
    WEAK_REGION_WIDTH,
    FIELD_BOTTOM - FIELD_TOP + 40,
    12
  );
  ctx.fill();
  text(
    ctx,
    '弱磁场',
    CENTER_X,
    FIELD_BOTTOM + 38,
    p.muted,
    14 * scale,
    'center',
    700
  );
  text(
    ctx,
    '左线圈',
    COIL_LEFT_X,
    FIELD_BOTTOM + 38,
    p.ink,
    14 * scale,
    'center',
    700
  );
  text(
    ctx,
    '右线圈',
    COIL_RIGHT_X,
    FIELD_BOTTOM + 38,
    p.ink,
    14 * scale,
    'center',
    700
  );
  text(
    ctx,
    '镜区',
    COIL_LEFT_X,
    FIELD_BOTTOM + 60,
    p.red,
    12 * scale,
    'center'
  );
  text(
    ctx,
    '镜区',
    COIL_RIGHT_X,
    FIELD_BOTTOM + 60,
    p.red,
    12 * scale,
    'center'
  );
}

export function createMagneticMirrorView(
  options: CreateMagneticMirrorViewOptions = {}
) {
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: { mode: 'clamped', fallbackWidth: FIELD_W, fallbackHeight: BASE_H },
    initialWidth: FIELD_W,
    initialHeight: BASE_H,
    eagerContext: true
  });
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  let snapshot: MagneticMirrorState | null = null;
  let redrawFrame: number | null = null;
  let watched = false;
  const observers: Array<{ disconnect(): void }> = [];

  function draw(state: MagneticMirrorState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const pose = magneticMirrorStageTransform(
      width,
      height,
      magneticMirrorStageLayoutFrom(stage.canvas)
    );
    const { fit, offsetX, offsetY } = pose;
    const scale = env.contentScale() * stage.responsiveScale;
    const p = PALETTE[env.theme];
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fit, fit);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, FIELD_W, BASE_H);
    drawFieldRegion(ctx, p, scale);
    drawFieldLines(ctx, state, p);
    drawCoil(ctx, COIL_LEFT_X, p, scale);
    drawCoil(ctx, COIL_RIGHT_X, p, scale);
    ctx.strokeStyle = p.muted;
    ctx.lineWidth = 2;
    ctx.setLineDash([LINE_DASH, LINE_DASH]);
    ctx.beginPath();
    ctx.moveTo(COIL_LEFT_X - FIELD_CURVE_INSET, AXIS_Y);
    ctx.lineTo(COIL_RIGHT_X + FIELD_CURVE_INSET, AXIS_Y);
    ctx.stroke();
    ctx.setLineDash([]);
    text(
      ctx,
      'x 轴',
      COIL_RIGHT_X + 66,
      AXIS_Y - 4,
      p.muted,
      12 * scale,
      'left'
    );
    drawParticle(ctx, state, p, scale);
    ctx.restore();
  }

  function scheduleRedraw(): void {
    if (!snapshot) return;
    if (typeof requestAnimationFrame !== 'function') {
      draw(snapshot);
      return;
    }
    if (redrawFrame !== null) return;
    redrawFrame = requestAnimationFrame(() => {
      redrawFrame = null;
      if (snapshot) draw(snapshot);
    });
  }

  function watchOverlay(): void {
    if (watched || !stage.canvas) return;
    const parent = stage.canvas.parentElement;
    if (!parent) return;
    watched = true;
    if (typeof ResizeObserver !== 'undefined') {
      const resize = new ResizeObserver(() => scheduleRedraw());
      resize.observe(parent);
      const panel = parent.querySelector(
        '.teaching-readout-panel, .srgb-readout-panel, .readout-panel'
      );
      if (panel instanceof HTMLElement) resize.observe(panel);
      observers.push(resize);
    }
    if (typeof MutationObserver !== 'undefined') {
      const mutate = new MutationObserver(() => scheduleRedraw());
      mutate.observe(parent, {
        attributes: true,
        subtree: true,
        attributeFilter: ['class', 'style']
      });
      observers.push(mutate);
    }
  }

  return {
    render(state: MagneticMirrorState): void {
      snapshot = state;
      stage.ensureSized();
      draw(state);
      watchOverlay();
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
      if (redrawFrame !== null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(redrawFrame);
        redrawFrame = null;
      }
      observers.forEach((observer) => observer.disconnect());
      observers.length = 0;
      stage.release();
    }
  };
}
