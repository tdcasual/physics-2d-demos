import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { multimeterConstants, type MultimeterState } from './scene.sim';

export type CreateMultimeterViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
  onProbeDrop?: () => void;
};

type Palette = {
  bg: string;
  panel: string;
  face: string;
  darkBody: string;
  ink: string;
  muted: string;
  border: string;
  blue: string;
  red: string;
  teal: string;
  gold: string;
  purple: string;
  soft: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    panel: '#fff',
    face: '#fcfaf1',
    darkBody: '#1b2028',
    ink: '#303744',
    muted: '#7b8795',
    border: '#d1d9e2',
    blue: '#2485d8',
    red: '#ef4050',
    teal: '#22a18f',
    gold: '#e49b16',
    purple: '#8d55db',
    soft: '#f0f4f7'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    face: '#edf1ea',
    darkBody: '#111820',
    ink: '#eef2f7',
    muted: '#aab6c8',
    border: '#3c4b61',
    blue: '#60a5fa',
    red: '#fb7185',
    teal: '#34d399',
    gold: '#fbbf24',
    purple: '#b58af3',
    soft: '#253249'
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

function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: string,
  stroke: string,
  line = 1.5
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = line;
  ctx.stroke();
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  scale: number
): void {
  const width = multimeterConstants.fieldWidth * scale;
  const height = multimeterConstants.baseHeight * scale;
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = `${p.border}55`;
  ctx.lineWidth = scale;
  for (let x = 0; x <= width; x += 48 * scale) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += 48 * scale) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function drawArcScale(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  scale: number
): void {
  const cx = 380 * scale;
  const cy = 270 * scale;
  const radius = 194 * scale;
  const start = Math.PI * 1.15;
  const end = Math.PI * 1.85;
  const arcs: Array<[number, string, number]> = [
    [radius, p.teal, 1],
    [radius - 20 * scale, p.blue, 1],
    [radius - 39 * scale, p.red, 1]
  ];
  arcs.forEach(([r, color, width]) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5 * scale * width;
    ctx.beginPath();
    ctx.arc(cx, cy, r, start, end);
    ctx.stroke();
  });
  const labels = ['∞', '200', '100', '50', '20', '10', '5', '0'];
  labels.forEach((label, index) => {
    const f = index / (labels.length - 1);
    const angle = start + f * (end - start);
    const x = cx + Math.cos(angle) * (radius - 13 * scale);
    const y = cy + Math.sin(angle) * (radius - 13 * scale);
    text(ctx, label, x, y, p.teal, 12 * scale, 'center', 700);
  });
  for (let index = 0; index <= 20; index += 1) {
    const f = index / 20;
    const angle = start + f * (end - start);
    const inner = radius - (index % 5 === 0 ? 18 : 12) * scale;
    const outer = radius + 2 * scale;
    ctx.strokeStyle = p.muted;
    ctx.lineWidth = (index % 5 === 0 ? 2 : 1) * scale;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    ctx.stroke();
  }
  text(
    ctx,
    '欧姆 (Ω)',
    54 * scale,
    148 * scale,
    p.teal,
    14 * scale,
    'left',
    700
  );
  text(
    ctx,
    '直流/交流\n伏·毫安',
    54 * scale,
    185 * scale,
    p.blue,
    13 * scale,
    'left',
    700
  );
  text(
    ctx,
    '交流 2.5V',
    54 * scale,
    218 * scale,
    p.red,
    13 * scale,
    'left',
    700
  );
}

