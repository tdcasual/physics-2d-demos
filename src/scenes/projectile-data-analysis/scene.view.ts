import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { projectileDataConstants, type ProjectileDataState } from './scene.sim';

export type CreateProjectileDataViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

const {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  originX: ORIGIN_X,
  originY: ORIGIN_Y,
  axisEndX: AXIS_END_X,
  axisEndY: AXIS_END_Y,
  gridStepX: GRID_STEP_X,
  gridStepY: GRID_STEP_Y,
  gridCountX: GRID_COUNT_X,
  gridCountY: GRID_COUNT_Y,
  xScale: X_SCALE,
  yScale: Y_SCALE,
  pointRadius: POINT_RADIUS,
  labelOffsetX: LABEL_OFFSET_X,
  labelOffsetY: LABEL_OFFSET_Y,
  trajectorySampleCount: TRAJECTORY_SAMPLE_COUNT,
  vectorScale: VECTOR_SCALE,
  analysisLeft: ANALYSIS_LEFT,
  analysisTop: ANALYSIS_TOP,
  analysisWidth: ANALYSIS_WIDTH,
  analysisHeight: ANALYSIS_HEIGHT,
  formulaLeft: FORMULA_LEFT,
  formulaTop: FORMULA_TOP,
  formulaMid: FORMULA_MID,
  formulaRight: FORMULA_RIGHT,
  titleY: TITLE_Y,
  subtitleY: SUBTITLE_Y
} = projectileDataConstants;

type Palette = {
  bg: string;
  grid: string;
  ink: string;
  muted: string;
  blue: string;
  red: string;
  green: string;
  purple: string;
  orange: string;
  panel: string;
  border: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfaf7',
    grid: '#ddd8cf',
    ink: '#2f3640',
    muted: '#8291a6',
    blue: '#1683dc',
    red: '#ef4050',
    green: '#159a74',
    purple: '#7d32c8',
    orange: '#f59f18',
    panel: '#ffffff',
    border: '#cfd7e3'
  },
  dark: {
    bg: '#101827',
    grid: '#334155',
    ink: '#e5e7eb',
    muted: '#94a3b8',
    blue: '#60a5fa',
    red: '#fb7185',
    green: '#34d399',
    purple: '#c084fc',
    orange: '#fbbf24',
    panel: '#182235',
    border: '#475569'
  }
};

