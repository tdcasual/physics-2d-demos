import {
  applyCanvasSize,
  getResponsiveScale,
  scaledSize
} from '../../core/canvas-sizing';
import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  ACCEL_FORCE_X_TITLE_FORCE,
  ACCEL_FORCE_X_TITLE_MASS,
  ACCEL_FORCE_Y_TITLE,
  accelForceConstants as C,
  apparatusLayout,
  graphFrame,
  graphToPx,
  hangerDiscCount,
  stageLayoutFrom,
  stageTransform,
  tapeDotPositions,
  type AccelForceRecord,
  type AccelForceState,
  type ApparatusLayout
} from './scene.sim';

export type CreateAccelForceViewOptions = {
  canvas?: HTMLCanvasElement;
  graphCanvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

type Palette = {
  bg: string;
  grid: string;
  ink: string;
  muted: string;
  red: string;
  blue: string;
  teal: string;
  gold: string;
  wood: string;
  woodDark: string;
  cart: string;
  glass: string;
  tape: string;
  ticker: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    grid: '#e4dfd4',
    ink: '#303744',
    muted: '#8b97a5',
    red: '#ef4050',
    blue: '#3278bc',
    teal: '#2a9d8f',
    gold: '#d4a017',
    wood: '#c4a484',
    woodDark: '#8d7b6a',
    cart: '#3d7cc0',
    glass: '#eef4fb',
    tape: '#efe6c9',
    ticker: '#2b313c'
  },
  dark: {
    bg: '#101827',
    grid: '#435169',
    ink: '#eef2f7',
    muted: '#9eabbc',
    red: '#fb7185',
    blue: '#60a5fa',
    teal: '#34d399',
    gold: '#fbbf24',
    wood: '#8d6e54',
    woodDark: '#c4a484',
    cart: '#60a5fa',
    glass: '#1f3148',
    tape: '#3f3420',
    ticker: '#d5dee8'
  }
};

function contentBoxSize(host: HTMLElement): { width: number; height: number } {
  const cs = getComputedStyle(host);
  const rect = host.getBoundingClientRect();
  const padX =
    (Number.parseFloat(cs.paddingLeft) || 0) +
    (Number.parseFloat(cs.paddingRight) || 0);
  const padY =
    (Number.parseFloat(cs.paddingTop) || 0) +
    (Number.parseFloat(cs.paddingBottom) || 0);
  return {
    width: Math.max(1, Math.floor(rect.width - padX)),
    height: Math.max(1, Math.floor(rect.height - padY))
  };
}

/** Size the graph canvas to the host content box, not the padded border box. */
export function sizeGraphCanvasToHost(canvas: HTMLCanvasElement): {
  ctx: CanvasRenderingContext2D;
  cssWidth: number;
  cssHeight: number;
  responsiveScale: number;
} {
  const host = canvas.parentElement;
  let cssWidth: number;
  let cssHeight: number;
  if (host) {
    const box = contentBoxSize(host);
    cssWidth = box.width;
    cssHeight = box.height;
  } else {
    const rect = canvas.getBoundingClientRect();
    cssWidth = Math.max(1, Math.floor(rect.width || C.graphFallbackWidth));
    cssHeight = Math.max(1, Math.floor(rect.height || C.graphFallbackHeight));
  }
  const dpr = Math.min(
    2,
    typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1
  );
  const responsiveScale = getResponsiveScale(cssWidth, cssHeight);
  const ctx = applyCanvasSize(canvas, {
    width: Math.max(1, Math.floor(cssWidth * dpr)),
    height: Math.max(1, Math.floor(cssHeight * dpr)),
    cssWidth,
    cssHeight,
    dpr,
    responsiveScale
  });
  return { ctx, cssWidth, cssHeight, responsiveScale };
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

function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.rect(x, y, w, h);
}

function arrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width: number,
  head = 11
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
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, C.baseWidth, C.baseHeight);
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

function drawTable(
  ctx: CanvasRenderingContext2D,
  layout: ApparatusLayout,
  p: Palette
): void {
  const y = Math.max(layout.trackStart.y, layout.trackEnd.y);
  ctx.fillStyle = p.wood;
  ctx.fillRect(
    layout.trackStart.x - 18,
    y,
    layout.trackEnd.x - layout.trackStart.x + 28,
    C.tableThickness
  );
  ctx.strokeStyle = p.woodDark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(layout.trackStart.x - 8, y + C.tableThickness);
  ctx.lineTo(layout.trackStart.x - 8, y + C.tableThickness + C.tableLeg);
  ctx.moveTo(layout.trackEnd.x - 10, y + C.tableThickness);
  ctx.lineTo(layout.trackEnd.x - 10, y + C.tableThickness + C.tableLeg);
  ctx.stroke();
}

