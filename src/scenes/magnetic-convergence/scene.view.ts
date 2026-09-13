import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import { createCanvasViewport, createViewEnvironment } from '../view-base';
import {
  magneticConvergenceConstants,
  type MagneticConvergenceState,
  type MagneticParticlePath,
  type Point
} from './scene.sim';

export type CreateMagneticConvergenceViewOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

const {
  baseWidth: BASE_W,
  baseHeight: BASE_H,
  fieldWidth: FIELD_W,
  panelX: PANEL_X,
  panelWidth: PANEL_W,
  panelInset: INSET,
  fieldCenterX: CENTER_X,
  fieldCenterY: CENTER_Y,
  fieldRadius: FIELD_R,
  fieldTop: FIELD_TOP,
  fieldBottom: FIELD_BOTTOM,
  gridStep: GRID_STEP,
  particleRadius: PARTICLE_R,
  titleY: TITLE_Y,
  panelRuleY: PANEL_RULE_Y,
  modeCardY: MODE_Y,
  modeCardHeight: MODE_H,
  ratioCardY: RATIO_Y,
  ratioCardHeight: RATIO_H,
  statusCardY: STATUS_Y,
  statusCardHeight: STATUS_H,
  formulaCardY: FORMULA_Y,
  formulaCardHeight: FORMULA_H,
  footerY: FOOTER_Y,
  cardRadius: CARD_RADIUS
} = magneticConvergenceConstants;

type Palette = {
  bg: string;
  panel: string;
  ink: string;
  muted: string;
  border: string;
  grid: string;
  field: string;
  fieldEdge: string;
  particle: string;
  accent: string;
  gold: string;
  danger: string;
};

const PALETTE: Record<TeachingTheme, Palette> = {
  light: {
    bg: '#fbfcfe',
    panel: '#ffffff',
    ink: '#303b4d',
    muted: '#7b8798',
    border: '#d5deea',
    grid: '#d6e0ea',
    field: '#eef7fb',
    fieldEdge: '#4d88aa',
    particle: '#ef5961',
    accent: '#2486a8',
    gold: '#d98a12',
    danger: '#e5484d'
  },
  dark: {
    bg: '#101827',
    panel: '#172235',
    ink: '#eef4fb',
    muted: '#aab7ca',
    border: '#40516b',
    grid: '#2d405c',
    field: '#172f43',
    fieldEdge: '#78b7d2',
    particle: '#fb7185',
    accent: '#53d3ee',
    gold: '#fbbf24',
    danger: '#ff7c86'
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
  radius = CARD_RADIUS
): void {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function')
    ctx.roundRect(x, y, width, height, radius);
  else ctx.rect(x, y, width, height);
}

function drawFieldBase(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  showField: boolean
): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, FIELD_W, BASE_H);
  if (!showField) return;
  ctx.fillStyle = p.field;
  ctx.beginPath();
  ctx.arc(CENTER_X, CENTER_Y, FIELD_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `${p.grid}88`;
  ctx.lineWidth = 1;
  for (let x = CENTER_X - FIELD_R; x <= CENTER_X + FIELD_R; x += GRID_STEP) {
    ctx.beginPath();
    ctx.moveTo(x, FIELD_TOP);
    ctx.lineTo(x, FIELD_BOTTOM);
    ctx.stroke();
  }
  for (let y = CENTER_Y - FIELD_R; y <= CENTER_Y + FIELD_R; y += GRID_STEP) {
    ctx.beginPath();
    ctx.moveTo(CENTER_X - FIELD_R, y);
    ctx.lineTo(CENTER_X + FIELD_R, y);
    ctx.stroke();
  }
  ctx.strokeStyle = p.fieldEdge;
  ctx.lineWidth = 3;
  ctx.setLineDash([9, 8]);
  ctx.beginPath();
  ctx.arc(CENTER_X, CENTER_Y, FIELD_R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = `${p.fieldEdge}70`;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 7]);
  ctx.beginPath();
  ctx.moveTo(CENTER_X - FIELD_R, CENTER_Y);
  ctx.lineTo(CENTER_X + FIELD_R, CENTER_Y);
  ctx.moveTo(CENTER_X, CENTER_Y - FIELD_R);
  ctx.lineTo(CENTER_X, CENTER_Y + FIELD_R);
  ctx.stroke();
  ctx.setLineDash([]);
  for (
    let x = CENTER_X - FIELD_R + GRID_STEP / 2;
    x < CENTER_X + FIELD_R;
    x += GRID_STEP
  ) {
    for (
      let y = CENTER_Y - FIELD_R + GRID_STEP / 2;
      y < CENTER_Y + FIELD_R;
      y += GRID_STEP
    ) {
      if (Math.hypot(x - CENTER_X, y - CENTER_Y) > FIELD_R - GRID_STEP * 0.25)
        continue;
      ctx.strokeStyle = `${p.fieldEdge}9c`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 5, y - 5);
      ctx.lineTo(x + 5, y + 5);
      ctx.moveTo(x + 5, y - 5);
      ctx.lineTo(x - 5, y + 5);
      ctx.stroke();
    }
  }
  text(
    ctx,
    '均强磁场 B',
    CENTER_X,
    CENTER_Y + FIELD_R + 28,
    p.muted,
    15,
    'center',
    700
  );
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  color: string
): void {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const size = 10;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(
    to.x - Math.cos(angle - 0.48) * size,
    to.y - Math.sin(angle - 0.48) * size
  );
  ctx.lineTo(
    to.x - Math.cos(angle + 0.48) * size,
    to.y - Math.sin(angle + 0.48) * size
  );
  ctx.closePath();
  ctx.fill();
}

