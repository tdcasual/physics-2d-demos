/**
 * 双缝干涉 — Canvas 渲染
 *
 * 动画区以图形为主，文字极简。
 * 计算结果通过 getReadoutItems 输出到数据读数区。
 *
 * 绘制实现已拆分至 renderer/ 子模块：
 * - renderer/draw-phases.ts       主画布公共几何结构 + 四阶段绘制
 * - renderer/draw-fringe-graph.ts 图表区干涉条纹（常驻）
 * - renderer/view-utils.ts        drawArrowLine 通用工具
 * - renderer/types.ts             绘制参数类型
 */

import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { wavelengthToColor } from '../../core/wavelength';
import type { InterferenceFormulaState } from './scene.sim';
import {
  drawGeometryBase,
  drawGeometryPhase,
  drawPathDiffPhase,
  drawSmallAnglePhase,
  drawResultPhase
} from './renderer/draw-phases';
import { drawFringeGraph } from './renderer/draw-fringe-graph';

export { wavelengthToColor };

export type CreateInterferenceFormulaViewOptions = {
  canvas?: HTMLCanvasElement;
  graphCanvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

export function createInterferenceFormulaView(
  options: CreateInterferenceFormulaViewOptions = {}
) {
  const env = createViewEnvironment({
    theme: options.theme,
    mode: options.mode,
    demoHints: options.demoHints
  });
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    initialWidth: 800,
    initialHeight: 600
  });
  const graph = createCanvasViewport({
    canvas: options.graphCanvas ?? null
  });
  let state: InterferenceFormulaState | null = null;

  function drawScene(next: InterferenceFormulaState): void {
    const c = stage.ctx;
    if (!c) return;
    const w = stage.cssWidth;
    const h = stage.cssHeight;
    const scale = stage.responsiveScale;
    // 演示模式内容放大系数（normal=1，presentation=renderHints.contentScale）
    const modeScale = env.contentScale();
    const isDark = env.theme === 'dark';
    const text = isDark ? '#e2e8f0' : '#1e293b';
    const dim = isDark ? '#94a3b8' : '#64748b';
    const accent = wavelengthToColor(next.params.lambda);

    // DPR-aware clear: pixel-space fillRect before setTransform
    const dpr = c.canvas ? c.canvas.width / Math.max(1, w) : 1;
    c.clearRect(0, 0, c.canvas?.width ?? w, c.canvas?.height ?? h);
    c.fillStyle = isDark ? '#0f172a' : '#f8fafc';
    c.fillRect(0, 0, c.canvas?.width ?? w, c.canvas?.height ?? h);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);

    const step = next.params.step;
    const screenX = w * 0.86;
    const centerY = h * 0.44;
    const screenTop = h * 0.04;
    const screenBot = h * 0.84;

    // L → plateX: larger L pushes slit plate left, filling the canvas
    const { L, d } = next.params;
    const lNorm = Math.max(0, Math.min(1, (L - 0.5) / 2.5));
    const minX = w * 0.06;
    const maxX = screenX - 60 * scale;
    const plateX = maxX - lNorm * (maxX - minX);

    // d → slitGap: larger d widens the gap
    const dNorm = Math.max(0, Math.min(1, (d - 0.1) / 0.9));
    const slitGap = (20 + 60 * dNorm) * scale;
    const slitTop = centerY - slitGap / 2;
    const slitBot = centerY + slitGap / 2;

    // Δx → pY: larger Δx moves P further from center
    const defaultDeltaX = (650e-9 * 1.0) / 0.5e-3;
    const screenRange = (screenBot - screenTop) * 0.35;
    const pOffset =
      Math.min(1, next.deltaX / (3 * defaultDeltaX)) * screenRange;
    const pY = centerY - pOffset;

    // ── 公共几何结构 ──
    drawGeometryBase(c, {
      text,
      dim,
      accent,
      plateX,
      screenX,
      centerY,
      slitTop,
      slitBot,
      screenTop,
      screenBot,
      pY,
      scale,
      modeScale
    });

    // ── 阶段特定内容（极简文字）──
    if (step === 'geometry') {
      drawGeometryPhase(c, {
        w,
        h,
        text,
        dim,
        accent,
        plateX,
        screenX,
        centerY,
        slitTop,
        slitBot,
        pY,
        scale,
        modeScale,
        params: next.params
      });
    } else if (step === 'path-diff') {
      drawPathDiffPhase(c, {
        w,
        h,
        text,
        dim,
        accent,
        plateX,
        screenX,
        centerY,
        slitTop,
        slitBot,
        pY,
        scale,
        modeScale,
        params: next.params,
        deltaX: next.deltaX
      });
    } else if (step === 'small-angle') {
      drawSmallAnglePhase(c, {
        w,
        h,
        text,
        dim,
        accent,
        plateX,
        screenX,
        centerY,
        slitTop,
        slitBot,
        screenTop,
        screenBot,
        pY,
        scale,
        modeScale,
        params: next.params,
        deltaX: next.deltaX
      });
    } else if (step === 'result') {
      drawResultPhase(c, {
        w,
        h,
        text,
        dim,
        accent,
        plateX,
        screenX,
        centerY,
        slitTop,
        slitBot,
        pY,
        scale,
        modeScale,
        params: next.params,
        deltaX: next.deltaX
      });
    }

    // ── 图表区：干涉条纹始终显示 ──
    drawFringeGraph(graph.ctx, graph.canvas, next, modeScale, env.theme);
  }

  return {
    render(next: InterferenceFormulaState): void {
      state = next;
      drawScene(next);
    },
    resize(): void {
      stage.resize();
      graph.resize();
      if (state) drawScene(state);
    },
    setMode(next: TeachingMode, hints?: DemoRenderHints): void {
      env.setMode(next, hints);
      if (state) drawScene(state);
    },
    setTheme(next: TeachingTheme): void {
      env.setTheme(next);
      if (state) drawScene(state);
    },
    attachGraphCanvas(canvas: HTMLCanvasElement): void {
      graph.attach(canvas);
      if (state) drawScene(state);
    },
    dispose(): void {
      state = null;
      stage.release();
      graph.release();
    }
  };
}
