import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  freeFallConstants as C,
  type FreeFallState,
  type MotionSegment
} from './scene.sim';

export type CreateFreeFallViewOptions = {
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
  ground: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    panel: '#ffffff',
    soft: '#f3f6f8',
    ink: '#303744',
    muted: '#7d8997',
    grid: '#e1e7ec',
    border: '#d8dfe5',
    blue: '#2585dc',
    teal: '#2b9e93',
    red: '#ef4050',
    orange: '#f09b20',
    gold: '#dda21c',
    ground: '#586270'
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
    ground: '#d0d9e5'
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
  for (let x = 20; x < C.fieldWidth; x += 62) {
    ctx.beginPath();
    ctx.moveTo(x, C.gridTop);
    ctx.lineTo(x, C.baseHeight - 24);
    ctx.stroke();
  }
  for (let y = 90; y < C.baseHeight - 24; y += 62) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(C.fieldWidth, y);
    ctx.stroke();
  }
}

function segmentColor(segment: MotionSegment, p: Palette): string {
  return segment === 'rising' ? p.blue : segment === 'apex' ? p.teal : p.orange;
}

function drawSegmentBar(
  ctx: CanvasRenderingContext2D,
  state: FreeFallState,
  p: Palette
): void {
  const x = 36;
  const y = 62;
  const w = 252;
  const h = 38;
  const labels: Array<[MotionSegment, string]> = [
    ['rising', '上升'],
    ['apex', '最高点'],
    ['falling', '下降']
  ];
  labels.forEach(([segment, label], index) => {
    const sx = x + index * (w / 3);
    ctx.fillStyle =
      state.segment === segment ? `${segmentColor(segment, p)}22` : p.soft;
    ctx.strokeStyle =
      state.segment === segment ? segmentColor(segment, p) : p.border;
    ctx.lineWidth = state.segment === segment ? 2 : 1;
    rounded(ctx, sx, y, w / 3 - 4, h, 9);
    ctx.fill();
    ctx.stroke();
    text(
      ctx,
      label,
      sx + (w / 3 - 4) / 2,
      y + h / 2,
      state.segment === segment ? segmentColor(segment, p) : p.muted,
      13,
      'center',
      700
    );
  });
}

