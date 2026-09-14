import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { locomotiveConstants as C, type LocomotiveState } from './scene.sim';

export type CreateLocomotiveViewOptions = {
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
  red: string;
  orange: string;
  teal: string;
  blue: string;
  yellow: string;
  rail: string;
};
const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfcfd',
    panel: '#ffffff',
    soft: '#f2f5f7',
    ink: '#303744',
    muted: '#7d8997',
    grid: '#e4e9ed',
    border: '#d8dfe5',
    red: '#ef4050',
    orange: '#f39b1f',
    teal: '#16a28d',
    blue: '#4382a7',
    yellow: '#f4b323',
    rail: '#586270'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    soft: '#223249',
    ink: '#eef2f7',
    muted: '#aab6c8',
    grid: '#2d3c52',
    border: '#3d4e65',
    red: '#fb7185',
    orange: '#ffb340',
    teal: '#4dd4c0',
    blue: '#70b9f0',
    yellow: '#fbbf24',
    rail: '#d0d9e5'
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
function drawGrid(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let x = 0; x < C.fieldWidth; x += 62) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, C.graphY - 22);
    ctx.stroke();
  }
  for (let y = 0; y < C.graphY - 22; y += 62) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(C.fieldWidth, y);
    ctx.stroke();
  }
}
function drawTrain(
  ctx: CanvasRenderingContext2D,
  state: LocomotiveState,
  p: Palette
): void {
  const x = C.trainStartX + Math.min(580, state.displacement * C.trainScale);
  const y = C.trainY;
  ctx.strokeStyle = p.rail;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, C.trainTrackY + 26);
  ctx.lineTo(C.fieldWidth, C.trainTrackY + 26);
  ctx.stroke();
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 3;
  for (let railX = 20; railX < C.fieldWidth; railX += 86) {
    ctx.beginPath();
    ctx.moveTo(railX, C.trainTrackY + 39);
    ctx.lineTo(railX + 30, C.trainTrackY + 39);
    ctx.stroke();
  }
  ctx.fillStyle = '#6d879b';
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 3;
  rounded(ctx, x, y, C.trainBodyWidth, C.trainBodyHeight, 12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = p.soft;
  ctx.fillRect(
    x + C.trainWindowInset,
    y + 12,
    C.trainWindowWidth,
    C.trainWindowHeight
  );
  ctx.fillRect(
    x + C.trainSecondWindowX,
    y + 12,
    C.trainWindowWidth,
    C.trainWindowHeight
  );
  ctx.fillStyle = p.ink;
  ctx.fillRect(
    x + C.trainCabinX,
    y + 12,
    C.trainCabinWidth,
    C.trainWindowHeight
  );
  ctx.fillStyle = p.rail;
  ctx.beginPath();
  ctx.arc(x + C.wheelFrontX, C.trainTrackY, 18, 0, Math.PI * 2);
  ctx.arc(x + C.wheelRearX, C.trainTrackY, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const tractionLength = Math.min(170, Math.max(40, state.tractionForce / 35));
  const dragLength = Math.min(110, Math.max(34, state.dragForce / 20));
  arrow(ctx, x + 68, y - 24, x + 68 + tractionLength, y - 24, p.yellow, 6);
  text(ctx, 'F牵', x + 78 + tractionLength, y - 24, p.yellow, 17, 'left', 700);
  arrow(ctx, x + 24, y + 88, x + 24 - dragLength, y + 88, p.red, 5);
  text(ctx, 'f', x - dragLength - 12, y + 88, p.red, 17, 'right', 700);
  arrow(ctx, x + 160, y + 8, x + 226, y + 8, p.teal, 4);
  text(ctx, 'v', x + 238, y + 8, p.teal, 17, 'left', 700);
  text(ctx, '微观受力演变', 32, 34, p.ink, 22, 'left', 700);
  text(
    ctx,
    state.mode === 'power' ? 'P恒定' : 'a恒定',
    760,
    34,
    state.mode === 'power' ? p.yellow : p.orange,
    16,
    'right',
    700
  );
}
function graphFrame(
  ctx: CanvasRenderingContext2D,
  p: Palette
): { left: number; right: number; top: number; bottom: number } {
  const left = C.graphX + C.graphInsetLeft;
  const right = C.graphX + C.graphWidth - C.graphInsetRight;
  const top = C.graphY + C.graphInsetTop;
  const bottom = C.graphY + C.graphHeight - C.graphInsetBottom;
  ctx.fillStyle = p.panel;
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5;
  ctx.fillRect(C.graphX, C.graphY, C.graphWidth, C.graphHeight);
  ctx.strokeRect(C.graphX, C.graphY, C.graphWidth, C.graphHeight);
  ctx.strokeStyle = p.grid;
  for (let i = 1; i < 8; i += 1) {
    const gx = left + ((right - left) * i) / 8;
    ctx.beginPath();
    ctx.moveTo(gx, top);
    ctx.lineTo(gx, bottom);
    ctx.stroke();
  }
  for (let i = 1; i < 6; i += 1) {
    const gy = top + ((bottom - top) * i) / 6;
    ctx.beginPath();
    ctx.moveTo(left, gy);
    ctx.lineTo(right, gy);
    ctx.stroke();
  }
  text(
    ctx,
    '宏观运动特征曲线（v-t）',
    C.graphX + 26,
    C.graphY + 27,
    p.ink,
    20,
    'left',
    700
  );
  text(ctx, 'v (m/s)', left - 12, top - 18, p.muted, 14, 'right', 600);
  text(ctx, 't (s)', right + 16, bottom + 3, p.muted, 14, 'left', 600);
  return { left, right, top, bottom };
}
function drawGraph(
  ctx: CanvasRenderingContext2D,
  state: LocomotiveState,
  p: Palette
): void {
  const frame = graphFrame(ctx, p);
  const xFor = (time: number) =>
    frame.left + (time / C.graphTimeMax) * (frame.right - frame.left);
  const yFor = (speed: number) =>
    frame.bottom -
    (Math.max(0, Math.min(C.graphSpeedMax, speed)) / C.graphSpeedMax) *
      (frame.bottom - frame.top);
  ctx.strokeStyle = p.teal;
  ctx.lineWidth = 3;
  ctx.beginPath();
  state.history.forEach((point, index) => {
    const x = xFor(point.time);
    const y = yFor(point.velocity);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  const currentX = xFor(state.time);
  const currentY = yFor(state.velocity);
  ctx.fillStyle = `${p.red}2a`;
  ctx.beginPath();
  ctx.moveTo(frame.left, frame.bottom);
  state.history.forEach((point) => {
    if (point.time <= state.time)
      ctx.lineTo(xFor(point.time), yFor(point.velocity));
  });
  ctx.lineTo(currentX, frame.bottom);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = p.orange;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(
    currentX - C.tangentHalfWidth,
    currentY + state.accelerationNow * 18
  );
  ctx.lineTo(
    currentX + C.tangentHalfWidth,
    currentY - state.accelerationNow * 18
  );
  ctx.stroke();
  ctx.fillStyle = p.red;
  ctx.beginPath();
  ctx.arc(currentX, currentY, 7, 0, Math.PI * 2);
  ctx.fill();
  text(
    ctx,
    `斜率 = a = ${state.accelerationNow.toFixed(2)} m/s²`,
    Math.min(frame.right - 16, currentX + 18),
    Math.max(frame.top + 18, currentY - 30),
    p.orange,
    14,
    'left',
    700
  );
  if (state.mode === 'power') {
    const terminalY = yFor(state.terminalSpeed);
    ctx.strokeStyle = p.teal;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(frame.left, terminalY);
    ctx.lineTo(frame.right, terminalY);
    ctx.stroke();
    ctx.setLineDash([]);
    text(
      ctx,
      `vₘ = ${state.terminalSpeed.toFixed(1)} m/s`,
      frame.left + 10,
      terminalY - 16,
      p.teal,
      14,
      'left',
      700
    );
  }
}
function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: LocomotiveState,
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
    '机车启动系统验证',
    C.panelX + C.panelWidth / 2,
    C.panelTitleY,
    p.ink,
    20,
    'center',
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
    C.panelModeY,
    C.panelWidth - C.panelInset * 2,
    C.panelModeHeight,
    14
  );
  ctx.fillStyle = p.soft;
  ctx.fill();
  text(
    ctx,
    state.mode === 'power' ? '恒功率启动' : '恒加速度启动',
    C.panelX + C.panelWidth / 2,
    C.panelModeY + 36,
    state.mode === 'power' ? p.yellow : p.orange,
    18,
    'center',
    700
  );
  rounded(
    ctx,
    C.panelX + C.panelInset,
    C.panelReadoutY,
    C.panelWidth - C.panelInset * 2,
    C.panelReadoutHeight,
    14
  );
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  const rows: Array<[string, string, string]> = [
    [
      '理论最大速度 vₘ',
      Number.isFinite(state.terminalSpeed)
        ? `${state.terminalSpeed.toFixed(1)} m/s`
        : '—',
      p.teal
    ],
    ['当前速度 v', `${state.velocity.toFixed(1)} m/s`, p.teal],
    ['实际功率 P', `${state.actualPower.toFixed(1)} kW`, p.yellow],
    ['牵引力 F', `${(state.tractionForce / 1000).toFixed(2)} kN`, p.red],
    ['瞬时加速度 a', `${state.accelerationNow.toFixed(2)} m/s²`, p.orange]
  ];
  rows.forEach(([label, value, color], index) => {
    const y = C.panelReadoutY + 34 + index * 36;
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
  ctx.fillStyle = p.soft;
  ctx.fill();
  text(
    ctx,
    '关系式',
    C.panelX + C.panelInset * 2,
    C.panelFormulaY + 26,
    p.ink,
    14,
    'left',
    700
  );
  text(
    ctx,
    'P = F · v',
    C.panelX + C.panelInset * 2,
    C.panelFormulaY + 60,
    p.ink,
    16,
    'left',
    700
  );
  text(
    ctx,
    'F合 = F − f',
    C.panelX + C.panelInset * 2,
    C.panelFormulaY + 94,
    p.ink,
    16,
    'left',
    700
  );
  text(
    ctx,
    'a = F合 / m',
    C.panelX + C.panelInset * 2,
    C.panelFormulaY + 128,
    p.ink,
    16,
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
  ctx.fillStyle = '#fff8e8';
  ctx.fill();
  text(
    ctx,
    state.mode === 'power'
      ? '恒功率：v↑，F↓，a↓'
      : '恒加速度：a 不变，P 随 v 增大',
    C.panelX + C.panelInset * 2,
    C.panelHintY + 34,
    state.mode === 'power' ? p.yellow : p.orange,
    14,
    'left',
    700
  );
  text(
    ctx,
    `阻力 f = ${state.dragForce.toFixed(0)} N`,
    C.panelX + C.panelInset * 2,
    C.panelHintY + 70,
    p.muted,
    13,
    'left',
    600
  );
}

export function createLocomotiveView(
  options: CreateLocomotiveViewOptions = {}
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
  let snapshot: LocomotiveState | null = null;
  function draw(state: LocomotiveState): void {
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
    drawTrain(ctx, state, p);
    drawGraph(ctx, state, p);
    drawPanel(ctx, state, p);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  return {
    render(state: LocomotiveState) {
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
