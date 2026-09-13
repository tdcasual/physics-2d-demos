import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { electricPendulumConstants, type PendulumState } from './scene.sim';
export type CreateElectricPendulumViewOptions = {
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
  leftPlateX: LPX,
  rightPlateX: RPX,
  plateTop: PT,
  plateBottom: PB,
  pivotX: OX,
  pivotY: OY,
  pivotHalfWidth: PHW,
  pendulumLength: LEN,
  ballRadius: BR,
  panelRuleY: PRY,
  modeCardY: MCY,
  modeCardHeight: MCH,
  paramCardY: PCY,
  paramCardHeight: PCH,
  readoutCardY: RCY,
  readoutCardHeight: RCH,
  noteCardY: NCY,
  noteCardHeight: NCH
} = electricPendulumConstants;
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
  plate: string;
};
const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    panel: '#fff',
    ink: '#303744',
    muted: '#8795a7',
    border: '#cbd7e5',
    grid: '#e6ebf0',
    soft: '#f1f5fa',
    blue: '#2485d8',
    red: '#ef4050',
    orange: '#ed9209',
    teal: '#20a48f',
    plate: '#e6f4ff'
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
    plate: '#172d49'
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
function arrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dx: number,
  dy: number,
  c: string
): void {
  ctx.strokeStyle = c;
  ctx.fillStyle = c;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + dx, y + dy);
  ctx.stroke();
  const a = Math.atan2(dy, dx);
  ctx.beginPath();
  ctx.moveTo(x + dx, y + dy);
  ctx.lineTo(x + dx - 12 * Math.cos(a - 0.5), y + dy - 12 * Math.sin(a - 0.5));
  ctx.lineTo(x + dx - 12 * Math.cos(a + 0.5), y + dy - 12 * Math.sin(a + 0.5));
  ctx.fill();
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
  state: PendulumState,
  p: Palette,
  scale: number
): void {
  drawBackground(ctx, p);
  text(
    ctx,
    '双绝缘绳悬挂小球在平行板电场中的摆动',
    28,
    38,
    p.ink,
    19 * scale,
    'left',
    700
  );
  ctx.fillStyle = p.plate;
  ctx.strokeStyle = p.blue;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(LPX, PT);
  ctx.lineTo(LPX - 28, PT + 34);
  ctx.lineTo(LPX - 28, PB - 34);
  ctx.lineTo(LPX, PB);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = p.plate;
  ctx.strokeStyle = p.red;
  ctx.beginPath();
  ctx.moveTo(RPX, PT);
  ctx.lineTo(RPX + 28, PT + 34);
  ctx.lineTo(RPX + 28, PB - 34);
  ctx.lineTo(RPX, PB);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  text(ctx, 'M 板 +', LPX - 8, PB + 24, p.blue, 14 * scale, 'center', 700);
  text(ctx, 'N 板 −', RPX + 8, PB + 24, p.red, 14 * scale, 'center', 700);
  for (let y = PT + 56; y < PB - 20; y += 56)
    arrow(ctx, LPX + 8, y, RPX - LPX - 16, 0, `${p.blue}66`);
  const theta = state.theta;
  const ballX = OX + Math.sin(theta) * LEN;
  const ballY = OY + Math.cos(theta) * LEN;
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(OX - PHW, OY);
  ctx.lineTo(OX + PHW, OY);
  ctx.stroke();
  ctx.strokeStyle = p.muted;
  ctx.beginPath();
  ctx.moveTo(OX - 42, OY);
  ctx.lineTo(ballX, ballY);
  ctx.moveTo(OX + 42, OY);
  ctx.lineTo(ballX, ballY);
  ctx.stroke();
  ctx.fillStyle = p.red;
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(ballX, ballY, BR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  text(ctx, '+q', ballX, ballY, '#fff', 16 * scale, 'center', 700);
  text(
    ctx,
    `θ = ${((theta * 180) / Math.PI).toFixed(1)}°`,
    ballX + 30,
    ballY - 22,
    p.orange,
    14 * scale,
    'left',
    700
  );
  if (state.params.showForces) {
    arrow(ctx, ballX, ballY, state.electricForce * 30, 0, p.blue);
    arrow(ctx, ballX, ballY, 0, 70, p.teal);
    arrow(
      ctx,
      ballX,
      ballY,
      -Math.sin(theta) * 50,
      -Math.cos(theta) * 50,
      p.orange
    );
    text(
      ctx,
      'Fₑ',
      ballX + state.electricForce * 30 + 8,
      ballY,
      p.blue,
      13 * scale,
      'left',
      700
    );
    text(ctx, 'mg', ballX + 8, ballY + 76, p.teal, 13 * scale, 'left', 700);
  }
  if (state.params.showVelocity)
    arrow(
      ctx,
      ballX,
      ballY,
      Math.cos(theta) * state.angularVelocity * 80,
      -Math.sin(theta) * state.angularVelocity * 80,
      p.red
    );
}
function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: PendulumState,
  p: Palette,
  scale: number
): void {
  ctx.fillStyle = p.panel;
  ctx.fillRect(PX, 0, BW - PX, BH);
  text(ctx, '电场摆动实验', PX + INSET, 42, p.ink, 20 * scale, 'left', 700);
  ctx.strokeStyle = p.border;
  ctx.beginPath();
  ctx.moveTo(PX + INSET, PRY);
  ctx.lineTo(PX + PW - INSET, PRY);
  ctx.stroke();
  card(ctx, PX + INSET, MCY, PW - INSET * 2, MCH);
  ctx.fillStyle = p.soft;
  ctx.fill();
  text(
    ctx,
    '情景：' +
      (state.params.mode === 'balance'
        ? '准静态平衡'
        : state.params.mode === 'oscillate'
          ? '恒压往复摆动'
          : '探索电压'),
    PX + INSET + 16,
    MCY + 28,
    p.ink,
    16 * scale,
    'left',
    700
  );
  text(
    ctx,
    '正电荷受力方向：M → N',
    PX + INSET + 16,
    MCY + 66,
    p.blue,
    13 * scale,
    'left',
    700
  );
  text(
    ctx,
    '调节 U，观察 θ 与 v',
    PX + INSET + 16,
    MCY + 96,
    p.muted,
    13 * scale,
    'left'
  );
  card(ctx, PX + INSET, PCY, PW - INSET * 2, PCH);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(
    ctx,
    `板间电压 U = ${state.fieldRatio.toFixed(2)} U₀`,
    PX + INSET + 16,
    PCY + 28,
    p.ink,
    14 * scale,
    'left',
    700
  );
  text(
    ctx,
    `摆角 θ = ${((state.theta * 180) / Math.PI).toFixed(1)}°`,
    PX + INSET + 16,
    PCY + 68,
    p.orange,
    14 * scale,
    'left',
    700
  );
  text(
    ctx,
    `速度 v = ${state.speed.toFixed(2)} v₀`,
    PX + INSET + 16,
    PCY + 108,
    p.blue,
    14 * scale,
    'left',
    700
  );
  text(
    ctx,
    `电场力 Fₑ = ${state.electricForce.toFixed(2)} mg`,
    PX + INSET + 16,
    PCY + 138,
    p.red,
    13 * scale,
    'left'
  );
  card(ctx, PX + INSET, RCY, PW - INSET * 2, RCH);
  ctx.fillStyle = p.soft;
  ctx.fill();
  const rows: Array<[string, string, string]> = [
    ['小球摆角 θ', `${((state.theta * 180) / Math.PI).toFixed(1)}°`, p.orange],
    ['瞬时速度 v', `${state.speed.toFixed(2)} v₀`, p.blue],
    ['电场力 Fₑ', `${state.electricForce.toFixed(2)} mg`, p.red],
    ['单根绳张力 T', `${state.tension.toFixed(2)} mg`, p.teal]
  ];
  rows.forEach(([label, value, color], i) => {
    text(
      ctx,
      label,
      PX + INSET + 16,
      RCY + 34 + i * 42,
      p.muted,
      13 * scale,
      'left'
    );
    text(
      ctx,
      value,
      PX + PW - INSET - 16,
      RCY + 34 + i * 42,
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
  text(ctx, '结论', PX + INSET + 16, NCY + 24, p.teal, 14 * scale, 'left', 700);
  text(
    ctx,
    'qE = mg tanθ；电压越大，平衡偏角越大',
    PX + INSET + 16,
    NCY + 58,
    p.ink,
    12 * scale,
    'left',
    600
  );
}
export function createElectricPendulumView(
  options: CreateElectricPendulumViewOptions = {}
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
  let snapshot: PendulumState | null = null;
  function draw(state: PendulumState) {
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
