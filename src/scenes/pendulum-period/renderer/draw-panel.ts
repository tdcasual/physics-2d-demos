import { pendulumConstants, type PendulumState } from '../scene.sim';
import { roundedCard, text, type Palette } from './draw-helpers';

function drawSlider(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  ratio: number,
  color: string,
  scale: number
): void {
  ctx.strokeStyle = '#d8dee5';
  ctx.lineWidth = 7 * scale;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width * scale, y);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width * ratio * scale, y);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x + width * ratio * scale, y, 11 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = 'butt';
}

export function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: PendulumState,
  p: Palette,
  scale: number
): void {
  const x = pendulumConstants.panelX * scale;
  const w = pendulumConstants.panelWidth * scale;
  ctx.fillStyle = p.panel;
  ctx.fillRect(x, 0, w, pendulumConstants.baseHeight * scale);
  text(
    ctx,
    '单摆周期与测重力加速度',
    x + 18 * scale,
    33 * scale,
    p.ink,
    19 * scale,
    'left',
    700
  );
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.moveTo(x + 18 * scale, 65 * scale);
  ctx.lineTo(x + w - 18 * scale, 65 * scale);
  ctx.stroke();

  text(
    ctx,
    '实验参数控制',
    x + 18 * scale,
    88 * scale,
    p.blue,
    16 * scale,
    'left',
    700
  );
  text(
    ctx,
    '摆长 L',
    x + 18 * scale,
    114 * scale,
    p.muted,
    13 * scale,
    'left',
    600
  );
  drawSlider(
    ctx,
    x + 132 * scale,
    114 * scale,
    164,
    (state.length - 0.3) / 1.2,
    p.blue,
    scale
  );
  text(
    ctx,
    `${state.length.toFixed(2)} m`,
    x + w - 18 * scale,
    114 * scale,
    p.blue,
    13 * scale,
    'right',
    700
  );
  text(
    ctx,
    '重力加速度 g',
    x + 18 * scale,
    141 * scale,
    p.muted,
    13 * scale,
    'left',
    600
  );
  drawSlider(
    ctx,
    x + 132 * scale,
    141 * scale,
    164,
    (state.gravity - 1) / 11,
    p.blue,
    scale
  );
  text(
    ctx,
    `${state.gravity.toFixed(2)} m/s²`,
    x + w - 18 * scale,
    141 * scale,
    p.blue,
    13 * scale,
    'right',
    700
  );
  text(
    ctx,
    '环境预设',
    x + 18 * scale,
    168 * scale,
    p.muted,
    13 * scale,
    'left',
    600
  );
  const presets: Array<[string, number]> = [
    ['地球', 9.8],
    ['月球', 1.63],
    ['火星', 3.71]
  ];
  presets.forEach(([label, value], index) => {
    const px = x + (116 + index * 79) * scale;
    const active = Math.abs(state.gravity - value) < 0.01;
    ctx.fillStyle = active ? p.blue : p.soft;
    ctx.strokeStyle = active ? p.blue : p.border;
    ctx.lineWidth = 1.2 * scale;
    ctx.beginPath();
    ctx.roundRect(px, 155 * scale, 70 * scale, 26 * scale, 7 * scale);
    ctx.fill();
    ctx.stroke();
    text(
      ctx,
      `${label} ${value.toFixed(2)}`,
      px + 35 * scale,
      168 * scale,
      active ? '#fff' : p.ink,
      11 * scale,
      'center',
      700
    );
  });
  text(
    ctx,
    '摆球质量 m',
    x + 18 * scale,
    200 * scale,
    p.muted,
    13 * scale,
    'left',
    600
  );
  drawSlider(
    ctx,
    x + 132 * scale,
    200 * scale,
    164,
    (state.mass - 0.05) / 0.25,
    p.blue,
    scale
  );
  text(
    ctx,
    `${state.mass.toFixed(2)} kg`,
    x + w - 18 * scale,
    200 * scale,
    p.blue,
    13 * scale,
    'right',
    700
  );

  text(
    ctx,
    '受力与分量分析',
    x + 18 * scale,
    229 * scale,
    p.blue,
    16 * scale,
    'left',
    700
  );
  const forceLabel = state.showForces
    ? '外力(G, F_T)：开启'
    : '外力(G, F_T)：隐藏';
  const compLabel = state.showComponents ? '重力分量：显示' : '重力分量：隐藏';
  const buttons: Array<[string, number, string, string]> = [
    [
      forceLabel,
      18,
      state.showForces ? p.blue : p.soft,
      state.showForces ? '#fff' : p.ink
    ],
    [
      compLabel,
      195,
      state.showComponents ? p.teal : p.soft,
      state.showComponents ? '#fff' : p.ink
    ],
    ['复位小角 (5°)', 18, p.soft, p.ink]
  ];
  buttons.forEach(([label, bx, fill, color], index) => {
    const by = index === 2 ? 251 : 240;
    const bw = index === 2 ? 154 : 168;
    const actualX = x + bx * scale + (index === 2 ? 177 * scale : 0);
    ctx.fillStyle = fill;
    ctx.strokeStyle = p.border;
    ctx.lineWidth = 1.2 * scale;
    ctx.beginPath();
    ctx.roundRect(actualX, by * scale, bw * scale, 30 * scale, 7 * scale);
    ctx.fill();
    ctx.stroke();
    text(
      ctx,
      label,
      actualX + (bw * scale) / 2,
      (by + 15) * scale,
      color,
      11 * scale,
      'center',
      700
    );
  });

  text(
    ctx,
    '探究实验：光电计时测定重力加速度',
    x + 18 * scale,
    299 * scale,
    p.blue,
    15 * scale,
    'left',
    700
  );
  roundedCard(
    ctx,
    x + 18 * scale,
    314 * scale,
    w - 36 * scale,
    176 * scale,
    p,
    p.panel
  );
  text(
    ctx,
    '计时状态',
    x + 30 * scale,
    339 * scale,
    p.muted,
    13 * scale,
    'left',
    600
  );
  text(
    ctx,
    state.photogateRunning ? '进行中' : '未启动',
    x + 176 * scale,
    339 * scale,
    state.photogateRunning ? p.teal : p.ink,
    13 * scale,
    'left',
    700
  );
  text(
    ctx,
    '全振动次数 N',
    x + 206 * scale,
    339 * scale,
    p.muted,
    13 * scale,
    'left',
    600
  );
  text(
    ctx,
    `${state.measurementCycles}`,
    x + w - 30 * scale,
    339 * scale,
    p.ink,
    14 * scale,
    'right',
    700
  );
  text(
    ctx,
    '累计时间 t',
    x + 30 * scale,
    367 * scale,
    p.muted,
    13 * scale,
    'left',
    600
  );
  text(
    ctx,
    `${state.measurementTime.toFixed(2)} s`,
    x + 176 * scale,
    367 * scale,
    p.ink,
    13 * scale,
    'left',
    700
  );
  text(
    ctx,
    '测量周期 T测',
    x + 206 * scale,
    367 * scale,
    p.muted,
    13 * scale,
    'left',
    600
  );
  text(
    ctx,
    state.measuredPeriod === null
      ? '-- s'
      : `${state.measuredPeriod.toFixed(2)} s`,
    x + w - 30 * scale,
    367 * scale,
    p.blue,
    13 * scale,
    'right',
    700
  );
  text(
    ctx,
    'g测 = 4π²L/T²',
    x + 30 * scale,
    400 * scale,
    p.muted,
    13 * scale,
    'left',
    600
  );
  text(
    ctx,
    state.measuredGravity === null
      ? '-- m/s²'
      : `${state.measuredGravity.toFixed(2)} m/s²`,
    x + w - 30 * scale,
    400 * scale,
    state.measuredGravity === null ? p.muted : p.red,
    14 * scale,
    'right',
    700
  );
  ctx.fillStyle = p.soft;
  ctx.beginPath();
  ctx.roundRect(
    x + 18 * scale,
    420 * scale,
    w - 36 * scale,
    24 * scale,
    5 * scale
  );
  ctx.fill();
  text(
    ctx,
    '启动后从小球向右通过最低点起计',
    x + w / 2,
    432 * scale,
    p.muted,
    11 * scale,
    'center',
    600
  );
  ctx.fillStyle = p.teal;
  ctx.beginPath();
  ctx.roundRect(
    x + 18 * scale,
    456 * scale,
    ((w - 45) * scale) / 2,
    30 * scale,
    7 * scale
  );
  ctx.fill();
  text(
    ctx,
    '启动光电计时',
    x + (18 + (w / scale - 45) / 4) * scale,
    471 * scale,
    '#fff',
    12 * scale,
    'center',
    700
  );
  ctx.fillStyle = p.soft;
  ctx.beginPath();
  ctx.roundRect(
    x + (w / 2 + 4) * scale,
    456 * scale,
    ((w - 45) * scale) / 2,
    30 * scale,
    7 * scale
  );
  ctx.fill();
  text(
    ctx,
    '重置数据',
    x + (w / 2 + 4 + (w / scale - 45) / 4) * scale,
    471 * scale,
    p.ink,
    12 * scale,
    'center',
    700
  );

  text(
    ctx,
    '实时物理量监测',
    x + 18 * scale,
    520 * scale,
    p.blue,
    16 * scale,
    'left',
    700
  );
  roundedCard(
    ctx,
    x + 18 * scale,
    535 * scale,
    w - 36 * scale,
    113 * scale,
    p,
    p.panel
  );
  const rows: Array<[string, string, string, string]> = [
    [
      '当前摆角 θ',
      `${((state.angleRad * 180) / Math.PI).toFixed(1)}°`,
      '振幅摆角 θmax',
      `${state.amplitude.toFixed(1)}°`
    ],
    [
      '摆线拉力 F_T',
      `${state.tension.toFixed(2)} N`,
      '线速度 v',
      `${state.speed.toFixed(2)} m/s`
    ],
    [
      '小角近似周期 T',
      `${state.period.toFixed(2)} s`,
      '模型与测量',
      state.smallAngleValid ? '适宜测量' : '超出小角'
    ]
  ];
  rows.forEach(([l1, v1, l2, v2], index) => {
    const y = (558 + index * 30) * scale;
    text(ctx, l1, x + 30 * scale, y, p.muted, 12 * scale, 'left', 600);
    text(
      ctx,
      v1,
      x + 166 * scale,
      y,
      index === 2 ? p.blue : p.ink,
      13 * scale,
      'right',
      700
    );
    text(ctx, l2, x + 184 * scale, y, p.muted, 12 * scale, 'left', 600);
    text(
      ctx,
      v2,
      x + w - 30 * scale,
      y,
      index === 2 ? (state.smallAngleValid ? p.teal : p.red) : p.ink,
      13 * scale,
      'right',
      700
    );
  });

  ctx.fillStyle = p.soft;
  ctx.beginPath();
  ctx.roundRect(
    x + 18 * scale,
    662 * scale,
    w - 36 * scale,
    72 * scale,
    7 * scale
  );
  ctx.fill();
  text(
    ctx,
    'Gₜ = −mg·sinθ；T = 2π√(L/g)',
    x + 30 * scale,
    681 * scale,
    p.ink,
    12 * scale,
    'left',
    600
  );
  text(
    ctx,
    state.smallAngleValid
      ? '小角条件：θmax ≤ 5° · 理想模型无阻尼'
      : '提示：θmax > 5°，周期公式存在近似误差',
    x + 30 * scale,
    707 * scale,
    state.smallAngleValid ? p.teal : p.red,
    11 * scale,
    'left',
    600
  );
}
