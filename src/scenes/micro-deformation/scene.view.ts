import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  microDeformationConstants as C,
  type MicroDeformationState
} from './scene.sim';

export type CreateMicroDeformationViewOptions = {
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
  border: string;
  grid: string;
  red: string;
  blue: string;
  teal: string;
  gold: string;
  orange: string;
  wood: string;
  woodDark: string;
  steel: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#f8fafc',
    panel: '#ffffff',
    ink: '#334155',
    muted: '#8090a4',
    border: '#d6e0eb',
    grid: '#d8e2ec',
    red: '#ef4d5e',
    blue: '#2f71dc',
    teal: '#17a589',
    gold: '#dc991a',
    orange: '#ef8d13',
    wood: '#c58b4c',
    woodDark: '#8c4c20',
    steel: '#6b7e92'
  },
  dark: {
    bg: '#101a2a',
    panel: '#172538',
    ink: '#eef4fb',
    muted: '#a7b5c7',
    border: '#3d526c',
    grid: '#2b4059',
    red: '#ff7180',
    blue: '#74adff',
    teal: '#40d9bb',
    gold: '#f8c14b',
    orange: '#ffba4c',
    wood: '#bc8145',
    woodDark: '#a25d2e',
    steel: '#9eafc3'
  }
};

// Canvas 几何基准：集中声明，绘制时随 fit/responsiveScale 一并缩放。
const V = {
  gridStep: 54,
  mirrorFootY: 354,
  screenX: 790,
  screenTop: 94,
  screenBottom: 338,
  screenSpotY: 218,
  lensX: 150,
  lensY: 620,
  lensRadius: 67,
  lensStartX: 113,
  lensStartY: 595,
  lensColStep: 29,
  lensRowStep: 28,
  lensLabelY: 688,
  handleStartX: 197,
  handleStartY: 666,
  handleEndX: 233,
  handleEndY: 702,
  handleSecondX: 220,
  handleSecondY: 690,
  handleSecondEndX: 242,
  handleSecondEndY: 712,
  tableControlX: 390,
  tableLeft: 18,
  tableRight: 760,
  tableTop: 366,
  supportLeft: 170,
  supportRight: 655,
  supportHeight: 184,
  underBeamX: 197,
  underBeamY: 543,
  underBeamWidth: 500,
  forceX: 398,
  laserX: 52,
  laserY: 330,
  mirrorMX: 420,
  mirrorMY: 258,
  mirrorNX: 282,
  mirrorNY: 168,
  screenBeamX: 789,
  mirrorGuideLength: 74,
  opticalSourceX: 53,
  opticalSourceY: 330,
  panelRuleY: 58,
  panelRuleRight: 1248
} as const;

function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  color: string,
  size = 14,
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
  fill: string,
  stroke: string,
  radius: number = C.cardRadius
): void {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function')
    ctx.roundRect(x, y, width, height, radius);
  else ctx.rect(x, y, width, height);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.stroke();
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
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, C.fieldWidth, C.baseHeight);
  ctx.strokeStyle = `${p.grid}45`;
  ctx.lineWidth = 1;
  for (let x = 0; x <= C.fieldWidth; x += V.gridStep) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, C.baseHeight);
    ctx.stroke();
  }
  for (let y = 0; y <= C.baseHeight; y += V.gridStep) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(C.fieldWidth, y);
    ctx.stroke();
  }
}

function drawLaser(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  p: Palette
): void {
  card(ctx, x - 32, y - 22, 64, 44, '#192433', '#334960', 8);
  ctx.fillStyle = p.red;
  ctx.beginPath();
  ctx.arc(x - 21, y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8aa0b8';
  ctx.fillRect(x - 17, y - 14, 28, 4);
  ctx.fillStyle = '#101820';
  ctx.fillRect(x - 22, y + 13, 16, 5);
  text(ctx, '激光源', x, y + 37, p.muted, 12, 'center', 600);
}

function drawMirror(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  p: Palette
): void {
  ctx.fillStyle = '#263b50';
  ctx.fillRect(x - 12, y - 25, 24, 50);
  ctx.fillStyle = '#65d3e8';
  ctx.fillRect(x + 10, y - 22, 4, 44);
  ctx.strokeStyle = p.steel;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y + 25);
  ctx.lineTo(x, V.mirrorFootY);
  ctx.stroke();
  ctx.fillStyle = p.steel;
  ctx.beginPath();
  ctx.ellipse(x, V.mirrorFootY, 28, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, label, x, y - 42, p.ink, 17, 'center', 700);
}