function drawMotion(
  ctx: CanvasRenderingContext2D,
  state: FreeFallState,
  p: Palette
): void {
  const maxHeight = Math.max(10, state.apexHeight);
  const mapY = (height: number) =>
    C.groundY - (height / maxHeight) * (C.groundY - C.motionTop - 32);
  ctx.strokeStyle = p.grid;
  ctx.setLineDash([5, 6]);
  ctx.beginPath();
  ctx.moveTo(C.motionA, C.motionTop);
  ctx.lineTo(C.motionA, C.groundY);
  ctx.moveTo(C.motionB, C.motionTop);
  ctx.lineTo(C.motionB, C.groundY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = p.ground;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(C.motionLeft, C.groundY);
  ctx.lineTo(C.motionRight, C.groundY);
  ctx.stroke();
  for (let x = 32; x < 280; x += 24) {
    ctx.strokeStyle = p.grid;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, C.groundY + 6);
    ctx.lineTo(x - 12, C.groundY + 18);
    ctx.stroke();
  }
  text(ctx, 'h = 0', 32, C.groundY + 31, p.muted, 13, 'left', 600);
  text(
    ctx,
    `Hₘₐₓ = ${state.apexHeight.toFixed(1)} m`,
    42,
    C.motionTop - 16,
    p.teal,
    14,
    'left',
    700
  );
  const aY = mapY(state.height);
  ctx.fillStyle = p.blue;
  ctx.beginPath();
  ctx.arc(C.motionA, aY, C.ballRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.panel;
  ctx.lineWidth = 3;
  ctx.stroke();
  text(ctx, 'A', C.motionA, aY, p.panel, 13, 'center', 700);
  if (state.showVelocity) {
    const direction = state.velocity >= 0 ? -1 : 1;
    arrow(
      ctx,
      177,
      aY + direction * 5,
      177,
      aY + direction * (state.segment === 'apex' ? 18 : 46),
      state.velocity >= 0 ? p.blue : p.orange,
      3
    );
    text(
      ctx,
      `v ${state.velocity >= 0 ? '+' : ''}${state.velocity.toFixed(1)}`,
      189,
      aY + direction * 37,
      state.velocity >= 0 ? p.blue : p.orange,
      12,
      'left',
      700
    );
  }
  if (state.showHeight) {
    ctx.strokeStyle = `${p.teal}99`;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.moveTo(C.motionA, aY);
    ctx.lineTo(C.heightGuideEnd, aY);
    ctx.stroke();
    ctx.setLineDash([]);
    text(ctx, `${state.height.toFixed(1)} m`, 282, aY, p.teal, 12, 'left', 700);
  }
  if (state.mode === 'compare') {
    const bY = mapY(state.bHeight);
    ctx.fillStyle = p.orange;
    ctx.beginPath();
    ctx.arc(C.motionB, bY, C.ballRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = p.panel;
    ctx.lineWidth = 3;
    ctx.stroke();
    text(ctx, 'B', C.motionB, bY, p.panel, 13, 'center', 700);
    text(
      ctx,
      state.bReleased ? '自由落体' : '待释放',
      246,
      bY - 23,
      p.orange,
      12,
      'left',
      700
    );
    if (state.bReleased && state.showVelocity) {
      arrow(ctx, 260, bY + 6, 260, bY + 40, p.orange, 3);
    }
  }
  text(
    ctx,
    state.mode === 'compare'
      ? 'A：竖直上抛　B：自由落体'
      : state.mode === 'reverse'
        ? '上升段倒放'
        : '单球全程',
    36,
    C.groundY + 58,
    p.ink,
    13,
    'left',
    700
  );
}

function graphFrame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  p: Palette
): { left: number; right: number; top: number; bottom: number } {
  ctx.fillStyle = p.panel;
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);
  const left = x + C.graphInsetLeft;
  const right = x + w - C.graphInsetRight;
  const top = y + C.graphInsetTop;
  const bottom = y + h - C.graphInsetBottom;
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let i = 1; i < 6; i += 1) {
    const gx = left + ((right - left) * i) / 6;
    ctx.beginPath();
    ctx.moveTo(gx, top);
    ctx.lineTo(gx, bottom);
    ctx.stroke();
  }
  for (let i = 1; i < 5; i += 1) {
    const gy = top + ((bottom - top) * i) / 5;
    ctx.beginPath();
    ctx.moveTo(left, gy);
    ctx.lineTo(right, gy);
    ctx.stroke();
  }
  text(ctx, title, x + 20, y + 22, p.ink, 18, 'left', 700);
  return { left, right, top, bottom };
}

