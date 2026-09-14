import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  areaCoverage,
  shapeGeometry,
  wireLoopFieldConstants as C,
  type WireLoopFieldState,
  type WireLoopShape
} from './scene.sim';

export type CreateWireLoopFieldViewOptions = {
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
  grid: string;
  border: string;
  field: string;
  fieldLine: string;
  wire: string;
  red: string;
  blue: string;
  teal: string;
  gold: string;
  orange: string;
};
const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    panel: '#ffffff',
    soft: '#f4f6f7',
    ink: '#303744',
    muted: '#7d8997',
    grid: '#e3e8ed',
    border: '#d8dfe5',
    field: '#dff2f7',
    fieldLine: '#4fa4eb',
    wire: '#586270',
    red: '#ef4050',
    blue: '#2d82d0',
    teal: '#16a28d',
    gold: '#f2ba1d',
    orange: '#f09b20'
  },
  dark: {
    bg: '#0f1827',
    panel: '#172235',
    soft: '#223249',
    ink: '#eef2f7',
    muted: '#a7b4c7',
    grid: '#2b3b52',
    border: '#3c4d64',
    field: '#17394d',
    fieldLine: '#67b6f0',
    wire: '#ced8e4',
    red: '#ff7180',
    blue: '#70b9f0',
    teal: '#4ed9c0',
    gold: '#fbbf24',
    orange: '#ffb340'
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
  w: number,
  h: number,
  radius = 14
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
}
function arrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width = 4
): void {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - 13 * Math.cos(angle - Math.PI / 6),
    y2 - 13 * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    x2 - 13 * Math.cos(angle + Math.PI / 6),
    y2 - 13 * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
}
function worldX(position: number): number {
  return C.worldOriginX + position * C.positionScale;
}

function shapePath(
  ctx: CanvasRenderingContext2D,
  shape: WireLoopShape,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  ctx.beginPath();
  if (shape === 'rectangle') ctx.rect(x, y, width, height);
  else if (shape === 'triangle') {
    ctx.moveTo(x, y + height);
    ctx.lineTo(x + width / 2, y);
    ctx.lineTo(x + width, y + height);
    ctx.closePath();
  } else if (shape === 'circle')
    ctx.ellipse(
      x + width / 2,
      y + height / 2,
      width / 2,
      height / 2,
      0,
      0,
      Math.PI * 2
    );
  else {
    ctx.moveTo(x, y + height);
    ctx.arc(x + width / 2, y + height, width / 2, Math.PI, 0);
    ctx.closePath();
  }
}

function drawGrid(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let x = C.gridStep / 2; x < C.fieldWidth; x += C.gridStep) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, C.graphTop - 26);
    ctx.stroke();
  }
  for (let y = C.gridStep / 2; y < C.graphTop - 26; y += C.gridStep) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(C.fieldWidth, y);
    ctx.stroke();
  }
}

function drawField(
  ctx: CanvasRenderingContext2D,
  state: WireLoopFieldState,
  p: Palette
): void {
  ctx.fillStyle = `${p.field}aa`;
  ctx.fillRect(
    C.fieldLeft,
    C.fieldTop,
    C.fieldRight - C.fieldLeft,
    C.fieldBottom - C.fieldTop
  );
  ctx.strokeStyle = p.fieldLine;
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(
    C.fieldLeft,
    C.fieldTop,
    C.fieldRight - C.fieldLeft,
    C.fieldBottom - C.fieldTop
  );
  ctx.setLineDash([]);
  for (let x = C.fieldLeft + 48; x < C.fieldRight; x += C.fieldMarkStep)
    for (let y = C.fieldTop + 56; y < C.fieldBottom; y += C.fieldMarkStep) {
      text(
        ctx,
        state.fieldDirection === 'into' ? '×' : '•',
        x,
        y,
        p.fieldLine,
        21,
        'center',
        700
      );
    }
  text(
    ctx,
    '匀强磁场区域 (B)',
    (C.fieldLeft + C.fieldRight) / 2,
    C.fieldTop - 24,
    p.blue,
    18,
    'center',
    700
  );
  text(
    ctx,
    `x = ${C.fieldPhysicalLeft.toFixed(2)} m`,
    C.fieldLeft,
    C.fieldBottom + 26,
    p.muted,
    12,
    'center',
    600
  );
  text(
    ctx,
    `x = ${C.fieldPhysicalRight.toFixed(2)} m`,
    C.fieldRight,
    C.fieldBottom + 26,
    p.muted,
    12,
    'center',
    600
  );
}

