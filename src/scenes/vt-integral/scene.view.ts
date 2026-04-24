import type { TeachingMode } from '../../platform/standards';
import type { TeachingTheme } from '../../platform/standards';
import { sizeCanvasToFill } from '../../core/canvas-sizing';
import { Colors, alpha } from '../../core/colors';
import type { VtIntegralSnapshot } from './scene.sim';
import { drawScene1 } from './renderer/draw-scene1';
import { drawScene2 } from './renderer/draw-scene2';
import { drawScene3 } from './renderer/draw-scene3';

import type { DemoRenderHints } from '../../app/demo-profile';

export type CreateVtIntegralViewOptions = {
  canvas?: HTMLCanvasElement;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  theme?: TeachingTheme;
};

const SCENE_RENDERERS: Record<
  VtIntegralSnapshot['params']['scene'],
  (ctx: {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    theme: 'dark' | 'light';
    responsiveScale: number;
  }, snapshot: VtIntegralSnapshot) => void
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
  let mode: TeachingMode = options.mode ?? 'normal';
  let demoHints: DemoRenderHints | null = options.demoHints ?? null;
  let theme: TeachingTheme = options.theme ?? 'dark';
  let snapshot: VtIntegralSnapshot | null = null;
  let canvasWidth = 800;
  let canvasHeight = 600;
  let responsiveScale = 1;

  function resizeCanvas(): void {
    if (!canvas) return;
    const newCtx = sizeCanvasToFill(canvas);
    ctx = newCtx;
    canvasWidth = canvas.clientWidth;
    canvasHeight = canvas.clientHeight;
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
      renderer(
        {
          ctx,
          width: canvasWidth,
          height: canvasHeight,
          theme: theme === 'dark' ? 'dark' : 'light',
          responsiveScale
        },
        next
      );
    }
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
    setMode(nextMode: TeachingMode, hints?: DemoRenderHints): void {
      mode = nextMode;
      if (hints) {
        demoHints = hints;
      }
      if (snapshot) draw(snapshot);
    },
    setTheme(nextTheme: TeachingTheme): void {
      theme = nextTheme;
      if (snapshot) draw(snapshot);
    },
    dispose(): void {
      snapshot = null;
      canvas = null;
      ctx = null;
    }
  };
}
