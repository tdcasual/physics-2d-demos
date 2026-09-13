import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import type { DemoRenderHints } from '../../platform/demo-profile';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import { binaryStarsConstants, type BinaryStarsState } from './scene.sim';

export type CreateBinaryStarsViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

const {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  center: CENTER,
  orbitScale: ORBIT_SCALE,
  fieldWidth: FIELD_WIDTH,
  panelWidth: PANEL_WIDTH,
  badgeX: BADGE_X,
  badgeWidth: BADGE_WIDTH,
  badgeHeight: BADGE_HEIGHT,
  rowsStartY: ROWS_START_Y,
  rowsStepY: ROWS_STEP_Y,
  sectionOneTop: SECTION_ONE_TOP,
  sectionOneHeight: SECTION_ONE_HEIGHT,
  sectionTwoTop: SECTION_TWO_TOP,
  sectionTwoHeight: SECTION_TWO_HEIGHT,
  sectionWidth: SECTION_WIDTH,
  sectionInnerWidth: SECTION_INNER_WIDTH,
  valueBoxWidth: VALUE_BOX_WIDTH,
  valueBoxX: VALUE_BOX_X,
  dividerY: DIVIDER_Y,
  sectionLineY: SECTION_LINE_Y,
  sectionLineX: SECTION_LINE_X,
  forceLineY: FORCE_LINE_Y,
  ratioBoxTop: RATIO_BOX_TOP,
  ratioBoxHeight: RATIO_BOX_HEIGHT
} = binaryStarsConstants;

