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
  isDark: boolean,
  s: number
): ClickArea {
  const equilibriumX = centerX + 10 * s;
  const massX = equilibriumX + displacement;
  const fixedX = equilibriumX - springLength;
  const baseY = centerY;

  const lw = Math.max(0.5, 1 * s);

  // 平衡位置虚线
  ctx.strokeStyle = isDark
    ? alpha(Colors.gray, 0.25)
    : alpha(Colors.grayLight, 0.4);
  ctx.setLineDash([3 * s, 3 * s]);
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(equilibriumX, baseY - 20 * s);
  ctx.lineTo(equilibriumX, baseY + 25 * s);
  ctx.stroke();
  ctx.setLineDash([]);

  // 固定端（墙面）
  const wallW = Math.max(2, 3 * s);
  const wallH = Math.round(36 * s);
  const wallTop = baseY - wallH / 2;
  ctx.fillStyle = isDark ? Colors.darkText : Colors.dark;
  ctx.fillRect(fixedX - wallW, wallTop, wallW, wallH);
  ctx.strokeStyle = isDark ? Colors.darkText : Colors.dark;
  ctx.lineWidth = lw;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(fixedX - 5 * s, baseY + i * 6 * s);
    ctx.lineTo(fixedX - 2 * s, baseY + i * 6 * s + 2 * s);
    ctx.stroke();
  }

  // 弹簧
  const springEndX = massX - ballRadius;
  if (springEndX > fixedX + 8 * s) {
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
  const markerDist = Math.max(5, 7 * s);
  const markerR = Math.max(2.5, 3.5 * s);
  const markerAngle = osc.state.phase;
  const markerX = massX + Math.cos(markerAngle) * markerDist;
  const markerY = baseY + Math.sin(markerAngle) * markerDist;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(markerX, markerY, markerR, 0, Math.PI * 2);
  ctx.fill();

  // 暂停状态遮罩
  if (!osc.isPlaying) {
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.arc(massX, baseY, ballRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isDark ? Colors.darkText : '#fff';
    const pw = Math.max(1.5, 2 * s);
    const ph = Math.max(7, 10 * s);
    const px = massX - Math.max(2, 3 * s);
    const py = baseY - Math.max(3.5, 5 * s);
    ctx.fillRect(px, py, pw, ph);
    ctx.fillRect(px + Math.max(2.5, 3 * s), py, pw, ph);
  }

  // 位移数值
  ctx.fillStyle = isDark ? Colors.darkText : Colors.dark;
  ctx.font = `bold ${valueFontSize}px "Noto Sans SC", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(
    `${osc.state.x.toFixed(1)}m`,
    massX,
    baseY + ballRadius + Math.max(8, Math.round(10 * s))
  );

  // 点击区域
  const clickPadding = Math.max(16, 20 * s);
  return {
    id: osc.id,
    type: 'rect',
    left: fixedX - 10 * s,
    top: baseY - ballRadius - clickPadding,
    right: massX + ballRadius + 10 * s,
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
  isDark: boolean,
  s: number
): ClickArea {
  const drawCenterX = centerX;
  const equilibriumY = centerY + 8 * s;
  const massY = equilibriumY - displacement;
  const fixedY = equilibriumY - springLength;

  const lw = Math.max(0.5, 1 * s);

  // 平衡位置虚线
  ctx.strokeStyle = isDark
    ? alpha(Colors.gray, 0.25)
    : alpha(Colors.grayLight, 0.4);
  ctx.setLineDash([3 * s, 3 * s]);
  ctx.lineWidth = lw;
  const eqLineHalf = 25 * s;
  ctx.beginPath();
  ctx.moveTo(drawCenterX - eqLineHalf, equilibriumY);
  ctx.lineTo(drawCenterX + eqLineHalf, equilibriumY);
  ctx.stroke();
  ctx.setLineDash([]);

  // 天花板
  const ceilH = Math.max(2, 3 * s);
  const ceilHalfW = 25 * s;
  ctx.fillStyle = isDark ? Colors.darkText : Colors.dark;
  ctx.fillRect(drawCenterX - ceilHalfW, fixedY - ceilH, ceilHalfW * 2, ceilH);
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(drawCenterX + i * 8 * s, fixedY - ceilH);
    ctx.lineTo(drawCenterX + i * 8 * s + 1 * s, fixedY - 5 * s);
    ctx.stroke();
  }

  // 弹簧
  const springEndY = massY - ballRadius;
  if (springEndY > fixedY + 8 * s) {
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
  const markerDist = Math.max(5, 7 * s);
  const markerR = Math.max(2.5, 3.5 * s);
  const markerAngle = osc.state.phase;
  const markerX = drawCenterX + Math.cos(markerAngle) * markerDist;
  const markerY = massY + Math.sin(markerAngle) * markerDist;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(markerX, markerY, markerR, 0, Math.PI * 2);
  ctx.fill();

  // 暂停状态遮罩
  if (!osc.isPlaying) {
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.arc(drawCenterX, massY, ballRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isDark ? Colors.darkText : '#fff';
    const pw = Math.max(1.5, 2 * s);
    const ph = Math.max(7, 10 * s);
    const px = drawCenterX - Math.max(2, 3 * s);
    const py = massY - Math.max(3.5, 5 * s);
    ctx.fillRect(px, py, pw, ph);
    ctx.fillRect(px + Math.max(2.5, 3 * s), py, pw, ph);
  }

  // 位移数值
  ctx.fillStyle = isDark ? Colors.darkText : Colors.dark;
  ctx.font = `bold ${valueFontSize}px "Noto Sans SC", sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText(
    `${osc.state.x.toFixed(1)}m`,
    drawCenterX + ballRadius + Math.max(8, Math.round(10 * s)),
    massY + 4 * s
  );

  // 点击区域
  const clickPadding = Math.max(16, 20 * s);
  return {
    id: osc.id,
    type: 'rect',
    left: drawCenterX - ballRadius - clickPadding,
    top: fixedY - 10 * s,
    right: drawCenterX + ballRadius + clickPadding,
    bottom: massY + ballRadius + 10 * s
  };
}
