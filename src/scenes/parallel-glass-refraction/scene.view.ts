import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { glassConstants, type GlassState } from './scene.sim';

export type CreateGlassViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

type Palette = {
  bg: string;
  grid: string;
  card: string;
  ink: string;
  muted: string;
  axis: string;
  ray: string;
  teal: string;
  border: string;
  glass: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfcfd',
    grid: '#e7edf2',
    card: '#ffffff',
    ink: '#303744',
    muted: '#8795a7',
    axis: '#35404a',
    ray: '#ef4050',
    teal: '#18a58a',
    border: '#d8e0e8',
    glass: 'rgba(69, 149, 214, 0.16)'
  },
  dark: {
    bg: '#101827',
    grid: '#2b3b52',
    card: '#172235',
    ink: '#eef2f7',
    muted: '#aab6c8',
    axis: '#dbe5ef',
    ray: '#fb7185',
    teal: '#34d399',
    border: '#3c4b61',
    glass: 'rgba(56, 189, 248, 0.18)'
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

function roundedCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  p: Palette,
  fill = p.card
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 13);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function arrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dx: number,
  dy: number,
  color: string,
  width = 3
): void {
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const px = -uy;
  const py = ux;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + dx, y + dy);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + dx, y + dy);
  ctx.lineTo(x + dx - ux * 11 + px * 5, y + dy - uy * 11 + py * 5);
  ctx.lineTo(x + dx - ux * 11 - px * 5, y + dy - uy * 11 - py * 5);
  ctx.closePath();
  ctx.fill();
}

function drawGrid(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, glassConstants.fieldWidth, glassConstants.baseHeight);
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let x = 0; x <= glassConstants.fieldWidth; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, glassConstants.baseHeight);
    ctx.stroke();
  }
  for (let y = 0; y <= glassConstants.baseHeight; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(glassConstants.fieldWidth, y);
    ctx.stroke();
  }
}

function drawAngleArc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  start: number,
  end: number,
  label: string,
  p: Palette,
  scale: number,
  labelOffset = 0
): void {
  ctx.strokeStyle = p.ray;
  ctx.lineWidth = 1.7 * scale;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, start, end);
  ctx.stroke();
  const mid = (start + end) / 2;
  text(
    ctx,
    label,
    cx + Math.cos(mid) * (radius + 15 * scale),
    cy + Math.sin(mid) * (radius + 15 * scale) + labelOffset,
    p.ray,
    13 * scale,
    'center',
    700
  );
}

function drawRaySegment(
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  p: Palette,
  scale: number
): void {
  ctx.strokeStyle = p.ray;
  ctx.lineWidth = 3 * scale;
  ctx.setLineDash([10 * scale, 6 * scale]);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.setLineDash([]);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  arrow(
    ctx,
    from.x + dx * 0.48,
    from.y + dy * 0.48,
    dx * 0.18,
    dy * 0.18,
    p.ray,
    2.6 * scale
  );
}

function pointOnSegment(
  from: { x: number; y: number },
  to: { x: number; y: number },
  t: number
): { x: number; y: number } {
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
}

