import {
  applyCanvasSize,
  getResponsiveScale,
  scaledSize
} from '../../core/canvas-sizing';
import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  apparatusLayout,
  BLOCK_BOARD_X_TITLE,
  BLOCK_BOARD_Y_TITLE,
  blockBoardConstants as C,
  graphFrame,
  graphSeries,
  graphToPx,
  stageLayoutFrom,
  stageTransform,
  type BlockBoardGraphPoint,
  type BlockBoardState,
  type GraphFrame
} from './scene.sim';

export type CreateBlockBoardViewOptions = {
  canvas?: HTMLCanvasElement;
  graphCanvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

type Palette = {
  bg: string;
  ink: string;
  muted: string;
  red: string;
  blue: string;
  teal: string;
  amber: string;
  ground: string;
  hatch: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    ink: '#303744',
    muted: '#8b97a5',
    red: '#ef4050',
    blue: '#4b83a5',
    teal: '#229c8e',
    amber: '#f3a51d',
    ground: '#303744',
    hatch: '#c5ccd4'
  },
  dark: {
    bg: '#101827',
    ink: '#eef2f7',
    muted: '#9eabbc',
    red: '#fb7185',
    blue: '#73b4dc',
    teal: '#4dd4c0',
    amber: '#fbbf24',
    ground: '#d5dee8',
    hatch: '#3c4b61'
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

function drawTrack(
  ctx: CanvasRenderingContext2D,
  state: BlockBoardState,
  p: Palette,
  font: (n: number) => number
): void {
  const layout = apparatusLayout(state);
  const groundY = C.trackY + C.boardHeight / 2;
  ctx.strokeStyle = p.hatch;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(layout.trackStart.x, groundY);
  ctx.lineTo(layout.trackEnd.x, groundY);
  ctx.stroke();
  ctx.strokeStyle = p.ground;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(layout.trackStart.x, groundY);
  ctx.lineTo(layout.trackEnd.x, groundY);
  ctx.stroke();
  ctx.strokeStyle = p.hatch;
  ctx.lineWidth = 1.4;
  for (
    let x = layout.trackStart.x;
    x <= layout.trackEnd.x + 0.5;
    x += C.hatchStep
  ) {
    ctx.beginPath();
    ctx.moveTo(x, groundY);
    ctx.lineTo(x - 6, groundY + 8);
    ctx.stroke();
  }
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 1.5;
  for (const tick of layout.ticks) {
    ctx.beginPath();
    ctx.moveTo(tick.x, groundY);
    ctx.lineTo(tick.x, groundY + C.groundTick);
    ctx.stroke();
    if (tick.meter % C.tickEveryM === 0) {
      text(
        ctx,
        `${tick.meter}`,
        tick.x,
        groundY + C.groundTick + 12,
        p.muted,
        font(12),
        'center'
      );
    }
  }
  text(
    ctx,
    'x',
    layout.trackEnd.x + 14,
    groundY + C.groundTick + 12,
    p.muted,
    font(13),
    'left'
  );

  ctx.fillStyle = p.blue;
  rounded(
    ctx,
    layout.board.x,
    layout.board.y,
    layout.board.w,
    layout.board.h,
    7
  );
  ctx.fill();
  ctx.fillStyle = p.red;
  rounded(
    ctx,
    layout.block.x,
    layout.block.y,
    layout.block.w,
    layout.block.h,
    7
  );
  ctx.fill();
  text(
    ctx,
    'M',
    layout.board.x + layout.board.w / 2,
    layout.board.y + layout.board.h / 2,
    '#ffffff',
    font(16),
    'center',
    700
  );
  text(
    ctx,
    'm',
    layout.block.x + layout.block.w / 2,
    layout.block.y + layout.block.h / 2,
    '#ffffff',
    font(16),
    'center',
    700
  );

  if (layout.blockArrow) {
    arrow(
      ctx,
      layout.blockArrow.x1,
      layout.blockArrow.y1,
      layout.blockArrow.x2,
      layout.blockArrow.y2,
      p.red,
      3.2
    );
    text(
      ctx,
      'v₁',
      layout.blockArrow.x2 + 12,
      layout.blockArrow.y2,
      p.red,
      font(14),
      'left',
      700
    );
  }
  if (layout.boardArrow) {
    arrow(
      ctx,
      layout.boardArrow.x1,
      layout.boardArrow.y1,
      layout.boardArrow.x2,
      layout.boardArrow.y2,
      p.teal,
      3.2
    );
    text(
      ctx,
      'v₂',
      layout.boardArrow.x2 + 12,
      layout.boardArrow.y2,
      p.teal,
      font(14),
      'left',
      700
    );
  }
  if (layout.frictionBlock) {
    arrow(
      ctx,
      layout.frictionBlock.x1,
      layout.frictionBlock.y1,
      layout.frictionBlock.x2,
      layout.frictionBlock.y2,
      p.amber,
      2.6
    );
    text(
      ctx,
      'f',
      layout.frictionBlock.x2 - 10,
      layout.frictionBlock.y2,
      p.amber,
      font(13),
      'right',
      700
    );
  }
  if (layout.frictionBoard) {
    arrow(
      ctx,
      layout.frictionBoard.x1,
      layout.frictionBoard.y1,
      layout.frictionBoard.x2,
      layout.frictionBoard.y2,
      p.amber,
      2.6
    );
    text(
      ctx,
      'f',
      layout.frictionBoard.x2 + 10,
      layout.frictionBoard.y2,
      p.amber,
      font(13),
      'left',
      700
    );
  }

  if (layout.syncVisible) {
    ctx.strokeStyle = p.teal;
    ctx.lineWidth = 2;
    ctx.setLineDash([C.syncDash, C.syncDash]);
    ctx.beginPath();
    ctx.moveTo(layout.syncX, C.trackY - C.labelLift * 3);
    ctx.lineTo(layout.syncX, groundY + 8);
    ctx.stroke();
    ctx.setLineDash([]);
    text(
      ctx,
      '共速',
      layout.syncX,
      groundY + C.groundTick + C.labelLift + 8,
      p.teal,
      font(13),
      'center',
      700
    );
  }
}

function drawGraphSeries(
  ctx: CanvasRenderingContext2D,
  points: BlockBoardGraphPoint[],
  frame: GraphFrame,
  color: string
): void {
  if (points.length < 2) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  points.forEach((item, index) => {
    const p = graphToPx(item.t, item.v, frame);
    if (index === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();
}

function drawGraphAxes(
  ctx: CanvasRenderingContext2D,
  frame: GraphFrame,
  width: number,
  height: number,
  p: Palette,
  font: (n: number) => number
): void {
  ctx.strokeStyle = p.hatch;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 3; i += 1) {
    const x = graphToPx(i, 0, frame).x;
    ctx.beginPath();
    ctx.moveTo(x, frame.top);
    ctx.lineTo(x, frame.bottom);
    ctx.stroke();
    text(
      ctx,
      `${i}`,
      x,
      Math.min(height - 8, frame.bottom + 14),
      p.muted,
      font(11),
      'center'
    );
  }
  for (let i = 0; i <= 3; i += 1) {
    const v = i * 4;
    const y = graphToPx(0, v, frame).y;
    ctx.beginPath();
    ctx.moveTo(frame.left, y);
    ctx.lineTo(frame.right, y);
    ctx.stroke();
    text(ctx, `${v.toFixed(0)}`, frame.left - 8, y, p.muted, font(11), 'right');
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
    BLOCK_BOARD_X_TITLE,
    Math.min(width - 4, frame.right),
    Math.min(height - 10, frame.bottom + 28),
    p.ink,
    font(12),
    'right',
    700
  );
  text(
    ctx,
    BLOCK_BOARD_Y_TITLE,
    frame.left,
    Math.max(10, frame.top - 12),
    p.ink,
    font(12),
    'left',
    700
  );
}

function drawGraphCanvas(
  ctx: CanvasRenderingContext2D,
  state: BlockBoardState,
  width: number,
  height: number,
  p: Palette,
  font: (n: number) => number
): void {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, width, height);
  const frame = graphFrame(width, height);
  drawGraphAxes(ctx, frame, width, height, p, font);
  const series = graphSeries(state.params);
  const block = series.find((item) => item.id === 'block');
  const board = series.find((item) => item.id === 'board');
  const tcDraw = Math.min(state.syncTime, C.graphViewTime);
  if (state.params.showArea && tcDraw > 1e-6 && block && board) {
    const a0 = graphToPx(0, state.params.initialVelocity, frame);
    const a1 = graphToPx(
      tcDraw,
      tcDraw < state.syncTime - 1e-9
        ? state.params.initialVelocity + state.blockAcceleration * tcDraw
        : state.commonVelocity,
      frame
    );
    const b1 = graphToPx(
      tcDraw,
      tcDraw < state.syncTime - 1e-9
        ? state.boardAcceleration * tcDraw
        : state.commonVelocity,
      frame
    );
    const b0 = graphToPx(0, 0, frame);
    ctx.fillStyle = 'rgba(243,165,29,0.24)';
    ctx.beginPath();
    ctx.moveTo(a0.x, a0.y);
    ctx.lineTo(a1.x, a1.y);
    ctx.lineTo(b1.x, b1.y);
    ctx.lineTo(b0.x, b0.y);
    ctx.closePath();
    ctx.fill();
    if (state.syncTime <= C.graphViewTime + 1e-9) {
      text(
        ctx,
        'Δx',
        (a0.x + a1.x) / 2,
        (a0.y + b0.y) / 2,
        p.amber,
        font(13),
        'center',
        700
      );
    }
  }
  if (block) drawGraphSeries(ctx, block.points, frame, p.red);
  if (board) drawGraphSeries(ctx, board.points, frame, p.blue);
  const legendY = graphToPx(C.graphViewTime, state.commonVelocity, frame).y;
  text(ctx, 'm', frame.right - 8, legendY - 14, p.red, font(12), 'right', 700);
  text(ctx, 'M', frame.right - 8, legendY + 14, p.blue, font(12), 'right', 700);
  if (state.syncTime > 0) {
    const sync = graphToPx(Math.min(state.syncTime, C.graphViewTime), 0, frame);
    ctx.strokeStyle = p.teal;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([C.syncDash, C.syncDash]);
    ctx.beginPath();
    ctx.moveTo(sync.x, frame.top);
    ctx.lineTo(sync.x, frame.bottom);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  const cursor = graphToPx(Math.min(state.time, C.graphViewTime), 0, frame);
  ctx.strokeStyle = p.amber;
  ctx.lineWidth = 1.6;
  ctx.setLineDash([C.syncDash, C.syncDash]);
  ctx.beginPath();
  ctx.moveTo(cursor.x, frame.top);
  ctx.lineTo(cursor.x, frame.bottom);
  ctx.stroke();
  ctx.setLineDash([]);
}

export function createBlockBoardView(
  options: CreateBlockBoardViewOptions = {}
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
  let snapshot: BlockBoardState | null = null;
  let parentObserved = false;
  let panelObserved = false;
  let drawing = false;
  const overlayObservers: Array<{ disconnect(): void }> = [];

  function paint(state: BlockBoardState): void {
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

  function draw(state: BlockBoardState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const layout = stageLayoutFrom(stage.canvas);
    const { fit, offsetX, offsetY, scaleX } = stageTransform(
      width,
      height,
      layout
    );
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
    ctx.scale(fit * scaleX, fit);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, C.baseWidth, C.baseHeight);
    drawTrack(ctx, state, p, font);
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
    render(state: BlockBoardState): void {
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
