import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  photoelectricConstants as C,
  photoelectricMaterials,
  type PhotoelectricState
} from './scene.sim';

export type CreatePhotoelectricViewOptions = {
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
  cyan: string;
  red: string;
  orange: string;
  green: string;
  wire: string;
  metal: string;
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
    blue: '#3e45e8',
    cyan: '#17a7c7',
    red: '#ef4050',
    orange: '#f09b20',
    green: '#16a28d',
    wire: '#f2a51c',
    metal: '#aeb8c3'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    soft: '#223249',
    ink: '#eef2f7',
    muted: '#aab6c8',
    grid: '#2d3c52',
    border: '#3d4e65',
    blue: '#8390ff',
    cyan: '#4dd4e9',
    red: '#fb7185',
    orange: '#ffb340',
    green: '#4dd4c0',
    wire: '#fbbf24',
    metal: '#91a2b5'
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
  radius = 14
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

function drawLightSource(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = p.metal;
  rounded(ctx, C.sourceX, C.sourceY, C.sourceWidth, C.sourceHeight, 7);
  ctx.fill();
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = p.blue;
  ctx.beginPath();
  ctx.arc(C.sourceLensX, C.sourceLensY, C.sourceLensRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = `${p.blue}88`;
  ctx.shadowBlur = 18;
  ctx.fill();
  ctx.shadowBlur = 0;
  text(
    ctx,
    '可调光源',
    C.sourceX + C.sourceWidth / 2,
    C.sourceY + C.sourceHeight + 28,
    p.ink,
    15,
    'center',
    700
  );
}

function drawBeam(
  ctx: CanvasRenderingContext2D,
  state: PhotoelectricState,
  p: Palette
): void {
  ctx.strokeStyle = `${p.blue}dd`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let x = C.beamStartX; x <= C.beamEndX; x += 6) {
    const y =
      C.sourceLensY + Math.sin((x - C.beamStartX) / 16 + state.time * 5) * 6;
    if (x === C.beamStartX) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  arrow(
    ctx,
    C.beamEndX - 38,
    C.sourceLensY,
    C.beamEndX,
    C.sourceLensY,
    p.blue,
    3
  );
  text(
    ctx,
    '光子',
    C.beamStartX + 16,
    C.sourceLensY - 28,
    p.blue,
    13,
    'left',
    700
  );
}

function drawPhotoTube(
  ctx: CanvasRenderingContext2D,
  state: PhotoelectricState,
  p: Palette
): void {
  ctx.fillStyle = `${p.soft}88`;
  ctx.strokeStyle = p.metal;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(C.tubeX, C.tubeY, C.tubeRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(
    C.cathodeX,
    C.tubeY,
    C.tubeRadius - 18,
    Math.PI * 0.58,
    Math.PI * 1.42
  );
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(C.anodeX, C.tubeY - C.tubeRadius + 26);
  ctx.lineTo(C.anodeX, C.tubeY + C.tubeRadius - 26);
  ctx.stroke();
  text(
    ctx,
    'K',
    C.cathodeX - 22,
    C.tubeY - C.tubeRadius + 12,
    p.ink,
    18,
    'center',
    700
  );
  text(
    ctx,
    'A',
    C.anodeX + 24,
    C.tubeY - C.tubeRadius + 12,
    p.ink,
    18,
    'center',
    700
  );
  text(
    ctx,
    '真空光电管',
    C.tubeX,
    C.tubeY - C.tubeRadius - 24,
    p.muted,
    15,
    'center',
    700
  );
  arrow(
    ctx,
    C.anodeX - 16,
    C.tubeY + 34,
    C.cathodeX + 20,
    C.tubeY + 34,
    p.red,
    3
  );
  text(ctx, 'E', C.tubeX, C.tubeY + 12, p.red, 19, 'center', 700);
  if (state.effectActive && state.showVectors) {
    const count = 3 + Math.round(state.electronFraction * 4);
    for (let index = 0; index < count; index += 1) {
      const progress = (state.time * 0.35 + index / count) % 1;
      const x = C.cathodeX + 18 + progress * (C.anodeX - C.cathodeX - 30);
      const y = C.tubeY - 34 + index * 14;
      arrow(ctx, x, y, x + 25, y, p.cyan, 3);
    }
    text(
      ctx,
      'e⁻',
      C.tubeX,
      C.tubeY + C.tubeRadius - 22,
      p.cyan,
      15,
      'center',
      700
    );
  }
}

function drawPowerChain(
  ctx: CanvasRenderingContext2D,
  state: PhotoelectricState,
  p: Palette
): void {
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(C.cathodeX, C.tubePowerY - 6);
  ctx.lineTo(C.cathodeX, C.supplyY);
  ctx.moveTo(C.anodeX, C.tubePowerY - 6);
  ctx.lineTo(C.anodeX, C.supplyY);
  ctx.stroke();
  ctx.fillStyle = p.panel;
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  rounded(
    ctx,
    C.supplyX - C.supplyWidth / 2,
    C.supplyY,
    C.supplyWidth,
    C.supplyHeight,
    9
  );
  ctx.fill();
  ctx.stroke();
  text(
    ctx,
    '−',
    C.supplyX - 25,
    C.supplyY + C.supplyHeight / 2,
    p.blue,
    24,
    'center',
    700
  );
  text(
    ctx,
    '+',
    C.supplyX + 25,
    C.supplyY + C.supplyHeight / 2,
    p.red,
    24,
    'center',
    700
  );
  text(
    ctx,
    '电源',
    C.supplyX + 74,
    C.supplyY + C.supplyHeight / 2,
    p.muted,
    13,
    'left',
    600
  );
  ctx.strokeStyle = p.ink;
  ctx.beginPath();
  ctx.moveTo(C.cathodeX, C.supplyY + C.supplyHeight);
  ctx.lineTo(C.cathodeX, C.amplifierY);
  ctx.moveTo(C.anodeX, C.supplyY + C.supplyHeight);
  ctx.lineTo(C.anodeX, C.amplifierY);
  ctx.stroke();
  ctx.fillStyle = p.panel;
  rounded(
    ctx,
    C.amplifierX - C.amplifierWidth / 2,
    C.amplifierY,
    C.amplifierWidth,
    C.amplifierHeight,
    12
  );
  ctx.fill();
  ctx.strokeStyle = p.ink;
  ctx.stroke();
  text(
    ctx,
    '放大器',
    C.amplifierX,
    C.amplifierY + C.amplifierHeight / 2,
    p.ink,
    18,
    'center',
    700
  );
  drawRelay(ctx, state, p);
}

function drawRelay(
  ctx: CanvasRenderingContext2D,
  state: PhotoelectricState,
  p: Palette
): void {
  const coreTop = C.relayCoreY - C.relayCoreHeight / 2;
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(C.cathodeX, C.amplifierY + C.amplifierHeight);
  ctx.lineTo(C.cathodeX, coreTop);
  ctx.lineTo(C.relayCoreX, coreTop);
  ctx.stroke();
  ctx.fillStyle = p.metal;
  ctx.fillRect(C.relayCoreX, coreTop, C.relayCoreWidth, C.relayCoreHeight);
  ctx.strokeStyle = p.ink;
  ctx.strokeRect(C.relayCoreX, coreTop, C.relayCoreWidth, C.relayCoreHeight);
  text(
    ctx,
    '电磁铁',
    C.relayCoreX + C.relayCoreWidth / 2,
    coreTop + C.relayCoreHeight + 22,
    p.muted,
    13,
    'center',
    600
  );
  const armatureOffset = state.relayState === 'open' ? -18 : 0;
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(C.armatureX, C.armatureY - 28);
  ctx.lineTo(C.armatureX, C.armatureY + C.armatureLowerOffset + armatureOffset);
  ctx.stroke();
  ctx.strokeStyle = p.muted;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(C.armatureX + 12, C.armatureY + 8);
  for (let index = 0; index < 5; index += 1) {
    const x = C.armatureX + 18 + index * 14;
    ctx.lineTo(x, C.armatureY + (index % 2 === 0 ? -8 : 8));
  }
  ctx.lineTo(C.armatureX + C.springEndOffset, C.armatureY + 8);
  ctx.stroke();
  text(
    ctx,
    '复位弹簧',
    C.armatureX + 66,
    C.armatureY + 36,
    p.muted,
    12,
    'left',
    600
  );
  drawLampCircuit(ctx, state, p);
}

function drawLampCircuit(
  ctx: CanvasRenderingContext2D,
  state: PhotoelectricState,
  p: Palette
): void {
  const wireY = C.lampY - 48;
  ctx.strokeStyle = p.wire;
  ctx.lineWidth = 5;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.moveTo(C.relayCoreX + C.relayCoreWidth, wireY);
  ctx.lineTo(C.lampX - 34, wireY);
  ctx.lineTo(C.lampX - 34, C.lampY);
  ctx.moveTo(C.lampX + 34, C.lampY);
  ctx.lineTo(C.lampX + C.lampWireOffset, C.lampY);
  ctx.lineTo(C.lampX + C.lampWireOffset, wireY);
  ctx.lineTo(C.lampX - 34, wireY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = state.lampOn ? '#ffe46b' : p.soft;
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(C.lampX, C.lampY, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (state.lampOn) {
    ctx.strokeStyle = p.orange;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(C.lampX - 11, C.lampY - 8);
    ctx.lineTo(C.lampX + 11, C.lampY + 8);
    ctx.moveTo(C.lampX + 11, C.lampY - 8);
    ctx.lineTo(C.lampX - 11, C.lampY + 8);
    ctx.stroke();
  }
  text(ctx, '路灯', C.lampX + 40, C.lampY + 4, p.ink, 14, 'left', 700);
  text(ctx, '220 V', C.lampX + 40, C.lampY - 24, p.muted, 12, 'left', 600);
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: PhotoelectricState,
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
    '光电开关控制台',
    C.panelX + C.panelWidth / 2,
    C.panelTitleY,
    p.ink,
    24,
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
    C.panelMaterialY,
    C.panelControlWidth,
    C.panelMaterialHeight,
    14
  );
  ctx.fillStyle = p.soft;
  ctx.fill();
  text(
    ctx,
    `阴极材料  ${photoelectricMaterials[state.material].label}`,
    C.panelX + C.panelInset * 2,
    C.panelMaterialY + 22,
    p.ink,
    14,
    'left',
    700
  );
  text(
    ctx,
    `W₀ = ${state.workFunction.toFixed(2)} eV`,
    C.panelX + C.panelWidth - C.panelInset * 2,
    C.panelMaterialY + 22,
    p.muted,
    13,
    'right',
    600
  );
  text(
    ctx,
    `ν₀ = ${state.thresholdFrequency.toFixed(2)}×10¹⁴ Hz`,
    C.panelX + C.panelInset * 2,
    C.panelMaterialY + 52,
    p.muted,
    12,
    'left',
    600
  );
  rounded(
    ctx,
    C.panelX + C.panelInset,
    C.panelFrequencyY,
    C.panelControlWidth,
    C.panelFrequencyHeight,
    14
  );
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(
    ctx,
    `入射频率 ν  ${state.frequency.toFixed(1)}×10¹⁴ Hz`,
    C.panelX + C.panelInset * 2,
    C.panelFrequencyY + 24,
    p.ink,
    14,
    'left',
    700
  );
  const frequencyRatio = (state.frequency - 3.8) / (9 - 3.8);
  const frequencyBarX = C.panelX + C.panelInset * 2;
  const frequencyBarY = C.panelFrequencyY + 62;
  ctx.fillStyle = p.soft;
  rounded(
    ctx,
    frequencyBarX,
    frequencyBarY,
    C.panelControlWidth - C.panelInset * 2,
    14,
    7
  );
  ctx.fill();
  ctx.fillStyle = state.effectActive ? p.cyan : p.muted;
  ctx.fillRect(
    frequencyBarX,
    frequencyBarY,
    (C.panelControlWidth - C.panelInset * 2) * frequencyRatio,
    14
  );
  const thresholdX =
    frequencyBarX +
    ((state.thresholdFrequency - 3.8) / (9 - 3.8)) *
      (C.panelControlWidth - C.panelInset * 2);
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 3;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(thresholdX, frequencyBarY - 14);
  ctx.lineTo(thresholdX, frequencyBarY + 28);
  ctx.stroke();
  ctx.setLineDash([]);
  text(ctx, 'ν₀', thresholdX, frequencyBarY + 40, p.red, 12, 'center', 700);
  rounded(
    ctx,
    C.panelX + C.panelInset,
    C.panelIntensityY,
    C.panelControlWidth,
    C.panelIntensityHeight,
    14
  );
  ctx.fillStyle = p.soft;
  ctx.fill();
  text(
    ctx,
    `光照强度  ${state.intensity.toFixed(0)}%`,
    C.panelX + C.panelInset * 2,
    C.panelIntensityY + 24,
    p.ink,
    14,
    'left',
    700
  );
  const intensityBarX = C.panelX + C.panelInset * 2;
  const intensityBarY = C.panelIntensityY + 58;
  ctx.fillStyle = p.border;
  rounded(
    ctx,
    intensityBarX,
    intensityBarY,
    C.panelControlWidth - C.panelInset * 2,
    12,
    6
  );
  ctx.fill();
  ctx.fillStyle = p.blue;
  ctx.fillRect(
    intensityBarX,
    intensityBarY,
    ((C.panelControlWidth - C.panelInset * 2) * state.intensity) / 100,
    12
  );
  rounded(
    ctx,
    C.panelX + C.panelInset,
    C.panelReadoutY,
    C.panelControlWidth,
    C.panelReadoutHeight,
    14
  );
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.stroke();
  text(
    ctx,
    '实时数据',
    C.panelX + C.panelInset * 2,
    C.panelReadoutY + 22,
    p.blue,
    15,
    'left',
    700
  );
  text(
    ctx,
    `光子能量 hν  ${state.photonEnergy.toFixed(2)} eV`,
    C.panelX + C.panelInset * 2,
    C.panelReadoutY + 52,
    p.muted,
    13,
    'left',
    600
  );
  text(
    ctx,
    `最大动能 Eₖ  ${state.maxKineticEnergy.toFixed(2)} eV`,
    C.panelX + C.panelInset * 2,
    C.panelReadoutY + 80,
    p.muted,
    13,
    'left',
    600
  );
  text(
    ctx,
    `光电流 I  ${state.photoCurrent.toFixed(2)} mA`,
    C.panelX + C.panelInset * 2,
    C.panelReadoutY + 108,
    state.effectActive ? p.red : p.muted,
    14,
    'left',
    700
  );
  rounded(
    ctx,
    C.panelX + C.panelInset,
    C.panelRelayY,
    C.panelControlWidth,
    C.panelRelayHeight,
    14
  );
  ctx.fillStyle = state.lampOn ? '#fff8de' : p.soft;
  ctx.fill();
  ctx.strokeStyle = state.lampOn ? p.orange : p.border;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(
    ctx,
    `光控开关：${state.lampOn ? '闭合 · 亮起' : '断开 · 熄灭'}`,
    C.panelX + C.panelWidth / 2,
    C.panelRelayY + 30,
    state.lampOn ? p.orange : p.blue,
    18,
    'center',
    700
  );
  text(
    ctx,
    `磁力 ${state.magneticForce.toFixed(2)} N  /  弹簧 ${state.springForce.toFixed(2)} N`,
    C.panelX + C.panelWidth / 2,
    C.panelRelayY + 62,
    p.muted,
    12,
    'center',
    600
  );
  text(
    ctx,
    state.lampOn ? '磁力不足，弹簧拉合电路' : '磁力克服弹簧，触点断开',
    C.panelX + C.panelWidth / 2,
    C.panelRelayY + 86,
    p.ink,
    12,
    'center',
    600
  );
}

export function createPhotoelectricView(
  options: CreatePhotoelectricViewOptions = {}
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
  let snapshot: PhotoelectricState | null = null;
  function draw(state: PhotoelectricState): void {
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
    drawLightSource(ctx, p);
    drawBeam(ctx, state, p);
    drawPhotoTube(ctx, state, p);
    drawPowerChain(ctx, state, p);
    drawPanel(ctx, state, p);
    snapshot = state;
  }
  return {
    draw,
    render(state?: PhotoelectricState): void {
      if (state) draw(state);
      else if (snapshot) draw(snapshot);
    },
    resize(): void {
      stage.resize();
    },
    setTheme(theme: TeachingTheme): void {
      env.setTheme(theme);
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints): void {
      env.setMode(mode, hints);
    },
    dispose(): void {
      stage.release();
    }
  };
}
