import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { pendulumConstants, type PendulumState } from './scene.sim';

export type CreatePendulumViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

type Palette = {
  bg: string;
  grid: string;
  panel: string;
  ink: string;
  muted: string;
  border: string;
  blue: string;
  red: string;
  teal: string;
  gold: string;
  soft: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    grid: '#ebe7e0',
    panel: '#ffffff',
    ink: '#303744',
    muted: '#8795a7',
    border: '#d1d9e2',
    blue: '#2485d8',
    red: '#ef4050',
    teal: '#26a392',
    gold: '#d69a20',
    soft: '#f1f4f7'
  },
  dark: {
    bg: '#101827',
    grid: '#2a3a51',
    panel: '#172235',
    ink: '#eef2f7',
    muted: '#aab6c8',
    border: '#3c4b61',
    blue: '#60a5fa',
    red: '#fb7185',
    teal: '#34d399',
    gold: '#fbbf24',
    soft: '#202e42'
  }
};

function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  color: string,
  size: number,
  align: CanvasTextAlign = 'left',
  weight = 600
): void {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

function roundedCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  p: Palette,
  fill = p.panel
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 13);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function arrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dx: number,
  dy: number,
  color: string,
  width = 3
): void {
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const px = -uy;
  const py = ux;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + dx, y + dy);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + dx, y + dy);
  ctx.lineTo(x + dx - ux * 12 + px * 6, y + dy - uy * 12 + py * 6);
  ctx.lineTo(x + dx - ux * 12 - px * 6, y + dy - uy * 12 - py * 6);
  ctx.closePath();
  ctx.fill();
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  scale: number
): void {
  const fieldW = pendulumConstants.fieldWidth * scale;
  const height = pendulumConstants.baseHeight * scale;
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, fieldW, height);
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = scale;
  for (let x = 0; x <= fieldW; x += 48 * scale) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += 48 * scale) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(fieldW, y);
    ctx.stroke();
  }
}

function drawRuler(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  scale: number
): void {
  const x = 120 * scale;
  const top = pendulumConstants.rulerTop * scale;
  const bottom = pendulumConstants.rulerBottom * scale;
  ctx.fillStyle = p.panel;
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.roundRect(x, top, 48 * scale, bottom - top, 5 * scale);
  ctx.fill();
  ctx.stroke();
  text(
    ctx,
    '刻度尺 (cm)',
    x - 24 * scale,
    top - 22 * scale,
    p.muted,
    14 * scale,
    'left',
    600
  );
  for (let cm = 0; cm <= 150; cm += 10) {
    const y = top + (cm / 150) * (bottom - top);
    const tick = cm % 20 === 0 ? 22 : 13;
    ctx.strokeStyle = p.muted;
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + tick * scale, y);
    ctx.stroke();
    if (cm % 20 === 0)
      text(ctx, `${cm}`, x + 32 * scale, y, p.muted, 12 * scale, 'left', 500);
  }
}

