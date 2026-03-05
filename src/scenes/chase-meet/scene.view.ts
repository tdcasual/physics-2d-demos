import type { ChaseMeetSample, ChaseMeetSnapshot } from './scene.sim';
import type { TeachingMode } from '../../app/teaching-standards';
import { getTeachingStandards } from '../../app/teaching-standards';
import type { TeachingTheme } from '../../app/teaching-demo-shell';
import { getResponsiveViewport, resolveResponsiveStageWidth } from '../../app/responsive-stage';
import { applyTouchInteractionMode } from '../../app/touch-interaction';
import { applyHiDpiCanvasMetrics, computeHiDpiCanvasMetrics } from '../../core/high-dpi-canvas';

export type CreateChaseMeetViewOptions = {
  canvas?: HTMLCanvasElement;
  stageSlot?: HTMLElement;
  mode?: TeachingMode;
  theme?: TeachingTheme;
};

type StageDom = {
  root: HTMLElement;
  motionCanvas: HTMLCanvasElement;
  xCanvas: HTMLCanvasElement;
  vCanvas: HTMLCanvasElement;
  motionCtx: CanvasRenderingContext2D;
  xCtx: CanvasRenderingContext2D;
  vCtx: CanvasRenderingContext2D;
  dpr: number;
};

type Visuals = ReturnType<typeof getTeachingStandards>['rightStage'] & {
  scale: number;
};

const MODE_SCALE: Record<TeachingMode, number> = {
  normal: 1.45,
  presentation: 2.6
};

function resolveVisuals(mode: TeachingMode): Visuals {
  return {
    ...getTeachingStandards(mode).rightStage,
    scale: MODE_SCALE[mode]
  };
}

function nearestSample(samples: ChaseMeetSample[], t: number): ChaseMeetSample {
  let best = samples[0];
  let bestDistance = Math.abs(samples[0].t - t);
  for (let i = 1; i < samples.length; i += 1) {
    const distance = Math.abs(samples[i].t - t);
    if (distance < bestDistance) {
      best = samples[i];
      bestDistance = distance;
    }
  }
  return best;
}

function resizeCanvasWithDpr(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  cssWidth: number,
  cssHeight: number,
  dpr: number
): void {
  const pixelWidth = Math.max(1, Math.floor(cssWidth * dpr));
  const pixelHeight = Math.max(1, Math.floor(cssHeight * dpr));
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);
}

function createStageDom(slot: HTMLElement): StageDom {
  const root = document.createElement('div');
  root.className = 'chase-modern-stage';
  root.innerHTML = `
    <section class="chase-modern-card chase-modern-card--motion">
      <div class="chase-modern-card-header">
        <div class="chase-modern-card-title">空间位置动画</div>
        <div class="chase-modern-card-tag">A / B 一维追及</div>
      </div>
      <canvas class="chase-modern-motion-canvas"></canvas>
    </section>
    <section class="chase-modern-card chase-modern-card--graphs">
      <div class="chase-modern-card-header">
        <div class="chase-modern-card-title">x–t 与 v–t 图像</div>
      </div>
      <div class="chase-modern-plots">
        <div class="chase-modern-plot">
          <div class="chase-modern-plot-title">位置–时间 图 x(t)</div>
          <canvas class="chase-modern-x-canvas"></canvas>
        </div>
        <div class="chase-modern-plot">
          <div class="chase-modern-plot-title">速度–时间 图 v(t)</div>
          <canvas class="chase-modern-v-canvas"></canvas>
        </div>
      </div>
    </section>
  `;

  const motionCanvas = root.querySelector('.chase-modern-motion-canvas');
  const xCanvas = root.querySelector('.chase-modern-x-canvas');
  const vCanvas = root.querySelector('.chase-modern-v-canvas');
  if (
    !(motionCanvas instanceof HTMLCanvasElement) ||
    !(xCanvas instanceof HTMLCanvasElement) ||
    !(vCanvas instanceof HTMLCanvasElement)
  ) {
    throw new Error('Failed to create chase stage canvases');
  }
  const motionCtx = motionCanvas.getContext('2d');
  const xCtx = xCanvas.getContext('2d');
  const vCtx = vCanvas.getContext('2d');
  if (!motionCtx || !xCtx || !vCtx) {
    throw new Error('Failed to create chase stage contexts');
  }

  applyTouchInteractionMode(motionCanvas, 'default');
  applyTouchInteractionMode(xCanvas, 'default');
  applyTouchInteractionMode(vCanvas, 'default');

  slot.innerHTML = '';
  slot.appendChild(root);

  return {
    root,
    motionCanvas,
    xCanvas,
    vCanvas,
    motionCtx,
    xCtx,
    vCtx,
    dpr: 1
  };
}