function drawScreen(
  ctx: CanvasRenderingContext2D,
  offset: number,
  p: Palette
): void {
  const x = V.screenX;
  const top = V.screenTop;
  const bottom = V.screenBottom;
  card(ctx, x - 16, top - 12, 48, bottom - top + 24, p.panel, p.border, 8);
  ctx.fillStyle = p.panel;
  ctx.fillRect(x - 8, top, 28, bottom - top);
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 1;
  for (let index = 0; index <= 24; index += 1) {
    const y = top + index * 10;
    const tick = index % 5 === 0 ? 19 : index % 2 === 0 ? 13 : 8;
    ctx.beginPath();
    ctx.moveTo(x - 7, y);
    ctx.lineTo(x - 7 + tick, y);
    ctx.stroke();
  }
  text(ctx, '+10', x + 4, top + 5, p.muted, 11, 'left', 600);
  text(ctx, '+5', x + 4, top + 55, p.muted, 11, 'left', 600);
  text(ctx, '0', x + 4, top + 125, p.muted, 11, 'left', 600);
  text(ctx, '−5', x + 4, top + 175, p.muted, 11, 'left', 600);
  text(ctx, '−10', x + 4, top + 225, p.muted, 11, 'left', 600);
  const spotY = Math.max(
    top + 12,
    Math.min(bottom - 12, V.screenSpotY - offset)
  );
  ctx.save();
  ctx.shadowColor = p.red;
  ctx.shadowBlur = 18;
  ctx.fillStyle = p.red;
  ctx.beginPath();
  ctx.arc(x - 1, spotY, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  text(ctx, '光屏', x + 39, V.screenSpotY, p.ink, 14, 'center', 700);
}

function drawAtomicLens(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.save();
  ctx.globalAlpha = 0.98;
  ctx.fillStyle = p.panel;
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(V.lensX, V.lensY, V.lensRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.clip();
  ctx.strokeStyle = p.teal;
  ctx.lineWidth = 3;
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      const x = V.lensStartX + col * V.lensColStep;
      const y = V.lensStartY + row * V.lensRowStep;
      ctx.beginPath();
      ctx.moveTo(x, y - 11);
      ctx.lineTo(x, y + 11);
      ctx.stroke();
      for (let k = 0; k < 3; k += 1) {
        ctx.beginPath();
        ctx.arc(x + (k - 1) * 6, y, 7, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
  text(ctx, '微观分子弹簧', V.lensX, V.lensLabelY, p.ink, 13, 'center', 700);
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(V.handleStartX, V.handleStartY);
  ctx.lineTo(V.handleEndX, V.handleEndY);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(V.handleSecondX, V.handleSecondY);
  ctx.lineTo(V.handleSecondEndX, V.handleSecondEndY);
  ctx.stroke();
}

function drawTable(
  ctx: CanvasRenderingContext2D,
  state: MicroDeformationState,
  p: Palette
): void {
  const left = V.tableLeft;
  const right = V.tableRight;
  const top = V.tableTop;
  const sag = state.visibleDeflectionPx;
  ctx.fillStyle = p.wood;
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.quadraticCurveTo(V.tableControlX, top + sag, right, top);
  ctx.lineTo(right, top + 30);
  ctx.quadraticCurveTo(V.tableControlX, top + sag + 30, left, top + 30);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = p.woodDark;
  ctx.lineWidth = 2;
  ctx.stroke();
  for (const x of [V.supportLeft, V.supportRight]) {
    ctx.fillStyle = p.woodDark;
    ctx.fillRect(x, top + 29, 30, V.supportHeight);
    ctx.fillStyle = p.wood;
    ctx.fillRect(x - 4, top + 29, 38, 10);
  }
  ctx.fillStyle = p.woodDark;
  ctx.fillRect(V.underBeamX, V.underBeamY, V.underBeamWidth, 10);
  text(
    ctx,
    state.material === 'wood'
      ? '松木板'
      : state.material === 'marble'
        ? '大理石'
        : '厚钢板',
    48,
    351,
    p.ink,
    13,
    'left',
    700
  );
}

function drawForce(
  ctx: CanvasRenderingContext2D,
  state: MicroDeformationState,
  p: Palette
): void {
  const x = V.forceX;
  const y = 380 + state.visibleDeflectionPx;
  const arrowLength = state.forceN > 0 ? 48 + state.forceN / 12 : 23;
  arrow(ctx, x, y - 4, x, y + arrowLength, p.red, 5);
  ctx.fillStyle = p.panel;
  ctx.fillRect(x - 24, y + arrowLength + 8, 48, 10);
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 26, y + arrowLength + 8);
  ctx.lineTo(x + 26, y + arrowLength + 8);
  ctx.stroke();
  text(ctx, 'F', x + 25, y + arrowLength - 7, p.red, 18, 'left', 700);
  text(
    ctx,
    `${state.loadKg.toFixed(0)} kg`,
    x + 30,
    y + arrowLength + 21,
    p.muted,
    12,
    'left',
    600
  );
}

function drawOpticalPath(
  ctx: CanvasRenderingContext2D,
  state: MicroDeformationState,
  p: Palette
): void {
  if (!state.showOpticalPath) return;
  const mX = V.mirrorMX;
  const mY = V.mirrorMY + state.visibleDeflectionPx;
  const nX = V.mirrorNX;
  const nY = V.mirrorNY;
  const screenY = V.screenSpotY - state.screenSpotOffsetPx;
  ctx.save();
  ctx.shadowColor = p.red;
  ctx.shadowBlur = 10;
  ctx.strokeStyle = p.red;
  ctx.globalAlpha = 0.82;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(V.opticalSourceX, V.opticalSourceY);
  ctx.lineTo(mX, mY);
  ctx.lineTo(nX, nY);
  ctx.lineTo(V.screenBeamX, screenY);
  ctx.stroke();
  ctx.restore();
  ctx.setLineDash([7, 6]);
  ctx.strokeStyle = `${p.teal}aa`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(mX, mY);
  ctx.lineTo(mX, mY - V.mirrorGuideLength);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawField(
  ctx: CanvasRenderingContext2D,
  state: MicroDeformationState,
  p: Palette
): void {
  drawGrid(ctx, p);
  text(ctx, '观察微小形变', 34, 30, p.ink, 25, 'left', 800);
  text(ctx, '光杠杆把桌面形变放大到光屏', 35, 58, p.muted, 14, 'left', 600);
  drawTable(ctx, state, p);
  drawAtomicLens(ctx, p);
  drawLaser(ctx, V.laserX, V.laserY, p);
  drawMirror(ctx, V.mirrorMX, V.mirrorMY + state.visibleDeflectionPx, 'M', p);
  drawMirror(ctx, V.mirrorNX, V.mirrorNY, 'N', p);
  drawOpticalPath(ctx, state, p);
  drawForce(ctx, state, p);
  drawScreen(ctx, state.screenSpotOffsetPx, p);
  text(
    ctx,
    state.deformationMode === 'concept'
      ? '概念夸张：放大几何'
      : '物理真实：按比例',
    35,
    752,
    p.teal,
    13,
    'left',
    700
  );
  text(ctx, 'Δy = F / K', 35, 780, p.ink, 14, 'left', 700);
}

function metricRow(
  ctx: CanvasRenderingContext2D,
  label: string,
  value: string,
  x: number,
  y: number,
  color: string,
  p: Palette
): void {
  text(ctx, label, x, y, p.muted, 13, 'left', 600);
  text(ctx, value, x + 320, y, color, 14, 'right', 700);
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: MicroDeformationState,
  p: Palette
): void {
  ctx.fillStyle = p.panel;
  ctx.fillRect(C.panelX, 0, C.panelWidth, C.baseHeight);
  text(ctx, '微小形变与光杠杆', C.panelX + 24, 32, p.ink, 21, 'left', 800);
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(C.panelX + 24, V.panelRuleY);
  ctx.lineTo(V.panelRuleRight, V.panelRuleY);
  ctx.stroke();

  card(ctx, C.panelX + 22, 76, 376, 198, p.panel, p.border);
  text(ctx, '观测量', C.panelX + 40, 100, p.ink, 16, 'left', 700);
  metricRow(
    ctx,
    '施加压力/重力 F',
    `${state.forceN.toFixed(0)} N`,
    C.panelX + 40,
    132,
    p.red,
    p
  );
  metricRow(
    ctx,
    '桌面中心下凹 Δy',
    `${state.deflectionMicron.toFixed(2)} μm`,
    C.panelX + 40,
    163,
    p.orange,
    p
  );
  metricRow(
    ctx,
    '镜面微观倾角 θ',
    `${state.mirrorAngleMicrorad.toFixed(2)} μrad`,
    C.panelX + 40,
    194,
    p.teal,
    p
  );
  metricRow(
    ctx,
    '光斑实际偏移 ΔY',
    `${state.screenShiftMm.toFixed(2)} mm`,
    C.panelX + 40,
    225,
    p.red,
    p
  );
  metricRow(
    ctx,
    '综合放大倍数 M',
    `≈ ${state.magnification.toFixed(0)} 倍`,
    C.panelX + 40,
    256,
    p.blue,
    p
  );

  card(ctx, C.panelX + 22, 292, 376, 176, p.panel, p.border);
  text(ctx, '微观解释', C.panelX + 40, 317, p.ink, 16, 'left', 700);
  text(ctx, '受力 → 原子间距改变', C.panelX + 40, 352, p.ink, 14, 'left', 600);
  text(ctx, '斥力形成宏观弹力', C.panelX + 40, 380, p.teal, 14, 'left', 600);
  text(ctx, 'ΔY = M · Δy', C.panelX + 40, 417, p.blue, 18, 'left', 800);
  text(
    ctx,
    `K = ${(state.stiffness / 1e6).toFixed(1)} × 10⁶ N/m`,
    C.panelX + 40,
    448,
    p.muted,
    12,
    'left',
    600
  );

  card(ctx, C.panelX + 22, 486, 376, 210, p.panel, p.border);
  text(ctx, '观察提示', C.panelX + 40, 512, p.gold, 16, 'left', 700);
  text(
    ctx,
    '改变材料或砝码，比较 Δy',
    C.panelX + 40,
    551,
    p.ink,
    13,
    'left',
    600
  );
  text(
    ctx,
    '再用光屏读出放大后的 ΔY',
    C.panelX + 40,
    579,
    p.ink,
    13,
    'left',
    600
  );
  text(
    ctx,
    state.autoRun ? '光斑微动中' : '暂停：可精确读数',
    C.panelX + 40,
    620,
    p.teal,
    13,
    'left',
    700
  );
  text(
    ctx,
    state.showOpticalPath ? '光路：已显示' : '光路：已隐藏',
    C.panelX + 40,
    650,
    p.muted,
    12,
    'left',
    600
  );
  text(
    ctx,
    '同样的原理也适用于坚硬桌面',
    C.panelX + 40,
    680,
    p.muted,
    12,
    'left',
    600
  );
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  state: MicroDeformationState,
  p: Palette
): void {
  drawField(ctx, state, p);
  drawPanel(ctx, state, p);
}

export function createMicroDeformationView(
  options: CreateMicroDeformationViewOptions = {}
) {
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
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  let snapshot: MicroDeformationState | null = null;

  function draw(state: MicroDeformationState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    stage.ensureSized();
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(width / C.baseWidth, height / C.baseHeight);
    const offsetY = (height - C.baseHeight * fit) / 2;
    const responsiveScale = stage.responsiveScale;
    const p = PALETTE[env.theme];
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(0, offsetY);
    ctx.scale(fit, fit);
    ctx.lineWidth = responsiveScale;
    drawScene(ctx, state, p);
    ctx.restore();
  }

  return {
    render(state: MicroDeformationState): void {
      snapshot = state;
      draw(state);
    },
    resize(): void {
      stage.resize();
      if (snapshot) draw(snapshot);
    },
    setTheme(theme: TeachingTheme): void {
      env.setTheme(theme);
      if (snapshot) draw(snapshot);
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints): void {
      env.setMode(mode, hints);
      if (snapshot) draw(snapshot);
    },
    dispose(): void {
      snapshot = null;
      stage.release();
    }
  };
}
