import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { lightbulbConstants, type LightbulbState } from './scene.sim';
export type CreateLightbulbViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};
type Palette = {
  bg: string;
  panel: string;
  soft: string;
  ink: string;
  muted: string;
  border: string;
  blue: string;
  red: string;
  orange: string;
  teal: string;
  gold: string;
  wire: string;
};
const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfcfd',
    panel: '#fff',
    soft: '#f1f4f6',
    ink: '#303744',
    muted: '#8795a7',
    border: '#d6dfe7',
    blue: '#2485d8',
    red: '#ef4050',
    orange: '#ee9940',
    teal: '#26a392',
    gold: '#a56b00',
    wire: '#3f4b57'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    soft: '#253249',
    ink: '#eef2f7',
    muted: '#aab6c8',
    border: '#3c4b61',
    blue: '#60a5fa',
    red: '#fb7185',
    orange: '#fbbf24',
    teal: '#34d399',
    gold: '#fbbf24',
    wire: '#cbd5e1'
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
function card(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  p: Palette,
  fill = p.panel,
  stroke = p.border
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 12);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}
function grid(ctx: CanvasRenderingContext2D, p: Palette, scale: number): void {
  const w = lightbulbConstants.fieldWidth * scale;
  const h = lightbulbConstants.baseHeight * scale;
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = `${p.border}55`;
  ctx.lineWidth = scale;
  for (let x = 0; x <= w; x += 48 * scale) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += 48 * scale) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
}
function drawCircuit(
  ctx: CanvasRenderingContext2D,
  state: LightbulbState,
  p: Palette,
  scale: number
): void {
  card(ctx, 94 * scale, 58 * scale, 586 * scale, 266 * scale, p, p.panel);
  ctx.strokeStyle = p.wire;
  ctx.lineWidth = 4 * scale;
  ctx.setLineDash([10 * scale, 10 * scale]);
  ctx.beginPath();
  ctx.moveTo(172 * scale, 96 * scale);
  ctx.lineTo(172 * scale, 250 * scale);
  ctx.lineTo(606 * scale, 250 * scale);
  ctx.lineTo(606 * scale, 96 * scale);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 4 * scale;
  ctx.beginPath();
  ctx.moveTo(332 * scale, 92 * scale);
  ctx.lineTo(332 * scale, 139 * scale);
  ctx.stroke();
  ctx.strokeStyle = p.wire;
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  ctx.moveTo(350 * scale, 102 * scale);
  ctx.lineTo(350 * scale, 130 * scale);
  ctx.stroke();
  text(ctx, '+', 326 * scale, 76 * scale, p.red, 16 * scale, 'center', 700);
  text(ctx, '−', 354 * scale, 76 * scale, p.ink, 16 * scale, 'center', 700);
  ctx.fillStyle = p.orange;
  ctx.beginPath();
  ctx.arc(
    388 * scale,
    174 * scale,
    (24 + state.temperatureRatio * 10) * scale,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.fillStyle = '#fff7e6';
  ctx.beginPath();
  ctx.arc(388 * scale, 174 * scale, 28 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.wire;
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  ctx.arc(388 * scale, 174 * scale, 28 * scale, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(376 * scale, 166 * scale);
  ctx.lineTo(378 * scale, 189 * scale);
  ctx.lineTo(386 * scale, 156 * scale);
  ctx.lineTo(392 * scale, 189 * scale);
  ctx.lineTo(400 * scale, 166 * scale);
  ctx.stroke();
  ctx.fillStyle = p.panel;
  ctx.strokeStyle = p.wire;
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  ctx.arc(266 * scale, 174 * scale, 27 * scale, 0, Math.PI * 2);
  ctx.arc(510 * scale, 174 * scale, 27 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  text(ctx, 'A', 266 * scale, 168 * scale, p.ink, 18 * scale, 'center', 700);
  text(
    ctx,
    state.current.toFixed(2),
    266 * scale,
    188 * scale,
    p.red,
    11 * scale,
    'center',
    700
  );
  text(ctx, 'V', 510 * scale, 168 * scale, p.ink, 18 * scale, 'center', 700);
  text(
    ctx,
    state.voltage.toFixed(2),
    510 * scale,
    188 * scale,
    p.blue,
    11 * scale,
    'center',
    700
  );
  text(
    ctx,
    '分压型滑动变阻器',
    385 * scale,
    302 * scale,
    p.muted,
    13 * scale,
    'center',
    600
  );
  ctx.fillStyle = p.blue;
  ctx.fillRect(176 * scale, 260 * scale, 425 * scale, 13 * scale);
  const sliderX = 176 + (425 * state.voltage) / lightbulbConstants.voltageMax;
  ctx.fillStyle = p.teal;
  ctx.fillRect((sliderX - 7) * scale, 248 * scale, 14 * scale, 37 * scale);
  text(
    ctx,
    '滑片',
    sliderX * scale,
    299 * scale,
    p.teal,
    11 * scale,
    'center',
    600
  );
}
function drawGraph(
  ctx: CanvasRenderingContext2D,
  state: LightbulbState,
  p: Palette,
  scale: number
): void {
  const ox = 66 * scale;
  const oy = 708 * scale;
  const gw = 610 * scale;
  const gh = 360 * scale;
  const xMax = 3.6;
  const yMax = 0.5;
  ctx.strokeStyle = p.wire;
  ctx.lineWidth = 2.5 * scale;
  ctx.beginPath();
  ctx.moveTo(ox, oy);
  ctx.lineTo(ox + gw, oy);
  ctx.moveTo(ox, oy);
  ctx.lineTo(ox, oy - gh);
  ctx.stroke();
  ctx.strokeStyle = `${p.border}99`;
  ctx.lineWidth = scale;
  for (let i = 0; i <= 6; i += 1) {
    const x = ox + (i / 6) * gw;
    ctx.beginPath();
    ctx.moveTo(x, oy);
    ctx.lineTo(x, oy - gh);
    ctx.stroke();
    text(
      ctx,
      (i * 0.6).toFixed(1),
      x,
      oy + 18 * scale,
      p.muted,
      11 * scale,
      'center',
      500
    );
  }
  for (let i = 0; i <= 5; i += 1) {
    const y = oy - (i / 5) * gh;
    ctx.beginPath();
    ctx.moveTo(ox, y);
    ctx.lineTo(ox + gw, y);
    ctx.stroke();
    text(
      ctx,
      (i * 0.1).toFixed(1),
      ox - 16 * scale,
      y,
      p.muted,
      11 * scale,
      'right',
      500
    );
  }
  text(
    ctx,
    'I / A',
    ox - 18 * scale,
    oy - gh - 18 * scale,
    p.ink,
    15 * scale,
    'right',
    700
  );
  text(
    ctx,
    'U / V',
    ox + gw + 18 * scale,
    oy + 2 * scale,
    p.ink,
    15 * scale,
    'left',
    700
  );
  if (state.showIdeal) {
    ctx.strokeStyle = '#b9c3cf';
    ctx.lineWidth = 2 * scale;
    ctx.setLineDash([8 * scale, 8 * scale]);
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + gw, oy - (lightbulbConstants.voltageMax / xMax) * gh);
    ctx.stroke();
    ctx.setLineDash([]);
    text(
      ctx,
      '纯电阻冷态直线',
      ox + 450 * scale,
      oy - 300 * scale,
      p.muted,
      12 * scale,
      'left',
      600
    );
  }
  ctx.strokeStyle = p.orange;
  ctx.lineWidth = 4 * scale;
  ctx.beginPath();
  state.curve.forEach((point, index) => {
    const x = ox + (point.voltage / xMax) * gw;
    const y = oy - (point.current / yMax) * gh;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  state.recorded.forEach((point) => {
    const x = ox + (point.voltage / xMax) * gw;
    const y = oy - (point.current / yMax) * gh;
    ctx.fillStyle = p.red;
    ctx.beginPath();
    ctx.arc(x, y, 6 * scale, 0, Math.PI * 2);
    ctx.fill();
  });
  const px = ox + (state.voltage / xMax) * gw;
  const py = oy - (state.current / yMax) * gh;
  ctx.strokeStyle = p.blue;
  ctx.lineWidth = 1.5 * scale;
  ctx.setLineDash([5 * scale, 5 * scale]);
  ctx.beginPath();
  ctx.moveTo(px, oy);
  ctx.lineTo(px, py);
  ctx.moveTo(ox, py);
  ctx.lineTo(px, py);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = p.panel;
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 4 * scale;
  ctx.beginPath();
  ctx.arc(px, py, 9 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  text(
    ctx,
    '斜率 = 1/R',
    ox + 264 * scale,
    oy - 110 * scale,
    p.blue,
    15 * scale,
    'center',
    700
  );
}
function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: LightbulbState,
  p: Palette,
  scale: number
): void {
  const x = lightbulbConstants.panelX * scale;
  const w = lightbulbConstants.panelWidth * scale;
  ctx.fillStyle = p.panel;
  ctx.fillRect(x, 0, w, lightbulbConstants.baseHeight * scale);
  text(
    ctx,
    '小灯泡伏安特性剖析',
    x + 18 * scale,
    35 * scale,
    p.ink,
    20 * scale,
    'left',
    700
  );
  ctx.strokeStyle = p.orange;
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.moveTo(x + 18 * scale, 66 * scale);
  ctx.lineTo(x + w - 18 * scale, 66 * scale);
  ctx.stroke();
  text(
    ctx,
    '分压电路输入控制',
    x + 18 * scale,
    98 * scale,
    p.blue,
    16 * scale,
    'left',
    700
  );
  card(ctx, x + 18 * scale, 122 * scale, w - 36 * scale, 104 * scale, p);
  text(
    ctx,
    '目标电压 U',
    x + 30 * scale,
    154 * scale,
    p.muted,
    14 * scale,
    'left',
    600
  );
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 7 * scale;
  ctx.beginPath();
  ctx.moveTo(x + 126 * scale, 154 * scale);
  ctx.lineTo(x + w - 55 * scale, 154 * scale);
  ctx.stroke();
  ctx.strokeStyle = p.blue;
  ctx.beginPath();
  ctx.moveTo(x + 126 * scale, 154 * scale);
  ctx.lineTo(
    x + (126 + (state.voltage / lightbulbConstants.voltageMax) * 189) * scale,
    154 * scale
  );
  ctx.stroke();
  ctx.fillStyle = p.blue;
  ctx.beginPath();
  ctx.arc(
    x + (126 + (state.voltage / lightbulbConstants.voltageMax) * 189) * scale,
    154 * scale,
    11 * scale,
    0,
    Math.PI * 2
  );
  ctx.fill();
  text(
    ctx,
    `${state.voltage.toFixed(1)} V`,
    x + w - 25 * scale,
    154 * scale,
    p.blue,
    14 * scale,
    'right',
    700
  );
  text(
    ctx,
    '拖动滑片改变分压',
    x + 30 * scale,
    199 * scale,
    p.muted,
    11 * scale,
    'left',
    500
  );
  text(
    ctx,
    '实时数据与状态监测',
    x + 18 * scale,
    260 * scale,
    p.blue,
    16 * scale,
    'left',
    700
  );
  const temp = state.temperatureRatio;
  text(
    ctx,
    '冷态（室温）',
    x + 18 * scale,
    287 * scale,
    p.muted,
    12 * scale,
    'left',
    600
  );
  text(
    ctx,
    '灯丝发热如白炽化',
    x + w - 18 * scale,
    287 * scale,
    p.red,
    12 * scale,
    'right',
    600
  );
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 8 * scale;
  ctx.beginPath();
  ctx.moveTo(x + 18 * scale, 308 * scale);
  ctx.lineTo(x + w - 18 * scale, 308 * scale);
  ctx.stroke();
  ctx.strokeStyle = p.red;
  ctx.beginPath();
  ctx.moveTo(x + 18 * scale, 308 * scale);
  ctx.lineTo(x + (18 + (w / scale - 36) * temp) * scale, 308 * scale);
  ctx.stroke();
  const values: Array<[string, string, string, number, number]> = [
    ['灯泡电压 U', `${state.voltage.toFixed(2)} V`, p.blue, 18, 334],
    ['干路电流 I', `${state.current.toFixed(2)} A`, p.red, 202, 334],
    ['即时电阻 R = U/I', `${state.resistance.toFixed(1)} Ω`, p.teal, 18, 416],
    ['消耗功率 P = UI', `${state.power.toFixed(2)} W`, p.orange, 202, 416]
  ];
  values.forEach(([label, value, color, dx, dy]) => {
    card(ctx, x + dx * scale, dy * scale, 164 * scale, 70 * scale, p);
    text(
      ctx,
      label,
      x + (dx + 82) * scale,
      (dy + 22) * scale,
      p.muted,
      12 * scale,
      'center',
      600
    );
    text(
      ctx,
      value,
      x + (dx + 82) * scale,
      (dy + 49) * scale,
      color,
      17 * scale,
      'center',
      700
    );
  });
  text(
    ctx,
    '图像几何意义揭秘',
    x + 18 * scale,
    513 * scale,
    p.blue,
    16 * scale,
    'left',
    700
  );
  card(
    ctx,
    x + 18 * scale,
    532 * scale,
    w - 36 * scale,
    160 * scale,
    p,
    p.soft
  );
  text(
    ctx,
    '阻值定义：',
    x + 30 * scale,
    560 * scale,
    p.ink,
    13 * scale,
    'left',
    600
  );
  text(
    ctx,
    'R = U / I',
    x + w - 30 * scale,
    560 * scale,
    p.teal,
    14 * scale,
    'right',
    700
  );
  text(
    ctx,
    '图像斜率：',
    x + 30 * scale,
    592 * scale,
    p.ink,
    13 * scale,
    'left',
    600
  );
  text(
    ctx,
    '割线 k = I/U = 1/R',
    x + w - 30 * scale,
    592 * scale,
    p.gold,
    13 * scale,
    'right',
    700
  );
  text(
    ctx,
    '动态逻辑：温度 ↑ → 电阻 ↑',
    x + 30 * scale,
    629 * scale,
    p.red,
    13 * scale,
    'left',
    700
  );
  text(
    ctx,
    '曲线向下弯',
    x + 30 * scale,
    658 * scale,
    p.muted,
    12 * scale,
    'left',
    600
  );
  text(
    ctx,
    '冷态电阻 6.0 Ω · 理想模型无散热',
    x + 30 * scale,
    716 * scale,
    p.muted,
    11 * scale,
    'left',
    500
  );
}
export function createLightbulbView(options: CreateLightbulbViewOptions = {}) {
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: {
      mode: 'clamped',
      fallbackWidth: lightbulbConstants.baseWidth,
      fallbackHeight: lightbulbConstants.baseHeight
    },
    initialWidth: lightbulbConstants.baseWidth,
    initialHeight: lightbulbConstants.baseHeight,
    eagerContext: true
  });
  let snapshot: LightbulbState | null = null;
  function draw(state: LightbulbState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const scale = env.contentScale() * stage.responsiveScale;
    const fit = Math.min(
      width / (lightbulbConstants.baseWidth * scale),
      height / (lightbulbConstants.baseHeight * scale)
    );
    const offsetX = Math.max(
      0,
      (width - lightbulbConstants.baseWidth * scale * fit) / 2
    );
    const offsetY = Math.max(
      0,
      (height - lightbulbConstants.baseHeight * scale * fit) / 2
    );
    const p = PALETTE[env.theme];
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fit, fit);
    grid(ctx, p, scale);
    drawCircuit(ctx, state, p, scale);
    drawGraph(ctx, state, p, scale);
    drawPanel(ctx, state, p, scale);
    text(
      ctx,
      '空格键暂停/恢复 · 记录多个工作点',
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
    render(state: LightbulbState) {
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