function drawLoop(
  ctx: CanvasRenderingContext2D,
  state: WireLoopFieldState,
  p: Palette
): void {
  const geometry = shapeGeometry(state.shape);
  const x = worldX(state.position);
  const width = geometry.width * C.positionScale;
  const height =
    state.shape === 'circle' || state.shape === 'semicircle'
      ? geometry.height * C.positionScale
      : C.loopHeight * C.positionScale;
  const y = C.loopY;
  ctx.save();
  shapePath(ctx, state.shape, x, y, width, height);
  ctx.fillStyle = `${p.gold}44`;
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = `${p.gold}50`;
  ctx.fillRect(
    C.fieldLeft,
    C.fieldTop,
    C.fieldRight - C.fieldLeft,
    C.fieldBottom - C.fieldTop
  );
  ctx.restore();
  shapePath(ctx, state.shape, x, y, width, height);
  ctx.strokeStyle = p.wire;
  ctx.lineWidth = 7;
  ctx.stroke();
  if (state.region === 'entering' || state.region === 'exiting') {
    shapePath(ctx, state.shape, x, y, width, height);
    ctx.strokeStyle = p.red;
    ctx.lineWidth = 3;
    ctx.setLineDash([18, 10]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  const centerX = x + width / 2;
  const centerY =
    state.shape === 'semicircle' ? y + height * 0.66 : y + height / 2;
  if (state.showCurrent && state.currentDirection !== 'none') {
    ctx.strokeStyle = p.red;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(
      centerX,
      centerY,
      Math.min(width, height) * 0.28,
      state.currentDirection === 'clockwise' ? -0.9 : 1.9,
      state.currentDirection === 'clockwise' ? 4.5 : 7.9
    );
    ctx.stroke();
    const a = state.currentDirection === 'clockwise' ? 4.5 : 1.9;
    arrow(
      ctx,
      centerX + Math.cos(a) * Math.min(width, height) * 0.28,
      centerY + Math.sin(a) * Math.min(width, height) * 0.28,
      centerX +
        Math.cos(a + (state.currentDirection === 'clockwise' ? 0.28 : -0.28)) *
          Math.min(width, height) *
          0.28,
      centerY +
        Math.sin(a + (state.currentDirection === 'clockwise' ? 0.28 : -0.28)) *
          Math.min(width, height) *
          0.28,
      p.red,
      3
    );
    text(ctx, 'I感', centerX, centerY, p.red, 16, 'center', 700);
  }
  arrow(
    ctx,
    x + width + 10,
    y + height / 2,
    x + width + 76,
    y + height / 2,
    p.teal,
    4
  );
  text(ctx, 'v', x + width + 89, y + height / 2, p.teal, 17, 'left', 700);
  text(
    ctx,
    `${state.shape === 'rectangle' ? '矩形' : state.shape === 'triangle' ? '三角形' : state.shape === 'circle' ? '圆形' : '半圆形'}线圈`,
    x + width / 2,
    y - 18,
    p.ink,
    14,
    'center',
    700
  );
  if (state.coverage > 0.02)
    text(
      ctx,
      `Φ = ${state.flux.toFixed(3)} Wb`,
      C.fieldRight + 18,
      C.fieldTop + 34,
      p.gold,
      14,
      'left',
      700
    );
}

function graphFrame(
  ctx: CanvasRenderingContext2D,
  x: number,
  title: string,
  color: string,
  p: Palette
): { left: number; right: number; top: number; bottom: number } {
  const left = x + C.graphInsetLeft;
  const right = x + C.graphWidth - C.graphInsetRight;
  const top = C.graphTop + 42;
  const bottom = C.graphBottom;
  text(ctx, title, x + 10, C.graphTitleY, p.ink, 17, 'left', 700);
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1;
  ctx.fillStyle = p.panel;
  ctx.fillRect(x, C.graphTop, C.graphWidth, C.graphBottom - C.graphTop);
  ctx.strokeRect(x, C.graphTop, C.graphWidth, C.graphBottom - C.graphTop);
  ctx.strokeStyle = p.grid;
  for (let i = 1; i < 4; i += 1) {
    const gx = left + ((right - left) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(gx, top);
    ctx.lineTo(gx, bottom);
    ctx.stroke();
  }
  for (let i = 1; i < 4; i += 1) {
    const gy = top + ((bottom - top) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(left, gy);
    ctx.lineTo(right, gy);
    ctx.stroke();
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  return { left, right, top, bottom };
}

function drawGraphs(
  ctx: CanvasRenderingContext2D,
  state: WireLoopFieldState,
  p: Palette
): void {
  const fluxFrame = graphFrame(ctx, C.graphLeft, '磁通量 Φ', p.blue, p);
  const emfFrame = graphFrame(
    ctx,
    C.graphLeft + C.graphWidth + C.graphGap,
    '电动势 E / 电流 I',
    p.orange,
    p
  );
  const geo = shapeGeometry(state.shape);
  const span = C.endPosition - C.startPosition;
  const plot = (
    frame: { left: number; right: number; top: number; bottom: number },
    value: (position: number) => number,
    max: number,
    color: string
  ) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= 72; i += 1) {
      const pos = C.startPosition + (span * i) / 72;
      const ratio = Math.max(0, Math.min(1, value(pos) / max));
      const px =
        frame.left +
        ((pos - C.startPosition) / span) * (frame.right - frame.left);
      const py = frame.bottom - ratio * (frame.bottom - frame.top);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  };
  const maxFlux = Math.max(state.fieldStrength * geo.area, 1e-3);
  plot(
    fluxFrame,
    (position) =>
      state.fieldStrength * geo.area * areaCoverage(state.shape, position),
    maxFlux,
    p.blue
  );
  const maxEmf = Math.max(
    1,
    ((state.fieldStrength * geo.area * state.velocity) / geo.width) * 1.5
  );
  plot(
    emfFrame,
    (position) => {
      const delta = 0.002;
      const derivative =
        (areaCoverage(state.shape, position + delta) -
          areaCoverage(state.shape, position - delta)) /
        (2 * delta);
      return Math.abs(
        state.fieldStrength * geo.area * derivative * state.velocity
      );
    },
    maxEmf,
    p.orange
  );
  const xFlux =
    fluxFrame.left +
    ((state.position - C.startPosition) / span) *
      (fluxFrame.right - fluxFrame.left);
  ctx.fillStyle = p.blue;
  ctx.beginPath();
  ctx.arc(
    Math.max(fluxFrame.left, Math.min(fluxFrame.right, xFlux)),
    fluxFrame.bottom -
      (state.flux / maxFlux) * (fluxFrame.bottom - fluxFrame.top),
    5,
    0,
    Math.PI * 2
  );
  ctx.fill();
  text(
    ctx,
    '位置 x',
    fluxFrame.right,
    fluxFrame.bottom + 17,
    p.muted,
    12,
    'right',
    600
  );
  text(
    ctx,
    `I = ${state.current.toFixed(2)} A`,
    emfFrame.left + 6,
    emfFrame.top + 18,
    p.red,
    13,
    'left',
    700
  );
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: WireLoopFieldState,
  p: Palette
): void {
  ctx.fillStyle = p.panel;
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5;
  rounded(ctx, C.panelX, 0, C.panelWidth, C.baseHeight, 16);
  ctx.fill();
  ctx.stroke();
  text(
    ctx,
    '实时数值看板',
    C.panelX + C.panelInset,
    C.panelTitleY,
    p.ink,
    20,
    'left',
    700
  );
  text(
    ctx,
    '高中物理',
    C.panelX + C.panelWidth - C.panelInset,
    C.panelTitleY,
    p.blue,
    14,
    'right',
    700
  );
  ctx.strokeStyle = p.border;
  ctx.beginPath();
  ctx.moveTo(C.panelX + C.panelInset, C.panelRuleY);
  ctx.lineTo(C.panelX + C.panelWidth - C.panelInset, C.panelRuleY);
  ctx.stroke();
  rounded(
    ctx,
    C.panelX + C.panelInset,
    C.panelStatusY,
    C.panelWidth - C.panelInset * 2,
    C.panelStatusHeight,
    14
  );
  ctx.fillStyle = p.soft;
  ctx.fill();
  text(
    ctx,
    '线圈形状',
    C.panelX + C.panelInset * 2,
    C.panelStatusY + 28,
    p.muted,
    13,
    'left',
    600
  );
  text(
    ctx,
    state.shape === 'rectangle'
      ? '矩形'
      : state.shape === 'triangle'
        ? '三角形'
        : state.shape === 'circle'
          ? '圆形'
          : '半圆形',
    C.panelX + C.panelWidth - C.panelInset * 2,
    C.panelStatusY + 28,
    p.ink,
    16,
    'right',
    700
  );
  text(
    ctx,
    '区域状态',
    C.panelX + C.panelInset * 2,
    C.panelStatusY + 66,
    p.muted,
    13,
    'left',
    600
  );
  text(
    ctx,
    state.region === 'entering'
      ? '切入磁场中'
      : state.region === 'exiting'
        ? '切出磁场中'
        : state.region === 'inside'
          ? '完全在场内'
          : state.region === 'after'
            ? '已离开'
            : '未进入',
    C.panelX + C.panelWidth - C.panelInset * 2,
    C.panelStatusY + 66,
    state.region === 'entering' || state.region === 'exiting' ? p.red : p.teal,
    15,
    'right',
    700
  );
  text(
    ctx,
    `B = ${state.fieldStrength.toFixed(1)} T`,
    C.panelX + C.panelInset * 2,
    C.panelStatusY + 102,
    p.muted,
    13,
    'left',
    600
  );
  text(
    ctx,
    `${state.fieldDirection === 'into' ? '⊗ 里' : '⊙ 外'}`,
    C.panelX + C.panelWidth - C.panelInset * 2,
    C.panelStatusY + 102,
    p.blue,
    15,
    'right',
    700
  );
  rounded(
    ctx,
    C.panelX + C.panelInset,
    C.panelDataY,
    C.panelWidth - C.panelInset * 2,
    C.panelDataHeight,
    14
  );
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(
    ctx,
    '磁通量与感应量',
    C.panelX + C.panelInset * 2,
    C.panelDataY + 27,
    p.ink,
    16,
    'left',
    700
  );
  const rows: Array<[string, string, string]> = [
    ['磁通量 Φ', `${state.flux.toFixed(3)} Wb`, p.blue],
    ['电动势 E', `${state.emf.toFixed(2)} V`, p.orange],
    ['感应电流 I', `${state.current.toFixed(2)} A`, p.red],
    ['安培力 F安', `${state.magneticForce.toFixed(2)} N`, p.teal]
  ];
  rows.forEach(([label, value, color], index) => {
    const y = C.panelDataY + 65 + index * 31;
    text(ctx, label, C.panelX + C.panelInset * 2, y, p.muted, 13, 'left', 600);
    text(
      ctx,
      value,
      C.panelX + C.panelWidth - C.panelInset * 2,
      y,
      color,
      15,
      'right',
      700
    );
  });
  rounded(
    ctx,
    C.panelX + C.panelInset,
    C.panelFormulaY,
    C.panelWidth - C.panelInset * 2,
    C.panelFormulaHeight,
    14
  );
  ctx.fillStyle = '#fff5f3';
  ctx.fill();
  text(
    ctx,
    '关系式',
    C.panelX + C.panelInset * 2,
    C.panelFormulaY + 28,
    p.red,
    14,
    'left',
    700
  );
  text(
    ctx,
    'Φ = B · S',
    C.panelX + C.panelInset * 2,
    C.panelFormulaY + 61,
    p.ink,
    15,
    'left',
    700
  );
  text(
    ctx,
    'E = B · L等效 · v',
    C.panelX + C.panelInset * 2,
    C.panelFormulaY + 94,
    p.ink,
    15,
    'left',
    700
  );
  text(
    ctx,
    'I = E / R',
    C.panelX + C.panelInset * 2,
    C.panelFormulaY + 127,
    p.ink,
    15,
    'left',
    700
  );
  rounded(
    ctx,
    C.panelX + C.panelInset,
    C.panelHintY,
    C.panelWidth - C.panelInset * 2,
    C.panelHintHeight,
    14
  );
  ctx.fillStyle = '#eef8f6';
  ctx.fill();
  text(
    ctx,
    state.region === 'inside'
      ? '匀强场内：Φ 不变，E = 0'
      : state.region === 'entering' || state.region === 'exiting'
        ? '边界切割：产生感应电流'
        : '移动线框，观察 Φ—E 联动',
    C.panelX + C.panelInset * 2,
    C.panelHintY + 31,
    p.teal,
    14,
    'left',
    700
  );
  text(
    ctx,
    state.currentDirection === 'none'
      ? '电流方向：—'
      : `电流方向：${state.currentDirection === 'clockwise' ? '顺时针' : '逆时针'}`,
    C.panelX + C.panelInset * 2,
    C.panelHintY + 65,
    p.muted,
    13,
    'left',
    600
  );
}

export function createWireLoopFieldView(
  options: CreateWireLoopFieldViewOptions = {}
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
  let snapshot: WireLoopFieldState | null = null;
  function draw(state: WireLoopFieldState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const scale =
      Math.min(width / C.baseWidth, height / C.baseHeight) *
      Math.min(1, stage.responsiveScale);
    const offsetX = (width - C.baseWidth * scale) / 2;
    const offsetY = (height - C.baseHeight * scale) / 2;
    const p = PALETTE[env.theme];
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
    ctx.clearRect(0, 0, C.baseWidth, C.baseHeight);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, C.baseWidth, C.baseHeight);
    drawGrid(ctx, p);
    text(
      ctx,
      '线框穿过有界匀强磁场',
      C.fieldWidth / 2,
      36,
      p.ink,
      22,
      'center',
      700
    );
    drawField(ctx, state, p);
    drawLoop(ctx, state, p);
    drawGraphs(ctx, state, p);
    drawPanel(ctx, state, p);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  return {
    render(state: WireLoopFieldState) {
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
