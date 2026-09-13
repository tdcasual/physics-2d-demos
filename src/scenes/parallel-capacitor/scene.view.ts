import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { parallelCapacitorConstants, type CapacitorState } from './scene.sim';
export type CreateParallelCapacitorViewOptions = {
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
  plateLeftX: PLX,
  plateRightX: PRX,
  plateTop: PT,
  plateBottom: PB,
  plateGapBase: PGB,
  meterX: MX,
  meterY: MY,
  meterRadius: MR,
  panelRuleY: RY,
  conditionCardY: CCY,
  conditionCardHeight: CCH,
  presetCardY: PCY,
  presetCardHeight: PCH,
  readoutCardY: RCY,
  readoutCardHeight: RCH,
  noteCardY: NCY,
  noteCardHeight: NCH
} = parallelCapacitorConstants;
type Palette = {
  bg: string;
  panel: string;
  ink: string;
  muted: string;
  border: string;
  grid: string;
  blue: string;
  red: string;
  orange: string;
  teal: string;
  plate: string;
  soft: string;
};
const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    panel: '#fff',
    ink: '#303744',
    muted: '#8795a7',
    border: '#cbd7e5',
    grid: '#e6ebf0',
    blue: '#2485d8',
    red: '#ef4050',
    orange: '#ed9209',
    teal: '#20a48f',
    plate: '#e6f4ff',
    soft: '#f1f5fa'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    ink: '#eef2f7',
    muted: '#aab6c8',
    border: '#3c4b61',
    grid: '#2d3e57',
    blue: '#60a5fa',
    red: '#fb7185',
    orange: '#fbbf24',
    teal: '#34d399',
    plate: '#172d49',
    soft: '#253249'
  }
};
function text(
  ctx: CanvasRenderingContext2D,
  v: string,
  x: number,
  y: number,
  c: string,
  s: number,
  a: CanvasTextAlign = 'left',
  w = 600
): void {
  ctx.fillStyle = c;
  ctx.font = `${w} ${s}px sans-serif`;
  ctx.textAlign = a;
  ctx.textBaseline = 'middle';
  ctx.fillText(v, x, y);
}
function card(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r = 14
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
function drawBackground(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, FW, BH);
  ctx.strokeStyle = p.grid;
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
function drawField(
  ctx: CanvasRenderingContext2D,
  state: CapacitorState,
  p: Palette,
  scale: number
): void {
  drawBackground(ctx, p);
  text(
    ctx,
    '探究平行板电容器电容的影响因素',
    28,
    38,
    p.ink,
    19 * scale,
    'left',
    700
  );
  ctx.fillStyle = p.plate;
  ctx.strokeStyle = p.blue;
  ctx.lineWidth = 4;
  ctx.fillRect(PLX, PT, 22, PB - PT);
  ctx.strokeRect(PLX, PT, 22, PB - PT);
  ctx.fillStyle = p.plate;
  ctx.strokeStyle = p.red;
  ctx.fillRect(PRX, PT, 22, PB - PT);
  ctx.strokeRect(PRX, PT, 22, PB - PT);
  const gap = PGB + state.params.distance * 12;
  const right = PLX + gap;
  ctx.fillStyle = p.plate;
  ctx.fillRect(right, PT, 22, PB - PT);
  ctx.strokeStyle = p.red;
  ctx.strokeRect(right, PT, 22, PB - PT);
  for (let y = PT + 30; y < PB - 12; y += 34) {
    ctx.strokeStyle = `${p.red}88`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PLX + 28, y);
    ctx.lineTo(right - 8, y);
    ctx.stroke();
  }
  if (state.params.probe === 'dielectric') {
    ctx.fillStyle = `${p.teal}99`;
    ctx.fillRect(
      PLX + 42,
      PT + 18,
      Math.max(24, (right - PLX) * 0.45),
      PB - PT - 36
    );
    text(ctx, '介质', PLX + 60, PT + 40, p.teal, 14 * scale, 'center', 700);
  }
  text(ctx, 'A', PLX - 2, PT - 20, p.ink, 15 * scale, 'center', 700);
  text(ctx, 'B', right + 32, PT - 20, p.ink, 15 * scale, 'center', 700);
  text(
    ctx,
    `d = ${state.params.distance.toFixed(1)} cm`,
    (PLX + right) / 2,
    PT - 56,
    p.blue,
    15 * scale,
    'center',
    700
  );
  ctx.fillStyle = p.panel;
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(MX, MY, MR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(MX, MY + MR - 24);
  ctx.lineTo(MX, MY - MR + 32);
  ctx.stroke();
  const needle = ((state.needleAngle - 45) * Math.PI) / 180;
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(MX, MY);
  ctx.lineTo(
    MX + Math.cos(needle) * (MR - 24),
    MY + Math.sin(needle) * (MR - 24)
  );
  ctx.stroke();
  text(ctx, '静电计', MX, MY + MR + 30, p.ink, 15 * scale, 'center', 700);
  text(
    ctx,
    `${state.needleAngle.toFixed(1)}°`,
    MX,
    MY - MR - 22,
    p.orange,
    14 * scale,
    'center',
    700
  );
}
function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: CapacitorState,
  p: Palette,
  scale: number
): void {
  ctx.fillStyle = p.panel;
  ctx.fillRect(PX, 0, BW - PX, BH);
  text(ctx, '平行板电容器探究', PX + INSET, 42, p.ink, 20 * scale, 'left', 700);
  ctx.strokeStyle = p.border;
  ctx.beginPath();
  ctx.moveTo(PX + INSET, RY);
  ctx.lineTo(PX + PW - INSET, RY);
  ctx.stroke();
  card(ctx, PX + INSET, CCY, PW - INSET * 2, CCH);
  ctx.fillStyle = p.soft;
  ctx.fill();
  text(
    ctx,
    '实验条件：充电后断开，电荷量 Q 不变',
    PX + INSET + 16,
    CCY + 40,
    p.teal,
    14 * scale,
    'left',
    700
  );
  card(ctx, PX + INSET, PCY, PW - INSET * 2, PCH);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(
    ctx,
    '一键探究预设',
    PX + INSET + 16,
    PCY + 26,
    p.ink,
    15 * scale,
    'left',
    700
  );
  text(
    ctx,
    'C ∝ εᵣ S / d',
    PX + INSET + 16,
    PCY + 62,
    p.blue,
    17 * scale,
    'left',
    700
  );
  text(
    ctx,
    state.params.probe === 'area'
      ? '正在改变正对面积 S'
      : state.params.probe === 'distance'
        ? '正在改变极板距离 d'
        : '正在插入介质 εᵣ',
    PX + INSET + 16,
    PCY + 104,
    p.orange,
    13 * scale,
    'left',
    700
  );
  text(
    ctx,
    '控制变量：其余参数保持',
    PX + INSET + 16,
    PCY + 136,
    p.muted,
    12 * scale,
    'left'
  );
  card(ctx, PX + INSET, RCY, PW - INSET * 2, RCH);
  ctx.fillStyle = p.soft;
  ctx.fill();
  text(
    ctx,
    '实时物理量（相对初始状态）',
    PX + INSET + 16,
    RCY + 24,
    p.ink,
    15 * scale,
    'left',
    700
  );
  const rows: Array<[string, string, string]> = [
    ['电容 C', `${state.capacitanceRatio.toFixed(2)} C₀`, p.teal],
    ['极板电势差 U', `${state.voltageRatio.toFixed(2)} U₀`, p.red],
    ['静电计张角 θ', `${state.needleAngle.toFixed(1)}°`, p.orange],
    ['极板电场强度 E', `${state.fieldRatio.toFixed(2)} E₀`, p.blue]
  ];
  rows.forEach(([label, value, color], i) => {
    text(
      ctx,
      label,
      PX + INSET + 16,
      RCY + 58 + i * 32,
      p.muted,
      13 * scale,
      'left'
    );
    text(
      ctx,
      value,
      PX + PW - INSET - 16,
      RCY + 58 + i * 32,
      color,
      14 * scale,
      'right',
      700
    );
  });
  card(ctx, PX + INSET, NCY, PW - INSET * 2, NCH);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(
    ctx,
    '核心结论',
    PX + INSET + 16,
    NCY + 24,
    p.orange,
    14 * scale,
    'left',
    700
  );
  text(
    ctx,
    'Q 不变时：C 增大 ⇒ U 与指针张角减小',
    PX + INSET + 16,
    NCY + 58,
    p.ink,
    12 * scale,
    'left',
    600
  );
  text(
    ctx,
    '面积增大、距离减小、插入介质都会增大 C',
    PX + INSET + 16,
    NCY + 88,
    p.muted,
    12 * scale,
    'left',
    600
  );
}
export function createParallelCapacitorView(
  options: CreateParallelCapacitorViewOptions = {}
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
  let snapshot: CapacitorState | null = null;
  function draw(state: CapacitorState) {
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
    drawField(ctx, state, p, scale);
    drawPanel(ctx, state, p, scale);
    ctx.restore();
  }
  return {
    render(state: CapacitorState) {
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
