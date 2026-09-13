import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { bulletBlockConstants, type BulletBlockState } from './scene.sim';

export type CreateBulletBlockViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

const {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  trackLeft: TRACK_LEFT,
  trackRight: TRACK_RIGHT,
  trackY: TRACK_Y,
  blockWidth: BLOCK_WIDTH,
  blockHeight: BLOCK_HEIGHT,
  blockTop: BLOCK_TOP,
  bulletLength: BULLET_LENGTH,
  bulletHeight: BULLET_HEIGHT,
  bulletY: BULLET_Y,
  worldScale: WORLD_SCALE,
  rulerStart: RULER_START,
  rulerStep: RULER_STEP,
  rulerCount: RULER_COUNT,
  titleY: TITLE_Y,
  subtitleY: SUBTITLE_Y,
  chartLeft: CHART_LEFT,
  chartTop: CHART_TOP,
  chartWidth: CHART_WIDTH,
  chartHeight: CHART_HEIGHT,
  energyLeft: ENERGY_LEFT,
  energyTop: ENERGY_TOP,
  energyWidth: ENERGY_WIDTH,
  energyHeight: ENERGY_HEIGHT,
  barLeft: BAR_LEFT,
  barWidth: BAR_WIDTH,
  barStepY: BAR_STEP_Y,
  statusX: STATUS_X,
  statusY: STATUS_Y,
  statusLeftOffset: STATUS_LEFT_OFFSET,
  statusWidth: STATUS_WIDTH,
  statusHeight: STATUS_HEIGHT,
  dArrowY: D_ARROW_Y
} = bulletBlockConstants;

