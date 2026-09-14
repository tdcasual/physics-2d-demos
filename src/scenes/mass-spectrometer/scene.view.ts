import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  massSpectrometerConstants as C,
  type MassSpectrometerParticle,
  type MassSpectrometerState
} from './scene.sim';

export type CreateMassSpectrometerViewOptions = {
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
  fieldMark: string;
  red: string;
  teal: string;
  blue: string;
  gold: string;
  orange: string;
  plate: string;
  rail: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfcfd',
    panel: '#ffffff',
    soft: '#f2f5f7',
    ink: '#303744',
    muted: '#7d8997',
    grid: '#e3e8ed',
    border: '#d8dfe5',
    field: '#f1f7fa',
    fieldMark: '#c5d0da',
    red: '#ef4050',
    teal: '#16a28d',
    blue: '#2585b7',
    gold: '#f2b51d',
    orange: '#f09b20',
    plate: '#e83c4c',
    rail: '#4a5464'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    soft: '#223249',
    ink: '#eef2f7',
    muted: '#aab6c8',
    grid: '#2d3c52',
    border: '#3d4e65',
    field: '#17394d',
    fieldMark: '#587184',
    red: '#fb7185',
    teal: '#4dd4c0',
    blue: '#70b9f0',
    gold: '#fbbf24',
    orange: '#ffb340',
    plate: '#fb7185',
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
  width = 3
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
    x2 - 11 * Math.cos(angle - Math.PI / 6),
    y2 - 11 * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    x2 - 11 * Math.cos(angle + Math.PI / 6),
    y2 - 11 * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
}

function drawGrid(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let x = C.gridStep / 2; x < C.fieldWidth; x += C.gridStep) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, C.baselineY - 18);
    ctx.stroke();
  }
  for (let y = C.gridStep / 2; y < C.baselineY - 18; y += C.gridStep) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(C.fieldWidth, y);
    ctx.stroke();
  }
}

function drawAcceleration(
  ctx: CanvasRenderingContext2D,
  state: MassSpectrometerState,
  p: Palette
): void {
  rounded(ctx, C.sourceX - 54, C.sourceY - 44, 108, 56, 10);
  ctx.fillStyle = p.soft;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, '离子源', C.sourceX, C.sourceY - 16, p.ink, 16, 'center', 700);

  ctx.fillStyle = p.plate;
  ctx.fillRect(C.plateLeft, C.plateTop, C.plateRight - C.plateLeft, 12);
  ctx.fillRect(C.plateLeft, C.plateBottom - 12, C.plateRight - C.plateLeft, 12);
  text(ctx, '+', C.plateLeft - 22, C.plateTop + 6, p.red, 26, 'center', 700);
  text(
    ctx,
    '−',
    C.plateRight + 22,
    C.plateBottom - 6,
    p.blue,
    26,
    'center',
    700
  );
  ctx.strokeStyle = `${p.red}88`;
  ctx.setLineDash([7, 8]);
  for (let x = C.plateLeft + 42; x < C.plateRight; x += 48) {
    arrow(ctx, x, C.plateTop + 24, x, C.plateBottom - 25, `${p.red}aa`, 2);
  }
  ctx.setLineDash([]);
  text(
    ctx,
    `加速电压 U = ${state.voltage.toFixed(0)} V`,
    C.plateRight + 46,
    186,
    p.red,
    15,
    'left',
    700
  );
  text(ctx, '电场加速', C.plateRight + 46, 212, p.muted, 13, 'left', 600);

  state.particles.forEach((particle) => {
    const visible =
      (particle.key === 'protium' && state.showProtium) ||
      (particle.key === 'deuterium' && state.showDeuterium) ||
      (particle.key === 'tritium' && state.showTritium);
    if (!visible || particle.progress > C.sourcePhaseEnd) return;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, C.particleRadius, 0, Math.PI * 2);
    ctx.fill();
  });
  arrow(
    ctx,
    C.entryX,
    C.plateBottom + 22,
    C.entryX,
    C.baselineY - 10,
    p.teal,
    4
  );
  text(ctx, 'v', C.entryX + 14, C.baselineY - 22, p.teal, 16, 'left', 700);
}

