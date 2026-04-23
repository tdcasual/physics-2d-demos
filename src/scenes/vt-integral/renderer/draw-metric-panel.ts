import type { DrawContext } from './types';

/**
 * 绘制右上角数据面板
 */
export function drawMetricPanel(
  context: DrawContext,
  lines: Array<{ icon?: string; label: string; value: string; highlight?: boolean }>,
  boxWidth = 330
): void {
  const { ctx, width, theme, responsiveScale } = context;

  const isDark = theme === 'dark';
  const s = responsiveScale;

  boxWidth = Math.min(boxWidth, Math.max(180, width - 40));
  const fontSize = Math.max(11, Math.round(13 * s));
  const lineHeight = Math.max(22, Math.round(26 * s));
  const padding = Math.max(10, Math.round(14 * s));
  const panelHeight = padding * 2 + lines.length * lineHeight;

  const x = Math.max(10, width - boxWidth - 20);
  const y = 10;

  ctx.save();

  // 面板背景
  ctx.fillStyle = isDark
    ? 'rgba(15,23,42,0.75)'
    : 'rgba(255,255,255,0.82)';
  ctx.strokeStyle = isDark
    ? 'rgba(148,163,184,0.25)'
    : 'rgba(71,85,105,0.2)';
  ctx.lineWidth = 1;

  // 圆角矩形
  const r = Math.max(4, 6 * s);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + boxWidth, y, x + boxWidth, y + panelHeight, r);
  ctx.arcTo(x + boxWidth, y + panelHeight, x, y + panelHeight, r);
  ctx.arcTo(x, y + panelHeight, x, y, r);
  ctx.arcTo(x, y, x + boxWidth, y, r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 内容
  const labelColor = isDark ? 'rgba(226,232,240,0.7)' : 'rgba(71,85,105,0.8)';
  const valueColor = isDark ? '#e2e8f0' : '#1e293b';
  const highlightColor = isDark ? '#fbbf24' : '#d97706';

  ctx.font = `${fontSize}px "Noto Sans SC", system-ui, sans-serif`;

  lines.forEach((line, index) => {
    const ly = y + padding + index * lineHeight + lineHeight * 0.5;
    const text = line.icon ? `${line.icon} ${line.label}` : line.label;

    ctx.fillStyle = labelColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + padding, ly);

    ctx.fillStyle = line.highlight ? highlightColor : valueColor;
    ctx.textAlign = 'right';
    ctx.font = line.highlight
      ? `700 ${fontSize}px "Noto Sans SC", system-ui, sans-serif`
      : `${fontSize}px "Noto Sans SC", system-ui, sans-serif`;
    ctx.fillText(line.value, x + boxWidth - padding, ly);
    ctx.font = `${fontSize}px "Noto Sans SC", system-ui, sans-serif`;
  });

  ctx.restore();
}
