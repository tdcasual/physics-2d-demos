import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  molecularConstants,
  molecularForces,
  type MolecularState
} from './scene.sim';

export type CreateMolecularViewOptions = {
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
  red: string;
  blue: string;
  teal: string;
  orange: string;
  border: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfcfd',
    panel: '#ffffff',
    ink: '#303744',
    muted: '#7d8997',
    grid: '#e5e9ed',
    axis: '#35404a',
    red: '#ef4050',
    blue: '#3b83a8',
    teal: '#28a995',
    orange: '#f2a15b',
    border: '#d8e0e7'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    ink: '#eef2f7',
    muted: '#aab6c8',
    grid: '#2b3b52',
    axis: '#dbe5ef',
    red: '#fb7185',
    blue: '#60a5fa',
    teal: '#34d399',
    orange: '#f7a55f',
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

function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 12
): void {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function')
    ctx.roundRect(x, y, width, height, radius);
  else ctx.rect(x, y, width, height);
}

function xToPx(value: number): number {
  return (
    molecularConstants.graphLeft +
    ((value - molecularConstants.xMin) /
      (molecularConstants.xMax - molecularConstants.xMin)) *
      (molecularConstants.graphRight - molecularConstants.graphLeft)
  );
}

function forceToY(value: number): number {
  const bounded = Math.max(
    molecularConstants.forceMin,
    Math.min(molecularConstants.forceMax, value)
  );
  return (
    molecularConstants.forceBottom -
    ((bounded - molecularConstants.forceMin) /
      (molecularConstants.forceMax - molecularConstants.forceMin)) *
      (molecularConstants.forceBottom - molecularConstants.forceTop)
  );
}

function energyToY(value: number): number {
  const bounded = Math.max(
    molecularConstants.energyMin,
    Math.min(molecularConstants.energyMax, value)
  );
  return (
    molecularConstants.energyBottom -
    ((bounded - molecularConstants.energyMin) /
      (molecularConstants.energyMax - molecularConstants.energyMin)) *
      (molecularConstants.energyBottom - molecularConstants.energyTop)
  );
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  top: number,
  bottom: number,
  p: Palette
): void {
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (
    let x = molecularConstants.graphLeft;
    x <= molecularConstants.graphRight;
    x += molecularConstants.gridStep
  ) {
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
  }
  for (let y = top; y <= bottom; y += molecularConstants.gridStep) {
    ctx.beginPath();
    ctx.moveTo(molecularConstants.graphLeft, y);
    ctx.lineTo(molecularConstants.graphRight, y);
    ctx.stroke();
  }
}

function drawAxes(
  ctx: CanvasRenderingContext2D,
  top: number,
  bottom: number,
  zeroY: number,
  p: Palette,
  label: string
): void {
  ctx.strokeStyle = p.axis;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(molecularConstants.graphLeft, zeroY);
  ctx.lineTo(molecularConstants.graphRight + 14, zeroY);
  ctx.moveTo(molecularConstants.graphLeft, bottom);
  ctx.lineTo(molecularConstants.graphLeft, top - 10);
  ctx.stroke();
  text(
    ctx,
    label,
    molecularConstants.graphLeft + 6,
    top - 20,
    p.ink,
    15,
    'left',
    700
  );
  text(
    ctx,
    'r / r₀',
    molecularConstants.graphRight + 16,
    zeroY,
    p.ink,
    12,
    'left',
    700
  );
  text(
    ctx,
    '0.6',
    molecularConstants.graphLeft,
    bottom + 16,
    p.muted,
    10,
    'center',
    600
  );
  text(ctx, '1', xToPx(1), bottom + 16, p.muted, 10, 'center', 600);
  text(ctx, '2', xToPx(2), bottom + 16, p.muted, 10, 'center', 600);
  text(
    ctx,
    '3.6',
    molecularConstants.graphRight,
    bottom + 16,
    p.muted,
    10,
    'center',
    600
  );
}