type Palette = {
  bg: string;
  ink: string;
  muted: string;
  blue: string;
  red: string;
  green: string;
  pink: string;
  orange: string;
  wood: string;
  woodLine: string;
  panel: string;
  border: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfbfa',
    ink: '#303841',
    muted: '#9aa7b1',
    blue: '#1484dc',
    red: '#ef4050',
    green: '#13a66d',
    pink: '#ed3d91',
    orange: '#f19a16',
    wood: '#d8a264',
    woodLine: '#bb7d43',
    panel: '#ffffff',
    border: '#d9dee4'
  },
  dark: {
    bg: '#101827',
    ink: '#e5e7eb',
    muted: '#94a3b8',
    blue: '#60a5fa',
    red: '#fb7185',
    green: '#34d399',
    pink: '#f472b6',
    orange: '#fbbf24',
    wood: '#9a6235',
    woodLine: '#c08457',
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
  const head = Math.min(10, Math.max(6, length * 0.22));
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

export function createBulletBlockView(
  options: CreateBulletBlockViewOptions = {}
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
  let snapshot: BulletBlockState | null = null;

  function draw(state: BulletBlockState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(width / BASE_W, height / BASE_H);
    const offsetY = (height - BASE_H * fit) / 2;
    const palette = PALETTE[env.theme];
    const contentScale = env.contentScale() * stage.responsiveScale;
    const worldX = (value: number): number => TRACK_LEFT + value * WORLD_SCALE;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(0, offsetY);
    ctx.scale(fit, fit);

    text(
      ctx,
      '光滑水平物理实验台',
      BASE_W / 2,
      TITLE_Y,
      palette.muted,
      22 * contentScale,
      'center'
    );
    text(
      ctx,
      '子弹入射 · 动量守恒 · 内能增加',
      BASE_W / 2,
      SUBTITLE_Y,
      palette.muted,
      14 * contentScale,
      'center'
    );

    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 3 * contentScale;
    ctx.beginPath();
    ctx.moveTo(TRACK_LEFT, TRACK_Y);
    ctx.lineTo(TRACK_RIGHT, TRACK_Y);
    ctx.stroke();
    for (let i = 0; i <= RULER_COUNT; i += 1) {
      const x = worldX(RULER_START + i * RULER_STEP);
      ctx.strokeStyle = palette.muted;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, TRACK_Y);
      ctx.lineTo(x, TRACK_Y + 10);
      ctx.stroke();
      text(
        ctx,
        `${RULER_START + i * RULER_STEP}m`,
        x,
        TRACK_Y + 24,
        palette.ink,
        11 * contentScale,
        'center'
      );
    }

    const blockLeft = worldX(state.blockX);
    const blockWidthPx = BLOCK_WIDTH * WORLD_SCALE;
    ctx.fillStyle = palette.wood;
    ctx.strokeStyle = palette.woodLine;
    ctx.lineWidth = 2 * contentScale;
    ctx.beginPath();
    ctx.roundRect(blockLeft, BLOCK_TOP, blockWidthPx, BLOCK_HEIGHT, 6);
    ctx.fill();
    ctx.stroke();
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(blockLeft, BLOCK_TOP, blockWidthPx, BLOCK_HEIGHT, 6);
    ctx.clip();
    ctx.strokeStyle = palette.woodLine;
    ctx.lineWidth = 1;
    for (let y = BLOCK_TOP + 16; y < BLOCK_TOP + BLOCK_HEIGHT; y += 18) {
      ctx.beginPath();
      ctx.moveTo(blockLeft, y);
      ctx.quadraticCurveTo(
        blockLeft + blockWidthPx * 0.35,
        y + 4,
        blockLeft + blockWidthPx * 0.68,
        y - 3
      );
      ctx.quadraticCurveTo(
        blockLeft + blockWidthPx * 0.85,
        y - 5,
        blockLeft + blockWidthPx,
        y + 1
      );
      ctx.stroke();
    }
    ctx.restore();
    text(
      ctx,
      'M',
      blockLeft + blockWidthPx / 2,
      BLOCK_TOP + BLOCK_HEIGHT / 2,
      palette.ink,
      28 * contentScale,
      'center'
    );

    const bulletLeft = worldX(state.bulletX);
    ctx.fillStyle = palette.ink;
    ctx.beginPath();
    ctx.roundRect(bulletLeft, BULLET_Y, BULLET_LENGTH, BULLET_HEIGHT, 4);
    ctx.fill();
    ctx.fillStyle = palette.pink;
    ctx.beginPath();
    ctx.moveTo(bulletLeft + BULLET_LENGTH, BULLET_Y + BULLET_HEIGHT / 2);
    ctx.lineTo(bulletLeft + BULLET_LENGTH + 16, BULLET_Y + 4);
    ctx.lineTo(bulletLeft + BULLET_LENGTH + 16, BULLET_Y + BULLET_HEIGHT - 4);
    ctx.closePath();
    ctx.fill();
    text(
      ctx,
      'm',
      bulletLeft + 10,
      BULLET_Y - 16,
      palette.pink,
      15 * contentScale,
      'center'
    );

    const depthPx = Math.min(
      BLOCK_WIDTH * WORLD_SCALE,
      state.penetration * WORLD_SCALE
    );
    arrow(
      ctx,
      blockLeft,
      D_ARROW_Y,
      blockLeft + depthPx,
      D_ARROW_Y,
      palette.blue,
      2 * contentScale
    );
    text(
      ctx,
      `d=${state.penetration.toFixed(2)}m`,
      blockLeft + depthPx / 2,
      D_ARROW_Y - 12,
      palette.green,
      13 * contentScale,
      'center'
    );
    arrow(
      ctx,
      bulletLeft + BULLET_LENGTH + 10,
      BULLET_Y - 26,
      bulletLeft + BULLET_LENGTH + 62,
      BULLET_Y - 26,
      palette.pink,
      2 * contentScale
    );
    text(
      ctx,
      `v=${state.bulletSpeed.toFixed(1)}m/s`,
      bulletLeft + BULLET_LENGTH + 36,
      BULLET_Y - 44,
      palette.pink,
      12 * contentScale,
      'center'
    );

    ctx.fillStyle = palette.panel;
    ctx.strokeStyle = palette.border;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(CHART_LEFT, CHART_TOP, CHART_WIDTH, CHART_HEIGHT, 12);
    ctx.fill();
    ctx.stroke();
    text(
      ctx,
      '速度—时间（v-t）',
      CHART_LEFT + CHART_WIDTH / 2,
      CHART_TOP + 20,
      palette.ink,
      14 * contentScale,
      'center'
    );
    const chartX0 = CHART_LEFT + 28;
    const chartY0 = CHART_TOP + CHART_HEIGHT - 24;
    const chartX1 = CHART_LEFT + CHART_WIDTH - 14;
    const chartY1 = CHART_TOP + 42;
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(chartX0, chartY0);
    ctx.lineTo(chartX1, chartY0);
    ctx.moveTo(chartX0, chartY0);
    ctx.lineTo(chartX0, chartY1);
    ctx.stroke();
    const impactTime =
      state.params.speed > 0
        ? state.params.speed === 0
          ? 0
          : 14 / state.params.speed
        : 0;
    const embedTime =
      (state.params.speed * state.params.bulletMass * state.params.blockMass) /
      (2 *
        state.params.resistance *
        (state.params.bulletMass + state.params.blockMass));
    const endTime = Math.max(1, impactTime + embedTime + 0.4);
    const chartY = (speed: number): number =>
      chartY0 -
      (speed / Math.max(state.params.speed, 1)) * (chartY0 - chartY1 - 8);
    const chartX = (time: number): number =>
      chartX0 + (time / endTime) * (chartX1 - chartX0);
    ctx.strokeStyle = palette.pink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(chartX(0), chartY(state.params.speed));
    ctx.lineTo(chartX(impactTime), chartY(state.params.speed));
    ctx.lineTo(chartX(impactTime + embedTime), chartY(state.commonSpeed));
    ctx.lineTo(chartX(endTime), chartY(state.commonSpeed));
    ctx.stroke();
    ctx.strokeStyle = palette.blue;
    ctx.beginPath();
    ctx.moveTo(chartX(0), chartY(0));
    ctx.lineTo(chartX(impactTime), chartY(0));
    ctx.lineTo(chartX(impactTime + embedTime), chartY(state.commonSpeed));
    ctx.lineTo(chartX(endTime), chartY(state.commonSpeed));
    ctx.stroke();
    text(
      ctx,
      '子弹',
      chartX1 - 30,
      chartY(state.params.speed) - 8,
      palette.pink,
      10 * contentScale
    );
    text(
      ctx,
      '木块',
      chartX1 - 30,
      chartY(state.commonSpeed) + 12,
      palette.blue,
      10 * contentScale
    );

    ctx.fillStyle = palette.panel;
    ctx.strokeStyle = palette.border;
    ctx.beginPath();
    ctx.roundRect(
      STATUS_X - STATUS_LEFT_OFFSET,
      STATUS_Y - 24,
      STATUS_WIDTH,
      STATUS_HEIGHT,
      10
    );
    ctx.fill();
    ctx.stroke();
    const phaseLabel =
      state.phase === 'approach'
        ? '接近'
        : state.phase === 'embed'
          ? '嵌入'
          : '共速';
    text(
      ctx,
      phaseLabel,
      STATUS_X,
      STATUS_Y - 5,
      state.phase === 'coast' ? palette.green : palette.blue,
      16 * contentScale,
      'center'
    );
    text(
      ctx,
      `总动量 ${state.totalMomentum.toFixed(1)} ≈ ${state.initialMomentum.toFixed(1)}`,
      STATUS_X,
      STATUS_Y + 16,
      palette.ink,
      11 * contentScale,
      'center'
    );

    ctx.fillStyle = palette.panel;
    ctx.strokeStyle = palette.border;
    ctx.beginPath();
    ctx.roundRect(ENERGY_LEFT, ENERGY_TOP, ENERGY_WIDTH, ENERGY_HEIGHT, 10);
    ctx.fill();
    ctx.stroke();
    text(
      ctx,
      '能量转化',
      ENERGY_LEFT + 16,
      ENERGY_TOP + 16,
      palette.ink,
      13 * contentScale
    );
    const maxEnergy = Math.max(
      1,
      0.5 * state.params.bulletMass * state.params.speed ** 2
    );
    const rows: Array<[string, number, string]> = [
      ['子弹动能', state.bulletEnergy, palette.pink],
      ['木块动能', state.blockEnergy, palette.blue],
      ['内能 Q', state.heat, palette.green]
    ];
    rows.forEach(([label, value, color], index) => {
      const y = ENERGY_TOP + 34 + index * BAR_STEP_Y;
      text(ctx, label, ENERGY_LEFT + 16, y, palette.ink, 11 * contentScale);
      ctx.fillStyle = '#e9edf1';
      ctx.beginPath();
      ctx.roundRect(BAR_LEFT, y - 6, BAR_WIDTH, 12, 6);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(
        BAR_LEFT,
        y - 6,
        Math.min(BAR_WIDTH, (value / maxEnergy) * BAR_WIDTH),
        12,
        6
      );
      ctx.fill();
      text(
        ctx,
        `${value.toFixed(1)}J`,
        BAR_LEFT + BAR_WIDTH + 14,
        y,
        palette.ink,
        11 * contentScale
      );
    });
    ctx.restore();
  }

  return {
    render(state: BulletBlockState): void {
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
