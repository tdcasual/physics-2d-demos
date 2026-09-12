import {
  getRenderTokens,
  type TeachingMode,
  type TeachingTheme
} from '../../platform/standards';
import { sizeCanvasToFill } from '../../core/canvas-sizing';
import { createTransitionTracker } from '../../core/transition-tracker';
import { Colors, alpha } from '../../core/colors';
import type { VtIntegralSnapshot } from './scene.sim';
import type { DrawContext } from './renderer/types';
import { curveY } from './scene.sim';
import { drawScene1 } from './renderer/draw-scene1';
import { drawScene2, scene2Layout } from './renderer/draw-scene2';
import { drawScene3 } from './renderer/draw-scene3';

import type { DemoRenderHints } from '../../platform/demo-profile';

export type CreateVtIntegralViewOptions = {
  canvas?: HTMLCanvasElement;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  theme?: TeachingTheme;
};

const SCENE_RENDERERS: Record<
  VtIntegralSnapshot['params']['scene'],
  (ctx: DrawContext, snapshot: VtIntegralSnapshot) => void
> = {
  scene1: drawScene1,
  scene2: drawScene2,
  scene3: drawScene3
};

export function createVtIntegralView(
  options: CreateVtIntegralViewOptions = {}
) {
  let canvas = options.canvas ?? null;
  let ctx = canvas?.getContext('2d') ?? null;
  let theme: TeachingTheme = options.theme ?? 'dark';
  let mode: TeachingMode = options.mode ?? 'normal';
  let hints: DemoRenderHints | undefined = options.demoHints;
  let snapshot: VtIntegralSnapshot | null = null;
  let canvasWidth = 800;
  let canvasHeight = 600;
  let responsiveScale = 1;
  let onPointDrag: ((id: 'A' | 'B', x: number) => void) | null = null;
  let dragging: 'A' | 'B' | null = null;
  const sceneTransition = createTransitionTracker(250);
  // 自驱动补帧：暂停/静态场景下也推进过渡动画至 alpha=1，避免画面停在淡化中途帧
  let transitionRaf: number | null = null;
  // 背景渐变缓存：仅依赖 (尺寸, theme)，变化时重建
  let bgGradCache: { key: string; grad: CanvasGradient } | null = null;

  function resizeCanvas(): void {
    if (!canvas) return;
    const newCtx = sizeCanvasToFill(canvas);
    ctx = newCtx;
    canvasWidth = Math.max(1, canvas.clientWidth || 800);
    canvasHeight = Math.max(1, canvas.clientHeight || 600);
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

      renderer(
        {
          ctx,
          width: canvasWidth,
          height: canvasHeight,
          theme: theme === 'dark' ? 'dark' : 'light',
          responsiveScale,
          contentScale
        },
        next
      );

      if (alpha < 1) {
        ctx.restore();
      }

      if (sceneTransition.isTransitioning) driveTransition();
    }
  }

  function canvasLocal(e: PointerEvent): { x: number; y: number } | null {
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function hitPoint(px: number, py: number): 'A' | 'B' | null {
    if (!snapshot || snapshot.params.scene !== 'scene2') return null;
    const layout = scene2Layout(
      canvasWidth,
      canvasHeight,
      responsiveScale,
      snapshot.params.curveAmplitude
    );
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
    if (!snapshot) return 0;
    const layout = scene2Layout(
      canvasWidth,
      canvasHeight,
      responsiveScale,
      snapshot.params.curveAmplitude
    );
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
