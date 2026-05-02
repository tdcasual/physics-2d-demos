import type { Oscillator } from '../scene.sim';
import { Colors } from '../../../core/colors';
import { drawHorizontal, drawVertical } from './oscillator-drawers';
import type { ClickArea } from './types';

export interface OscillatorDrawConfig {
  responsiveScale: number;
}

export function drawOscillatorCell(
  ctx: CanvasRenderingContext2D,
  osc: Oscillator,
  index: number,
  cellX: number,
  cellY: number,
  cellW: number,
  cellH: number,
  theme: 'dark' | 'light',
  config: OscillatorDrawConfig
): ClickArea {
  const isDark = theme === 'dark';
  const centerX = cellX + cellW / 2;
  const centerY = cellY + cellH / 2 + 4;
  const isHorizontal = osc.params.orientation === 'horizontal';
  const { responsiveScale } = config;

  // 连续响应式尺寸（移动端下限调高，确保可读性）
  const ballRadius = Math.max(12, Math.round(22 * responsiveScale));
  const labelFontSize = Math.max(11, Math.round(12 * responsiveScale));
  const paramFontSize = Math.max(9, Math.round(9 * responsiveScale));
  const valueFontSize = Math.max(10, Math.round(11 * responsiveScale));

  // 边距随 scale 连续变化
  const marginTop = Math.round(Math.max(16, 20 * responsiveScale));
  const marginBottom = Math.round(Math.max(5, 6 * responsiveScale));
  const marginLeft = Math.round(Math.max(6, 8 * responsiveScale));
  const marginRight = Math.round(Math.max(6, 8 * responsiveScale));

  const drawW = cellW - marginLeft - marginRight;
  const drawH = cellH - marginTop - marginBottom;

  // 振子编号和状态
  ctx.fillStyle = osc.color;
  ctx.font = `bold ${labelFontSize}px "Noto Sans SC", sans-serif`;
  ctx.textAlign = 'left';
  const statusText = osc.isPlaying ? '▶' : '⏸';
  ctx.fillText(`${index + 1}.${statusText}`, cellX + marginLeft, cellY + marginTop - 4);

  // 参数（右上角）
  ctx.fillStyle = isDark ? Colors.darkText : Colors.gray;
  ctx.font = `${paramFontSize}px "Noto Sans SC", sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText(
    `k=${osc.params.k} m=${osc.params.m}`,
    cellX + cellW - marginRight,
    cellY + marginTop - 4
  );

  // 位移缩放和弹簧长度
  const displacementScale = Math.max(1.5, 4 * responsiveScale);
  const displacement = osc.state.x * displacementScale;
  const springLength = Math.min(
    isHorizontal ? drawW * 0.5 : drawH * 0.5,
    Math.min(cellW, cellH) * 0.6 * responsiveScale
  );

  // 弹簧线圈参数
  const coils = Math.max(6, Math.min(14, Math.round(12 * responsiveScale)));
  const coilWidth = Math.max(8, Math.min(22, Math.round(18 * responsiveScale)));

  let clickArea: ClickArea;

  if (isHorizontal) {
    clickArea = drawHorizontal(
      ctx, osc, centerX, centerY, displacement, springLength, ballRadius,
      coils, coilWidth, valueFontSize, isDark, responsiveScale
    );
  } else {
    clickArea = drawVertical(
      ctx, osc, centerX, centerY, displacement, springLength, ballRadius,
      coils, coilWidth, valueFontSize, isDark, responsiveScale
    );
  }

  return clickArea;
}
