/**
 * 游标卡尺 — Canvas 渲染（教科书标准结构）
 *
 * 标准构造（人教版 2019 必修第三册 §11.3）：
 * - 主尺（固定钢尺）
 * - 游标尺（套在主尺外侧滑动）
 * - 内测量爪（上端，刀口状，向内）
 * - 外测量爪（下端，平直，向外）
 * - 深度尺（固定在游标尺尾部）
 * - 紧固螺钉（锁定游标尺）
 */

import type { TeachingTheme } from '../../platform/standards';
import { sizeCanvasToFill } from '../../core/canvas-sizing';
import type { CaliperState } from './scene.sim';

export type CreateCaliperViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
};

export function createVernierCaliperView(options: CreateCaliperViewOptions = {}) {
  let canvas = options.canvas ?? null;
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

  function drawScene(next: CaliperState): void {
    const c = ctx;
    if (!c) return;
    const w = cssWidth;
    const h = cssHeight;
    const isDark = theme === 'dark';
    const text = isDark ? '#e2e8f0' : '#1e293b';
    const dim = isDark ? '#94a3b8' : '#64748b';
    const bg = isDark ? '#0f172a' : '#f8fafc';
    const accent = isDark ? '#38bdf8' : '#0284c7';
    const measureColor = '#ef4444';
    const metalDark = isDark ? '#475569' : '#64748b';
    const metalMain = isDark ? '#334155' : '#94a3b8';
    const metalLight = isDark ? '#cbd5e1' : '#e2e8f0';

    c.clearRect(0, 0, w, h);
    c.fillStyle = bg;
    c.fillRect(0, 0, w, h);

    c.save();
    c.lineWidth = 1 * scale;
    c.font = `${Math.max(10, 12 * scale)}px sans-serif`;

    const mmToPx = 8 * scale;
    const mainScaleStartX = w * 0.08;
    const mainScaleLen = 50 * mmToPx;
    const mainScaleH = 26 * scale;
    const mainScaleY = h * 0.32;

    const { jawPosition, objectSize, objectName, mainScaleReading, vernierAlignment, totalReading, vernierDivisions, vernierLength } = next;
    const precision = next.params.precision;

    const vernierW = vernierLength * mmToPx;
    const vernierH = 24 * scale;
    const vernierZeroX = mainScaleStartX + jawPosition * mmToPx;
    const vernierX = vernierZeroX;
    const vernierY = mainScaleY - 6 * scale;

    const jawW = 5 * scale;
    const upperJawH = 20 * scale;
    const lowerJawH = 28 * scale;

    // ============================================================
    // 1. 深度尺（游标尺尾部伸出，先画避免遮挡）
    // ============================================================
    const depthW = 4 * scale;
    const depthLen = 35 * scale;
    const depthX = vernierX + vernierW;
    const depthY = mainScaleY + mainScaleH;
    c.fillStyle = metalLight;
    c.fillRect(depthX, depthY, depthW, depthLen);
    c.strokeStyle = text;
    c.lineWidth = 1 * scale;
    c.strokeRect(depthX, depthY, depthW, depthLen);

    // ============================================================
    // 2. 主尺体
    // ============================================================
    c.fillStyle = metalMain;
    c.fillRect(mainScaleStartX, mainScaleY, mainScaleLen, mainScaleH);
    c.strokeStyle = text;
    c.lineWidth = 1.5 * scale;
    c.strokeRect(mainScaleStartX, mainScaleY, mainScaleLen, mainScaleH);

    // ============================================================
    // 3. 主尺刻度（向下画：从主尺下边缘向上画刻度线）
    // ============================================================
    c.strokeStyle = text;
    c.fillStyle = text;
    c.textAlign = 'center';
    c.font = `${Math.max(8, 10 * scale)}px sans-serif`;
    for (let mm = 0; mm <= 80; mm++) {
      const x = mainScaleStartX + mm * mmToPx;
      if (x > mainScaleStartX + mainScaleLen) break;
      const tickH = mm % 10 === 0 ? 12 * scale : mm % 5 === 0 ? 8 * scale : 5 * scale;
      c.lineWidth = mm % 10 === 0 ? 1.5 * scale : 1 * scale;
      c.beginPath();
      c.moveTo(x, mainScaleY + mainScaleH);
      c.lineTo(x, mainScaleY + mainScaleH - tickH);
      c.stroke();
      if (mm % 10 === 0 && mm < 80) {
        c.fillText(String(mm), x, mainScaleY + mainScaleH - tickH - 3 * scale);
      }
    }

    // ============================================================
    // 4. 主尺上的测量爪
    // ============================================================
    // 4a. 下外测量爪（平直，向下延伸）
    c.fillStyle = metalDark;
    c.fillRect(mainScaleStartX - jawW, mainScaleY + mainScaleH, jawW, lowerJawH);
    c.strokeStyle = text;
    c.lineWidth = 1 * scale;
    c.strokeRect(mainScaleStartX - jawW, mainScaleY + mainScaleH, jawW, lowerJawH);

    // 4b. 上内测量爪（刀口状，向内弯曲）
    c.fillStyle = metalDark;
    c.fillRect(mainScaleStartX - jawW, mainScaleY - upperJawH, jawW, upperJawH);
    c.strokeRect(mainScaleStartX - jawW, mainScaleY - upperJawH, jawW, upperJawH);
    // 刀口（向内弯曲：向右）
    c.beginPath();
    c.moveTo(mainScaleStartX, mainScaleY - upperJawH);
    c.lineTo(mainScaleStartX + 5 * scale, mainScaleY - upperJawH + 3 * scale);
    c.lineTo(mainScaleStartX + 5 * scale, mainScaleY - upperJawH + 9 * scale);
    c.lineTo(mainScaleStartX, mainScaleY - upperJawH + 12 * scale);
    c.closePath();
    c.fill();
    c.stroke();

    // ============================================================
    // 5. 游标尺体（套在主尺上方）
    // ============================================================
    c.fillStyle = metalLight;
    c.fillRect(vernierX, vernierY, vernierW, vernierH);
    c.strokeStyle = text;
    c.lineWidth = 1.5 * scale;
    c.strokeRect(vernierX, vernierY, vernierW, vernierH);

    // ============================================================
    // 7. 游标尺刻度（向下画）
    // ============================================================
    c.strokeStyle = text;
    c.fillStyle = text;
    c.font = `${Math.max(7, 9 * scale)}px sans-serif`;
    for (let k = 0; k <= vernierDivisions; k++) {
      const x = vernierX + k * (vernierLength / vernierDivisions) * mmToPx;
      const tickH = k % 5 === 0 ? 10 * scale : 6 * scale;
      c.lineWidth = k % 5 === 0 ? 1.2 * scale : 0.8 * scale;
      c.beginPath();
      c.moveTo(x, vernierY + vernierH);
      c.lineTo(x, vernierY + vernierH - tickH);
      c.stroke();

      // 对齐格高亮
      if (k === vernierAlignment) {
        c.strokeStyle = measureColor;
        c.lineWidth = 2.5 * scale;
        c.beginPath();
        c.moveTo(x, vernierY + vernierH);
        c.lineTo(x, vernierY + vernierH - 16 * scale);
        c.stroke();
        c.strokeStyle = text;
      }

      if (k % 5 === 0 && k < vernierDivisions) {
        c.fillText(String(k), x, vernierY + vernierH - tickH - 3 * scale);
      }
    }

    // ============================================================
    // 8. 游标尺零刻度线高亮（红色）
    // ============================================================
    c.strokeStyle = measureColor;
    c.lineWidth = 2 * scale;
    c.beginPath();
    c.moveTo(vernierX, vernierY);
    c.lineTo(vernierX, vernierY + vernierH);
    c.stroke();
    c.fillStyle = measureColor;
    c.font = `bold ${Math.max(8, 10 * scale)}px sans-serif`;
    c.fillText('0', vernierX, vernierY - 4 * scale);

    // ============================================================
    // 9. 游标尺上的测量爪
    // ============================================================
    // 9a. 下外测量爪
    c.fillStyle = metalDark;
    c.fillRect(vernierX - jawW, vernierY + vernierH, jawW, lowerJawH);
    c.strokeStyle = text;
    c.lineWidth = 1 * scale;
    c.strokeRect(vernierX - jawW, vernierY + vernierH, jawW, lowerJawH);

    // 9b. 上内测量爪（刀口状，向内弯曲）
    c.fillStyle = metalDark;
    c.fillRect(vernierX - jawW, vernierY - upperJawH, jawW, upperJawH);
    c.strokeRect(vernierX - jawW, vernierY - upperJawH, jawW, upperJawH);
    // 刀口（向内弯曲：向左）
    c.beginPath();
    c.moveTo(vernierX, vernierY - upperJawH);
    c.lineTo(vernierX - 5 * scale, vernierY - upperJawH + 3 * scale);
    c.lineTo(vernierX - 5 * scale, vernierY - upperJawH + 9 * scale);
    c.lineTo(vernierX, vernierY - upperJawH + 12 * scale);
    c.closePath();
    c.fill();
    c.stroke();

    // ============================================================
    // 被测物（夹在下外测量爪之间，最后画避免被遮挡）
    // ============================================================
    const objectCenterX = (mainScaleStartX + vernierX) / 2;
    const objectY = mainScaleY + mainScaleH + lowerJawH / 2;

    if (objectName.includes('小球')) {
      const ballR = Math.min((objectSize / 2) * mmToPx, lowerJawH * 0.4);
      c.fillStyle = measureColor;
      c.beginPath();
      c.arc(objectCenterX, objectY, ballR, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = text;
      c.lineWidth = 1 * scale;
      c.stroke();
    } else if (objectName.includes('金属块')) {
      const blockW = Math.min(objectSize * mmToPx, vernierX - mainScaleStartX - 2 * scale);
      const blockH = Math.min(16 * scale, lowerJawH - 4 * scale);
      c.fillStyle = measureColor;
      c.fillRect(objectCenterX - blockW / 2, objectY - blockH / 2, blockW, blockH);
      c.strokeStyle = text;
      c.lineWidth = 1 * scale;
      c.strokeRect(objectCenterX - blockW / 2, objectY - blockH / 2, blockW, blockH);
    } else {
      // 圆管外径
      const tubeOuterR = Math.min((objectSize / 2 + 2) * mmToPx, lowerJawH * 0.4);
      c.fillStyle = measureColor;
      c.beginPath();
      c.arc(objectCenterX, objectY, tubeOuterR, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = bg;
      c.beginPath();
      c.arc(objectCenterX, objectY, (objectSize / 2) * mmToPx, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = text;
      c.lineWidth = 1 * scale;
      c.beginPath();
      c.arc(objectCenterX, objectY, tubeOuterR, 0, Math.PI * 2);
      c.stroke();
    }

    // ============================================================
    // 10. 紧固螺钉
    // ============================================================
    const screwR = 5 * scale;
    const screwX = vernierX + vernierW * 0.65;
    const screwY = vernierY - 12 * scale;
    c.fillStyle = isDark ? '#1e293b' : '#475569';
    c.beginPath();
    c.arc(screwX, screwY, screwR, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = text;
    c.lineWidth = 1 * scale;
    c.stroke();
    // 螺钉槽（一字）
    c.strokeStyle = isDark ? '#64748b' : '#1e293b';
    c.lineWidth = 1.5 * scale;
    c.beginPath();
    c.moveTo(screwX - screwR * 0.6, screwY);
    c.lineTo(screwX + screwR * 0.6, screwY);
    c.stroke();

    // ============================================================
    // 11. 部件标注
    // ============================================================
    c.fillStyle = dim;
    c.font = `${Math.max(8, 10 * scale)}px sans-serif`;
    c.textAlign = 'right';
    c.fillText('内测量爪', mainScaleStartX - jawW - 4 * scale, mainScaleY - upperJawH / 2 + 3 * scale);
    c.textAlign = 'left';
    c.fillText('外测量爪', mainScaleStartX - jawW - 4 * scale, mainScaleY + mainScaleH + lowerJawH / 2 + 3 * scale);
    c.textAlign = 'center';
    c.fillText('深度尺', depthX + depthW / 2, depthY + depthLen + 14 * scale);
    c.fillText('紧固螺钉', screwX, screwY - screwR - 6 * scale);

    // ============================================================
    // 12. 读数显示
    // ============================================================
    const readoutY = h * 0.72;
    c.fillStyle = accent;
    c.font = `bold ${Math.max(18, 28 * scale)}px sans-serif`;
    c.textAlign = 'center';
    const precisionDecimals = precision === 0.1 ? 1 : 2;
    c.fillText(`${totalReading.toFixed(precisionDecimals)} mm`, w / 2, readoutY);

    c.fillStyle = dim;
    c.font = `${Math.max(11, 14 * scale)}px sans-serif`;
    c.fillText(
      `主尺: ${mainScaleReading} mm + 游标: ${vernierAlignment} × ${precision} mm = ${totalReading.toFixed(precisionDecimals)} mm`,
      w / 2,
      readoutY + 28 * scale
    );

    c.fillStyle = text;
    c.font = `${Math.max(10, 13 * scale)}px sans-serif`;
    c.fillText(`测量对象: ${objectName}   精度: ${precision} mm`, w / 2, readoutY + 52 * scale);

    c.restore();
  }

  return {
    render(next: CaliperState): void {
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
    dispose(): void {}
  };
}
