import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { wedgeConstants as C, type WedgeState } from './scene.sim';

export type CreateWedgeViewOptions = {
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
  gold: string;
  orange: string;
};
const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfcff',
    panel: '#fff',
    ink: '#303747',
    muted: '#8794a5',
    border: '#d8e1eb',
    grid: '#dce5ef',
    purple: '#7339db',
    blue: '#2f75d2',
    green: '#18a38b',
    gold: '#dc991a',
    orange: '#ef9419'
  },
  dark: {
    bg: '#101929',
    panel: '#172538',
    ink: '#eef3fb',
    muted: '#aab8ca',
    border: '#3d526c',
    grid: '#2b4059',
    purple: '#b28aff',
    blue: '#75adff',
    green: '#40d8ba',
    gold: '#f9c24a',
    orange: '#ffbd4a'
  }
};
const V = {
  graphLeft: 70,
  graphRight: 790,
  graphTop: 112,
  graphBottom: 570,
  wedgeLeft: 126,
  wedgeRight: 724,
  wedgeBase: 428,
  wedgeTop: 210,
  panelRuleY: 62,
  panelRight: 1248,
  cardX: 882,
  cardW: 376,
  gridStep: 54,
  wedgeMaxThickness: 34,
  stripeStart: 28,
  stripeStep: 15,
  cursorPad: 18
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
  stroke: string
): void {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function')
    ctx.roundRect(x, y, width, height, C.cardRadius);
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
  ctx.strokeStyle = `${p.grid}44`;
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
function drawWedge(
  ctx: CanvasRenderingContext2D,
  state: WedgeState,
  p: Palette
): void {
  const thickness = Math.max(
    2,
    (state.localThickness / 800) * V.wedgeMaxThickness
  );
  ctx.fillStyle = `${p.blue}16`;
  ctx.strokeStyle = p.blue;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(V.wedgeLeft, V.wedgeTop);
  ctx.lineTo(V.wedgeRight, V.wedgeTop);
  ctx.lineTo(V.wedgeRight, V.wedgeBase);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = `${p.blue}35`;
  ctx.beginPath();
  ctx.moveTo(V.wedgeLeft, V.wedgeTop);
  ctx.lineTo(V.wedgeRight, V.wedgeTop);
  ctx.lineTo(V.wedgeRight, V.wedgeTop + thickness);
  ctx.lineTo(V.wedgeLeft, V.wedgeTop + 2);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 22; i += 1) {
    const y = V.wedgeTop + V.stripeStart + i * V.stripeStep;
    const phase = i + state.lambda / 80;
    const bright = Math.cos(Math.PI * phase) ** 2;
    ctx.strokeStyle = `rgba(115,57,219,${0.16 + 0.74 * bright})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(V.wedgeLeft + 10, y);
    ctx.lineTo(
      V.wedgeRight - 10,
      y + (state.profile === 'quad' ? i * 0.55 : 0)
    );
    ctx.stroke();
  }
  const cursorY = V.wedgeTop + state.cursorY * (V.wedgeBase - V.wedgeTop);
  ctx.strokeStyle = p.green;
  ctx.setLineDash([8, 6]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(V.wedgeLeft - V.cursorPad, cursorY);
  ctx.lineTo(V.wedgeRight + 10, cursorY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = p.green;
  ctx.beginPath();
  ctx.arc(V.wedgeRight + 10, cursorY, 7, 0, Math.PI * 2);
  ctx.fill();
  text(
    ctx,
    '观察点',
    V.wedgeRight - 10,
    cursorY - 16,
    p.green,
    12,
    'right',
    700
  );
  text(ctx, '薄膜劈尖', V.wedgeLeft, V.wedgeTop - 28, p.ink, 16, 'left', 700);
  text(
    ctx,
    state.profile === 'quad' ? '非均匀厚度' : '线性厚度',
    V.wedgeRight,
    V.wedgeTop - 28,
    p.muted,
    13,
    'right',
    600
  );
  text(
    ctx,
    '反射光干涉条纹',
    V.wedgeLeft + 2,
    V.wedgeBase + 28,
    p.purple,
    13,
    'left',
    700
  );
}
function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: WedgeState,
  p: Palette
): void {
  ctx.fillStyle = p.panel;
  ctx.fillRect(C.panelX, 0, C.panelWidth, C.baseHeight);
  text(ctx, '薄膜干涉·劈尖', C.panelX + 24, 36, p.ink, 22, 'left', 800);
  ctx.strokeStyle = p.border;
  ctx.beginPath();
  ctx.moveTo(C.panelX + 24, V.panelRuleY);
  ctx.lineTo(V.panelRight, V.panelRuleY);
  ctx.stroke();
  card(ctx, V.cardX, 84, V.cardW, 184, p.panel, p.border);
  text(ctx, '局部读数', V.cardX + 22, 112, p.ink, 16, 'left', 700);
  text(
    ctx,
    `厚度 d = ${state.localThickness.toFixed(0)} nm`,
    V.cardX + 22,
    151,
    p.orange,
    14,
    'left',
    700
  );
  text(
    ctx,
    `光程差 Δ = ${state.pathDiff.toFixed(0)} nm`,
    V.cardX + 22,
    181,
    p.blue,
    14,
    'left',
    700
  );
  text(
    ctx,
    `级次 m = ${state.order.toFixed(2)}`,
    V.cardX + 22,
    211,
    p.purple,
    14,
    'left',
    700
  );
  text(
    ctx,
    state.constructive ? '相长：亮纹' : '相消：暗纹',
    V.cardX + 22,
    246,
    state.constructive ? p.green : p.muted,
    16,
    'left',
    800
  );
  card(ctx, V.cardX, 288, V.cardW, 168, p.panel, p.border);
  text(ctx, '公式', V.cardX + 22, 316, p.ink, 16, 'left', 700);
  text(ctx, 'Δ = 2nd + λ/2', V.cardX + 22, 356, p.purple, 18, 'left', 800);
  text(ctx, '明暗随厚度改变', V.cardX + 22, 395, p.green, 14, 'left', 700);
  text(
    ctx,
    `n = ${state.n.toFixed(2)} · λ = ${state.lambda} nm`,
    V.cardX + 22,
    429,
    p.muted,
    12,
    'left',
    600
  );
  card(ctx, V.cardX, 476, V.cardW, 176, p.panel, p.border);
  text(ctx, '观察', V.cardX + 22, 505, p.gold, 16, 'left', 700);
  text(
    ctx,
    '移动观察点，读局部厚度',
    V.cardX + 22,
    544,
    p.ink,
    13,
    'left',
    600
  );
  text(
    ctx,
    '切换厚度分布，看条纹疏密',
    V.cardX + 22,
    572,
    p.ink,
    13,
    'left',
    600
  );
  text(
    ctx,
    state.autoRun ? '观察点缓慢扫描' : '暂停：精确读数',
    V.cardX + 22,
    616,
    p.green,
    13,
    'left',
    700
  );
}
function drawScene(
  ctx: CanvasRenderingContext2D,
  state: WedgeState,
  p: Palette
): void {
  drawGrid(ctx, p);
  text(ctx, '薄膜干涉·劈尖', 34, 36, p.ink, 25, 'left', 800);
  text(ctx, '厚度梯度 ↔ 干涉条纹', 35, 64, p.muted, 14, 'left', 600);
  drawWedge(ctx, state, p);
  drawPanel(ctx, state, p);
}
export function createWedgeFilmInterferenceView(
  options: CreateWedgeViewOptions = {}
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
  let snapshot: WedgeState | null = null;
  function draw(state: WedgeState): void {
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
    render(state: WedgeState): void {
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
