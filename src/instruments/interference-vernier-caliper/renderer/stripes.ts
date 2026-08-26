/**
 * 干涉读数游标卡尺 — 干涉条纹瓷砖预渲染
 */

// ── 解析任意 CSS 颜色为 rgba ──
export function parseRgba(color: string): {
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

// ── 预渲染一个周期的条纹瓷砖（Canvas → dataURL，GPU 平铺比 gradient 快）──
export function buildStripeTile(period: number, color: string): string {
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
