import type { ChaseMeetSample } from '../scene.sim';
import { getRenderTokens } from '../../../platform/standards';
import { applyTouchInteractionMode } from '../../../platform/input/touch';

export type StageDom = {
  root: HTMLElement;
  motionCanvas: HTMLCanvasElement;
  xCanvas: HTMLCanvasElement;
  vCanvas: HTMLCanvasElement;
  motionCtx: CanvasRenderingContext2D;
  xCtx: CanvasRenderingContext2D;
  vCtx: CanvasRenderingContext2D;
  dpr: number;
};

export type Visuals = ReturnType<typeof getRenderTokens>['rightStage'] & {
  scale: number;
};

const BASE_SCALE = 1.45;

export function resolveVisuals(
  scale: number = 1.0,
  canvasWidth?: number,
  canvasHeight?: number
): Visuals {
  const base = getRenderTokens(scale).rightStage;
  let computedScale = BASE_SCALE * scale;
  let markerRadiusPx = base.markerRadiusPx;
  let primaryFontPx = base.primaryFontPx;
  let secondaryFontPx = base.secondaryFontPx;
  let majorStrokePx = base.majorStrokePx;
  let minorStrokePx = base.minorStrokePx;

  if (canvasWidth && canvasHeight && canvasWidth > 0 && canvasHeight > 0) {
    const shortEdge = Math.min(canvasWidth, canvasHeight);
    const responsiveScale = Math.max(0.3, Math.min(1.0, shortEdge / 550));
    computedScale *= responsiveScale;
    markerRadiusPx *= responsiveScale;
    primaryFontPx = Math.max(10, base.primaryFontPx * responsiveScale);
    secondaryFontPx = Math.max(9, base.secondaryFontPx * responsiveScale);
    majorStrokePx = Math.max(1.5, base.majorStrokePx * responsiveScale);
    minorStrokePx = Math.max(1, base.minorStrokePx * responsiveScale);
  }

  return {
    ...base,
    scale: computedScale,
    markerRadiusPx,
    primaryFontPx,
    secondaryFontPx,
    majorStrokePx,
    minorStrokePx
  };
}

export function nearestSample(
  samples: ChaseMeetSample[],
  t: number
): ChaseMeetSample {
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

export function resizeCanvasWithDpr(
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
  const scale = Math.max(
    0.3,
    Math.min(1.5, Math.min(cssWidth, cssHeight) / 400)
  );
  canvas.dataset.responsiveScale = String(scale);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);
}

export function createStageDom(slot: HTMLElement): StageDom {
  const root = document.createElement('div');
  root.className = 'chase-modern-stage';

  // Motion section（标题画进画布天空，避免与浮动运输条撞车）
  const motionSection = document.createElement('section');
  motionSection.className = 'chase-modern-card chase-modern-card--motion';
  const motionCanvas = document.createElement('canvas');
  motionCanvas.className = 'chase-modern-motion-canvas';
  motionCanvas.setAttribute('role', 'img');
  motionCanvas.setAttribute('aria-label', '追及大冒险：A/B 一维追及卡通动画');
  motionSection.appendChild(motionCanvas);
  root.appendChild(motionSection);

  // Graphs section
  const graphsSection = document.createElement('section');
  graphsSection.className = 'chase-modern-card chase-modern-card--graphs';
  const graphsHeader = document.createElement('div');
  graphsHeader.className = 'chase-modern-card-header';
  const graphsTitle = document.createElement('div');
  graphsTitle.className = 'chase-modern-card-title';
  graphsTitle.textContent = 'x–t 与 v–t 图像';
  graphsHeader.appendChild(graphsTitle);
  const plotsDiv = document.createElement('div');
  plotsDiv.className = 'chase-modern-plots';

  const xPlot = document.createElement('div');
  xPlot.className = 'chase-modern-plot';
  const xTitle = document.createElement('div');
  xTitle.className = 'chase-modern-plot-title';
  xTitle.textContent = '位置–时间 图 x(t)';
  const xCanvas = document.createElement('canvas');
  xCanvas.className = 'chase-modern-x-canvas';
  xCanvas.setAttribute('role', 'img');
  xCanvas.setAttribute('aria-label', '位置-时间图像 x(t)');
  xPlot.append(xTitle, xCanvas);

  const vPlot = document.createElement('div');
  vPlot.className = 'chase-modern-plot';
  const vTitle = document.createElement('div');
  vTitle.className = 'chase-modern-plot-title';
  vTitle.textContent = '速度–时间 图 v(t)';
  const vCanvas = document.createElement('canvas');
  vCanvas.className = 'chase-modern-v-canvas';
  vCanvas.setAttribute('role', 'img');
  vCanvas.setAttribute('aria-label', '速度-时间图像 v(t)');
  vPlot.append(vTitle, vCanvas);

  plotsDiv.append(xPlot, vPlot);
  graphsSection.append(graphsHeader, plotsDiv);
  root.appendChild(graphsSection);
  const motionCtx = motionCanvas.getContext('2d');
  const xCtx = xCanvas.getContext('2d');
  const vCtx = vCanvas.getContext('2d');
  if (!motionCtx || !xCtx || !vCtx) {
    throw new Error('Failed to create chase stage contexts');
  }

  applyTouchInteractionMode(motionCanvas, 'default');
  applyTouchInteractionMode(xCanvas, 'default');
  applyTouchInteractionMode(vCanvas, 'default');

  // The chase-meet stage owns its three explicit canvases; remove the layout
  // placeholder so canvas audits only inspect real render targets.
  const layoutCanvas = slot.querySelector('canvas');
  layoutCanvas?.remove();
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
