import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { frictionConstants, type FrictionState } from './scene.sim';
export type CreateFrictionViewOptions = {
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
  grid: string;
  axis: string;
  blue: string;
  red: string;
  green: string;
  orange: string;
  border: string;
};
const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfcfd',
    panel: '#fff',
    ink: '#303744',
    muted: '#7d8997',
    grid: '#e5e9ed',
    axis: '#35404a',
    blue: '#2485d8',
    red: '#ef4050',
    green: '#18a87c',
    orange: '#ed7955',
    border: '#d8e0e7'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    ink: '#eef2f7',
    muted: '#aab6c8',
    grid: '#2b3b52',
    axis: '#dbe5ef',
    blue: '#60a5fa',
    red: '#fb7185',
    green: '#34d399',
    orange: '#fb8a67',
    border: '#3c4b61'
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
  p: Palette
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}
function xToPx(force: number): number {
  return (
    frictionConstants.graphLeft +
    (force / frictionConstants.graphForceMax) *
      (frictionConstants.graphRight - frictionConstants.graphLeft)
  );
}
function yToPx(value: number): number {
  const v = Math.max(0, Math.min(frictionConstants.graphFrictionMax, value));
  return (
    frictionConstants.graphZeroY -
    (v / frictionConstants.graphFrictionMax) *
      (frictionConstants.graphZeroY - frictionConstants.graphTop)
  );
}
function drawGround(ctx: CanvasRenderingContext2D, p: Palette): void {
  const y = frictionConstants.diagramGroundY;
  ctx.strokeStyle = p.axis;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(frictionConstants.groundStartX, y);
  ctx.lineTo(frictionConstants.groundEndX, y);
  ctx.stroke();
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (
    let x = frictionConstants.groundStartX;
    x < frictionConstants.groundEndX;
    x += 18
  ) {
    ctx.beginPath();
    ctx.moveTo(x, y + 3);
    ctx.lineTo(x - 16, y + 20);
    ctx.stroke();
  }
}
function arrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dx: number,
  color: string
): void {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + dx, y);
  ctx.stroke();
  const tip = x + dx;
  const sign = dx >= 0 ? 1 : -1;
  ctx.beginPath();
  ctx.moveTo(tip, y);
  ctx.lineTo(tip - sign * 15, y - 8);
  ctx.lineTo(tip - sign * 15, y + 8);
  ctx.closePath();
  ctx.fill();
}
function verticalArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dy: number,
  color: string
): void {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + dy);
  ctx.stroke();
  const tip = y + dy;
  const sign = dy >= 0 ? 1 : -1;
  ctx.beginPath();
  ctx.moveTo(x, tip);
  ctx.lineTo(x - 8, tip - sign * 15);
  ctx.lineTo(x + 8, tip - sign * 15);
  ctx.closePath();
  ctx.fill();
}
function drawDiagram(
  ctx: CanvasRenderingContext2D,
  state: FrictionState,
  p: Palette
): void {
  drawGround(ctx, p);
  const lowerY =
    frictionConstants.diagramGroundY - frictionConstants.blockHeight / 2;
  const upperY =
    lowerY -
    frictionConstants.blockHeight / 2 -
    frictionConstants.upperBlockHeight / 2;
  const stacked = state.mode === 'stacked';
  const lowerW = stacked
    ? frictionConstants.blockWidth + 20
    : frictionConstants.blockWidth;
  ctx.fillStyle = p.blue;
  ctx.strokeStyle = p.axis;
  ctx.lineWidth = 3;
  ctx.fillRect(
    frictionConstants.blockX -
      lowerW / 2 +
      state.position * frictionConstants.animationOffset,
    lowerY - frictionConstants.blockHeight / 2,
    lowerW,
    frictionConstants.blockHeight
  );
  ctx.strokeRect(
    frictionConstants.blockX -
      lowerW / 2 +
      state.position * frictionConstants.animationOffset,
    lowerY - frictionConstants.blockHeight / 2,
    lowerW,
    frictionConstants.blockHeight
  );
  if (stacked) {
    ctx.fillStyle = p.green;
    ctx.fillRect(
      frictionConstants.blockX -
        frictionConstants.upperBlockWidth / 2 +
        state.position * frictionConstants.animationOffset,
      upperY - frictionConstants.upperBlockHeight / 2,
      frictionConstants.upperBlockWidth,
      frictionConstants.upperBlockHeight
    );
    ctx.strokeRect(
      frictionConstants.blockX -
        frictionConstants.upperBlockWidth / 2 +
        state.position * frictionConstants.animationOffset,
      upperY - frictionConstants.upperBlockHeight / 2,
      frictionConstants.upperBlockWidth,
      frictionConstants.upperBlockHeight
    );
    text(
      ctx,
      'm₁',
      frictionConstants.blockX +
        state.position * frictionConstants.animationOffset,
      upperY,
      '#fff',
      18,
      'center',
      700
    );
    text(
      ctx,
      'm₂',
      frictionConstants.blockX +
        state.position * frictionConstants.animationOffset,
      lowerY,
      '#fff',
      20,
      'center',
      700
    );
  } else
    text(
      ctx,
      'm',
      frictionConstants.blockX +
        state.position * frictionConstants.animationOffset,
      lowerY,
      '#fff',
      22,
      'center',
      700
    );
  const x =
    frictionConstants.blockX +
    state.position * frictionConstants.animationOffset;
  arrow(
    ctx,
    x + lowerW / 2,
    frictionConstants.forceArrowY,
    Math.min(frictionConstants.arrowLengthMax, 36 + state.force * 4),
    p.red
  );
  text(
    ctx,
    'F = ' + state.force.toFixed(1) + ' N',
    x + lowerW / 2 + 18,
    frictionConstants.forceArrowY - 22,
    p.red,
    15,
    'left',
    700
  );
  arrow(
    ctx,
    x - lowerW / 2,
    frictionConstants.forceArrowY + 44,
    -Math.min(128, 28 + state.friction * 4),
    p.blue
  );
  text(
    ctx,
    'f = ' + state.friction.toFixed(1) + ' N',
    x - lowerW / 2 - 18,
    frictionConstants.forceArrowY + 66,
    p.blue,
    14,
    'right',
    700
  );
  const contactY = lowerY + frictionConstants.blockHeight / 2;
  verticalArrow(
    ctx,
    frictionConstants.normalArrowX,
    contactY,
    -frictionConstants.normalArrowLength,
    p.muted
  );
  verticalArrow(
    ctx,
    frictionConstants.weightArrowX,
    contactY,
    frictionConstants.normalArrowLength,
    p.muted
  );
  text(
    ctx,
    'N = ' + state.normal.toFixed(1) + ' N',
    frictionConstants.normalArrowX + 18,
    lowerY + frictionConstants.blockHeight / 2 + 26,
    p.muted,
    13,
    'left',
    600
  );
  text(
    ctx,
    'G = ' + state.normal.toFixed(1) + ' N',
    frictionConstants.normalArrowX + 18,
    lowerY + frictionConstants.blockHeight / 2 + 50,
    p.muted,
    13,
    'left',
    600
  );
  text(
    ctx,
    stacked ? '叠加体：观察接触面摩擦' : '水平面：静摩擦随外力调节',
    62,
    386,
    p.muted,
    14,
    'left',
    600
  );
}
function drawGraph(
  ctx: CanvasRenderingContext2D,
  state: FrictionState,
  p: Palette
): void {
  card(ctx, 36, 422, 708, 286, p);
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (
    let x = frictionConstants.graphLeft;
    x <= frictionConstants.graphRight;
    x += frictionConstants.gridStep
  ) {
    ctx.beginPath();
    ctx.moveTo(x, frictionConstants.graphTop);
    ctx.lineTo(x, frictionConstants.graphBottom);
    ctx.stroke();
  }
  for (
    let y = frictionConstants.graphTop;
    y <= frictionConstants.graphBottom;
    y += frictionConstants.gridStep
  ) {
    ctx.beginPath();
    ctx.moveTo(frictionConstants.graphLeft, y);
    ctx.lineTo(frictionConstants.graphRight, y);
    ctx.stroke();
  }
  ctx.strokeStyle = p.axis;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(frictionConstants.graphLeft, frictionConstants.graphZeroY);
  ctx.lineTo(frictionConstants.graphRight + 12, frictionConstants.graphZeroY);
  ctx.moveTo(frictionConstants.graphLeft, frictionConstants.graphZeroY);
  ctx.lineTo(frictionConstants.graphLeft, frictionConstants.graphTop - 12);
  ctx.stroke();
  text(
    ctx,
    '接触面摩擦力 f / N',
    frictionConstants.graphLeft + 8,
    frictionConstants.graphTop - 20,
    p.ink,
    15,
    'left',
    700
  );
  text(
    ctx,
    '外力 F / N',
    frictionConstants.graphRight + 16,
    frictionConstants.graphZeroY,
    p.ink,
    12,
    'left',
    700
  );
  ctx.strokeStyle = p.blue;
  ctx.lineWidth = 4;
  ctx.beginPath();
  const threshold = state.maxStatic;
  for (let i = 0; i <= 80; i += 1) {
    const force = (frictionConstants.graphForceMax * i) / 80;
    const friction = force <= threshold ? force : state.kinetic;
    const x = xToPx(force);
    const y = yToPx(friction);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.setLineDash([7, 6]);
  ctx.strokeStyle = p.red;
  ctx.beginPath();
  ctx.moveTo(xToPx(threshold), frictionConstants.graphTop);
  ctx.lineTo(xToPx(threshold), frictionConstants.graphBottom);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = p.red;
  ctx.beginPath();
  ctx.arc(xToPx(state.force), yToPx(state.friction), 7, 0, Math.PI * 2);
  ctx.fill();
  text(
    ctx,
    'fₘₐₓ = ' + state.maxStatic.toFixed(1) + ' N',
    xToPx(threshold) + 10,
    frictionConstants.graphTop + 22,
    p.red,
    13,
    'left',
    700
  );
  text(
    ctx,
    state.status,
    xToPx(Math.min(state.force, 35)),
    yToPx(state.friction) - 24,
    state.status === '静止' ? p.blue : p.orange,
    14,
    'center',
    700
  );
  text(
    ctx,
    '静摩擦区',
    xToPx(Math.max(3, threshold * 0.45)),
    frictionConstants.graphBottom - 28,
    p.blue,
    13,
    'center',
    600
  );
  text(
    ctx,
    '滑动摩擦区',
    xToPx(Math.min(32, threshold + 10)),
    frictionConstants.graphBottom - 28,
    p.orange,
    13,
    'center',
    600
  );
}
function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: FrictionState,
  p: Palette
): void {
  card(
    ctx,
    frictionConstants.panelX,
    frictionConstants.panelCardY,
    frictionConstants.panelWidth,
    frictionConstants.panelCardHeight,
    p
  );
  text(
    ctx,
    '实时动力学看板',
    frictionConstants.panelX + 22,
    frictionConstants.panelCardY + 28,
    p.ink,
    17,
    'left',
    700
  );
  text(
    ctx,
    state.status,
    frictionConstants.panelX + frictionConstants.panelWidth - 22,
    frictionConstants.panelCardY + 28,
    state.status === '静止' ? p.blue : p.orange,
    15,
    'right',
    700
  );
  const rows: Array<[string, string, string]> = [
    ['接触面摩擦力 f', state.friction.toFixed(2) + ' N', p.blue],
    ['最大静摩擦力 fₘₐₓ', state.maxStatic.toFixed(2) + ' N', p.red],
    ['加速度 a', state.acceleration.toFixed(2) + ' m/s²', p.green]
  ];
  rows.forEach((row, index) => {
    const y = frictionConstants.panelCardY + 64 + index * 26;
    text(
      ctx,
      row[0],
      frictionConstants.panelX + 22,
      y,
      p.muted,
      13,
      'left',
      600
    );
    text(
      ctx,
      row[1],
      frictionConstants.panelX + frictionConstants.panelWidth - 22,
      y,
      row[2],
      15,
      'right',
      700
    );
  });
  card(
    ctx,
    frictionConstants.panelX,
    frictionConstants.stateCardY,
    frictionConstants.panelWidth,
    frictionConstants.stateCardHeight,
    p
  );
  text(
    ctx,
    '临界判据',
    frictionConstants.panelX + 22,
    frictionConstants.stateCardY + 26,
    p.ink,
    15,
    'left',
    700
  );
  text(
    ctx,
    state.force <= state.maxStatic
      ? 'F ≤ fₘₐₓ：静摩擦自适应'
      : 'F > fₘₐₓ：摩擦突变为 fₖ',
    frictionConstants.panelX + 22,
    frictionConstants.stateCardY + 62,
    p.muted,
    14,
    'left',
    600
  );
  text(
    ctx,
    'fₖ = μₖN',
    frictionConstants.panelX + 22,
    frictionConstants.stateCardY + 88,
    p.orange,
    15,
    'left',
    700
  );
  card(
    ctx,
    frictionConstants.panelX,
    frictionConstants.readoutCardY,
    frictionConstants.panelWidth,
    frictionConstants.readoutCardHeight,
    p
  );
  text(
    ctx,
    '参数',
    frictionConstants.panelX + 22,
    frictionConstants.readoutCardY + 26,
    p.ink,
    15,
    'left',
    700
  );
  text(
    ctx,
    'F = ' + state.force.toFixed(1) + ' N',
    frictionConstants.panelX + 22,
    frictionConstants.readoutCardY + 64,
    p.muted,
    14,
    'left',
    600
  );
  text(
    ctx,
    'μₖ = ' + state.muK.toFixed(2),
    frictionConstants.panelX + 22,
    frictionConstants.readoutCardY + 94,
    p.muted,
    14,
    'left',
    600
  );
  text(
    ctx,
    state.mode === 'stacked' ? '叠加体模式' : '单物块模式',
    frictionConstants.panelX + 22,
    frictionConstants.readoutCardY + 136,
    p.green,
    15,
    'left',
    700
  );
  card(
    ctx,
    frictionConstants.panelX,
    frictionConstants.ruleCardY,
    frictionConstants.panelWidth,
    frictionConstants.ruleCardHeight,
    p
  );
  text(
    ctx,
    '判据',
    frictionConstants.panelX + 22,
    frictionConstants.ruleCardY + 26,
    p.ink,
    15,
    'left',
    700
  );
  text(
    ctx,
    '静摩擦：f = F',
    frictionConstants.panelX + 22,
    frictionConstants.ruleCardY + 62,
    p.blue,
    14,
    'left',
    600
  );
  text(
    ctx,
    '滑动：f = μₖN',
    frictionConstants.panelX + 22,
    frictionConstants.ruleCardY + 94,
    p.orange,
    14,
    'left',
    600
  );
}
export function createFrictionView(options: CreateFrictionViewOptions = {}) {
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: {
      mode: 'clamped',
      fallbackWidth: frictionConstants.baseWidth,
      fallbackHeight: frictionConstants.baseHeight
    },
    initialWidth: frictionConstants.baseWidth,
    initialHeight: frictionConstants.baseHeight,
    eagerContext: true
  });
  let snapshot: FrictionState | null = null;
  function draw(state: FrictionState) {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(
      width / frictionConstants.baseWidth,
      height / frictionConstants.baseHeight
    );
    const scale = env.contentScale() * stage.responsiveScale;
    const offsetX = Math.max(
      0,
      (width - frictionConstants.baseWidth * fit) / 2
    );
    const offsetY = Math.max(
      0,
      (height - frictionConstants.baseHeight * fit) / 2
    );
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fit, fit);
    const p = PALETTE[env.theme];
    ctx.fillStyle = p.bg;
    ctx.fillRect(
      0,
      0,
      frictionConstants.baseWidth,
      frictionConstants.baseHeight
    );
    text(ctx, '摩擦力分析与临界问题', 42, 34, p.ink, 22 * scale, 'left', 700);
    drawDiagram(ctx, state, p);
    drawGraph(ctx, state, p);
    drawPanel(ctx, state, p);
    text(
      ctx,
      '调节 F，观察 f 的突变与加速度',
      42,
      730,
      p.muted,
      13 * scale,
      'left',
      600
    );
    ctx.restore();
  }
  return {
    render(state: FrictionState) {
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
