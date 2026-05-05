/**
 * 仪器组件库 — 视口管理工具
 *
 * 提供 Canvas 视口裁剪和坐标变换的辅助函数。
 * 组合场景使用：一个 Canvas 上绘制多个仪器时，
 * 每个仪器通过 withViewport 在独立区域内绘制。
 */

import type { InstrumentViewport } from '../_contract/instrument-contract';

/**
 * 在 Canvas 上应用仪器视口。
 *
 * 执行 callback 时：
 * - 坐标系已变换到视口局部坐标（左上角为原点）
 * - 绘制被裁剪到视口区域内（超出部分不可见）
 * - 调用后自动恢复 Canvas 状态（ctx.restore）
 *
 * @param ctx       Canvas 2D 上下文
 * @param viewport  仪器绘制区域（undefined 时使用整个画布）
 * @param callback  绘制回调，接收局部区域的宽度和高度
 *
 * @example
 * ```ts
 * withViewport(ctx, viewport, (w, h) => {
 *   // 此时 (0, 0) 是视口左上角，(w, h) 是视口右下角
 *   const centerX = w / 2;
 *   const centerY = h / 2;
 *   ctx.fillRect(centerX - 50, centerY - 50, 100, 100);
 * });
 * ```
 */
export function withViewport(
  ctx: CanvasRenderingContext2D,
  viewport: InstrumentViewport | undefined,
  callback: (localWidth: number, localHeight: number) => void
): void {
  ctx.save();

  try {
    if (viewport) {
      const { x, y, width, height } = viewport;

      // 裁剪到视口区域，防止绘制溢出
      ctx.beginPath();
      ctx.rect(x, y, width, height);
      ctx.clip();

      // 变换坐标系：视口左上角变为 (0, 0)
      ctx.translate(x, y);

      callback(width, height);
    } else {
      // 无显式视口时使用整个画布
      const canvas = ctx.canvas;
      callback(canvas.width, canvas.height);
    }
  } finally {
    ctx.restore();
  }
}

/**
 * 将相对视口（0~1 比例）转换为绝对像素坐标。
 *
 * 组合场景布局时常用：
 * ```ts
 * const vp = toAbsoluteViewport(canvas, { x: 0, y: 0, width: 0.5, height: 1 });
 * // vp = { x: 0, y: 0, width: 400, height: 600 }（假设画布 800x600）
 * ```
 */
export function toAbsoluteViewport(
  canvas: HTMLCanvasElement,
  relative: { x: number; y: number; width: number; height: number }
): InstrumentViewport {
  const w = canvas.width;
  const h = canvas.height;
  return {
    x: relative.x * w,
    y: relative.y * h,
    width: relative.width * w,
    height: relative.height * h,
  };
}
