/**
 * 螺旋测微仪 — Canvas 渲染（读数练习模式）
 *
 * 标准读数图样式（参考高中物理习题）：
 * - 固定刻度套筒：水平管状，上方整毫米+下方半毫米，中间水平基准线
 * - 微分筒：套在套筒右侧的圆筒，只显示局部刻度
 * - 微分筒刻度为竖向短线，与水平基准线相交形成"对齐"
 * - 不标红固定刻度读数位置（学生自己判断）
 */

import type { TeachingTheme } from '../../platform/standards';
import { sizeCanvasToFill } from '../../core/canvas-sizing';
import type { MicrometerState } from './scene.sim';

export type CreateMicrometerViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
};

export function createMicrometerView(options: CreateMicrometerViewOptions = {}) {
  const canvas = options.canvas ?? null;
  let ctx: CanvasRenderingContext2D | null = null;
  let theme: TeachingTheme = options.theme ?? 'dark';
  let cssWidth = 800;
  let cssHeight = 600;
  let scale = 1;

  function resizeCanvas(): void {
    if (!canvas) return;
    const newCtx = sizeCanvasToFill(canvas);
    if (newCtx) ctx = newCtx;
    const rect = canvas.getBoundingClientRect();
    cssWidth = Math.max(200, Math.floor(rect.width || 800));
    cssHeight = Math.max(150, Math.floor(rect.height || 600));
    scale = parseFloat(canvas.dataset.responsiveScale || '1');
  }

  function drawScene(next: MicrometerState): void {
    const c = ctx;
    if (!c) return;
    const w = cssWidth;
    const h = cssHeight;
    const isDark = theme === 'dark';
    const text = isDark ? '#e2e8f0' : '#1e293b';
    const dim = isDark ? '#94a3b8' : '#64748b';
    const bg = isDark ? '#0f172a' : '#f8fafc';
    const accent = isDark ? '#38bdf8' : '#0284c7';
    const alignColor = '#ef4444';
    const fontStack = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    c.clearRect(0, 0, w, h);
    c.fillStyle = bg;
    c.fillRect(0, 0, w, h);

    c.save();
    c.lineWidth = 1 * scale;

    const centerY = h * 0.42;
    const mmToPx = 55 * scale;

    const { reading, mainScaleReading, drumReading } = next;

    // ============================================================
    // 固定刻度套筒：显示 reading 附近 ±2mm 的局部窗口
    // ============================================================
    const windowCenterMm = Math.floor(reading);
    const windowStartMm = Math.max(0, windowCenterMm - 2);
    const windowEndMm = windowCenterMm + 3;
    const windowLenMm = windowEndMm - windowStartMm;
    const sleeveW = windowLenMm * mmToPx;
    const sleeveH = 55 * scale;
    const sleeveX = (w - sleeveW) / 2;
    const sleeveY = centerY - sleeveH / 2;

    // 套筒背景
    c.fillStyle = isDark ? '#e2e8f0' : '#f1f5f9';
    c.fillRect(sleeveX, sleeveY, sleeveW, sleeveH);

    // 套筒边框
    c.strokeStyle = text;
    c.lineWidth = 2 * scale;
    c.strokeRect(sleeveX, sleeveY, sleeveW, sleeveH);

    // 套筒刻度
    c.fillStyle = text;
    c.textAlign = 'center';
    c.font = `bold ${Math.max(12, 16 * scale)}px ${fontStack}`;
    const tickLong = 20 * scale;
    const tickShort = 14 * scale;

    for (let mm = windowStartMm; mm <= windowEndMm; mm++) {
      const x = sleeveX + (mm - windowStartMm) * mmToPx;
      // 整毫米：上排长刻度 + 数字
      c.strokeStyle = text;
      c.lineWidth = 2.5 * scale;
      c.beginPath();
      c.moveTo(x, sleeveY);
      c.lineTo(x, sleeveY + tickLong);
      c.stroke();
      c.fillText(String(mm), x, sleeveY - 10 * scale);

      // 半毫米：下排短刻度
      if (mm < windowEndMm) {
        const halfX = x + mmToPx / 2;
        c.lineWidth = 2 * scale;
        c.beginPath();
        c.moveTo(halfX, sleeveY + sleeveH);
        c.lineTo(halfX, sleeveY + sleeveH - tickShort);
        c.stroke();
      }
    }

    // ============================================================
    // 水平基准线（套筒中间的标准水平线，黑色）
    // ============================================================
    const refLineY = centerY;
    c.strokeStyle = text;
    c.lineWidth = 2 * scale;
    c.beginPath();
    c.moveTo(sleeveX, refLineY);
    c.lineTo(sleeveX + sleeveW + 15 * scale, refLineY);
    c.stroke();

    // ============================================================
    // 微分筒：套在套筒右侧的圆筒侧视图
    // 上下边缘比套筒宽，左端垂直，右端半圆
    // ============================================================
    const thimbleExtra = 14 * scale;
    const thimbleW = 110 * scale;
    const thimbleH = sleeveH + thimbleExtra * 2;
    const thimbleX = sleeveX + sleeveW - 10 * scale;
    const thimbleY = centerY - thimbleH / 2;

    // 微分筒背景
    c.fillStyle = isDark ? '#cbd5e1' : '#e2e8f0';
    c.fillRect(thimbleX, thimbleY, thimbleW, thimbleH);

    // 微分筒左端垂直线
    c.strokeStyle = text;
    c.lineWidth = 2 * scale;
    c.beginPath();
    c.moveTo(thimbleX, thimbleY);
    c.lineTo(thimbleX, thimbleY + thimbleH);
    c.stroke();

    // 微分筒右端半圆
    c.beginPath();
    c.arc(thimbleX + thimbleW, centerY, thimbleH / 2, -Math.PI / 2, Math.PI / 2);
    c.fill();
    c.stroke();

    // 微分筒上边缘
    c.beginPath();
    c.moveTo(thimbleX, thimbleY);
    c.lineTo(thimbleX + thimbleW, thimbleY);
    c.stroke();

    // 微分筒下边缘
    c.beginPath();
    c.moveTo(thimbleX, thimbleY + thimbleH);
    c.lineTo(thimbleX + thimbleW, thimbleY + thimbleH);
    c.stroke();

    // ============================================================
    // 微分筒局部刻度：竖向短线，沿水平方向均匀排列
    // 只显示对齐位置附近 ±10 格（共约21条刻度线）
    // ============================================================
    const drumInt = Math.floor(drumReading);
    const displayRange = 10;

    // 刻度区域：微分筒内部的水平范围
    const scaleLeft = thimbleX + 18 * scale;
    const scaleRight = thimbleX + thimbleW - 10 * scale;
    const visibleTicks = displayRange * 2;
    const tickSpacing = (scaleRight - scaleLeft) / visibleTicks;

    for (let offset = -displayRange; offset <= displayRange; offset++) {
      const k = drumInt + offset;
      if (k < 0 || k > 50) continue;

      const x = scaleLeft + (offset + displayRange) * tickSpacing;

      const isAligned = offset === 0;
      const tickLen = isAligned ? 22 * scale : offset % 5 === 0 ? 16 * scale : 10 * scale;

      if (isAligned) {
        c.strokeStyle = alignColor;
        c.lineWidth = 2.5 * scale;
      } else {
        c.strokeStyle = text;
        c.lineWidth = 1.5 * scale;
      }

      // 竖向刻度线：与水平基准线相交
      c.beginPath();
      c.moveTo(x, refLineY - tickLen / 2);
      c.lineTo(x, refLineY + tickLen / 2);
      c.stroke();

      // 数字标注：只标0、5、10、15...和对齐格
      if (isAligned || k % 5 === 0) {
        if (isAligned) {
          c.fillStyle = alignColor;
          c.font = `bold ${Math.max(12, 16 * scale)}px ${fontStack}`;
        } else {
          c.fillStyle = text;
          c.font = `${Math.max(10, 13 * scale)}px ${fontStack}`;
        }
        c.textAlign = 'center';
        // 数字放在刻度线上方或下方，避免重叠
        const labelY = offset <= -5
          ? refLineY - tickLen / 2 - 6 * scale
          : offset >= 5
            ? refLineY + tickLen / 2 + 16 * scale
            : refLineY + tickLen / 2 + 16 * scale;
        c.fillText(String(k), x, labelY);
      }
    }

    // ============================================================
    // 读数大显示
    // ============================================================
    const readoutY = h * 0.72;
    c.fillStyle = accent;
    c.font = `bold ${Math.max(24, 40 * scale)}px ${fontStack}`;
    c.textAlign = 'center';
    c.fillText(`${reading.toFixed(3)} mm`, w / 2, readoutY);

    c.fillStyle = dim;
    c.font = `${Math.max(12, 16 * scale)}px ${fontStack}`;
    const drumInt2 = Math.floor(drumReading);
    const drumEst = (drumReading - drumInt2).toFixed(1).replace(/^0/, '');
    c.fillText(
      `${mainScaleReading.toFixed(1)} mm + ${drumInt2}${drumEst} × 0.01 mm = ${reading.toFixed(3)} mm`,
      w / 2,
      readoutY + 36 * scale
    );

    c.restore();
  }

  return {
    render(next: MicrometerState): void {
      resizeCanvas();
      drawScene(next);
    },
    resize(): void {
      resizeCanvas();
    },
    setTheme(t: TeachingTheme): void {
      theme = t;
    },
    setMode(): void {},
    dispose(): void {
      ctx = null;
    }
  };
}