function drawVelocityGraph(
  ctx: CanvasRenderingContext2D,
  state: FreeFallState,
  p: Palette
): void {
  const frame = graphFrame(
    ctx,
    C.graphX,
    C.velocityGraphY,
    C.velocityGraphWidth,
    C.velocityGraphHeight,
    '速度—时间图（v-t）',
    p
  );
  const maxTime = state.totalTime;
  const xFor = (time: number) =>
    frame.left + (time / maxTime) * (frame.right - frame.left);
  const maxSpeed = Math.max(30, state.initialSpeed + 4);
  const yFor = (velocity: number) =>
    frame.bottom -
    ((velocity + maxSpeed) / (2 * maxSpeed)) * (frame.bottom - frame.top);
  ctx.strokeStyle = p.blue;
  ctx.lineWidth = 3;
  ctx.beginPath();
  state.history.forEach((point, index) => {
    const x = xFor(point.time);
    const y = yFor(point.velocity);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  const currentX = xFor(state.time);
  const currentY = yFor(state.velocity);
  ctx.fillStyle = p.blue;
  ctx.beginPath();
  ctx.arc(currentX, currentY, 6, 0, Math.PI * 2);
  ctx.fill();
  text(
    ctx,
    `v = ${state.velocity >= 0 ? '+' : ''}${state.velocity.toFixed(1)}`,
    Math.min(frame.right - 6, currentX + 12),
    Math.max(frame.top + 16, currentY - 22),
    p.blue,
    12,
    'left',
    700
  );
  text(
    ctx,
    `v / m·s⁻¹`,
    frame.left - 12,
    frame.top - 18,
    p.muted,
    12,
    'right',
    600
  );
  text(
    ctx,
    't / s',
    frame.right + 10,
    frame.bottom + 3,
    p.muted,
    12,
    'left',
    600
  );
  text(
    ctx,
    `a = −${C.gravity} m·s⁻²`,
    frame.right - 6,
    frame.top - 18,
    p.red,
    12,
    'right',
    700
  );
}

function drawHeightGraph(
  ctx: CanvasRenderingContext2D,
  state: FreeFallState,
  p: Palette
): void {
  const frame = graphFrame(
    ctx,
    C.graphX,
    C.heightGraphY,
    C.heightGraphWidth,
    C.heightGraphHeight,
    '高度—时间图（h-t）',
    p
  );
  const maxTime = state.totalTime;
  const xFor = (time: number) =>
    frame.left + (time / maxTime) * (frame.right - frame.left);
  const maxHeight = Math.max(10, state.apexHeight);
  const yFor = (height: number) =>
    frame.bottom - (height / maxHeight) * (frame.bottom - frame.top);
  ctx.strokeStyle = p.teal;
  ctx.lineWidth = 3;
  ctx.beginPath();
  state.history.forEach((point, index) => {
    const x = xFor(point.time);
    const y = yFor(point.height);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  if (state.mode === 'compare') {
    ctx.strokeStyle = p.orange;
    ctx.setLineDash([7, 6]);
    ctx.beginPath();
    for (let i = 0; i <= 40; i += 1) {
      const t = state.riseTime + (state.riseTime * i) / 40;
      const elapsed = t - state.riseTime;
      const h = Math.max(
        0,
        state.apexHeight - 0.5 * C.gravity * elapsed * elapsed
      );
      if (i === 0) ctx.moveTo(xFor(t), yFor(h));
      else ctx.lineTo(xFor(t), yFor(h));
    }
    ctx.stroke();
    ctx.setLineDash([]);
    text(
      ctx,
      'B',
      xFor(state.riseTime) + 8,
      yFor(state.apexHeight) - 12,
      p.orange,
      12,
      'left',
      700
    );
  }
  const currentX = xFor(state.time);
  const currentY = yFor(state.height);
  ctx.fillStyle = p.teal;
  ctx.beginPath();
  ctx.arc(currentX, currentY, 6, 0, Math.PI * 2);
  ctx.fill();
  text(
    ctx,
    `h = ${state.height.toFixed(1)} m`,
    Math.min(frame.right - 10, currentX + 12),
    Math.max(frame.top + 16, currentY - 20),
    p.teal,
    12,
    'left',
    700
  );
  text(
    ctx,
    'h / m',
    frame.left - 12,
    frame.top - 18,
    p.muted,
    12,
    'right',
    600
  );
  text(
    ctx,
    't / s',
    frame.right + 10,
    frame.bottom + 3,
    p.muted,
    12,
    'left',
    600
  );
  text(
    ctx,
    `t上 = ${state.riseTime.toFixed(1)} s`,
    frame.left + 8,
    frame.top - 18,
    p.orange,
    12,
    'left',
    700
  );
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: FreeFallState,
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
    '分段运动看板',
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
    C.panelModeY,
    C.panelWidth - 2 * C.panelInset,
    C.panelModeHeight,
    12
  );
  ctx.fillStyle = `${segmentColor(state.segment, p)}18`;
  ctx.fill();
  text(
    ctx,
    state.mode === 'compare'
      ? '分段对照'
      : state.mode === 'single'
        ? '单球全程'
        : '上升段倒放',
    C.panelX + C.panelWidth / 2,
    C.panelModeY + C.panelModeHeight / 2,
    segmentColor(state.segment, p),
    17,
    'center',
    700
  );
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
  const rows: Array<[string, string, string]> = [
    ['运动时刻 t', `${state.time.toFixed(2)} s`, p.ink],
    ['实时高度 h', `${state.height.toFixed(2)} m`, p.teal],
    [
      '球 A 速度 vA',
      `${state.velocity >= 0 ? '+' : ''}${state.velocity.toFixed(2)} m/s`,
      p.blue
    ],
    [
      '球 B 速度 vB',
      state.mode === 'compare' ? `${state.bVelocity.toFixed(2)} m/s` : '—',
      p.orange
    ],
    ['加速度 a', `${state.acceleration.toFixed(1)} m/s²`, p.red],
    [
      '理论极值',
      `${state.apexHeight.toFixed(1)} m / ${state.totalTime.toFixed(1)} s`,
      p.ink
    ]
  ];
  rows.forEach(([label, value, color], index) => {
    const y = C.panelDataY + 25 + index * 34;
    text(ctx, label, C.panelX + C.panelInset * 2, y, p.muted, 12, 'left', 600);
    text(
      ctx,
      value,
      C.panelX + C.panelWidth - C.panelInset * 2,
      y,
      color,
      14,
      'right',
      700
    );
  });
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
    '核心关系',
    C.panelX + C.panelInset * 2,
    C.panelFormulaY + 26,
    p.teal,
    14,
    'left',
    700
  );
  text(
    ctx,
    'v = v₀ − gt',
    C.panelX + C.panelInset * 2,
    C.panelFormulaY + 59,
    p.ink,
    16,
    'left',
    700
  );
  text(
    ctx,
    'h = v₀t − ½gt²',
    C.panelX + C.panelInset * 2,
    C.panelFormulaY + 91,
    p.ink,
    16,
    'left',
    700
  );
  text(
    ctx,
    't上 = v₀/g',
    C.panelX + C.panelInset * 2,
    C.panelFormulaY + 123,
    p.ink,
    16,
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
  text(
    ctx,
    state.segment === 'rising'
      ? '上升：v 减小，a 向下'
      : state.segment === 'apex'
        ? '最高点：v = 0，a 仍向下'
        : '下降：自由落体，v 增大',
    C.panelX + C.panelInset * 2,
    C.panelHintY + 32,
    segmentColor(state.segment, p),
    14,
    'left',
    700
  );
  text(
    ctx,
    state.mode === 'compare'
      ? `B 在 t = ${state.riseTime.toFixed(1)} s 释放`
      : '忽略空气阻力',
    C.panelX + C.panelInset * 2,
    C.panelHintY + 68,
    p.muted,
    13,
    'left',
    600
  );
}

export function createFreeFallView(options: CreateFreeFallViewOptions = {}) {
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
  let snapshot: FreeFallState | null = null;
  function draw(state: FreeFallState): void {
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
      '自由落体与竖直上抛',
      C.fieldWidth / 2,
      30,
      p.ink,
      22,
      'center',
      700
    );
    text(
      ctx,
      '分段判定 · 图像联动 · 忽略空气阻力',
      C.fieldWidth / 2,
      50,
      p.muted,
      13,
      'center',
      600
    );
    drawSegmentBar(ctx, state, p);
    drawMotion(ctx, state, p);
    drawVelocityGraph(ctx, state, p);
    drawHeightGraph(ctx, state, p);
    drawPanel(ctx, state, p);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  return {
    render(state: FreeFallState) {
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
