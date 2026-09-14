import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  photoelectricConstants as C,
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
  ink: string;
  muted: string;
  border: string;
  grid: string;
  purple: string;
  blue: string;
  green: string;
  teal: string;
  red: string;
  gold: string;
  photon: string;
};
const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfcff',
    panel: '#ffffff',
    ink: '#303747',
    muted: '#8995a7',
    border: '#d9e1eb',
    grid: '#dde5ee',
    purple: '#7136e4',
    blue: '#3478d9',
    green: '#1aa38c',
    teal: '#159f8b',
    red: '#ee4c5e',
    gold: '#e4a11a',
    photon: '#ffc400'
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
    green: '#46d9bf',
    teal: '#46d9bf',
    red: '#ff7785',
    gold: '#f7c24e',
    photon: '#ffd44d'
  }
};

const V = {
  tubeX: 86,
  tubeY: 92,
  tubeW: 640,
  tubeH: 198,
  cathodeX: 250,
  anodeX: 620,
  plateY: 132,
  plateHeight: 116,
  circuitY: 347,
  circuitMidX: 378,
  circuitRightX: 494,
  tubeBottom: 290,
  graphLeft: 72,
  graphRight: 790,
  graphTop: 438,
  graphBottom: 720,
  graphAxisX: 431,
  graphAxisY: 690,
  panelRuleY: 60,
  panelRight: 1248,
  cardX: 882,
  cardW: 376,
  photonStartX: 110,
  photonEndX: 242,
  photonY: 122,
  electronStartX: 278,
  electronEndX: 594,
  tubeMidY: 190,
  voltageSliderLeft: 180,
  voltageSliderRight: 620,
  voltageSliderY: 389
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
  const a = Math.atan2(y2 - y1, x2 - x1);
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
    x2 - 10 * Math.cos(a - Math.PI / 6),
    y2 - 10 * Math.sin(a - Math.PI / 6)
  );
  ctx.lineTo(
    x2 - 10 * Math.cos(a + Math.PI / 6),
    y2 - 10 * Math.sin(a + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
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
function drawTube(
  ctx: CanvasRenderingContext2D,
  state: PhotoelectricState,
  p: Palette
): void {
  card(ctx, V.tubeX, V.tubeY, V.tubeW, V.tubeH, `${p.panel}ee`, p.border, 66);
  ctx.fillStyle = p.ink;
  ctx.fillRect(V.cathodeX, V.plateY, 13, V.plateHeight);
  ctx.fillRect(V.anodeX, V.plateY, 13, V.plateHeight);
  text(ctx, 'K', V.cathodeX - 4, 120, p.ink, 18, 'center', 800);
  text(ctx, 'A', V.anodeX + 8, 120, p.ink, 18, 'center', 800);
  text(ctx, '真空玻璃管', 406, 111, p.muted, 15, 'center', 600);
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.setLineDash([14, 11]);
  ctx.strokeStyle = p.purple;
  ctx.lineWidth = 5;
  arrow(
    ctx,
    V.photonStartX,
    V.photonY,
    V.photonEndX,
    V.photonY + 66,
    p.purple,
    5
  );
  ctx.restore();
  text(ctx, '入射光', 126, 98, p.purple, 15, 'center', 700);
  const energy = state.effectOn ? 1 : 0.26;
  ctx.fillStyle = p.photon;
  ctx.globalAlpha = energy;
  for (let i = 0; i < 30; i += 1) {
    const px = 284 + ((i * 67 + state.time * 32) % 300);
    const py = 148 + ((i * 37) % 82);
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (state.effectOn) {
    ctx.strokeStyle = p.blue;
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i += 1) {
      const y = 154 + i * 19;
      arrow(
        ctx,
        V.electronStartX,
        y,
        V.electronEndX,
        y + (i - 2) * 3,
        p.blue,
        2
      );
    }
    text(ctx, '电子逸出', 430, 272, p.blue, 13, 'center', 700);
  } else text(ctx, '未发生光电效应', 430, 272, p.red, 14, 'center', 700);
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(V.cathodeX + 6, V.tubeBottom + 2);
  ctx.lineTo(V.cathodeX + 6, V.circuitY);
  ctx.lineTo(V.circuitMidX, V.circuitY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(V.anodeX + 6, V.tubeBottom + 2);
  ctx.lineTo(V.anodeX + 6, V.circuitY);
  ctx.lineTo(V.circuitRightX, V.circuitY);
  ctx.stroke();
  card(ctx, 320, 330, 210, 34, p.panel, p.ink, 8);
  text(ctx, '直流电源 · 可调 U', 425, V.circuitY, p.ink, 13, 'center', 700);
  text(ctx, 'V', 312, V.circuitY, p.ink, 17, 'center', 800);
  text(ctx, 'μA', 548, V.circuitY, p.ink, 17, 'center', 800);
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(V.voltageSliderLeft, V.voltageSliderY);
  ctx.lineTo(V.voltageSliderRight, V.voltageSliderY);
  ctx.stroke();
  const knobX =
    V.voltageSliderLeft +
    ((state.voltage - C.voltageMin) / (C.voltageMax - C.voltageMin)) *
      (V.voltageSliderRight - V.voltageSliderLeft);
  ctx.fillStyle = p.red;
  ctx.beginPath();
  ctx.arc(knobX, V.voltageSliderY, 12, 0, Math.PI * 2);
  ctx.fill();
  text(
    ctx,
    `${state.voltage.toFixed(2)} V`,
    knobX,
    V.voltageSliderY - 22,
    p.red,
    13,
    'center',
    700
  );
  text(
    ctx,
    '−5 V',
    V.voltageSliderLeft,
    V.voltageSliderY + 22,
    p.muted,
    12,
    'left',
    600
  );
  text(
    ctx,
    '+5 V',
    V.voltageSliderRight,
    V.voltageSliderY + 22,
    p.muted,
    12,
    'right',
    600
  );
  text(
    ctx,
    '反向电压 U',
    (V.voltageSliderLeft + V.voltageSliderRight) / 2,
    V.voltageSliderY + 44,
    p.ink,
    13,
    'center',
    700
  );
}
function graphY(current: number, saturation: number): number {
  return V.graphAxisY - (saturation <= 0 ? 0 : current / saturation) * 200;
}
function drawGraph(
  ctx: CanvasRenderingContext2D,
  state: PhotoelectricState,
  p: Palette
): void {
  text(ctx, '光电流 I（μA）', V.graphLeft + 250, 416, p.ink, 16, 'left', 700);
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let x = V.graphLeft; x <= V.graphRight; x += 54) {
    ctx.beginPath();
    ctx.moveTo(x, V.graphTop);
    ctx.lineTo(x, V.graphBottom);
    ctx.stroke();
  }
  for (let y = V.graphTop; y <= V.graphBottom; y += 50) {
    ctx.beginPath();
    ctx.moveTo(V.graphLeft, y);
    ctx.lineTo(V.graphRight, y);
    ctx.stroke();
  }
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2;
  arrow(
    ctx,
    V.graphLeft,
    V.graphAxisY,
    V.graphRight + 18,
    V.graphAxisY,
    p.ink,
    2
  );
  arrow(
    ctx,
    V.graphAxisX,
    V.graphBottom + 16,
    V.graphAxisX,
    V.graphTop - 14,
    p.ink,
    2
  );
  text(
    ctx,
    '电压 U（V）',
    V.graphRight - 30,
    V.graphAxisY + 28,
    p.ink,
    14,
    'right',
    700
  );
  text(
    ctx,
    '0',
    V.graphAxisX - 9,
    V.graphAxisY + 22,
    p.muted,
    12,
    'right',
    600
  );
  const stopX =
    V.graphAxisX -
    (state.stoppingVoltage / C.voltageMax) * (V.graphAxisX - V.graphLeft);
  ctx.strokeStyle = `${p.green}aa`;
  ctx.setLineDash([8, 5]);
  ctx.beginPath();
  ctx.moveTo(stopX, V.graphTop);
  ctx.lineTo(stopX, V.graphAxisY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = p.purple;
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let i = 0; i <= 120; i += 1) {
    const voltage = C.voltageMin + ((C.voltageMax - C.voltageMin) * i) / 120;
    const current =
      !state.effectOn || voltage <= -state.stoppingVoltage
        ? 0
        : state.saturationCurrent *
          (1 - Math.exp(-(voltage + state.stoppingVoltage) / 0.35));
    const x =
      V.graphAxisX + (voltage / C.voltageMax) * (V.graphRight - V.graphAxisX);
    const y = graphY(Math.max(0, current), state.saturationCurrent);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.fillStyle = p.green;
  ctx.beginPath();
  ctx.arc(
    V.graphAxisX,
    graphY(state.current, state.saturationCurrent),
    8,
    0,
    Math.PI * 2
  );
  ctx.fill();
  text(
    ctx,
    `−Uᶜ = ${state.stoppingVoltage.toFixed(2)} V`,
    Math.max(V.graphLeft + 10, stopX - 12),
    V.graphAxisY + 30,
    p.green,
    12,
    'center',
    700
  );
  text(
    ctx,
    `Iₘ = ${state.saturationCurrent.toFixed(1)} μA`,
    V.graphRight - 6,
    graphY(state.saturationCurrent, state.saturationCurrent) - 14,
    p.purple,
    12,
    'right',
    700
  );
}
function metric(
  ctx: CanvasRenderingContext2D,
  label: string,
  value: string,
  x: number,
  y: number,
  color: string,
  p: Palette
): void {
  text(ctx, label, x, y, p.muted, 13, 'left', 600);
  text(ctx, value, x + 332, y, color, 14, 'right', 700);
}
function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: PhotoelectricState,
  p: Palette
): void {
  ctx.fillStyle = p.panel;
  ctx.fillRect(C.panelX, 0, C.panelWidth, C.baseHeight);
  text(ctx, '遏止电压分析', C.panelX + 24, 34, p.ink, 22, 'left', 800);
  ctx.strokeStyle = p.border;
  ctx.beginPath();
  ctx.moveTo(C.panelX + 24, V.panelRuleY);
  ctx.lineTo(V.panelRight, V.panelRuleY);
  ctx.stroke();
  card(
    ctx,
    V.cardX,
    82,
    V.cardW,
    94,
    state.effectOn ? `${p.green}18` : `${p.red}18`,
    p.border
  );
  text(
    ctx,
    state.effectOn ? '发生光电效应' : '未发生光电效应',
    V.cardX + 22,
    115,
    state.effectOn ? p.green : p.red,
    18,
    'left',
    800
  );
  text(
    ctx,
    state.effectOn
      ? `光子 ${state.photonEnergy.toFixed(2)} eV > W₀ ${state.workFunction.toFixed(2)} eV`
      : `光子 ${state.photonEnergy.toFixed(2)} eV ≤ W₀ ${state.workFunction.toFixed(2)} eV`,
    V.cardX + 22,
    148,
    p.muted,
    12,
    'left',
    600
  );
  card(ctx, V.cardX, 194, V.cardW, 164, p.panel, p.border);
  text(ctx, '实时量', V.cardX + 22, 220, p.ink, 16, 'left', 700);
  metric(
    ctx,
    '最大初动能 Eₖ',
    `${state.maxKineticEnergy.toFixed(2)} eV`,
    V.cardX + 22,
    255,
    p.blue,
    p
  );
  metric(
    ctx,
    '理论遏止电压 Uc',
    `${state.stoppingVoltage.toFixed(2)} V`,
    V.cardX + 22,
    286,
    p.green,
    p
  );
  metric(
    ctx,
    '当前外加电压 U',
    `${state.voltage.toFixed(2)} V`,
    V.cardX + 22,
    317,
    p.teal,
    p
  );
  metric(
    ctx,
    '回路光电流 I',
    `${state.current.toFixed(1)} μA`,
    V.cardX + 22,
    348,
    p.red,
    p
  );
  card(ctx, V.cardX, 378, V.cardW, 164, p.panel, p.border);
  text(ctx, '公式', V.cardX + 22, 405, p.ink, 16, 'left', 700);
  text(ctx, 'Eₖ = hν − W₀', V.cardX + 22, 443, p.purple, 18, 'left', 800);
  text(ctx, 'eUc = Eₖ(max)', V.cardX + 22, 478, p.blue, 17, 'left', 800);
  text(ctx, '光强 ↑ → Iₘ ↑', V.cardX + 22, 513, p.teal, 14, 'left', 700);
  card(ctx, V.cardX, 562, V.cardW, 150, p.panel, p.border);
  text(ctx, '观察', V.cardX + 22, 590, p.gold, 16, 'left', 700);
  text(ctx, '改变波长：看阈值', V.cardX + 22, 625, p.ink, 13, 'left', 600);
  text(ctx, '改变电压：看遏止', V.cardX + 22, 651, p.ink, 13, 'left', 600);
  text(ctx, '改变光强：看饱和电流', V.cardX + 22, 677, p.ink, 13, 'left', 600);
}
function drawScene(
  ctx: CanvasRenderingContext2D,
  state: PhotoelectricState,
  p: Palette
): void {
  drawGrid(ctx, p);
  text(ctx, '光电效应·遏止电压', 34, 34, p.ink, 25, 'left', 800);
  text(ctx, '反向电压让光电流逐渐截止', 35, 62, p.muted, 14, 'left', 600);
  drawTube(ctx, state, p);
  drawGraph(ctx, state, p);
  drawPanel(ctx, state, p);
}

export function createPhotoelectricView(
  options: CreatePhotoelectricViewOptions = {}
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
  let snapshot: PhotoelectricState | null = null;
  function draw(state: PhotoelectricState): void {
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
    render(state: PhotoelectricState): void {
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
