import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { jouleConstants, type JouleState } from './scene.sim';

export type CreateJouleViewOptions = {
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
  cyan: string;
  red: string;
  orange: string;
  dark: string;
  water: string;
};
const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfcfd',
    panel: '#fff',
    soft: '#f4f7fa',
    ink: '#303744',
    muted: '#7f8d9e',
    border: '#d3dde6',
    blue: '#2b94d9',
    cyan: '#43c7ed',
    red: '#ef4050',
    orange: '#ee9440',
    dark: '#606c78',
    water: '#e8f7ff'
  },
  dark: {
    bg: '#0d1724',
    panel: '#162234',
    soft: '#1e3045',
    ink: '#eef5fb',
    muted: '#9aadc0',
    border: '#3a526a',
    blue: '#63c6f3',
    cyan: '#57d8fa',
    red: '#fb7185',
    orange: '#ffc266',
    dark: '#cbd5e1',
    water: '#193b55'
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
  width: number,
  height: number,
  p: Palette,
  fill = p.panel,
  stroke = p.border
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 12);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawFloor(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  scale: number
): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(
    0,
    0,
    jouleConstants.fieldWidth * scale,
    jouleConstants.baseHeight * scale
  );
  ctx.strokeStyle = `${p.border}66`;
  ctx.lineWidth = scale;
  for (let x = 0; x <= jouleConstants.fieldWidth; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x * scale, 0);
    ctx.lineTo(x * scale, jouleConstants.baseHeight * scale);
    ctx.stroke();
  }
  for (let y = 0; y <= jouleConstants.baseHeight; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y * scale);
    ctx.lineTo(jouleConstants.fieldWidth * scale, y * scale);
    ctx.stroke();
  }
  ctx.fillStyle = `${p.soft}dd`;
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(26 * scale, 706 * scale);
  ctx.lineTo(720 * scale, 706 * scale);
  ctx.lineTo(748 * scale, 742 * scale);
  ctx.lineTo(4 * scale, 742 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawCalorimeter(
  ctx: CanvasRenderingContext2D,
  state: JouleState,
  p: Palette,
  scale: number
): void {
  const x = 294 * scale;
  const y = 410 * scale;
  const width = 310 * scale;
  const height = 260 * scale;
  ctx.fillStyle = p.dark;
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 4 * scale;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = p.soft;
  ctx.beginPath();
  ctx.roundRect(312 * scale, 428 * scale, 274 * scale, 224 * scale, 8);
  ctx.fill();
  ctx.fillStyle = p.water;
  ctx.strokeStyle = p.blue;
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.roundRect(326 * scale, 466 * scale, 246 * scale, 174 * scale, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = `${p.blue}77`;
  ctx.beginPath();
  ctx.ellipse(
    449 * scale,
    475 * scale,
    115 * scale,
    11 * scale,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.strokeStyle = p.dark;
  ctx.lineWidth = 6 * scale;
  ctx.beginPath();
  ctx.moveTo(450 * scale, 364 * scale);
  ctx.lineTo(450 * scale, 614 * scale);
  ctx.stroke();
  ctx.strokeStyle = p.orange;
  ctx.lineWidth = 7 * scale;
  ctx.beginPath();
  ctx.moveTo(371 * scale, 500 * scale);
  ctx.lineTo(529 * scale, 500 * scale);
  ctx.moveTo(371 * scale, 557 * scale);
  ctx.lineTo(529 * scale, 557 * scale);
  ctx.stroke();
  ctx.save();
  ctx.translate(450 * scale, 528 * scale);
  ctx.rotate(state.paddleAngle);
  ctx.strokeStyle = p.dark;
  ctx.lineWidth = 7 * scale;
  ctx.beginPath();
  ctx.moveTo(-72 * scale, 0);
  ctx.lineTo(72 * scale, 0);
  ctx.moveTo(-48 * scale, -20 * scale);
  ctx.lineTo(-48 * scale, 20 * scale);
  ctx.moveTo(48 * scale, -20 * scale);
  ctx.lineTo(48 * scale, 20 * scale);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = p.soft;
  ctx.strokeStyle = p.dark;
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  ctx.roundRect(300 * scale, 392 * scale, 298 * scale, 26 * scale, 5);
  ctx.fill();
  ctx.stroke();
  text(
    ctx,
    '绝热水槽 · 搅拌桨',
    450 * scale,
    684 * scale,
    p.muted,
    14 * scale,
    'center',
    600
  );
}

function drawMechanical(
  ctx: CanvasRenderingContext2D,
  state: JouleState,
  p: Palette,
  scale: number
): void {
  ctx.strokeStyle = p.dark;
  ctx.lineWidth = 10 * scale;
  ctx.beginPath();
  ctx.moveTo(178 * scale, 150 * scale);
  ctx.lineTo(610 * scale, 150 * scale);
  ctx.moveTo(238 * scale, 150 * scale);
  ctx.lineTo(238 * scale, 700 * scale);
  ctx.stroke();
  ctx.fillStyle = p.soft;
  ctx.strokeStyle = p.dark;
  ctx.lineWidth = 4 * scale;
  ctx.beginPath();
  ctx.arc(178 * scale, 178 * scale, 28 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = p.dark;
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  ctx.moveTo(206 * scale, 178 * scale);
  ctx.lineTo(238 * scale, 178 * scale);
  ctx.lineTo(238 * scale, (178 + state.dropFraction * 450) * scale);
  ctx.stroke();
  const weightY = 202 + state.dropFraction * 450;
  ctx.fillStyle = p.dark;
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.roundRect(205 * scale, weightY * scale, 68 * scale, 52 * scale, 6);
  ctx.fill();
  ctx.stroke();
  text(
    ctx,
    'm/2',
    239 * scale,
    (weightY + 26) * scale,
    p.ink,
    18 * scale,
    'center',
    700
  );
  ctx.strokeStyle = p.dark;
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  ctx.moveTo(610 * scale, 178 * scale);
  ctx.lineTo(610 * scale, weightY * scale);
  ctx.stroke();
  ctx.fillStyle = p.dark;
  ctx.beginPath();
  ctx.roundRect(576 * scale, weightY * scale, 68 * scale, 52 * scale, 6);
  ctx.fill();
  text(
    ctx,
    'm/2',
    610 * scale,
    (weightY + 26) * scale,
    p.ink,
    18 * scale,
    'center',
    700
  );
  ctx.fillStyle = p.soft;
  ctx.strokeStyle = p.dark;
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  ctx.roundRect(420 * scale, 120 * scale, 94 * scale, 54 * scale, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = p.dark;
  ctx.fillRect(442 * scale, 174 * scale, 50 * scale, 90 * scale);
  text(
    ctx,
    '转轴',
    467 * scale,
    137 * scale,
    p.muted,
    13 * scale,
    'center',
    600
  );
  ctx.strokeStyle = `${p.muted}99`;
  ctx.lineWidth = 2 * scale;
  ctx.setLineDash([6 * scale, 8 * scale]);
  ctx.beginPath();
  ctx.moveTo(92 * scale, 178 * scale);
  ctx.lineTo(92 * scale, 628 * scale);
  ctx.stroke();
  ctx.setLineDash([]);
  text(ctx, '0', 70 * scale, 178 * scale, p.ink, 16 * scale, 'right', 600);
  text(
    ctx,
    `${state.height.toFixed(0)} m`,
    70 * scale,
    628 * scale,
    p.ink,
    16 * scale,
    'right',
    600
  );
  text(ctx, 'h', 104 * scale, 405 * scale, p.ink, 18 * scale, 'center', 700);
  text(
    ctx,
    `机械做功  W = ${state.activeWork.toFixed(0)} J`,
    380 * scale,
    92 * scale,
    p.blue,
    18 * scale,
    'center',
    700
  );
}

function drawElectric(
  ctx: CanvasRenderingContext2D,
  state: JouleState,
  p: Palette,
  scale: number
): void {
  ctx.strokeStyle = p.dark;
  ctx.lineWidth = 5 * scale;
  ctx.beginPath();
  ctx.moveTo(152 * scale, 210 * scale);
  ctx.lineTo(266 * scale, 210 * scale);
  ctx.lineTo(266 * scale, 500 * scale);
  ctx.moveTo(266 * scale, 210 * scale);
  ctx.lineTo(414 * scale, 210 * scale);
  ctx.lineTo(414 * scale, 500 * scale);
  ctx.moveTo(414 * scale, 210 * scale);
  ctx.lineTo(580 * scale, 210 * scale);
  ctx.lineTo(580 * scale, 500 * scale);
  ctx.stroke();
  ctx.fillStyle = p.soft;
  ctx.strokeStyle = p.dark;
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  ctx.roundRect(100 * scale, 168 * scale, 58 * scale, 84 * scale, 6);
  ctx.fill();
  ctx.stroke();
  text(ctx, 'U', 129 * scale, 198 * scale, p.ink, 18 * scale, 'center', 700);
  text(
    ctx,
    `${state.voltage.toFixed(0)} V`,
    129 * scale,
    224 * scale,
    p.blue,
    11 * scale,
    'center',
    700
  );
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 6 * scale;
  ctx.beginPath();
  ctx.moveTo(328 * scale, 472 * scale);
  ctx.lineTo(352 * scale, 528 * scale);
  ctx.lineTo(328 * scale, 584 * scale);
  ctx.lineTo(352 * scale, 636 * scale);
  ctx.stroke();
  ctx.strokeStyle = p.orange;
  ctx.lineWidth = 5 * scale;
  ctx.beginPath();
  ctx.moveTo(375 * scale, 492 * scale);
  ctx.lineTo(520 * scale, 492 * scale);
  ctx.stroke();
  text(
    ctx,
    `电阻丝发热  W = ${state.activeWork.toFixed(0)} J`,
    380 * scale,
    92 * scale,
    p.red,
    18 * scale,
    'center',
    700
  );
  ctx.fillStyle = p.red;
  ctx.shadowColor = p.red;
  ctx.shadowBlur = state.temperatureRise * 16 * scale;
  ctx.beginPath();
  ctx.arc(
    340 * scale,
    555 * scale,
    (10 + state.temperatureRise * 4) * scale,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.shadowBlur = 0;
  text(
    ctx,
    `t = ${state.time.toFixed(1)} s`,
    380 * scale,
    360 * scale,
    p.muted,
    16 * scale,
    'center',
    600
  );
}

function drawThermometer(
  ctx: CanvasRenderingContext2D,
  state: JouleState,
  p: Palette,
  scale: number
): void {
  const x = 628 * scale;
  const y = 300 * scale;
  const radius = 82 * scale;
  ctx.fillStyle = p.panel;
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 4 * scale;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = p.dark;
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(x, y - 58 * scale);
  ctx.lineTo(x, y + 68 * scale);
  ctx.stroke();
  const top = y + (20 - state.temperature) * 40 * scale;
  ctx.fillStyle = p.red;
  ctx.beginPath();
  ctx.roundRect(
    x - 9 * scale,
    Math.max(y - 62 * scale, top),
    18 * scale,
    y + 65 * scale - Math.max(y - 62 * scale, top),
    8
  );
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y + 64 * scale, 15 * scale, 0, Math.PI * 2);
  ctx.fill();
  text(
    ctx,
    '21',
    x - 26 * scale,
    y - 42 * scale,
    p.ink,
    16 * scale,
    'right',
    700
  );
  text(
    ctx,
    '20',
    x - 26 * scale,
    y + 57 * scale,
    p.ink,
    16 * scale,
    'right',
    700
  );
  text(
    ctx,
    `${state.temperature.toFixed(2)} °C`,
    x,
    y + 104 * scale,
    p.red,
    14 * scale,
    'center',
    700
  );
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: JouleState,
  p: Palette,
  scale: number
): void {
  const x = jouleConstants.panelX * scale;
  const width = jouleConstants.panelWidth * scale;
  ctx.fillStyle = p.panel;
  ctx.fillRect(x, 0, width, jouleConstants.baseHeight * scale);
  const tabWidth = (width - 36 * scale) / 2;
  card(
    ctx,
    x + 18 * scale,
    24 * scale,
    tabWidth,
    52 * scale,
    p,
    state.mode === 0 ? p.cyan : p.soft,
    state.mode === 0 ? p.cyan : p.border
  );
  card(
    ctx,
    x + 18 * scale + tabWidth,
    24 * scale,
    tabWidth,
    52 * scale,
    p,
    state.mode === 1 ? p.cyan : p.soft,
    state.mode === 1 ? p.cyan : p.border
  );
  text(
    ctx,
    '机械功',
    x + 18 * scale + tabWidth / 2,
    50 * scale,
    state.mode === 0 ? '#fff' : p.muted,
    18 * scale,
    'center',
    700
  );
  text(
    ctx,
    '电功',
    x + 18 * scale + tabWidth + tabWidth / 2,
    50 * scale,
    state.mode === 1 ? '#fff' : p.muted,
    18 * scale,
    'center',
    700
  );
  card(ctx, x + 18 * scale, 96 * scale, width - 36 * scale, 228 * scale, p);
  text(
    ctx,
    '系统参数',
    x + 36 * scale,
    124 * scale,
    p.ink,
    18 * scale,
    'left',
    700
  );
  const values: Array<[string, string]> = [
    ['总质量 m', `${state.mass.toFixed(0)} kg`],
    ['下落高度 h', `${state.height.toFixed(0)} m`],
    ['水的质量 M', `${state.waterMass.toFixed(1)} kg`],
    ['输入电压 U', `${state.voltage.toFixed(0)} V`],
    ['输入电流 I', `${state.current.toFixed(1)} A`],
    ['作用时间 t', `${state.duration.toFixed(1)} s`]
  ];
  values.forEach(([label, value], index) => {
    const y = 154 + index * 27;
    text(
      ctx,
      label,
      x + 36 * scale,
      y * scale,
      p.muted,
      13 * scale,
      'left',
      600
    );
    text(
      ctx,
      value,
      x + width - 36 * scale,
      y * scale,
      index < 3 ? p.cyan : p.blue,
      15 * scale,
      'right',
      700
    );
  });
  card(
    ctx,
    x + 18 * scale,
    344 * scale,
    width - 36 * scale,
    202 * scale,
    p,
    p.soft
  );
  text(
    ctx,
    '能量守恒与转化计算',
    x + width / 2,
    376 * scale,
    p.ink,
    18 * scale,
    'center',
    700
  );
  text(
    ctx,
    state.mode === 0 ? '重力做功： W = mgh' : '电流做功： W = UIt',
    x + 36 * scale,
    416 * scale,
    p.ink,
    15 * scale,
    'left',
    600
  );
  text(
    ctx,
    `${state.activeWork.toFixed(0)} J`,
    x + width - 36 * scale,
    416 * scale,
    p.red,
    18 * scale,
    'right',
    700
  );
  text(
    ctx,
    '绝热系统内能增量： ΔU = W',
    x + 36 * scale,
    454 * scale,
    p.ink,
    14 * scale,
    'left',
    600
  );
  text(
    ctx,
    `ΔT = ${state.temperatureRise.toFixed(2)} °C`,
    x + width - 36 * scale,
    493 * scale,
    p.red,
    17 * scale,
    'right',
    700
  );
  card(
    ctx,
    x + 18 * scale,
    568 * scale,
    width - 36 * scale,
    98 * scale,
    p,
    `${p.red}12`,
    p.red
  );
  text(
    ctx,
    '温度升高',
    x + 36 * scale,
    596 * scale,
    p.ink,
    15 * scale,
    'left',
    600
  );
  text(
    ctx,
    'ΔU = cMΔT',
    x + 36 * scale,
    628 * scale,
    p.ink,
    14 * scale,
    'left',
    600
  );
  text(
    ctx,
    'c = 4200 J/(kg·°C)',
    x + width - 36 * scale,
    628 * scale,
    p.muted,
    12 * scale,
    'right',
    500
  );
  text(
    ctx,
    '空格键暂停 / 恢复',
    x + width / 2,
    706 * scale,
    p.muted,
    12 * scale,
    'center',
    500
  );
}

export function createJouleView(options: CreateJouleViewOptions = {}) {
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: {
      mode: 'clamped',
      fallbackWidth: jouleConstants.baseWidth,
      fallbackHeight: jouleConstants.baseHeight
    },
    initialWidth: jouleConstants.baseWidth,
    initialHeight: jouleConstants.baseHeight,
    eagerContext: true
  });
  let snapshot: JouleState | null = null;
  function draw(state: JouleState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const scale = env.contentScale() * stage.responsiveScale;
    const fit = Math.min(
      width / (jouleConstants.baseWidth * scale),
      height / (jouleConstants.baseHeight * scale)
    );
    const offsetX = Math.max(
      0,
      (width - jouleConstants.baseWidth * scale * fit) / 2
    );
    const offsetY = Math.max(
      0,
      (height - jouleConstants.baseHeight * scale * fit) / 2
    );
    const p = PALETTE[env.theme];
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fit, fit);
    drawFloor(ctx, p, scale);
    drawCalorimeter(ctx, state, p, scale);
    if (state.mode === 0) drawMechanical(ctx, state, p, scale);
    else drawElectric(ctx, state, p, scale);
    drawThermometer(ctx, state, p, scale);
    drawPanel(ctx, state, p, scale);
    ctx.restore();
  }
  return {
    render(state: JouleState) {
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
