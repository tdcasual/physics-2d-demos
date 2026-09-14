import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  pendulumEnergyConstants as C,
  type PendulumEnergyState
} from './scene.sim';

export type CreatePendulumEnergyViewOptions = {
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
  border: string;
  blue: string;
  red: string;
  teal: string;
  gold: string;
  soft: string;
};
const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfcfd',
    panel: '#ffffff',
    ink: '#303744',
    muted: '#8190a3',
    grid: '#e5e9ed',
    border: '#d8e0e7',
    blue: '#4382a7',
    red: '#ef4050',
    teal: '#2db3a0',
    gold: '#f2a51b',
    soft: '#f3f6f8'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    ink: '#eef2f7',
    muted: '#aab6c8',
    grid: '#2b3b52',
    border: '#3c4b61',
    blue: '#60a5fa',
    red: '#fb7185',
    teal: '#4dd4c0',
    gold: '#fbbf24',
    soft: '#223249'
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
function round(
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
  width = 3
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (length < 2) return;
  const ux = dx / length;
  const uy = dy / length;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - ux * 12 - uy * 5, y2 - uy * 12 + ux * 5);
  ctx.lineTo(x2 - ux * 12 + uy * 5, y2 - uy * 12 - ux * 5);
  ctx.closePath();
  ctx.fill();
}

function drawGrid(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let x = C.gridStep / 2; x < C.fieldWidth; x += C.gridStep) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, C.baseHeight);
    ctx.stroke();
  }
  for (let y = C.gridStep / 2; y < C.baseHeight; y += C.gridStep) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(C.fieldWidth, y);
    ctx.stroke();
  }
}