function drawTrack(
  ctx: CanvasRenderingContext2D,
  layout: ApparatusLayout,
  balanced: boolean,
  p: Palette,
  font: (n: number) => number
): void {
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(layout.trackStart.x, layout.trackStart.y);
  ctx.lineTo(layout.trackEnd.x, layout.trackEnd.y);
  ctx.stroke();
  if (balanced) {
    ctx.fillStyle = p.woodDark;
    ctx.beginPath();
    ctx.moveTo(layout.pad.x - 16, layout.pad.y + 8);
    ctx.lineTo(layout.pad.x, layout.trackStart.y + 2);
    ctx.lineTo(layout.pad.x + 16, layout.pad.y + 8);
    ctx.closePath();
    ctx.fill();
    text(
      ctx,
      '垫高',
      layout.pad.x,
      layout.pad.y + 20,
      p.muted,
      font(12),
      'center'
    );
  }
}

function drawTicker(
  ctx: CanvasRenderingContext2D,
  layout: ApparatusLayout,
  p: Palette,
  font: (n: number) => number
): void {
  const x = layout.ticker.x;
  const y = layout.ticker.y;
  ctx.fillStyle = p.ticker;
  rounded(
    ctx,
    x - C.tickerWidth / 2,
    y - C.tickerHeight / 2,
    C.tickerWidth,
    C.tickerHeight,
    4
  );
  ctx.fill();
  ctx.fillStyle = p.red;
  ctx.beginPath();
  ctx.arc(x + 8, y - 2, 4, 0, Math.PI * 2);
  ctx.fill();
  text(
    ctx,
    '打点计时器',
    x - C.tickerWidth / 2,
    y - C.tickerHeight / 2 - 10,
    p.muted,
    font(12),
    'left'
  );
}

