import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  maxwellConstants as C,
  maxwellDensity,
  type MaxwellState
} from './scene.sim';

export type CreateMaxwellViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};
type Palette = {
  bg: string;
  panel: string;
  ink: string;
  muted: string;
  border: string;
  grid: string;
  blue: string;
  red: string;
  teal: string;
  orange: string;
  area: string;
};
const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfcff',
    panel: '#fff',
    ink: '#303747',
    muted: '#8290a2',
    border: '#d8e1eb',
    grid: '#dce5ef',
    blue: '#5b88b7',
    red: '#f07b54',
    teal: '#25a694',
    orange: '#f2a148',
    area: '#f3a278'
  },
  dark: {
    bg: '#101929',
    panel: '#172538',
    ink: '#eef3fb',
    muted: '#aab8ca',
    border: '#3d526c',
    grid: '#2b4059',
    blue: '#77b0ff',
    red: '#ff8e73',
    teal: '#42d9bd',
    orange: '#f7c24e',
    area: '#ca7658'
  }
};
const V = {
  graphLeft: 70,
  graphRight: 780,
  graphTop: 150,
  graphBottom: 700,
  graphScaleY: 500,
  particleX: 520,
  particleY: 86,
  particleW: 260,
  particleH: 185,
  panelRuleY: 62,
  panelRight: 1258,
  cardX: 850,
  cardW: 392,
  tempCardY: 82,
  tempCardH: 145,
  tempSliderOffset: 78,
  featureCardY: 248,
  featureCardH: 214,
  formulaCardY: 484,
  formulaCardH: 205,
  noteCardY: 710,
  noteCardH: 82,
  curveSamples: 100,
  particleCount: 34,
  markerTop: 540,
  markerBottom: 700
} as const;
function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  color: string,
  size = 14,
  align: CanvasTextAlign = 'left',
  weight = 600
): void {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}
function card(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  stroke: string,
  radius: number = C.cardRadius
): void {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function')
    ctx.roundRect(x, y, width, height, radius);
  else ctx.rect(x, y, width, height);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.stroke();
}
function drawGrid(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, C.fieldWidth, C.baseHeight);
  ctx.strokeStyle = `${p.grid}55`;
  ctx.lineWidth = 1;
  for (let x = 0; x <= C.fieldWidth; x += 54) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, C.baseHeight);
    ctx.stroke();
  }
  for (let y = 0; y <= C.baseHeight; y += 54) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(C.fieldWidth, y);
    ctx.stroke();
  }
}
function drawParticles(
  ctx: CanvasRenderingContext2D,
  state: MaxwellState,
  p: Palette
): void {
  card(
    ctx,
    V.particleX,
    V.particleY,
    V.particleW,
    V.particleH,
    `${p.panel}dd`,
    p.border
  );
  text(
    ctx,
    '微观分子热运动',
    V.particleX + V.particleW / 2,
    V.particleY - 22,
    p.ink,
    17,
    'center',
    700
  );
  const colors = [p.blue, p.red, p.teal, p.orange];
  for (let i = 0; i < V.particleCount; i += 1) {
    const x =
      V.particleX +
      22 +
      ((i * 47 + state.time * (18 + (i % 5))) % (V.particleW - 44));
    const y =
      V.particleY +
      28 +
      ((i * 31 + state.time * (11 + (i % 4))) % (V.particleH - 50));
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    ctx.arc(x, y, 4 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
}
function drawGraph(
  ctx: CanvasRenderingContext2D,
  state: MaxwellState,
  p: Palette
): void {
  const speedMax = Math.max(800, state.rmsSpeed * 2.55);
  const peak = Math.max(maxwellDensity(state.mostProbable, state), 0.0001);
  const gx = (speed: number) =>
    V.graphLeft +
    (Math.min(speedMax, speed) / speedMax) * (V.graphRight - V.graphLeft);
  const gy = (density: number) =>
    V.graphBottom - Math.min(1, density / peak) * V.graphScaleY;
  text(
    ctx,
    '麦克斯韦—玻尔兹曼速率分布',
    V.graphLeft + 250,
    112,
    p.ink,
    18,
    'left',
    700
  );
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let i = 1; i <= 5; i += 1) {
    const y = V.graphBottom - (i / 5) * V.graphScaleY;
    ctx.beginPath();
    ctx.moveTo(V.graphLeft, y);
    ctx.lineTo(V.graphRight, y);
    ctx.stroke();
  }
  for (let i = 1; i <= 5; i += 1) {
    const x = V.graphLeft + (i / 5) * (V.graphRight - V.graphLeft);
    ctx.beginPath();
    ctx.moveTo(x, V.graphTop);
    ctx.lineTo(x, V.graphBottom);
    ctx.stroke();
  }
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(V.graphLeft, V.graphBottom);
  ctx.lineTo(V.graphRight + 14, V.graphBottom);
  ctx.moveTo(V.graphLeft, V.graphBottom);
  ctx.lineTo(V.graphLeft, V.graphTop - 14);
  ctx.stroke();
  text(ctx, 'f(v)', V.graphLeft - 18, V.graphTop - 18, p.ink, 16, 'right', 800);
  text(
    ctx,
    'v（速率 m/s）',
    V.graphRight + 10,
    V.graphBottom + 24,
    p.ink,
    13,
    'right',
    700
  );
  ctx.beginPath();
  for (let i = 0; i <= V.curveSamples; i += 1) {
    const speed = (speedMax * i) / V.curveSamples;
    const x = gx(speed);
    const y = gy(maxwellDensity(speed, state));
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.lineTo(V.graphRight, V.graphBottom);
  ctx.lineTo(V.graphLeft, V.graphBottom);
  ctx.closePath();
  ctx.fillStyle = `${p.area}42`;
  ctx.fill();
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let i = 0; i <= V.curveSamples; i += 1) {
    const speed = (speedMax * i) / V.curveSamples;
    const x = gx(speed);
    const y = gy(maxwellDensity(speed, state));
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  const markers = [
    { label: 'vₚ', value: state.mostProbable, color: p.red },
    { label: 'v̄', value: state.meanSpeed, color: p.teal },
    { label: 'vᵣₘₛ', value: state.rmsSpeed, color: p.orange }
  ];
  markers.forEach((marker) => {
    const x = gx(marker.value);
    ctx.strokeStyle = `${marker.color}bb`;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.moveTo(x, V.markerTop);
    ctx.lineTo(x, V.markerBottom);
    ctx.stroke();
    ctx.setLineDash([]);
    text(
      ctx,
      marker.label,
      x,
      V.markerBottom + 24,
      marker.color,
      15,
      'center',
      800
    );
  });
  text(
    ctx,
    '面积 S = 1（100%）',
    V.graphLeft + 280,
    430,
    `${p.area}`,
    26,
    'center',
    800
  );
}
function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: MaxwellState,
  p: Palette
): void {
  ctx.fillStyle = p.panel;
  ctx.fillRect(C.panelX, 0, C.panelWidth, C.baseHeight);
  text(ctx, '气体分子速率分布', C.panelX + 26, 36, p.ink, 22, 'left', 800);
  text(
    ctx,
    '麦克斯韦—玻尔兹曼分布',
    C.panelX + 26,
    72,
    p.muted,
    14,
    'left',
    600
  );
  ctx.strokeStyle = p.border;
  ctx.beginPath();
  ctx.moveTo(C.panelX + 26, V.panelRuleY);
  ctx.lineTo(V.panelRight, V.panelRuleY);
  ctx.stroke();
  card(ctx, V.cardX, V.tempCardY, V.cardW, V.tempCardH, p.panel, p.border);
  text(
    ctx,
    '热力学温度调节（T）',
    V.cardX + 22,
    V.tempCardY + 30,
    p.ink,
    17,
    'left',
    700
  );
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(V.cardX + 22, V.tempCardY + V.tempSliderOffset);
  ctx.lineTo(V.panelRight - 22, V.tempCardY + V.tempSliderOffset);
  ctx.stroke();
  const tx =
    V.cardX +
    22 +
    ((state.temperature - C.temperatureMin) /
      (C.temperatureMax - C.temperatureMin)) *
      (V.cardW - 44);
  ctx.fillStyle = p.red;
  ctx.beginPath();
  ctx.arc(tx, V.tempCardY + V.tempSliderOffset, 12, 0, Math.PI * 2);
  ctx.fill();
  text(
    ctx,
    `相对温度  ${state.temperature.toFixed(0)} K`,
    V.cardX + 22,
    V.tempCardY + 120,
    p.orange,
    16,
    'left',
    800
  );
  card(
    ctx,
    V.cardX,
    V.featureCardY,
    V.cardW,
    V.featureCardH,
    p.panel,
    p.border
  );
  text(
    ctx,
    '分布特征提取',
    V.cardX + 22,
    V.featureCardY + 30,
    p.ink,
    17,
    'left',
    700
  );
  text(
    ctx,
    `最可几速率 vₚ   ${state.mostProbable.toFixed(0)} m/s`,
    V.cardX + 22,
    V.featureCardY + 76,
    p.red,
    15,
    'left',
    700
  );
  text(
    ctx,
    `平均速率 v̄     ${state.meanSpeed.toFixed(0)} m/s`,
    V.cardX + 22,
    V.featureCardY + 116,
    p.teal,
    15,
    'left',
    700
  );
  text(
    ctx,
    `方均根速率 vᵣₘₛ  ${state.rmsSpeed.toFixed(0)} m/s`,
    V.cardX + 22,
    V.featureCardY + 156,
    p.orange,
    15,
    'left',
    700
  );
  text(
    ctx,
    'vₚ < v̄ < vᵣₘₛ',
    V.cardX + 22,
    V.featureCardY + 192,
    p.ink,
    15,
    'left',
    800
  );
  card(
    ctx,
    V.cardX,
    V.formulaCardY,
    V.cardW,
    V.formulaCardH,
    p.panel,
    p.border
  );
  text(
    ctx,
    '核心规律',
    V.cardX + 22,
    V.formulaCardY + 30,
    p.ink,
    17,
    'left',
    700
  );
  text(
    ctx,
    '温度升高：曲线右移、峰值降低',
    V.cardX + 22,
    V.formulaCardY + 74,
    p.red,
    14,
    'left',
    700
  );
  text(
    ctx,
    '分子量增大：曲线左移、峰值升高',
    V.cardX + 22,
    V.formulaCardY + 108,
    p.blue,
    14,
    'left',
    700
  );
  text(
    ctx,
    '∫ f(v)dv = 1',
    V.cardX + 22,
    V.formulaCardY + 152,
    p.teal,
    18,
    'left',
    800
  );
  text(
    ctx,
    '面积恒定，只是分布形状改变',
    V.cardX + 22,
    V.formulaCardY + 184,
    p.muted,
    13,
    'left',
    600
  );
  card(
    ctx,
    V.cardX,
    V.noteCardY,
    V.cardW,
    V.noteCardH,
    `${p.teal}12`,
    p.border
  );
  text(
    ctx,
    '空格：暂停 / 继续微观粒子',
    V.cardX + 22,
    V.noteCardY + 42,
    p.teal,
    14,
    'left',
    700
  );
}
function drawScene(
  ctx: CanvasRenderingContext2D,
  state: MaxwellState,
  p: Palette
): void {
  drawGrid(ctx, p);
  text(ctx, '气体分子速率分布', C.fieldWidth / 2, 36, p.ink, 25, 'center', 800);
  text(
    ctx,
    '微观分子热运动（蓝：慢 → 红：快）',
    C.fieldWidth / 2,
    70,
    p.muted,
    15,
    'center',
    600
  );
  drawGraph(ctx, state, p);
  drawParticles(ctx, state, p);
  drawPanel(ctx, state, p);
}
export function createMaxwellView(options: CreateMaxwellViewOptions = {}) {
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: {
      mode: 'clamped',
      fallbackWidth: C.baseWidth,
      fallbackHeight: C.baseHeight
    },
    initialWidth: C.baseWidth,
    initialHeight: C.baseHeight,
    eagerContext: true
  });
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  let snapshot: MaxwellState | null = null;
  function draw(state: MaxwellState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    stage.ensureSized();
    const fit = Math.min(
      stage.cssWidth / C.baseWidth,
      stage.cssHeight / C.baseHeight
    );
    const offsetY = (stage.cssHeight - C.baseHeight * fit) / 2;
    const responsiveScale = stage.responsiveScale;
    const p = PALETTE[env.theme];
    ctx.clearRect(0, 0, stage.cssWidth, stage.cssHeight);
    ctx.save();
    ctx.translate(0, offsetY);
    ctx.scale(fit, fit);
    ctx.lineWidth = responsiveScale;
    drawScene(ctx, state, p);
    ctx.restore();
  }
  return {
    render(state: MaxwellState): void {
      snapshot = state;
      draw(state);
    },
    resize(): void {
      stage.resize();
      if (snapshot) draw(snapshot);
    },
    setTheme(theme: TeachingTheme): void {
      env.setTheme(theme);
      if (snapshot) draw(snapshot);
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints): void {
      env.setMode(mode, hints);
      if (snapshot) draw(snapshot);
    },
    dispose(): void {
      snapshot = null;
      stage.release();
    }
  };
}
