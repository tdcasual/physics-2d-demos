import type { Oscillator } from '../scene.sim';
import { Colors, alpha } from '../../../core/colors';
import { drawSpring } from './draw-spring';
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

  // 连续响应式尺寸
  const ballRadius = Math.max(10, Math.round(22 * responsiveScale));
  const labelFontSize = Math.max(10, Math.round(12 * responsiveScale));
  const paramFontSize = Math.max(8, Math.round(9 * responsiveScale));
  const valueFontSize = Math.max(9, Math.round(11 * responsiveScale));

  // 边距随 scale 连续变化
  const marginTop = Math.round(Math.max(18, 22 * responsiveScale));
  const marginBottom = Math.round(Math.max(6, 8 * responsiveScale));
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
  ctx.fillStyle = Colors.gray;
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
      coils, coilWidth, valueFontSize, isDark
    );
  } else {
    clickArea = drawVertical(
      ctx, osc, centerX, centerY, displacement, springLength, ballRadius,
      coils, coilWidth, valueFontSize, isDark
    );
  }

  return clickArea;
}

function drawHorizontal(
  ctx: CanvasRenderingContext2D,
  osc: Oscillator,
  centerX: number,
  centerY: number,
  displacement: number,
  springLength: number,
  ballRadius: number,
  coils: number,
  coilWidth: number,
  valueFontSize: number,
  isDark: boolean
): ClickArea {
  const equilibriumX = centerX + 10;
  const massX = equilibriumX + displacement;
  const fixedX = equilibriumX - springLength;
  const baseY = centerY;

  // 平衡位置虚线
  ctx.strokeStyle = isDark
    ? alpha(Colors.gray, 0.25)
    : alpha(Colors.grayLight, 0.4);
  ctx.setLineDash([3, 3]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(equilibriumX, baseY - 20);
  ctx.lineTo(equilibriumX, baseY + 25);
  ctx.stroke();
  ctx.setLineDash([]);

  // 固定端（墙面）
  ctx.fillStyle = isDark ? Colors.darkText : Colors.dark;
  ctx.fillRect(fixedX - 3, baseY - 18, 3, 36);
  ctx.strokeStyle = isDark ? Colors.darkText : Colors.dark;
  ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(fixedX - 5, baseY + i * 6);
    ctx.lineTo(fixedX - 2, baseY + i * 6 + 2);
    ctx.stroke();
  }

  // 弹簧
  const springEndX = massX - ballRadius;
  if (springEndX > fixedX + 8) {
    drawSpring(ctx, fixedX, baseY, springEndX, baseY, coils, coilWidth, osc.color);
  }

  // 小球
  ctx.fillStyle = osc.color;
  ctx.beginPath();
  ctx.arc(massX, baseY, ballRadius, 0, Math.PI * 2);
  ctx.fill();

  // 光泽
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.arc(
    massX - ballRadius * 0.25,
    baseY - ballRadius * 0.25,
    ballRadius * 0.25,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // 相位标记
  const markerAngle = osc.state.phase;
  const markerX = massX + Math.cos(markerAngle) * 7;
  const markerY = baseY + Math.sin(markerAngle) * 7;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(markerX, markerY, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // 暂停状态遮罩
  if (!osc.isPlaying) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.arc(massX, baseY, ballRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(massX - 3, baseY - 5, 2, 10);
    ctx.fillRect(massX + 1, baseY - 5, 2, 10);
  }

  // 位移数值
  ctx.fillStyle = isDark ? Colors.darkText : Colors.dark;
  ctx.font = `bold ${valueFontSize}px "Noto Sans SC", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(
    `${osc.state.x.toFixed(1)}m`,
    massX,
    baseY + ballRadius + Math.max(10, Math.round(12 * (ballRadius / 22)))
  );

  // 点击区域
  const clickPadding = 20;
  return {
    id: osc.id,
    type: 'rect',
    left: fixedX - 10,
    top: baseY - ballRadius - clickPadding,
    right: massX + ballRadius + 10,
    bottom: baseY + ballRadius + clickPadding
  };
}

function drawVertical(
  ctx: CanvasRenderingContext2D,
  osc: Oscillator,
  centerX: number,
  centerY: number,
  displacement: number,
  springLength: number,
  ballRadius: number,
  coils: number,
  coilWidth: number,
  valueFontSize: number,
  isDark: boolean
): ClickArea {
  const drawCenterX = centerX;
  const equilibriumY = centerY + 8;
  const massY = equilibriumY - displacement;
  const fixedY = equilibriumY - springLength;

  // 平衡位置虚线
  ctx.strokeStyle = isDark
    ? alpha(Colors.gray, 0.25)
    : alpha(Colors.grayLight, 0.4);
  ctx.setLineDash([3, 3]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(drawCenterX - 25, equilibriumY);
  ctx.lineTo(drawCenterX + 25, equilibriumY);
  ctx.stroke();
  ctx.setLineDash([]);

  // 天花板
  ctx.fillStyle = isDark ? Colors.darkText : Colors.dark;
  ctx.fillRect(drawCenterX - 25, fixedY - 3, 50, 3);
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(drawCenterX + i * 8, fixedY - 3);
    ctx.lineTo(drawCenterX + i * 8 + 1, fixedY - 5);
    ctx.stroke();
  }

  // 弹簧
  const springEndY = massY - ballRadius;
  if (springEndY > fixedY + 8) {
    drawSpring(
      ctx,
      drawCenterX,
      fixedY,
      drawCenterX,
      springEndY,
      coils,
      coilWidth,
      osc.color
    );
  }

  // 小球
  ctx.fillStyle = osc.color;
  ctx.beginPath();
  ctx.arc(drawCenterX, massY, ballRadius, 0, Math.PI * 2);
  ctx.fill();

  // 光泽
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.arc(
    drawCenterX - ballRadius * 0.25,
    massY - ballRadius * 0.25,
    ballRadius * 0.25,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // 相位标记
  const markerAngle = osc.state.phase;
  const markerX = drawCenterX + Math.cos(markerAngle) * 7;
  const markerY = massY + Math.sin(markerAngle) * 7;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(markerX, markerY, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // 暂停状态遮罩
  if (!osc.isPlaying) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.arc(drawCenterX, massY, ballRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(drawCenterX - 3, massY - 5, 2, 10);
    ctx.fillRect(drawCenterX + 1, massY - 5, 2, 10);
  }

  // 位移数值
  ctx.fillStyle = isDark ? Colors.darkText : Colors.dark;
  ctx.font = `bold ${valueFontSize}px "Noto Sans SC", sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText(
    `${osc.state.x.toFixed(1)}m`,
    drawCenterX + ballRadius + Math.max(10, Math.round(12 * (ballRadius / 22))),
    massY + 4
  );

  // 点击区域
  const clickPadding = 20;
  return {
    id: osc.id,
    type: 'rect',
    left: drawCenterX - ballRadius - clickPadding,
    top: fixedY - 10,
    right: drawCenterX + ballRadius + clickPadding,
    bottom: massY + ballRadius + 10
  };
}
