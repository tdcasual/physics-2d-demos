/**
 * 螺旋测微器（千分尺）— 场景渲染
 *
 * 结构参照人教版高中物理：固定刻度套筒（上排整毫米 + 下排半毫米 +
 * 水平基准线）+ 可旋转微分筒（0–50 分度，估读一位）。
 *
 * drawSpiralMicrometer 纯绘制函数，供 scene.view.ts 调用（原
 * instruments/spiral-micrometer 仪器的渲染代码；该仪器组件已移除，
 * 场景渲染收归场景自身）。
 */

import type { TeachingTheme } from '../../platform/standards';

type Pal = {
  isDark: boolean;
  metalLight: string;
  metalMid: string;
  metalDark: string;
  edge: string;
  tick: string;
  tickNum: string;
  ref: string;
  align: string;
  alignGlow: string;
  text: string;
  dim: string;
  panelBg: string;
  panelBorder: string;
};

function palette(theme: TeachingTheme): Pal {
  const isDark = theme === 'dark';
  return {
    isDark,
    metalLight: isDark ? '#cbd5e1' : '#f8fafc',
    metalMid: isDark ? '#94a3b8' : '#cbd5e1',
    metalDark: isDark ? '#64748b' : '#94a3b8',
    edge: isDark ? '#475569' : '#64748b',
    tick: isDark ? '#1e293b' : '#334155',
    tickNum: isDark ? '#0f172a' : '#1e293b',
    ref: isDark ? '#0f172a' : '#1e293b',
    align: isDark ? '#fbbf24' : '#e11d48',
    alignGlow: isDark ? 'rgba(251,191,36,0.55)' : 'rgba(225,29,72,0.45)',
    text: isDark ? '#e2e8f0' : '#1e293b',
    dim: isDark ? '#94a3b8' : '#64748b',
    panelBg: isDark ? 'rgba(15,23,42,0.78)' : 'rgba(255,255,255,0.9)',
    panelBorder: isDark ? 'rgba(148,163,184,0.28)' : 'rgba(100,116,139,0.22)'
  };
}

const FONT = '"Noto Sans SC", system-ui, sans-serif';

/** 绘制所需的最小读数结构（组件完整 state 与场景 state 均满足） */
export type SpiralMicrometerReading = {
  reading: number;
  mainScaleReading: number;
  drumReading: number;
};

