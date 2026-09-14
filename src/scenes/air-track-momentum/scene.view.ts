import { getRenderTokens } from '../../platform/standards';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  airTrackMomentumConstants as C,
  type AirTrackMomentumState
} from './scene.sim';

export type CreateAirTrackMomentumViewOptions = {
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
  rail: string;
  red: string;
  blue: string;
  teal: string;
  gold: string;
  purple: string;
  grid: string;
};
const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    panel: '#ffffff',
    soft: '#f1f3f4',
    ink: '#303744',
    muted: '#7d8997',
    border: '#d8dfe5',
    rail: '#56616d',
    red: '#ef4050',
    blue: '#2785d0',
    teal: '#16a28d',
    gold: '#efab1e',
    purple: '#6548df',
    grid: '#e6e9e7'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    soft: '#253249',
    ink: '#eef2f7',
    muted: '#a8b4c5',
    border: '#3e4d64',
    rail: '#c2cedc',
    red: '#ff707c',
    blue: '#65b6ef',
    teal: '#4ed9c0',
    gold: '#fbbf24',
    purple: '#a99bff',
    grid: '#2a394d'
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
  const head = 11;
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
    x2 - head * Math.cos(angle - Math.PI / 6),
    y2 - head * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    x2 - head * Math.cos(angle + Math.PI / 6),
    y2 - head * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
}
function drawGrid(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, C.baseWidth, C.baseHeight);
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let x = 28; x < C.baseWidth; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, C.baseHeight);
    ctx.stroke();
  }
  for (let y = 28; y < C.baseHeight; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(C.baseWidth, y);
    ctx.stroke();
  }
}
function drawFormula(
  ctx: CanvasRenderingContext2D,
  state: AirTrackMomentumState,
  p: Palette
): void {
  rounded(ctx, C.formulaX, C.formulaY, C.formulaWidth, C.formulaHeight, 14);
  ctx.fillStyle = `${p.soft}f0`;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(
    ctx,
    '物理公式 live',
    C.formulaX + 22,
    C.formulaY + 28,
    p.ink,
    20,
    'left',
    700
  );
  const signA = state.velocityA >= 0 ? '+' : '−';
  const signB = state.velocityB >= 0 ? '+' : '−';
  text(
    ctx,
    `p总 = mA vA + mB vB`,
    C.formulaX + 22,
    C.formulaY + 58,
    p.ink,
    16,
    'left',
    600
  );
  text(
    ctx,
    `(${state.massA.toFixed(1)} × ${signA}${Math.abs(state.velocityA).toFixed(2)}) ${signB} ${state.massB.toFixed(1)} × ${Math.abs(state.velocityB).toFixed(2)} = ${state.totalMomentum.toFixed(2)} kg·m/s`,
    C.formulaX + 22,
    C.formulaY + 84,
    p.teal,
    14,
    'left',
    700
  );
}
function trackX(meter: number): number {
  return C.trackLeft + meter * C.trackScale;
}
function drawTrack(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.strokeStyle = p.rail;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(C.trackLeft, C.trackY);
  ctx.lineTo(C.trackRight, C.trackY);
  ctx.stroke();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  for (let meter = C.meterStart; meter <= C.meterEnd; meter += 1) {
    const x = trackX(meter);
    ctx.beginPath();
    ctx.moveTo(x, C.trackY - 18);
    ctx.lineTo(x, C.trackY + 18);
    ctx.stroke();
    text(ctx, `${meter / 1}.0 m`, x, C.trackY + 30, p.muted, 12, 'center', 600);
    for (let tick = 1; tick < 5; tick += 1) {
      const sub = x + tick * 36;
      ctx.beginPath();
      ctx.moveTo(sub, C.trackY - 8);
      ctx.lineTo(sub, C.trackY + 8);
      ctx.stroke();
    }
  }
  ctx.fillStyle = p.muted;
  ctx.beginPath();
  ctx.roundRect(C.trackLeft - 34, C.trackY + 20, 18, 22, 4);
  ctx.fill();
  text(
    ctx,
    '气源输入',
    C.trackLeft - 16,
    C.trackY + 62,
    p.muted,
    14,
    'left',
    600
  );
}
function gateReading(meter: number, state: AirTrackMomentumState): string {
  const speed =
    Math.abs(state.velocityA) > 0.05
      ? Math.abs(state.velocityA)
      : Math.abs(state.velocityB);
  const origin = Math.abs(state.velocityA) > 0.05 ? C.cartStartA : C.cartStartB;
  const crossing = speed > 0.05 ? Math.abs(meter - origin) / speed : Infinity;
  return state.time >= crossing ? crossing.toFixed(4) : '0.0000';
}
function drawPhotogate(
  ctx: CanvasRenderingContext2D,
  meter: number,
  label: string,
  p: Palette,
  state: AirTrackMomentumState
): void {
  const x = trackX(meter);
  ctx.strokeStyle = p.rail;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(x, C.trackY);
  ctx.lineTo(x, C.gateTop + C.gateHeight);
  ctx.moveTo(x + 38, C.trackY);
  ctx.lineTo(x + 38, C.gateTop + C.gateHeight);
  ctx.stroke();
  ctx.fillStyle = p.rail;
  ctx.fillRect(x - 6, C.gateTop, 50, 26);
  ctx.fillStyle = '#202935';
  ctx.fillRect(x - 2, C.gateTop + 5, 42, 16);
  ctx.fillStyle = p.teal;
  ctx.beginPath();
  ctx.arc(x + 19, C.gateTop + 13, 5, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, label, x + 19, C.gateTop - 17, p.ink, 15, 'center', 700);
  text(
    ctx,
    `${gateReading(meter, state)} s`,
    x + 19,
    C.gateTop + 42,
    p.blue,
    14,
    'center',
    700
  );
}
function drawCart(
  ctx: CanvasRenderingContext2D,
  xMeter: number,
  velocity: number,
  mass: number,
  color: string,
  label: string,
  p: Palette,
  state: AirTrackMomentumState
): void {
  const cx = trackX(xMeter);
  const top = C.trackY - C.cartHeight;
  rounded(ctx, cx - C.cartWidth / 2, top, C.cartWidth, C.cartHeight, 7);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = p.rail;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = C.baseHeight > 200 ? p.gold : p.gold;
  ctx.beginPath();
  ctx.arc(cx - 32, C.trackY + 1, C.wheelRadius, 0, Math.PI * 2);
  ctx.arc(cx + 32, C.trackY + 1, C.wheelRadius, 0, Math.PI * 2);
  ctx.fill();
  text(
    ctx,
    `${mass.toFixed(1)} kg`,
    cx,
    top + 27,
    '#ffffff',
    15,
    'center',
    700
  );
  text(ctx, label, cx, top - 18, color, 13, 'center', 700);
  if (!state.showVectors || Math.abs(velocity) < 0.02) return;
  const length = Math.min(96, Math.max(30, Math.abs(velocity) * C.vectorScale));
  arrow(
    ctx,
    cx,
    top - 38,
    cx + Math.sign(velocity) * length,
    top - 38,
    color,
    4
  );
  text(
    ctx,
    `v ${velocity >= 0 ? '+' : ''}${velocity.toFixed(2)}`,
    cx + Math.sign(velocity) * (length + 18),
    top - 38,
    color,
    13,
    velocity >= 0 ? 'left' : 'right',
    700
  );
}
function drawCollision(
  ctx: CanvasRenderingContext2D,
  state: AirTrackMomentumState,
  p: Palette
): void {
  if (state.contactProgress <= 0 || state.contactProgress >= 1) return;
  const x = trackX((state.xA + state.xB) / 2);
  ctx.strokeStyle = p.gold;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(x - 20, C.trackY - 28);
  for (let index = 0; index < 6; index += 1) {
    const px = x - 20 + index * 8;
    const py = C.trackY - 28 + (index % 2 === 0 ? -12 : 12);
    ctx.lineTo(px, py);
  }
  ctx.stroke();
  text(ctx, '接触', x, C.trackY - 100, p.gold, 15, 'center', 700);
}
function drawData(
  ctx: CanvasRenderingContext2D,
  state: AirTrackMomentumState,
  p: Palette
): void {
  rounded(ctx, C.graphX, C.graphY, C.graphWidth, C.graphHeight, 12);
  ctx.fillStyle = `${p.panel}e8`;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  if (state.mode === 'theorem') {
    text(
      ctx,
      '冲量—时间',
      C.graphX + 18,
      C.graphY + 24,
      p.ink,
      16,
      'left',
      700
    );
    ctx.strokeStyle = p.grid;
    ctx.lineWidth = 1;
    for (let x = C.graphLeft; x <= C.graphRight; x += 70) {
      ctx.beginPath();
      ctx.moveTo(x, C.graphTop);
      ctx.lineTo(x, C.graphBottom);
      ctx.stroke();
    }
    for (let y = C.graphTop; y <= C.graphBottom; y += 29) {
      ctx.beginPath();
      ctx.moveTo(C.graphLeft, y);
      ctx.lineTo(C.graphRight, y);
      ctx.stroke();
    }
    ctx.strokeStyle = p.red;
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let index = 0; index <= 80; index += 1) {
      const ratio = index / 80;
      const force = Math.sin(Math.PI * ratio);
      const x = C.graphLeft + ratio * (C.graphRight - C.graphLeft);
      const y = C.graphBottom - force * (C.graphBottom - C.graphTop) * 0.82;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    text(
      ctx,
      `F(t) = ${state.force.toFixed(1)} N`,
      C.graphRight - 8,
      C.graphTop + 18,
      p.red,
      13,
      'right',
      700
    );
    text(
      ctx,
      `J = Δp = ${state.impulse.toFixed(2)} N·s`,
      C.graphX + 18,
      C.graphY + C.graphHeight - 22,
      p.teal,
      14,
      'left',
      700
    );
  } else {
    text(
      ctx,
      '动量守恒核对',
      C.graphX + 18,
      C.graphY + 24,
      p.ink,
      16,
      'left',
      700
    );
    text(
      ctx,
      `碰撞前  ${state.totalMomentum.toFixed(2)} kg·m/s`,
      C.graphX + 30,
      C.graphY + 70,
      p.red,
      16,
      'left',
      700
    );
    text(
      ctx,
      `碰撞后  ${state.totalMomentumAfter.toFixed(2)} kg·m/s`,
      C.graphX + 30,
      C.graphY + 110,
      p.blue,
      16,
      'left',
      700
    );
    const delta = Math.abs(state.totalMomentum - state.totalMomentumAfter);
    text(
      ctx,
      `差值  ${delta.toFixed(2)} kg·m/s`,
      C.graphX + 30,
      C.graphY + 150,
      delta < 0.01 ? p.teal : p.gold,
      15,
      'left',
      700
    );
  }
}
function drawScene(
  ctx: CanvasRenderingContext2D,
  state: AirTrackMomentumState,
  p: Palette
): void {
  drawGrid(ctx, p);
  drawFormula(ctx, state, p);
  drawTrack(ctx, p);
  drawPhotogate(ctx, C.photogateA, '光电门 1', p, state);
  drawPhotogate(ctx, C.photogateB, '光电门 2', p, state);
  drawCart(ctx, state.xA, state.vA, state.massA, p.red, 'A', p, state);
  drawCart(ctx, state.xB, state.vB, state.massB, p.blue, 'B', p, state);
  drawCollision(ctx, state, p);
  if (state.mode === 'theorem') {
    ctx.strokeStyle = p.gold;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(C.trackRight - C.springLength, C.trackY - 2);
    ctx.lineTo(C.trackRight - 12, C.trackY - 2);
    ctx.stroke();
    text(
      ctx,
      '缓冲弹簧',
      C.trackRight - C.springLength,
      C.trackY - 32,
      p.gold,
      13,
      'center',
      700
    );
  }
  drawData(ctx, state, p);
  text(
    ctx,
    `状态：${state.status}`,
    C.baseWidth - 30,
    C.baseHeight - 22,
    p.teal,
    14,
    'right',
    700
  );
}

export function createAirTrackMomentumView(
  options: CreateAirTrackMomentumViewOptions = {}
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
  function render(state: AirTrackMomentumState): void {
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
    text(
      ctx,
      `t = ${state.time.toFixed(2)} s`,
      C.baseWidth - 30,
      32,
      PALETTE[env.theme].muted,
      getRenderTokens(scale).controlFontPx / scale,
      'right',
      600
    );
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