export function createChaseMeetView(options: CreateChaseMeetViewOptions = {}) {
  let canvas = options.canvas ?? null;
  let ctx = canvas?.getContext('2d') ?? null;
  let stageSlot = options.stageSlot ?? null;
  let stageDom: StageDom | null = null;
  let mode: TeachingMode = options.mode ?? 'normal';
  let theme: TeachingTheme = options.theme ?? 'dark';
  let snapshot: ChaseMeetSnapshot | null = null;
  let surface = computeHiDpiCanvasMetrics({
    cssWidth: 1280,
    cssHeight: 720,
    devicePixelRatio: 1
  });

  function ensureStageDom(): StageDom | null {
    if (!stageSlot) return null;
    if (!stageDom) {
      stageDom = createStageDom(stageSlot);
    }
    return stageDom;
  }

  function resizeFallbackCanvas(): void {
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const cssWidth = Math.max(480, Math.floor(rect.width || 1280));
    const cssHeight = Math.max(280, Math.floor(rect.height || 720));
    const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
    surface = computeHiDpiCanvasMetrics({
      cssWidth,
      cssHeight,
      devicePixelRatio: dpr
    });
    applyHiDpiCanvasMetrics(canvas, ctx, surface);
  }

  function initStageSize(): void {
    const dom = ensureStageDom();
    if (!dom) {
      resizeFallbackCanvas();
      return;
    }

    const isPresentation = mode === 'presentation';
    const viewport = getResponsiveViewport(960);
    const totalWidth = resolveResponsiveStageWidth(dom.root, {
      minWidthPx: 320,
      horizontalPaddingPx: 16,
      narrowBreakpointPx: 960
    });
    dom.root.classList.toggle('is-narrow', viewport.isNarrow);

    const stageHeight = Math.max(1, Math.floor(dom.root.getBoundingClientRect().height || viewport.height));
    const trackHeight = Math.min(
      isPresentation ? 460 : 380,
      Math.max(isPresentation ? 220 : 170, stageHeight * (viewport.isNarrow ? 0.34 : 0.42))
    );
    const graphHeight = Math.min(
      isPresentation ? 320 : 250,
      Math.max(isPresentation ? 180 : 150, stageHeight * (viewport.isNarrow ? 0.22 : 0.34))
    );
    const graphWidth = viewport.isNarrow ? totalWidth : Math.max(180, totalWidth / 2 - 8);

    const dpr = Math.min(2, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1);
    dom.dpr = dpr;
    resizeCanvasWithDpr(dom.motionCanvas, dom.motionCtx, totalWidth, trackHeight, dpr);
    resizeCanvasWithDpr(dom.xCanvas, dom.xCtx, graphWidth, graphHeight, dpr);
    resizeCanvasWithDpr(dom.vCanvas, dom.vCtx, graphWidth, graphHeight, dpr);
  }

  function drawMotion(next: ChaseMeetSnapshot, dom: StageDom): void {
    const visuals = resolveVisuals(mode);
    const visualScale = visuals.scale;
    const majorStroke = Math.max(visuals.majorStrokePx, 2 * visualScale);
    const minorStroke = Math.max(visuals.minorStrokePx, 1.5 * visualScale);
    const motionCtx = dom.motionCtx;
    const cssW = dom.motionCanvas.width / dom.dpr;
    const cssH = dom.motionCanvas.height / dom.dpr;

    motionCtx.clearRect(0, 0, cssW, cssH);

    const isLight = theme === 'light';
    const grad = motionCtx.createLinearGradient(0, 0, cssW, cssH);
    if (isLight) {
      grad.addColorStop(0, '#e5f0ff');
      grad.addColorStop(1, '#d1d5db');
    } else {
      grad.addColorStop(0, '#020617');
      grad.addColorStop(1, '#020617');
    }
    motionCtx.fillStyle = grad;
    motionCtx.fillRect(0, 0, cssW, cssH);

    const mid = cssH * 0.55;
    motionCtx.strokeStyle = isLight ? 'rgba(15,23,42,0.35)' : 'rgba(255,255,255,0.22)';
    motionCtx.lineWidth = Math.max(majorStroke, visuals.majorStrokePx * 1.15);
    motionCtx.beginPath();
    motionCtx.moveTo(20, mid);
    motionCtx.lineTo(cssW - 20, mid);
    motionCtx.stroke();

    motionCtx.font = `${Math.max(visuals.secondaryFontPx, Math.round(12 * visualScale))}px system-ui`;
    motionCtx.fillStyle = isLight ? 'rgba(30,41,59,0.8)' : 'rgba(226,232,240,0.8)';
    motionCtx.textAlign = 'center';
    const steps = 8;
    for (let i = 0; i <= steps; i += 1) {
      const ratio = i / steps;
      const x = 20 + (cssW - 40) * ratio;
      const worldX = next.bounds.minX + ratio * (next.bounds.maxX - next.bounds.minX);
      motionCtx.beginPath();
      motionCtx.moveTo(x, mid - 6 * visualScale);
      motionCtx.lineTo(x, mid + 6 * visualScale);
      motionCtx.stroke();
      motionCtx.fillText(worldX.toFixed(1), x, mid + 20 * visualScale);
    }

    const current = nearestSample(next.samples, next.state.t);
    const padding = 40;
    const usable = cssW - 2 * padding;
    const screenXA = padding + ((current.xA - next.bounds.minX) / (next.bounds.maxX - next.bounds.minX)) * usable;
    const screenXB = padding + ((current.xB - next.bounds.minX) / (next.bounds.maxX - next.bounds.minX)) * usable;

    const drawObject = (x: number, color: string, label: string): void => {
      const r = Math.max(16 * visualScale, visuals.markerRadiusPx * 2.6);
      const glowColor = color.replace('1)', '0.23)');
      motionCtx.beginPath();
      motionCtx.fillStyle = glowColor;
      motionCtx.arc(x, mid, r * 1.9, 0, Math.PI * 2);
      motionCtx.fill();

      motionCtx.beginPath();
      motionCtx.fillStyle = color;
      motionCtx.arc(x, mid, r, 0, Math.PI * 2);
      motionCtx.fill();

      motionCtx.lineWidth = Math.max(majorStroke, visuals.majorStrokePx * 1.15);
      motionCtx.strokeStyle = isLight ? 'rgba(15,23,42,0.9)' : 'rgba(248,250,252,0.95)';
      motionCtx.stroke();

      motionCtx.fillStyle = isLight ? '#111827' : '#f9fafb';
      motionCtx.font = `bold ${Math.max(visuals.primaryFontPx, Math.round(15 * visualScale))}px system-ui`;
      motionCtx.textAlign = 'center';
      motionCtx.fillText(label, x, mid - 22 * visualScale);
    };

    drawObject(screenXA, 'rgba(96,165,250,1)', 'A');
    drawObject(screenXB, 'rgba(248,113,113,1)', 'B');

    motionCtx.setLineDash([6 * visualScale, 4 * visualScale]);
    motionCtx.strokeStyle = isLight ? 'rgba(30,64,175,0.7)' : 'rgba(148,163,184,0.7)';
    motionCtx.lineWidth = Math.max(minorStroke, visuals.minorStrokePx * 1.1);
    motionCtx.beginPath();
    motionCtx.moveTo(screenXA, mid);
    motionCtx.lineTo(screenXB, mid);
    motionCtx.stroke();
    motionCtx.setLineDash([]);

    motionCtx.fillStyle = isLight ? '#111827' : '#f9fafb';
    motionCtx.font = `${Math.max(visuals.secondaryFontPx, Math.round(13 * visualScale))}px system-ui`;
    motionCtx.textAlign = 'center';
    motionCtx.fillText(
      `距离 = ${Math.abs(current.xB - current.xA).toFixed(2)} m`,
      (screenXA + screenXB) / 2,
      mid - 34 * visualScale
    );
  }

  function drawGraphs(next: ChaseMeetSnapshot, dom: StageDom): void {
    const visuals = resolveVisuals(mode);
    const visualScale = visuals.scale;
    const xCtx = dom.xCtx;
    const vCtx = dom.vCtx;
    const xW = dom.xCanvas.width / dom.dpr;
    const xH = dom.xCanvas.height / dom.dpr;
    const vW = dom.vCanvas.width / dom.dpr;
    const vH = dom.vCanvas.height / dom.dpr;

    xCtx.clearRect(0, 0, xW, xH);
    vCtx.clearRect(0, 0, vW, vH);

    const paddingLeft = 40 * visualScale;
    const paddingBottom = 30 * visualScale;
    const paddingTop = 10 * visualScale;
    const paddingRight = 10 * visualScale;

    const drawAxis = (target: CanvasRenderingContext2D, w: number, h: number, yLabel: string): void => {
      target.save();
      target.strokeStyle = 'rgba(148,163,184,0.8)';
      target.lineWidth = Math.max(visuals.minorStrokePx * 1.15, 1.4 * visualScale);
      target.beginPath();
      target.moveTo(paddingLeft, paddingTop);
      target.lineTo(paddingLeft, h - paddingBottom);
      target.lineTo(w - paddingRight, h - paddingBottom);
      target.stroke();

      target.font = `${Math.max(visuals.secondaryFontPx, Math.round(12 * visualScale))}px system-ui`;
      target.fillStyle = 'rgba(148,163,184,0.9)';
      target.textAlign = 'left';
      target.fillText(yLabel, 6, paddingTop + 12 * visualScale);
      target.textAlign = 'right';
      target.fillText('t / s', w - 6, h - 6);
      target.restore();
    };

    drawAxis(xCtx, xW, xH, 'x / m');
    drawAxis(vCtx, vW, vH, 'v / (m·s⁻¹)');

    const minT = 0;
    const maxT = next.params.totalTime;
    const tRange = maxT - minT || 1;

    const minX = next.bounds.minX;
    const maxX = next.bounds.maxX;
    const xRange = maxX - minX || 1;

    let maxV = next.bounds.maxSpeed || 1;
    maxV *= 1.1;
    const minV = -maxV;
    const vRange = maxV - minV || 1;
    const currentTime = next.state.t;

    const tToXpix = (tVal: number, w: number): number =>
      paddingLeft + ((tVal - minT) / tRange) * (w - paddingLeft - paddingRight);
    const worldXToYpix = (xVal: number, h: number): number =>
      paddingTop + ((maxX - xVal) / xRange) * (h - paddingTop - paddingBottom);
    const vToYpix = (vVal: number, h: number): number =>
      paddingTop + ((maxV - vVal) / vRange) * (h - paddingTop - paddingBottom);

    const drawGrid = (target: CanvasRenderingContext2D, w: number, h: number): void => {
      target.save();
      target.strokeStyle = 'rgba(148,163,184,0.25)';
      target.lineWidth = Math.max(visuals.minorStrokePx * 1.1, 1.2 * visualScale);
      target.setLineDash([4 * visualScale, 4 * visualScale]);
      target.font = `${Math.max(visuals.secondaryFontPx - 1, Math.round(11 * visualScale))}px system-ui`;
      target.fillStyle = 'rgba(148,163,184,0.9)';

      const step = Math.max(1, Math.round(next.params.totalTime / 5));
      for (let tv = 0; tv <= next.params.totalTime + 1e-6; tv += step) {
        const x = tToXpix(tv, w);
        target.beginPath();
        target.moveTo(x, paddingTop);
        target.lineTo(x, h - paddingBottom);
        target.stroke();
        target.textAlign = 'center';
        target.fillText(tv.toFixed(0), x, h - 10 * visualScale);
      }

      target.setLineDash([]);
      target.restore();
    };

    drawGrid(xCtx, xW, xH);
    drawGrid(vCtx, vW, vH);

    const drawPolyline = (
      target: CanvasRenderingContext2D,
      w: number,
      h: number,
      type: 'xA' | 'xB' | 'vA' | 'vB',
      colorA: string,
      colorB: string,
      maxTime: number
    ): void => {
      target.save();
      target.lineWidth = Math.max(visuals.majorStrokePx * 1.2, 2.6 * visualScale);
      const grad = target.createLinearGradient(paddingLeft, paddingTop, w - paddingRight, h - paddingBottom);
      grad.addColorStop(0, colorA);
      grad.addColorStop(1, colorB);
      target.strokeStyle = grad;
      target.beginPath();
      let first = true;
      for (const s of next.samples) {
        if (s.t > maxTime) break;
        const xPix = tToXpix(s.t, w);
        let yPix: number;
        if (type === 'xA') yPix = worldXToYpix(s.xA, h);
        else if (type === 'xB') yPix = worldXToYpix(s.xB, h);
        else if (type === 'vA') yPix = vToYpix(s.vA, h);
        else yPix = vToYpix(s.vB, h);
        if (first) {
          target.moveTo(xPix, yPix);
          first = false;
        } else {
          target.lineTo(xPix, yPix);
        }
      }
      target.stroke();
      target.restore();
    };

    drawPolyline(xCtx, xW, xH, 'xA', 'rgba(96,165,250,0.95)', 'rgba(59,130,246,0.5)', currentTime);
    drawPolyline(xCtx, xW, xH, 'xB', 'rgba(248,113,113,0.95)', 'rgba(239,68,68,0.5)', currentTime);
    drawPolyline(vCtx, vW, vH, 'vA', 'rgba(96,165,250,0.95)', 'rgba(59,130,246,0.5)', currentTime);
    drawPolyline(vCtx, vW, vH, 'vB', 'rgba(248,113,113,0.95)', 'rgba(239,68,68,0.5)', currentTime);

    const drawMarker = (target: CanvasRenderingContext2D, w: number, h: number): void => {
      const x = tToXpix(currentTime, w);
      target.save();
      target.strokeStyle = 'rgba(248,250,252,0.85)';
      target.setLineDash([6 * visualScale, 4 * visualScale]);
      target.lineWidth = Math.max(visuals.minorStrokePx * 1.15, 1.9 * visualScale);
      target.beginPath();
      target.moveTo(x, paddingTop);
      target.lineTo(x, h - paddingBottom);
      target.stroke();
      target.restore();
    };

    drawMarker(xCtx, xW, xH);
    drawMarker(vCtx, vW, vH);
  }

  function drawFallback(next: ChaseMeetSnapshot): void {
    if (!ctx) return;
    const width = surface.cssWidth;
    const height = surface.cssHeight;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = theme === 'light' ? '#ffffff' : '#020617';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = theme === 'light' ? '#111827' : '#e5e7eb';
    ctx.font = '16px system-ui';
    ctx.fillText(`t=${next.state.t.toFixed(2)}s`, 16, 28);
    ctx.fillText(`distance=${next.state.distance.toFixed(2)}m`, 16, 52);
  }

  function draw(next: ChaseMeetSnapshot): void {
    const dom = ensureStageDom();
    if (!dom) {
      drawFallback(next);
      return;
    }
    drawMotion(next, dom);
    drawGraphs(next, dom);
  }

  return {
    render(next: ChaseMeetSnapshot): void {
      snapshot = next;
      draw(next);
    },
    reset(): void {
      if (snapshot) {
        draw(snapshot);
      }
    },
    attachCanvas(nextCanvas: HTMLCanvasElement): void {
      canvas = nextCanvas;
      ctx = nextCanvas.getContext('2d');
      resizeFallbackCanvas();
      if (snapshot) {
        draw(snapshot);
      }
    },
    attachStageSlot(nextSlot: HTMLElement): void {
      stageSlot = nextSlot;
      stageDom = null;
      initStageSize();
      if (snapshot) {
        draw(snapshot);
      }
    },
    resize(): void {
      initStageSize();
      if (snapshot) {
        draw(snapshot);
      }
    },
    setMode(nextMode: TeachingMode): void {
      mode = nextMode;
      initStageSize();
      if (snapshot) {
        draw(snapshot);
      }
    },
    setTheme(nextTheme: TeachingTheme): void {
      theme = nextTheme;
      if (snapshot) {
        draw(snapshot);
      }
    },
    dispose(): void {
      snapshot = null;
      if (stageSlot) {
        stageSlot.innerHTML = '';
      }
      stageDom = null;
      stageSlot = null;
      canvas = null;
      ctx = null;
    }
  };
}
