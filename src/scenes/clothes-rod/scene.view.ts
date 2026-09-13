import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { clothesRodConstants, type RodState } from './scene.sim';
export type CreateClothesRodViewOptions = {
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
  poleLeftX: PLX,
  poleRightX: PRX,
  groundY: GY,
  topY: TY,
  knotY: KY,
  knotDrop: KD,
  ropeLabelOffset: RLO,
  weightLabelOffset: WLO,
  panelRuleY: RY,
  modelCardY: MCY,
  modelCardHeight: MCH,
  presetCardY: PCY,
  presetCardHeight: PCH,
  paramCardY: ACY,
  paramCardHeight: ACH,
  readoutCardY: RCY,
  readoutCardHeight: RCH
} = clothesRodConstants;
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
  rope: string;
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
    rope: '#8f7161',
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
    rope: '#b79a87',
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
  state: RodState,
  p: Palette,
  scale: number
): void {
  drawBackground(ctx, p);
  text(ctx, '晾衣杆力学模型探究', 28, 38, p.ink, 20 * scale, 'left', 700);
  ctx.fillStyle = p.ink;
  ctx.fillRect(PLX - 8, TY, 16, GY - TY);
  ctx.fillRect(PRX - 8, TY, 16, GY - TY);
  ctx.fillStyle = p.soft;
  ctx.fillRect(0, GY, FW, BH - GY);
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, GY);
  ctx.lineTo(FW, GY);
  ctx.stroke();
  const leftKnot = { x: PLX + 8, y: KY };
  const rightKnot = { x: PRX - 8, y: KY - state.params.height * 18 };
  ctx.strokeStyle = p.rope;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(leftKnot.x, leftKnot.y);
  ctx.lineTo(FW / 2, KY + KD);
  ctx.lineTo(rightKnot.x, rightKnot.y);
  ctx.stroke();
  ctx.fillStyle = p.teal;
  ctx.beginPath();
  ctx.arc(FW / 2, KY + KD, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.ink;
  ctx.stroke();
  text(ctx, '活结', FW / 2, KY + KD, '#fff', 13 * scale, 'center', 700);
  ctx.fillStyle = p.orange;
  ctx.beginPath();
  ctx.moveTo(FW / 2 - 32, KY + RLO);
  ctx.lineTo(FW / 2 + 32, KY + RLO);
  ctx.lineTo(FW / 2, KY + WLO);
  ctx.closePath();
  ctx.fill();
  text(ctx, 'G', FW / 2, KY + 166, '#fff', 15 * scale, 'center', 700);
  text(
    ctx,
    `d = ${state.params.distance.toFixed(1)} m`,
    FW / 2,
    90,
    p.blue,
    15 * scale,
    'center',
    700
  );
  text(
    ctx,
    `L = ${state.params.length.toFixed(1)} m`,
    FW / 2 - 42,
    KY + 208,
    p.muted,
    13 * scale,
    'center'
  );
  text(
    ctx,
    `θ₁ ${((state.thetaLeft * 180) / Math.PI).toFixed(1)}°`,
    FW / 2 - 90,
    KY + 80,
    p.blue,
    13 * scale,
    'center',
    700
  );
  text(
    ctx,
    `θ₂ ${((state.thetaRight * 180) / Math.PI).toFixed(1)}°`,
    FW / 2 + 90,
    KY + 80,
    p.teal,
    13 * scale,
    'center',
    700
  );
  card(ctx, 90, 560, 590, 56);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(
    ctx,
    `最大张力 ${state.maxTension.toFixed(1)} N`,
    112,
    588,
    p.red,
    15 * scale,
    'left',
    700
  );
}
function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: RodState,
  p: Palette,
  scale: number
): void {
  ctx.fillStyle = p.panel;
  ctx.fillRect(PX, 0, BW - PX, BH);
  text(ctx, '晾衣杆力学模型', PX + INSET, 42, p.ink, 20 * scale, 'left', 700);
  ctx.strokeStyle = p.border;
  ctx.beginPath();
  ctx.moveTo(PX + INSET, RY);
  ctx.lineTo(PX + PW - INSET, RY);
  ctx.stroke();
  card(ctx, PX + INSET, MCY, PW - INSET * 2, MCH);
  ctx.fillStyle = p.soft;
  ctx.fill();
  text(
    ctx,
    state.params.model === 'smooth'
      ? '光滑活结 · 等张力'
      : '固定死结 · 分段受力',
    PX + INSET + 16,
    MCY + 30,
    p.ink,
    16 * scale,
    'left',
    700
  );
  text(
    ctx,
    '比较角度与张力的几何关系',
    PX + INSET + 16,
    MCY + 70,
    p.blue,
    13 * scale,
    'left',
    700
  );
  text(
    ctx,
    '2T cosθ = G',
    PX + INSET + 16,
    MCY + 98,
    p.muted,
    13 * scale,
    'left',
    600
  );
  card(ctx, PX + INSET, PCY, PW - INSET * 2, PCH);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(
    ctx,
    '经典点预设与推演',
    PX + INSET + 16,
    PCY + 28,
    p.ink,
    15 * scale,
    'left',
    700
  );
  text(
    ctx,
    'd 增大 → θ 增大，T 增大',
    PX + INSET + 16,
    PCY + 68,
    p.red,
    13 * scale,
    'left',
    700
  );
  text(
    ctx,
    'L 增大 → θ 变小，T 变小',
    PX + INSET + 16,
    PCY + 102,
    p.blue,
    13 * scale,
    'left',
    700
  );
  text(
    ctx,
    '活结：T₁ = T₂',
    PX + INSET + 16,
    PCY + 136,
    p.teal,
    13 * scale,
    'left',
    700
  );
  card(ctx, PX + INSET, ACY, PW - INSET * 2, ACH);
  ctx.fillStyle = p.soft;
  ctx.fill();
  text(
    ctx,
    '几何与物理参数',
    PX + INSET + 16,
    ACY + 26,
    p.ink,
    15 * scale,
    'left',
    700
  );
  text(
    ctx,
    `d ${state.params.distance.toFixed(1)} m   L ${state.params.length.toFixed(1)} m`,
    PX + INSET + 16,
    ACY + 62,
    p.ink,
    13 * scale,
    'left'
  );
  text(
    ctx,
    `B 位移 ${state.params.height >= 0 ? '+' : ''}${state.params.height.toFixed(1)} m   G ${state.params.weight.toFixed(0)} N`,
    PX + INSET + 16,
    ACY + 96,
    p.ink,
    13 * scale,
    'left'
  );
  text(
    ctx,
    `θ₁ ${((state.thetaLeft * 180) / Math.PI).toFixed(1)}°   θ₂ ${((state.thetaRight * 180) / Math.PI).toFixed(1)}°`,
    PX + INSET + 16,
    ACY + 134,
    p.orange,
    13 * scale,
    'left',
    700
  );
  card(ctx, PX + INSET, RCY, PW - INSET * 2, RCH);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(
    ctx,
    '实时受力与角度',
    PX + INSET + 16,
    RCY + 24,
    p.ink,
    15 * scale,
    'left',
    700
  );
  text(
    ctx,
    `左绳张力 T₁  ${state.tensionLeft.toFixed(1)} N`,
    PX + INSET + 16,
    RCY + 62,
    p.red,
    14 * scale,
    'left',
    700
  );
  text(
    ctx,
    `右绳张力 T₂  ${state.tensionRight.toFixed(1)} N`,
    PX + INSET + 16,
    RCY + 100,
    p.red,
    14 * scale,
    'left',
    700
  );
  text(
    ctx,
    state.params.model === 'smooth'
      ? '等张力条件成立'
      : '固定结：两段张力可不同',
    PX + INSET + 16,
    RCY + 134,
    p.teal,
    12 * scale,
    'left',
    600
  );
}
export function createClothesRodView(
  options: CreateClothesRodViewOptions = {}
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
  let snapshot: RodState | null = null;
  function draw(state: RodState) {
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
    render(state: RodState) {
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
