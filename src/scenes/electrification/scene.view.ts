import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { sizeCanvasToFill } from '../../core/canvas-sizing';
import type { ElectrificationSnapshot } from './scene.sim';
import { drawFriction } from './renderer/draw-friction';
import { drawInduction } from './renderer/draw-induction';
import { drawContact } from './renderer/draw-contact';

import type { DemoRenderHints } from '../../platform/demo-profile';

export type CreateElectrificationViewOptions = {
  canvas?: HTMLCanvasElement;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  theme?: TeachingTheme;
};

export function createElectrificationView(
  options: CreateElectrificationViewOptions = {}
) {
  let canvas = options.canvas ?? null;
  let ctx = canvas?.getContext('2d') ?? null;
  // mode / demoHints reserved for future demo profile integration
  let theme: TeachingTheme = options.theme ?? 'dark';
  let snapshot: ElectrificationSnapshot | null = null;
  let cssWidth = 1280;
  let cssHeight = 720;
  let responsiveScale = 1;

  function resizeCanvas(): void {
    if (!canvas) return;
    const newCtx = sizeCanvasToFill(canvas);
    if (newCtx) ctx = newCtx;
    const rect = canvas.getBoundingClientRect();
    cssWidth = Math.max(200, Math.floor(rect.width || 1280));
    cssHeight = Math.max(150, Math.floor(rect.height || 720));
    responsiveScale = parseFloat(canvas.dataset.responsiveScale || '1');
  }

  function drawScene(next: ElectrificationSnapshot): void {
    const context = ctx;
    if (!context) return;
    const width = cssWidth;
    const height = cssHeight;
    const isDark = theme === 'dark';

    // 背景
    context.clearRect(0, 0, width, height);
    const bgGrad = context.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, isDark ? '#111827' : '#f8fafc');
    bgGrad.addColorStop(1, isDark ? '#1f2937' : '#f1f5f9');
    context.fillStyle = bgGrad;
    context.fillRect(0, 0, width, height);

    const drawContext = {
      ctx: context,
      width,
      height,
      theme,
      responsiveScale,
    };

    switch (next.state.scene) {
      case 'friction':
        drawFriction(drawContext, next);
        break;
      case 'induction':
        drawInduction(drawContext, next);
        break;
      case 'contact':
        drawContact(drawContext, next);
        break;
    }
  }

  return {
    render(next: ElectrificationSnapshot): void {
      snapshot = next;
      drawScene(next);
    },
    resize(): void {
      resizeCanvas();
      if (snapshot) drawScene(snapshot);
    },
    setMode(_nextMode: TeachingMode, _hints?: DemoRenderHints): void {
      if (snapshot) drawScene(snapshot);
    },
    setTheme(nextTheme: TeachingTheme): void {
      theme = nextTheme;
      if (snapshot) drawScene(snapshot);
    },
    dispose(): void {
      snapshot = null;
      canvas = null;
      ctx = null;
    }
  };
}
