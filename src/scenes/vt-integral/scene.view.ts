import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { sizeCanvasToFill } from '../../core/canvas-sizing';
import { createTransitionTracker } from '../../core/transition-tracker';
import { Colors, alpha } from '../../core/colors';
import type { VtIntegralSnapshot } from './scene.sim';
import type { DrawContext } from './renderer/types';
import { drawScene1 } from './renderer/draw-scene1';
import { drawScene2 } from './renderer/draw-scene2';
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
  const sceneTransition = createTransitionTracker(250);
  // 自驱动补帧：暂停/静态场景下也推进过渡动画至 alpha=1，避免画面停在淡化中途帧
  let transitionRaf: number | null = null;

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

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, theme === 'light' ? '#eef2ff' : Colors.darkBg);
    gradient.addColorStop(
      1,
      theme === 'light' ? '#e0e7ff' : alpha(Colors.darkCard, 0.8)
    );
    ctx.fillStyle = gradient;
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
    dispose(): void {
      if (
        transitionRaf !== null &&
        typeof cancelAnimationFrame !== 'undefined'
      ) {
        cancelAnimationFrame(transitionRaf);
        transitionRaf = null;
      }
      snapshot = null;
      canvas = null;
      ctx = null;
    }
  };
}