function drawPath(
  ctx: CanvasRenderingContext2D,
  path: MagneticParticlePath,
  p: Palette,
  phase: number
): void {
  if (path.points.length < 2) return;
  ctx.strokeStyle = `${p.particle}d9`;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  path.points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();
  const index = Math.min(
    path.points.length - 1,
    Math.floor(phase * (path.points.length - 1))
  );
  const head = path.points[index];
  const previous = path.points[Math.max(0, index - 2)];
  ctx.fillStyle = p.particle;
  ctx.beginPath();
  ctx.arc(head.x, head.y, PARTICLE_R, 0, Math.PI * 2);
  ctx.fill();
  if (index > 1) drawArrowHead(ctx, previous, head, p.particle);
}

function drawParticles(
  ctx: CanvasRenderingContext2D,
  state: MagneticConvergenceState,
  p: Palette
): void {
  if (!state.trailsVisible) return;
  state.paths.forEach((path) => drawPath(ctx, path, p, state.phase));
  if (state.params.mode === 'diverge') {
    ctx.fillStyle = p.danger;
    ctx.beginPath();
    ctx.arc(
      state.focusPoint.x,
      state.focusPoint.y,
      PARTICLE_R + 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
    text(
      ctx,
      '点源',
      state.focusPoint.x + 16,
      state.focusPoint.y - 12,
      p.danger,
      13,
      'left',
      700
    );
  }
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: MagneticConvergenceState,
  p: Palette,
  scale: number
): void {
  const x = PANEL_X + INSET;
  const width = PANEL_W - INSET * 2;
  ctx.fillStyle = p.panel;
  ctx.fillRect(PANEL_X, 0, PANEL_W, BASE_H);
  text(ctx, '磁会聚与磁发散', x, TITLE_Y, p.ink, 22 * scale, 'left', 700);
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, PANEL_RULE_Y);
  ctx.lineTo(x + width, PANEL_RULE_Y);
  ctx.stroke();

  rounded(ctx, x, MODE_Y, width, MODE_H);
  ctx.fillStyle = p.field;
  ctx.fill();
  const modeLabel =
    state.params.mode === 'converge' ? '磁会聚（平行入）' : '磁发散（点源入）';
  text(
    ctx,
    modeLabel,
    x + 16,
    MODE_Y + MODE_H / 2,
    p.accent,
    16 * scale,
    'left',
    700
  );

  rounded(ctx, x, RATIO_Y, width, RATIO_H);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(
    ctx,
    '轨道半径比 r / R',
    x + 16,
    RATIO_Y + 28,
    p.muted,
    14 * scale,
    'left',
    600
  );
  text(
    ctx,
    state.params.radiusRatio.toFixed(1),
    x + width - 16,
    RATIO_Y + 28,
    p.accent,
    24 * scale,
    'right',
    700
  );
  const trackX = x + 16;
  const trackW = width - 32;
  const trackY = RATIO_Y + 78;
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(trackX, trackY);
  ctx.lineTo(trackX + trackW, trackY);
  ctx.stroke();
  const ratioFraction = (state.params.radiusRatio - 0.6) / 0.8;
  const thumbX = trackX + ratioFraction * trackW;
  ctx.fillStyle = p.accent;
  ctx.beginPath();
  ctx.arc(thumbX, trackY, 14, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, '0.6', trackX, RATIO_Y + 108, p.muted, 12 * scale, 'center', 600);
  text(
    ctx,
    '1.4',
    trackX + trackW,
    RATIO_Y + 108,
    p.muted,
    12 * scale,
    'center',
    600
  );

  rounded(ctx, x, STATUS_Y, width, STATUS_H);
  ctx.fillStyle = `${p.accent}15`;
  ctx.fill();
  ctx.strokeStyle = p.accent;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(
    ctx,
    state.status,
    x + 16,
    STATUS_Y + 30,
    p.accent,
    18 * scale,
    'left',
    700
  );
  text(
    ctx,
    `粒子数 ${state.params.particleCount}`,
    x + 16,
    STATUS_Y + 68,
    p.muted,
    14 * scale,
    'left',
    600
  );
  const deviationLabel =
    state.params.mode === 'converge' ? '焦点偏差' : '平行偏差';
  text(
    ctx,
    `${deviationLabel} ${state.focusErrorPx.toFixed(0)} px`,
    x + width - 16,
    STATUS_Y + 68,
    p.muted,
    14 * scale,
    'right',
    600
  );

  rounded(ctx, x, FORMULA_Y, width, FORMULA_H);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(
    ctx,
    '洛伦兹力提供向心力',
    x + 16,
    FORMULA_Y + 28,
    p.gold,
    15 * scale,
    'left',
    700
  );
  text(
    ctx,
    'qvB = mv² / r',
    x + 16,
    FORMULA_Y + 66,
    p.ink,
    17 * scale,
    'left',
    700
  );
  text(
    ctx,
    'r = mv / |q|B',
    x + 16,
    FORMULA_Y + 106,
    p.ink,
    17 * scale,
    'left',
    700
  );
  text(
    ctx,
    'r = R → 理想效果',
    x + 16,
    FORMULA_Y + 134,
    p.muted,
    13 * scale,
    'left',
    600
  );
  text(ctx, '空格：暂停', 26, FOOTER_Y, p.muted, 13 * scale, 'left', 600);
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  state: MagneticConvergenceState,
  p: Palette,
  scale: number
): void {
  drawFieldBase(ctx, p, state.params.showField);
  text(
    ctx,
    '磁会聚与磁发散：圆形磁场轨迹控制',
    26,
    TITLE_Y,
    p.ink,
    22 * scale,
    'left',
    700
  );
  drawParticles(ctx, state, p);
  drawPanel(ctx, state, p, scale);
}

