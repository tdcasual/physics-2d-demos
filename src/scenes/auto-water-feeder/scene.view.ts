import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { feederConstants, type FeederState } from './scene.sim';

export type CreateFeederViewOptions = {
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
  water: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfcfd',
    grid: '#e7edf2',
    panel: '#ffffff',
    ink: '#303744',
    muted: '#8795a7',
    border: '#d8e0e8',
    blue: '#3c82b5',
    red: '#ef4050',
    teal: '#18a58a',
    gold: '#e6a11a',
    water: 'rgba(69, 186, 224, 0.56)'
  },
  dark: {
    bg: '#101827',
    grid: '#2b3b52',
    panel: '#172235',
    ink: '#eef2f7',
    muted: '#aab6c8',
    border: '#3c4b61',
    blue: '#67a6ff',
    red: '#fb7185',
    teal: '#34d399',
    gold: '#fbbf24',
    water: 'rgba(45, 170, 219, 0.48)'
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
  ctx.fillStyle = p.bg;
  ctx.fillRect(
    0,
    0,
    feederConstants.fieldWidth * scale,
    feederConstants.baseHeight * scale
  );
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let x = 0; x <= feederConstants.fieldWidth * scale; x += 48 * scale) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, feederConstants.baseHeight * scale);
    ctx.stroke();
  }
  for (let y = 0; y <= feederConstants.baseHeight * scale; y += 48 * scale) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(feederConstants.fieldWidth * scale, y);
    ctx.stroke();
  }
}