function drawTape(
  ctx: CanvasRenderingContext2D,
  state: AccelForceState,
  layout: ApparatusLayout,
  p: Palette
): void {
  ctx.strokeStyle = p.tape;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(layout.tapeFrom.x, layout.tapeFrom.y);
  ctx.lineTo(layout.tapeTo.x, layout.tapeTo.y);
  ctx.stroke();
  const dots = tapeDotPositions(state, layout);
  ctx.fillStyle = p.red;
  dots.forEach((dot, index) => {
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, index % C.countEvery === 0 ? 3.2 : 2, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawCart(
  ctx: CanvasRenderingContext2D,
  layout: ApparatusLayout,
  p: Palette,
  font: (n: number) => number
): void {
  const x = layout.cart.x;
  const y = layout.cart.y;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.atan2(layout.uy, layout.ux));
  ctx.fillStyle = p.cart;
  rounded(
    ctx,
    -C.cartWidth / 2,
    -C.cartHeight / 2,
    C.cartWidth,
    C.cartHeight,
    6
  );
  ctx.fill();
  ctx.fillStyle = p.glass;
  rounded(ctx, -16, -C.cartHeight / 2 + 5, 32, 11, 4);
  ctx.fill();
  ctx.fillStyle = p.ink;
  ctx.beginPath();
  ctx.arc(-18, C.cartHeight / 2 - 2, C.wheelRadius, 0, Math.PI * 2);
  ctx.arc(18, C.cartHeight / 2 - 2, C.wheelRadius, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, 'M', 0, -1, p.glass, font(13), 'center', 700);
  ctx.restore();
}

function drawPulleyAndHanger(
  ctx: CanvasRenderingContext2D,
  state: AccelForceState,
  layout: ApparatusLayout,
  p: Palette,
  font: (n: number) => number
): void {
  const pulley = layout.pulley;
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(
    layout.cart.x + layout.ux * (C.cartWidth / 2),
    layout.cart.y + layout.uy * (C.cartWidth / 2) + layout.upY * 4
  );
  ctx.lineTo(pulley.x, pulley.y);
  const hangerTop =
    layout.hanger.y -
    hangerDiscCount(state.params.hangerMass) * (C.hangerDiscHeight / 2);
  ctx.lineTo(layout.hanger.x, hangerTop);
  ctx.stroke();

  ctx.fillStyle = p.muted;
  ctx.beginPath();
  ctx.arc(pulley.x, pulley.y, C.pulleyRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(pulley.x, pulley.y, C.pulleyRadius - 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = p.ink;
  ctx.beginPath();
  ctx.arc(pulley.x, pulley.y, 3, 0, Math.PI * 2);
  ctx.fill();
  text(
    ctx,
    '定滑轮',
    pulley.x + 18,
    pulley.y - C.pulleyRadius - 8,
    p.muted,
    font(12),
    'left'
  );

  const discs = hangerDiscCount(state.params.hangerMass);
  const top = layout.hanger.y - (discs * C.hangerDiscHeight) / 2;
  for (let i = 0; i < discs; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? p.gold : p.wood;
    rounded(
      ctx,
      layout.hanger.x - C.hangerDiscWidth / 2,
      top + i * C.hangerDiscHeight,
      C.hangerDiscWidth,
      C.hangerDiscHeight - 1,
      3
    );
    ctx.fill();
  }
  if (discs > 0) {
    text(
      ctx,
      '槽码',
      layout.hanger.x + C.hangerDiscWidth / 2 + 10,
      layout.hanger.y,
      p.red,
      font(12),
      'left'
    );
    text(ctx, 'm', layout.hanger.x, top - 10, p.ink, font(12), 'center', 700);
  }
}

function drawForces(
  ctx: CanvasRenderingContext2D,
  layout: ApparatusLayout,
  p: Palette,
  font: (n: number) => number
): void {
  if (layout.forceArrow) {
    arrow(
      ctx,
      layout.forceArrow.x1,
      layout.forceArrow.y1,
      layout.forceArrow.x2,
      layout.forceArrow.y2,
      p.blue,
      4
    );
    text(
      ctx,
      'F',
      layout.forceArrow.x2 + 12,
      layout.forceArrow.y2 - 2,
      p.blue,
      font(15),
      'left',
      700
    );
  }
  if (layout.frictionArrow) {
    arrow(
      ctx,
      layout.frictionArrow.x1,
      layout.frictionArrow.y1,
      layout.frictionArrow.x2,
      layout.frictionArrow.y2,
      p.red,
      4
    );
    text(
      ctx,
      'f',
      layout.frictionArrow.x2 - 12,
      layout.frictionArrow.y2 - 2,
      p.red,
      font(15),
      'right',
      700
    );
  }
}

function drawApparatus(
  ctx: CanvasRenderingContext2D,
  state: AccelForceState,
  p: Palette,
  font: (n: number) => number
): void {
  const layout = apparatusLayout(state);
  drawGrid(ctx, p);
  drawTable(ctx, layout, p);
  drawTrack(ctx, layout, state.params.balanced, p, font);
  drawTicker(ctx, layout, p, font);
  drawTape(ctx, state, layout, p);
  drawCart(ctx, layout, p, font);
  drawPulleyAndHanger(ctx, state, layout, p, font);
  drawForces(ctx, layout, p, font);
}

function drawGraphAxes(
  ctx: CanvasRenderingContext2D,
  state: AccelForceState,
  frame: ReturnType<typeof graphFrame>,
  width: number,
  height: number,
  p: Palette,
  font: (n: number) => number
): void {
  const xTitle =
    state.params.mode === 'force'
      ? ACCEL_FORCE_X_TITLE_FORCE
      : ACCEL_FORCE_X_TITLE_MASS;
  const xMax =
    state.params.mode === 'force' ? C.graphMaxForce : C.graphMaxInvMass;
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const x = frame.left + ((frame.right - frame.left) * i) / 4;
    const y = frame.bottom - ((frame.bottom - frame.top) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(x, frame.top);
    ctx.lineTo(x, frame.bottom);
    ctx.moveTo(frame.left, y);
    ctx.lineTo(frame.right, y);
    ctx.stroke();
    text(
      ctx,
      ((xMax * i) / 4).toFixed(1),
      x,
      Math.min(height - 8, frame.bottom + 14),
      p.muted,
      font(11),
      'center'
    );
    text(
      ctx,
      ((C.graphMaxAccel * i) / 4).toFixed(1),
      frame.left - 8,
      y,
      p.muted,
      font(11),
      'right'
    );
  }
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(frame.left, frame.bottom);
  ctx.lineTo(frame.right, frame.bottom);
  ctx.moveTo(frame.left, frame.bottom);
  ctx.lineTo(frame.left, frame.top);
  ctx.stroke();
  arrow(
    ctx,
    frame.left,
    frame.bottom,
    frame.right + 6,
    frame.bottom,
    p.ink,
    1.6,
    8
  );
  arrow(
    ctx,
    frame.left,
    frame.bottom,
    frame.left,
    frame.top - 6,
    p.ink,
    1.6,
    8
  );
  text(
    ctx,
    xTitle,
    Math.min(width - 4, frame.right),
    Math.min(height - 10, frame.bottom + 28),
    p.ink,
    font(12),
    'right',
    700
  );
  text(
    ctx,
    ACCEL_FORCE_Y_TITLE,
    frame.left,
    Math.max(10, frame.top - 12),
    p.ink,
    font(12),
    'left',
    700
  );
}

function drawGraphSeries(
  ctx: CanvasRenderingContext2D,
  points: AccelForceRecord[],
  mode: AccelForceState['params']['mode'],
  frame: ReturnType<typeof graphFrame>,
  color: string,
  style: 'line' | 'dots'
): void {
  const filtered = points.filter((item) => item.mode === mode);
  if (filtered.length === 0) return;
  if (style === 'line') {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    filtered.forEach((item, index) => {
      const p = graphToPx(item.x, item.y, mode, frame);
      if (index === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    return;
  }
  ctx.fillStyle = color;
  filtered.forEach((item) => {
    const p = graphToPx(item.x, item.y, mode, frame);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawGraphCanvas(
  ctx: CanvasRenderingContext2D,
  state: AccelForceState,
  width: number,
  height: number,
  p: Palette,
  font: (n: number) => number
): void {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, width, height);
  const frame = graphFrame(width, height);
  drawGraphAxes(ctx, state, frame, width, height, p, font);
  drawGraphSeries(ctx, state.curve, state.params.mode, frame, p.teal, 'line');
  drawGraphSeries(ctx, state.records, state.params.mode, frame, p.blue, 'dots');
  const current = graphToPx(
    state.params.mode === 'force' ? state.force : state.inverseMass,
    state.acceleration,
    state.params.mode,
    frame
  );
  ctx.strokeStyle = p.gold;
  ctx.fillStyle = p.gold;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(current.x, current.y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

export function createAccelForceView(
  options: CreateAccelForceViewOptions = {}
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
  const graph = {
    canvas: (options.graphCanvas ?? null) as HTMLCanvasElement | null,
    ctx: null as CanvasRenderingContext2D | null,
    cssWidth: C.graphFallbackWidth as number,
    cssHeight: C.graphFallbackHeight as number,
    responsiveScale: 1,
    resize(): void {
      if (!graph.canvas) return;
      const sized = sizeGraphCanvasToHost(graph.canvas);
      graph.ctx = sized.ctx;
      graph.cssWidth = sized.cssWidth;
      graph.cssHeight = sized.cssHeight;
      graph.responsiveScale = sized.responsiveScale;
    },
    attach(canvas: HTMLCanvasElement): void {
      graph.canvas = canvas;
      graph.resize();
    },
    release(): void {
      graph.canvas = null;
      graph.ctx = null;
    }
  };
  if (graph.canvas) graph.resize();
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  let snapshot: AccelForceState | null = null;
  let parentObserved = false;
  let panelObserved = false;
  let drawing = false;
  const overlayObservers: Array<{ disconnect(): void }> = [];

  function paint(state: AccelForceState): void {
    if (drawing) return;
    drawing = true;
    try {
      draw(state);
    } finally {
      drawing = false;
    }
  }

  function redraw(): void {
    if (snapshot) paint(snapshot);
  }

  function watchOverlay(): void {
    if (!stage.canvas) return;
    const parent = stage.canvas.parentElement;
    if (!parent) return;
    if (!parentObserved && typeof ResizeObserver !== 'undefined') {
      parentObserved = true;
      const resize = new ResizeObserver(() => redraw());
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
      const resize = new ResizeObserver(() => redraw());
      resize.observe(panel);
      overlayObservers.push(resize);
    }
    if (typeof MutationObserver !== 'undefined') {
      const mutate = new MutationObserver(() => redraw());
      mutate.observe(panel, {
        attributes: true,
        attributeFilter: ['class', 'style']
      });
      overlayObservers.push(mutate);
    }
  }

  function draw(state: AccelForceState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const layout = stageLayoutFrom(stage.canvas);
    const { fit, offsetX, offsetY } = stageTransform(width, height, layout);
    const p = PALETTE[env.theme];
    const rs = stage.responsiveScale;
    const typeScale = env.fontScale() * Math.min(env.contentScale(), 1.25);
    const font = (base: number): number =>
      scaledSize(base * typeScale, Math.max(rs, 0.3), 11) / Math.max(fit, 0.05);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fit, fit);
    drawApparatus(ctx, state, p, font);
    ctx.restore();

    if (graph.canvas) {
      if (!graph.ctx) graph.resize();
      const gctx = graph.ctx;
      if (gctx) {
        const gFont = (base: number): number =>
          scaledSize(
            base * typeScale,
            Math.max(graph.responsiveScale, 0.3),
            10
          );
        drawGraphCanvas(gctx, state, graph.cssWidth, graph.cssHeight, p, gFont);
      }
    }
    watchOverlay();
  }

  return {
    render(state: AccelForceState): void {
      snapshot = state;
      stage.ensureSized();
      paint(state);
    },
    resize(): void {
      stage.resize();
      if (graph.canvas) graph.resize();
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
    attachGraphCanvas(canvas: HTMLCanvasElement): void {
      graph.attach(canvas);
      if (snapshot) paint(snapshot);
    },
    dispose(): void {
      snapshot = null;
      overlayObservers.forEach((observer) => observer.disconnect());
      overlayObservers.length = 0;
      stage.release();
      graph.release();
    }
  };
}
