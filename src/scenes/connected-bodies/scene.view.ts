import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  connectedBodiesConstants,
  type ConnectedBodiesState
} from './scene.sim';
export type CreateConnectedBodiesViewOptions = {
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
  beamX: BX,
  beamY: BY,
  beamWidth: BWIDTH,
  beamHeight: BHEIGHT,
  lineX: LX,
  topY: TY,
  ballAX: AX,
  ballAY: AY,
  ballBX: DX,
  ballBY: DY,
  ballRadius: BR,
  analysisX: FX,
  analysisWidth: FWIDTH,
  analysisAY: FAY,
  analysisBY: FBY,
  analysisHeight: FH,
  analysisRuleOffset: ARO,
  cutLabelY: CLY,
  noteY: NY,
  upperCutY1: UCY1,
  upperCutY2: UCY2,
  lowerCutY1: LCY1,
  lowerCutY2: LCY2,
  panelRuleY: PRY,
  modelCardY: MCY,
  modelCardHeight: MCH,
  controlCardY: CCY,
  controlCardHeight: CCH,
  stateCardY: SCY,
  stateCardHeight: SCH,
  ruleCardY: RCY,
  ruleCardHeight: RCH
} = connectedBodiesConstants;
type Palette = {
  bg: string;
  panel: string;
  ink: string;
  muted: string;
  border: string;
  grid: string;
  blue: string;
  green: string;
  red: string;
  orange: string;
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
    green: '#13a878',
    red: '#ef4050',
    orange: '#ed7955',
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
    green: '#34d399',
    red: '#fb7185',
    orange: '#fb8a67',
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
  direction: number,
  color: string
): void {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + direction * 48);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y + direction * 48);
  ctx.lineTo(x - 8, y + direction * 36);
  ctx.lineTo(x + 8, y + direction * 36);
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
function drawConnector(
  ctx: CanvasRenderingContext2D,
  state: ConnectedBodiesState,
  p: Palette
): void {
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  ctx.strokeRect(BX, BY, BWIDTH, BHEIGHT);
  const upperSpring = state.params.arrangement === 'string-spring';
  const upperY = TY;
  const lowerY = AY - BR;
  ctx.strokeStyle = p.blue;
  ctx.lineWidth = 4;
  if (upperSpring) {
    ctx.beginPath();
    ctx.moveTo(LX, upperY);
    for (let i = 0; i < 8; i += 1) {
      const y = upperY + 14 + i * 14;
      ctx.lineTo(LX + (i % 2 === 0 ? 11 : -11), y);
    }
    ctx.lineTo(LX, lowerY);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(LX, upperY);
    ctx.lineTo(LX, lowerY);
    ctx.stroke();
  }
  if (state.params.cut === 'upper') ctx.strokeStyle = p.red;
  if (state.params.cut === 'upper') {
    ctx.beginPath();
    ctx.moveTo(LX - 14, UCY1);
    ctx.lineTo(LX + 14, UCY2);
    ctx.moveTo(LX + 14, UCY1);
    ctx.lineTo(LX - 14, UCY2);
    ctx.stroke();
  }
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(LX, AY + BR);
  ctx.lineTo(LX, DY - BR);
  ctx.stroke();
  if (state.params.cut === 'lower') {
    ctx.beginPath();
    ctx.moveTo(LX - 14, LCY1);
    ctx.lineTo(LX + 14, LCY2);
    ctx.moveTo(LX + 14, LCY1);
    ctx.lineTo(LX - 14, LCY2);
    ctx.stroke();
  }
}
function drawBall(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  mass: number,
  color: string,
  p: Palette
): void {
  ctx.fillStyle = color;
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, BR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  text(ctx, label, x, y, '#fff', 18, 'center', 700);
  text(ctx, `${mass.toFixed(1)} kg`, x + BR + 22, y, p.ink, 14, 'left', 700);
}
function drawAnalysis(
  ctx: CanvasRenderingContext2D,
  state: ConnectedBodiesState,
  p: Palette
): void {
  [
    [FAY, 'A 球受力分析', state.accelerationA, p.blue],
    [FBY, 'B 球受力分析', state.accelerationB, p.green]
  ].forEach(([y, title, acceleration, color]) => {
    card(ctx, FX, Number(y), FWIDTH, FH);
    ctx.fillStyle = p.panel;
    ctx.fill();
    ctx.strokeStyle = p.border;
    ctx.stroke();
    text(
      ctx,
      String(title),
      FX + 18,
      Number(y) + 28,
      String(color),
      16,
      'left',
      700
    );
    ctx.strokeStyle = String(color);
    ctx.beginPath();
    ctx.moveTo(FX + 18, Number(y) + ARO);
    ctx.lineTo(FX + FWIDTH - 18, Number(y) + ARO);
    ctx.stroke();
    text(
      ctx,
      `a = ${Number(acceleration).toFixed(1)} m/s²`,
      FX + FWIDTH - 18,
      Number(y) + 96,
      p.orange,
      14,
      'right',
      700
    );
  });
}
function drawField(
  ctx: CanvasRenderingContext2D,
  state: ConnectedBodiesState,
  p: Palette,
  scale: number
): void {
  drawBackground(ctx, p);
  text(
    ctx,
    state.params.arrangement === 'string-spring'
      ? '连接体模型：细绳 + 弹簧'
      : '连接体模型：弹簧 + 细绳',
    28,
    38,
    p.ink,
    20 * scale,
    'left',
    700
  );
  drawConnector(ctx, state, p);
  drawBall(ctx, AX, AY, 'A', state.params.massA, p.blue, p);
  drawBall(ctx, DX, DY, 'B', state.params.massB, p.green, p);
  if (state.params.cut !== 'none') {
    arrow(ctx, AX, AY - BR - 24, state.accelerationA >= 0 ? -1 : 1, p.orange);
    arrow(ctx, DX, DY + BR + 24, state.accelerationB >= 0 ? 1 : -1, p.orange);
    text(
      ctx,
      state.params.cut === 'lower' ? '已剪断下方连接' : '已剪断上方连接',
      28,
      CLY,
      p.red,
      14 * scale,
      'left',
      700
    );
  }
  drawAnalysis(ctx, state, p);
  text(
    ctx,
    '各剪断状态均冻结在 t = 0⁺',
    28,
    NY,
    p.muted,
    13 * scale,
    'left',
    600
  );
}
function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: ConnectedBodiesState,
  p: Palette,
  scale: number
): void {
  ctx.fillStyle = p.panel;
  ctx.fillRect(PX, 0, BW - PX, BH);
  text(ctx, '经典连接体模型', PX + INSET, 42, p.ink, 20 * scale, 'left', 700);
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
    '模型：细绳与轻弹簧',
    PX + INSET + 16,
    MCY + 26,
    p.ink,
    16 * scale,
    'left',
    700
  );
  text(
    ctx,
    '轻绳张力可突变；未断轻弹簧力不突变',
    PX + INSET + 16,
    MCY + 62,
    p.muted,
    12 * scale,
    'left',
    600
  );
  text(
    ctx,
    '只分析 t = 0⁺，不延伸后续轨迹',
    PX + INSET + 16,
    MCY + 88,
    p.blue,
    12 * scale,
    'left',
    700
  );
  card(ctx, PX + INSET, CCY, PW - INSET * 2, CCH);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(
    ctx,
    `mₐ = ${state.params.massA.toFixed(1)} kg`,
    PX + INSET + 16,
    CCY + 36,
    p.ink,
    14 * scale,
    'left'
  );
  text(
    ctx,
    `mᵦ = ${state.params.massB.toFixed(1)} kg`,
    PX + INSET + 196,
    CCY + 36,
    p.ink,
    14 * scale,
    'left'
  );
  text(
    ctx,
    '按按钮剪断连接，观察加速度瞬变',
    PX + INSET + 16,
    CCY + 78,
    p.muted,
    13 * scale,
    'left'
  );
  text(
    ctx,
    state.params.cut === 'none'
      ? '当前：平衡初态'
      : `当前：${state.params.cut === 'lower' ? '下方连接断开' : '上方连接断开'}`,
    PX + INSET + 16,
    CCY + 134,
    state.params.cut === 'none' ? p.blue : p.red,
    14 * scale,
    'left',
    700
  );
  card(ctx, PX + INSET, SCY, PW - INSET * 2, SCH);
  ctx.fillStyle = p.soft;
  ctx.fill();
  text(
    ctx,
    '瞬时状态物理量（t = 0⁺）',
    PX + INSET + 16,
    SCY + 26,
    p.ink,
    15 * scale,
    'left',
    700
  );
  const rows: Array<[string, string, string]> = [
    ['球 A 加速度', `${state.accelerationA.toFixed(1)} m/s²`, p.red],
    ['球 B 加速度', `${state.accelerationB.toFixed(1)} m/s²`, p.red],
    ['上方连接力', `${state.upperForce.toFixed(1)} N`, p.blue],
    ['下方连接力', `${state.lowerForce.toFixed(1)} N`, p.green]
  ];
  rows.forEach(([label, value, color], index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = PX + INSET + 16 + col * 166;
    const y = SCY + 64 + row * 72;
    text(ctx, label, x, y, p.muted, 12 * scale, 'left');
    text(ctx, value, x, y + 26, color, 16 * scale, 'left', 700);
  });
  card(ctx, PX + INSET, RCY, PW - INSET * 2, RCH);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(
    ctx,
    '核心规律',
    PX + INSET + 16,
    RCY + 22,
    p.orange,
    14 * scale,
    'left',
    700
  );
  text(
    ctx,
    '速度连续；加速度可突变',
    PX + INSET + 16,
    RCY + 50,
    p.ink,
    13 * scale,
    'left',
    700
  );
  text(
    ctx,
    '轻绳可突变，轻弹簧不可突变',
    PX + INSET + 16,
    RCY + 72,
    p.muted,
    12 * scale,
    'left'
  );
}
export function createConnectedBodiesView(
  options: CreateConnectedBodiesViewOptions = {}
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
  let snapshot: ConnectedBodiesState | null = null;
  function draw(state: ConnectedBodiesState) {
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
    render(state: ConnectedBodiesState) {
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
