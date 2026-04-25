import type { Oscillator } from '../scene.sim';
import { Colors, alpha } from '../../../core/colors';
import { drawSpring } from './draw-spring';
import type { ClickArea } from './types';

export function drawHorizontal(
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

export function drawVertical(
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
