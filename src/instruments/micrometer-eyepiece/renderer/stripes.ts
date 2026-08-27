/**
 * 高精度干涉测微仪 — 干涉条纹渲染（逐字搬移自原 instrument.view.ts）
 */

import type { StripeConfig } from './types';

// ── 解析任意 CSS 颜色为 rgba ──
function parseRgba(color: string): {
  r: number;
  g: number;
  b: number;
  a: number;
} {
  const el = document.createElement('div');
  el.style.color = color;
  el.style.position = 'absolute';
  el.style.visibility = 'hidden';
  document.body.appendChild(el);
  const computed = getComputedStyle(el).color;
  el.remove();
  const m = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (m) {
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] ? +m[4] : 1 };
  }
  return { r: 0, g: 0, b: 0, a: 1 };
}

// ── 预渲染一个周期的条纹瓷砖（90deg 时用 Canvas 位图平铺，比 gradient 快）──
function buildStripeTile(period: number, color: string): string {
  const c = parseRgba(color);
  const gap = Math.round(period * 0.2);
  const fadeInEnd = Math.round(period * 0.3);
  const fadeOutStart = Math.round(period * 0.7);
  const fadeOutEnd = Math.round(period * 0.8);

  const cvs = document.createElement('canvas');
  cvs.width = period;
  cvs.height = 1;
  const ctx = cvs.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, period, 0);

  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(gap / period, 'rgba(0,0,0,0)');
  grad.addColorStop(
    fadeInEnd / period,
    `rgba(${c.r},${c.g},${c.b},${c.a * 0.5})`
  );
  grad.addColorStop(0.5, `rgba(${c.r},${c.g},${c.b},${c.a})`);
  grad.addColorStop(fadeOutStart / period, `rgba(${c.r},${c.g},${c.b},${c.a})`);
  grad.addColorStop(
    fadeOutEnd / period,
    `rgba(${c.r},${c.g},${c.b},${c.a * 0.5})`
  );
  grad.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, period, 1);
  return cvs.toDataURL('image/png');
}

/**
 * 创建条纹更新器。
 *
 * 输出只取决于 (spacing, color, angle)：按此 key 缓存，key 未变时
 * DOM 背景已是目标值，直接跳过重算（避免拖动十字丝时反复
 * parseRgba + toDataURL）。
 */
export function createStripeUpdater(
  lensView: HTMLDivElement
): (stripeConfig: StripeConfig) => void {
  let lastKey = '';

  return function updateStripes(stripeConfig: StripeConfig): void {
    const s = stripeConfig;
    const key = `${s.spacing}|${s.color}|${s.angle}`;
    if (key === lastKey) return;
    lastKey = key;

    if (s.angle === 90) {
      // 垂直条纹：Canvas 位图 + repeat 平铺（GPU 加速，无需取模）
      const tileUrl = buildStripeTile(s.spacing, s.color);
      lensView.style.backgroundImage = `url(${tileUrl})`;
      lensView.style.backgroundRepeat = 'repeat';
    } else {
      // 非垂直角度：回退到 CSS gradient（倾斜条纹无缝瓷砖较复杂）
      const gap = Math.round(s.spacing * 0.2);
      const fadeInEnd = Math.round(s.spacing * 0.3);
      const fadeOutStart = Math.round(s.spacing * 0.7);
      const fadeOutEnd = Math.round(s.spacing * 0.8);
      const fadeColor = `color-mix(in srgb, transparent 50%, ${s.color})`;
      lensView.style.backgroundImage = `repeating-linear-gradient(
        ${s.angle}deg,
        transparent 0px,
        transparent ${gap}px,
        ${fadeColor} ${fadeInEnd}px,
        ${s.color} ${Math.round(s.spacing * 0.5)}px,
        ${s.color} ${fadeOutStart}px,
        ${fadeColor} ${fadeOutEnd}px,
        transparent ${s.spacing}px
      )`;
      lensView.style.backgroundRepeat = '';
    }
  };
}