type Palette = {
  field: string;
  stars: string;
  orbit1: string;
  orbit2: string;
  red: string;
  blue: string;
  teal: string;
  yellow: string;
  ink: string;
  muted: string;
  panel: string;
  border: string;
  soft: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    field: '#071426',
    stars: '#9eb2cc',
    orbit1: '#9b315f',
    orbit2: '#20579d',
    red: '#f03d73',
    blue: '#347cf1',
    teal: '#19d5a2',
    yellow: '#ffc84a',
    ink: '#303746',
    muted: '#7a8798',
    panel: '#ffffff',
    border: '#d4dae4',
    soft: '#f3f5f8'
  },
  dark: {
    field: '#071426',
    stars: '#8ba1bf',
    orbit1: '#e85c91',
    orbit2: '#65a2ff',
    red: '#fb7185',
    blue: '#60a5fa',
    teal: '#34d399',
    yellow: '#facc15',
    ink: '#e5e7eb',
    muted: '#a8b4c4',
    panel: '#111827',
    border: '#344155',
    soft: '#1c2738'
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

function arrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width: number,
  head = 9
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (length < 2) return;
  const ux = dx / length;
  const uy = dy / length;
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
    x2 - ux * head - uy * head * 0.45,
    y2 - uy * head + ux * head * 0.45
  );
  ctx.lineTo(
    x2 - ux * head + uy * head * 0.45,
    y2 - uy * head - ux * head * 0.45
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawStars(ctx: CanvasRenderingContext2D, p: Palette): void {
  const points = [
    [28, 48],
    [86, 116],
    [138, 34],
    [188, 160],
    [252, 76],
    [330, 32],
    [392, 138],
    [456, 62],
    [514, 180],
    [62, 278],
    [136, 354],
    [488, 324],
    [420, 478],
    [232, 548],
    [36, 516]
  ];
  ctx.fillStyle = p.stars;
  for (const [x, y] of points) {
    ctx.globalAlpha = 0.5 + ((x + y) % 3) * 0.18;
    ctx.beginPath();
    ctx.arc(x, y, ((x + y) % 3) + 1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawOrbit(
  ctx: CanvasRenderingContext2D,
  radius: number,
  color: string
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.62;
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 8]);
  ctx.beginPath();
  ctx.arc(CENTER.x, CENTER.y, radius * ORBIT_SCALE, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  mass: number,
  color: string,
  label: string
): void {
  const radius = 12 + mass * 2.4;
  const gradient = ctx.createRadialGradient(
    x - 4,
    y - 5,
    2,
    x,
    y,
    radius * 1.8
  );
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.2, color);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius * 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, label, x, y, '#ffffff', Math.max(12, radius * 0.72), 'center', 700);
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: BinaryStarsState,
  p: Palette,
  contentScale: number
): void {
  const x = FIELD_WIDTH;
  const width = PANEL_WIDTH;
  ctx.fillStyle = p.panel;
  ctx.fillRect(x, 0, width, BASE_H);
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, BASE_H);
  ctx.stroke();
  text(ctx, '双星动力学', x + 24, 34, p.ink, 19 * contentScale, 'left', 700);
  ctx.fillStyle = p.ink;
  ctx.roundRect(x + BADGE_X, 17, BADGE_WIDTH, BADGE_HEIGHT, 8);
  ctx.fill();
  text(ctx, '核心模型', x + 225, 31, p.panel, 11 * contentScale, 'center', 700);
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x + 24, DIVIDER_Y);
  ctx.lineTo(x + width - 24, DIVIDER_Y);
  ctx.stroke();

  const rows = [
    {
      color: p.red,
      label: '星球 1 质量 m₁',
      value: state.params.m1.toFixed(1)
    },
    {
      color: p.blue,
      label: '星球 2 质量 m₂',
      value: state.params.m2.toFixed(1)
    },
    {
      color: '#566072',
      label: '星际总距离 L',
      value: state.params.distance.toFixed(1)
    }
  ];
  rows.forEach((row, index) => {
    const y = ROWS_START_Y + index * ROWS_STEP_Y;
    ctx.fillStyle = row.color;
    ctx.beginPath();
    ctx.arc(x + 28, y, 6, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, row.label, x + 44, y, p.ink, 14 * contentScale, 'left', 600);
    ctx.fillStyle = p.soft;
    ctx.roundRect(x + VALUE_BOX_X, y - 15, VALUE_BOX_WIDTH, 30, 6);
    ctx.fill();
    text(ctx, row.value, x + 240, y, p.ink, 14 * contentScale, 'center', 700);
  });

  ctx.strokeStyle = p.border;
  ctx.beginPath();
  ctx.roundRect(x + 22, SECTION_ONE_TOP, SECTION_WIDTH, SECTION_ONE_HEIGHT, 12);
  ctx.stroke();
  text(
    ctx,
    '规律一：同轴旋转',
    x + 38,
    212,
    p.ink,
    15 * contentScale,
    'left',
    700
  );
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(x + 38, SECTION_LINE_Y);
  ctx.lineTo(x + SECTION_LINE_X, SECTION_LINE_Y);
  ctx.stroke();
  ctx.setLineDash([]);
  text(ctx, '[红] 轨道半径 r₁', x + 38, 254, p.muted, 13 * contentScale);
  text(
    ctx,
    `${state.r1.toFixed(1)} R`,
    x + 246,
    254,
    p.red,
    14 * contentScale,
    'right',
    700
  );
  text(ctx, '[蓝] 轨道半径 r₂', x + 38, 286, p.muted, 13 * contentScale);
  text(
    ctx,
    `${state.r2.toFixed(1)} R`,
    x + 246,
    286,
    p.blue,
    14 * contentScale,
    'right',
    700
  );
  ctx.fillStyle = p.soft;
  ctx.roundRect(
    x + 38,
    RATIO_BOX_TOP,
    SECTION_INNER_WIDTH,
    RATIO_BOX_HEIGHT,
    9
  );
  ctx.fill();
  text(ctx, 'm₁r₁ = m₂r₂', x + 50, 329, p.ink, 13 * contentScale, 'left', 700);
  text(
    ctx,
    `r₁ : r₂ = 1 : ${(state.r2 / Math.max(state.r1, 0.001)).toFixed(1)}`,
    x + 50,
    351,
    p.ink,
    13 * contentScale
  );

  ctx.strokeStyle = p.border;
  ctx.beginPath();
  ctx.roundRect(x + 22, SECTION_TWO_TOP, SECTION_WIDTH, SECTION_TWO_HEIGHT, 12);
  ctx.stroke();
  text(
    ctx,
    '规律二：动力学等同',
    x + 38,
    430,
    p.ink,
    15 * contentScale,
    'left',
    700
  );
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(x + 38, FORCE_LINE_Y);
  ctx.lineTo(x + SECTION_LINE_X, FORCE_LINE_Y);
  ctx.stroke();
  ctx.setLineDash([]);
  text(ctx, '等大引力 = 向心力', x + 38, 474, p.yellow, 13 * contentScale);
  text(
    ctx,
    `F = Gm₁m₂ / L² = ${state.force.toFixed(3)} F₀`,
    x + 38,
    501,
    p.ink,
    13 * contentScale
  );
  text(
    ctx,
    `ω₁ = ω₂ = ${state.omega.toFixed(3)} rad·s⁻¹`,
    x + 38,
    528,
    p.ink,
    13 * contentScale
  );
  text(
    ctx,
    'SPACE 暂停 / 继续',
    x + 142,
    604,
    p.muted,
    12 * contentScale,
    'center'
  );
}