function drawBatteryAndCircuit(
  ctx: CanvasRenderingContext2D,
  state: FeederState,
  p: Palette,
  scale: number
): void {
  const y = 108 * scale;
  const left = 120 * scale;
  const right = 660 * scale;
  const switchX = 478 * scale;
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  ctx.moveTo(left, y);
  ctx.lineTo(292 * scale, y);
  ctx.moveTo(318 * scale, y);
  ctx.lineTo(switchX - 24 * scale, y);
  ctx.moveTo(switchX + 24 * scale, y);
  ctx.lineTo(right, y);
  ctx.lineTo(right, 188 * scale);
  ctx.lineTo(left, 188 * scale);
  ctx.lineTo(left, y);
  ctx.stroke();
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 4 * scale;
  ctx.beginPath();
  ctx.moveTo(292 * scale, y - 24 * scale);
  ctx.lineTo(292 * scale, y + 24 * scale);
  ctx.stroke();
  ctx.strokeStyle = p.blue;
  ctx.beginPath();
  ctx.moveTo(318 * scale, y - 15 * scale);
  ctx.lineTo(318 * scale, y + 15 * scale);
  ctx.stroke();
  text(
    ctx,
    `U = ${state.supplyVoltage.toFixed(0)} V`,
    305 * scale,
    y - 18 * scale,
    p.ink,
    14 * scale,
    'center',
    700
  );
  ctx.fillStyle = p.ink;
  ctx.beginPath();
  ctx.arc(switchX - 24 * scale, y, 5 * scale, 0, Math.PI * 2);
  ctx.arc(switchX + 24 * scale, y, 5 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  ctx.moveTo(switchX - 20 * scale, y - 3 * scale);
  ctx.lineTo(switchX + 17 * scale, y - 18 * scale);
  ctx.stroke();
  text(ctx, 'S', switchX, y - 28 * scale, p.ink, 14 * scale, 'center', 700);
  roundedCard(
    ctx,
    230 * scale,
    164 * scale,
    108 * scale,
    38 * scale,
    p,
    p.panel
  );
  text(
    ctx,
    'R₁ 传感',
    284 * scale,
    183 * scale,
    p.ink,
    14 * scale,
    'center',
    700
  );
  roundedCard(
    ctx,
    522 * scale,
    164 * scale,
    108 * scale,
    38 * scale,
    p,
    p.panel
  );
  text(ctx, 'R₀', 576 * scale, 183 * scale, p.ink, 14 * scale, 'center', 700);
  roundedCard(
    ctx,
    418 * scale,
    213 * scale,
    52 * scale,
    52 * scale,
    p,
    p.panel
  );
  text(ctx, 'V', 444 * scale, 239 * scale, p.teal, 17 * scale, 'center', 700);
  ctx.strokeStyle = p.teal;
  ctx.lineWidth = 2 * scale;
  ctx.setLineDash([7 * scale, 6 * scale]);
  ctx.beginPath();
  ctx.moveTo(444 * scale, 213 * scale);
  ctx.lineTo(576 * scale, 202 * scale);
  ctx.moveTo(444 * scale, 265 * scale);
  ctx.lineTo(444 * scale, 500 * scale);
  ctx.stroke();
  ctx.setLineDash([]);
  text(
    ctx,
    `U₀ = ${state.meterVoltage.toFixed(2)} V`,
    502 * scale,
    243 * scale,
    p.teal,
    13 * scale,
    'left',
    700
  );
}

function drawSpring(
  ctx: CanvasRenderingContext2D,
  topX: number,
  topY: number,
  bottomX: number,
  bottomY: number,
  p: Palette,
  scale: number
): void {
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 4 * scale;
  ctx.beginPath();
  const turns = 9;
  const amp = 17 * scale;
  const step = (bottomY - topY) / turns;
  ctx.moveTo(topX, topY);
  for (let index = 0; index < turns; index += 1) {
    ctx.lineTo(
      topX + (index % 2 === 0 ? amp : -amp),
      topY + step * (index + 0.5)
    );
    ctx.lineTo(topX, topY + step * (index + 1));
  }
  ctx.stroke();
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 5 * scale;
  ctx.beginPath();
  ctx.moveTo(topX - 20 * scale, topY);
  ctx.lineTo(topX + 20 * scale, topY);
  ctx.stroke();
  ctx.fillStyle = p.red;
  ctx.beginPath();
  ctx.arc(bottomX, bottomY, 5 * scale, 0, Math.PI * 2);
  ctx.fill();
}

function drawTankAndForces(
  ctx: CanvasRenderingContext2D,
  state: FeederState,
  p: Palette,
  scale: number
): void {
  const tankX = 112 * scale;
  const tankY = 282 * scale;
  const tankW = 300 * scale;
  const tankH = 350 * scale;
  const waterHeight =
    (state.effectiveDepth / feederConstants.waterMax) * (tankH - 8 * scale);
  const waterY = tankY + tankH - waterHeight;
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 4 * scale;
  ctx.beginPath();
  ctx.moveTo(tankX, tankY);
  ctx.lineTo(tankX, tankY + tankH);
  ctx.lineTo(tankX + tankW, tankY + tankH);
  ctx.lineTo(tankX + tankW, tankY);
  ctx.stroke();
  ctx.fillStyle = p.water;
  ctx.fillRect(tankX, waterY, tankW, tankY + tankH - waterY);
  ctx.strokeStyle = p.blue;
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  ctx.moveTo(tankX, waterY);
  ctx.lineTo(tankX + tankW, waterY);
  ctx.stroke();
  text(
    ctx,
    `h = ${state.effectiveDepth.toFixed(2)} m`,
    tankX - 14 * scale,
    waterY - 18 * scale,
    p.ink,
    14 * scale,
    'right',
    700
  );
  text(
    ctx,
    '水槽（导体液体）',
    tankX + tankW / 2,
    tankY + tankH + 25 * scale,
    p.muted,
    14 * scale,
    'center',
    700
  );

  const objectX = tankX + 78 * scale;
  const objectH = 58 * scale;
  const objectY = Math.max(
    tankY + 46 * scale,
    waterY - objectH * 0.46 - state.displacement * 32 * scale
  );
  roundedCard(ctx, objectX, objectY, 100 * scale, objectH, p, p.panel);
  text(
    ctx,
    'A',
    objectX + 50 * scale,
    objectY + objectH / 2,
    p.blue,
    18 * scale,
    'center',
    700
  );
  drawSpring(
    ctx,
    objectX + 50 * scale,
    tankY - 4 * scale,
    objectX + 50 * scale,
    objectY,
    p,
    scale
  );
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 1.8 * scale;
  ctx.setLineDash([6 * scale, 5 * scale]);
  ctx.beginPath();
  ctx.moveTo(284 * scale, 202 * scale);
  ctx.lineTo(objectX + 50 * scale, tankY - 4 * scale);
  ctx.stroke();
  ctx.setLineDash([]);
  text(
    ctx,
    `Δx = ${(state.displacement * 100).toFixed(1)} cm`,
    objectX + 50 * scale,
    objectY - 20 * scale,
    p.red,
    12 * scale,
    'center',
    700
  );
  arrow(
    ctx,
    objectX + 50 * scale,
    objectY - 4 * scale,
    0,
    -48 * scale,
    p.blue,
    3 * scale
  );
  text(
    ctx,
    `F浮=${state.buoyantForce.toFixed(1)} N`,
    objectX + 104 * scale,
    objectY + 12 * scale,
    p.blue,
    12 * scale,
    'left',
    700
  );
  arrow(
    ctx,
    objectX + 50 * scale,
    objectY + objectH + 8 * scale,
    0,
    44 * scale,
    p.red,
    3 * scale
  );
  text(
    ctx,
    `G=${state.weight.toFixed(1)} N`,
    objectX + 104 * scale,
    objectY + objectH + 26 * scale,
    p.muted,
    12 * scale,
    'left',
    600
  );
  text(
    ctx,
    `F弹=${state.springForce.toFixed(1)} N`,
    objectX - 8 * scale,
    objectY + objectH + 49 * scale,
    p.red,
    12 * scale,
    'left',
    700
  );

  // Valve / water outlet
  const valveX = 548 * scale;
  const valveY = 555 * scale;
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 4 * scale;
  ctx.beginPath();
  ctx.moveTo(valveX, tankY + tankH);
  ctx.lineTo(valveX, valveY);
  ctx.moveTo(valveX + 138 * scale, tankY + tankH);
  ctx.lineTo(valveX + 138 * scale, valveY);
  ctx.stroke();
  ctx.fillStyle = p.water;
  ctx.fillRect(
    valveX,
    waterY,
    138 * scale,
    Math.max(0, tankY + tankH - waterY)
  );
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  ctx.moveTo(valveX + 70 * scale, valveY - 14 * scale);
  ctx.lineTo(valveX + 70 * scale, valveY + 4 * scale);
  ctx.stroke();
  ctx.fillStyle = p.red;
  ctx.beginPath();
  ctx.roundRect(
    valveX + 50 * scale,
    valveY - 18 * scale,
    40 * scale,
    12 * scale,
    5 * scale
  );
  ctx.fill();
  text(
    ctx,
    '进水阀',
    valveX + 70 * scale,
    valveY - 40 * scale,
    p.muted,
    13 * scale,
    'center',
    600
  );
  text(
    ctx,
    '排水口',
    valveX + 70 * scale,
    tankY + tankH + 25 * scale,
    p.muted,
    13 * scale,
    'center',
    600
  );
  if (state.autoRun) {
    arrow(
      ctx,
      valveX + 70 * scale,
      valveY + 10 * scale,
      0,
      42 * scale,
      p.blue,
      3 * scale
    );
  }
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: FeederState,
  p: Palette,
  scale: number
): void {
  const x = 850 * scale;
  const w = 320 * scale;
  text(ctx, '自动喂水器', x, 38 * scale, p.ink, 24 * scale, 'left', 700);
  text(
    ctx,
    '力学平衡 · 传感器 · 闭合电路',
    x,
    67 * scale,
    p.muted,
    14 * scale,
    'left',
    600
  );
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.moveTo(x, 88 * scale);
  ctx.lineTo(x + w, 88 * scale);
  ctx.stroke();
  roundedCard(ctx, x, 110 * scale, w, 206 * scale, p, envTone(p));
  text(
    ctx,
    '实时物理量',
    x + 18 * scale,
    136 * scale,
    p.ink,
    16 * scale,
    'left',
    700
  );
  const rows = [
    ['水深 h', `${state.effectiveDepth.toFixed(2)} m`, p.blue],
    [
      'A离底 h′',
      `${Math.max(0, state.effectiveDepth - state.displacement).toFixed(2)} m`,
      p.ink
    ],
    ['浮力 F浮', `${state.buoyantForce.toFixed(1)} N`, p.blue],
    ['弹力 F弹', `${state.springForce.toFixed(1)} N`, p.red],
    ['传感电阻 R₁', `${state.sensorResistance.toFixed(2)} Ω`, p.teal],
    ['电压表 U₀', `${state.meterVoltage.toFixed(2)} V`, p.teal]
  ] as const;
  rows.forEach(([label, value, color], index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const rx = x + 18 * scale + col * 156 * scale;
    const y = 171 * scale + row * 39 * scale;
    text(ctx, label, rx, y, p.muted, 12 * scale, 'left', 600);
    text(ctx, value, rx + 136 * scale, y, color, 13 * scale, 'right', 700);
  });
  roundedCard(ctx, x, 338 * scale, w, 184 * scale, p);
  text(
    ctx,
    '联动关系',
    x + 18 * scale,
    365 * scale,
    p.teal,
    16 * scale,
    'left',
    700
  );
  text(
    ctx,
    'F浮 = ρgS h浸',
    x + 18 * scale,
    399 * scale,
    p.ink,
    15 * scale,
    'left',
    700
  );
  text(
    ctx,
    'F浮 = G + F弹',
    x + 18 * scale,
    430 * scale,
    p.red,
    15 * scale,
    'left',
    700
  );
  text(
    ctx,
    'R₁ = R₀ − kₛΔx',
    x + 18 * scale,
    461 * scale,
    p.teal,
    15 * scale,
    'left',
    700
  );
  text(
    ctx,
    'U₀ = U · R₀ / (R₀ + R₁)',
    x + 18 * scale,
    492 * scale,
    p.blue,
    14 * scale,
    'left',
    700
  );
  text(
    ctx,
    '水位 ↑ → 浮力 ↑ → 电阻变 → 读数变',
    x + 18 * scale,
    557 * scale,
    p.muted,
    13 * scale,
    'left',
    600
  );
}

function envTone(p: Palette): string {
  return p.bg === '#101827' ? '#1d2a3d' : '#eef3f8';
}

export function createFeederView(options: CreateFeederViewOptions = {}) {
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: {
      mode: 'clamped',
      fallbackWidth: feederConstants.baseWidth,
      fallbackHeight: feederConstants.baseHeight
    },
    initialWidth: feederConstants.baseWidth,
    initialHeight: feederConstants.baseHeight,
    eagerContext: true
  });
  let snapshot: FeederState | null = null;
  function draw(state: FeederState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const scale = env.contentScale() * stage.responsiveScale;
    const fit = Math.min(
      width / (feederConstants.baseWidth * scale),
      height / (feederConstants.baseHeight * scale)
    );
    const offsetX = Math.max(
      0,
      (width - feederConstants.baseWidth * scale * fit) / 2
    );
    const offsetY = Math.max(
      0,
      (height - feederConstants.baseHeight * scale * fit) / 2
    );
    const p = PALETTE[env.theme];
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fit, fit);
    drawGrid(ctx, p, scale);
    text(
      ctx,
      '自动喂水器物理模型',
      28 * scale,
      38 * scale,
      p.ink,
      25 * scale,
      'left',
      700
    );
    text(
      ctx,
      '水位变化 → 力学平衡 → 电阻变化 → 电压读数',
      28 * scale,
      68 * scale,
      p.muted,
      14 * scale,
      'left',
      600
    );
    drawBatteryAndCircuit(ctx, state, p, scale);
    drawTankAndForces(ctx, state, p, scale);
    drawPanel(ctx, state, p, scale);
    text(
      ctx,
      '调节水深与弹簧参数，观察力电联动',
      30 * scale,
      716 * scale,
      p.muted,
      14 * scale,
      'left',
      600
    );
    ctx.restore();
  }
  return {
    render(state: FeederState) {
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
