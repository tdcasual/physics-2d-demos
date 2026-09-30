import { multimeterConstants, type MultimeterState } from '../scene.sim';
import { rounded, text, type Palette } from './draw-helpers';

export function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: MultimeterState,
  p: Palette,
  scale: number
): void {
  const x = multimeterConstants.panelX * scale;
  const w = multimeterConstants.panelWidth * scale;
  ctx.fillStyle = p.panel;
  ctx.fillRect(x, 0, w, multimeterConstants.baseHeight * scale);
  text(
    ctx,
    '多用电表实验教研课件',
    x + 18 * scale,
    32 * scale,
    p.ink,
    18 * scale,
    'left',
    700
  );
  text(
    ctx,
    '高中物理',
    x + w - 18 * scale,
    32 * scale,
    p.blue,
    13 * scale,
    'right',
    700
  );
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.moveTo(x + 18 * scale, 58 * scale);
  ctx.lineTo(x + w - 18 * scale, 58 * scale);
  ctx.stroke();
  const modes: Array<[string, number, boolean]> = [
    ['自由测量', 18, state.mode === 'resistance'],
    ['调零步骤', 137, false],
    ['原理考点', 256, false]
  ];
  modes.forEach(([label, offset, active]) => {
    ctx.fillStyle = active ? p.panel : p.soft;
    ctx.beginPath();
    ctx.roundRect(
      x + offset * scale,
      70 * scale,
      110 * scale,
      30 * scale,
      7 * scale
    );
    ctx.fill();
    text(
      ctx,
      label,
      x + (offset + 55) * scale,
      85 * scale,
      active ? p.blue : p.muted,
      13 * scale,
      'center',
      700
    );
  });
  text(
    ctx,
    '1. 选择待测目标/元件：',
    x + 18 * scale,
    123 * scale,
    p.ink,
    14 * scale,
    'left',
    700
  );
  const targets: Array<[string, number, string]> = [
    ['短接两表笔（调零）', 18, p.teal],
    ['15 Ω 定值电阻', 205, p.gold],
    ['150 Ω 定值电阻', 18, p.gold],
    ['1.5 kΩ 定值电阻', 205, p.gold],
    ['二极管（正向导通）', 18, p.purple],
    ['二极管（反向截止）', 205, p.purple],
    ['1.5 V 干电池', 18, p.blue],
    ['9.0 V 蓄电池', 205, p.blue]
  ];
  targets.forEach(([label, offset, color], index) => {
    const row = Math.floor(index / 2);
    const y = 139 + row * 38;
    const selected = label === state.targetLabel;
    rounded(
      ctx,
      x + offset * scale,
      y * scale,
      178 * scale,
      30 * scale,
      6 * scale,
      selected ? `${color}20` : p.panel,
      selected ? color : p.border,
      1.2 * scale
    );
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(
      x + (offset + 10) * scale,
      (y + 15) * scale,
      4 * scale,
      0,
      Math.PI * 2
    );
    ctx.fill();
    text(
      ctx,
      label,
      x + (offset + 20) * scale,
      (y + 15) * scale,
      p.ink,
      11 * scale,
      'left',
      600
    );
  });
  rounded(
    ctx,
    x + 18 * scale,
    298 * scale,
    w - 36 * scale,
    38 * scale,
    8 * scale,
    p.soft,
    p.border,
    1.2 * scale
  );
  text(
    ctx,
    '表笔连接状态：',
    x + 30 * scale,
    317 * scale,
    p.muted,
    13 * scale,
    'left',
    600
  );
  rounded(
    ctx,
    x + 205 * scale,
    304 * scale,
    139 * scale,
    26 * scale,
    6 * scale,
    state.connected ? p.teal : p.blue,
    state.connected ? p.teal : p.blue,
    1 * scale
  );
  text(
    ctx,
    state.connected ? '已连接' : '自动贴合测量点',
    x + 274.5 * scale,
    317 * scale,
    '#fff',
    11 * scale,
    'center',
    700
  );
  text(
    ctx,
    '机械调零螺丝：',
    x + 30 * scale,
    361 * scale,
    p.ink,
    13 * scale,
    'left',
    700
  );
  text(
    ctx,
    '◀   ▶',
    x + w - 38 * scale,
    361 * scale,
    p.muted,
    15 * scale,
    'right',
    700
  );
  text(
    ctx,
    '欧姆调零旋钮：',
    x + 30 * scale,
    390 * scale,
    p.teal,
    13 * scale,
    'left',
    700
  );
  rounded(
    ctx,
    x + 258 * scale,
    378 * scale,
    84 * scale,
    26 * scale,
    6 * scale,
    p.teal,
    p.teal,
    1 * scale
  );
  text(
    ctx,
    '一键校准',
    x + 300 * scale,
    391 * scale,
    '#fff',
    11 * scale,
    'center',
    700
  );
  rounded(
    ctx,
    x + 18 * scale,
    410 * scale,
    w - 36 * scale,
    64 * scale,
    8 * scale,
    '#111b30',
    '#4a5a73',
    1.2 * scale
  );
  text(
    ctx,
    '表盘刻度微观放大窗：',
    x + 30 * scale,
    430 * scale,
    p.muted,
    12 * scale,
    'left',
    600
  );
  text(
    ctx,
    state.mode === 'resistance' ? '读欧姆刻度' : '读线性刻度',
    x + 30 * scale,
    451 * scale,
    state.mode === 'resistance' ? p.gold : p.blue,
    13 * scale,
    'left',
    700
  );
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.2 * scale;
  ctx.beginPath();
  ctx.moveTo(x + 242 * scale, 451 * scale);
  ctx.lineTo(x + 342 * scale, 451 * scale);
  ctx.stroke();
  for (let i = 0; i < 8; i += 1) {
    const tx = x + (242 + i * 14) * scale;
    ctx.beginPath();
    ctx.moveTo(tx, 443 * scale);
    ctx.lineTo(tx, 459 * scale);
    ctx.stroke();
  }
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 3 * scale;
  const mx = x + (242 + state.pointerFraction * 100) * scale;
  ctx.beginPath();
  ctx.moveTo(mx, 438 * scale);
  ctx.lineTo(mx, 461 * scale);
  ctx.stroke();
  rounded(
    ctx,
    x + 18 * scale,
    488 * scale,
    w - 36 * scale,
    132 * scale,
    8 * scale,
    p.panel,
    p.blue,
    1.2 * scale
  );
  text(
    ctx,
    '选择档位：',
    x + 30 * scale,
    512 * scale,
    p.muted,
    13 * scale,
    'left',
    600
  );
  text(
    ctx,
    state.rangeLabel,
    x + w - 30 * scale,
    512 * scale,
    p.blue,
    14 * scale,
    'right',
    700
  );
  text(
    ctx,
    '表针指示刻度：',
    x + 30 * scale,
    537 * scale,
    p.muted,
    13 * scale,
    'left',
    600
  );
  text(
    ctx,
    state.scaleReading === null ? '--' : state.scaleReading.toFixed(1),
    x + w - 30 * scale,
    537 * scale,
    p.ink,
    14 * scale,
    'right',
    700
  );
  text(
    ctx,
    '计算转换公式：',
    x + 30 * scale,
    562 * scale,
    p.muted,
    13 * scale,
    'left',
    600
  );
  text(
    ctx,
    state.mode === 'resistance'
      ? 'R = 刻度 × 倍率'
      : state.mode === 'voltage'
        ? 'U = 刻度 × 档位/50'
        : '二极管正向压降',
    x + w - 30 * scale,
    562 * scale,
    p.ink,
    12 * scale,
    'right',
    700
  );
  text(
    ctx,
    '最终测量值：',
    x + 30 * scale,
    595 * scale,
    p.ink,
    14 * scale,
    'left',
    700
  );
  text(
    ctx,
    state.connected ? state.measuredText : '--',
    x + w - 30 * scale,
    595 * scale,
    state.connected ? p.blue : p.muted,
    16 * scale,
    'right',
    700
  );
  ctx.fillStyle = p.soft;
  ctx.beginPath();
  ctx.roundRect(
    x + 18 * scale,
    632 * scale,
    w - 36 * scale,
    28 * scale,
    5 * scale
  );
  ctx.fill();
  text(
    ctx,
    state.status,
    x + w / 2,
    646 * scale,
    p.muted,
    11 * scale,
    'center',
    600
  );
  ctx.fillStyle = p.blue;
  ctx.beginPath();
  ctx.roundRect(
    x + 18 * scale,
    672 * scale,
    170 * scale,
    32 * scale,
    7 * scale
  );
  ctx.fill();
  text(
    ctx,
    '自动贴合测量点',
    x + 103 * scale,
    688 * scale,
    '#fff',
    12 * scale,
    'center',
    700
  );
  ctx.fillStyle = p.soft;
  ctx.beginPath();
  ctx.roundRect(
    x + 198 * scale,
    672 * scale,
    146 * scale,
    32 * scale,
    7 * scale
  );
  ctx.fill();
  text(
    ctx,
    '一键校准',
    x + 271 * scale,
    688 * scale,
    p.ink,
    12 * scale,
    'center',
    700
  );
  text(
    ctx,
    '欧姆挡：先调零，再测量；电压挡并联接入',
    x + 18 * scale,
    730 * scale,
    p.muted,
    11 * scale,
    'left',
    600
  );
}
