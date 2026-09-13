import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { internalEnergyConstants, type InternalEnergyState } from './scene.sim';

export type CreateInternalEnergyViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

const {
  baseWidth: BW,
  baseHeight: BH,
  fieldWidth: FW,
  panelX: PX,
  panelWidth: PW,
  panelInset: INSET,
  tubeX: TX,
  tubeY: TY,
  tubeWidth: TW,
  tubeHeight: TH,
  pistonTop: PT,
  pistonHeight: PH,
  tubeHandleOffset: THO,
  pistonArrowTop: PAT,
  molecularX: MX,
  molecularY: MY,
  molecularWidth: MW,
  molecularHeight: MH,
  stateX: SX,
  stateY: SY,
  stateWidth: SW,
  stateHeight: SH,
  thermometerBottom: TTB,
  thermometerMid: TTM,
  panelRuleY: PRY,
  formulaCardY: FCY,
  formulaCardHeight: FCH,
  readoutCardY: RCY,
  readoutCardHeight: RCH,
  actionCardY: ACY,
  actionCardHeight: ACH,
  compareCardY: CCY,
  compareCardHeight: CCH
} = internalEnergyConstants;

type Palette = {
  bg: string;
  panel: string;
  ink: string;
  muted: string;
  border: string;
  grid: string;
  soft: string;
  blue: string;
  red: string;
  orange: string;
  teal: string;
  dark: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    panel: '#fff',
    ink: '#303744',
    muted: '#718096',
    border: '#d3dbe4',
    grid: '#e5e9ee',
    soft: '#f1f4f7',
    blue: '#2485d8',
    red: '#ef4050',
    orange: '#e58a0a',
    teal: '#219b8a',
    dark: '#102039'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    ink: '#eef2f7',
    muted: '#aab6c8',
    border: '#3c4b61',
    grid: '#2d3e57',
    soft: '#253249',
    blue: '#60a5fa',
    red: '#fb7185',
    orange: '#fbbf24',
    teal: '#34d399',
    dark: '#0b172c'
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
  radius = 14
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function drawBackground(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, FW, BH);
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let x = 0; x <= FW; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, BH);
    ctx.stroke();
  }
  for (let y = 0; y <= BH; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(FW, y);
    ctx.stroke();
  }
}

function drawTube(
  ctx: CanvasRenderingContext2D,
  state: InternalEnergyState,
  p: Palette,
  scale: number
): void {
  const title =
    state.params.experiment === 'compress'
      ? '实验一：空气压缩引火'
      : state.params.experiment === 'expand'
        ? '实验二：气体膨胀白雾'
        : state.params.experiment === 'heat'
          ? '实验三：热传递改变内能'
          : '热力学第一定律与对比';
  text(ctx, title, TX, 40, p.ink, 20 * scale, 'left', 700);
  ctx.fillStyle = p.soft;
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 3;
  card(ctx, TX, TY, TW, TH, 18);
  ctx.fill();
  ctx.stroke();
  const pistonY =
    PT +
    (state.params.experiment === 'expand'
      ? state.progress * 110
      : state.progress * 34);
  ctx.fillStyle = p.dark;
  ctx.fillRect(TX + 20, pistonY, TW - 40, PH);
  ctx.fillStyle = p.border;
  ctx.fillRect(TX + TW / 2 - 6, TY - THO, 12, pistonY - TY + THO);
  ctx.strokeStyle = p.blue;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(TX - 26, PT + PAT);
  ctx.lineTo(TX - 26, pistonY + 10);
  ctx.moveTo(TX + TW + 26, PT + PAT);
  ctx.lineTo(TX + TW + 26, pistonY + 10);
  ctx.stroke();
  ctx.fillStyle = p.blue;
  ctx.beginPath();
  ctx.moveTo(TX - 34, pistonY + 10);
  ctx.lineTo(TX - 26, pistonY + 24);
  ctx.lineTo(TX - 18, pistonY + 10);
  ctx.moveTo(TX + TW + 18, pistonY + 10);
  ctx.lineTo(TX + TW + 26, pistonY + 24);
  ctx.lineTo(TX + TW + 34, pistonY + 10);
  ctx.fill();
  for (let i = 0; i < 6; i += 1) {
    text(
      ctx,
      `${10 + i * 10}`,
      TX + 34,
      TY + 126 + i * 42,
      p.muted,
      12 * scale,
      'right',
      500
    );
  }
  text(ctx, 'mL', TX + 42, TY + TH - 18, p.muted, 13 * scale, 'left', 600);
  const flame = state.params.experiment === 'compress' && state.progress > 0.45;
  text(
    ctx,
    flame
      ? '硝化棉：180°C'
      : state.params.experiment === 'expand'
        ? '膨胀降温'
        : '气体状态',
    TX + TW - 14,
    TY + TH - 20,
    flame ? p.orange : p.muted,
    13 * scale,
    'right',
    700
  );
}