export function createMagneticConvergenceView(
  options: CreateMagneticConvergenceViewOptions = {}
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
  let snapshot: MagneticConvergenceState | null = null;

  function renderSnapshot(state: MagneticConvergenceState): void {
    const ctx = stage.ctx;
    if (!ctx) return;
    const width = stage.cssWidth;
    const height = stage.cssHeight;
    const fit = Math.min(width / BASE_W, height / BASE_H);
    const offsetY = (height - BASE_H * fit) / 2;
    const scale = env.contentScale() * stage.responsiveScale;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(0, offsetY);
    ctx.scale(fit, fit);
    drawScene(ctx, state, PALETTE[env.theme], scale);
    ctx.restore();
  }

  return {
    render(state: MagneticConvergenceState): void {
      snapshot = state;
      stage.ensureSized();
      renderSnapshot(state);
    },
    resize(): void {
      stage.resize();
      if (snapshot) renderSnapshot(snapshot);
    },
    setTheme(theme: TeachingTheme): void {
      env.setTheme(theme);
      if (snapshot) renderSnapshot(snapshot);
    },
    setMode(mode: TeachingMode, hints?: DemoRenderHints): void {
      env.setMode(mode, hints);
      if (snapshot) renderSnapshot(snapshot);
    },
    dispose(): void {
      snapshot = null;
      stage.release();
    },
    reset(): void {
      snapshot = null;
    }
  };
}
