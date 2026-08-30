import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { createTransitionTracker } from '../../core/transition-tracker';
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
  const env = createViewEnvironment({
    theme: options.theme,
    mode: options.mode,
    demoHints: options.demoHints
  });
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: { mode: 'clamped', fallbackWidth: 1280, fallbackHeight: 720 },
    initialWidth: 1280,
    initialHeight: 720,
    eagerContext: true
  });
  let snapshot: ElectrificationSnapshot | null = null;
  const stepTransition = createTransitionTracker(200);
  // 背景渐变缓存：仅依赖 (尺寸, theme)，变化时重建
  let bgGradCache: { key: string; grad: CanvasGradient } | null = null;

  function drawScene(next: ElectrificationSnapshot): void {
    const context = stage.ctx;
    if (!context) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const isDark = env.theme === 'dark';

    // 背景
    context.clearRect(0, 0, width, height);
    const gradKey = `${width}|${height}|${isDark}`;
    if (!bgGradCache || bgGradCache.key !== gradKey) {
      const bgGrad = context.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, isDark ? '#111827' : '#f8fafc');
      bgGrad.addColorStop(1, isDark ? '#1f2937' : '#f1f5f9');
      bgGradCache = { key: gradKey, grad: bgGrad };
    }
    context.fillStyle = bgGradCache.grad;
    context.fillRect(0, 0, width, height);

    const drawContext = {
      ctx: context,
      width,
      height,
      theme: env.theme,
      responsiveScale: stage.responsiveScale
    };

    // Fade-in transition on step change
    const transitionKey = `${next.state.scene}-${next.state.stepIndex}`;
    const alpha = stepTransition.update(transitionKey);
    if (alpha < 1) {
      context.save();
      context.globalAlpha = alpha;
    }

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

    if (alpha < 1) {
      context.restore();
    }
  }

  return {
    render(next: ElectrificationSnapshot): void {
      snapshot = next;
      drawScene(next);
    },
    resize(): void {
      stage.resize();
      if (snapshot) drawScene(snapshot);
    },
    setMode(nextMode: TeachingMode, hints?: DemoRenderHints): void {
      env.setMode(nextMode, hints);
      if (snapshot) drawScene(snapshot);
    },
    setTheme(nextTheme: TeachingTheme): void {
      env.setTheme(nextTheme);
      if (snapshot) drawScene(snapshot);
    },
    dispose(): void {
      snapshot = null;
      stage.release();
    }
  };
}