function drawParticles(
  ctx: CanvasRenderingContext2D,
  state: InternalEnergyState,
  p: Palette,
  scale: number
): void {
  card(ctx, MX, MY, MW, MH, 18);
  ctx.fillStyle = p.dark;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  ctx.fillStyle = p.blue;
  state.particles.forEach((particle) => {
    ctx.beginPath();
    ctx.arc(MX + particle.x, MY + particle.y, 4 * scale, 0, Math.PI * 2);
    ctx.fill();
  });
  text(
    ctx,
    '微观分子运动',
    MX + 18,
    MY + 24,
    '#f7fbff',
    15 * scale,
    'left',
    700
  );
  text(
    ctx,
    `平均动能 ${state.particleEnergy.toFixed(0)}`,
    MX + 18,
    MY + MH - 20,
    '#b9c7dc',
    13 * scale,
    'left',
    600
  );
}

function drawStateCard(
  ctx: CanvasRenderingContext2D,
  state: InternalEnergyState,
  p: Palette,
  scale: number
): void {
  card(ctx, SX, SY, SW, SH, 18);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(ctx, '筒内气体状态', SX + 18, SY + 24, p.ink, 16 * scale, 'left', 700);
  text(ctx, '气体温度 T', SX + 18, SY + 50, p.muted, 13 * scale, 'left');
  const thermometerX = SX + 54;
  const thermometerTop = SY + 78;
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 18;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(thermometerX, thermometerTop);
  ctx.lineTo(thermometerX, SY + TTB);
  ctx.stroke();
  ctx.fillStyle = p.red;
  ctx.beginPath();
  ctx.arc(thermometerX, SY + TTB, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(thermometerX, SY + TTM);
  ctx.lineTo(thermometerX, SY + TTB);
  ctx.stroke();
  text(
    ctx,
    '350°C',
    thermometerX + 22,
    SY + 84,
    p.muted,
    12 * scale,
    'left',
    500
  );
  text(
    ctx,
    '180°C',
    thermometerX + 22,
    SY + 142,
    p.muted,
    12 * scale,
    'left',
    500
  );
  text(
    ctx,
    `${state.temperature.toFixed(0)}°C`,
    thermometerX + 34,
    SY + 220,
    p.red,
    17 * scale,
    'left',
    700
  );
  text(
    ctx,
    `外界做功：${state.work >= 0 ? '+' : ''}${state.work.toFixed(1)} J`,
    SX + 188,
    SY + 92,
    p.blue,
    14 * scale,
    'left',
    700
  );
  text(
    ctx,
    `热传递：${state.heat >= 0 ? '+' : ''}${state.heat.toFixed(1)} J`,
    SX + 188,
    SY + 128,
    p.orange,
    14 * scale,
    'left',
    700
  );
  text(
    ctx,
    `内能变化：${state.deltaU >= 0 ? '+' : ''}${state.deltaU.toFixed(1)} J`,
    SX + 188,
    SY + 164,
    p.red,
    14 * scale,
    'left',
    700
  );
  text(ctx, 'ΔU = W + Q', SX + 188, SY + 214, p.blue, 18 * scale, 'left', 700);
  text(
    ctx,
    `V = ${state.volume.toFixed(1)} mL   p = ${state.pressure.toFixed(0)} kPa`,
    SX + 188,
    SY + 250,
    p.muted,
    12 * scale,
    'left',
    600
  );
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: InternalEnergyState,
  p: Palette,
  scale: number
): void {
  ctx.fillStyle = p.panel;
  ctx.fillRect(PX, 0, BW - PX, BH);
  text(ctx, '内能改变实验', PX + INSET, 42, p.ink, 20 * scale, 'left', 700);
  ctx.strokeStyle = p.border;
  ctx.beginPath();
  ctx.moveTo(PX + INSET, PRY);
  ctx.lineTo(PX + PW - INSET, PRY);
  ctx.stroke();
  card(ctx, PX + INSET, FCY, PW - INSET * 2, FCH);
  ctx.fillStyle = p.soft;
  ctx.fill();
  text(
    ctx,
    '热力学第一定律',
    PX + INSET + 16,
    FCY + 24,
    p.ink,
    16 * scale,
    'left',
    700
  );
  text(ctx, 'ΔU', PX + INSET + 44, FCY + 72, p.red, 20 * scale, 'center', 700);
  text(ctx, '=', PX + INSET + 102, FCY + 72, p.ink, 20 * scale, 'center', 700);
  text(ctx, 'W', PX + INSET + 158, FCY + 72, p.blue, 20 * scale, 'center', 700);
  text(ctx, '+', PX + INSET + 214, FCY + 72, p.ink, 20 * scale, 'center', 700);
  text(
    ctx,
    'Q',
    PX + INSET + 270,
    FCY + 72,
    p.orange,
    20 * scale,
    'center',
    700
  );
  text(
    ctx,
    '外界做功 W > 0，系统吸热 Q > 0',
    PX + INSET + 16,
    FCY + 106,
    p.muted,
    12 * scale,
    'left',
    600
  );
  card(ctx, PX + INSET, RCY, PW - INSET * 2, RCH);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  const rows: Array<[string, string, string]> = [
    ['气体温度 T', `${state.temperature.toFixed(0)} °C`, p.red],
    ['气体压强 p', `${state.pressure.toFixed(0)} kPa`, p.blue],
    ['气体体积 V', `${state.volume.toFixed(1)} mL`, p.ink],
    [
      '内能变化 ΔU',
      `${state.deltaU >= 0 ? '+' : ''}${state.deltaU.toFixed(1)} J`,
      p.red
    ],
    [
      '外界做功 W',
      `${state.work >= 0 ? '+' : ''}${state.work.toFixed(1)} J`,
      p.blue
    ],
    [
      '热交换量 Q',
      `${state.heat >= 0 ? '+' : ''}${state.heat.toFixed(1)} J`,
      p.orange
    ]
  ];
  rows.forEach(([label, value, color], index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = PX + INSET + 16 + col * 150;
    const y = RCY + 32 + row * 62;
    text(ctx, label, x, y, p.muted, 12 * scale, 'left', 600);
    text(ctx, value, x, y + 24, color, 15 * scale, 'left', 700);
  });
  card(ctx, PX + INSET, ACY, PW - INSET * 2, ACH);
  ctx.fillStyle = p.soft;
  ctx.fill();
  text(
    ctx,
    '实验操作',
    PX + INSET + 16,
    ACY + 24,
    p.ink,
    15 * scale,
    'left',
    700
  );
  text(
    ctx,
    state.params.experiment === 'heat'
      ? '热量输入使温度升高'
      : state.params.experiment === 'expand'
        ? '膨胀做功，内能减少'
        : '做功使分子平均动能改变',
    PX + INSET + 16,
    ACY + 56,
    p.blue,
    13 * scale,
    'left',
    600
  );
  card(ctx, PX + INSET, CCY, PW - INSET * 2, CCH);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(
    ctx,
    '做功与热传递',
    PX + INSET + 16,
    CCY + 26,
    p.teal,
    15 * scale,
    'left',
    700
  );
  text(
    ctx,
    '结果等效，过程不同',
    PX + INSET + 16,
    CCY + 62,
    p.ink,
    14 * scale,
    'left',
    700
  );
  text(
    ctx,
    'W：能量跨边界转移；Q：温差引起转移',
    PX + INSET + 16,
    CCY + 96,
    p.muted,
    12 * scale,
    'left',
    600
  );
}

export function createInternalEnergyView(
  options: CreateInternalEnergyViewOptions = {}
) {
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: { mode: 'clamped', fallbackWidth: BW, fallbackHeight: BH },
    initialWidth: BW,
    initialHeight: BH,
    eagerContext: true
  });
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  let snapshot: InternalEnergyState | null = null;
  function draw(state: InternalEnergyState) {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(width / BW, height / BH);
    const offsetY = (height - BH * fit) / 2;
    const scale = env.contentScale() * stage.responsiveScale;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(0, offsetY);
    ctx.scale(fit, fit);
    const p = PALETTE[env.theme];
    drawBackground(ctx, p);
    drawTube(ctx, state, p, scale);
    drawParticles(ctx, state, p, scale);
    drawStateCard(ctx, state, p, scale);
    drawPanel(ctx, state, p, scale);
    ctx.restore();
  }
  return {
    render(state: InternalEnergyState) {
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