function drawField(
  ctx: CanvasRenderingContext2D,
  state: MassSpectrometerState,
  p: Palette
): void {
  ctx.fillStyle = p.field;
  ctx.fillRect(0, C.fieldTop, C.fieldWidth, C.baseHeight - C.fieldTop);
  ctx.strokeStyle = p.fieldMark;
  ctx.lineWidth = 1.5;
  for (let x = 22; x < C.fieldWidth; x += C.fieldMarkStep) {
    for (let y = C.fieldTop + 38; y < C.baseHeight; y += C.fieldMarkStep) {
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.stroke();
      text(ctx, '×', x, y, p.fieldMark, 16, 'center', 700);
    }
  }
  ctx.fillStyle = p.rail;
  ctx.fillRect(0, C.baselineY - 5, C.fieldWidth, 10);
  text(ctx, '狭缝', C.entryX - 4, C.baselineY - 16, p.ink, 13, 'center', 700);
  text(
    ctx,
    '匀强磁场 B（垂直纸面向里）',
    32,
    C.fieldTop + 26,
    p.muted,
    15,
    'left',
    700
  );
  text(
    ctx,
    '探测记录线',
    C.fieldWidth - 28,
    C.baselineY - 17,
    p.muted,
    14,
    'right',
    700
  );
  for (let x = C.entryX + 110; x < C.fieldWidth - 26; x += 54) {
    ctx.strokeStyle = p.rail;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, C.baselineY - 4);
    ctx.lineTo(x, C.baselineY + 12);
    ctx.stroke();
  }
  [5, 10, 15, 20, 25, 30, 35].forEach((n, index) => {
    text(
      ctx,
      `${n}`,
      C.entryX + 88 + index * 54,
      C.baselineY + 25,
      p.muted,
      12,
      'center',
      600
    );
  });
}

