import type { MultimeterState } from '../scene.sim';
import { rounded, text, type Palette } from './draw-helpers';

export function drawLeadsAndTarget(
  ctx: CanvasRenderingContext2D,
  state: MultimeterState,
  p: Palette,
  scale: number
): void {
  const redX = 610 * scale;
  const blackX = 528 * scale;
  const y = 594 * scale;
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 5 * scale;
  ctx.beginPath();
  ctx.moveTo(redX, y);
  ctx.bezierCurveTo(
    redX,
    672 * scale,
    540 * scale,
    672 * scale,
    490 * scale,
    632 * scale
  );
  ctx.stroke();
  ctx.strokeStyle = '#718096';
  ctx.beginPath();
  ctx.moveTo(blackX, y);
  ctx.bezierCurveTo(
    500 * scale,
    654 * scale,
    475 * scale,
    682 * scale,
    445 * scale,
    704 * scale
  );
  ctx.stroke();
  ctx.fillStyle = p.red;
  ctx.beginPath();
  ctx.arc(redX, y, 15 * scale, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, '+', redX, y, '#fff', 15 * scale, 'center', 700);
  ctx.fillStyle = '#4b5563';
  ctx.beginPath();
  ctx.arc(blackX, y, 15 * scale, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, '−', blackX, y, '#fff', 15 * scale, 'center', 700);
  text(
    ctx,
    '正极孔 (+)',
    redX,
    y + 34 * scale,
    p.red,
    12 * scale,
    'center',
    600
  );
  text(
    ctx,
    '负极孔 (−)',
    blackX,
    y + 34 * scale,
    p.muted,
    12 * scale,
    'center',
    600
  );
  rounded(
    ctx,
    18 * scale,
    620 * scale,
    714 * scale,
    120 * scale,
    16 * scale,
    p.darkBody,
    '#4d5a69',
    2 * scale
  );
  text(
    ctx,
    '待测元件 / 测试台：',
    38 * scale,
    642 * scale,
    p.muted,
    14 * scale,
    'left',
    700
  );
  ctx.fillStyle = '#d87900';
  ctx.strokeStyle = '#8d5105';
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  ctx.roundRect(290 * scale, 666 * scale, 180 * scale, 38 * scale, 7 * scale);
  ctx.fill();
  ctx.stroke();
  text(
    ctx,
    state.targetLabel,
    380 * scale,
    685 * scale,
    '#fff',
    12 * scale,
    'center',
    700
  );
  ctx.fillStyle = p.gold;
  ctx.beginPath();
  ctx.arc(264 * scale, 685 * scale, 4 * scale, 0, Math.PI * 2);
  ctx.arc(498 * scale, 685 * scale, 4 * scale, 0, Math.PI * 2);
  ctx.fill();
  text(
    ctx,
    state.connected
      ? '表笔已接触测量点'
      : '拖拽表笔接触触点，或使用右侧自动贴合',
    380 * scale,
    720 * scale,
    state.connected ? p.teal : p.muted,
    13 * scale,
    'center',
    600
  );
}
