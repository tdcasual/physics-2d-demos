import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { radioactiveConstants as C, type RadioactiveState } from './scene.sim';

export type CreateRadioactiveViewOptions = {
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
};
const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfcff',
    panel: '#fff',
    ink: '#303747',
    muted: '#8290a2',
    border: '#d8e1eb',
    grid: '#dce5ef',
    red: '#ef4554',
    blue: '#3174b9',
    teal: '#1ba18b',
    gold: '#d99416'
  },
  dark: {
    bg: '#101929',
    panel: '#172538',
    ink: '#eef3fb',
    muted: '#aab8ca',
    border: '#3d526c',
    grid: '#2b4059',
    red: '#ff7686',
    blue: '#77b0ff',
    teal: '#42d9bd',
    gold: '#f7c24e'
  }
};
const V = {
  gridX: 96,
  gridY: 118,
  gridW: 492,
  gridH: 414,
  gridStep: 20,
  gridRadius: 7,
  graphLeft: 70,
  graphRight: 770,
  graphTop: 540,
  graphBottom: 754,
  graphAxisX: 70,
  panelRuleY: 62,
  panelRight: 1258,
  cardX: 850,
  cardW: 392,
  statY: 98,
  statCardY: 130,
  statCardH: 78,
  lawY: 232,
  lawCardY: 260,
  lawCardH: 158,
  halfLifeCardY: 452,
  halfLifeCardH: 120,
  buttonY: 602,
  buttonH: 54,
  graphScaleX: 112,
  graphScaleY: 210,
  graphTimeMax: 6,
  halfLifeTrackY: 70
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
function nucleusDecayed(index: number, state: RadioactiveState): boolean {
  const u = (((index * 73 + 41) % C.initialCount) + 0.5) / C.initialCount;
  const life = (-Math.log(u) * state.halfLife) / Math.LN2;
  return life <= state.time;
}
function drawNuclei(
  ctx: CanvasRenderingContext2D,
  state: RadioactiveState,
  p: Palette
): void {
  card(
    ctx,
    V.gridX - 22,
    V.gridY - 22,
    V.gridW,
    V.gridH,
    `${p.panel}dd`,
    p.border
  );
  for (let row = 0; row < C.gridRows; row += 1)
    for (let col = 0; col < C.gridCols; col += 1) {
      const i = row * C.gridCols + col;
      const x = V.gridX + col * V.gridStep;
      const y = V.gridY + row * V.gridStep;
      ctx.fillStyle = nucleusDecayed(i, state) ? p.blue : p.red;
      ctx.beginPath();
      ctx.arc(x, y, V.gridRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  text(
    ctx,
    `微观衰变模拟（N₀ = ${state.initialCount}）`,
    V.gridX + 190,
    V.gridY - 28,
    p.ink,
    18,
    'center',
    700
  );
}
function graphX(time: number): number {
  return (
    V.graphLeft + Math.min(V.graphTimeMax, Math.max(0, time)) * V.graphScaleX
  );
}
function graphY(value: number): number {
  return V.graphBottom - (value / C.initialCount) * V.graphScaleY;
}
function drawGraph(
  ctx: CanvasRenderingContext2D,
  state: RadioactiveState,
  p: Palette
): void {
  text(
    ctx,
    '宏观统计规律（N–t）',
    V.graphLeft + 205,
    520,
    p.ink,
    18,
    'left',
    700
  );
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let y = 0; y <= C.initialCount; y += 100) {
    ctx.beginPath();
    ctx.moveTo(V.graphLeft, graphY(y));
    ctx.lineTo(V.graphRight, graphY(y));
    ctx.stroke();
  }
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(V.graphLeft, V.graphBottom);
  ctx.lineTo(V.graphRight + 14, V.graphBottom);
  ctx.moveTo(V.graphLeft, V.graphBottom);
  ctx.lineTo(V.graphLeft, V.graphTop - 16);
  ctx.stroke();
  text(
    ctx,
    '核数 N',
    V.graphLeft - 18,
    V.graphTop - 20,
    p.ink,
    13,
    'right',
    700
  );
  text(
    ctx,
    't / s',
    V.graphRight + 16,
    V.graphBottom + 2,
    p.ink,
    13,
    'left',
    700
  );
  for (let t = 0; t <= V.graphTimeMax; t += 1)
    text(
      ctx,
      `${t}T`,
      graphX(t * state.halfLife),
      V.graphBottom + 22,
      p.teal,
      12,
      'center',
      700
    );
  ctx.setLineDash([8, 6]);
  ctx.strokeStyle = `${p.teal}bb`;
  for (let k = 1; k <= 3; k += 1) {
    const y = C.initialCount / 2 ** k;
    const x = graphX(k * state.halfLife);
    ctx.beginPath();
    ctx.moveTo(V.graphLeft, graphY(y));
    ctx.lineTo(x, graphY(y));
    ctx.lineTo(x, V.graphBottom);
    ctx.stroke();
    text(ctx, `1/${2 ** k}`, x + 8, graphY(y) - 10, p.teal, 12, 'left', 700);
  }
  ctx.setLineDash([]);
  ctx.strokeStyle = `${p.red}55`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 80; i += 1) {
    const t = (V.graphTimeMax * state.halfLife * i) / 80;
    const x = graphX(t);
    const y = graphY(C.initialCount * Math.pow(0.5, t / state.halfLife));
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.strokeStyle = p.red;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i <= 80; i += 1) {
    const t = (state.time * i) / 80;
    const x = graphX(t);
    const y = graphY(
      C.initialCount *
        Math.max(0, 1 - (1 - state.remaining / C.initialCount) * (i / 80))
    );
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.fillStyle = p.red;
  ctx.beginPath();
  ctx.arc(graphX(state.time), graphY(state.remaining), 6, 0, Math.PI * 2);
  ctx.fill();
}
function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: RadioactiveState,
  p: Palette
): void {
  ctx.fillStyle = p.panel;
  ctx.fillRect(C.panelX, 0, C.panelWidth, C.baseHeight);
  text(ctx, '运行实时统计', C.panelX + 26, 36, p.ink, 22, 'left', 800);
  ctx.strokeStyle = p.border;
  ctx.beginPath();
  ctx.moveTo(C.panelX + 26, V.panelRuleY);
  ctx.lineTo(V.panelRight, V.panelRuleY);
  ctx.stroke();
  text(
    ctx,
    `运行时间 t：${state.time.toFixed(2)} s`,
    V.cardX + 22,
    V.statY,
    p.ink,
    15,
    'left',
    700
  );
  card(ctx, V.cardX, V.statCardY, V.cardW, V.statCardH, `${p.red}12`, p.border);
  text(
    ctx,
    '未衰变 N（母核）',
    V.cardX + 22,
    V.statCardY + 28,
    p.red,
    15,
    'left',
    700
  );
  text(
    ctx,
    `${state.remaining}`,
    V.panelRight - 22,
    V.statCardY + 28,
    p.red,
    20,
    'right',
    800
  );
  text(
    ctx,
    '已衰变 ΔN（子核）',
    V.cardX + 22,
    V.statCardY + 58,
    p.blue,
    15,
    'left',
    700
  );
  text(
    ctx,
    `${state.decayed}`,
    V.panelRight - 22,
    V.statCardY + 58,
    p.blue,
    20,
    'right',
    800
  );
  text(ctx, '核心物理推导', V.cardX, V.lawY, p.ink, 17, 'left', 700);
  card(ctx, V.cardX, V.lawCardY, V.cardW, V.lawCardH, p.panel, p.border);
  text(
    ctx,
    'N(t) = N₀ · (1/2)ᵗ⧸ᵀ',
    V.cardX + V.cardW / 2,
    V.lawCardY + 38,
    p.red,
    22,
    'center',
    800
  );
  text(
    ctx,
    'T 为半衰期，λ = ln2 / T',
    V.cardX + 22,
    V.lawCardY + 84,
    p.muted,
    14,
    'left',
    600
  );
  text(
    ctx,
    '单个核随机，总体呈统计规律',
    V.cardX + 22,
    V.lawCardY + 118,
    p.teal,
    14,
    'left',
    700
  );
  card(
    ctx,
    V.cardX,
    V.halfLifeCardY,
    V.cardW,
    V.halfLifeCardH,
    p.panel,
    p.border
  );
  text(
    ctx,
    '设定半衰期 T',
    V.cardX + 22,
    V.halfLifeCardY + 28,
    p.ink,
    15,
    'left',
    700
  );
  text(
    ctx,
    `${state.halfLife.toFixed(1)} s`,
    V.panelRight - 22,
    V.halfLifeCardY + 28,
    p.teal,
    18,
    'right',
    800
  );
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(V.cardX + 22, V.halfLifeCardY + V.halfLifeTrackY);
  ctx.lineTo(V.panelRight - 22, V.halfLifeCardY + V.halfLifeTrackY);
  ctx.stroke();
  text(
    ctx,
    '空格：暂停 / 继续',
    V.cardX + 22,
    V.buttonY + V.buttonH + 28,
    p.muted,
    13,
    'left',
    600
  );
}
function drawScene(
  ctx: CanvasRenderingContext2D,
  state: RadioactiveState,
  p: Palette
): void {
  drawGrid(ctx, p);
  text(
    ctx,
    '放射性元素衰变规律',
    C.fieldWidth / 2,
    34,
    p.ink,
    25,
    'center',
    800
  );
  text(
    ctx,
    '微观随机性与宏观统计规律',
    C.fieldWidth / 2,
    68,
    p.muted,
    15,
    'center',
    600
  );
  drawNuclei(ctx, state, p);
  drawGraph(ctx, state, p);
  drawPanel(ctx, state, p);
}
export function createRadioactiveView(
  options: CreateRadioactiveViewOptions = {}
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
  let snapshot: RadioactiveState | null = null;
  function draw(state: RadioactiveState): void {
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
    render(state: RadioactiveState): void {
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
