import { drawRoundedRect } from './draw-rounded-rect';
import type { EmfAnalogySnapshot } from '../scene.sim';
import type { TeachingTheme } from '../../../platform/standards';

export function drawCards(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  snapshot: EmfAnalogySnapshot,
  theme: TeachingTheme
): void {
  const isDark = theme === 'dark';
  const baseCardBg = isDark ? '#111b2d' : '#ffffff';
  const baseCardBorder = isDark ? '#334155' : '#e2e8f0';
  const baseTitleColor = isDark ? '#94a3b8' : '#64748b';

  const gap = Math.max(6, width * 0.01);
  const cardWidth = (width - gap * 4) / 5;
  const cardHeight = height;

  const cards = [
    {
      title: '系统状态',
      value: snapshot.state.isSystemOn ? '通路' : '断路',
      valueColor: snapshot.state.isSystemOn
        ? isDark
          ? '#60a5fa'
          : '#1d4ed8'
        : isDark
          ? '#cbd5e1'
          : '#334155',
      bg: baseCardBg,
      border: baseCardBorder,
      titleColor: baseTitleColor
    },
    {
      title: '开度',
      value: `${Math.round(snapshot.state.tapOpening * 100)}%`,
      valueColor: isDark ? '#e2e8f0' : '#1f2937',
      bg: baseCardBg,
      border: baseCardBorder,
      titleColor: baseTitleColor
    },
    {
      title: '电流 I',
      value: `${snapshot.state.currentI.toFixed(2)} A`,
      valueColor: isDark ? '#60a5fa' : '#1d4ed8',
      bg: baseCardBg,
      border: baseCardBorder,
      titleColor: baseTitleColor
    },
    {
      title: '内阻压降 Ir',
      value: `${snapshot.state.internalDrop.toFixed(2)} V`,
      valueColor: isDark ? '#f87171' : '#dc2626',
      bg: baseCardBg,
      border: baseCardBorder,
      titleColor: baseTitleColor
    },
    {
      title: '路端电压 U',
      value: `${snapshot.state.terminalVoltage.toFixed(2)} V`,
      valueColor: '#4ade80',
      bg: '#0f172a',
      border: '#1e293b',
      titleColor: '#94a3b8'
    }
  ] as const;

  const scaleFactor = Math.max(0.55, Math.min(1.0, width / 520));
  const titleFont = Math.round(14 * scaleFactor);
  const valueFont = Math.round(24 * scaleFactor);

  cards.forEach((card, index) => {
    const left = x + index * (cardWidth + gap);
    drawRoundedRect(
      ctx,
      left,
      y,
      cardWidth,
      cardHeight,
      Math.max(7, cardHeight * 0.12)
    );
    ctx.fillStyle = card.bg;
    ctx.fill();
    ctx.strokeStyle = card.border;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    if (card.title) {
      ctx.fillStyle = card.titleColor;
      ctx.font = `500 ${titleFont}px sans-serif`;
      ctx.fillText(card.title, left + cardWidth * 0.08, y + cardHeight * 0.14);
    }

    ctx.fillStyle = card.valueColor;
    ctx.font = `700 ${valueFont}px sans-serif`;
    ctx.fillText(
      card.value,
      left + cardWidth * 0.08,
      y + cardHeight * (card.title ? 0.46 : 0.32)
    );
  });
}
