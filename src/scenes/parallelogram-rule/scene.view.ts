import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  parallelogramConstants,
  type ParallelogramStage,
  type ParallelogramState,
  type Vector
} from './scene.sim';

export type CreateParallelogramViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

const {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  origin: ORIGIN,
  vectorScale: VECTOR_SCALE,
  axisTop: AXIS_TOP,
  axisBottom: AXIS_BOTTOM,
  fieldLeft: FIELD_LEFT,
  fieldTop: FIELD_TOP,
  fieldRight: FIELD_RIGHT,
  fieldBottom: FIELD_BOTTOM,
  pointRadius: POINT_RADIUS,
  arcRadius: ARC_RADIUS,
  labelOffset: LABEL_OFFSET,
  protractorLeft: PROTRACTOR_LEFT,
  protractorTop: PROTRACTOR_TOP,
  protractorWidth: PROTRACTOR_WIDTH,
  protractorHeight: PROTRACTOR_HEIGHT,
  panelLeft: PANEL_LEFT,
  panelTop: PANEL_TOP,
  panelWidth: PANEL_WIDTH,
  panelHeight: PANEL_HEIGHT,
  resultLeft: RESULT_LEFT,
  resultTop: RESULT_TOP,
  resultWidth: RESULT_WIDTH,
  resultHeight: RESULT_HEIGHT,
  formulaLeft: FORMULA_LEFT,
  formulaTop: FORMULA_TOP,
  titleY: TITLE_Y,
  subtitleY: SUBTITLE_Y
} = parallelogramConstants;