export function createGlassView(options: CreateGlassViewOptions = {}) {
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: {
      mode: 'clamped',
      fallbackWidth: glassConstants.baseWidth,
      fallbackHeight: glassConstants.baseHeight
    },
    initialWidth: glassConstants.baseWidth,
    initialHeight: glassConstants.baseHeight,
    eagerContext: true
  });
  let snapshot: GlassState | null = null;

  function draw(state: GlassState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(
      width / glassConstants.baseWidth,
      height / glassConstants.baseHeight
    );
    const offsetX = Math.max(0, (width - glassConstants.baseWidth * fit) / 2);
    const offsetY = Math.max(0, (height - glassConstants.baseHeight * fit) / 2);
    const scale = env.contentScale() * stage.responsiveScale;
    const p = PALETTE[env.theme];
    const left = 820;
    const glassX = 72;
    const glassW = 700;
    const top = 218;
    const depth = 30 * state.thickness;
    const bottom = top + depth;
    const p1 = { x: 360, y: top };
    const r = state.refractedRadians;
    const i = state.incidentRadians;
    const sourceLength = 120;
    const source = {
      x: p1.x - sourceLength * Math.sin(i),
      y: p1.y - sourceLength * Math.cos(i)
    };
    const p2 = {
      x: p1.x + depth * Math.tan(r),
      y: bottom
    };
    const straight = { x: p1.x + depth * Math.tan(i), y: bottom };
    const exitLength = Math.min(180, Math.max(80, left - p2.x - 16));
    const exit = {
      x: p2.x + exitLength * Math.sin(i),
      y: p2.y + exitLength * Math.cos(i)
    };

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(fit, fit);
    drawGrid(ctx, p);

    text(ctx, '平行玻璃砖光路分析', 28, 38, p.ink, 25 * scale, 'left', 700);
    text(
      ctx,
      '调节 i、n、d，观察折射与侧移',
      28,
      68,
      p.muted,
      14 * scale,
      'left',
      600
    );

    // Glass slab
    ctx.fillStyle = p.glass;
    ctx.strokeStyle = p.axis;
    ctx.lineWidth = 2.5 * scale;
    ctx.beginPath();
    ctx.roundRect(glassX, top, glassW, depth, 4);
    ctx.fill();
    ctx.stroke();
    text(ctx, '空气', glassX + 12, top - 23, p.muted, 13 * scale, 'left', 600);
    text(
      ctx,
      `玻璃  n=${state.refractiveIndex.toFixed(2)}`,
      glassX + glassW - 12,
      top + 24,
      p.muted,
      14 * scale,
      'right',
      700
    );
    text(
      ctx,
      '空气',
      glassX + glassW - 12,
      bottom + 22,
      p.muted,
      13 * scale,
      'right',
      600
    );

    // Normals and reference continuation
    ctx.strokeStyle = p.muted;
    ctx.lineWidth = 1.5 * scale;
    ctx.setLineDash([8 * scale, 7 * scale]);
    ctx.beginPath();
    ctx.moveTo(p1.x, top - 105 * scale);
    ctx.lineTo(p1.x, bottom + 92 * scale);
    ctx.moveTo(p2.x, bottom - 75 * scale);
    ctx.lineTo(p2.x, bottom + 92 * scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(straight.x, straight.y);
    ctx.stroke();
    ctx.setLineDash([]);
    text(ctx, '法线', p1.x + 10, top - 86, p.muted, 12 * scale, 'left', 600);

    // Three ray segments
    drawRaySegment(ctx, source, p1, p, scale);
    drawRaySegment(ctx, p1, p2, p, scale);
    drawRaySegment(ctx, p2, exit, p, scale);
    ctx.strokeStyle = p.muted;
    ctx.lineWidth = 1.5 * scale;
    ctx.setLineDash([6 * scale, 6 * scale]);
    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    ctx.lineTo(straight.x, straight.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Source and interface points
    ctx.strokeStyle = p.ray;
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.arc(source.x, source.y, 17 * scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = p.ray;
    ctx.beginPath();
    ctx.arc(source.x, source.y, 5 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.ray;
    ctx.beginPath();
    ctx.arc(p1.x, p1.y, 4 * scale, 0, Math.PI * 2);
    ctx.arc(p2.x, p2.y, 4 * scale, 0, Math.PI * 2);
    ctx.fill();
    text(
      ctx,
      '单色光源',
      source.x - 4,
      source.y - 30,
      p.muted,
      13 * scale,
      'center',
      600
    );
    text(ctx, '入射点', p1.x + 14, p1.y + 16, p.muted, 11 * scale, 'left', 600);
    text(ctx, '出射点', p2.x + 13, p2.y + 17, p.muted, 11 * scale, 'left', 600);

    // Angle arcs: all measured from the vertical normal
    drawAngleArc(
      ctx,
      p1.x,
      p1.y,
      42,
      -Math.PI / 2 - i,
      -Math.PI / 2,
      'i',
      p,
      scale,
      -2
    );
    drawAngleArc(
      ctx,
      p1.x,
      p1.y,
      30,
      Math.PI / 2 - r,
      Math.PI / 2,
      'r',
      p,
      scale,
      2
    );
    drawAngleArc(
      ctx,
      p2.x,
      p2.y,
      38,
      Math.PI / 2,
      Math.PI / 2 + i,
      "i'",
      p,
      scale,
      2
    );

    // Lateral shift dimension
    ctx.strokeStyle = p.teal;
    ctx.lineWidth = 2.4 * scale;
    ctx.beginPath();
    ctx.moveTo(p2.x, bottom + 48 * scale);
    ctx.lineTo(straight.x, bottom + 48 * scale);
    ctx.stroke();
    arrow(
      ctx,
      p2.x,
      bottom + 48 * scale,
      Math.max(1, straight.x - p2.x),
      0,
      p.teal,
      2.2 * scale
    );
    arrow(
      ctx,
      straight.x,
      bottom + 48 * scale,
      Math.min(-1, p2.x - straight.x),
      0,
      p.teal,
      2.2 * scale
    );
    ctx.strokeStyle = p.teal;
    ctx.lineWidth = 1.4 * scale;
    ctx.beginPath();
    ctx.moveTo(p2.x, bottom + 8 * scale);
    ctx.lineTo(p2.x, bottom + 57 * scale);
    ctx.moveTo(straight.x, bottom + 8 * scale);
    ctx.lineTo(straight.x, bottom + 57 * scale);
    ctx.stroke();
    text(
      ctx,
      `Δx = ${state.lateralShift.toFixed(2)} cm`,
      (p2.x + straight.x) / 2,
      bottom + 72 * scale,
      p.teal,
      14 * scale,
      'center',
      700
    );

    // Animated photon on the ray path
    if (state.autoRun) {
      const t = state.rayProgress;
      let dot: { x: number; y: number };
      if (t < 0.3) dot = pointOnSegment(source, p1, t / 0.3);
      else if (t < 0.72) dot = pointOnSegment(p1, p2, (t - 0.3) / 0.42);
      else dot = pointOnSegment(p2, exit, (t - 0.72) / 0.28);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = p.ray;
      ctx.lineWidth = 3 * scale;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, 8 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Right-hand data and formula cards
    const cardX = 850;
    const cardW = 320;
    text(ctx, '折射与侧移', cardX, 38, p.ink, 24 * scale, 'left', 700);
    ctx.strokeStyle = p.border;
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.moveTo(cardX, 66 * scale);
    ctx.lineTo(cardX + cardW, 66 * scale);
    ctx.stroke();
    roundedCard(
      ctx,
      cardX,
      92,
      cardW,
      182,
      p,
      env.theme === 'dark' ? '#1d2a3d' : '#eef3f8'
    );
    text(ctx, '实时读数', cardX + 18, 116, p.muted, 15 * scale, 'left', 700);
    const readouts = [
      ['入射角 i', `${state.incidentAngle.toFixed(1)}°`, p.ink],
      [
        '折射角 r',
        `${((state.refractedRadians * 180) / Math.PI).toFixed(1)}°`,
        p.teal
      ],
      ["出射角 i'", `${state.incidentAngle.toFixed(1)}°`, p.ray],
      ['侧移量 Δx', `${state.lateralShift.toFixed(2)} cm`, p.teal]
    ];
    readouts.forEach(([label, value, color], index) => {
      const y = 148 + index * 30;
      text(ctx, label, cardX + 18, y, p.muted, 13 * scale, 'left', 600);
      text(ctx, value, cardX + cardW - 18, y, color, 16 * scale, 'right', 700);
      if (index < readouts.length - 1) {
        ctx.strokeStyle = p.border;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cardX + 16, y + 15);
        ctx.lineTo(cardX + cardW - 16, y + 15);
        ctx.stroke();
      }
    });
    roundedCard(ctx, cardX, 296, cardW, 205, p);
    text(ctx, '关系', cardX + 18, 322, p.teal, 16 * scale, 'left', 700);
    text(
      ctx,
      'sin i = n · sin r',
      cardX + 18,
      356,
      p.ink,
      18 * scale,
      'left',
      700
    );
    text(
      ctx,
      "i' = i（出射光 ∥ 入射光）",
      cardX + 18,
      390,
      p.ray,
      15 * scale,
      'left',
      700
    );
    text(
      ctx,
      'Δx = d · sin(i − r) / cos r',
      cardX + 18,
      424,
      p.teal,
      15 * scale,
      'left',
      700
    );
    text(
      ctx,
      `v玻璃 / v空气 = 1 / n = ${state.speedRatio.toFixed(2)}`,
      cardX + 18,
      463,
      p.muted,
      13 * scale,
      'left',
      600
    );
    text(
      ctx,
      '平行界面：方向改变，频率不变',
      cardX + 18,
      490,
      p.muted,
      12 * scale,
      'left',
      600
    );

    text(
      ctx,
      '光线保持平行，玻璃砖只产生侧移',
      36,
      716,
      p.muted,
      14 * scale,
      'left',
      600
    );
    ctx.restore();
  }

  return {
    render(state: GlassState) {
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