export function createBinaryStarsView(
  options: CreateBinaryStarsViewOptions = {}
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
  let snapshot: BinaryStarsState | null = null;

  function draw(state: BinaryStarsState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(width / BASE_W, height / BASE_H);
    const offsetY = (height - BASE_H * fit) / 2;
    const p = PALETTE[env.theme];
    const contentScale = env.contentScale() * stage.responsiveScale;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(0, offsetY);
    ctx.scale(fit, fit);
    ctx.fillStyle = p.field;
    ctx.fillRect(0, 0, FIELD_WIDTH, BASE_H);
    drawStars(ctx, p);
    drawOrbit(ctx, state.r1, p.orbit1);
    drawOrbit(ctx, state.r2, p.orbit2);
    ctx.save();
    ctx.strokeStyle = '#65748b';
    ctx.globalAlpha = 0.75;
    ctx.setLineDash([5, 7]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(state.position1.x, state.position1.y);
    ctx.lineTo(state.position2.x, state.position2.y);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = '#f2f5fb';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(CENTER.x - 10, CENTER.y);
    ctx.lineTo(CENTER.x + 10, CENTER.y);
    ctx.moveTo(CENTER.x, CENTER.y - 10);
    ctx.lineTo(CENTER.x, CENTER.y + 10);
    ctx.stroke();
    text(
      ctx,
      'O（质心）',
      CENTER.x + 14,
      CENTER.y + 20,
      '#eef2f8',
      14 * contentScale
    );
    drawStar(
      ctx,
      state.position1.x,
      state.position1.y,
      state.params.m1,
      p.red,
      'm₁'
    );
    drawStar(
      ctx,
      state.position2.x,
      state.position2.y,
      state.params.m2,
      p.blue,
      'm₂'
    );

    if (state.params.showVectors) {
      const velocityScale = 155;
      const forceScale = 4200;
      const v1x = state.position1.x + state.velocity1.x * velocityScale;
      const v1y = state.position1.y + state.velocity1.y * velocityScale;
      const v2x = state.position2.x + state.velocity2.x * velocityScale;
      const v2y = state.position2.y + state.velocity2.y * velocityScale;
      arrow(ctx, state.position1.x, state.position1.y, v1x, v1y, p.teal, 3, 11);
      arrow(ctx, state.position2.x, state.position2.y, v2x, v2y, p.teal, 3, 11);
      text(
        ctx,
        'v₁',
        v1x + 9,
        v1y - 10,
        p.teal,
        14 * contentScale,
        'left',
        700
      );
      text(
        ctx,
        'v₂',
        v2x + 9,
        v2y - 10,
        p.teal,
        14 * contentScale,
        'left',
        700
      );
      const dx = state.position2.x - state.position1.x;
      const dy = state.position2.y - state.position1.y;
      const length = Math.hypot(dx, dy) || 1;
      const ux = dx / length;
      const uy = dy / length;
      const forceLength = Math.max(24, Math.min(72, state.force * forceScale));
      arrow(
        ctx,
        state.position1.x,
        state.position1.y,
        state.position1.x + ux * forceLength,
        state.position1.y + uy * forceLength,
        p.yellow,
        3,
        11
      );
      arrow(
        ctx,
        state.position2.x,
        state.position2.y,
        state.position2.x - ux * forceLength,
        state.position2.y - uy * forceLength,
        p.yellow,
        3,
        11
      );
      text(
        ctx,
        'F₁',
        state.position1.x + ux * (forceLength + 15),
        state.position1.y + uy * (forceLength + 15),
        p.yellow,
        14 * contentScale,
        'center',
        700
      );
      text(
        ctx,
        'F₂',
        state.position2.x - ux * (forceLength + 15),
        state.position2.y - uy * (forceLength + 15),
        p.yellow,
        14 * contentScale,
        'center',
        700
      );
    }
    text(
      ctx,
      '双星动力学',
      292,
      594,
      '#eef2f8',
      19 * contentScale,
      'center',
      700
    );
    drawPanel(ctx, state, p, contentScale);
    ctx.restore();
  }

  return {
    render(state: BinaryStarsState): void {
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
