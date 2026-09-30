import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { multimeterConstants, type MultimeterState } from './scene.sim';
import { PALETTE, drawGrid, text } from './renderer/draw-helpers';
import { drawLeadsAndTarget } from './renderer/draw-leads';
import { drawMeterFace, drawSelector } from './renderer/draw-meter';
import { drawPanel } from './renderer/draw-panel';

export type CreateMultimeterViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onProbeDrop?: () => void;
};

export function createMultimeterView(
  options: CreateMultimeterViewOptions = {}
) {
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: {
      mode: 'clamped',
      fallbackWidth: multimeterConstants.baseWidth,
      fallbackHeight: multimeterConstants.baseHeight
    },
    initialWidth: multimeterConstants.baseWidth,
    initialHeight: multimeterConstants.baseHeight,
    eagerContext: true
  });
  let snapshot: MultimeterState | null = null;
  let dragging = false;
  const canvas = options.canvas;
  const onPointerDown = () => {
    dragging = true;
  };
  const onPointerUp = () => {
    if (!dragging) return;
    dragging = false;
    options.onProbeDrop?.();
  };
  if (canvas) {
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
  }
  function draw(state: MultimeterState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const scale = env.contentScale() * stage.responsiveScale;
    const fit = Math.min(
      width / (multimeterConstants.baseWidth * scale),
      height / (multimeterConstants.baseHeight * scale)
    );
    const offsetX = Math.max(
      0,
      (width - multimeterConstants.baseWidth * scale * fit) / 2
    );
    const offsetY = Math.max(
      0,
      (height - multimeterConstants.baseHeight * scale * fit) / 2
    );
    const p = PALETTE[env.theme];
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fit, fit);
    drawGrid(ctx, p, scale);
    drawMeterFace(ctx, state, p, scale);
    drawSelector(ctx, state, p, scale);
    drawLeadsAndTarget(ctx, state, p, scale);
    drawPanel(ctx, state, p, scale);
    text(
      ctx,
      '空格键暂停/恢复 · 拖拽表笔到触点',
      260 * scale,
      748 * scale,
      p.muted,
      13 * scale,
      'left',
      600
    );
    ctx.restore();
  }
  return {
    render(state: MultimeterState) {
      snapshot = state;
      stage.ensureSized();
      draw(state);
    },
    resize() {
      stage.resize();
      if (snapshot) draw(snapshot);
    },
    setTheme(theme: TeachingTheme) {
      env.setTheme(theme);
      if (snapshot) draw(snapshot);
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints) {
      env.setMode(mode, hints);
      if (snapshot) draw(snapshot);
    },
    dispose() {
      if (canvas) {
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointerup', onPointerUp);
      }
      snapshot = null;
      stage.release();
    }
  };
}
