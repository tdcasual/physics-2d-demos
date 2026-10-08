import type { Box, DrawContext } from './types';
import { FONT_FAMILY, fontPx } from './palette';

/**
 * 子场景共用的「标题 + 图例 + 主体」布局。
 *
 * - 标题/图例行按 measureText 实测宽度换行，避开读数浮层（occlusion）。
 * - 主体区（含刻度、轴名的外框）若与浮层相交，在「右缩 / 下移 / 上收 /
 *   左让」四种候选中取面积最大且不小于下限的一种；都不满足时不避让，
 *   保证极窄画布仍可画出完整图形。
 */

export type LegendItemSpec = { text: string };

export type HeaderLayout = {
  left: number;
  /** 每行标题文本与其顶部 y（textBaseline = 'top'） */
  titleLines: Array<{ text: string; y: number }>;
  /** 图例项位置：x 为色块左端，y 为行中线 */
  legend: Array<{ x: number; y: number; text: string }>;
  bottom: number;
  titlePx: number;
  legendPx: number;
  swatchW: number;
  swatchGap: number;
};

export type HeaderOptions = {
  title: string;
  legend?: LegendItemSpec[];
  /** 额外的提示行（与图例同字号，单独成行） */
  note?: string;
};

export function intersects(a: Box, b: Box): boolean {
  return (
    a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
  );
}

export function boxArea(b: Box): number {
  return Math.max(0, b.right - b.left) * Math.max(0, b.bottom - b.top);
}

export function stagePad(context: DrawContext): number {
  return Math.max(8, 14 * context.responsiveScale);
}

export function layoutGap(context: DrawContext): number {
  return Math.max(6, 10 * context.responsiveScale);
}

/** 标题区：按可用宽度排版（含避让浮层）。调用前后 ctx.font 不变。 */
export function layoutHeader(
  context: DrawContext,
  options: HeaderOptions
): HeaderLayout {
  const { ctx, width, responsiveScale: s, contentScale: cs } = context;
  const pad = stagePad(context);
  const gap = layoutGap(context);
  const titlePx = fontPx(14, s, cs);
  const legendPx = fontPx(12, s, cs);
  const swatchW = Math.max(14, legendPx * 1.3);
  const swatchGap = Math.max(4, legendPx * 0.4);
  const itemGap = Math.max(10, legendPx * 1.1);
  const titleLineH = titlePx * 1.35;
  const legendLineH = legendPx * 1.6;

  const occ = context.occlusion ?? null;

  ctx.save();
  const place = (top: number, right: number): HeaderLayout => {
    const avail = Math.max(1, right - pad);
    ctx.font = `600 ${titlePx}px ${FONT_FAMILY}`;
    const titleTexts =
      ctx.measureText(options.title).width <= avail
        ? [options.title]
        : options.title.split(' · ');
    const titleLines = titleTexts.map((text, i) => ({
      text,
      y: top + i * titleLineH
    }));
    let y = top + titleTexts.length * titleLineH;
    const legend: HeaderLayout['legend'] = [];
    ctx.font = `${legendPx}px ${FONT_FAMILY}`;
    const items = options.legend ?? [];
    if (items.length > 0) {
      let x = pad;
      let rowMid = y + legendLineH * 0.5;
      for (const item of items) {
        const w = swatchW + swatchGap + ctx.measureText(item.text).width;
        if (x > pad && x + w > pad + avail) {
          x = pad;
          rowMid += legendLineH;
        }
        legend.push({ x, y: rowMid, text: item.text });
        x += w + itemGap;
      }
      y = rowMid + legendLineH * 0.5;
    }
    if (options.note) {
      legend.push({ x: -1, y: y + legendLineH * 0.5, text: options.note });
      y += legendLineH;
    }
    return {
      left: pad,
      titleLines,
      legend,
      bottom: y,
      titlePx,
      legendPx,
      swatchW,
      swatchGap
    };
  };

  let header = place(pad, width - pad);
  if (
    occ &&
    intersects(occ, {
      left: pad,
      top: pad,
      right: width - pad,
      bottom: header.bottom
    })
  ) {
    const narrowRight = occ.left - gap;
    if (narrowRight - pad >= width * 0.4) {
      header = place(pad, narrowRight);
    } else {
      header = place(occ.bottom + gap, width - pad);
    }
  }
  ctx.restore();
  return header;
}

/** 按 layoutHeader 结果绘制标题与提示行；图例色块由调用方绘制。 */
export function drawHeaderText(
  context: DrawContext,
  header: HeaderLayout,
  colors: { title: string; legend: string; note: string }
): void {
  const { ctx } = context;
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = colors.title;
  ctx.font = `600 ${header.titlePx}px ${FONT_FAMILY}`;
  for (const line of header.titleLines) {
    ctx.fillText(line.text, header.left, line.y);
  }
  ctx.textBaseline = 'middle';
  ctx.font = `${header.legendPx}px ${FONT_FAMILY}`;
  for (const item of header.legend) {
    if (item.x < 0) {
      ctx.fillStyle = colors.note;
      ctx.fillText(item.text, header.left, item.y);
    } else {
      ctx.fillStyle = colors.legend;
      ctx.fillText(
        item.text,
        item.x + header.swatchW + header.swatchGap,
        item.y
      );
    }
  }
  ctx.restore();
}

export type PlotReserve = {
  /** 外框到绘图区的四边留白（刻度、轴名、提示行） */
  left: number;
  top: number;
  right: number;
  bottom: number;
};

/**
 * 主体区：header 以下、画布内边距以内；与浮层相交时择优避让。
 * 返回扣除 reserve 后的绘图区（坐标轴原点在 left/bottom）。
 */
export function layoutBody(
  context: DrawContext,
  headerBottom: number,
  reserve: PlotReserve,
  minInner: { width: number; height: number }
): Box {
  const { width, height } = context;
  const pad = stagePad(context);
  const gap = layoutGap(context);
  const body: Box = {
    left: pad,
    top: headerBottom + gap,
    right: width - pad,
    bottom: height - pad
  };
  const inner = (b: Box): Box => ({
    left: b.left + reserve.left,
    top: b.top + reserve.top,
    right: b.right - reserve.right,
    bottom: b.bottom - reserve.bottom
  });
  const occ = context.occlusion ?? null;
  if (!occ || !intersects(occ, body)) return inner(body);

  const candidates: Box[] = [
    { ...body, right: Math.min(body.right, occ.left - gap) },
    { ...body, top: Math.max(body.top, occ.bottom + gap) },
    { ...body, bottom: Math.min(body.bottom, occ.top - gap) },
    { ...body, left: Math.max(body.left, occ.right + gap) }
  ]
    .map(inner)
    .filter(
      (b) =>
        b.right - b.left >= minInner.width &&
        b.bottom - b.top >= minInner.height
    );
  if (candidates.length === 0) return inner(body);
  return candidates.reduce((best, b) =>
    boxArea(b) > boxArea(best) ? b : best
  );
}
