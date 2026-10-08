import {
  getRenderTokens,
  type TeachingMode,
  type TeachingTheme
} from '../../platform/standards';
import { sizeCanvasToFill } from '../../core/canvas-sizing';
import { createTransitionTracker } from '../../core/transition-tracker';
import { Colors, alpha } from '../../core/colors';
import type { VtIntegralSnapshot } from './scene.sim';
import type { Box, DrawContext } from './renderer/types';
import { curveY } from './scene.sim';
import { drawScene1 } from './renderer/draw-scene1';
import { drawScene2, type Scene2Layout } from './renderer/draw-scene2';
import { drawScene3 } from './renderer/draw-scene3';
import { readoutOccludesStage } from '../../platform/stage-readout';

import type { DemoRenderHints } from '../../platform/demo-profile';

export type CreateVtIntegralViewOptions = {
  canvas?: HTMLCanvasElement;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  theme?: TeachingTheme;
};

const SCENE_RENDERERS: Record<
  VtIntegralSnapshot['params']['scene'],
  (ctx: DrawContext, snapshot: VtIntegralSnapshot) => Scene2Layout | void
> = {
  scene1: drawScene1,
  scene2: drawScene2,
  scene3: drawScene3
};

const READOUT_PANEL_SELECTOR =
  '.teaching-readout-panel, .srgb-readout-panel, .readout-panel';

/** 未挂载时 clientWidth 回落，不参与 scale（已知误报类）。 */
const FALLBACK_CSS_W = 800;
const FALLBACK_CSS_H = 600;

