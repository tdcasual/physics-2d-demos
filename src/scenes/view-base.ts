/**
 * 场景视图公共基座（view 工厂样板收敛）
 *
 * 提取各场景 scene.view.ts 中重复的 canvas sizing 与 theme/mode 状态样板：
 * - createCanvasViewport：sizeCanvasToFill 调用、responsiveScale 读取、
 *   尺寸/dpr 记录（主 canvas 与 graph canvas 通用）、首帧 0 尺寸兜底、
 *   attach（换绑 canvas）与 release（dispose 清引用）
 * - createViewEnvironment：theme/mode/demoHints 状态与 presentation
 *   contentScale 计算
 *
 * 采用 opt-in 设计（同 scene-entry-helpers.ts）：场景保留自己的
 * render/resize/setTheme/setMode/dispose 公开接口与绘制逻辑，
 * 仅把记录型状态托管给基座。复杂场景（chase-meet、micrometer 等）
 * 可只使用部分 helper 或完全不使用。
 */

import { sizeCanvasToFill } from '../core/canvas-sizing';
import type { TeachingMode, TeachingTheme } from '../platform/standards';
import type { DemoRenderHints } from '../platform/demo-profile';

/**
 * 尺寸记录策略：
 * - clamped：`Math.max(min, floor(rect || fallback))`，记录值恒 > 0
 *   （wedge / thin-film / interference-formula / electrification /
 *   field-lines / emf-analogy 的历史行为）
 * - raw：原样记录测量值，隐藏容器下可为 0（doppler-effect /
 *   mechanical-wave 的历史行为，其 render 兜底依赖 0 值判据）
 */
export type ViewportSizing =
  | {
      mode: 'clamped';
      /** 测量值为 0（隐藏容器）时的兜底宽度，默认 800 */
      fallbackWidth?: number;
      /** 测量值为 0 时的兜底高度，默认 600 */
      fallbackHeight?: number;
      /** 记录宽度下限，默认 200 */
      minWidth?: number;
      /** 记录高度下限，默认 150 */
      minHeight?: number;
    }
  | { mode: 'raw' };

export type CanvasViewport = {
  /** 当前绑定的 canvas（release 后为 null） */
  canvas: HTMLCanvasElement | null;
  /** 最近一次 resize 建立的 2D 上下文 */
  ctx: CanvasRenderingContext2D | null;
  /** 记录的 CSS 尺寸（resize 时更新，render 热路径不再读 DOM） */
  cssWidth: number;
  cssHeight: number;
  /** 记录的响应式缩放因子（默认读 canvas.dataset.responsiveScale） */
  responsiveScale: number;
  /** 记录的设备像素比 canvas.width / max(1, cssWidth) */
  dpr: number;
  /** 重新测量并应用尺寸（sizeCanvasToFill + 记录） */
  resize(): void;
  /** 首帧兜底：记录尺寸 <= 0（尚未完成首次 sizing）时重测一次 */
  ensureSized(): void;
  /** 换绑 canvas 并立即 resize（attachGraphCanvas 场景） */
  attach(canvas: HTMLCanvasElement): void;
  /** 清空 canvas/ctx 引用（dispose 用） */
  release(): void;
};

export type CanvasViewportOptions = {
  canvas?: HTMLCanvasElement | null;
  /** 尺寸记录策略，默认 clamped（800/600 兜底，200/150 下限） */
  sizing?: ViewportSizing;
  /** 首次 resize 前记录尺寸的初始值，默认 0 */
  initialWidth?: number;
  initialHeight?: number;
  /** 构造时即 canvas.getContext('2d') 建立 ctx（不等首次 resize） */
  eagerContext?: boolean;
  /** 尺寸测量来源，默认 getBoundingClientRect */
  measure?: (canvas: HTMLCanvasElement) => { width: number; height: number };
  /** scale 计算，默认读 canvas.dataset.responsiveScale */
  resolveScale?: (
    canvas: HTMLCanvasElement,
    viewport: CanvasViewport
  ) => number;
};

export function createCanvasViewport(
  options: CanvasViewportOptions = {}
): CanvasViewport {
  const sizing: ViewportSizing = options.sizing ?? { mode: 'clamped' };
  const measure =
    options.measure ??
    ((canvas: HTMLCanvasElement) => {
      const rect = canvas.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });
  const resolveScale =
    options.resolveScale ??
    ((canvas: HTMLCanvasElement) =>
      parseFloat(canvas.dataset.responsiveScale || '1'));

  const viewport: CanvasViewport = {
    canvas: options.canvas ?? null,
    ctx: null,
    cssWidth: options.initialWidth ?? 0,
    cssHeight: options.initialHeight ?? 0,
    responsiveScale: 1,
    dpr: 1,

    resize(): void {
      const canvas = viewport.canvas;
      if (!canvas) return;
      const newCtx = sizeCanvasToFill(canvas);
      if (newCtx) viewport.ctx = newCtx;
      const m = measure(canvas);
      if (sizing.mode === 'raw') {
        viewport.cssWidth = m.width;
        viewport.cssHeight = m.height;
      } else {
        viewport.cssWidth = Math.max(
          sizing.minWidth ?? 200,
          Math.floor(m.width || (sizing.fallbackWidth ?? 800))
        );
        viewport.cssHeight = Math.max(
          sizing.minHeight ?? 150,
          Math.floor(m.height || (sizing.fallbackHeight ?? 600))
        );
      }
      viewport.responsiveScale = resolveScale(canvas, viewport);
      viewport.dpr = canvas.width / Math.max(1, viewport.cssWidth);
    },

    ensureSized(): void {
      if (viewport.cssWidth <= 0 || viewport.cssHeight <= 0) viewport.resize();
    },

    attach(canvas: HTMLCanvasElement): void {
      viewport.canvas = canvas;
      viewport.resize();
    },

    release(): void {
      viewport.canvas = null;
      viewport.ctx = null;
    }
  };

  if (viewport.canvas && options.eagerContext) {
    viewport.ctx = viewport.canvas.getContext('2d');
  }

  return viewport;
}

/** theme/mode/demoHints 状态容器 */
export type ViewEnvironment = {
  theme: TeachingTheme;
  mode: TeachingMode;
  demoHints: DemoRenderHints | undefined;
  setTheme(theme: TeachingTheme): void;
  setMode(mode: TeachingMode, hints?: DemoRenderHints): void;
  /** 演示模式内容放大系数（normal=1，presentation=demoHints.contentScale ?? 1.5） */
  contentScale(): number;
};

export type ViewEnvironmentOptions = {
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

export function createViewEnvironment(
  options: ViewEnvironmentOptions = {}
): ViewEnvironment {
  const env: ViewEnvironment = {
    theme: options.theme ?? 'dark',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints,
    setTheme(theme: TeachingTheme): void {
      env.theme = theme;
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints): void {
      env.mode = mode;
      env.demoHints = hints;
    },
    contentScale(): number {
      return env.mode === 'presentation'
        ? (env.demoHints?.contentScale ?? 1.5)
        : 1;
    }
  };
  return env;
}
