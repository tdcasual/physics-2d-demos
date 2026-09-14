import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  connectedBodiesInclineConstants as C,
  type ConnectedBodiesInclineState
} from './scene.sim';

export type CreateConnectedBodiesInclineViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};
type Palette = {
  bg: string;
  grid: string;
  ink: string;
  muted: string;
  border: string;
  slope: string;
  slopeEdge: string;
  block: string;
  blockEdge: string;
  rope: string;
  red: string;
  blue: string;
  teal: string;
  purple: string;
  panel: string;
  ground: string;
};
const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    grid: '#e8e5df',
    ink: '#303744',
    muted: '#7d8997',
    border: '#d5d8dc',
    slope: '#edf1f4',
    slopeEdge: '#667281',
    block: '#f8fafc',
    blockEdge: '#3a4655',
    rope: '#4a5563',
    red: '#ef4050',
    blue: '#3187df',
    teal: '#18a788',
    purple: '#9a32b8',
    panel: '#ffffff',
    ground: '#c8cfd6'
  },
  dark: {
    bg: '#101827',
    grid: '#2a394d',
    ink: '#eef2f7',
    muted: '#a8b4c5',
    border: '#3e4d64',
    slope: '#243449',
    slopeEdge: '#b5c5d8',
    block: '#1b2b3e',
    blockEdge: '#dbe7f2',
    rope: '#c4d0dc',
    red: '#ff707c',
    blue: '#70b9f0',
    teal: '#4ed9c0',
    purple: '#d186eb',
    panel: '#172235',
    ground: '#435267'
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
  p: Palette
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, C.cardRadius);
  ctx.fillStyle = `${p.panel}ed`;
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
  label: string
): void {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + dx, y + dy);
  ctx.stroke();
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  ctx.beginPath();
  ctx.moveTo(x + dx, y + dy);
  ctx.lineTo(x + dx - ux * 14 + uy * 7, y + dy - uy * 14 - ux * 7);
  ctx.lineTo(x + dx - ux * 14 - uy * 7, y + dy - uy * 14 + ux * 7);
  ctx.closePath();
  ctx.fill();
  text(
    ctx,
    label,
    x + dx + uy * 16,
    y + dy - ux * 16,
    color,
    16,
    'center',
    700
  );
}
function drawGrid(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, C.baseWidth, C.baseHeight);
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let x = 28; x < C.baseWidth; x += C.gridStep) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, C.baseHeight);
    ctx.stroke();
  }
  for (let y = 28; y < C.baseHeight; y += C.gridStep) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(C.baseWidth, y);
    ctx.stroke();
  }
}
function drawHeader(
  ctx: CanvasRenderingContext2D,
  state: ConnectedBodiesInclineState,
  p: Palette
): void {
  text(ctx, '连接体受力分析', 36, 34, p.ink, 25, 'left', 700);
  text(ctx, '定滑轮 · 斜面 · 摩擦方向', 36, 64, p.muted, 15, 'left', 600);
  card(ctx, C.panelX, C.panelY, C.panelWidth, C.stateCardHeight - 12, p);
  text(
    ctx,
    state.status,
    C.panelX + 24,
    C.panelY + 27,
    state.status === '静止'
      ? p.teal
      : state.status === '加速上滑'
        ? p.red
        : p.blue,
    22,
    'left',
    700
  );
  text(
    ctx,
    state.trend,
    C.panelX + 24,
    C.panelY + 58,
    p.muted,
    15,
    'left',
    600
  );
  text(
    ctx,
    `a = ${state.acceleration.toFixed(2)} m/s²`,
    C.panelX + C.panelWidth - 24,
    C.panelY + 42,
    p.purple,
    18,
    'right',
    700
  );
}
function drawGroundAndSlope(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.strokeStyle = p.ground;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(C.groundLeft, C.groundY);
  ctx.lineTo(C.groundRight, C.groundY);
  ctx.stroke();
  ctx.fillStyle = p.slope;
  ctx.beginPath();
  ctx.moveTo(C.inclineFootX, C.groundY);
  ctx.lineTo(C.inclineTopX, C.inclineTopY);
  ctx.lineTo(C.pulleyX, C.inclineTopY);
  ctx.lineTo(C.pulleyX, C.groundY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = p.slopeEdge;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(C.inclineFootX, C.groundY);
  ctx.lineTo(C.inclineTopX, C.inclineTopY);
  ctx.lineTo(C.pulleyX, C.inclineTopY);
  ctx.lineTo(C.pulleyX, C.groundY);
  ctx.stroke();
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let index = 0; index < 12; index += 1) {
    const x = C.inclineFootX + index * 50;
    ctx.beginPath();
    ctx.moveTo(x, C.groundY - 3);
    ctx.lineTo(x + 44, C.groundY - 39);
    ctx.stroke();
  }
}
function drawPulleyAndRope(
  ctx: CanvasRenderingContext2D,
  state: ConnectedBodiesInclineState,
  p: Palette
): void {
  const theta = (state.angle * Math.PI) / 180;
  const offset = state.displacement * C.displacementPx;
  const blockX = C.blockAX + Math.cos(theta) * offset;
  const blockY = C.blockAY - Math.sin(theta) * offset;
  ctx.strokeStyle = p.rope;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(blockX + Math.cos(theta) * 46, blockY - Math.sin(theta) * 46);
  ctx.lineTo(C.pulleyX - C.pulleyRadius, C.pulleyY);
  ctx.arc(C.pulleyX, C.pulleyY, C.pulleyRadius, Math.PI, 0, false);
  ctx.lineTo(C.hangingX, C.ropeEndY + state.displacement * 44);
  ctx.stroke();
  ctx.fillStyle = p.panel;
  ctx.beginPath();
  ctx.arc(C.pulleyX, C.pulleyY, C.pulleyRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.blockEdge;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = p.rope;
  ctx.beginPath();
  ctx.arc(C.pulleyX, C.pulleyY, 10, 0, Math.PI * 2);
  ctx.fill();
}
function drawBlocks(
  ctx: CanvasRenderingContext2D,
  state: ConnectedBodiesInclineState,
  p: Palette
): void {
  const theta = (state.angle * Math.PI) / 180;
  const offset = state.displacement * C.displacementPx;
  const x = C.blockAX + Math.cos(theta) * offset;
  const y = C.blockAY - Math.sin(theta) * offset;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-theta);
  ctx.fillStyle = p.block;
  ctx.strokeStyle = p.blockEdge;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(
    -C.blockWidth / 2,
    -C.blockHeight / 2,
    C.blockWidth,
    C.blockHeight,
    10
  );
  ctx.fill();
  ctx.stroke();
  text(ctx, `A (${state.massA.toFixed(1)} kg)`, 0, 0, p.ink, 16, 'center', 700);
  ctx.restore();
  const hangingY = C.ropeEndY + state.displacement * 44;
  ctx.fillStyle = p.block;
  ctx.strokeStyle = p.blockEdge;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(
    C.hangingX - C.hangingWidth / 2,
    hangingY,
    C.hangingWidth,
    C.hangingHeight,
    10
  );
  ctx.fill();
  ctx.stroke();
  text(
    ctx,
    `B (${state.massB.toFixed(1)} kg)`,
    C.hangingX,
    hangingY + C.hangingHeight / 2,
    p.ink,
    16,
    'center',
    700
  );
}
function drawForces(
  ctx: CanvasRenderingContext2D,
  state: ConnectedBodiesInclineState,
  p: Palette
): void {
  if (!state.showForces) return;
  const theta = (state.angle * Math.PI) / 180;
  const offset = state.displacement * C.displacementPx;
  const x = C.blockAX + Math.cos(theta) * offset;
  const y = C.blockAY - Math.sin(theta) * offset;
  const alongX = Math.cos(theta);
  const alongY = -Math.sin(theta);
  const frictionSign = state.friction >= 0 ? 1 : -1;
  arrow(
    ctx,
    x,
    y,
    frictionSign * alongX * C.frictionArrowLength,
    frictionSign * alongY * C.frictionArrowLength,
    p.teal,
    'f'
  );
  arrow(ctx, x, y, alongX * C.arrowLength, alongY * C.arrowLength, p.red, 'T');
  arrow(ctx, x, y, 0, C.arrowLength, p.blue, 'G');
  arrow(
    ctx,
    x,
    y,
    -alongY * C.arrowLength,
    alongX * C.arrowLength,
    p.teal,
    'N'
  );
  text(ctx, 'mₐg sinθ', x - 12, y + 82, p.muted, 14, 'center', 600);
  text(
    ctx,
    `摩擦 ${Math.abs(state.friction).toFixed(1)} N`,
    x + 102,
    y + 82,
    p.teal,
    14,
    'center',
    600
  );
  arrow(
    ctx,
    C.hangingX,
    C.ropeEndY + C.hangingHeight / 2,
    0,
    C.arrowLength,
    p.blue,
    'mᵦg'
  );
}
function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: ConnectedBodiesInclineState,
  p: Palette
): void {
  card(ctx, C.panelX, C.formulaCardY, C.panelWidth, C.formulaCardHeight, p);
  text(
    ctx,
    '牛顿第二定律',
    C.panelX + 24,
    C.formulaCardY + 28,
    p.ink,
    19,
    'left',
    700
  );
  text(
    ctx,
    `B:  mᵦg − T = mᵦa`,
    C.panelX + 24,
    C.formulaCardY + 70,
    p.muted,
    16,
    'left',
    600
  );
  text(
    ctx,
    `A:  T − mₐg sinθ ${state.friction >= 0 ? '+' : '−'} f = mₐa`,
    C.panelX + 24,
    C.formulaCardY + 104,
    p.muted,
    16,
    'left',
    600
  );
  text(
    ctx,
    `T = ${state.tension.toFixed(2)} N`,
    C.panelX + 24,
    C.formulaCardY + 150,
    p.red,
    18,
    'left',
    700
  );
  text(
    ctx,
    `f = ${Math.abs(state.friction).toFixed(2)} N`,
    C.panelX + 204,
    C.formulaCardY + 150,
    p.teal,
    18,
    'left',
    700
  );
  card(ctx, C.panelX, C.metricCardY, C.panelWidth, C.metricCardHeight, p);
  text(
    ctx,
    `mₐ ${state.massA.toFixed(1)} kg   mᵦ ${state.massB.toFixed(1)} kg`,
    C.panelX + 24,
    C.metricCardY + 30,
    p.ink,
    16,
    'left',
    700
  );
  text(
    ctx,
    `θ ${state.angle.toFixed(0)}°     μ ${state.mu.toFixed(2)}`,
    C.panelX + 24,
    C.metricCardY + 64,
    p.ink,
    16,
    'left',
    700
  );
  text(
    ctx,
    `驱动力 ${state.drive.toFixed(2)} N`,
    C.panelX + 24,
    C.metricCardY + 105,
    state.drive >= 0 ? p.red : p.blue,
    16,
    'left',
    700
  );
  text(
    ctx,
    `静摩擦上限 ${state.staticLimit.toFixed(2)} N`,
    C.panelX + 24,
    C.metricCardY + 140,
    p.muted,
    15,
    'left',
    600
  );
}
function drawFooter(
  ctx: CanvasRenderingContext2D,
  state: ConnectedBodiesInclineState,
  p: Palette
): void {
  card(ctx, 36, C.noteCardY, 720, C.noteCardHeight, p);
  text(
    ctx,
    state.status === '静止'
      ? '静摩擦力抵消驱动力'
      : '摩擦力总与运动（趋势）方向相反',
    58,
    C.noteCardY + 28,
    p.ink,
    16,
    'left',
    700
  );
  text(
    ctx,
    `t = ${state.time.toFixed(2)} s`,
    730,
    C.noteCardY + 28,
    p.muted,
    15,
    'right',
    600
  );
}
function drawScene(
  ctx: CanvasRenderingContext2D,
  state: ConnectedBodiesInclineState,
  p: Palette
): void {
  drawGrid(ctx, p);
  drawHeader(ctx, state, p);
  drawGroundAndSlope(ctx, p);
  drawPulleyAndRope(ctx, state, p);
  drawBlocks(ctx, state, p);
  drawForces(ctx, state, p);
  drawPanel(ctx, state, p);
  drawFooter(ctx, state, p);
}

export function createConnectedBodiesInclineView(
  options: CreateConnectedBodiesInclineViewOptions = {}
) {
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode,
    demoHints: options.demoHints
  });
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
  function render(state: ConnectedBodiesInclineState): void {
    stage.ensureSized();
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const scale =
      Math.min(width / C.baseWidth, height / C.baseHeight) *
      Math.min(1, stage.responsiveScale);
    const offsetX = (width - C.baseWidth * scale) / 2;
    const offsetY = (height - C.baseHeight * scale) / 2;
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
    drawScene(ctx, state, PALETTE[env.theme]);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  return {
    render,
    resize() {
      stage.resize();
    },
    setTheme(theme: TeachingTheme) {
      env.setTheme(theme);
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints) {
      env.setMode(mode, hints);
    },
    dispose() {
      stage.release();
    }
  };
}
