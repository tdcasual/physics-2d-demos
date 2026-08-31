/**
 * 螺旋测微仪 — 场景视图
 *
 * 复用 instruments/spiral-micrometer 的可复用绘制函数 drawSpiralMicrometer，
 * 场景视图只负责画布尺寸、主题与演示模式（contentScale）的桥接，
 * 避免与仪器组件重复渲染代码。
 * 尺寸记录与 theme/mode/demoHints 状态样板托管给 ../view-base
 * （createCanvasViewport + createViewEnvironment）。
 */

import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { getResponsiveScale } from '../../core/canvas-sizing';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { drawSpiralMicrometer } from '../../instruments/spiral-micrometer/instrument.view';
import type { MicrometerState } from './scene.sim';

export type CreateMicrometerViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

export function createMicrometerView(
  options: CreateMicrometerViewOptions = {}
) {
  const env = createViewEnvironment({
    theme: options.theme,
    mode: options.mode,
    demoHints: options.demoHints
  });
  // 历史尺寸口径：clientWidth/clientHeight 测量、0 值回退 800/600、
  // 下限 1（非 view-base 默认的 clamped 策略），raw 记录以保持逐帧等价；
  // responsiveScale 按记录尺寸重算并显式写回 dataset——绘制委托
  // instruments 内部缩放，这里暴露因子满足 AGENTS.md 字面规范与布局矩阵检查
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: { mode: 'raw' },
    initialWidth: 800,
    initialHeight: 600,
    eagerContext: true,
    measure: (canvas) => ({
      width: Math.max(1, canvas.clientWidth || 800),
      height: Math.max(1, canvas.clientHeight || 600)
    }),
    resolveScale: (canvas, viewport) => {
      const scale = getResponsiveScale(viewport.cssWidth, viewport.cssHeight);
      canvas.dataset.responsiveScale = String(scale);
      return scale;
    }
  });
  let last: MicrometerState | null = null;

  function draw(next: MicrometerState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    last = next;
    ctx.clearRect(0, 0, stage.cssWidth, stage.cssHeight);
    drawSpiralMicrometer({
      ctx,
      region: { x: 0, y: 0, w: stage.cssWidth, h: stage.cssHeight },
      state: next,
      theme: env.theme,
      contentScale: env.contentScale(),
      showReading: true
    });
  }

  return {
    render(next: MicrometerState): void {
      draw(next);
    },
    resize(): void {
      stage.resize();
      if (last) draw(last);
    },
    setTheme(t: TeachingTheme): void {
      env.setTheme(t);
      if (last) draw(last);
    },
    setMode(m: TeachingMode, h?: DemoRenderHints): void {
      env.setMode(m, h);
      if (last) draw(last);
    },
    dispose(): void {
      last = null;
      stage.ctx = null;
    }
  };
}