function drawMeterFace(
  ctx: CanvasRenderingContext2D,
  state: MultimeterState,
  p: Palette,
  scale: number
): void {
  rounded(
    ctx,
    36 * scale,
    20 * scale,
    714 * scale,
    290 * scale,
    16 * scale,
    p.face,
    '#4c5560',
    4 * scale
  );
  text(
    ctx,
    'J0411 型多用电表',
    392 * scale,
    42 * scale,
    '#334154',
    16 * scale,
    'center',
    700
  );
  drawArcScale(ctx, p, scale);
  const cx = 380 * scale;
  const cy = 270 * scale;
  const pointerLength = 198 * scale;
  const tipX = cx + Math.cos(state.pointerAngle) * pointerLength;
  const tipY = cy + Math.sin(state.pointerAngle) * pointerLength;
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 2.5 * scale;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  ctx.fillStyle = '#364253';
  ctx.strokeStyle = '#aeb9c7';
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.arc(cx, cy, 13 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  text(
    ctx,
    '指针指示刻度',
    cx,
    306 * scale,
    p.muted,
    11 * scale,
    'center',
    600
  );
}

function drawSelector(
  ctx: CanvasRenderingContext2D,
  state: MultimeterState,
  p: Palette,
  scale: number
): void {
  const cx = 375 * scale;
  const cy = 480 * scale;
  const radius = 128 * scale;
  const segments: Array<[number, number, string]> = [
    [Math.PI * 1.12, Math.PI * 1.42, p.purple],
    [Math.PI * 1.42, Math.PI * 1.72, p.teal],
    [Math.PI * 1.72, Math.PI * 2.02, p.gold],
    [Math.PI * 2.02, Math.PI * 2.32, p.blue],
    [Math.PI * 2.32, Math.PI * 2.65, p.red]
  ];
  segments.forEach(([start, end, color]) => {
    ctx.fillStyle = `${color}aa`;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, end);
    ctx.closePath();
    ctx.fill();
  });
  ctx.strokeStyle = '#3b4653';
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  const labels = [
    ['Ω×1', 1.27, p.teal],
    ['×10', 1.55, p.teal],
    ['×100', 1.82, p.teal],
    ['×1k', 2.1, p.purple],
    ['V−500', 2.39, p.red],
    ['V−2.5', 2.58, p.blue],
    ['10', 2.87, p.blue],
    ['50', 3.11, p.blue]
  ] as Array<[string, number, string]>;
  labels.forEach(([label, angle, color]) =>
    text(
      ctx,
      label,
      cx + Math.cos(angle) * 93 * scale,
      cy + Math.sin(angle) * 93 * scale,
      color,
      12 * scale,
      'center',
      700
    )
  );
  ctx.fillStyle = '#141a22';
  ctx.strokeStyle = '#64758a';
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.arc(cx, cy, 53 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const knobAngle =
    state.mode === 'voltage'
      ? Math.PI * 2.82
      : state.mode === 'diode'
        ? Math.PI * 1.48
        : Math.PI * 1.78;
  ctx.strokeStyle = '#f4f7fb';
  ctx.lineWidth = 7 * scale;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 12 * scale);
  ctx.lineTo(cx, cy - 43 * scale);
  ctx.stroke();
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(knobAngle);
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 5 * scale;
  ctx.beginPath();
  ctx.moveTo(0, -18 * scale);
  ctx.lineTo(0, -42 * scale);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#0f1520';
  ctx.beginPath();
  ctx.arc(cx, cy, 14 * scale, 0, Math.PI * 2);
  ctx.fill();
  const zeroX = 610 * scale;
  ctx.fillStyle = '#111827';
  ctx.strokeStyle = '#55657a';
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  ctx.arc(zeroX, cy - 20 * scale, 33 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#93a5ba';
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(zeroX - 20 * scale, cy - 20 * scale);
  ctx.lineTo(zeroX + 20 * scale, cy - 20 * scale);
  ctx.stroke();
  text(
    ctx,
    '欧姆调零旋钮',
    zeroX,
    cy + 48 * scale,
    p.teal,
    12 * scale,
    'center',
    600
  );
}

function drawLeadsAndTarget(
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

function drawPanel(
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

export function createMultimeterView(
  options: CreateMultimeterViewOptions = {}
) {
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: {
      mode: 'clamped',
      fallbackWidth: multimeterConstants.baseWidth,
      fallbackHeight: multimeterConstants.baseHeight
    },
    initialWidth: multimeterConstants.baseWidth,
    initialHeight: multimeterConstants.baseHeight,
    eagerContext: true
  });
  let snapshot: MultimeterState | null = null;
  let dragging = false;
  const canvas = options.canvas;
  const onPointerDown = () => {
    dragging = true;
  };
  const onPointerUp = () => {
    if (!dragging) return;
    dragging = false;
    options.onProbeDrop?.();
  };
  if (canvas) {
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
  }
  function draw(state: MultimeterState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const scale = env.contentScale() * stage.responsiveScale;
    const fit = Math.min(
      width / (multimeterConstants.baseWidth * scale),
      height / (multimeterConstants.baseHeight * scale)
    );
    const offsetX = Math.max(
      0,
      (width - multimeterConstants.baseWidth * scale * fit) / 2
    );
    const offsetY = Math.max(
      0,
      (height - multimeterConstants.baseHeight * scale * fit) / 2
    );
    const p = PALETTE[env.theme];
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fit, fit);
    drawGrid(ctx, p, scale);
    drawMeterFace(ctx, state, p, scale);
    drawSelector(ctx, state, p, scale);
    drawLeadsAndTarget(ctx, state, p, scale);
    drawPanel(ctx, state, p, scale);
    text(
      ctx,
      '空格键暂停/恢复 · 拖拽表笔到触点',
      260 * scale,
      748 * scale,
      p.muted,
      13 * scale,
      'left',
      600
    );
    ctx.restore();
  }
  return {
    render(state: MultimeterState) {
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
      if (canvas) {
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointerup', onPointerUp);
      }
      snapshot = null;
      stage.release();
    }
  };
}
