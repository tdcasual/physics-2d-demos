import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { lenzLawConstants as C, type LenzState } from './scene.sim';

export type CreateLenzLawViewOptions = {
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
  blue: string;
  teal: string;
  red: string;
  orange: string;
  gold: string;
  rail: string;
  magnetN: string;
  magnetS: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    panel: '#ffffff',
    soft: '#f3f6f8',
    ink: '#303744',
    muted: '#7d8997',
    grid: '#e2e7eb',
    border: '#d8dfe5',
    blue: '#4382a7',
    teal: '#16a28d',
    red: '#ef4050',
    orange: '#f09b20',
    gold: '#edb31d',
    rail: '#aab7c3',
    magnetN: '#ef4050',
    magnetS: '#4382a7'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    soft: '#223249',
    ink: '#eef2f7',
    muted: '#aab6c8',
    grid: '#2d3c52',
    border: '#3d4e65',
    blue: '#70b9f0',
    teal: '#4dd4c0',
    red: '#fb7185',
    orange: '#ffb340',
    gold: '#fbbf24',
    rail: '#91a2b5',
    magnetN: '#fb7185',
    magnetS: '#70b9f0'
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
    x2 - 12 * Math.cos(angle - Math.PI / 6),
    y2 - 12 * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    x2 - 12 * Math.cos(angle + Math.PI / 6),
    y2 - 12 * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
}

function drawGrid(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let x = C.gridStep / 2; x < C.fieldWidth; x += C.gridStep) {
    ctx.beginPath();
    ctx.moveTo(x, C.gridTop);
    ctx.lineTo(x, C.baseHeight - 24);
    ctx.stroke();
  }
  for (let y = C.gridStep / 2; y < C.baseHeight - 24; y += C.gridStep) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(C.fieldWidth, y);
    ctx.stroke();
  }
}

function drawMagnet(
  ctx: CanvasRenderingContext2D,
  state: LenzState,
  p: Palette
): { left: number; right: number } {
  const coilLeft = C.coilX - C.coilWidth / 2;
  const right = coilLeft - state.distance * C.distancePixels;
  const left = right - C.magnetWidth;
  const y = C.magnetY;
  ctx.fillStyle = p.magnetS;
  ctx.fillRect(left, y, C.magnetWidth / 2, C.magnetHeight);
  ctx.fillStyle = p.magnetN;
  ctx.fillRect(left + C.magnetWidth / 2, y, C.magnetWidth / 2, C.magnetHeight);
  ctx.strokeStyle = p.panel;
  ctx.lineWidth = 2;
  ctx.strokeRect(left, y, C.magnetWidth, C.magnetHeight);
  text(
    ctx,
    'S',
    left + C.magnetWidth / 4,
    y + C.magnetHeight / 2,
    p.panel,
    26,
    'center',
    700
  );
  text(
    ctx,
    'N',
    left + (C.magnetWidth * 3) / 4,
    y + C.magnetHeight / 2,
    p.panel,
    26,
    'center',
    700
  );
  text(
    ctx,
    '磁铁',
    left + C.magnetWidth / 2,
    y + C.magnetHeight + 22,
    p.ink,
    14,
    'center',
    700
  );
  return { left, right };
}

function drawCoil(
  ctx: CanvasRenderingContext2D,
  state: LenzState,
  p: Palette
): void {
  const left = C.coilX - C.coilWidth / 2;
  const top = C.coilY - C.coilHeight / 2;
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 16;
  ctx.setLineDash([14, 10]);
  ctx.beginPath();
  ctx.ellipse(
    C.coilX,
    C.coilY,
    C.coilWidth / 2,
    C.coilHeight / 2,
    0,
    0,
    Math.PI * 2
  );
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = p.teal;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.ellipse(
    C.coilX,
    C.coilY,
    C.coilWidth / 2 - 10,
    C.coilHeight / 2 - 10,
    0,
    0,
    Math.PI * 2
  );
  ctx.stroke();
  ctx.strokeStyle = `${p.teal}70`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(
    C.coilX,
    C.coilY,
    C.coilWidth / 2 - 24,
    C.coilHeight / 2 - 24,
    0,
    0,
    Math.PI * 2
  );
  ctx.stroke();
  text(ctx, state.leftPole, left - 24, C.coilY, p.teal, 30, 'center', 700);
  text(
    ctx,
    state.rightPole,
    left + C.coilWidth + 24,
    C.coilY,
    p.teal,
    30,
    'center',
    700
  );
  text(ctx, '线圈等效磁极', C.coilX, top - 22, p.teal, 15, 'center', 700);
  if (state.showVectors) {
    const arrowColor = state.inducedField === 'opposes' ? p.teal : p.blue;
    arrow(ctx, left - 10, C.coilY - 48, left + 50, C.coilY - 48, arrowColor, 3);
    arrow(
      ctx,
      left + C.coilWidth - 50,
      C.coilY + 48,
      left + C.coilWidth + 10,
      C.coilY + 48,
      arrowColor,
      3
    );
    text(ctx, "B'", C.coilX, C.coilY + 6, arrowColor, 21, 'center', 700);
  }
}

