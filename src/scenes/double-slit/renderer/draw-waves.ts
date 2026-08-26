/**
 * 双缝干涉 — 波纹与光路绘制（单色波 / 白光光线 / 白光波纹）
 */

import { FILTERS, WHITE_LAMBDAS, lambdaToGap, lambdaToRgb } from '../scene.sim';

export function drawWaves(
  c: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  maxR: number,
  color: string,
  gap: number,
  time: number,
  scale: number,
  contentScale: number
): void {
  c.strokeStyle = color;
  c.lineWidth = Math.max(2, 3 * Math.min(scale, 1.5) * contentScale);
  // 高分辨率下增加波纹环数，增强视觉丰富度
  const extraWaves = Math.floor(Math.max(0, scale - 0.8) * 2);
  const numWaves = Math.floor(maxR / gap) + 2 + extraWaves;
  for (let i = 0; i < numWaves; i++) {
    const r = (time % gap) + i * gap;
    if (r > 0 && r < maxR) {
      c.beginPath();
      const spreadAngle = Math.PI / 2.2;
      c.arc(cx, cy, r, -spreadAngle, spreadAngle);
      c.stroke();
    }
  }
}

export function drawMonoLightRays(
  c: CanvasRenderingContext2D,
  POS: Record<string, number>,
  CY: number,
  time: number,
  color: string,
  contentScale: number
): void {
  c.strokeStyle = color;
  c.lineWidth = 2.5 * contentScale;
  c.setLineDash([10, 10]);
  c.lineDashOffset = -time;
  for (let angle = -0.3; angle <= 0.3; angle += 0.1) {
    c.beginPath();
    c.moveTo(POS.light, CY);
    c.lineTo(POS.lens, CY + Math.tan(angle) * (POS.lens - POS.light));
    c.stroke();
  }
  for (let yOffset = -20; yOffset <= 20; yOffset += 10) {
    c.beginPath();
    c.moveTo(POS.lens, CY + yOffset);
    c.lineTo(POS.singleSlit, CY + yOffset * 0.2);
    c.stroke();
  }
  c.setLineDash([]);
}

export function drawWhiteLightRays(
  c: CanvasRenderingContext2D,
  POS: Record<string, number>,
  CY: number,
  time: number,
  filterColor: string | null | undefined,
  contentScale: number
): void {
  c.lineWidth = 2.5 * contentScale;
  c.setLineDash([10, 10]);
  c.lineDashOffset = -time;

  // 光源→透镜：白色光线（滤光片前所有波长混叠）
  c.strokeStyle = 'rgba(220,225,235,0.5)';
  for (let a = -0.3; a <= 0.3; a += 0.1) {
    c.beginPath();
    c.moveTo(POS.light, CY);
    c.lineTo(POS.lens, CY + Math.tan(a) * (POS.lens - POS.light));
    c.stroke();
  }

  // 透镜→滤光片：白色
  for (let y = -20; y <= 20; y += 10) {
    c.beginPath();
    c.moveTo(POS.lens, CY + y);
    c.lineTo(
      POS.filter,
      CY + (y * (POS.filter - POS.lens)) / (POS.singleSlit - POS.lens)
    );
    c.stroke();
  }

  // 滤光片→单缝：白光经过滤光片后变色，无滤光片时保持白色
  const hasFC = filterColor && FILTERS[filterColor as keyof typeof FILTERS];
  if (hasFC) {
    const [cr, cg, cb] = lambdaToRgb(
      FILTERS[filterColor as keyof typeof FILTERS].center
    );
    c.strokeStyle = `rgba(${cr},${cg},${cb},0.5)`;
  } else {
    c.strokeStyle = 'rgba(220,225,235,0.5)';
  }
  for (let y = -20; y <= 20; y += 10) {
    const yAtFilter =
      CY + (y * (POS.filter - POS.lens)) / (POS.singleSlit - POS.lens);
    c.beginPath();
    c.moveTo(POS.filter, yAtFilter);
    c.lineTo(POS.singleSlit, CY + y * 0.2);
    c.stroke();
  }
  c.setLineDash([]);
}

export function drawWhiteWaves(
  c: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  maxR: number,
  time: number,
  filterColor: string | null | undefined,
  scale: number,
  contentScale: number
): void {
  c.lineWidth = Math.max(2, 3 * Math.min(scale, 1.5) * contentScale);
  const spreadAngle = Math.PI / 2.2;
  const hasFC = filterColor && FILTERS[filterColor as keyof typeof FILTERS];
  const lambdas = hasFC
    ? [FILTERS[filterColor as keyof typeof FILTERS].center]
    : WHITE_LAMBDAS;

  for (const wl of lambdas) {
    const [wr, wg, wb] = lambdaToRgb(wl);
    // 白光无滤光片时 gap 乘以 8，每种颜色仅 2-3 条弧线
    const gap = lambdaToGap(wl) * (hasFC ? 1 : 8);
    c.strokeStyle = `rgba(${wr},${wg},${wb},0.4)`;
    const numW = Math.floor(maxR / gap) + 2;
    for (let i = 0; i < numW; i++) {
      const rad = (time % gap) + i * gap;
      if (rad > 0 && rad < maxR) {
        c.beginPath();
        c.arc(cx, cy, rad, -spreadAngle, spreadAngle);
        c.stroke();
      }
    }
  }
}
