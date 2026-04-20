import type { TeachingMode } from '../../platform/standards';
import type { TeachingTheme } from '../../platform/standards';
import {
  applyHiDpiCanvasMetrics,
  computeHiDpiCanvasMetrics
} from '../../core/high-dpi-canvas';
import type { EmfAnalogySnapshot } from './scene.sim';
import { drawRoundedRect } from './renderer/draw-rounded-rect';
import { drawCards } from './renderer/draw-cards';
import { drawLegendAndFormula } from './renderer/draw-legend-formula';
import { drawFlowArea, buildParticles } from './renderer/draw-flow-area';
import {
  createLegacyOverlay,
  updateLegacyOverlay
} from './overlay/legacy-overlay';

export type CreateEmfAnalogyViewOptions = {
  canvas?: HTMLCanvasElement;
  mode?: TeachingMode;
  theme?: TeachingTheme;
  legacyFlowDark?: boolean;
};

export function createEmfAnalogyView(
  options: CreateEmfAnalogyViewOptions = {}
) {
  let canvas = options.canvas ?? null;
  let ctx = canvas?.getContext('2d') ?? null;
  let mode: TeachingMode = options.mode ?? 'normal';
  let theme: TeachingTheme = options.theme ?? 'dark';
  const legacyFlowDark = options.legacyFlowDark ?? false;
  let snapshot: EmfAnalogySnapshot | null = null;
  let surface = computeHiDpiCanvasMetrics({
    cssWidth: 1280,
    cssHeight: 720,
    devicePixelRatio: 1
  });

  const particles = buildParticles();
  let impellerAngle = 0;
  let rafId: number | null = null;

  const legacyOverlay = createLegacyOverlay(canvas, legacyFlowDark);

  function resizeCanvas(): void {
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const cssWidth = Math.max(480, Math.floor(rect.width || 1280));
    const cssHeight = Math.max(280, Math.floor(rect.height || 720));
    const dpr =
      typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
    surface = computeHiDpiCanvasMetrics({
      cssWidth,
      cssHeight,
      devicePixelRatio: dpr
    });
    applyHiDpiCanvasMetrics(canvas, ctx, surface);
  }

  function draw(next: EmfAnalogySnapshot): void {
    if (!ctx) return;
    const isDark = theme === 'dark';
    const width = surface.cssWidth;
    const height = surface.cssHeight;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = isDark ? '#0b1220' : '#f1f5f9';
    ctx.fillRect(0, 0, width, height);

    const outerPad = Math.max(8, Math.min(width, height) * 0.012);
    const cardX = outerPad;
    const cardY = outerPad;
    const cardW = width - outerPad * 2;
    const cardH = height - outerPad * 2;
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 12);
    ctx.fillStyle = isDark ? '#0f172a' : '#ffffff';
    ctx.fill();
    ctx.strokeStyle = isDark ? '#334155' : '#dce5f2';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    const headerX = cardX + 12;
    const headerY = cardY + 12;
    const headerW = cardW - 24;
    const headerH = legacyOverlay
      ? Math.max(92, Math.min(104, cardH * 0.17))
      : Math.max(72, Math.min(112, cardH * 0.19));

    const flowX = cardX + 8;
    const flowY = legacyOverlay ? headerY + headerH - 6 : headerY + headerH + 8;
    const flowW = cardW - 16;
    const flowH = cardH - (flowY - cardY) - (legacyOverlay ? 0 : 8);

    if (!legacyOverlay) {
      drawRoundedRect(ctx, headerX, headerY, headerW, headerH, 10);
      const headerGradient = ctx.createLinearGradient(
        headerX,
        headerY,
        headerX + headerW,
        headerY
      );
      if (isDark) {
        headerGradient.addColorStop(0, '#111b2d');
        headerGradient.addColorStop(1, '#0b1220');
      } else {
        headerGradient.addColorStop(0, '#f8fafc');
        headerGradient.addColorStop(1, '#eff6ff');
      }
      ctx.fillStyle = headerGradient;
      ctx.fill();
      ctx.strokeStyle = isDark ? '#334155' : '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.stroke();

      drawCards(
        ctx,
        headerX + 8,
        headerY + 8,
        headerW - 16,
        headerH - 16,
        next,
        theme
      );
    }

    const flowTheme: TeachingTheme =
      legacyFlowDark && theme === 'light' ? 'dark' : theme;

    impellerAngle = drawFlowArea(
      ctx,
      flowX,
      flowY,
      flowW,
      flowH,
      next,
      mode,
      flowTheme,
      particles,
      impellerAngle
    );

    if (legacyOverlay) {
      updateLegacyOverlay(
        legacyOverlay,
        next,
        headerX,
        headerY,
        headerW,
        headerH,
        flowX,
        flowY,
        flowW,
        flowH
      );
    } else {
      drawLegendAndFormula(ctx, flowX, flowY, flowW, flowH, next);
    }
  }

  let isRunning = false;

  const tick = () => {
    if (!isRunning) return;
    if (snapshot) {
      draw(snapshot);
    }
    if (typeof window !== 'undefined') {
      rafId = window.requestAnimationFrame(tick);
    }
  };

  return {
    render(next: EmfAnalogySnapshot): void {
      snapshot = next;
      draw(next);
    },
    resize(): void {
      resizeCanvas();
      if (snapshot) draw(snapshot);
    },
    setMode(nextMode: TeachingMode): void {
      mode = nextMode;
      if (snapshot) draw(snapshot);
    },
    setTheme(nextTheme: TeachingTheme): void {
      theme = nextTheme;
      if (snapshot) draw(snapshot);
    },
    start() {
      if (isRunning) return;
      isRunning = true;
      tick();
    },
    stop() {
      isRunning = false;
      if (rafId !== null && typeof window !== 'undefined') {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    },
    dispose(): void {
      isRunning = false;
      if (rafId !== null && typeof window !== 'undefined') {
        window.cancelAnimationFrame(rafId);
      }
      legacyOverlay?.root.remove();
      snapshot = null;
      canvas = null;
      ctx = null;
    }
  };
}
