import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { pendulumConstants, type PendulumState } from './scene.sim';
import { PALETTE, text } from './renderer/draw-helpers';
import { drawPanel } from './renderer/draw-panel';
import {
  drawEnergyCard,
  drawGrid,
  drawPendulum,
  drawRuler,
  drawStand
} from './renderer/draw-stage';

export type CreatePendulumViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

export function createPendulumView(options: CreatePendulumViewOptions = {}) {
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: {
      mode: 'clamped',
      fallbackWidth: pendulumConstants.baseWidth,
      fallbackHeight: pendulumConstants.baseHeight
    },
    initialWidth: pendulumConstants.baseWidth,
    initialHeight: pendulumConstants.baseHeight,
    eagerContext: true
  });
  let snapshot: PendulumState | null = null;

  function draw(state: PendulumState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const scale = env.contentScale() * stage.responsiveScale;
    const fit = Math.min(
      width / (pendulumConstants.baseWidth * scale),
      height / (pendulumConstants.baseHeight * scale)
    );
    const offsetX = Math.max(
      0,
      (width - pendulumConstants.baseWidth * scale * fit) / 2
    );
    const offsetY = Math.max(
      0,
      (height - pendulumConstants.baseHeight * scale * fit) / 2
    );
    const p = PALETTE[env.theme];
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fit, fit);
    drawGrid(ctx, p, scale);
    text(
      ctx,
      '单摆周期与测重力加速度',
      28 * scale,
      35 * scale,
      p.ink,
      25 * scale,
      'left',
      700
    );
    text(
      ctx,
      '高中物理 · 简谐运动与实验探究（理想模型无阻尼仿真）',
      28 * scale,
      67 * scale,
      p.muted,
      14 * scale,
      'left',
      600
    );
    drawRuler(ctx, p, scale);
    drawStand(ctx, p, scale);
    drawPendulum(ctx, state, p, scale);
    drawEnergyCard(ctx, state, p, scale);
    drawPanel(ctx, state, p, scale);
    text(
      ctx,
      '拖拽摆球改变振幅 · 空格键暂停/恢复',
      400 * scale,
      742 * scale,
      p.muted,
      13 * scale,
      'left',
      600
    );
    ctx.restore();
  }

  return {
    render(state: PendulumState) {
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
      snapshot = null;
      stage.release();
    }
  };
}