function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  color: string,
  size: number,
  align: CanvasTextAlign = 'left'
): void {
  ctx.fillStyle = color;
  ctx.font = `600 ${size}px sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

function arrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width: number
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (length < 2) return;
  const ux = dx / length;
  const uy = dy / length;
  const head = Math.min(12, Math.max(7, length * 0.2));
  ctx.save();
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
    x2 - ux * head - uy * head * 0.5,
    y2 - uy * head + ux * head * 0.5
  );
  ctx.lineTo(
    x2 - ux * head + uy * head * 0.5,
    y2 - uy * head - ux * head * 0.5
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function createProjectileDataView(
  options: CreateProjectileDataViewOptions = {}
) {
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: {
      mode: 'clamped',
      fallbackWidth: BASE_W,
      fallbackHeight: BASE_H
    },
    initialWidth: BASE_W,
    initialHeight: BASE_H,
    eagerContext: true
  });
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  let snapshot: ProjectileDataState | null = null;

  function draw(state: ProjectileDataState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(width / BASE_W, height / BASE_H);
    const offsetY = (height - BASE_H * fit) / 2;
    const palette = PALETTE[env.theme];
    const contentScale = env.contentScale() * stage.responsiveScale;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(0, offsetY);
    ctx.scale(fit, fit);

    text(
      ctx,
      '平抛实验数据还原',
      BASE_W / 2,
      TITLE_Y,
      palette.ink,
      22 * contentScale,
      'center'
    );
    text(
      ctx,
      state.params.mode === 'strobe'
        ? '频闪等时间隔 · 轨迹与数据联动'
        : '水平匀速 · 竖直自由落体',
      BASE_W / 2,
      SUBTITLE_Y,
      palette.muted,
      14 * contentScale,
      'center'
    );

    ctx.fillStyle = palette.panel;
    ctx.strokeStyle = palette.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(
      ORIGIN_X - 28,
      ORIGIN_Y - 30,
      AXIS_END_X - ORIGIN_X + 48,
      AXIS_END_Y - ORIGIN_Y + 36,
      12
    );
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_COUNT_X; i += 1) {
      const x = ORIGIN_X + i * GRID_STEP_X;
      ctx.beginPath();
      ctx.moveTo(x, ORIGIN_Y);
      ctx.lineTo(x, AXIS_END_Y);
      ctx.stroke();
    }
    for (let i = 0; i <= GRID_COUNT_Y; i += 1) {
      const y = ORIGIN_Y + i * GRID_STEP_Y;
      ctx.beginPath();
      ctx.moveTo(ORIGIN_X, y);
      ctx.lineTo(AXIS_END_X, y);
      ctx.stroke();
    }

    ctx.strokeStyle = palette.ink;
    ctx.fillStyle = palette.ink;
    ctx.lineWidth = 2 * contentScale;
    ctx.beginPath();
    ctx.moveTo(ORIGIN_X, ORIGIN_Y);
    ctx.lineTo(AXIS_END_X, ORIGIN_Y);
    ctx.moveTo(ORIGIN_X, ORIGIN_Y);
    ctx.lineTo(ORIGIN_X, AXIS_END_Y);
    ctx.stroke();
    arrow(
      ctx,
      AXIS_END_X - 22,
      ORIGIN_Y,
      AXIS_END_X,
      ORIGIN_Y,
      palette.ink,
      2 * contentScale
    );
    arrow(
      ctx,
      ORIGIN_X,
      AXIS_END_Y - 22,
      ORIGIN_X,
      AXIS_END_Y,
      palette.ink,
      2 * contentScale
    );
    text(
      ctx,
      '+x（水平/m）',
      AXIS_END_X - 4,
      ORIGIN_Y + 24,
      palette.ink,
      13 * contentScale,
      'right'
    );
    text(
      ctx,
      '+y（竖直向下/m）',
      ORIGIN_X - 4,
      AXIS_END_Y + 10,
      palette.ink,
      13 * contentScale,
      'right'
    );
    text(
      ctx,
      'O(0)',
      ORIGIN_X - 10,
      ORIGIN_Y + 26,
      palette.ink,
      14 * contentScale,
      'right'
    );

    for (let i = 1; i <= GRID_COUNT_X; i += 1) {
      text(
        ctx,
        `${(i * 0.4).toFixed(1)}m`,
        ORIGIN_X + i * GRID_STEP_X,
        ORIGIN_Y - 14,
        palette.muted,
        11 * contentScale,
        'center'
      );
    }
    for (let i = 1; i <= GRID_COUNT_Y; i += 1) {
      text(
        ctx,
        `${(i * 0.4).toFixed(1)}m`,
        ORIGIN_X - 12,
        ORIGIN_Y + i * GRID_STEP_Y,
        palette.muted,
        11 * contentScale,
        'right'
      );
    }

    const points = state.points;
    const toCanvas = (x: number, y: number): { x: number; y: number } => ({
      x: ORIGIN_X + x * X_SCALE,
      y: ORIGIN_Y + y * Y_SCALE
    });
    const trajectoryEnd = points[points.length - 1];
    ctx.strokeStyle = palette.red;
    ctx.lineWidth = 2.5 * contentScale;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    for (let i = 0; i <= TRAJECTORY_SAMPLE_COUNT; i += 1) {
      const ratio = i / TRAJECTORY_SAMPLE_COUNT;
      const x = trajectoryEnd.x * ratio;
      const y =
        0.5 *
        state.params.gravity *
        (x / Math.max(state.params.v0, 0.001)) ** 2;
      const point = toCanvas(x, y);
      if (i === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    for (const point of points) {
      const position = toCanvas(point.x, point.y);
      ctx.fillStyle = palette.orange;
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(position.x, position.y, POINT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      const label =
        point.index === 0
          ? 'O(0)'
          : `${String.fromCharCode(64 + point.index)}(${point.index}T)`;
      text(
        ctx,
        label,
        position.x + LABEL_OFFSET_X,
        position.y + LABEL_OFFSET_Y,
        palette.ink,
        13 * contentScale
      );
      if (point.index > 0 && point.index <= 4) {
        const previous = toCanvas(
          points[point.index - 1].x,
          points[point.index - 1].y
        );
        ctx.strokeStyle = palette.green;
        ctx.lineWidth = 2 * contentScale;
        arrow(
          ctx,
          position.x,
          previous.y,
          position.x,
          position.y,
          palette.green,
          2 * contentScale
        );
        text(
          ctx,
          `Δy${point.index}=${point.deltaY.toFixed(2)}m`,
          position.x + 8,
          (previous.y + position.y) / 2,
          palette.green,
          11 * contentScale
        );
      }
      if (point.index > 0) {
        ctx.strokeStyle = palette.blue;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(position.x, position.y);
        ctx.lineTo(position.x, ORIGIN_Y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    const current = toCanvas(state.current.x, state.current.y);
    ctx.strokeStyle = palette.red;
    ctx.lineWidth = 3 * contentScale;
    ctx.beginPath();
    ctx.arc(current.x, current.y, POINT_RADIUS + 7, 0, Math.PI * 2);
    ctx.stroke();
    if (state.params.showVectors) {
      arrow(
        ctx,
        current.x,
        current.y,
        current.x + state.vx * VECTOR_SCALE,
        current.y,
        palette.blue,
        2.5 * contentScale
      );
      arrow(
        ctx,
        current.x,
        current.y,
        current.x,
        current.y + state.vy * VECTOR_SCALE,
        palette.purple,
        2.5 * contentScale
      );
      text(
        ctx,
        'vₓ=v₀',
        current.x + state.vx * VECTOR_SCALE + 8,
        current.y - 14,
        palette.blue,
        12 * contentScale
      );
      text(
        ctx,
        'vᵧ=gt',
        current.x + 8,
        current.y + state.vy * VECTOR_SCALE + 14,
        palette.purple,
        12 * contentScale
      );
    }

    ctx.fillStyle = palette.panel;
    ctx.strokeStyle = palette.border;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(
      ANALYSIS_LEFT,
      ANALYSIS_TOP,
      ANALYSIS_WIDTH,
      ANALYSIS_HEIGHT,
      12
    );
    ctx.fill();
    ctx.stroke();
    text(
      ctx,
      '分力分析',
      ANALYSIS_LEFT + 16,
      ANALYSIS_TOP + 22,
      palette.ink,
      15 * contentScale
    );
    text(
      ctx,
      '水平：Fₓ=0  ·  vₓ=v₀',
      ANALYSIS_LEFT + 16,
      ANALYSIS_TOP + 56,
      palette.blue,
      12 * contentScale
    );
    text(
      ctx,
      '竖直：Fᵧ=mg  ·  aᵧ=g',
      ANALYSIS_LEFT + 16,
      ANALYSIS_TOP + 84,
      palette.purple,
      12 * contentScale
    );
    text(
      ctx,
      `当前 ${state.current.index}T  ·  t=${state.current.time.toFixed(2)}s`,
      ANALYSIS_LEFT + 16,
      ANALYSIS_TOP + 108,
      palette.muted,
      11 * contentScale
    );

    ctx.fillStyle = palette.panel;
    ctx.strokeStyle = palette.border;
    ctx.beginPath();
    ctx.roundRect(
      FORMULA_LEFT,
      FORMULA_TOP,
      FORMULA_RIGHT - FORMULA_LEFT,
      36,
      10
    );
    ctx.fill();
    ctx.stroke();
    text(
      ctx,
      `Δx=v₀T=${state.deltaX.toFixed(3)}m`,
      FORMULA_LEFT + 14,
      FORMULA_TOP + 18,
      palette.blue,
      13 * contentScale
    );
    text(
      ctx,
      `Δ²y=gT²=${state.deltaY2.toFixed(3)}m`,
      FORMULA_MID,
      FORMULA_TOP + 18,
      palette.green,
      13 * contentScale,
      'center'
    );
    text(
      ctx,
      `v₀=Δx/T=${state.restoredV0.toFixed(2)}m/s`,
      FORMULA_RIGHT - 14,
      FORMULA_TOP + 18,
      palette.red,
      13 * contentScale,
      'right'
    );
    ctx.restore();
  }

  return {
    render(state: ProjectileDataState): void {
      snapshot = state;
      stage.ensureSized();
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