function drawPendulum(
  ctx: CanvasRenderingContext2D,
  state: PendulumEnergyState,
  p: Palette
): void {
  const angle = state.angleRad;
  const length = state.length * C.lengthScale;
  const bobX = C.pivotX + Math.sin(angle) * length;
  const bobY = C.pivotY + Math.cos(angle) * length;
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 7]);
  ctx.beginPath();
  ctx.arc(C.pivotX, C.pivotY, C.arcRadius, C.arcStart, C.arcEnd);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(C.pivotX, 0);
  ctx.lineTo(C.pivotX, C.baseHeight);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = p.soft;
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(C.pivotX - C.panelInset, C.pivotY - C.panelInset);
  ctx.lineTo(C.pivotX + C.panelInset, C.pivotY - C.panelInset);
  ctx.lineTo(C.pivotX, C.pivotY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(C.pivotX, C.pivotY);
  ctx.lineTo(bobX, bobY);
  ctx.stroke();
  const gradient = ctx.createRadialGradient(
    bobX - 8,
    bobY - 9,
    4,
    bobX,
    bobY,
    C.bobRadius
  );
  gradient.addColorStop(0, '#ff7c88');
  gradient.addColorStop(1, p.red);
  ctx.fillStyle = gradient;
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(bobX, bobY, C.bobRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const direction = state.velocity >= 0 ? 1 : -1;
  const tangentX =
    direction *
    Math.cos(angle) *
    Math.min(C.arrowScale, state.speed * C.arrowScale);
  const tangentY =
    -direction *
    Math.sin(angle) *
    Math.min(C.arrowScale, state.speed * C.arrowScale);
  arrow(ctx, bobX, bobY, bobX + tangentX, bobY + tangentY, p.teal, 3);
  text(
    ctx,
    `v = ${state.speed.toFixed(2)} m/s`,
    bobX + C.speedLabelOffsetX,
    bobY + C.speedLabelOffsetY,
    p.teal,
    14,
    'left',
    700
  );
  text(
    ctx,
    '重力势能最大',
    C.pivotX - C.arcRadius,
    C.pivotY + C.arcRadius + C.panelInset,
    p.muted,
    13,
    'left',
    600
  );
  text(
    ctx,
    '动能最大',
    C.pivotX - 34,
    C.pivotY + length + C.panelInset,
    p.muted,
    13,
    'center',
    600
  );
}

function drawBar(
  ctx: CanvasRenderingContext2D,
  y: number,
  ratio: number,
  color: string,
  label: string,
  value: string,
  p: Palette
): void {
  text(
    ctx,
    label,
    C.panelX + C.energyLabelX,
    y - C.panelInset,
    p.muted,
    14,
    'left',
    600
  );
  text(
    ctx,
    value,
    C.panelX + C.energyValueX,
    y - C.panelInset,
    color,
    14,
    'right',
    700
  );
  ctx.fillStyle = '#e5e9ed';
  round(ctx, C.panelX + C.barX, y, C.barWidth, C.barHeight, C.barHeight / 2);
  ctx.fill();
  ctx.fillStyle = color;
  round(
    ctx,
    C.panelX + C.barX,
    y,
    C.barWidth * Math.max(0, Math.min(1, ratio)),
    C.barHeight,
    C.barHeight / 2
  );
  ctx.fill();
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: PendulumEnergyState,
  p: Palette
): void {
  ctx.fillStyle = p.panel;
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1;
  round(ctx, C.panelX, 0, C.panelWidth, C.baseHeight, C.panelInset);
  ctx.fill();
  ctx.stroke();
  text(
    ctx,
    '实时状态与能量监控',
    C.panelX + C.panelTitleX,
    C.panelTitleY,
    p.ink,
    20,
    'left',
    700
  );
  text(
    ctx,
    '高中物理',
    C.panelX + C.panelWidth - C.panelTitleX,
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
  round(
    ctx,
    C.panelX + C.panelInset,
    C.panelStatusY,
    C.panelWidth - C.panelInset * 2,
    C.panelStatusHeight,
    C.panelInset
  );
  ctx.fillStyle = p.soft;
  ctx.fill();
  text(
    ctx,
    '实时速度 v',
    C.panelX + C.panelInset * 2,
    C.statusTextY,
    p.muted,
    14,
    'left',
    600
  );
  text(
    ctx,
    `${state.speed.toFixed(2)} m/s`,
    C.panelX + C.panelWidth - C.panelInset * 2,
    C.statusTextY,
    p.teal,
    17,
    'right',
    700
  );
  text(
    ctx,
    '释放角 θ',
    C.panelX + C.panelInset * 2,
    C.statusValueY,
    p.muted,
    14,
    'left',
    600
  );
  text(
    ctx,
    `${state.amplitude.toFixed(0)}°`,
    C.panelX + C.panelWidth - C.panelInset * 2,
    C.statusValueY,
    p.ink,
    17,
    'right',
    700
  );
  round(
    ctx,
    C.panelX + C.panelInset,
    C.panelEnergyY,
    C.panelWidth - C.panelInset * 2,
    C.panelEnergyHeight,
    C.panelInset
  );
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(
    ctx,
    '动态能量条',
    C.panelX + C.panelInset * 2,
    C.panelEnergyY + C.panelInset,
    p.ink,
    16,
    'left',
    700
  );
  const maxEnergy = Math.max(state.initialEnergy, 1e-6);
  drawBar(
    ctx,
    C.panelEnergyY + C.barOneY - C.panelEnergyY,
    state.potentialEnergy / maxEnergy,
    p.blue,
    '重力势能 Eₚ',
    `${state.potentialEnergy.toFixed(3)} J`,
    p
  );
  drawBar(
    ctx,
    C.panelEnergyY + C.barTwoY - C.panelEnergyY,
    state.kineticEnergy / maxEnergy,
    p.red,
    '动能 Eₖ',
    `${state.kineticEnergy.toFixed(3)} J`,
    p
  );
  drawBar(
    ctx,
    C.panelEnergyY + C.barThreeY - C.panelEnergyY,
    state.mechanicalEnergy / maxEnergy,
    state.airDrag ? p.gold : p.teal,
    '机械能',
    `${state.mechanicalEnergy.toFixed(3)} J`,
    p
  );
  round(
    ctx,
    C.panelX + C.panelInset,
    C.panelFormulaY,
    C.panelWidth - C.panelInset * 2,
    C.panelFormulaHeight,
    C.panelInset
  );
  ctx.fillStyle = p.soft;
  ctx.fill();
  text(
    ctx,
    '关系式',
    C.panelX + C.formulaTextX,
    C.panelFormulaTitleY,
    p.muted,
    14,
    'left',
    600
  );
  text(
    ctx,
    'Eₚ = mgh',
    C.panelX + C.formulaTextX,
    C.formulaLineOneY,
    p.ink,
    16,
    'left',
    700
  );
  text(
    ctx,
    'Eₖ = ½mv²',
    C.panelX + C.formulaTextX,
    C.formulaLineTwoY,
    p.ink,
    16,
    'left',
    700
  );
  text(
    ctx,
    'E机械 = Eₚ + Eₖ',
    C.panelX + C.formulaTextX,
    C.formulaLineThreeY,
    p.ink,
    16,
    'left',
    700
  );
  round(
    ctx,
    C.panelX + C.panelInset,
    C.panelHintY,
    C.panelWidth - C.panelInset * 2,
    C.panelHintHeight,
    C.panelInset
  );
  ctx.fillStyle = state.airDrag ? '#fff8e8' : '#eef8f6';
  ctx.fill();
  text(
    ctx,
    state.airDrag ? '空气阻力：机械能缓慢减少' : '理想摆动：机械能守恒',
    C.panelX + C.formulaTextX,
    C.hintTextY,
    state.airDrag ? p.gold : p.teal,
    14,
    'left',
    700
  );
  text(
    ctx,
    '最高点 Eₚ↑，最低点 Eₖ↑',
    C.panelX + C.formulaTextX,
    C.hintSubTextY,
    p.muted,
    13,
    'left',
    600
  );
}

export function createPendulumEnergyView(
  options: CreatePendulumEnergyViewOptions = {}
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
  let snapshot: PendulumEnergyState | null = null;
  function draw(state: PendulumEnergyState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const responsiveScale = stage.responsiveScale;
    const scale =
      Math.min(width / C.baseWidth, height / C.baseHeight) *
      Math.min(1, responsiveScale);
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
      '重力势能与动能转化演示',
      C.fieldWidth / 2,
      C.panelTitleY,
      p.ink,
      21,
      'center',
      700
    );
    drawPendulum(ctx, state, p);
    drawPanel(ctx, state, p);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  return {
    render(state: PendulumEnergyState) {
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