export function createVtIntegralView(
  options: CreateVtIntegralViewOptions = {}
) {
  let canvas = options.canvas ?? null;
  let ctx = canvas?.getContext('2d') ?? null;
  let theme: TeachingTheme = options.theme ?? 'dark';
  let mode: TeachingMode = options.mode ?? 'normal';
  let hints: DemoRenderHints | undefined = options.demoHints;
  let snapshot: VtIntegralSnapshot | null = null;
  let canvasWidth = FALLBACK_CSS_W;
  let canvasHeight = FALLBACK_CSS_H;
  let responsiveScale = 1;
  let onPointDrag: ((id: 'A' | 'B', x: number) => void) | null = null;
  let dragging: 'A' | 'B' | null = null;
  const sceneTransition = createTransitionTracker(250);
  // 自驱动补帧：暂停/静态场景下也推进过渡动画至 alpha=1，避免画面停在淡化中途帧
  let transitionRaf: number | null = null;
  // 背景渐变缓存：仅依赖 (尺寸, theme)，变化时重建
  let bgGradCache: { key: string; grad: CanvasGradient } | null = null;
  // 场景二最近一帧布局：命中测试与绘制共用同一套坐标
  let scene2Layout: Scene2Layout | null = null;
  // 读数浮层遮挡：签名变化才重绘（先例：single-slit / magnetic-mirror）
  const overlayObservers: Array<{ disconnect(): void }> = [];
  let parentObserved = false;
  let observedPanel: Element | null = null;
  let overlayFrame: number | null = null;
  let lastOcclusionKey = '';

  function findReadoutPanel(): HTMLElement | null {
    const parent = canvas?.parentElement;
    if (!parent) return null;
    const panel = parent.querySelector(READOUT_PANEL_SELECTOR);
    return panel instanceof HTMLElement ? panel : null;
  }

  /** 读数浮层在画布 CSS 坐标中的矩形；不遮挡（移动端 tab 等）时为 null */
  function measureOcclusion(): Box | null {
    if (!canvas || !readoutOccludesStage(canvas)) return null;
    const panel = findReadoutPanel();
    if (!panel) return null;
    const cr = canvas.getBoundingClientRect();
    const pr = panel.getBoundingClientRect();
    if (cr.width <= 0 || cr.height <= 0 || pr.width <= 0 || pr.height <= 0) {
      return null;
    }
    const kx = canvasWidth / cr.width;
    const ky = canvasHeight / cr.height;
    const box: Box = {
      left: Math.max(0, (pr.left - cr.left) * kx),
      top: Math.max(0, (pr.top - cr.top) * ky),
      right: Math.min(canvasWidth, (pr.right - cr.left) * kx),
      bottom: Math.min(canvasHeight, (pr.bottom - cr.top) * ky)
    };
    if (box.right <= box.left || box.bottom <= box.top) return null;
    return box;
  }

  function occlusionKey(box: Box | null): string {
    if (!box) return 'none';
    return [box.left, box.top, box.right, box.bottom]
      .map((v) => Math.round(v))
      .join('|');
  }

  function scheduleOverlayRedraw(): void {
    if (overlayFrame !== null) return;
    if (typeof requestAnimationFrame === 'undefined') return;
    overlayFrame = requestAnimationFrame(() => {
      overlayFrame = null;
      watchOverlay();
      const key = `${canvasWidth}|${canvasHeight}|${occlusionKey(measureOcclusion())}`;
      if (key !== lastOcclusionKey && snapshot) draw(snapshot);
    });
  }

  function watchOverlay(): void {
    const parent = canvas?.parentElement;
    if (!parent) return;
    if (!parentObserved) {
      parentObserved = true;
      if (typeof ResizeObserver !== 'undefined') {
        const resize = new ResizeObserver(() => scheduleOverlayRedraw());
        resize.observe(parent);
        overlayObservers.push(resize);
      }
      if (typeof MutationObserver !== 'undefined') {
        // 读数面板可能晚于首绘挂载，监听子节点以便补挂面板观察
        const mutate = new MutationObserver(() => scheduleOverlayRedraw());
        mutate.observe(parent, { childList: true });
        overlayObservers.push(mutate);
      }
    }
    const panel = findReadoutPanel();
    if (!panel || panel === observedPanel) return;
    observedPanel = panel;
    if (typeof ResizeObserver !== 'undefined') {
      const resize = new ResizeObserver(() => scheduleOverlayRedraw());
      resize.observe(panel);
      overlayObservers.push(resize);
    }
    if (typeof MutationObserver !== 'undefined') {
      const mutate = new MutationObserver(() => scheduleOverlayRedraw());
      mutate.observe(panel, {
        attributes: true,
        attributeFilter: ['class', 'style', 'hidden']
      });
      overlayObservers.push(mutate);
    }
  }

  function resizeCanvas(): void {
    if (!canvas) return;
    const newCtx = sizeCanvasToFill(canvas);
    ctx = newCtx;
    canvasWidth = Math.max(1, canvas.clientWidth || FALLBACK_CSS_W);
    canvasHeight = Math.max(1, canvas.clientHeight || FALLBACK_CSS_H);
    responsiveScale = parseFloat(canvas.dataset.responsiveScale || '1');
  }

  function drawBackground(): void {
    if (!ctx) return;
    const width = canvasWidth;
    const height = canvasHeight;

    ctx.clearRect(0, 0, width, height);

    const gradKey = `${width}|${height}|${theme}`;
    if (!bgGradCache || bgGradCache.key !== gradKey) {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, theme === 'light' ? '#eef2ff' : Colors.darkBg);
      gradient.addColorStop(
        1,
        theme === 'light' ? '#e0e7ff' : alpha(Colors.darkCard, 0.8)
      );
      bgGradCache = { key: gradKey, grad: gradient };
    }
    ctx.fillStyle = bgGradCache.grad;
    ctx.fillRect(0, 0, width, height);
  }

  function draw(next: VtIntegralSnapshot): void {
    if (!ctx) return;

    drawBackground();

    const renderer = SCENE_RENDERERS[next.params.scene];
    if (renderer) {
      const alpha = sceneTransition.update(next.params.scene);
      if (alpha < 1) {
        ctx.save();
        ctx.globalAlpha = alpha;
      }

      const contentScale =
        mode === 'presentation' ? (hints?.contentScale ?? 1.5) : 1;
      const classroom = getRenderTokens(
        Math.min(responsiveScale * Math.min(contentScale, 1.6), 1.6)
      );
      if (canvas) {
        canvas.dataset.tokenPrimary = String(
          classroom.rightStage.primaryFontPx
        );
      }

      const occlusion = measureOcclusion();
      lastOcclusionKey = `${canvasWidth}|${canvasHeight}|${occlusionKey(occlusion)}`;
      const layout = renderer(
        {
          ctx,
          width: canvasWidth,
          height: canvasHeight,
          theme: theme === 'dark' ? 'dark' : 'light',
          responsiveScale,
          contentScale,
          occlusion
        },
        next
      );
      scene2Layout = layout ?? null;

      if (alpha < 1) {
        ctx.restore();
      }

      if (sceneTransition.isTransitioning) driveTransition();
    }
    watchOverlay();
  }

  function canvasLocal(e: PointerEvent): { x: number; y: number } | null {
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function hitPoint(px: number, py: number): 'A' | 'B' | null {
    if (!snapshot || snapshot.params.scene !== 'scene2') return null;
    const layout = scene2Layout;
    if (!layout) return null;
    const amp = snapshot.params.curveAmplitude;
    const a = {
      x: layout.toX(snapshot.params.pointA),
      y: layout.toY(curveY(snapshot.params.pointA, amp))
    };
    const b = {
      x: layout.toX(snapshot.params.pointB),
      y: layout.toY(curveY(snapshot.params.pointB, amp))
    };
    const dA = Math.hypot(px - a.x, py - a.y);
    const dB = Math.hypot(px - b.x, py - b.y);
    const r = layout.hitR;
    if (dA <= r || dB <= r) {
      return dA <= dB ? 'A' : 'B';
    }
    return null;
  }

  function paramFromX(px: number): number {
    const layout = scene2Layout;
    if (!snapshot || !layout) return 0;
    const span = layout.right - layout.left;
    if (span <= 1e-6) return 0;
    return Math.max(0, Math.min(1, (px - layout.left) / span));
  }

  function handlePointerDown(e: PointerEvent): void {
    const local = canvasLocal(e);
    if (!local || !canvas) return;
    const hit = hitPoint(local.x, local.y);
    if (!hit) return;
    dragging = hit;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
  }

  function handlePointerMove(e: PointerEvent): void {
    const local = canvasLocal(e);
    if (!local || !canvas) return;
    if (dragging) {
      onPointDrag?.(dragging, paramFromX(local.x));
      return;
    }
    canvas.style.cursor = hitPoint(local.x, local.y) ? 'grab' : 'default';
  }

  function handlePointerUp(e: PointerEvent): void {
    dragging = null;
    if (!canvas) return;
    const local = canvasLocal(e);
    canvas.style.cursor =
      local && hitPoint(local.x, local.y) ? 'grab' : 'default';
  }

  function attachEvents(): void {
    if (!canvas) return;
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerUp);
  }

  function detachEvents(): void {
    if (!canvas) return;
    canvas.removeEventListener('pointerdown', handlePointerDown);
    canvas.removeEventListener('pointermove', handlePointerMove);
    canvas.removeEventListener('pointerup', handlePointerUp);
    canvas.removeEventListener('pointercancel', handlePointerUp);
  }

  attachEvents();

  function driveTransition(): void {
    if (transitionRaf !== null) return;
    if (typeof requestAnimationFrame === 'undefined') return;
    transitionRaf = requestAnimationFrame(() => {
      transitionRaf = null;
      if (snapshot && sceneTransition.isTransitioning) draw(snapshot);
    });
  }

  return {
    render(next: VtIntegralSnapshot): void {
      snapshot = next;
      draw(next);
    },
    resize(): void {
      resizeCanvas();
      if (snapshot) draw(snapshot);
    },
    setMode(nextMode: TeachingMode, nextHints?: DemoRenderHints): void {
      mode = nextMode;
      hints = nextHints;
      if (snapshot) draw(snapshot);
    },
    setTheme(nextTheme: TeachingTheme): void {
      theme = nextTheme;
      if (snapshot) draw(snapshot);
    },
    setOnPointDrag(cb: (id: 'A' | 'B', x: number) => void): void {
      onPointDrag = cb;
    },
    dispose(): void {
      detachEvents();
      for (const observer of overlayObservers) observer.disconnect();
      overlayObservers.length = 0;
      observedPanel = null;
      if (
        overlayFrame !== null &&
        typeof cancelAnimationFrame !== 'undefined'
      ) {
        cancelAnimationFrame(overlayFrame);
        overlayFrame = null;
      }
      scene2Layout = null;
      if (
        transitionRaf !== null &&
        typeof cancelAnimationFrame !== 'undefined'
      ) {
        cancelAnimationFrame(transitionRaf);
        transitionRaf = null;
      }
      snapshot = null;
      onPointDrag = null;
      canvas = null;
      ctx = null;
    }
  };
}