function drawCurve(
  ctx: CanvasRenderingContext2D,
  epsilon: number,
  kind: 'repulsive' | 'attractive' | 'net',
  p: Palette,
  energy = false
): void {
  ctx.strokeStyle = energy
    ? p.teal
    : kind === 'repulsive'
      ? p.red
      : kind === 'attractive'
        ? p.blue
        : p.orange;
  ctx.lineWidth = kind === 'net' ? 4 : 3;
  if (kind !== 'net') ctx.setLineDash([8, 6]);
  ctx.beginPath();
  for (let index = 0; index <= 150; index += 1) {
    const ratio =
      molecularConstants.xMin +
      ((molecularConstants.xMax - molecularConstants.xMin) * index) / 150;
    const values = molecularForces(ratio, epsilon);
    const value = energy
      ? values.potential
      : kind === 'repulsive'
        ? values.repulsive
        : kind === 'attractive'
          ? values.attractive
          : values.net;
    const x = xToPx(ratio);
    const y = energy ? energyToY(value) : forceToY(value);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawGraph(
  ctx: CanvasRenderingContext2D,
  state: MolecularState,
  p: Palette
): void {
  rounded(ctx, 36, 76, 708, 270, 12);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  drawGrid(ctx, molecularConstants.forceTop, molecularConstants.forceBottom, p);
  drawAxes(
    ctx,
    molecularConstants.forceTop,
    molecularConstants.forceBottom,
    molecularConstants.forceZeroY,
    p,
    '分子间作用力 F'
  );
  text(
    ctx,
    'F(斥) +',
    48,
    molecularConstants.forceTop + 18,
    p.red,
    13,
    'left',
    700
  );
  text(
    ctx,
    'F(引) −',
    48,
    molecularConstants.forceBottom - 12,
    p.blue,
    13,
    'left',
    700
  );
  if (state.showRepulsive) drawCurve(ctx, state.epsilon, 'repulsive', p);
  if (state.showAttractive) drawCurve(ctx, state.epsilon, 'attractive', p);
  drawCurve(ctx, state.epsilon, 'net', p);
  const currentX = xToPx(state.distanceRatio);
  ctx.strokeStyle = p.teal;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(currentX, molecularConstants.forceTop);
  ctx.lineTo(currentX, molecularConstants.energyBottom);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = p.teal;
  ctx.beginPath();
  ctx.arc(currentX, forceToY(state.netForce), 6, 0, Math.PI * 2);
  ctx.fill();

  rounded(ctx, 36, 374, 708, 292, 12);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  drawGrid(
    ctx,
    molecularConstants.energyTop,
    molecularConstants.energyBottom,
    p
  );
  drawAxes(
    ctx,
    molecularConstants.energyTop,
    molecularConstants.energyBottom,
    molecularConstants.energyZeroY,
    p,
    '分子势能 Eₚ'
  );
  drawCurve(ctx, state.epsilon, 'net', p, true);
  ctx.fillStyle = p.teal;
  ctx.beginPath();
  ctx.arc(currentX, energyToY(state.potentialEnergy), 6, 0, Math.PI * 2);
  ctx.fill();
  text(
    ctx,
    'r₀（平衡距离）',
    xToPx(1),
    molecularConstants.energyBottom + 42,
    p.muted,
    13,
    'center',
    700
  );
}

function drawAtoms(
  ctx: CanvasRenderingContext2D,
  state: MolecularState,
  p: Palette
): void {
  rounded(
    ctx,
    molecularConstants.panelX,
    molecularConstants.atomCardY,
    molecularConstants.panelWidth,
    molecularConstants.atomCardHeight,
    14
  );
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text(
    ctx,
    '微观物理模型',
    molecularConstants.panelX + 22,
    molecularConstants.atomCardY + 28,
    p.ink,
    17,
    'left',
    700
  );
  const left = molecularConstants.atomLeftX;
  const right = molecularConstants.atomRightX;
  const y = molecularConstants.atomY;
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 4;
  ctx.setLineDash([7, 6]);
  ctx.beginPath();
  ctx.moveTo(left + 36, y);
  ctx.lineTo(right - 36, y);
  ctx.stroke();
  ctx.setLineDash([]);
  const drawAtom = (x: number, color: string) => {
    const gradient = ctx.createRadialGradient(
      x - 9,
      y - 11,
      4,
      x,
      y,
      molecularConstants.atomRadius
    );
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.18, color);
    gradient.addColorStop(1, color);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, molecularConstants.atomRadius, 0, Math.PI * 2);
    ctx.fill();
  };
  drawAtom(left, '#3d4650');
  drawAtom(right, '#168cc1');
  const attraction = state.netForce < 0;
  ctx.strokeStyle = attraction ? p.blue : p.red;
  ctx.fillStyle = attraction ? p.blue : p.red;
  ctx.lineWidth = 3;
  if (attraction) {
    ctx.beginPath();
    ctx.moveTo(left + molecularConstants.atomForceNearGap, y);
    ctx.lineTo(left + molecularConstants.atomForceFarGap, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(left + molecularConstants.atomForceNearGap, y);
    ctx.lineTo(left + molecularConstants.atomForceHeadGap, y - 8);
    ctx.lineTo(left + molecularConstants.atomForceHeadGap, y + 8);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(right - molecularConstants.atomForceNearGap, y);
    ctx.lineTo(right - molecularConstants.atomForceFarGap, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(right - molecularConstants.atomForceNearGap, y);
    ctx.lineTo(right - molecularConstants.atomForceHeadGap, y - 8);
    ctx.lineTo(right - molecularConstants.atomForceHeadGap, y + 8);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(left + molecularConstants.atomRepelNearGap, y);
    ctx.lineTo(left + molecularConstants.atomRepelFarGap, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(left + molecularConstants.atomRepelFarGap, y);
    ctx.lineTo(left + molecularConstants.atomRepelHeadGap, y - 8);
    ctx.lineTo(left + molecularConstants.atomRepelHeadGap, y + 8);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(right - molecularConstants.atomRepelNearGap, y);
    ctx.lineTo(right - molecularConstants.atomRepelFarGap, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(right - molecularConstants.atomRepelFarGap, y);
    ctx.lineTo(right - molecularConstants.atomRepelHeadGap, y - 8);
    ctx.lineTo(right - molecularConstants.atomRepelHeadGap, y + 8);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(left, y + molecularConstants.atomMeasureLineOffset);
  ctx.lineTo(right, y + molecularConstants.atomMeasureLineOffset);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(left, y + molecularConstants.atomMeasureTickOffset);
  ctx.lineTo(left, y + molecularConstants.atomMeasureTickEnd);
  ctx.moveTo(right, y + molecularConstants.atomMeasureTickOffset);
  ctx.lineTo(right, y + molecularConstants.atomMeasureTickEnd);
  ctx.stroke();
  text(
    ctx,
    'r',
    (left + right) / 2,
    y + molecularConstants.atomMeasureLabelOffset,
    p.muted,
    14,
    'center',
    600
  );
  text(
    ctx,
    state.status,
    molecularConstants.panelX + molecularConstants.panelWidth / 2,
    molecularConstants.atomCardY + 140,
    attraction ? p.blue : p.red,
    16,
    'center',
    700
  );
}

function drawCards(
  ctx: CanvasRenderingContext2D,
  state: MolecularState,
  p: Palette
): void {
  rounded(
    ctx,
    molecularConstants.panelX,
    molecularConstants.statusCardY,
    molecularConstants.panelWidth,
    molecularConstants.statusCardHeight,
    12
  );
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text(
    ctx,
    '当前状态',
    molecularConstants.panelX + 20,
    molecularConstants.statusCardY + 25,
    p.muted,
    13,
    'left',
    600
  );
  text(
    ctx,
    state.status,
    molecularConstants.panelX + molecularConstants.panelWidth - 20,
    molecularConstants.statusCardY + 25,
    state.status === '引力主导'
      ? p.blue
      : state.status === '斥力主导'
        ? p.red
        : p.teal,
    17,
    'right',
    700
  );
  text(
    ctx,
    'r = ' + state.distanceRatio.toFixed(2) + ' r₀',
    molecularConstants.panelX + 20,
    molecularConstants.statusCardY + 54,
    p.ink,
    14,
    'left',
    700
  );
  rounded(
    ctx,
    molecularConstants.panelX,
    molecularConstants.readoutCardY,
    molecularConstants.panelWidth,
    molecularConstants.readoutCardHeight,
    12
  );
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text(
    ctx,
    '实时数据',
    molecularConstants.panelX + 20,
    molecularConstants.readoutCardY + 26,
    p.ink,
    15,
    'left',
    700
  );
  text(
    ctx,
    '合力 F（相对）',
    molecularConstants.panelX + 20,
    molecularConstants.readoutCardY + 66,
    p.muted,
    13,
    'left',
    600
  );
  text(
    ctx,
    (state.netForce >= 0 ? '+' : '') + state.netForce.toFixed(2),
    molecularConstants.panelX + molecularConstants.panelWidth - 20,
    molecularConstants.readoutCardY + 66,
    p.orange,
    17,
    'right',
    700
  );
  text(
    ctx,
    '分子势能 Eₚ',
    molecularConstants.panelX + 20,
    molecularConstants.readoutCardY + 104,
    p.muted,
    13,
    'left',
    600
  );
  text(
    ctx,
    state.potentialEnergy.toFixed(2) + ' ε',
    molecularConstants.panelX + molecularConstants.panelWidth - 20,
    molecularConstants.readoutCardY + 104,
    p.teal,
    17,
    'right',
    700
  );
  text(
    ctx,
    '平衡点 r₀',
    molecularConstants.panelX + 20,
    molecularConstants.readoutCardY + 142,
    p.muted,
    13,
    'left',
    600
  );
  text(
    ctx,
    '合力 = 0',
    molecularConstants.panelX + molecularConstants.panelWidth - 20,
    molecularConstants.readoutCardY + 142,
    p.teal,
    15,
    'right',
    700
  );
  rounded(
    ctx,
    molecularConstants.panelX,
    molecularConstants.labelCardY,
    molecularConstants.panelWidth,
    molecularConstants.labelCardHeight,
    12
  );
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text(
    ctx,
    '曲线图例',
    molecularConstants.panelX + 20,
    molecularConstants.labelCardY + 24,
    p.ink,
    15,
    'left',
    700
  );
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(
    molecularConstants.panelX + 24,
    molecularConstants.labelCardY + molecularConstants.legendRowOneOffset
  );
  ctx.lineTo(
    molecularConstants.panelX + molecularConstants.legendFirstEnd,
    molecularConstants.labelCardY + molecularConstants.legendRowOneOffset
  );
  ctx.stroke();
  ctx.setLineDash([]);
  text(
    ctx,
    '斥力 F(斥)',
    molecularConstants.panelX + molecularConstants.legendFirstText,
    molecularConstants.labelCardY + molecularConstants.legendRowOneOffset,
    p.muted,
    13,
    'left',
    600
  );
  ctx.strokeStyle = p.blue;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(
    molecularConstants.panelX + molecularConstants.legendSecondStart,
    molecularConstants.labelCardY + molecularConstants.legendRowOneOffset
  );
  ctx.lineTo(
    molecularConstants.panelX + molecularConstants.legendSecondEnd,
    molecularConstants.labelCardY + molecularConstants.legendRowOneOffset
  );
  ctx.stroke();
  ctx.setLineDash([]);
  text(
    ctx,
    '引力 F(引)',
    molecularConstants.panelX + molecularConstants.legendSecondText,
    molecularConstants.labelCardY + molecularConstants.legendRowOneOffset,
    p.muted,
    13,
    'left',
    600
  );
  ctx.strokeStyle = p.orange;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(
    molecularConstants.panelX + 24,
    molecularConstants.labelCardY + molecularConstants.legendRowTwoOffset
  );
  ctx.lineTo(
    molecularConstants.panelX + molecularConstants.legendFirstEnd,
    molecularConstants.labelCardY + molecularConstants.legendRowTwoOffset
  );
  ctx.stroke();
  text(
    ctx,
    '合力 F(合)',
    molecularConstants.panelX + molecularConstants.legendFirstText,
    molecularConstants.labelCardY + molecularConstants.legendRowTwoOffset,
    p.muted,
    13,
    'left',
    600
  );
  ctx.strokeStyle = p.teal;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(
    molecularConstants.panelX + molecularConstants.legendSecondStart,
    molecularConstants.labelCardY + molecularConstants.legendRowTwoOffset
  );
  ctx.lineTo(
    molecularConstants.panelX + molecularConstants.legendSecondEnd,
    molecularConstants.labelCardY + molecularConstants.legendRowTwoOffset
  );
  ctx.stroke();
  text(
    ctx,
    '势能 Eₚ',
    molecularConstants.panelX + molecularConstants.legendSecondText,
    molecularConstants.labelCardY + molecularConstants.legendRowTwoOffset,
    p.muted,
    13,
    'left',
    600
  );
  rounded(
    ctx,
    molecularConstants.panelX,
    molecularConstants.formulaCardY,
    molecularConstants.panelWidth,
    molecularConstants.formulaCardHeight,
    12
  );
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text(
    ctx,
    '关系式',
    molecularConstants.panelX + 20,
    molecularConstants.formulaCardY + 22,
    p.ink,
    14,
    'left',
    700
  );
  text(
    ctx,
    'F合 = F斥 + F引',
    molecularConstants.panelX + 20,
    molecularConstants.formulaCardY + 52,
    p.muted,
    13,
    'left',
    600
  );
  text(
    ctx,
    'Eₚ = ε[(r₀/r)¹² − 2(r₀/r)⁶]',
    molecularConstants.panelX + 20,
    molecularConstants.formulaCardY + 78,
    p.muted,
    12,
    'left',
    600
  );
}

export function createMolecularView(options: CreateMolecularViewOptions = {}) {
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: {
      mode: 'clamped',
      fallbackWidth: molecularConstants.baseWidth,
      fallbackHeight: molecularConstants.baseHeight
    },
    initialWidth: molecularConstants.baseWidth,
    initialHeight: molecularConstants.baseHeight,
    eagerContext: true
  });
  let snapshot: MolecularState | null = null;
  function draw(state: MolecularState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(
      width / molecularConstants.baseWidth,
      height / molecularConstants.baseHeight
    );
    const offsetX = Math.max(
      0,
      (width - molecularConstants.baseWidth * fit) / 2
    );
    const offsetY = Math.max(
      0,
      (height - molecularConstants.baseHeight * fit) / 2
    );
    const scale = env.contentScale() * stage.responsiveScale;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fit, fit);
    const p = PALETTE[env.theme];
    ctx.fillStyle = p.bg;
    ctx.fillRect(
      0,
      0,
      molecularConstants.baseWidth,
      molecularConstants.baseHeight
    );
    drawGraph(ctx, state, p);
    drawAtoms(ctx, state, p);
    drawCards(ctx, state, p);
    text(
      ctx,
      '拖动曲线上的 r，观察 F 与 Eₚ 联动',
      42,
      molecularConstants.instructionY,
      p.muted,
      13 * scale,
      'left',
      600
    );
    ctx.restore();
  }
  return {
    render(state: MolecularState) {
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
