import { drawRoundedRect } from './draw-rounded-rect';
import type { EmfAnalogySnapshot } from '../scene.sim';

export function drawLegendAndFormula(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  snapshot: EmfAnalogySnapshot
): void {
  const panelX = x + 12;
  const panelY = y + 12;
  const panelW = 144;
  const panelH = 58;

  drawRoundedRect(ctx, panelX, panelY, panelW, panelH, 10);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#64748b';
  ctx.font = `600 ${Math.max(9, Math.round(panelH * 0.18))}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('颜色代表水压 (电势)', panelX + 10, panelY + 9);

  const gradX = panelX + 10;
  const gradY = panelY + panelH * 0.52;
  const gradW = panelW - 24;
  const gradH = Math.max(7, panelH * 0.11);
  const gradient = ctx.createLinearGradient(gradX, gradY, gradX + gradW, gradY);
  gradient.addColorStop(0, '#2563eb');
  gradient.addColorStop(1, '#dbeafe');
  drawRoundedRect(ctx, gradX, gradY, gradW, gradH, gradH * 0.5);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.fillStyle = '#94a3b8';
  ctx.font = `500 ${Math.max(8, Math.round(panelH * 0.15))}px sans-serif`;
  ctx.fillText('高', panelX + 10, panelY + panelH - 16);
  ctx.textAlign = 'right';
  ctx.fillText('低', panelX + panelW - 10, panelY + panelH - 16);

  const formulaW = Math.min(width * 0.35, 300);
  const formulaH = Math.max(24, Math.min(34, height * 0.05));
  const formulaX = x + (width - formulaW) * 0.5;
  const formulaY = y + height - formulaH - Math.max(10, height * 0.03);

  drawRoundedRect(ctx, formulaX, formulaY, formulaW, formulaH, 10);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.stroke();

  const prefix = `U = E - Ir = 1.50 - ${snapshot.state.internalDrop.toFixed(2)} = `;
  const value = `${snapshot.state.terminalVoltage.toFixed(2)} V`;
  let fontPx = Math.max(13, Math.round(formulaH * 0.53));

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  let prefixFont = `500 ${fontPx}px monospace`;
  let valueFont = `700 ${fontPx}px monospace`;
  let prefixWidth = 0;
  let valueWidth = 0;
  do {
    prefixFont = `500 ${fontPx}px monospace`;
    valueFont = `700 ${fontPx}px monospace`;
    ctx.font = prefixFont;
    prefixWidth = ctx.measureText(prefix).width;
    ctx.font = valueFont;
    valueWidth = ctx.measureText(value).width;
    if (prefixWidth + valueWidth <= formulaW - 24 || fontPx <= 9) {
      break;
    }
    fontPx -= 1;
  } while (fontPx >= 9);

  const textX = formulaX + (formulaW - prefixWidth - valueWidth) * 0.5;
  const textY = formulaY + formulaH * 0.56;

  ctx.fillStyle = '#e2e8f0';
  ctx.font = prefixFont;
  ctx.fillText(prefix, textX, textY);
  ctx.fillStyle = '#4ade80';
  ctx.font = valueFont;
  ctx.fillText(value, textX + prefixWidth, textY);
}
