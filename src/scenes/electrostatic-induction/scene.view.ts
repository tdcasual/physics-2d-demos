import { getRenderTokens } from '../../platform/standards';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  electrostaticInductionConstants as C,
  PARTICLE_POINTS,
  type ElectrostaticInductionState
} from './scene.sim';

export type CreateElectrostaticInductionViewOptions = {
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
  conductor: string;
  conductorEdge: string;
  rod: string;
  rodAlt: string;
  electron: string;
  positive: string;
  teal: string;
  blue: string;
  card: string;
  stand: string;
};
const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    grid: '#e8e5df',
    ink: '#303744',
    muted: '#7d8997',
    border: '#d5d8dc',
    conductor: '#e6ebef',
    conductorEdge: '#34465c',
    rod: '#ed3f4c',
    rodAlt: '#3187df',
    electron: '#3187df',
    positive: '#aeb6bf',
    teal: '#17a38a',
    blue: '#2b87d3',
    card: '#ffffff',
    stand: '#526071'
  },
  dark: {
    bg: '#101827',
    grid: '#2a394d',
    ink: '#eef2f7',
    muted: '#a8b4c5',
    border: '#3e4d64',
    conductor: '#26384a',
    conductorEdge: '#b4c5d8',
    rod: '#ff707c',
    rodAlt: '#70b9f0',
    electron: '#70b9f0',
    positive: '#aebed0',
    teal: '#4ed9c0',
    blue: '#70b9f0',
    card: '#172235',
    stand: '#c2cedc'
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
function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 12
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
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
  state: ElectrostaticInductionState,
  p: Palette
): void {
  text(
    ctx,
    '静电感应 · 电荷重新分布',
    C.titleX,
    C.titleY,
    p.ink,
    25,
    'left',
    700
  );
  text(
    ctx,
    '高中物理 / 静电场',
    C.titleX,
    C.titleY + 30,
    p.muted,
    15,
    'left',
    600
  );
  rounded(ctx, C.cardX, C.cardY, C.cardWidth, C.cardHeight, 16);
  ctx.fillStyle = `${p.card}ed`;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = p.teal;
  ctx.fillRect(C.cardX, C.cardY + 24, 7, C.cardAccentHeight);
  text(
    ctx,
    state.phase === 'neutral'
      ? '导体接触 · 整体中性'
      : state.mode === 'equilibrium'
        ? '静电平衡 · 内部合场强为零'
        : state.mode === 'grounding'
          ? '接地起电 · 大地提供电子'
          : '分离导体 · 电荷保留',
    C.cardX + 28,
    C.cardY + 32,
    p.ink,
    20,
    'left',
    700
  );
  text(ctx, state.status, C.cardX + 28, C.cardY + 70, p.muted, 15, 'left', 600);
  text(
    ctx,
    `内部合场强 ${state.internalField.toFixed(2)} E₀`,
    C.cardX + C.cardWidth - 26,
    C.cardY + 50,
    state.internalField === 0 ? p.teal : p.blue,
    15,
    'right',
    700
  );
}
function drawRod(
  ctx: CanvasRenderingContext2D,
  state: ElectrostaticInductionState,
  p: Palette
): void {
  const x = state.rodDistance;
  const color = state.rodPolarity === 'positive' ? p.rod : p.rodAlt;
  ctx.fillStyle = `${color}2c`;
  ctx.beginPath();
  ctx.roundRect(
    x - 10,
    C.sphereY - C.rodHeight / 2 - 10,
    C.rodWidth + 20,
    C.rodHeight + 20,
    24
  );
  ctx.fill();
  rounded(ctx, x, C.sphereY - C.rodHeight / 2, C.rodWidth, C.rodHeight, 20);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = `${color}99`;
  ctx.lineWidth = 2;
  ctx.stroke();
  for (let index = 0; index < 6; index += 1)
    text(
      ctx,
      state.rodPolarity === 'positive' ? '+' : '−',
      x + 24 + index * 27,
      C.sphereY,
      '#ffffff',
      17,
      'center',
      700
    );
  text(
    ctx,
    state.rodPolarity === 'positive' ? '带正电绝缘棒' : '带负电绝缘棒',
    x + C.rodWidth / 2,
    C.sphereY + 44,
    color,
    14,
    'center',
    700
  );
  text(ctx, '绝缘棒', x - 18, C.sphereY, p.muted, 13, 'right', 600);
}
function drawStand(
  ctx: CanvasRenderingContext2D,
  x: number,
  label: string,
  p: Palette
): void {
  ctx.strokeStyle = p.stand;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x, C.standTop);
  ctx.lineTo(x, C.standBottom);
  ctx.stroke();
  ctx.fillStyle = p.stand;
  ctx.beginPath();
  ctx.moveTo(x - 30, C.standBottom);
  ctx.lineTo(x + 30, C.standBottom);
  ctx.lineTo(x + 18, C.standBottom + 25);
  ctx.lineTo(x - 18, C.standBottom + 25);
  ctx.closePath();
  ctx.fill();
  text(ctx, label, x, C.standBottom + 48, p.muted, 14, 'center', 700);
}
function drawSphere(
  ctx: CanvasRenderingContext2D,
  cx: number,
  label: string,
  charge: number,
  shift: number,
  state: ElectrostaticInductionState,
  p: Palette
): void {
  ctx.fillStyle = p.conductor;
  ctx.beginPath();
  ctx.arc(cx, C.sphereY, C.sphereRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.conductorEdge;
  ctx.lineWidth = 3;
  ctx.stroke();
  text(
    ctx,
    label,
    cx,
    C.sphereY - C.sphereRadius - 28,
    p.ink,
    18,
    'center',
    700
  );
  text(
    ctx,
    charge > 0 ? '+Q' : charge < 0 ? '−Q' : '中性',
    cx,
    C.sphereY + C.sphereRadius + 22,
    charge === 0 ? p.muted : charge > 0 ? p.rod : p.rodAlt,
    15,
    'center',
    700
  );
  if (!state.showCharges) return;
  const sign = state.rodPolarity === 'positive' ? -1 : 1;
  PARTICLE_POINTS.forEach((point, index) => {
    const xShift = charge === 0 ? 0 : sign * shift * (point.x < 0 ? 1 : -1);
    const px = cx + (point.x + xShift) * C.chargeSpread;
    const py = C.sphereY + point.y * C.chargeSpread;
    const isElectron =
      index % 2 === 0 || (charge !== 0 && (point.x + xShift) * sign > 0);
    if (isElectron) {
      ctx.fillStyle = p.electron;
      ctx.beginPath();
      ctx.arc(px, py, C.particleRadius, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, '−', px, py + 0.5, '#ffffff', 9, 'center', 700);
    } else text(ctx, '+', px, py, p.positive, 16, 'center', 700);
  });
}
function drawGround(
  ctx: CanvasRenderingContext2D,
  state: ElectrostaticInductionState,
  p: Palette
): void {
  if (state.mode !== 'grounding') return;
  ctx.strokeStyle = state.phase === 'grounded' ? p.teal : p.border;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(C.sphereBX, C.sphereY + C.sphereRadius);
  ctx.lineTo(C.sphereBX, C.trackY - 16);
  ctx.lineTo(C.sphereBX + C.groundWireRightOffset, C.trackY - 16);
  ctx.stroke();
  for (let index = 0; index < 3; index += 1) {
    ctx.beginPath();
    ctx.moveTo(
      C.sphereBX + C.groundToothStartOffset + index * 10,
      C.trackY - 6
    );
    ctx.lineTo(C.sphereBX + C.groundToothEndOffset + index * 10, C.trackY + 10);
    ctx.stroke();
  }
  text(ctx, '接地', C.sphereBX + 100, C.trackY - 36, p.teal, 14, 'center', 700);
}
function drawBottom(
  ctx: CanvasRenderingContext2D,
  state: ElectrostaticInductionState,
  p: Palette
): void {
  rounded(ctx, C.bottomX, C.bottomY, C.bottomWidth, C.bottomHeight, 12);
  ctx.fillStyle = `${p.card}ed`;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1;
  ctx.stroke();
  text(ctx, '蓝色小球：自由电子', 58, C.bottomY + 26, p.muted, 14, 'left', 600);
  ctx.fillStyle = p.electron;
  ctx.beginPath();
  ctx.arc(47, C.bottomY + 26, 7, 0, Math.PI * 2);
  ctx.fill();
  text(
    ctx,
    '灰色“+”：固定正离子',
    290,
    C.bottomY + 26,
    p.muted,
    14,
    'left',
    600
  );
  text(
    ctx,
    `qA ${state.chargeA > 0 ? '+' : ''}${state.chargeA.toFixed(0)}Q   ·   qB ${state.chargeB > 0 ? '+' : ''}${state.chargeB.toFixed(0)}Q`,
    590,
    C.bottomY + 26,
    p.ink,
    14,
    'left',
    700
  );
  text(
    ctx,
    `t = ${state.time.toFixed(2)} s`,
    1124,
    C.bottomY + 26,
    p.muted,
    getRenderTokens(1).controlFontPx,
    'right',
    600
  );
}
function drawScene(
  ctx: CanvasRenderingContext2D,
  state: ElectrostaticInductionState,
  p: Palette
): void {
  drawGrid(ctx, p);
  drawHeader(ctx, state, p);
  drawRod(ctx, state, p);
  drawSphere(
    ctx,
    C.sphereAX,
    'A 近端',
    state.chargeA,
    Math.abs(state.electronShift),
    state,
    p
  );
  drawSphere(
    ctx,
    C.sphereBX,
    'B 远端',
    state.chargeB,
    Math.abs(state.electronShift),
    state,
    p
  );
  drawStand(ctx, C.sphereAX, '导体 A', p);
  drawStand(ctx, C.sphereBX, '导体 B', p);
  drawGround(ctx, state, p);
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(C.railLeftX, C.trackY);
  ctx.lineTo(C.railRightX, C.trackY);
  ctx.stroke();
  drawBottom(ctx, state, p);
}
export function createElectrostaticInductionView(
  options: CreateElectrostaticInductionViewOptions = {}
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
  function render(state: ElectrostaticInductionState): void {
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
