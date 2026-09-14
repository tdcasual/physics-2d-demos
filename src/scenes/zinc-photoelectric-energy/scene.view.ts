import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  zincPhotoelectricConstants as C,
  type ZincPhotoelectricState
} from './scene.sim';

export type CreateZincPhotoelectricViewOptions = {
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
  purple: string;
  blue: string;
  red: string;
  teal: string;
  gold: string;
  orange: string;
};
const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfcff',
    panel: '#ffffff',
    ink: '#303747',
    muted: '#8995a7',
    border: '#d9e1eb',
    grid: '#dde5ee',
    purple: '#7c45e8',
    blue: '#3478d9',
    red: '#ef4554',
    teal: '#1aa38c',
    gold: '#e4a11a',
    orange: '#f28c3d'
  },
  dark: {
    bg: '#101929',
    panel: '#172538',
    ink: '#eef3fb',
    muted: '#a8b6c9',
    border: '#3d526c',
    grid: '#2b4059',
    purple: '#b18bff',
    blue: '#75adff',
    red: '#ff7785',
    teal: '#46d9bf',
    gold: '#f7c24e',
    orange: '#ffb36b'
  }
};
const V = {
  laserX: 100,
  laserY: 125,
  laserW: 170,
  laserH: 58,
  beamTop: 177,
  beamBottom: 330,
  beamOriginY: 112,
  beamTipY: 330,
  beamInset: 88,
  plateX: 365,
  plateY: 365,
  plateW: 210,
  plateH: 42,
  plateRadius: 10,
  photonStartX: 255,
  photonStartY: 145,
  photonEndX: 420,
  photonEndY: 350,
  scopeCX: 470,
  scopeCY: 625,
  scopeR: 145,
  scopeTop: 490,
  scopeBottom: 770,
  scopeStemY: 540,
  scopePivotY: 650,
  leafY: 680,
  scopeTopWidth: 70,
  leafLength: 72,
  panelRuleY: 62,
  panelRight: 1248,
  cardX: 882,
  cardW: 376,
  beamCardY: 78,
  beamCardH: 142,
  chargeCardY: 235,
  chargeCardH: 112,
  energyCardY: 364,
  energyCardH: 322,
  observeCardY: 704,
  observeCardH: 86,
  barX: 1060,
  barTop: 515,
  barWidth: 180,
  barHeight: 24,
  barGap: 56,
  energyBarY: 120,
  energyBarY2: 176,
  particleMinX: 300,
  particleMaxX: 720,
  particleMinY: 80,
  particleMaxY: 320
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
function drawGrid(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, C.fieldWidth, C.baseHeight);
  ctx.strokeStyle = `${p.grid}45`;
  ctx.lineWidth = 1;
  for (let x = 0; x <= C.fieldWidth; x += 54) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, C.baseHeight);
    ctx.stroke();
  }
  for (let y = 0; y <= C.baseHeight; y += 54) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(C.fieldWidth, y);
    ctx.stroke();
  }
}
function drawLaser(
  ctx: CanvasRenderingContext2D,
  state: ZincPhotoelectricState,
  p: Palette
): void {
  ctx.save();
  ctx.translate(V.laserX, V.laserY);
  ctx.rotate(-0.48);
  card(
    ctx,
    -V.laserW / 2,
    -V.laserH / 2,
    V.laserW,
    V.laserH,
    '#1d2940',
    p.border,
    12
  );
  ctx.fillStyle = p.purple;
  ctx.beginPath();
  ctx.ellipse(V.laserW / 2 - 4, 0, 30, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = `${p.purple}2a`;
  ctx.beginPath();
  ctx.moveTo(V.beamTop, V.beamOriginY);
  ctx.lineTo(V.beamBottom, V.beamTipY);
  ctx.lineTo(V.beamBottom - V.beamInset, V.beamTipY);
  ctx.closePath();
  ctx.fill();
  text(
    ctx,
    `hν = ${state.photonEnergy.toFixed(2)} eV`,
    V.laserX + 110,
    84,
    p.purple,
    16,
    'center',
    800
  );
  text(ctx, '入射光子', V.laserX + 112, 108, p.purple, 13, 'center', 700);
}
function drawZincPlate(
  ctx: CanvasRenderingContext2D,
  state: ZincPhotoelectricState,
  p: Palette
): void {
  card(
    ctx,
    V.plateX,
    V.plateY,
    V.plateW,
    V.plateH,
    '#9eafc4',
    p.ink,
    V.plateRadius
  );
  ctx.fillStyle = '#c7d2e1';
  ctx.fillRect(V.plateX + 8, V.plateY + 8, V.plateW - 16, 12);
  text(
    ctx,
    '锌板 (Zn)',
    V.plateX + V.plateW / 2,
    V.plateY + 24,
    p.ink,
    18,
    'center',
    800
  );
  if (state.chargeState === 'rubbed') {
    for (let i = 0; i < 3; i += 1) {
      ctx.fillStyle = p.blue;
      ctx.beginPath();
      ctx.arc(V.plateX + 18 + i * V.beamInset, V.plateY + 4, 9, 0, Math.PI * 2);
      ctx.fill();
      text(
        ctx,
        '−',
        V.plateX + 18 + i * V.beamInset,
        V.plateY + 4,
        '#fff',
        13,
        'center',
        800
      );
    }
  }
}
function drawParticles(
  ctx: CanvasRenderingContext2D,
  state: ZincPhotoelectricState,
  p: Palette
): void {
  const intensity = state.intensity / C.intensityMax;
  ctx.globalAlpha = state.effectOn ? 0.92 : 0.2;
  for (let i = 0; i < 18; i += 1) {
    const px =
      V.photonStartX +
      ((i * 53 + state.time * 34) % (V.photonEndX - V.photonStartX));
    const py = V.photonStartY + ((i * 29) % 120);
    ctx.fillStyle = p.purple;
    ctx.beginPath();
    ctx.arc(px, py + (V.photonEndY - py) * 0.44, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (!state.emitted) {
    text(
      ctx,
      state.effectOn ? '电子逸出受限' : '光子能量不足，电子不逸出',
      445,
      320,
      p.red,
      14,
      'center',
      700
    );
    return;
  }
  const count = Math.min(28, Math.max(6, Math.round(state.electronCount / 2)));
  ctx.fillStyle = p.red;
  for (let i = 0; i < count; i += 1) {
    const progress = (state.time * 0.22 + i / count) % 1;
    const px = V.plateX + 22 + progress * 260 + ((i * 17) % 30);
    const py =
      V.plateY -
      22 -
      ((i * 31 + Math.floor(state.time * 18)) % 260) * (0.4 + intensity * 0.4);
    ctx.beginPath();
    ctx.arc(px, py, 4 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  text(
    ctx,
    `光电子 × ${state.electronCount}`,
    490,
    320,
    p.red,
    14,
    'center',
    700
  );
}
function drawElectroscope(
  ctx: CanvasRenderingContext2D,
  state: ZincPhotoelectricState,
  p: Palette
): void {
  ctx.strokeStyle = '#a6b5c9';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(V.scopeCX, V.scopeCY, V.scopeR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = `${p.grid}99`;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.arc(V.scopeCX, V.scopeCY, V.scopeR - 28, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = p.teal;
  ctx.fillRect(
    V.scopeCX - V.scopeTopWidth / 2,
    V.scopeTop,
    V.scopeTopWidth,
    34
  );
  ctx.fillStyle = '#9cb0c7';
  ctx.beginPath();
  ctx.arc(V.scopeCX, V.scopeTop + 18, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(V.scopeCX, V.scopeTop + 34);
  ctx.lineTo(V.scopeCX, V.scopePivotY);
  ctx.stroke();
  ctx.fillStyle = p.ink;
  ctx.beginPath();
  ctx.arc(V.scopeCX, V.scopePivotY, 10, 0, Math.PI * 2);
  ctx.fill();
  const angle = state.electroscopeAngle;
  ctx.strokeStyle = p.orange;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(V.scopeCX, V.scopePivotY);
  ctx.lineTo(
    V.scopeCX - Math.sin(angle) * V.leafLength,
    V.leafY + Math.cos(angle) * V.leafLength
  );
  ctx.moveTo(V.scopeCX, V.scopePivotY);
  ctx.lineTo(
    V.scopeCX + Math.sin(angle) * V.leafLength,
    V.leafY + Math.cos(angle) * V.leafLength
  );
  ctx.stroke();
  text(
    ctx,
    state.chargeState === 'rubbed' ? '验电器张开' : '接地归零',
    V.scopeCX,
    V.scopeBottom - 14,
    state.chargeState === 'rubbed' ? p.orange : p.teal,
    15,
    'center',
    700
  );
}
function drawEnergyBars(
  ctx: CanvasRenderingContext2D,
  state: ZincPhotoelectricState,
  p: Palette
): void {
  const max = Math.max(
    state.photonEnergy,
    state.workFunction + state.maxKineticEnergy,
    0.1
  );
  const photonWidth = Math.min(
    V.barWidth,
    (state.photonEnergy / max) * V.barWidth
  );
  const workWidth = Math.min(
    V.barWidth,
    (state.workFunction / max) * V.barWidth
  );
  const kineticWidth = Math.min(
    V.barWidth,
    (state.maxKineticEnergy / max) * V.barWidth
  );
  text(
    ctx,
    '爱因斯坦光电效应方程',
    V.cardX + 22,
    V.energyCardY + 30,
    p.ink,
    17,
    'left',
    700
  );
  text(
    ctx,
    'hν = W₀ + Eₖ',
    V.cardX + V.cardW / 2,
    V.energyCardY + 76,
    p.purple,
    24,
    'center',
    800
  );
  text(
    ctx,
    '光子 hν',
    V.cardX + 22,
    V.energyCardY + 132,
    p.ink,
    14,
    'left',
    700
  );
  ctx.fillStyle = `${p.border}88`;
  ctx.fillRect(V.barX, V.energyCardY + V.energyBarY, V.barWidth, V.barHeight);
  ctx.fillStyle = p.purple;
  ctx.fillRect(V.barX, V.energyCardY + V.energyBarY, photonWidth, V.barHeight);
  text(
    ctx,
    `${state.photonEnergy.toFixed(2)} eV`,
    V.panelRight - 20,
    V.energyCardY + 132,
    p.purple,
    14,
    'right',
    800
  );
  text(
    ctx,
    '能量去向',
    V.cardX + 22,
    V.energyCardY + 188,
    p.ink,
    14,
    'left',
    700
  );
  ctx.fillStyle = p.muted;
  ctx.fillRect(V.barX, V.energyCardY + V.energyBarY2, V.barWidth, V.barHeight);
  ctx.fillStyle = p.red;
  ctx.fillRect(
    V.barX + workWidth,
    V.energyCardY + V.energyBarY2,
    kineticWidth,
    V.barHeight
  );
  text(
    ctx,
    `W₀ ${state.workFunction.toFixed(2)} + Eₖ ${state.maxKineticEnergy.toFixed(2)} eV`,
    V.panelRight - 20,
    V.energyCardY + 188,
    p.red,
    13,
    'right',
    700
  );
  text(
    ctx,
    `极限波长 λ₀ = ${state.thresholdWavelength} nm`,
    V.cardX + 22,
    V.energyCardY + 254,
    p.muted,
    13,
    'left',
    600
  );
  text(
    ctx,
    state.effectOn ? 'λ < λ₀：电子逸出' : 'λ ≥ λ₀：无光电子',
    V.cardX + 22,
    V.energyCardY + 286,
    state.effectOn ? p.teal : p.red,
    14,
    'left',
    700
  );
}
function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: ZincPhotoelectricState,
  p: Palette
): void {
  ctx.fillStyle = p.panel;
  ctx.fillRect(C.panelX, 0, C.panelWidth, C.baseHeight);
  text(ctx, '锌板光电效应·能量守恒', C.panelX + 24, 34, p.ink, 21, 'left', 800);
  ctx.strokeStyle = p.border;
  ctx.beginPath();
  ctx.moveTo(C.panelX + 24, V.panelRuleY);
  ctx.lineTo(V.panelRight, V.panelRuleY);
  ctx.stroke();
  card(ctx, V.cardX, V.beamCardY, V.cardW, V.beamCardH, p.panel, p.border);
  text(ctx, '光束参数', V.cardX + 22, V.beamCardY + 28, p.ink, 16, 'left', 700);
  text(ctx, '波长 λ', V.cardX + 22, V.beamCardY + 66, p.muted, 13, 'left', 600);
  text(
    ctx,
    `${state.wavelength} nm`,
    V.panelRight - 22,
    V.beamCardY + 66,
    p.purple,
    17,
    'right',
    800
  );
  text(
    ctx,
    '光强 I',
    V.cardX + 22,
    V.beamCardY + 100,
    p.muted,
    13,
    'left',
    600
  );
  text(
    ctx,
    `${state.intensity}%（只改变电子数）`,
    V.panelRight - 22,
    V.beamCardY + 100,
    p.blue,
    14,
    'right',
    700
  );
  card(ctx, V.cardX, V.chargeCardY, V.cardW, V.chargeCardH, p.panel, p.border);
  text(
    ctx,
    '金属板初始状态',
    V.cardX + 22,
    V.chargeCardY + 28,
    p.ink,
    16,
    'left',
    700
  );
  text(
    ctx,
    state.chargeState === 'rubbed' ? '摩擦带负电（−）' : '手指触碰接地（0）',
    V.cardX + 22,
    V.chargeCardY + 70,
    state.chargeState === 'rubbed' ? p.purple : p.teal,
    16,
    'left',
    800
  );
  drawEnergyBars(ctx, state, p);
  card(
    ctx,
    V.cardX,
    V.observeCardY,
    V.cardW,
    V.observeCardH,
    p.panel,
    p.border
  );
  text(
    ctx,
    '观察：调波长看阈值，调光强看电子数',
    V.cardX + 22,
    V.observeCardY + 42,
    p.muted,
    13,
    'left',
    600
  );
}
function drawScene(
  ctx: CanvasRenderingContext2D,
  state: ZincPhotoelectricState,
  p: Palette
): void {
  drawGrid(ctx, p);
  text(ctx, '锌板光电效应·能量演变', 34, 34, p.ink, 25, 'left', 800);
  text(ctx, 'hν = W₀ + Eₖ(max)', 35, 62, p.muted, 14, 'left', 600);
  drawLaser(ctx, state, p);
  drawZincPlate(ctx, state, p);
  drawParticles(ctx, state, p);
  drawElectroscope(ctx, state, p);
  drawPanel(ctx, state, p);
  text(
    ctx,
    '空格键：暂停 / 继续',
    C.fieldWidth / 2,
    C.baseHeight - 24,
    p.muted,
    14,
    'center',
    600
  );
}
export function createZincPhotoelectricView(
  options: CreateZincPhotoelectricViewOptions = {}
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
  let snapshot: ZincPhotoelectricState | null = null;
  function draw(state: ZincPhotoelectricState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    stage.ensureSized();
    const fit = Math.min(
      stage.cssWidth / C.baseWidth,
      stage.cssHeight / C.baseHeight
    );
    const offsetY = (stage.cssHeight - C.baseHeight * fit) / 2;
    const responsiveScale = stage.responsiveScale;
    const p = PALETTE[env.theme];
    ctx.clearRect(0, 0, stage.cssWidth, stage.cssHeight);
    ctx.save();
    ctx.translate(0, offsetY);
    ctx.scale(fit, fit);
    ctx.lineWidth = responsiveScale;
    drawScene(ctx, state, p);
    ctx.restore();
  }
  return {
    render(state: ZincPhotoelectricState): void {
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