function drawTrajectory(
  ctx: CanvasRenderingContext2D,
  particle: MassSpectrometerParticle,
  p: Palette,
  showVector: boolean
): void {
  ctx.strokeStyle = `${particle.color}88`;
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 7]);
  ctx.beginPath();
  ctx.arc(
    C.entryX + particle.radiusPx,
    C.baselineY,
    particle.radiusPx,
    Math.PI,
    0,
    true
  );
  ctx.stroke();
  ctx.setLineDash([]);
  const markerX = C.entryX + particle.radiusPx * 2;
  ctx.strokeStyle = `${particle.color}55`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(markerX, C.baselineY - 10);
  ctx.lineTo(markerX, C.baselineY + 19);
  ctx.stroke();
  text(
    ctx,
    particle.label.slice(0, 1),
    markerX,
    C.baselineY + 35,
    particle.color,
    13,
    'center',
    700
  );
  if (particle.detected) {
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(markerX, C.baselineY, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = particle.color;
  ctx.beginPath();
  ctx.arc(particle.x, particle.y, C.particleRadius, 0, Math.PI * 2);
  ctx.fill();
  if (
    showVector &&
    particle.progress > C.sourcePhaseEnd &&
    particle.progress < 0.88
  ) {
    const theta =
      Math.PI -
      ((particle.progress - C.sourcePhaseEnd) / (1 - C.sourcePhaseEnd)) *
        Math.PI;
    const vx = Math.sin(theta) * 38;
    const vy = Math.cos(theta) * 38;
    arrow(
      ctx,
      particle.x,
      particle.y,
      particle.x + vx,
      particle.y + vy,
      particle.color,
      2.5
    );
  }
}

function drawTrajectories(
  ctx: CanvasRenderingContext2D,
  state: MassSpectrometerState,
  p: Palette
): void {
  state.particles.forEach((particle) => {
    const visible =
      (particle.key === 'protium' && state.showProtium) ||
      (particle.key === 'deuterium' && state.showDeuterium) ||
      (particle.key === 'tritium' && state.showTritium);
    if (visible) drawTrajectory(ctx, particle, p, state.showVectors);
  });
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: MassSpectrometerState,
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
    '质谱仪核心结构',
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
    C.panelDataY,
    C.panelWidth - 2 * C.panelInset,
    C.panelDataHeight,
    14
  );
  ctx.fillStyle = p.soft;
  ctx.fill();
  text(
    ctx,
    '粒子轨迹',
    C.panelX + C.panelInset * 2,
    C.panelDataY + 25,
    p.ink,
    15,
    'left',
    700
  );
  const visible = state.particles.filter(
    (particle) =>
      (particle.key === 'protium' && state.showProtium) ||
      (particle.key === 'deuterium' && state.showDeuterium) ||
      (particle.key === 'tritium' && state.showTritium)
  );
  visible.forEach((particle, index) => {
    const y = C.panelDataY + 57 + index * 34;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(C.panelX + C.panelInset * 2 + 5, y, 6, 0, Math.PI * 2);
    ctx.fill();
    text(
      ctx,
      particle.label,
      C.panelX + C.panelInset * 2 + 20,
      y,
      p.ink,
      13,
      'left',
      600
    );
    text(
      ctx,
      `R ${(particle.radius * 100).toFixed(2)} cm`,
      C.panelX + C.panelWidth - C.panelInset * 2,
      y,
      particle.color,
      14,
      'right',
      700
    );
  });
  text(
    ctx,
    `U = ${state.voltage.toFixed(0)} V`,
    C.panelX + C.panelInset * 2,
    C.panelDataY + 171,
    p.red,
    13,
    'left',
    700
  );
  text(
    ctx,
    `B = ${state.fieldStrength.toFixed(2)} T`,
    C.panelX + C.panelWidth - C.panelInset * 2,
    C.panelDataY + 171,
    p.blue,
    13,
    'right',
    700
  );

  rounded(
    ctx,
    C.panelX + C.panelInset,
    C.panelFormulaY,
    C.panelWidth - 2 * C.panelInset,
    C.panelFormulaHeight,
    14
  );
  ctx.fillStyle = '#f7fbfd';
  ctx.fill();
  text(
    ctx,
    '质量测量',
    C.panelX + C.panelInset * 2,
    C.panelFormulaY + 25,
    p.gold,
    15,
    'left',
    700
  );
  text(
    ctx,
    `R = ${(state.measuredRadius * 100).toFixed(2)} cm`,
    C.panelX + C.panelInset * 2,
    C.panelFormulaY + 59,
    p.ink,
    14,
    'left',
    600
  );
  text(
    ctx,
    `m = ${state.calculatedMass.toFixed(2)} u`,
    C.panelX + C.panelWidth - C.panelInset * 2,
    C.panelFormulaY + 59,
    p.gold,
    16,
    'right',
    700
  );
  text(
    ctx,
    'qU = ½mv²',
    C.panelX + C.panelInset * 2,
    C.panelFormulaY + 94,
    p.ink,
    16,
    'left',
    700
  );
  text(
    ctx,
    'r = mv / (qB)',
    C.panelX + C.panelInset * 2,
    C.panelFormulaY + 126,
    p.ink,
    16,
    'left',
    700
  );
  text(
    ctx,
    'm = B²R²q / (2U)',
    C.panelX + C.panelInset * 2,
    C.panelFormulaY + 151,
    p.blue,
    14,
    'left',
    700
  );

  rounded(
    ctx,
    C.panelX + C.panelInset,
    C.panelHintY,
    C.panelWidth - 2 * C.panelInset,
    C.panelHintHeight,
    14
  );
  ctx.fillStyle = '#fff8e8';
  ctx.fill();
  const status =
    state.status === 'accelerating'
      ? '电场加速'
      : state.status === 'deflecting'
        ? '磁场偏转'
        : '到达探测线';
  text(
    ctx,
    status,
    C.panelX + C.panelInset * 2,
    C.panelHintY + 30,
    state.status === 'detected' ? p.gold : p.teal,
    15,
    'left',
    700
  );
  text(
    ctx,
    `氢—氚间距 ${state.separation.toFixed(0)} px`,
    C.panelX + C.panelInset * 2,
    C.panelHintY + 65,
    p.muted,
    13,
    'left',
    600
  );
  text(
    ctx,
    '同 U、B 下，m 越大，R 越大',
    C.panelX + C.panelInset * 2,
    C.panelHintY + 91,
    p.ink,
    12,
    'left',
    600
  );
}

export function createMassSpectrometerView(
  options: CreateMassSpectrometerViewOptions = {}
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
  let snapshot: MassSpectrometerState | null = null;
  function draw(state: MassSpectrometerState): void {
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
      '电场加速 · 磁场偏转 · 质量分离',
      C.fieldWidth / 2,
      31,
      p.ink,
      21,
      'center',
      700
    );
    drawAcceleration(ctx, state, p);
    drawField(ctx, state, p);
    drawTrajectories(ctx, state, p);
    drawPanel(ctx, state, p);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  return {
    render(state: MassSpectrometerState) {
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