export type SpiralMicrometerDrawOptions = {
  ctx: CanvasRenderingContext2D;
  /** 绘制区域（像素）；函数内部据此自适应缩放，嵌入式/整页通用 */
  region: { x: number; y: number; w: number; h: number };
  state: SpiralMicrometerReading;
  theme: TeachingTheme;
  /** 演示模式内容放大系数（normal=1） */
  contentScale?: number;
  /** 是否绘制底部大读数面板（嵌入式仪器可关闭） */
  showReading?: boolean;
};

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawSpiralMicrometer(o: SpiralMicrometerDrawOptions): void {
  const { ctx, region, state, theme } = o;
  const contentScale = o.contentScale ?? 1;
  const showReading = o.showReading ?? true;
  const P = palette(theme);

  // 区域自适应缩放（短边 / 参考值，clamp 0.3..1.5）
  const s = Math.max(0.3, Math.min(1.5, Math.min(region.w, region.h) / 360));
  const fs = s * contentScale; // 字体/读数放大

  const { w, h } = region;
  const ox = region.x;
  const oy = region.y;

  const centerY = oy + h * (showReading ? 0.4 : 0.5);

  const { reading, mainScaleReading, drumReading } = state;

  ctx.save();
  ctx.beginPath();
  ctx.rect(ox, oy, w, h);
  ctx.clip();

  // 局部窗口：reading 附近
  const windowCenterMm = Math.floor(reading);
  const windowStartMm = Math.max(0, windowCenterMm - 2);
  const windowEndMm = windowCenterMm + 3;
  const windowLenMm = windowEndMm - windowStartMm;

  // 微分筒尺寸提前算，以便"整机"（套筒+微分筒）适配画布宽度，
  // 避免移动端右侧出界
  const thimbleExtra = 15 * s;
  const thimbleW = 120 * s;
  const thimbleOverlap = 12 * s;
  const margin = Math.max(8, 12 * s);
  const fitMmToPx = (w - 2 * margin - thimbleW + thimbleOverlap) / windowLenMm;
  const mmToPx = Math.max(20 * s, Math.min(58 * s, fitMmToPx));
  const sleeveW = windowLenMm * mmToPx;
  const sleeveH = 60 * s;
  const fullW = sleeveW + thimbleW - thimbleOverlap;
  const sleeveX = ox + Math.max(margin, (w - fullW) / 2);
  const sleeveY = centerY - sleeveH / 2;

  // 套筒金属渐变
  const sleeveGrad = ctx.createLinearGradient(0, sleeveY, 0, sleeveY + sleeveH);
  sleeveGrad.addColorStop(0, P.metalMid);
  sleeveGrad.addColorStop(0.18, P.metalLight);
  sleeveGrad.addColorStop(0.5, P.metalMid);
  sleeveGrad.addColorStop(0.82, P.metalLight);
  sleeveGrad.addColorStop(1, P.metalDark);
  ctx.fillStyle = sleeveGrad;
  roundRect(ctx, sleeveX, sleeveY, sleeveW, sleeveH, 4 * s);
  ctx.fill();
  ctx.strokeStyle = P.edge;
  ctx.lineWidth = 1.5 * s;
  ctx.stroke();

  // 固定刻度
  const tickLong = 20 * s;
  const tickShort = 13 * s;
  ctx.textAlign = 'center';
  for (let mm = windowStartMm; mm <= windowEndMm; mm += 1) {
    const x = sleeveX + (mm - windowStartMm) * mmToPx;
    // 整毫米：上排长刻度 + 数字
    ctx.strokeStyle = P.tick;
    ctx.lineWidth = 2.4 * s;
    ctx.beginPath();
    ctx.moveTo(x, sleeveY + 2 * s);
    ctx.lineTo(x, sleeveY + 2 * s + tickLong);
    ctx.stroke();
    ctx.fillStyle = P.tickNum;
    ctx.font = `700 ${Math.max(11, 15 * fs)}px ${FONT}`;
    ctx.textBaseline = 'bottom';
    ctx.fillText(String(mm), x, sleeveY - 4 * s);
    // 半毫米：下排短刻度
    if (mm < windowEndMm) {
      const halfX = x + mmToPx / 2;
      ctx.strokeStyle = P.tick;
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.moveTo(halfX, sleeveY + sleeveH - 2 * s);
      ctx.lineTo(halfX, sleeveY + sleeveH - 2 * s - tickShort);
      ctx.stroke();
    }
  }

  // 水平基准线
  ctx.strokeStyle = P.ref;
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(sleeveX, centerY);
  ctx.lineTo(sleeveX + sleeveW + 18 * s, centerY);
  ctx.stroke();

  // 微分筒（金属圆筒侧视，右端半圆）
  const thimbleH = sleeveH + thimbleExtra * 2;
  const thimbleX = sleeveX + sleeveW - thimbleOverlap;
  const thimbleY = centerY - thimbleH / 2;

  const thGrad = ctx.createLinearGradient(0, thimbleY, 0, thimbleY + thimbleH);
  thGrad.addColorStop(0, P.metalDark);
  thGrad.addColorStop(0.25, P.metalLight);
  thGrad.addColorStop(0.5, P.metalMid);
  thGrad.addColorStop(0.75, P.metalLight);
  thGrad.addColorStop(1, P.metalDark);
  ctx.fillStyle = thGrad;
  ctx.beginPath();
  ctx.moveTo(thimbleX, thimbleY);
  ctx.lineTo(thimbleX + thimbleW, thimbleY);
  ctx.arc(
    thimbleX + thimbleW,
    centerY,
    thimbleH / 2,
    -Math.PI / 2,
    Math.PI / 2
  );
  ctx.lineTo(thimbleX, thimbleY + thimbleH);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = P.edge;
  ctx.lineWidth = 1.5 * s;
  ctx.stroke();
  // 左端接缝线
  ctx.beginPath();
  ctx.moveTo(thimbleX, thimbleY);
  ctx.lineTo(thimbleX, thimbleY + thimbleH);
  ctx.stroke();

  // 微分筒分度（竖向短线，对齐格高亮）
  const drumInt = Math.floor(drumReading);
  const displayRange = 10;
  const scaleLeft = thimbleX + 20 * s;
  const scaleRight = thimbleX + thimbleW - 6 * s;
  const visibleTicks = displayRange * 2;
  const tickSpacing = (scaleRight - scaleLeft) / visibleTicks;

  for (let offset = -displayRange; offset <= displayRange; offset += 1) {
    const k = drumInt + offset;
    if (k < 0 || k > 50) continue;
    const x = scaleLeft + (offset + displayRange) * tickSpacing;
    const isAligned = offset === 0;
    const tickLen = isAligned ? 24 * s : offset % 5 === 0 ? 16 * s : 10 * s;

    if (isAligned) {
      ctx.save();
      ctx.shadowColor = P.alignGlow;
      ctx.shadowBlur = 6 * s;
      ctx.strokeStyle = P.align;
      ctx.lineWidth = 2.8 * s;
    } else {
      ctx.strokeStyle = P.tick;
      ctx.lineWidth = 1.4 * s;
    }
    ctx.beginPath();
    ctx.moveTo(x, centerY - tickLen / 2);
    ctx.lineTo(x, centerY + tickLen / 2);
    ctx.stroke();
    if (isAligned) ctx.restore();

    if (isAligned || k % 5 === 0) {
      ctx.fillStyle = isAligned ? P.align : P.tickNum;
      ctx.font = `${isAligned ? 700 : 400} ${Math.max(10, (isAligned ? 15 : 12) * fs)}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = offset <= 0 ? 'bottom' : 'top';
      const ly =
        offset <= 0
          ? centerY - tickLen / 2 - 4 * s
          : centerY + tickLen / 2 + 4 * s;
      ctx.fillText(String(k), x, ly);
    }
  }

  // 读数面板
  if (showReading) {
    const drumInt2 = Math.floor(drumReading);
    const drumEst = (drumReading - drumInt2).toFixed(1).replace(/^0/, '');
    const readStr = `${reading.toFixed(3)} mm`;
    const subStr = `${mainScaleReading.toFixed(1)} + ${drumInt2}${drumEst}×0.01 = ${reading.toFixed(3)} mm`;
    const readFont = Math.max(22, 38 * fs);
    const subFont = Math.max(11, 15 * fs);
    ctx.font = `700 ${readFont}px ${FONT}`;
    const readW = ctx.measureText(readStr).width;
    ctx.font = `${subFont}px ${FONT}`;
    const subW = ctx.measureText(subStr).width;
    const panelW = Math.max(readW, subW) + 44 * s;
    const panelH = readFont + subFont + 34 * s;
    const px0 = ox + (w - panelW) / 2;
    const py0 = oy + h * 0.74;
    ctx.fillStyle = P.panelBg;
    roundRect(ctx, px0, py0, panelW, panelH, 10 * s);
    ctx.fill();
    ctx.strokeStyle = P.panelBorder;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = P.align;
    ctx.font = `700 ${readFont}px ${FONT}`;
    ctx.textBaseline = 'middle';
    ctx.fillText(readStr, ox + w / 2, py0 + readFont * 0.7 + 8 * s);
    ctx.fillStyle = P.dim;
    ctx.font = `${subFont}px ${FONT}`;
    ctx.fillText(subStr, ox + w / 2, py0 + readFont + subFont * 0.7 + 16 * s);
  }

  ctx.restore();
}