function drawFieldAndVectors(
  ctx: CanvasRenderingContext2D,
  state: LenzState,
  magnet: { left: number; right: number },
  p: Palette
): void {
  ctx.strokeStyle = `${p.rail}bb`;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 7]);
  ctx.beginPath();
  ctx.moveTo(20, C.fieldAxisY);
  ctx.lineTo(C.fieldWidth - 20, C.fieldAxisY);
  ctx.stroke();
  ctx.setLineDash([]);
  text(
    ctx,
    '系统中心轴',
    C.fieldWidth - 32,
    C.fieldAxisY - 16,
    p.muted,
    13,
    'right',
    600
  );
  const y = C.magnetY + C.magnetHeight / 2;
  arrow(ctx, magnet.right + 16, y, C.coilX - C.coilWidth / 2 - 24, y, p.red, 3);
  text(ctx, 'B₀', magnet.right + 42, y - 22, p.red, 16, 'left', 700);
  if (state.showVectors) {
    const forceSign = state.forceDirection === 'away' ? -1 : 1;
    arrow(
      ctx,
      magnet.right - 6,
      y - 58,
      magnet.right - 6 + forceSign * 78,
      y - 58,
      p.orange,
      5
    );
    text(
      ctx,
      'F安',
      magnet.right - 6 + forceSign * 92,
      y - 58,
      p.orange,
      16,
      forceSign < 0 ? 'right' : 'left',
      700
    );
    const motionSign = state.motion === 'approach' ? 1 : -1;
    arrow(
      ctx,
      magnet.right - 12,
      y + 58,
      magnet.right - 12 + motionSign * 62,
      y + 58,
      p.blue,
      4
    );
    text(
      ctx,
      'v',
      magnet.right - 12 + motionSign * 75,
      y + 58,
      p.blue,
      16,
      motionSign < 0 ? 'right' : 'left',
      700
    );
  }
  const dimensionY = C.fieldAxisY + 78;
  const coilLeft = C.coilX - C.coilWidth / 2;
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(magnet.right, dimensionY);
  ctx.lineTo(coilLeft, dimensionY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(magnet.right, dimensionY - 7);
  ctx.lineTo(magnet.right, dimensionY + 7);
  ctx.moveTo(coilLeft, dimensionY - 7);
  ctx.lineTo(coilLeft, dimensionY + 7);
  ctx.stroke();
  text(
    ctx,
    `d = ${state.distance.toFixed(2)} m`,
    (magnet.right + coilLeft) / 2,
    dimensionY - 16,
    p.muted,
    13,
    'center',
    600
  );
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: LenzState,
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
    '楞次定律',
    C.panelX + C.panelWidth / 2,
    C.panelTitleY,
    p.red,
    23,
    'center',
    700
  );
  text(
    ctx,
    '来拒去留 · 等效磁极',
    C.panelX + C.panelWidth / 2,
    C.panelTitleY + 28,
    p.muted,
    13,
    'center',
    600
  );
  ctx.strokeStyle = p.border;
  ctx.beginPath();
  ctx.moveTo(C.panelX + C.panelInset, C.panelRuleY + 12);
  ctx.lineTo(C.panelX + C.panelWidth - C.panelInset, C.panelRuleY + 12);
  ctx.stroke();
  rounded(
    ctx,
    C.panelX + C.panelInset,
    C.panelMotionY,
    C.panelWidth - 2 * C.panelInset,
    C.panelMotionHeight,
    14
  );
  ctx.fillStyle = p.soft;
  ctx.fill();
  text(
    ctx,
    '磁铁运动',
    C.panelX + C.panelInset * 2,
    C.panelMotionY + 24,
    p.ink,
    14,
    'left',
    700
  );
  text(
    ctx,
    state.motion === 'approach' ? '向右靠近' : '向左远离',
    C.panelX + C.panelWidth - C.panelInset * 2,
    C.panelMotionY + 24,
    p.blue,
    15,
    'right',
    700
  );
  text(
    ctx,
    `速度 ${state.speed.toFixed(2)} m/s`,
    C.panelX + C.panelInset * 2,
    C.panelMotionY + 54,
    p.muted,
    12,
    'left',
    600
  );
  text(
    ctx,
    '原磁通量 Φ',
    C.panelX + C.panelInset * 2,
    C.panelMotionY + 54,
    p.muted,
    12,
    'left',
    600
  );
  ctx.fillStyle = p.border;
  ctx.fillRect(
    C.panelX + C.panelInset * 2,
    C.panelMotionY + C.fluxBarOffset,
    C.panelWidth - C.panelInset * 4,
    C.fluxBarHeight
  );
  ctx.fillStyle = state.motion === 'approach' ? p.red : p.blue;
  ctx.fillRect(
    C.panelX + C.panelInset * 2,
    C.panelMotionY + C.fluxBarOffset,
    (C.panelWidth - C.panelInset * 4) * state.fluxFraction,
    C.fluxBarHeight
  );
  text(
    ctx,
    `${(state.flux * 1000).toFixed(2)} mWb`,
    C.panelX + C.panelWidth - C.panelInset * 2,
    C.panelMotionY + 54,
    state.motion === 'approach' ? p.red : p.blue,
    14,
    'right',
    700
  );

  rounded(
    ctx,
    C.panelX + C.panelInset,
    C.panelAnalysisY,
    C.panelWidth - 2 * C.panelInset,
    C.panelAnalysisHeight,
    14
  );
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(
    ctx,
    '感应现象分析',
    C.panelX + C.panelInset * 2,
    C.panelAnalysisY + 26,
    p.blue,
    15,
    'left',
    700
  );
  const rows: Array<[string, string, string]> = [
    [
      '磁通量变化',
      state.motion === 'approach' ? '迅速增加 ↑' : '逐渐减少 ↓',
      state.motion === 'approach' ? p.red : p.blue
    ],
    ['感应电流 I', `${state.current.toFixed(2)} A`, p.teal],
    [
      "感应磁场 B'",
      state.inducedField === 'opposes' ? '反向 · 增反' : '同向 · 减同',
      p.teal
    ],
    [
      '线圈等效磁极',
      `左极 ${state.leftPole} · 右极 ${state.rightPole}`,
      p.teal
    ],
    [
      '安培力 F安',
      state.forceDirection === 'away' ? '远离磁铁' : '靠近磁铁',
      p.orange
    ]
  ];
  rows.forEach(([label, value, color], index) => {
    const y = C.panelAnalysisY + 62 + index * 36;
    text(ctx, label, C.panelX + C.panelInset * 2, y, p.muted, 12, 'left', 600);
    text(
      ctx,
      value,
      C.panelX + C.panelWidth - C.panelInset * 2,
      y,
      color,
      13,
      'right',
      700
    );
  });
  rounded(
    ctx,
    C.panelX + C.panelInset,
    C.panelSummaryY,
    C.panelWidth - 2 * C.panelInset,
    C.panelSummaryHeight,
    14
  );
  ctx.fillStyle = '#f1f7fb';
  ctx.fill();
  text(
    ctx,
    '增反减同',
    C.panelX + C.panelWidth / 2,
    C.panelSummaryY + 30,
    p.blue,
    15,
    'center',
    700
  );
  text(
    ctx,
    state.motion === 'approach'
      ? '原磁通增加 → 同名相斥'
      : '原磁通减少 → 异名相吸',
    C.panelX + C.panelWidth / 2,
    C.panelSummaryY + 65,
    p.ink,
    13,
    'center',
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
  text(
    ctx,
    'E = −ΔΦ/Δt',
    C.panelX + C.panelInset * 2,
    C.panelHintY + 32,
    p.red,
    16,
    'left',
    700
  );
  text(
    ctx,
    `B₀ = ${state.magnetStrength.toFixed(1)} T`,
    C.panelX + C.panelInset * 2,
    C.panelHintY + 66,
    p.muted,
    13,
    'left',
    600
  );
  text(
    ctx,
    '空格键暂停/恢复',
    C.panelX + C.panelInset * 2,
    C.panelHintY + 92,
    p.muted,
    12,
    'left',
    600
  );
}

export function createLenzLawView(options: CreateLenzLawViewOptions = {}) {
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
  let snapshot: LenzState | null = null;
  function draw(state: LenzState): void {
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
      '磁铁—线圈相对运动',
      C.fieldWidth / 2,
      31,
      p.ink,
      22,
      'center',
      700
    );
    const magnet = drawMagnet(ctx, state, p);
    drawFieldAndVectors(ctx, state, magnet, p);
    drawCoil(ctx, state, p);
    drawPanel(ctx, state, p);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  return {
    render(state: LenzState) {
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