type Palette = {
  bg: string;
  field: string;
  grid: string;
  ink: string;
  muted: string;
  red: string;
  blue: string;
  green: string;
  orange: string;
  panel: string;
  border: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#f8f5ec',
    field: '#ffffff',
    grid: 'rgba(69,82,100,0.12)',
    ink: '#334155',
    muted: '#8aa0b9',
    red: '#ef4b3e',
    blue: '#2997dc',
    green: '#15a66d',
    orange: '#ec8a14',
    panel: '#ffffff',
    border: '#d7e0eb'
  },
  dark: {
    bg: '#111827',
    field: '#182235',
    grid: 'rgba(148,163,184,0.14)',
    ink: '#e5e7eb',
    muted: '#94a3b8',
    red: '#fb7185',
    blue: '#60a5fa',
    green: '#34d399',
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

function pointOf(vector: Vector): { x: number; y: number } {
  return {
    x: ORIGIN.x + vector.x * VECTOR_SCALE,
    y: ORIGIN.y + vector.y * VECTOR_SCALE
  };
}

function arrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width: number,
  dashed = false
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (length < 2) return;
  const ux = dx / length;
  const uy = dy / length;
  const head = Math.min(12, Math.max(7, length * 0.12));
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dashed ? [5, 5] : []);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - ux * head - uy * head * 0.48,
    y2 - uy * head + ux * head * 0.48
  );
  ctx.lineTo(
    x2 - ux * head + uy * head * 0.48,
    y2 - uy * head - ux * head * 0.48
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function createParallelogramView(
  options: CreateParallelogramViewOptions = {}
) {
  const stage = createCanvasViewport({
    canvas: options.canvas ?? null,
    sizing: { mode: 'clamped', fallbackWidth: BASE_W, fallbackHeight: BASE_H },
    initialWidth: BASE_W,
    initialHeight: BASE_H,
    eagerContext: true
  });
  const env = createViewEnvironment({
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });
  let snapshot: ParallelogramState | null = null;

  function draw(state: ParallelogramState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(width / BASE_W, height / BASE_H);
    const offsetY = (height - BASE_H * fit) / 2;
    const palette = PALETTE[env.theme];
    const contentScale = env.contentScale() * stage.responsiveScale;
    const f1 = pointOf(state.f1);
    const f2 = pointOf(state.f2);
    const r = pointOf(state.resultant);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(0, offsetY);
    ctx.scale(fit, fit);
    text(
      ctx,
      '验证力的平行四边形定则',
      BASE_W / 2,
      TITLE_Y,
      palette.ink,
      22 * contentScale,
      'center'
    );
    text(
      ctx,
      '同一点 · 同效果 · 合力等效',
      BASE_W / 2,
      SUBTITLE_Y,
      palette.muted,
      14 * contentScale,
      'center'
    );

    ctx.fillStyle = palette.field;
    ctx.strokeStyle = palette.border;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(
      FIELD_LEFT,
      FIELD_TOP,
      FIELD_RIGHT - FIELD_LEFT,
      FIELD_BOTTOM - FIELD_TOP,
      12
    );
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1;
    for (let x = FIELD_LEFT; x <= FIELD_RIGHT; x += 44) {
      ctx.beginPath();
      ctx.moveTo(x, FIELD_TOP);
      ctx.lineTo(x, FIELD_BOTTOM);
      ctx.stroke();
    }
    for (let y = FIELD_TOP; y <= FIELD_BOTTOM; y += 44) {
      ctx.beginPath();
      ctx.moveTo(FIELD_LEFT, y);
      ctx.lineTo(FIELD_RIGHT, y);
      ctx.stroke();
    }
    ctx.strokeStyle = palette.muted;
    ctx.setLineDash([7, 6]);
    ctx.beginPath();
    ctx.moveTo(ORIGIN.x, AXIS_TOP);
    ctx.lineTo(ORIGIN.x, AXIS_BOTTOM);
    ctx.stroke();
    ctx.setLineDash([]);
    text(
      ctx,
      '竖直方向轴',
      ORIGIN.x + 10,
      AXIS_TOP + 16,
      palette.muted,
      12 * contentScale
    );

    ctx.fillStyle = palette.panel;
    ctx.strokeStyle = palette.orange;
    ctx.lineWidth = 3 * contentScale;
    ctx.beginPath();
    ctx.arc(ORIGIN.x, ORIGIN.y, POINT_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = palette.orange;
    ctx.beginPath();
    ctx.arc(ORIGIN.x, ORIGIN.y, 4, 0, Math.PI * 2);
    ctx.fill();
    text(
      ctx,
      '标记位置 O',
      ORIGIN.x - 10,
      ORIGIN.y + 32,
      palette.red,
      14 * contentScale,
      'right'
    );

    arrow(ctx, ORIGIN.x, ORIGIN.y, f1.x, f1.y, palette.red, 3 * contentScale);
    arrow(ctx, ORIGIN.x, ORIGIN.y, f2.x, f2.y, palette.blue, 3 * contentScale);
    if (state.params.stage !== 'components') {
      arrow(ctx, ORIGIN.x, ORIGIN.y, r.x, r.y, palette.green, 4 * contentScale);
      arrow(ctx, f1.x, f1.y, r.x, r.y, palette.blue, 1.5 * contentScale, true);
      arrow(ctx, f2.x, f2.y, r.x, r.y, palette.red, 1.5 * contentScale, true);
    }
    text(
      ctx,
      `F₁=${state.params.f1.toFixed(2)}N`,
      f1.x - LABEL_OFFSET,
      f1.y + 20,
      palette.red,
      13 * contentScale,
      'right'
    );
    text(
      ctx,
      `F₂=${state.params.f2.toFixed(2)}N`,
      f2.x + LABEL_OFFSET,
      f2.y + 20,
      palette.blue,
      13 * contentScale
    );
    text(
      ctx,
      `F合=${state.theoreticalMagnitude.toFixed(2)}N`,
      r.x + LABEL_OFFSET,
      r.y + 20,
      palette.green,
      14 * contentScale
    );
    ctx.strokeStyle = palette.muted;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(ORIGIN.x, ORIGIN.y, ARC_RADIUS, 0, Math.PI / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    text(
      ctx,
      `${state.params.angle.toFixed(0)}°`,
      ORIGIN.x + ARC_RADIUS - 5,
      ORIGIN.y + 20,
      palette.muted,
      12 * contentScale
    );

    ctx.fillStyle = palette.panel;
    ctx.strokeStyle = palette.border;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(
      PROTRACTOR_LEFT,
      PROTRACTOR_TOP,
      PROTRACTOR_WIDTH,
      PROTRACTOR_HEIGHT,
      8
    );
    ctx.fill();
    ctx.stroke();
    text(
      ctx,
      '量角器 / 刻度尺',
      PROTRACTOR_LEFT + 16,
      PROTRACTOR_TOP + 18,
      palette.ink,
      12 * contentScale
    );
    ctx.strokeStyle = palette.muted;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PROTRACTOR_LEFT + 20, PROTRACTOR_TOP + 42);
    ctx.lineTo(PROTRACTOR_LEFT + PROTRACTOR_WIDTH - 18, PROTRACTOR_TOP + 42);
    ctx.stroke();
    for (let i = 0; i <= 10; i += 1) {
      const x = PROTRACTOR_LEFT + 20 + i * 17;
      ctx.beginPath();
      ctx.moveTo(x, PROTRACTOR_TOP + 42);
      ctx.lineTo(x, PROTRACTOR_TOP + (i % 5 === 0 ? 30 : 36));
      ctx.stroke();
    }

    ctx.fillStyle = palette.panel;
    ctx.strokeStyle = palette.border;
    ctx.beginPath();
    ctx.roundRect(PANEL_LEFT, PANEL_TOP, PANEL_WIDTH, PANEL_HEIGHT, 12);
    ctx.fill();
    ctx.stroke();
    text(
      ctx,
      '操作步骤',
      PANEL_LEFT + 16,
      PANEL_TOP + 22,
      palette.ink,
      15 * contentScale
    );
    const stages: Array<[string, ParallelogramStage]> = [
      ['1 画 F₁、F₂', 'components'],
      ['2 作平行四边形', 'construct'],
      ['3 合力 F′ 对比', 'compare']
    ];
    stages.forEach(([label, stageName], index) => {
      const y = PANEL_TOP + 56 + index * 42;
      ctx.fillStyle =
        state.params.stage === stageName ? '#eaf5ff' : palette.panel;
      ctx.strokeStyle =
        state.params.stage === stageName ? palette.blue : palette.border;
      ctx.beginPath();
      ctx.roundRect(PANEL_LEFT + 12, y - 16, PANEL_WIDTH - 24, 30, 8);
      ctx.fill();
      ctx.stroke();
      text(
        ctx,
        label,
        PANEL_LEFT + 24,
        y,
        state.params.stage === stageName ? palette.blue : palette.ink,
        12 * contentScale
      );
    });
    text(
      ctx,
      '拖动左侧控件调整力值与夹角',
      PANEL_LEFT + 16,
      PANEL_TOP + PANEL_HEIGHT - 18,
      palette.muted,
      10 * contentScale
    );

    ctx.fillStyle = state.samePoint ? '#ecfff5' : palette.panel;
    ctx.strokeStyle = state.samePoint ? palette.green : palette.border;
    ctx.beginPath();
    ctx.roundRect(RESULT_LEFT, RESULT_TOP, RESULT_WIDTH, RESULT_HEIGHT, 12);
    ctx.fill();
    ctx.stroke();
    text(
      ctx,
      '定量验证',
      RESULT_LEFT + 16,
      RESULT_TOP + 22,
      palette.ink,
      15 * contentScale
    );
    text(
      ctx,
      `理论合力 F：${state.theoreticalMagnitude.toFixed(2)} N`,
      RESULT_LEFT + 16,
      RESULT_TOP + 52,
      palette.green,
      12 * contentScale
    );
    text(
      ctx,
      `实测合力 F′：${state.measuredMagnitude.toFixed(2)} N`,
      RESULT_LEFT + 16,
      RESULT_TOP + 78,
      palette.orange,
      12 * contentScale
    );
    text(
      ctx,
      `大小误差 ${state.magnitudeError.toFixed(1)}% · 方向 ${state.angleError.toFixed(1)}°`,
      RESULT_LEFT + 16,
      RESULT_TOP + 108,
      palette.ink,
      11 * contentScale
    );
    text(
      ctx,
      state.samePoint ? '结论：同点，等效成立' : '先完成作图，再进行对比',
      RESULT_LEFT + 16,
      RESULT_TOP + 132,
      state.samePoint ? palette.green : palette.muted,
      11 * contentScale
    );
    ctx.fillStyle = palette.panel;
    ctx.strokeStyle = palette.border;
    ctx.beginPath();
    ctx.roundRect(FORMULA_LEFT, FORMULA_TOP, FIELD_RIGHT - FORMULA_LEFT, 30, 8);
    ctx.fill();
    ctx.stroke();
    text(
      ctx,
      'F′ = F₁ + F₂',
      FORMULA_LEFT + 16,
      FORMULA_TOP + 15,
      palette.ink,
      13 * contentScale
    );
    text(
      ctx,
      '同一点 O → 作用效果相同',
      FIELD_RIGHT - 16,
      FORMULA_TOP + 15,
      palette.muted,
      12 * contentScale,
      'right'
    );
    ctx.restore();
  }

  return {
    render(state: ParallelogramState): void {
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
