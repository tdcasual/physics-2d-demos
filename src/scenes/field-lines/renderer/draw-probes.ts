import { drawArrow } from '../../../core/draw-primitives';
import type { FieldProbe } from './types';
import { getFieldLineColors } from './colors';

export type DrawProbesOptions = {
  responsiveScale: number;
  contentScale: number;
  isDark: boolean;
  /** 箭头整体缩放，n 增大时缩短以免重叠 */
  arrowScale: number;
  /** 箭头透明度 */
  alpha: number;
  /** 低 n 时在测量点画试探电荷小圆 */
  showTestCharge: boolean;
};

function smoothLogRatio(mag: number, maxMag: number): number {
  if (maxMag <= 0 || mag <= 0) return 0;
  return Math.log(1 + mag) / Math.log(1 + maxMag);
}

/**
 * 在试探点绘制 E 矢量。箭尾落在测量点（试探电荷位置）。
 */
export function drawProbes(
  ctx: CanvasRenderingContext2D,
  probes: FieldProbe[],
  options: DrawProbesOptions
): void {
  if (probes.length === 0 || options.alpha <= 0.01) return;

  const {
    responsiveScale: s,
    contentScale: ms,
    isDark,
    arrowScale,
    alpha
  } = options;
  const colors = getFieldLineColors(isDark);
  const color = `rgba(${colors.fieldLineWarm.arrow}, ${alpha.toFixed(3)})`;
  const minLen = Math.max(8, 12 * s * ms) * arrowScale;
  const maxLen = Math.max(16, 32 * s * ms) * arrowScale;
  const head = Math.max(4, 7 * s * ms) * arrowScale;
  const stroke = Math.max(1, 1.6 * s * ms);

  let maxMag = 0;
  for (const p of probes) maxMag = Math.max(maxMag, p.magnitude);

  ctx.save();
  ctx.globalAlpha = alpha;

  if (options.showTestCharge) {
    const r = Math.max(2.5, 3.5 * s * ms);
    ctx.strokeStyle = isDark ? 'rgba(226,232,240,0.85)' : 'rgba(30,41,59,0.75)';
    ctx.lineWidth = Math.max(1, 1.2 * s);
    for (const p of probes) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  for (const p of probes) {
    if (p.magnitude < 1e-8) continue;
    const ux = p.Ex / p.magnitude;
    const uy = p.Ey / p.magnitude;
    const len =
      minLen + (maxLen - minLen) * smoothLogRatio(p.magnitude, maxMag);
    drawArrow(ctx, p.x, p.y, p.x + ux * len, p.y + uy * len, {
      color,
      lineWidth: stroke,
      headSize: head,
      fillHead: true
    });
  }

  ctx.restore();
}