function drawStand(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  scale: number
): void {
  const pivotX = pendulumConstants.pivotX * scale;
  const pivotY = pendulumConstants.pivotY * scale;
  ctx.fillStyle = '#59636e';
  ctx.fillRect(318 * scale, 142 * scale, 28 * scale, 535 * scale);
  ctx.fillRect(318 * scale, 110 * scale, 610 * scale, 28 * scale);
  ctx.fillStyle = '#454d57';
  ctx.fillRect(
    pivotX - 24 * scale,
    pivotY - 10 * scale,
    48 * scale,
    22 * scale
  );
  ctx.fillStyle = p.red;
  ctx.beginPath();
  ctx.arc(pivotX, pivotY, 5 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 1.5 * scale;
  ctx.setLineDash([5 * scale, 7 * scale]);
  ctx.beginPath();
  ctx.moveTo(pivotX, pivotY + 5 * scale);
  ctx.lineTo(pivotX, 600 * scale);
  ctx.stroke();
  ctx.setLineDash([]);
  text(
    ctx,
    '平衡位置 (O)',
    pivotX - 96 * scale,
    404 * scale,
    p.muted,
    13 * scale,
    'left',
    500
  );
}

function drawPendulum(
  ctx: CanvasRenderingContext2D,
  state: PendulumState,
  p: Palette,
  scale: number
): void {
  const pivotX = pendulumConstants.pivotX * scale;
  const pivotY = pendulumConstants.pivotY * scale;
  // Keep the full bob, sensor and force vectors inside the fixed teaching
  // canvas while preserving the calibrated default length appearance.
  const length =
    Math.min(state.length * pendulumConstants.lengthPixelsPerMeter, 500) *
    scale;
  const theta = state.angleRad;
  const bobX = pivotX + Math.sin(theta) * length;
  const bobY = pivotY + Math.cos(theta) * length;
  const bottomY = pivotY + length;

  ctx.strokeStyle = '#c7ced6';
  ctx.lineWidth = 2 * scale;
  ctx.setLineDash([4 * scale, 6 * scale]);
  ctx.beginPath();
  const smallAngle = Math.PI / 36;
  ctx.arc(
    pivotX,
    pivotY,
    length,
    Math.PI / 2 - smallAngle,
    Math.PI / 2 + smallAngle
  );
  ctx.stroke();
  ctx.setLineDash([]);
  text(
    ctx,
    '-5°',
    pivotX - 74 * scale,
    pivotY + length * 0.68,
    p.teal,
    13 * scale,
    'left',
    600
  );
  text(
    ctx,
    '+5°',
    pivotX + 44 * scale,
    pivotY + length * 0.68,
    p.teal,
    13 * scale,
    'left',
    600
  );

  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  ctx.moveTo(pivotX, pivotY);
  ctx.lineTo(bobX, bobY);
  ctx.stroke();
  ctx.fillStyle = '#4d5965';
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.arc(bobX, bobY, pendulumConstants.bobRadius * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = p.red;
  ctx.beginPath();
  ctx.arc(bobX + 3 * scale, bobY - 4 * scale, 5 * scale, 0, Math.PI * 2);
  ctx.fill();

  const beamX = pivotX;
  ctx.strokeStyle = `${p.teal}88`;
  ctx.lineWidth = 4 * scale;
  ctx.beginPath();
  ctx.moveTo(634 * scale, bottomY);
  ctx.lineTo(726 * scale, bottomY);
  ctx.stroke();
  ctx.fillStyle = p.teal;
  ctx.beginPath();
  ctx.arc(beamX, bottomY, 7 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 5 * scale;
  ctx.beginPath();
  ctx.moveTo(642 * scale, bottomY + 2 * scale);
  ctx.lineTo(642 * scale, bottomY + 29 * scale);
  ctx.lineTo(624 * scale, bottomY + 29 * scale);
  ctx.moveTo(718 * scale, bottomY + 2 * scale);
  ctx.lineTo(718 * scale, bottomY + 29 * scale);
  ctx.lineTo(736 * scale, bottomY + 29 * scale);
  ctx.stroke();
  text(
    ctx,
    '光电门（最低点）',
    700 * scale,
    bottomY + 34 * scale,
    p.ink,
    13 * scale,
    'left',
    600
  );

  if (state.showForces) {
    arrow(
      ctx,
      bobX,
      bobY,
      -Math.sin(theta) * 72 * scale,
      -Math.cos(theta) * 72 * scale,
      p.blue,
      4 * scale
    );
    text(
      ctx,
      'F_T',
      bobX - Math.sin(theta) * 80 * scale - 3 * scale,
      bobY - Math.cos(theta) * 80 * scale,
      p.blue,
      14 * scale,
      'center',
      700
    );
    arrow(ctx, bobX, bobY, 0, 78 * scale, p.red, 4 * scale);
    text(
      ctx,
      'G=mg',
      bobX + 12 * scale,
      bobY + 88 * scale,
      p.red,
      13 * scale,
      'left',
      700
    );
  }
  if (state.showComponents) {
    const tangentX = Math.cos(theta) * state.tangentialGravity * 4.2 * scale;
    const tangentY = -Math.sin(theta) * state.tangentialGravity * 4.2 * scale;
    arrow(ctx, bobX, bobY, tangentX, tangentY, p.teal, 3 * scale);
    text(
      ctx,
      'Gₜ',
      bobX + tangentX + 10 * scale,
      bobY + tangentY,
      p.teal,
      12 * scale,
      'left',
      700
    );
    arrow(
      ctx,
      bobX,
      bobY,
      -Math.sin(theta) * 42 * scale,
      -Math.cos(theta) * 42 * scale,
      p.gold,
      2 * scale
    );
    text(
      ctx,
      'Gₙ',
      bobX - Math.sin(theta) * 50 * scale,
      bobY - Math.cos(theta) * 50 * scale,
      p.gold,
      12 * scale,
      'center',
      700
    );
  }
}

function drawEnergyCard(
  ctx: CanvasRenderingContext2D,
  state: PendulumState,
  p: Palette,
  scale: number
): void {
  const x = 40 * scale;
  const y = 650 * scale;
  const width = 352 * scale;
  roundedCard(ctx, x, y, width, 102 * scale, p, p.panel);
  text(
    ctx,
    '机械能转化监控',
    x + 18 * scale,
    y + 23 * scale,
    p.ink,
    15 * scale,
    'left',
    700
  );
  const kineticRatio = Math.min(
    1,
    state.speed / Math.max(0.01, state.length * 1.2)
  );
  const potentialRatio = Math.min(
    1,
    Math.abs(1 - Math.cos(state.angleRad)) * 90
  );
  const rows: Array<[string, number, string, number]> = [
    ['动能 Eₖ', kineticRatio, p.red, 52],
    ['势能 Eₚ', potentialRatio, p.teal, 74],
    ['总能 E', 0.82, p.blue, 96]
  ];
  rows.forEach(([label, ratio, color, rowY]) => {
    text(
      ctx,
      label,
      x + 18 * scale,
      y + rowY * scale,
      p.muted,
      12 * scale,
      'left',
      600
    );
    ctx.fillStyle = p.soft;
    ctx.beginPath();
    ctx.roundRect(
      x + 92 * scale,
      y + (rowY - 7) * scale,
      206 * scale,
      14 * scale,
      7 * scale
    );
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(
      x + 92 * scale,
      y + (rowY - 7) * scale,
      206 * ratio * scale,
      14 * scale,
      7 * scale
    );
    ctx.fill();
  });
}

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

function drawPanel(
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

export function createPendulumView(options: CreatePendulumViewOptions = {}) {
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: {
      mode: 'clamped',
      fallbackWidth: pendulumConstants.baseWidth,
      fallbackHeight: pendulumConstants.baseHeight
    },
    initialWidth: pendulumConstants.baseWidth,
    initialHeight: pendulumConstants.baseHeight,
    eagerContext: true
  });
  let snapshot: PendulumState | null = null;

  function draw(state: PendulumState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const scale = env.contentScale() * stage.responsiveScale;
    const fit = Math.min(
      width / (pendulumConstants.baseWidth * scale),
      height / (pendulumConstants.baseHeight * scale)
    );
    const offsetX = Math.max(
      0,
      (width - pendulumConstants.baseWidth * scale * fit) / 2
    );
    const offsetY = Math.max(
      0,
      (height - pendulumConstants.baseHeight * scale * fit) / 2
    );
    const p = PALETTE[env.theme];
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fit, fit);
    drawGrid(ctx, p, scale);
    text(
      ctx,
      '单摆周期与测重力加速度',
      28 * scale,
      35 * scale,
      p.ink,
      25 * scale,
      'left',
      700
    );
    text(
      ctx,
      '高中物理 · 简谐运动与实验探究（理想模型无阻尼仿真）',
      28 * scale,
      67 * scale,
      p.muted,
      14 * scale,
      'left',
      600
    );
    drawRuler(ctx, p, scale);
    drawStand(ctx, p, scale);
    drawPendulum(ctx, state, p, scale);
    drawEnergyCard(ctx, state, p, scale);
    drawPanel(ctx, state, p, scale);
    text(
      ctx,
      '拖拽摆球改变振幅 · 空格键暂停/恢复',
      400 * scale,
      742 * scale,
      p.muted,
      13 * scale,
      'left',
      600
    );
    ctx.restore();
  }

  return {
    render(state: PendulumState) {
      snapshot = state;
      stage.ensureSized();
      draw(state);
    },
    resize() {
      stage.resize();
      if (snapshot) draw(snapshot);
    },
    setTheme(theme: TeachingTheme) {
      env.setTheme(theme);
      if (snapshot) draw(snapshot);
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints) {
      env.setMode(mode, hints);
      if (snapshot) draw(snapshot);
    },
    dispose() {
      snapshot = null;
      stage.release();
    }
  };
}
